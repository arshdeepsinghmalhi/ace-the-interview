#!/bin/bash

# Ace The Interview - Google Cloud Run Deployment Script
# Usage: ./deploy.sh [PROJECT_ID]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Ace The Interview - Cloud Run Deployment${NC}"
echo ""

# Get project ID
if [ -z "$1" ]; then
    echo -e "${YELLOW}Enter your Google Cloud Project ID:${NC}"
    read PROJECT_ID
else
    PROJECT_ID=$1
fi

echo -e "${GREEN}Using project: ${PROJECT_ID}${NC}"

# Set project
echo -e "${YELLOW}Setting up Google Cloud project...${NC}"
gcloud config set project $PROJECT_ID

# Enable required APIs
echo -e "${YELLOW}Enabling required APIs...${NC}"
gcloud services enable cloudbuild.googleapis.com run.googleapis.com containerregistry.googleapis.com

# Get API keys
echo ""
echo -e "${YELLOW}Enter your API keys (press Enter to skip):${NC}"
echo ""
read -p "Google API Key (for Gemini): " GOOGLE_API_KEY
read -p "OpenAI API Key (for GPT/Whisper): " OPENAI_API_KEY
read -p "Anthropic API Key (for Claude): " ANTHROPIC_API_KEY

# Build image
echo ""
echo -e "${YELLOW}Building Docker image...${NC}"
gcloud builds submit --tag gcr.io/$PROJECT_ID/ace-the-interview

# Prepare env vars
ENV_VARS=""
if [ ! -z "$GOOGLE_API_KEY" ]; then
    ENV_VARS="${ENV_VARS}GOOGLE_API_KEY=${GOOGLE_API_KEY},"
fi
if [ ! -z "$OPENAI_API_KEY" ]; then
    ENV_VARS="${ENV_VARS}OPENAI_API_KEY=${OPENAI_API_KEY},"
fi
if [ ! -z "$ANTHROPIC_API_KEY" ]; then
    ENV_VARS="${ENV_VARS}ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY},"
fi
# Remove trailing comma
ENV_VARS=${ENV_VARS%,}

# Deploy to Cloud Run
echo ""
echo -e "${YELLOW}Deploying to Cloud Run...${NC}"
if [ -z "$ENV_VARS" ]; then
    gcloud run deploy ace-the-interview \
        --image gcr.io/$PROJECT_ID/ace-the-interview \
        --platform managed \
        --region us-central1 \
        --allow-unauthenticated
else
    gcloud run deploy ace-the-interview \
        --image gcr.io/$PROJECT_ID/ace-the-interview \
        --platform managed \
        --region us-central1 \
        --allow-unauthenticated \
        --set-env-vars $ENV_VARS
fi

# Get service URL
echo ""
SERVICE_URL=$(gcloud run services describe ace-the-interview --region us-central1 --format="value(status.url)")

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo -e "${GREEN}Your app is live at:${NC}"
echo -e "${GREEN}${SERVICE_URL}${NC}"
echo ""
echo -e "${YELLOW}To update environment variables later:${NC}"
echo "gcloud run services update ace-the-interview --region us-central1 --set-env-vars KEY=VALUE"
echo ""
echo -e "${YELLOW}To view logs:${NC}"
echo "gcloud run services logs tail ace-the-interview --region us-central1"
echo ""

