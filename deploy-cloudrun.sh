#!/bin/bash

# Deploy to Google Cloud Run with API keys
# Usage: ./deploy-cloudrun.sh

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Deploying Ace The Interview to Google Cloud Run${NC}\n"

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${RED}❌ Error: .env.local file not found${NC}"
    echo "Please create .env.local with your API keys"
    exit 1
fi

# Load environment variables from .env.local
echo -e "${BLUE}📝 Loading environment variables...${NC}"
export $(cat .env.local | grep -v '^#' | xargs)

# Get project ID
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}❌ Error: No GCP project set${NC}"
    echo "Run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo -e "${GREEN}✓ Project ID: $PROJECT_ID${NC}"

# Verify API keys are set
if [ -z "$GOOGLE_API_KEY" ] && [ -z "$OPENAI_API_KEY" ] && [ -z "$ANTHROPIC_API_KEY" ]; then
    echo -e "${RED}❌ Error: No API keys found in .env.local${NC}"
    echo "At least one API key is required"
    exit 1
fi

echo -e "${GREEN}✓ API keys loaded${NC}\n"

# Build and deploy using Cloud Build
echo -e "${BLUE}🔨 Building and deploying...${NC}\n"

gcloud builds submit \
  --config cloudbuild.yaml \
  --substitutions _GOOGLE_API_KEY="$GOOGLE_API_KEY",_OPENAI_API_KEY="$OPENAI_API_KEY",_ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY"

# Get the service URL
SERVICE_URL=$(gcloud run services describe ace-the-interview --region us-central1 --format="value(status.url)" 2>/dev/null)

echo -e "\n${GREEN}✅ Deployment complete!${NC}"
echo -e "${GREEN}🌐 Your app is live at: ${BLUE}$SERVICE_URL${NC}\n"

