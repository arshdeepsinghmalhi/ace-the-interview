import React, { useState } from 'react';
import { InterviewConfig, ModelType, InterviewStyle } from '../types';
import { Button } from './Button';
import { AVAILABLE_MODELS } from '../constants';

interface SetupFormProps {
  onStart: (config: InterviewConfig) => void;
}

export const SetupForm: React.FC<SetupFormProps> = ({ onStart }) => {
  const [candidateName, setCandidateName] = useState('');
  const [model, setModel] = useState<ModelType>(ModelType.FLASH);
  const [style, setStyle] = useState<InterviewStyle>(InterviewStyle.BEHAVIORAL);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateName.trim()) return;
    // Hardcoding defaults for general interview
    onStart({ 
      candidateName, 
      role: 'General Software Engineer', 
      topic: 'General Competency', 
      model, 
      style 
    });
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Ace The Interview</h1>
        <p className="text-slate-400">General Mock Interview Practice</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Your Name</label>
          <input
            type="text"
            required
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            placeholder="e.g. Alex Smith"
            value={candidateName}
            onChange={(e) => setCandidateName(e.target.value)}
          />
        </div>

        {/* AI Model Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Select AI Model</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as ModelType)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all cursor-pointer"
          >
            {AVAILABLE_MODELS.map((modelConfig) => (
              <option key={modelConfig.id} value={modelConfig.id}>
                {modelConfig.name} - {modelConfig.description}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-2">
            Provider: {AVAILABLE_MODELS.find(m => m.id === model)?.provider.toUpperCase()}
          </p>
        </div>

        {/* Prompt Toogle */}
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
          <label className="block text-sm font-medium text-slate-300 mb-3">Prompt Toogle</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setStyle(InterviewStyle.TECHNICAL)}
              className={`relative p-3 rounded-lg border text-left transition-all ${
                style === InterviewStyle.TECHNICAL
                  ? 'bg-emerald-600/20 border-emerald-500 ring-1 ring-emerald-500'
                  : 'bg-slate-800 border-slate-700 hover:border-slate-600'
              }`}
            >
              <div className="font-semibold text-emerald-400">Prompt A</div>
            </button>
            <button
              type="button"
              onClick={() => setStyle(InterviewStyle.BEHAVIORAL)}
              className={`relative p-3 rounded-lg border text-left transition-all ${
                style === InterviewStyle.BEHAVIORAL
                  ? 'bg-amber-600/20 border-amber-500 ring-1 ring-amber-500'
                  : 'bg-slate-800 border-slate-700 hover:border-slate-600'
              }`}
            >
              <div className="font-semibold text-amber-400">Prompt B</div>
            </button>
          </div>
        </div>

        <Button type="submit" className="w-full text-lg shadow-xl shadow-indigo-900/20">
          Start General Interview
        </Button>
      </form>
    </div>
  );
};
