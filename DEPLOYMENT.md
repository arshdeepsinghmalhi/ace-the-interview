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
# Build the Docker image
docker build -t ace-the-interview .

# Test locally
docker run -p 8080:8080 \
  -e GOOGLE_API_KEY="your_google_key" \
  -e OPENAI_API_KEY="your_openai_key" \
  -e ANTHROPIC_API_KEY="your_anthropic_key" \
  ace-the-interview

# Visit http://localhost:8080
```

### 3. Deploy to Cloud Run (Manual)

```bash
# Set your project ID
export PROJECT_ID="ace-the-interview"

# Build and submit to Google Container Registry
gcloud builds submit --tag gcr.io/$PROJECT_ID/ace-the-interview

# Deploy to Cloud Run
gcloud run deploy ace-the-interview \
  --image gcr.io/$PROJECT_ID/ace-the-interview \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_API_KEY="your_google_key",OPENAI_API_KEY="your_openai_key",ANTHROPIC_API_KEY="your_anthropic_key"
```

### 4. Deploy with Cloud Build (Automated - Recommended)

```bash
# Store secrets in Secret Manager
echo -n "your_google_key" | gcloud secrets create google-api-key --data-file=-
echo -n "your_openai_key" | gcloud secrets create openai-api-key --data-file=-
echo -n "your_anthropic_key" | gcloud secrets create anthropic-api-key --data-file=-

# Deploy using Cloud Build
gcloud builds submit \
  --config cloudbuild.yaml \
  --substitutions _GOOGLE_API_KEY="your_google_key",_OPENAI_API_KEY="your_openai_key",_ANTHROPIC_API_KEY="your_anthropic_key"
```

## Environment Variables

Set these as Cloud Run environment variables or Cloud Build substitutions:

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_API_KEY` | Optional | For Gemini models |
| `OPENAI_API_KEY` | Optional | For GPT models + Whisper |
| `ANTHROPIC_API_KEY` | Optional | For Claude (requires proxy) |
| `PORT` | Auto | Set by Cloud Run (usually 8080) |

**Note:** At least one API key is required for the app to function.

## Update Environment Variables

```bash
# Update existing deployment with new env vars
gcloud run services update ace-the-interview \
  --region us-central1 \
  --set-env-vars GOOGLE_API_KEY="new_key",OPENAI_API_KEY="new_key"
```

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

