# Deployment Guide - Google Cloud Run

This guide will help you deploy the Ace The Interview app to Google Cloud Run.

## Prerequisites

1. **Google Cloud Account** with billing enabled
2. **gcloud CLI** installed ([Install Guide](https://cloud.google.com/sdk/docs/install))
3. **Docker** installed locally (for testing)

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
# Build the Docker image with API keys as build arguments
docker build \
  --build-arg GOOGLE_API_KEY="your_google_key" \
  --build-arg OPENAI_API_KEY="your_openai_key" \
  --build-arg ANTHROPIC_API_KEY="your_anthropic_key" \
  -t ace-the-interview .

# Test locally
docker run -p 8080:8080 ace-the-interview

# Visit http://localhost:8080
```

**Important:** API keys must be provided as build arguments because Vite bakes them into the JavaScript bundle at build time.

### 3. Deploy to Cloud Run (Easy Way - Recommended)

Use the provided deployment script:

```bash
# Make sure your .env.local file has your API keys
chmod +x deploy-cloudrun.sh
./deploy-cloudrun.sh
```

This script will:
- Load API keys from `.env.local`
- Build the Docker image with API keys as build arguments
- Deploy to Google Cloud Run
- Display your app URL

### 4. Deploy to Cloud Run (Manual)

```bash
# Load your API keys from .env.local
export $(cat .env.local | grep -v '^#' | xargs)

# Set your project ID
export PROJECT_ID=$(gcloud config get-value project)

# Build with API keys and submit to Cloud Run
gcloud builds submit \
  --config cloudbuild.yaml \
  --substitutions _GOOGLE_API_KEY="$GOOGLE_API_KEY",_OPENAI_API_KEY="$OPENAI_API_KEY",_ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY"
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

**Important:** API keys must be provided as **build arguments** because this is a Vite application that bakes environment variables into the JavaScript bundle at build time.

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_API_KEY` | Optional | For Gemini models |
| `OPENAI_API_KEY` | Optional | For GPT models + real-time speech |
| `ANTHROPIC_API_KEY` | Optional | For Claude (requires proxy) |
| `PORT` | Auto | Set by Cloud Run (usually 8080) |

**Note:** 
- At least one API key is required for the app to function
- API keys are injected at **build time**, not runtime
- The deployment script and cloudbuild.yaml handle this automatically

## Update API Keys

To update API keys, you must **rebuild and redeploy** the application:

```bash
# Update your .env.local file with new keys, then redeploy
./deploy-cloudrun.sh

# Or manually:
export $(cat .env.local | grep -v '^#' | xargs)
gcloud builds submit \
  --config cloudbuild.yaml \
  --substitutions _GOOGLE_API_KEY="$GOOGLE_API_KEY",_OPENAI_API_KEY="$OPENAI_API_KEY",_ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY"
```

**Note:** Simply updating Cloud Run environment variables won't work because the keys are baked into the build.

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
- Ensure environment variables are set correctly
- Check Secret Manager permissions
- Verify API keys are valid and have sufficient quota

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

