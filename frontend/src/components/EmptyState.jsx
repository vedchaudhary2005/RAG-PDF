import React, { useRef, useState } from 'react';
import { FileSearch, Zap, BrainCircuit, UploadCloud, File, AlertCircle } from 'lucide-react';

export default function EmptyState({ onFileSelect }) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    setError(null);
    if (!file) return false;
    
    if (file.type !== 'application/pdf') {
      setError("Please select a valid PDF file.");
      return false;
    }
    
    if (file.size === 0) {
      setError("This file appears to be empty.");
      return false;
    }
    
    return true;
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (validateFile(file)) {
      onFileSelect(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (validateFile(file)) {
      onFileSelect(file);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 md:mt-12 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center space-y-4 mb-12">
        <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
          Understand your documents <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">with AI</span>
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Upload a PDF, ask questions, and get intelligent answers from your document.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
            <FileSearch className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-2">PDF Analysis</h3>
          <p className="text-gray-500 text-sm leading-relaxed">
            Upload any text-based PDF to automatically extract and index the content.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-2">AI-Powered Answers</h3>
          <p className="text-gray-500 text-sm leading-relaxed">
            Ask complex questions in natural language. Get concise, accurate answers.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-2">Semantic Search</h3>
          <p className="text-gray-500 text-sm leading-relaxed">
            Find exactly what you're looking for using contextual understanding.
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        <div
          className={`relative border-2 border-dashed rounded-2xl p-10 transition-all duration-300 ease-in-out cursor-pointer flex flex-col items-center justify-center text-center
            ${isDragging 
              ? 'border-blue-500 bg-blue-50 shadow-inner' 
              : error 
                ? 'border-red-300 bg-red-50/50 hover:bg-red-50' 
                : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 shadow-sm'
            }`}
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="application/pdf"
            className="hidden"
          />
          
          <div className={`p-4 rounded-full mb-4 ${isDragging ? 'bg-blue-100' : 'bg-gray-50 border border-gray-100'}`}>
            <UploadCloud className={`w-8 h-8 ${isDragging ? 'text-blue-600' : 'text-gray-400'}`} />
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Upload your PDF
          </h3>
          <p className="text-sm text-gray-500">
            Drag & drop your PDF here or <span className="text-blue-600 font-medium">browse files</span>
          </p>
        </div>
        
        {error && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-red-600 animate-in slide-in-from-top-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
