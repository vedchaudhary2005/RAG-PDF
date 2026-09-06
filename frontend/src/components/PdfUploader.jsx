import React, { useRef, useState } from 'react';
import { UploadCloud, File, X, AlertCircle } from 'lucide-react';

export default function PdfUploader({ selectedFile, onFileSelect, onFileRemove }) {
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

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (selectedFile) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm transition-all animate-in fade-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <File className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 truncate max-w-xs sm:max-w-md">
                {selectedFile.name}
              </h4>
              <p className="text-xs text-gray-500 mt-1">{formatFileSize(selectedFile.size)}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setError(null);
              onFileRemove();
            }}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
            title="Remove file"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        className={`relative border-2 border-dashed rounded-2xl p-8 transition-all duration-300 ease-in-out cursor-pointer flex flex-col items-center justify-center text-center
          ${isDragging 
            ? 'border-blue-500 bg-blue-50 shadow-inner' 
            : error 
              ? 'border-red-300 bg-red-50/50 hover:bg-red-50' 
              : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400'
          }`}
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="application/pdf"
          className="hidden"
        />
        
        <div className={`p-4 rounded-full mb-4 ${isDragging ? 'bg-blue-100' : 'bg-white shadow-sm'}`}>
          <UploadCloud className={`w-8 h-8 ${isDragging ? 'text-blue-600' : 'text-gray-400'}`} />
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Upload your PDF
        </h3>
        <p className="text-sm text-gray-500">
          Drag & drop your PDF here or <span className="text-blue-600 font-medium">browse files</span>
        </p>
        
        <div className="mt-6 flex items-center gap-1.5 text-xs text-gray-400 font-medium bg-white px-3 py-1 rounded-full shadow-sm border border-gray-100">
          <File className="w-3 h-3" /> PDF files only
        </div>
      </div>
      
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 px-2 py-1 animate-in slide-in-from-top-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
    </div>
  );
}
