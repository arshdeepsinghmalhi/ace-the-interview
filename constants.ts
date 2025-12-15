import { ModelType, ModelConfig } from './types';
import { SYSTEM_PROMPTS, DUMMY_FEEDBACK } from './prompts';

// Re-export prompts for backward compatibility
export { SYSTEM_PROMPTS };

// Export the dummy feedback
export const FEEDBACK_MESSAGE = DUMMY_FEEDBACK;

/**
 * Available AI models with their configurations
 * Add or remove models here to update the dropdown options
 */
export const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: ModelType.FLASH,
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    description: 'Fast & Responsive'
  },
  {
    id: ModelType.PRO,
    name: 'Gemini 3.0 Pro',
    provider: 'google',
    description: 'Advanced Reasoning'
  },
  {
    id: ModelType.GPT4O,
    name: 'GPT-4o',
    provider: 'openai',
    description: 'Powerful & Versatile'
  },
  {
    id: ModelType.GPT4O_MINI,
    name: 'GPT-4o Mini',
    provider: 'openai',
    description: 'Fast & Affordable'
  },
  {
    id: ModelType.SONNET_4,
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    description: 'Thoughtful & Precise'
  }
];
