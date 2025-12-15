# Deployment Guide - Google Cloud Run

This guide will help you deploy the Ace The Interview app to Google Cloud Run.

## Prerequisites

1. **Google Cloud Account** with billing enabled
2. **gcloud CLI** installed ([Install Guide](https://cloud.google.com/sdk/docs/install))
3. **Docker** installed locally (for testing)

## How It Works

This app uses **runtime environment variable injection** for Cloud Run deployment:

1. **Build Time:** The app is built without any API keys embedded
2. **Container Startup:** When the container starts, `inject-env.sh` script runs automatically
3. **Runtime Injection:** The script reads Cloud Run environment variables and creates `/usr/share/nginx/html/env-config.js`
4. **Browser Access:** The React app reads API keys from `window.__ENV__` instead of `process.env`

**Benefits:**
- ✅ Update API keys without rebuilding
- ✅ No API keys exposed in Docker image
- ✅ Same image works across environments
- ✅ Works with Cloud Run's environment variables UI

## Quick Start

### 1. Set up Google Cloud Project

```bash
# Login to Google Cloud
gcloud auth login

# Create a new project (or use existing)
gcloud projects create ace-the-interview --name="Ace The Interview"

# Set the project
gcloud config set project ace-the-interview

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com run.googleapis.com containerregistry.googleapis.com
```

### 2. Build and Test Docker Image Locally

```bash
# Build the Docker image (no API keys needed at build time!)
docker build -t ace-the-interview .

# Test locally with runtime environment variables
docker run -p 8080:8080 \
  -e GOOGLE_API_KEY="your_google_key" \
  -e OPENAI_API_KEY="your_openai_key" \
  -e ANTHROPIC_API_KEY="your_anthropic_key" \
  ace-the-interview

# Visit http://localhost:8080
```

**Important:** API keys are now injected at **runtime**, not build time. This means you can update them in Cloud Run without rebuilding!

### 3. Deploy to Cloud Run via GitHub (Recommended)

The easiest way is to connect your GitHub repository directly to Cloud Run:

1. Go to [Google Cloud Run Console](https://console.cloud.google.com/run)
2. Click "Create Service" → "Continuously deploy from a repository"
3. Connect your GitHub account and select your repository
4. Select the branch (e.g., `main`)
5. **Set environment variables** in the Cloud Run UI:
   - `GOOGLE_API_KEY`: Your Gemini API key
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `ANTHROPIC_API_KEY`: Your Claude API key
6. Click "Deploy"

**Advantage:** You can update API keys anytime in the Cloud Run UI without rebuilding!

### 4. Deploy to Cloud Run (Command Line)

```bash
# Set your project ID
export PROJECT_ID=$(gcloud config get-value project)

# Build and deploy (no API keys in build command!)
gcloud run deploy ace-the-interview \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_API_KEY="your_google_key",OPENAI_API_KEY="your_openai_key",ANTHROPIC_API_KEY="your_anthropic_key"
```

### 5. Using Secret Manager (Most Secure)

```bash
# Store secrets in Secret Manager
echo -n "your_google_key" | gcloud secrets create google-api-key --data-file=-
echo -n "your_openai_key" | gcloud secrets create openai-api-key --data-file=-
echo -n "your_anthropic_key" | gcloud secrets create anthropic-api-key --data-file=-

# Get secrets and deploy
GOOGLE_KEY=$(gcloud secrets versions access latest --secret=google-api-key)
OPENAI_KEY=$(gcloud secrets versions access latest --secret=openai-api-key)
ANTHROPIC_KEY=$(gcloud secrets versions access latest --secret=anthropic-api-key)

gcloud builds submit \
  --config cloudbuild.yaml \
  --substitutions _GOOGLE_API_KEY="$GOOGLE_KEY",_OPENAI_API_KEY="$OPENAI_KEY",_ANTHROPIC_API_KEY="$ANTHROPIC_KEY"
```

## Environment Variables

**New in this version:** API keys are now injected at **runtime**, not build time! This means you can update them anytime in the Cloud Run UI without rebuilding your app.

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_API_KEY` | Optional | For Gemini models |
| `OPENAI_API_KEY` | Optional | For GPT models + real-time speech |
| `ANTHROPIC_API_KEY` | Optional | For Claude (requires proxy) |
| `PORT` | Auto | Set by Cloud Run (usually 8080) |

**Note:** 
- At least one API key is required for the app to function
- API keys are injected at **runtime** via a startup script (`inject-env.sh`)
- The startup script reads Cloud Run environment variables and injects them into `window.__ENV__`

## Update API Keys

To update API keys, simply update them in the Cloud Run UI (no rebuild needed!):

### Via Cloud Run Console:
1. Go to your service in [Cloud Run Console](https://console.cloud.google.com/run)
2. Click "Edit & Deploy New Revision"
3. Go to "Variables & Secrets" tab
4. Update the environment variables
5. Click "Deploy"

### Via Command Line:
```bash
gcloud run services update ace-the-interview \
  --region us-central1 \
  --set-env-vars GOOGLE_API_KEY="new_key",OPENAI_API_KEY="new_key",ANTHROPIC_API_KEY="new_key"
```

**Advantage:** Instant updates without rebuilding the Docker image!

## View Logs

```bash
# View logs
gcloud run services logs read ace-the-interview --region us-central1 --limit 50

# Stream logs
gcloud run services logs tail ace-the-interview --region us-central1
```

## Custom Domain

```bash
# Map custom domain
gcloud run domain-mappings create \
  --service ace-the-interview \
  --domain interview.yourdomain.com \
  --region us-central1
```

## Scaling Configuration

```bash
# Configure scaling
gcloud run services update ace-the-interview \
  --region us-central1 \
  --min-instances 0 \
  --max-instances 10 \
  --concurrency 80 \
  --cpu 1 \
  --memory 512Mi
```

## Cost Optimization

Cloud Run pricing is based on:
- **CPU/Memory usage** (billed per 100ms)
- **Requests** (2 million free per month)
- **Networking** (1 GB free egress per month)

To minimize costs:
1. Set `--min-instances 0` (scale to zero when idle)
2. Use appropriate CPU/memory allocation
3. Enable CDN for static assets
4. Consider API costs (OpenAI/Google/Anthropic)

## Security Best Practices

1. **Use Secret Manager** for API keys instead of environment variables
2. **Enable Cloud Armor** for DDoS protection
3. **Set up Cloud CDN** for better performance
4. **Use HTTPS** (enabled by default on Cloud Run)
5. **Implement rate limiting** for API calls

## Troubleshooting

### Build Fails
```bash
# Check build logs
gcloud builds log $(gcloud builds list --limit 1 --format="value(ID)")
```

### Container Won't Start
```bash
# Check service details
gcloud run services describe ace-the-interview --region us-central1

# Check logs
gcloud run services logs read ace-the-interview --region us-central1
```

### API Keys Not Working
1. **Check if env vars are set in Cloud Run:**
   ```bash
   gcloud run services describe ace-the-interview --region us-central1 --format="yaml(spec.template.spec.containers[0].env)"
   ```

2. **Check browser console** for `window.__ENV__`:
   - Open DevTools Console
   - Type: `console.log(window.__ENV__)`
   - You should see your API keys (first 10 chars visible)

3. **Check container logs** for injection script output:
   ```bash
   gcloud run services logs read ace-the-interview --region us-central1 --limit 50
   ```
   Look for: "🔧 Injecting runtime environment variables..."

4. **Common issues:**
   - Environment variables not set in Cloud Run UI
   - Typo in environment variable names (must match exactly)
   - API keys are invalid or have insufficient quota
   - Browser cache (hard refresh: Cmd+Shift+R or Ctrl+Shift+R)

## Useful Commands

```bash
# List all Cloud Run services
gcloud run services list

# Get service URL
gcloud run services describe ace-the-interview --region us-central1 --format="value(status.url)"

# Delete service
gcloud run services delete ace-the-interview --region us-central1

# View service metrics
gcloud run services describe ace-the-interview --region us-central1 --format="yaml(status.traffic)"
```

## CI/CD Setup

For automatic deployments on git push:

1. Connect GitHub repository to Cloud Build
2. Set up build triggers
3. Store API keys in Secret Manager
4. Use the provided `cloudbuild.yaml`

## Support

For issues:
- Cloud Run docs: https://cloud.google.com/run/docs
- Pricing: https://cloud.google.com/run/pricing
- Community: https://stackoverflow.com/questions/tagged/google-cloud-run

