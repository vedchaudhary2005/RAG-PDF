const express = require("express");
const multer = require("multer");
const app = express();
const pdfParse = require("pdf-parse");
const fs = require("fs");
require("dotenv").config();
const { GoogleGenAI } = require("@google/genai");
const upload = multer({ dest: "upload/" });
const {QdrantClient} = require('@qdrant/js-client-rest');
const mongoose = require('mongoose');
const Conversation = require('./models/Conversation');
const cors = require('cors');

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URL ? process.env.MONGODB_URL.trim() : "";
if (mongoUri) {
  mongoose.connect(mongoUri)
    .then(() => console.log("MongoDB URI loaded: yes\nMongoDB connected successfully"))
    .catch((err) => console.error("MongoDB connection failed:", err.message));
} else {
  console.error("MongoDB connection failed: MONGODB_URL is missing from environment variables.");
}

app.use(express.json());
app.use(express.static("public"));

// CORS — allow requests from the deployed Vercel frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

const { clerkMiddleware, getAuth } = require('@clerk/express');
app.use(clerkMiddleware({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY
}));

const checkAuth = (req, res, next) => {
  const authState = getAuth(req);
  console.log("[Auth Debug] Auth Header:", req.headers.authorization ? "Present" : "Missing");
  console.log("[Auth Debug] getAuth(req) output:", JSON.stringify(authState));
  
  const { userId } = authState;
  if (!userId) {
    return res.status(401).json({ error: "Unauthenticated" });
  }
  req.auth = { userId }; // preserve req.auth for the routes below
  next();
};

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : "",
});

async function createEmbedding(text) {
  let retries = 3;
  let delay = 1000;
  
  while (retries > 0) {
    try {
      const response = await ai.models.embedContent({
        model: "text-embedding-004",
        contents: text,
      });
      return response.embedding?.values || response.embeddings?.[0]?.values;
    } catch (err) {
      const isUnavailable = err?.status === 503 || 
                            err?.status === "UNAVAILABLE" || 
                            err?.error?.code === 503 ||
                            err?.message?.includes("503");
                            
      if (isUnavailable) {
        retries--;
        if (retries === 0) {
          console.error("Gemini embedding failed after 3 retries due to 503 Unavailable.");
          throw err;
        }
        console.warn(`Gemini API unavailable (503), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      } else {
        throw err;
      }
    }
  }
}

const qdrant = new QdrantClient({
    url: process.env.QUADRANT_URL,
    apiKey: process.env.QUADRANT_API_KEY,
});

function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
  }
  return dotProduct;
}

app.get('/create-collection', async (req, res)=>{
    try{
    await qdrant.createCollection('pdf-docs', {
      vectors: {
        size: 768,
        distance: 'Cosine'
      },
    });
    res.send('collection is created');
  } catch (e) {
    res.status(500).send(e);
  }
});

app.get("/", (req, res) => {
  res.send("hey i am running");
});

// --- Conversation APIs ---
app.get("/conversations", checkAuth, async (req, res) => {
  try {
    const conversations = await Conversation.find({ userId: req.auth.userId }).sort({ createdAt: -1 });
    res.json(conversations);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

app.post("/conversations", checkAuth, async (req, res) => {
  try {
    const { title, pdfName } = req.body;
    const conversation = new Conversation({
      userId: req.auth.userId,
      title: title || "New Conversation",
      pdfName: pdfName || "",
      messages: []
    });
    await conversation.save();
    res.status(201).json(conversation);
  } catch (err) {
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

app.get("/conversations/:id", checkAuth, async (req, res) => {
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

app.delete("/conversations/:id", checkAuth, async (req, res) => {
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

app.post("/upload", checkAuth, upload.single("pdf"), async (req, res) => {
  console.log(req.body);

  try {
    const dataBuffer = fs.readFileSync(req.file.path); // binary data agaya idhr
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text;
    const chunks = text.split("\n\n").filter((chunk) => chunk.trim() != "");

    const chunkEmbeddings = [];
    for (const chunk of chunks) {
      const embedding = await createEmbedding(chunk);

      chunkEmbeddings.push({
        text: chunk,
        embedding,
      });
    }


    const points = chunkEmbeddings.map((items, index) => ({
    id: index + 1,
    vector: items.embedding,
    payload: {
        text: items.text
    }
    }));

    await qdrant.upsert('pdf-docs',{
        points,
    })

    const question = req.body.question;
    const questionEmbedding = await createEmbedding(question);
  

    const searchResult = await qdrant.query('pdf-docs',{
        vector: questionEmbedding,
        limit: 1,
        with_payload: true
    });
    console.log(searchResult);

   const bestChunk = searchResult.points[0].payload.text;



    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: `Answer the question using the context: ${bestChunk} and question is: ${question}`,
    });
    
    const aiAnswer = response.text;
    
    // Optional MongoDB history saving
    const conversationId = req.body.conversationId;
    if (conversationId) {
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
    }

    res.send(aiAnswer);
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
