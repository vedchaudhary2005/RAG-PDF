import React, { useRef } from 'react';
import { Send, Loader2, File, Paperclip, X } from 'lucide-react';

export default function QuestionComposer({
  question,
  onQuestionChange,
  onSubmit,
  isLoading,
  selectedFile,
  onFileSelect,
  onFileRemove,
  requirePdfUpload,
  disabled
}) {
  const fileInputRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && !isLoading && question.trim() && selectedFile) {
        onSubmit(e);
      }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      onFileSelect(file);
    }
  };

  return (
    <div className="p-4 md:px-8 max-w-4xl mx-auto w-full">
      {requirePdfUpload && !selectedFile && (
        <div className="mb-3 px-4 py-2 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg text-sm flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-bottom-2">
          <span>Please select the PDF again to continue this conversation.</span>
        </div>
      )}
      
      <form onSubmit={onSubmit} className="relative group">
        <div className={`absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-2xl blur-md transition duration-500 ${disabled ? 'opacity-0' : 'opacity-100 group-focus-within:opacity-100 group-hover:opacity-60'}`}></div>
        
        <div className="relative bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col transition-all">
          
          {selectedFile && (
            <div className="px-4 pt-3 pb-1 flex items-center">
              <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-100 text-sm">
                <File className="w-4 h-4" />
                <span className="font-medium truncate max-w-[200px]">{selectedFile.name}</span>
                <button
                  type="button"
                  onClick={onFileRemove}
                  className="ml-1 p-0.5 hover:bg-blue-200 rounded-full transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          <div className="flex items-end gap-2 p-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="application/pdf"
              className="hidden"
            />
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors disabled:opacity-50 flex-shrink-0"
              title="Attach PDF"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            
            <textarea
              value={question}
              onChange={(e) => onQuestionChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={!selectedFile ? "Upload a PDF to ask a question..." : "Ask a question..."}
              disabled={disabled || isLoading}
              className="w-full resize-none bg-transparent py-2.5 px-2 text-gray-900 placeholder-gray-400 focus:outline-none min-h-[44px] max-h-40 disabled:opacity-60"
              rows={1}
              style={{ height: 'auto', overflowY: 'auto' }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
            />
            
            <button
              type="submit"
              disabled={disabled || isLoading || !question.trim() || !selectedFile}
              className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 disabled:bg-gray-100 disabled:text-gray-300 transition-all flex-shrink-0"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-0.5" />}
            </button>
          </div>
        </div>
      </form>
      <div className="text-center mt-2">
        <span className="text-[10px] text-gray-400">AI can make mistakes. Consider verifying important information.</span>
      </div>
    </div>
  );
}
