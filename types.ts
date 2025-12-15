export enum AppState {
  SETUP = 'SETUP',
  INTERVIEW = 'INTERVIEW',
  FEEDBACK = 'FEEDBACK',
}

export enum ModelType {
  FLASH = 'gemini-2.5-flash',
  PRO = 'gemini-3-pro-preview',
  GPT4O = 'gpt-4o',
  GPT4O_MINI = 'gpt-4o-mini',
  SONNET_4 = 'claude-sonnet-4-20250514',
}

export type AIProvider = 'google' | 'openai' | 'anthropic';

export interface ModelConfig {
  id: ModelType;
  name: string;
  provider: AIProvider;
  description: string;
}

export enum InterviewStyle {
  TECHNICAL = 'TECHNICAL',
  BEHAVIORAL = 'BEHAVIORAL',
}

export interface InterviewConfig {
  candidateName: string;
  role: string;
  topic: string;
  model: ModelType;
  style: InterviewStyle;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}
