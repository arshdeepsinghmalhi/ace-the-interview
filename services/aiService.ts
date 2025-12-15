import { GoogleGenAI, Chat } from "@google/genai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { InterviewConfig, ModelType, AIProvider } from "../types";
import { SYSTEM_PROMPTS } from "../constants";

// AI Client Instances
let googleAI: GoogleGenAI | null = null;
let openaiClient: OpenAI | null = null;
let anthropicClient: Anthropic | null = null;

// Session State
let currentProvider: AIProvider | null = null;
let currentModel: ModelType | null = null;
let systemInstruction: string = "";

// Provider-specific chat sessions
let googleChatSession: Chat | null = null;
let openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
let anthropicMessages: Anthropic.MessageParam[] = [];

/**
 * Initialize AI clients based on available API keys
 */
const initializeClients = () => {
  // Debug: Log API key availability (first 10 chars only for security)
  console.log('🔑 API Keys Status:', {
    google: process.env.GOOGLE_API_KEY ? `${process.env.GOOGLE_API_KEY.substring(0, 10)}...` : '❌ Not set',
    openai: process.env.OPENAI_API_KEY ? `${process.env.OPENAI_API_KEY.substring(0, 10)}...` : '❌ Not set',
    anthropic: process.env.ANTHROPIC_API_KEY ? `${process.env.ANTHROPIC_API_KEY.substring(0, 10)}...` : '❌ Not set'
  });

  // Google AI
  if (process.env.GOOGLE_API_KEY && !googleAI) {
    googleAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
    console.log('✅ Google AI client initialized');
  }
  
  // OpenAI
  if (process.env.OPENAI_API_KEY && !openaiClient) {
    openaiClient = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY,
      dangerouslyAllowBrowser: true // For client-side usage
    });
    console.log('✅ OpenAI client initialized');
  }
  
  // Anthropic
  if (process.env.ANTHROPIC_API_KEY && !anthropicClient) {
    try {
      anthropicClient = new Anthropic({ 
        apiKey: process.env.ANTHROPIC_API_KEY,
        dangerouslyAllowBrowser: true // For client-side usage
      });
      console.log('✅ Anthropic client initialized');
    } catch (error) {
      console.error("Anthropic client initialization failed:", error);
      console.warn("Note: Anthropic API may not work directly in browsers due to CORS. Consider using a backend proxy.");
    }
  }
};

/**
 * Get provider for a given model
 */
const getProviderForModel = (model: ModelType): AIProvider => {
  if (model === ModelType.FLASH || model === ModelType.PRO) {
    return 'google';
  } else if (model === ModelType.GPT4O || model === ModelType.GPT4O_MINI) {
    return 'openai';
  } else if (model === ModelType.SONNET_4) {
    return 'anthropic';
  }
  throw new Error(`Unknown model: ${model}`);
};

/**
 * Start a new interview session
 */
export const startInterviewSession = (config: InterviewConfig) => {
  initializeClients();
  
  currentProvider = getProviderForModel(config.model);
  currentModel = config.model;
  systemInstruction = SYSTEM_PROMPTS[config.style](config.role, config.topic);

  // Reset sessions
  googleChatSession = null;
  openaiMessages = [];
  anthropicMessages = [];

  // Initialize provider-specific session
  if (currentProvider === 'google') {
    if (!googleAI) throw new Error("Google AI not initialized. Set GOOGLE_API_KEY.");
    googleChatSession = googleAI.chats.create({
      model: config.model,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });
  } else if (currentProvider === 'openai') {
    if (!openaiClient) throw new Error("OpenAI not initialized. Set OPENAI_API_KEY.");
    // OpenAI uses message history with system message
    openaiMessages = [{ role: 'system', content: systemInstruction }];
  } else if (currentProvider === 'anthropic') {
    if (!anthropicClient) throw new Error("Anthropic not initialized. Set ANTHROPIC_API_KEY.");
    // Anthropic doesn't use system messages in history, only in the API call
    anthropicMessages = [];
  }
};

/**
 * Send a message and get streaming response
 */
export const sendMessageStream = async (
  message: string,
  onChunk: (text: string) => void
): Promise<string> => {
  if (!currentProvider || !currentModel) {
    throw new Error("Session not started. Call startInterviewSession first.");
  }

  let fullResponse = "";

  try {
    if (currentProvider === 'google') {
      // Google Gemini
      if (!googleChatSession) throw new Error("Google chat session not initialized");
      
      const resultStream = await googleChatSession.sendMessageStream({ message });
      for await (const chunk of resultStream) {
        const text = chunk.text || "";
        fullResponse += text;
        onChunk(fullResponse);
      }
    } else if (currentProvider === 'openai') {
      // OpenAI GPT
      if (!openaiClient) throw new Error("OpenAI client not initialized");
      
      openaiMessages.push({ role: 'user', content: message });
      
      const stream = await openaiClient.chat.completions.create({
        model: currentModel,
        messages: openaiMessages,
        temperature: 0.7,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        fullResponse += content;
        onChunk(fullResponse);
      }
      
      openaiMessages.push({ role: 'assistant', content: fullResponse });
    } else if (currentProvider === 'anthropic') {
      // Anthropic Claude
      if (!anthropicClient) throw new Error("Anthropic client not initialized");
      
      anthropicMessages.push({ role: 'user', content: message });
      
      try {
        const stream = await anthropicClient.messages.create({
          model: currentModel,
          max_tokens: 4096,
          temperature: 0.7,
          system: systemInstruction,
          messages: anthropicMessages,
          stream: true,
        });

        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            const content = chunk.delta.text || "";
            fullResponse += content;
            onChunk(fullResponse);
          }
        }
        
        anthropicMessages.push({ role: 'assistant', content: fullResponse });
      } catch (error: any) {
        // Check if it's a CORS error
        if (error.message?.includes('CORS') || error.name === 'TypeError') {
          throw new Error("Anthropic API doesn't work directly in browsers due to CORS restrictions. You need to set up a backend proxy server to use Claude models.");
        }
        throw error;
      }
    }
  } catch (error) {
    console.error(`Error with ${currentProvider}:`, error);
    throw error;
  }

  return fullResponse;
};

/**
 * Transcribe audio using OpenAI Whisper
 */
export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
  initializeClients();
  
  if (!openaiClient) {
    throw new Error("OpenAI client not initialized. Set OPENAI_API_KEY for Whisper transcription.");
  }

  try {
    // Convert Blob to File
    const audioFile = new File([audioBlob], "audio.webm", { type: audioBlob.type });
    
    const transcription = await openaiClient.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1", // Using the standard Whisper model (equivalent to large-v3 quality)
      language: "en",
    });

    return transcription.text;
  } catch (error) {
    console.error("Error transcribing audio:", error);
    throw error;
  }
};

