import React from 'react';
import { Button } from './Button';

interface FeedbackViewProps {
  feedback: string;
  onRestart: () => void;
}

export const FeedbackView: React.FC<FeedbackViewProps> = ({ feedback, onRestart }) => {
  return (
    <div className="w-full max-w-3xl mx-auto h-full flex flex-col">
       <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="bg-slate-800 rounded-2xl p-8 shadow-2xl border border-slate-700 mb-8">
            <h1 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
              <span>📋</span> Interview Feedback
            </h1>
            <div className="prose prose-invert max-w-none prose-p:text-slate-300 prose-headings:text-indigo-400">
               <div className="whitespace-pre-wrap leading-relaxed">
                 {feedback || "No feedback generated."}
               </div>
            </div>
          </div>
       </div>
       
       <div className="p-6 bg-slate-900/80 backdrop-blur border-t border-slate-800 flex justify-center">
         <Button onClick={onRestart} className="text-lg px-8">
           Start New Interview
         </Button>
       </div>
    </div>
  );
};