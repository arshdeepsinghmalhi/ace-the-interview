import React from 'react';
import { Message } from '../types';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6 animate-fadeIn`}>
      <div 
        className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-5 py-4 shadow-sm ${
          isUser 
            ? 'bg-indigo-600 text-white rounded-br-none' 
            : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-bl-none'
        }`}
      >
        <div className="text-sm font-semibold mb-1 opacity-75">
          {isUser ? 'You' : 'Interviewer'}
        </div>
        <div className="whitespace-pre-wrap leading-relaxed text-sm md:text-base">
          {message.text}
        </div>
      </div>
    </div>
  );
};