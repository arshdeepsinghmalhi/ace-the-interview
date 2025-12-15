# Changes Summary

## Overview
This update adds support for multiple AI models (GPT-4o, GPT-4o-mini, Claude Sonnet 4.5), separates prompts for easier maintenance, and integrates OpenAI Whisper for speech-to-text.

## New Features

### 1. Multiple AI Model Support
- **Added Models**:
  - GPT-4o (OpenAI)
  - GPT-4o-mini (OpenAI)
  - Claude Sonnet 4.5 (Anthropic)
- **Existing Models**:
  - Gemini 2.5 Flash (Google)
  - Gemini 3.0 Pro (Google)

### 2. Improved Model Selection UI
- Changed from button grid to dropdown menu
- Shows model name, description, and provider
- Easier to scale with more models

### 3. OpenAI Whisper Integration
- Replaced browser's native speech recognition with OpenAI Whisper (large-v3 quality)
- More accurate transcription, especially for technical terms
- Records audio and sends to Whisper API for transcription
- Visual feedback during recording and transcription

### 4. Separated Prompts
- All prompts moved to `prompts.ts` for easy editing
- Technical interview prompt
- Behavioral interview prompt
- Feedback prompt
- No need to dig through service files to update prompts

## File Changes

### New Files
- `prompts.ts` - Centralized prompt management
- `services/aiService.ts` - Unified AI service supporting multiple providers
- `.env.example` - (blocked by gitignore but created)
- `CHANGES.md` - This file

### Modified Files
- `types.ts` - Added new model types and configurations
- `constants.ts` - Updated to use prompts from separate file, added model configurations
- `components/SetupForm.tsx` - Updated UI to use dropdown for model selection
- `components/InterviewSession.tsx` - Integrated Whisper for speech-to-text
- `vite.config.ts` - Updated environment variable handling for multiple API keys
- `package.json` - Added OpenAI and Anthropic SDK dependencies
- `README.md` - Updated documentation

### Removed/Deprecated
- Old browser-based speech recognition (replaced with Whisper)
- `services/geminiService.ts` - Replaced by `aiService.ts` (but kept for backward compatibility if needed)

## Environment Variables

### Before
```bash
GEMINI_API_KEY=your_key
```

### After
```bash
# At least one required:
GOOGLE_API_KEY=your_google_key       # For Gemini models
OPENAI_API_KEY=your_openai_key       # For GPT models + Whisper
ANTHROPIC_API_KEY=your_anthropic_key # For Claude models
```

## Migration Steps

1. **Install new dependencies**:
   ```bash
   npm install
   ```

2. **Update environment variables**:
   - Rename `GEMINI_API_KEY` to `GOOGLE_API_KEY` (or keep both, vite.config handles fallback)
   - Add `OPENAI_API_KEY` if you want to use GPT models or Whisper
   - Add `ANTHROPIC_API_KEY` if you want to use Claude

3. **Test each model**:
   - Select different models from dropdown
   - Test voice input (requires OPENAI_API_KEY)
   - Verify feedback generation works

## Customization Guide

### To Update Interview Prompts
Edit `prompts.ts`:
```typescript
export const TECHNICAL_INTERVIEW_PROMPT = (role: string, topic: string) => `
  // Your custom prompt here
`;
```

### To Add a New Model
1. Add to `types.ts`:
   ```typescript
   export enum ModelType {
     YOUR_MODEL = 'model-id',
   }
   ```

2. Add to `constants.ts`:
   ```typescript
   export const AVAILABLE_MODELS: ModelConfig[] = [
     {
       id: ModelType.YOUR_MODEL,
       name: 'Your Model Name',
       provider: 'provider',
       description: 'Description'
     }
   ]
   ```

3. Update `services/aiService.ts` to handle the new provider if needed.

## Breaking Changes
- Environment variable `GEMINI_API_KEY` should be renamed to `GOOGLE_API_KEY` (backward compatible for now)
- Import path changed from `geminiService` to `aiService` in components

## Notes
- Whisper transcription requires `OPENAI_API_KEY` - voice input won't work without it
- Each provider requires its own API key
- Browser speech synthesis still used for TTS (no API key required)
- All API calls are made from the browser (dangerouslyAllowBrowser: true)

