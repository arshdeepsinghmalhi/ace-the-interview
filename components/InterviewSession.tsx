import React, { useState, useEffect, useRef } from 'react';
import { Message, InterviewConfig } from '../types';
import { sendMessageStream, startInterviewSession } from '../services/aiService';
import { Button } from './Button';
import { ChatMessage } from './ChatMessage';
import { FEEDBACK_MESSAGE } from '../constants';

interface InterviewSessionProps {
  config: InterviewConfig;
  onEndInterview: (messages: Message[]) => void;
  onFeedbackReady: (feedback: string) => void;
}

export const InterviewSession: React.FC<InterviewSessionProps> = ({ config, onEndInterview, onFeedbackReady }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  
  // Voice State
  const [isListening, setIsListening] = useState(false);
  const [isTtsEnabled, setIsTtsEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [micPermission, setMicPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');

  // Timer State
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const recognitionRef = useRef<any>(null);
  const recognitionActiveRef = useRef(false);
  const recognitionRestartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastErrorWasAbortedRef = useRef(false);

  // Initialize Timer
  useEffect(() => {
    startTimeRef.current = Date.now();
    timerIntervalRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Check microphone permissions on mount
  useEffect(() => {
    const checkMicPermissions = async () => {
      try {
        if ('permissions' in navigator) {
          const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          setMicPermission(result.state as 'prompt' | 'granted' | 'denied');
          result.onchange = () => {
            setMicPermission(result.state as 'prompt' | 'granted' | 'denied');
          };
        }
      } catch (error) {
        console.log('Could not check microphone permissions:', error);
      }
    };
    checkMicPermissions();
  }, []);

  // Initialize Speech Recognition for real-time transcription
  useEffect(() => {
    // Check if browser supports Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition && !recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true; // Keep recognizing
      recognition.interimResults = true; // Get results as they come
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        console.log('Speech recognition started');
        setMicPermission('granted');
        recognitionActiveRef.current = true;
      };
      
      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        
        if (finalTranscript) {
          setInputText(prev => prev + finalTranscript);
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
          // Silently ignore no-speech errors
          return;
        }
        if (event.error === 'aborted') {
          lastErrorWasAbortedRef.current = true;
          recognitionActiveRef.current = false;
          setIsListening(false);
          return;
        }
        if (event.error === 'not-allowed') {
          setMicPermission('denied');
          alert('Microphone access denied. Please allow microphone access in your browser settings and refresh the page.');
          setIsListening(false);
          return;
        }
        if (event.error === 'audio-capture') {
          alert('Could not capture audio from microphone. Please check that your microphone is connected and not being used by another application.');
          setIsListening(false);
          return;
        }
        if (event.error !== 'aborted') {
          setIsListening(false);
        }
      };
      
      recognition.onend = () => {
        // Auto-restart handled by effect based on isListening state
        recognitionActiveRef.current = false;
        if (lastErrorWasAbortedRef.current) {
          // don't spam restarts after manual stop/abort
          return;
        }
        console.log('Recognition ended');
      };
      
      recognitionRef.current = recognition;
    }
    
    return () => {
       // Cleanup on unmount
       if (recognitionRef.current) {
         try {
           recognitionRef.current.stop();
         } catch (e) {
           // Ignore errors on cleanup
         }
       }
       window.speechSynthesis.cancel();
       if (recognitionRestartTimeoutRef.current) {
         clearTimeout(recognitionRestartTimeoutRef.current);
       }
    };
  }, []); // Only run once on mount

  const startRecognitionSafely = () => {
    if (!recognitionRef.current) return;
    // Avoid double start loops
    if (recognitionActiveRef.current) return;
    try {
      recognitionRef.current.start();
    } catch (error: any) {
      if (error?.message?.includes('already started')) {
        recognitionActiveRef.current = true;
        return;
      }
      console.error('Error starting recognition:', error);
      setIsListening(false);
    }
  };

  // Handle auto-restart of recognition when listening state changes
  useEffect(() => {
    if (isListening && recognitionRef.current && !isEnding) {
      // Clear any pending restart
      if (recognitionRestartTimeoutRef.current) {
        clearTimeout(recognitionRestartTimeoutRef.current);
      }

      // Ensure recognition is running
      startRecognitionSafely();

      // Set up onend to auto-restart while listening (debounced)
      recognitionRef.current.onend = () => {
        recognitionActiveRef.current = false;
        if (lastErrorWasAbortedRef.current) {
          // reset flag and do not restart on abort
          lastErrorWasAbortedRef.current = false;
          return;
        }
        console.log('Recognition ended, restarting...');
        if (!isListening || isEnding || !recognitionRef.current) return;
        if (recognitionRestartTimeoutRef.current) {
          clearTimeout(recognitionRestartTimeoutRef.current);
        }
        recognitionRestartTimeoutRef.current = setTimeout(() => {
          if (!isListening || isEnding || !recognitionRef.current) return;
          startRecognitionSafely();
        }, 300);
      };
    } else if (!isListening && recognitionRef.current) {
      // remove auto-restart handler
      recognitionRef.current.onend = () => {
        recognitionActiveRef.current = false;
      };
      if (recognitionRestartTimeoutRef.current) {
        clearTimeout(recognitionRestartTimeoutRef.current);
      }
      // Make sure recognition is stopped
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore errors when stopping
      }
    }
  }, [isListening, isEnding]);

  // Initialize chat on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const init = async () => {
      try {
        startInterviewSession(config);
        setIsProcessing(true);
        // Initial greeting trigger - phantom user message to start conversation naturally
        const greetingPrompt = "Hello, I am ready for the interview. [Time: 0:00]";
        
        const aiResponseId = (Date.now() + 1).toString();
        setMessages([
            { id: aiResponseId, role: 'model', text: '', timestamp: Date.now() }
        ]);

        const fullText = await sendMessageStream(greetingPrompt, (text) => {
          setMessages(prev => {
            const newMsgs = [...prev];
            const lastMsg = newMsgs[newMsgs.length - 1];
            if (lastMsg && lastMsg.role === 'model') {
              lastMsg.text = text;
            }
            return newMsgs;
          });
        });
        
        if (isTtsEnabled) speak(fullText);

      } catch (err) {
        console.error("Failed to start session", err);
      } finally {
        setIsProcessing(false);
      }
    };
    init();
  }, [config]); // Note: isTtsEnabled dependency not added to avoid re-init, TTS preference read on call

  // Speak function
  const speak = (text: string) => {
      if (!text || !window.speechSynthesis) return;
      
      window.speechSynthesis.cancel(); // Stop current speech
      setIsSpeaking(true);

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      
      // Select a decent voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.name.includes("Google US English") || v.name.includes("Samantha"));
      if (preferredVoice) utterance.voice = preferredVoice;

      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      window.speechSynthesis.speak(utterance);
  };

  const toggleListening = () => {
     if (!recognitionRef.current) {
       alert("Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.");
       return;
     }
     
     if (isListening) {
         // Stop recognition
         try {
           recognitionRef.current.stop();
           setIsListening(false);
         } catch (error) {
           console.error("Error stopping recognition:", error);
           setIsListening(false);
         }
     } else {
         // Start recognition
         try {
           window.speechSynthesis.cancel(); // Stop AI speaking if user starts talking
           setIsListening(true); // actual start handled by effect to avoid double-start errors
         } catch (error) {
           console.error("Error starting recognition:", error);
           alert("Could not start speech recognition. Please check microphone permissions and try again.");
           setIsListening(false);
         }
     }
  };

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || isProcessing) return;
    
    // Stop listening if sending manually
    if (isListening && recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.log('Error stopping recognition:', e);
        }
        setIsListening(false);
    }

    // Add timing context to the message
    const messageWithTime = `${inputText} [Time: ${formatTime(elapsedSeconds)}]`;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: inputText, // Store original text without timing for display
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsProcessing(true);

    const modelMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: modelMsgId, role: 'model', text: '', timestamp: Date.now() }]);

    try {
      // Send message with timing context to AI
      const fullText = await sendMessageStream(messageWithTime, (text) => {
         setMessages(prev => {
            const newMsgs = [...prev];
            const lastIndex = newMsgs.findIndex(m => m.id === modelMsgId);
            if (lastIndex !== -1) {
              newMsgs[lastIndex] = { ...newMsgs[lastIndex], text };
            }
            return newMsgs;
          });
      });
      
      if (isTtsEnabled) {
          speak(fullText);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEndSession = async () => {
    setIsEnding(true);
    window.speechSynthesis.cancel();
    
    // Stop timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    
    // Stop speech recognition if active
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.log('Error stopping recognition:', e);
      }
      setIsListening(false);
    }

    // Use dummy feedback instead of generating AI feedback
    onEndInterview(messages);
    onFeedbackReady(FEEDBACK_MESSAGE);
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto bg-slate-900 shadow-2xl overflow-hidden md:rounded-2xl border border-slate-800">
      {/* Header */}
      <div className="px-6 py-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center shrink-0">
        <div>
           <h2 className="text-lg font-bold text-white flex items-center gap-2">
             {config.style === 'TECHNICAL' ? '💻' : '🤝'} 
             General Interview
           </h2>
           <p className="text-xs text-slate-400">Model: {config.model}</p>
        </div>
        
        <div className="flex items-center gap-3">
            {/* Timer Display */}
            <div className="flex items-center gap-2 bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-700">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-indigo-400">
                <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-mono font-semibold text-indigo-300">
                {formatTime(elapsedSeconds)}
              </span>
            </div>

            <button 
                onClick={() => setIsTtsEnabled(!isTtsEnabled)}
                className={`p-2 rounded-full transition-colors ${isTtsEnabled ? 'bg-indigo-600/20 text-indigo-400' : 'bg-slate-700/50 text-slate-500'}`}
                title="Toggle AI Voice"
            >
                {isTtsEnabled ? (
                   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                     <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
                     <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
                   </svg>
                ) : (
                   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                     <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM17.78 9.22a.75.75 0 10-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 101.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 101.06-1.06L20.56 12l1.72-1.72a.75.75 0 10-1.06-1.06l-1.72 1.72-1.72-1.72z" />
                   </svg>
                )}
            </button>
            <Button 
            variant="danger" 
            onClick={handleEndSession} 
            isLoading={isEnding}
            className="py-1 px-3 text-xs md:text-sm"
            >
            End
            </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 scrollbar-hide relative">
        {messages.map(m => (
          <ChatMessage key={m.id} message={m} />
        ))}
        {isProcessing && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex justify-start animate-pulse">
            <div className="bg-slate-800 px-4 py-3 rounded-2xl rounded-bl-none text-slate-400 text-sm">
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Hidden when interview is ending/concluded */}
      {!isEnding && (
        <div className="p-4 bg-slate-800 border-t border-slate-700 shrink-0">
          <div className="flex gap-2 relative items-end">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? "🎤 Listening..." : "Type your answer or use microphone..."}
              className={`flex-1 bg-slate-900 text-white rounded-xl px-4 py-3 border border-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none h-[60px] scrollbar-hide transition-all ${isListening ? 'ring-2 ring-red-500 bg-red-950/20' : ''}`}
              disabled={isProcessing}
            />
            
            <button
               onClick={toggleListening}
               disabled={isProcessing || micPermission === 'denied'}
               className={`h-[60px] w-[60px] rounded-xl flex items-center justify-center transition-all relative ${
                   isListening 
                   ? 'bg-red-600 animate-pulse text-white shadow-lg shadow-red-500/20' 
                   : micPermission === 'denied'
                   ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                   : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
               }`}
               title={
                  micPermission === 'denied' 
                  ? "Microphone access denied. Please allow access in browser settings." 
                  : isListening 
                  ? "Stop Listening (Click to stop recording)" 
                  : "Start Voice Input (Click to speak your answer)"
               }
            >
               {micPermission === 'denied' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                     <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                     <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
                     <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2 2l20 20" />
                  </svg>
               ) : isListening ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                     <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                     <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
                  </svg>
               ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                     <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                     <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
                  </svg>
               )}
               {isListening && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
               )}
            </button>

            <Button 
              onClick={handleSend} 
              disabled={!inputText.trim() || isProcessing}
              className="h-[60px] w-[60px] rounded-xl flex items-center justify-center p-0"
            >
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 transform -rotate-45 relative left-1">
                  <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
               </svg>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};