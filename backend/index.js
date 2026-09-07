const express = require("express");
const multer = require("multer");
const app = express();
const pdfParse = require("pdf-parse");
const fs = require("fs");
const crypto = require("crypto");
require("dotenv").config();
const { GoogleGenAI } = require("@google/genai");
const upload = multer({ dest: "upload/" });
const { QdrantClient } = require("@qdrant/js-client-rest");
const mongoose = require("mongoose");
const Conversation = require("./models/Conversation");
const cors = require("cors");

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URL ? process.env.MONGODB_URL.trim() : "";
if (mongoUri) {
  mongoose
    .connect(mongoUri)
    .then(() => console.log("MongoDB URI loaded: yes\nMongoDB connected successfully"))
    .catch((err) => console.error("MongoDB connection failed:", err.message));
} else {
  console.error("MongoDB connection failed: MONGODB_URL is missing from environment variables.");
}

app.use(express.json());
app.use(express.static("public"));

// CORS — allow requests from the deployed Vercel frontend
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

const { clerkMiddleware, getAuth } = require("@clerk/express");
app.use(
  clerkMiddleware({
    secretKey: process.env.CLERK_SECRET_KEY,
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  })
);

const checkAuth = (req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthenticated" });
  }
  req.auth = { userId };
  next();
};

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : "",
});

// --- Generic retry wrapper for any Gemini call that can hit a transient 503 ---
async function withRetry(fn, { retries = 3, delay = 1000 } = {}) {
  let attemptsLeft = retries;
  let waitMs = delay;

  while (true) {
    try {
      return await fn();
    } catch (err) {
      const isUnavailable =
        err?.status === 503 ||
        err?.message?.includes("503") ||
        err?.message?.includes("UNAVAILABLE");

      if (isUnavailable && attemptsLeft > 0) {
        attemptsLeft--;
        console.warn(`Gemini API unavailable (503), retrying in ${waitMs}ms... (${attemptsLeft} left)`);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        waitMs *= 2;
        continue;
      }
      throw err;
    }
  }
}

async function createEmbedding(text) {
  const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : "";
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-embedding-001:embedContent?key=${apiKey}`;

  return withRetry(async () => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/gemini-embedding-001",
        content: { parts: [{ text }] },
      }),
    });

    if (!res.ok) {
      const errData = await res.json();
      const err = new Error(JSON.stringify(errData));
      err.status = res.status;
      throw err;
    }

    const data = await res.json();
    return data.embedding.values;
  });
}

// generateContent now also goes through the retry wrapper — this was the
// direct cause of the crash you saw (a 503 here had nothing to retry it).
async function askGemini(prompt) {
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
    });
    return response.text;
  });
}

const qdrant = new QdrantClient({
  url: process.env.QUADRANT_URL,
  apiKey: process.env.QUADRANT_API_KEY,
});

app.get("/api/create-collection", async (req, res) => {
  try {
    await qdrant.createCollection("pdf-docs", {
      vectors: {
        size: 768,
        distance: "Cosine",
      },
    });
    res.send("collection is created");
  } catch (e) {
    res.status(500).send(e);
  }
});

app.get("/", (req, res) => {
  res.send("hey i am running");
});

// --- Conversation APIs (unchanged) ---
app.get("/api/conversations", checkAuth, async (req, res) => {
  try {
    const conversations = await Conversation.find({ userId: req.auth.userId }).sort({ createdAt: -1 });
    res.json(conversations);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

app.post("/api/conversations", checkAuth, async (req, res) => {
  try {
    const { title, pdfName } = req.body;
    const conversation = new Conversation({
      userId: req.auth.userId,
      title: title || "New Conversation",
      pdfName: pdfName || "",
      messages: [],
    });
    await conversation.save();
    res.status(201).json(conversation);
  } catch (err) {
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

app.get("/api/conversations/:id", checkAuth, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({ _id: req.params.id, userId: req.auth.userId });
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    res.json(conversation);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch conversation" });
  }
});

app.delete("/api/conversations/:id", checkAuth, async (req, res) => {
  try {
    const conversation = await Conversation.findOneAndDelete({ _id: req.params.id, userId: req.auth.userId });
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

app.post("/api/upload", checkAuth, upload.single("pdf"), async (req, res) => {
  const { question, conversationId } = req.body;

  try {
    if (!question || !conversationId) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: "question and conversationId are required" });
    }

    // --- Only index the PDF once per conversation ---
    // This is the main fix: previously every single question re-parsed the PDF
    // and re-ran embeddings for every chunk, burning through Gemini quota and
    // triggering 503s on the very next request.
    const existing = await qdrant.count("pdf-docs", {
      filter: { must: [{ key: "conversationId", match: { value: conversationId } }] },
      exact: true,
    });

    if (existing.count === 0) {
      if (!req.file) {
        return res
          .status(400)
          .json({ error: "pdf file is required the first time you ask a question in this conversation" });
      }

      const dataBuffer = fs.readFileSync(req.file.path);
      const pdfData = await pdfParse(dataBuffer);
      const text = pdfData.text;
      const chunks = text.split("\n\n").filter((chunk) => chunk.trim() !== "");

      const points = [];
      for (const chunk of chunks) {
        const embedding = await createEmbedding(chunk);
        points.push({
          id: crypto.randomUUID(), // unique across ALL conversations — no more overwrites
          vector: embedding,
          payload: { text: chunk, conversationId },
        });
      }

      await qdrant.upsert("pdf-docs", { points });
    }

    if (req.file) {
      fs.unlink(req.file.path, () => {}); // don't leak temp files on disk
    }

    // --- Answer the question using only this conversation's chunks ---
    const questionEmbedding = await createEmbedding(question);

    const searchResult = await qdrant.query("pdf-docs", {
      vector: questionEmbedding,
      limit: 3,
      with_payload: true,
      filter: { must: [{ key: "conversationId", match: { value: conversationId } }] },
    });

    if (!searchResult.points || searchResult.points.length === 0) {
      return res.status(404).send("Is conversation ke liye koi indexed PDF nahi mila. Pehle PDF upload karo.");
    }

    const context = searchResult.points.map((p) => p.payload.text).join("\n\n");
    const aiAnswer = await askGemini(`Answer the question using the context: ${context}\n\nQuestion: ${question}`);

    try {
      const conversation = await Conversation.findOne({ _id: conversationId, userId: req.auth.userId });
      if (conversation) {
        conversation.messages.push({ role: "user", content: question });
        conversation.messages.push({ role: "assistant", content: aiAnswer });
        await conversation.save();
      }
    } catch (dbErr) {
      console.error("MongoDB save error:", dbErr);
      // We do not fail the request if saving history fails, as per requirements
    }

    res.send(aiAnswer);
  } catch (err) {
    console.error(err);
    if (req.file) fs.unlink(req.file.path, () => {});
    if (err?.status === 503) {
      return res.status(503).send("AI model abhi high demand mein hai, thodi der baad try karo.");
    }
    res.status(500).send("Something went wrong.");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});