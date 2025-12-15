# 🚀 Quick Deploy to Google Cloud Run

This guide will help you deploy in 5 minutes!

## Prerequisites

1. **Google Cloud Project** with billing enabled
2. **gcloud CLI** installed and authenticated
3. **API Keys** in your `.env.local` file

## Step-by-Step Deployment

### 1. Verify Your Setup

Make sure your `.env.local` file exists with your API keys:

```bash
cat .env.local
```

You should see:
```
GOOGLE_API_KEY=AIzaSy...
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...
```

### 2. Configure Google Cloud

```bash
# Login to Google Cloud
gcloud auth login

# Set your project (replace with your project ID)
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com run.googleapis.com
```

### 3. Deploy (Easy Way)

```bash
# Make the script executable
chmod +x deploy-cloudrun.sh

# Deploy!
./deploy-cloudrun.sh
```

That's it! The script will:
- ✅ Load API keys from `.env.local`
- ✅ Build Docker image with API keys baked in
- ✅ Deploy to Cloud Run
- ✅ Show your live URL

### 4. Deploy (Manual Way)

```bash
# Load environment variables
export $(cat .env.local | grep -v '^#' | xargs)

# Build and deploy
gcloud builds submit \
  --config cloudbuild.yaml \
  --substitutions _GOOGLE_API_KEY="$GOOGLE_API_KEY",_OPENAI_API_KEY="$OPENAI_API_KEY",_ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY"
```

## View Your App

```bash
# Get your app URL
gcloud run services describe ace-the-interview \
  --region us-central1 \
  --format="value(status.url)"
```

## View Logs

```bash
# View recent logs
gcloud run services logs read ace-the-interview --region us-central1 --limit 50

# Stream live logs
gcloud run services logs tail ace-the-interview --region us-central1
```

## Update API Keys

To change API keys:

1. Update `.env.local` with new keys
2. Run `./deploy-cloudrun.sh` again

API keys are baked into the build, so you must rebuild to update them.

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

### API Keys Not Working in Browser

Make sure:
1. ✅ API keys are in `.env.local`
2. ✅ You used the deployment script or passed `--build-arg` to Docker
3. ✅ You rebuilt and redeployed after changing keys

Remember: API keys are injected at **build time**, not runtime!

## Cost Estimate

Cloud Run pricing (Free tier includes):
- **2 million requests/month** free
- **360,000 GB-seconds/month** free
- **180,000 vCPU-seconds/month** free

With `--min-instances 0`, the app scales to zero when idle = **$0 cost when not in use**!

## Delete Service

```bash
gcloud run services delete ace-the-interview --region us-central1
```

## Need Help?

- Full deployment docs: [DEPLOYMENT.md](./DEPLOYMENT.md)
- Cloud Run docs: https://cloud.google.com/run/docs
- Issues: Create an issue on GitHub

