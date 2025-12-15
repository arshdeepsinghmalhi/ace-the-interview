import React, { useState } from 'react';
import { AppState, InterviewConfig, Message } from './types';
import { SetupForm } from './components/SetupForm';
import { InterviewSession } from './components/InterviewSession';
import { FeedbackView } from './components/FeedbackView';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.SETUP);
  const [config, setConfig] = useState<InterviewConfig | null>(null);
  const [feedback, setFeedback] = useState<string>("");

  const handleStartInterview = (newConfig: InterviewConfig) => {
    setConfig(newConfig);
    setAppState(AppState.INTERVIEW);
  };

  const handleEndInterview = (messages: Message[]) => {
    // We can store messages here if we want to show history later
  };

  const handleFeedbackReady = (generatedFeedback: string) => {
    setFeedback(generatedFeedback);
    setAppState(AppState.FEEDBACK);
  };

  const handleRestart = () => {
    setAppState(AppState.SETUP);
    setConfig(null);
    setFeedback("");
  };

  return (
    <div className="h-full w-full flex flex-col bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950">
      {/* Background patterns */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-20">
         <div className="absolute top-0 -left-40 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
         <div className="absolute top-0 -right-40 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
         <div className="absolute -bottom-40 left-20 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 w-full h-full flex flex-col">
        {appState === AppState.SETUP && (
          <div className="flex-1 flex items-center justify-center p-4">
             <SetupForm onStart={handleStartInterview} />
          </div>
        )}

        {appState === AppState.INTERVIEW && config && (
          <div className="h-full pt-4 md:pt-8 md:pb-8 md:px-4">
            <InterviewSession 
              config={config} 
              onEndInterview={handleEndInterview} 
              onFeedbackReady={handleFeedbackReady}
            />
          </div>
        )}

        {appState === AppState.FEEDBACK && (
          <FeedbackView feedback={feedback} onRestart={handleRestart} />
        )}
      </div>
    </div>
  );
};

export default App;
