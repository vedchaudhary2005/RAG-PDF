import React from 'react';
import { PlusCircle, MessageSquare, Trash2, FileText, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { UserButton } from '@clerk/clerk-react';

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onDelete,
  isLoading
}) {
  return (
    <div className="w-full md:w-72 bg-gray-50 border-r border-gray-200 flex flex-col h-full flex-shrink-0">
      <div className="p-4 border-b border-gray-200 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl shadow-inner flex-shrink-0">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div className="overflow-hidden">
              <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 truncate">
                PDF Intelligence
              </h1>
              <p className="text-xs text-gray-500 font-medium">AI Document Assistant</p>
            </div>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
        
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 font-medium py-2.5 px-4 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Chat</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {isLoading && conversations.length === 0 ? (
          <div className="flex justify-center p-4">
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center p-4 text-sm text-gray-400">
            No conversations yet.
          </div>
        ) : (
          conversations.map((chat) => (
            <div
              key={chat._id}
              onClick={() => onSelect(chat._id)}
              className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                activeId === chat._id
                  ? 'bg-blue-100/50 text-blue-900'
                  : 'hover:bg-gray-200/50 text-gray-700'
              }`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <MessageSquare className={`w-4 h-4 flex-shrink-0 ${activeId === chat._id ? 'text-blue-600' : 'text-gray-400'}`} />
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-medium truncate">{chat.title}</span>
                  <span className="text-[10px] text-gray-500 truncate">
                    {chat.pdfName} • {chat.createdAt ? formatDistanceToNow(new Date(chat.createdAt), { addSuffix: true }) : ''}
                  </span>
                </div>
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(chat._id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                title="Delete chat"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
