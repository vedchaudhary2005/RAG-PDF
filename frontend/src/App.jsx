import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import EmptyState from './components/EmptyState';
import QuestionComposer from './components/QuestionComposer';
import { Menu, X, AlertTriangle, FileText, Lock } from 'lucide-react';
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useAuth } from '@clerk/clerk-react';

function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center space-y-8 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex justify-center">
          <div className="bg-blue-600 p-4 rounded-2xl shadow-inner">
            <FileText className="w-10 h-10 text-white" />
          </div>
        </div>
        
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">PDF Intelligence</h1>
          <p className="text-gray-500">Your AI Document Assistant</p>
        </div>

        <div className="bg-blue-50/50 text-blue-800 p-4 rounded-xl flex items-start gap-3 text-sm text-left border border-blue-100/50">
          <Lock className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-600" />
          <p>Please sign in or create an account to access your secure chat history and document analysis.</p>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <SignInButton mode="modal">
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-sm">
              Sign In
            </button>
          </SignInButton>
          
          <SignUpButton mode="modal">
            <button className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold py-3 px-4 rounded-xl transition-all shadow-sm">
              Create an Account
            </button>
          </SignUpButton>
        </div>
      </div>
    </div>
  );
}

function ChatApp() {
  const { getToken } = useAuth();
  const API_BASE = import.meta.env.VITE_BACKEND_URL || '';
  
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [activeMessages, setActiveMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [error, setError] = useState(null);
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [question, setQuestion] = useState('');
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      setIsLoadingHistory(true);
      const token = await getToken();
      console.log("[Auth Debug] Frontend token length:", token ? token.length : "null");
      
      const res = await fetch(`${API_BASE}/api/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSelectConversation = async (id) => {
    try {
      setIsLoading(true);
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/conversations/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveConversationId(id);
        setActiveMessages(data.messages || []);
        setSelectedFile(null); // Require re-upload as per requirement
        setQuestion('');
        setError(null);
        if (window.innerWidth < 768) {
          setIsSidebarOpen(false);
        }
      }
    } catch (err) {
      console.error("Failed to fetch conversation:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    setActiveMessages([]);
    setSelectedFile(null);
    setQuestion('');
    setError(null);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleDeleteChat = async (id) => {
    try {
      const token = await getToken();
      await fetch(`${API_BASE}/api/conversations/${id}`, { 
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(prev => prev.filter(c => c._id !== id));
      if (activeConversationId === id) {
        handleNewChat();
      }
    } catch (err) {
      console.error("Failed to delete chat:", err);
    }
  };

  const generateTitle = (text) => {
    const title = text.trim();
    if (title.length > 40) return title.substring(0, 40) + '...';
    return title;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!selectedFile) {
      setError("Please select a PDF file.");
      return;
    }
    if (!question.trim()) {
      return;
    }

    const currentQuestion = question;
    setQuestion('');
    setError(null);

    // Optimistically add user message
    setActiveMessages(prev => [...prev, { role: 'user', content: currentQuestion }]);
    setIsLoading(true);

    try {
      const token = await getToken();
      let currentConvId = activeConversationId;
      
      // If it's a new chat, create DB entry first
      if (!currentConvId) {
        const title = generateTitle(currentQuestion);
        const res = await fetch(`${API_BASE}/api/conversations`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ title, pdfName: selectedFile.name })
        });
        
        if (res.ok) {
          const newConv = await res.json();
          currentConvId = newConv._id;
          setActiveConversationId(newConv._id);
          setConversations(prev => [newConv, ...prev]);
        } else {
          throw new Error("Failed to create conversation");
        }
      }

      // Prepare file upload
      const formData = new FormData();
      formData.append("pdf", selectedFile);
      formData.append("question", currentQuestion);
      if (currentConvId) {
        formData.append("conversationId", currentConvId);
      }

      const uploadRes = await fetch(`${API_BASE}/api/upload`, {
        method: "POST",
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error(`Server responded with status: ${uploadRes.status}`);
      }

      const answerText = await uploadRes.text();
      
      // Update UI with AI answer
      setActiveMessages(prev => [...prev, { role: 'assistant', content: answerText }]);
      
    } catch (err) {
      console.error("API Error:", err);
      let errorMessage = "An error occurred while connecting to the AI server.";
      if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
        errorMessage = "Unable to connect to the AI server. Make sure it's running.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-white font-sans overflow-hidden selection:bg-blue-100 selection:text-blue-900">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out`}>
        <Sidebar 
          conversations={conversations}
          activeId={activeConversationId}
          onSelect={handleSelectConversation}
          onNewChat={handleNewChat}
          onDelete={handleDeleteChat}
          isLoading={isLoadingHistory}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative min-w-0">
        
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-100 bg-white shadow-sm z-10">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-semibold text-gray-800">PDF Intelligence</span>
          <UserButton afterSignOutUrl="/" />
        </div>

        {/* Chat / Empty State */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {!activeConversationId && activeMessages.length === 0 && !selectedFile ? (
            <div className="flex-1 overflow-y-auto px-4 pb-8 flex flex-col items-center justify-center bg-gray-50/30">
              <EmptyState onFileSelect={setSelectedFile} />
            </div>
          ) : (
            <ChatArea 
              messages={activeMessages} 
              isLoading={isLoading} 
              loadingText="Analyzing your document..."
            />
          )}
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mx-4 md:mx-8 mb-2 bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl flex items-start gap-3 animate-in fade-in zoom-in-95 shadow-sm">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Input Area */}
        <div className="bg-gradient-to-t from-white via-white to-transparent pt-6 pb-4 md:pb-6">
          <QuestionComposer 
            question={question}
            onQuestionChange={setQuestion}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            selectedFile={selectedFile}
            onFileSelect={setSelectedFile}
            onFileRemove={() => setSelectedFile(null)}
            requirePdfUpload={activeConversationId && !selectedFile}
            disabled={activeConversationId && !selectedFile}
          />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <SignedOut>
        <LandingPage />
      </SignedOut>
      <SignedIn>
        <ChatApp />
      </SignedIn>
    </>
  );
}
