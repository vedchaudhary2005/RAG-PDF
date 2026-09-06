import React, { useState } from 'react';
import { Sparkles, Copy, Check, Bot } from 'lucide-react';

export default function AnswerCard({ answer }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (answer) {
      navigator.clipboard.writeText(answer);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!answer) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-md overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/80">
        <div className="flex items-center gap-2 text-indigo-700">
          <Bot className="w-5 h-5" />
          <h3 className="font-semibold">AI Answer</h3>
          <span className="flex h-2 w-2 relative ml-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
        </div>
        
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
          title="Copy answer"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-500" />
              <span className="text-green-600">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      
      <div className="p-6">
        <div className="prose prose-blue max-w-none prose-p:leading-relaxed text-gray-800 text-[15px] whitespace-pre-wrap">
          {answer}
        </div>
      </div>
    </div>
  );
}
