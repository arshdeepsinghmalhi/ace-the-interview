<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1OPcAxiMlINVtt19oc5TTRn8TK-Mw4Qju

## Features

- **Multiple AI Models**: Choose from Gemini 2.5 Flash, Gemini 3.0 Pro, GPT-4o, GPT-4o-mini, or Claude Sonnet 4.5
- **Voice Recognition**: Uses OpenAI Whisper (large-v3 quality) for accurate speech-to-text
- **Text-to-Speech**: AI interviewer speaks responses using browser's speech synthesis
- **Interview Styles**: Technical (coding/algorithms) or Behavioral (soft skills) interviews
- **Real-time Feedback**: Get comprehensive performance evaluation at the end

## Run Locally

**Prerequisites:**  Node.js 18+

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up API keys in `.env.local` file:
   ```bash
   # At least one of these is required depending on which model you want to use:
   
   # For Gemini models (2.5 Flash, 3.0 Pro) - Works in browser ✅
   GOOGLE_API_KEY=your_google_api_key
   
   # For GPT-4o and GPT-4o-mini + Whisper transcription (Required for voice input) - Works in browser ✅
   OPENAI_API_KEY=your_openai_api_key
   
   # For Claude Sonnet 4 - ⚠️ Requires backend proxy (doesn't work directly in browser due to CORS)
   ANTHROPIC_API_KEY=your_anthropic_api_key
   ```

   **Note about Claude/Anthropic:** The Anthropic API has CORS restrictions that prevent direct browser usage. To use Claude Sonnet 4, you'll need to set up a backend proxy server. Google and OpenAI models work fine directly in the browser.

3. Run the app:
   ```bash
   npm run dev
   ```

4. Open your browser to `http://localhost:3000`

## Deploy to Google Cloud Run

**New:** Now with runtime environment variable injection! Update API keys without rebuilding. 🎉

For detailed deployment instructions, see:
- **[CLOUD_RUN_SETUP.md](./CLOUD_RUN_SETUP.md)** - Quick setup guide with troubleshooting
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Complete deployment documentation

### Quick Deploy (GitHub Integration - Recommended)

1. Push your code to GitHub
2. Go to [Cloud Run Console](https://console.cloud.google.com/run)
3. Click "Create Service" → "Continuously deploy from repository"
4. Connect your GitHub repo
5. **Add environment variables** in the Cloud Run UI:
   - `GOOGLE_API_KEY`
   - `OPENAI_API_KEY`
   - `ANTHROPIC_API_KEY`
6. Deploy!

**Benefits:**
- ✅ Update API keys anytime in Cloud Run UI (no rebuild needed!)
- ✅ API keys are never baked into Docker image (more secure)
- ✅ Automatic deployments on git push

### Command Line Deploy

```bash
gcloud run deploy ace-the-interview \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_API_KEY="your_key",OPENAI_API_KEY="your_key",ANTHROPIC_API_KEY="your_key"
```

## Customization

### Update Interview Prompts

All interview prompts are now centralized in `prompts.ts` for easy customization:

- **Technical Interview Prompt**: Modify `TECHNICAL_INTERVIEW_PROMPT`
- **Behavioral Interview Prompt**: Modify `BEHAVIORAL_INTERVIEW_PROMPT`
- **Feedback Prompt**: Modify `FEEDBACK_PROMPT`

### Add or Remove Models

Update `constants.ts` to add/remove models from the dropdown:

```typescript
export const AVAILABLE_MODELS: ModelConfig[] = [
  // Add your model configuration here
]
```
