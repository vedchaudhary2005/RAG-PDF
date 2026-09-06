import React from 'react';
import { Send, Loader2 } from 'lucide-react';

export default function QuestionInput({ 
  question, 
  onQuestionChange, 
  onSubmit, 
  isLoading, 
  disabled 
}) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && question.trim()) {
        onSubmit(e);
      }
    }
  };

  return (
    <form onSubmit={onSubmit} className="relative group">
      <div className={`absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500 ${disabled ? 'hidden' : 'block'}`}></div>
      <div className="relative bg-white rounded-2xl shadow-sm border border-gray-200 focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100 transition-all flex flex-col">
        <textarea
          value={question}
          onChange={(e) => onQuestionChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about your document..."
          disabled={disabled || isLoading}
          className="w-full resize-none bg-transparent px-5 py-4 text-gray-900 placeholder-gray-400 focus:outline-none min-h-[120px] rounded-t-2xl disabled:opacity-60 disabled:cursor-not-allowed"
          rows={3}
        />
        
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50/50 rounded-b-2xl border-t border-gray-100">
          <div className="text-xs text-gray-400">
            Press <kbd className="font-sans px-1.5 py-0.5 bg-white border border-gray-200 rounded-md text-gray-500">Enter</kbd> to send
          </div>
          
          <button
            type="submit"
            disabled={disabled || isLoading || !question.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <span>Ask AI</span>
                <Send className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
