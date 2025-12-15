# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Accept build arguments for API keys
ARG GOOGLE_API_KEY
ARG OPENAI_API_KEY
ARG ANTHROPIC_API_KEY

# Set environment variables for the build
ENV GOOGLE_API_KEY=$GOOGLE_API_KEY
ENV OPENAI_API_KEY=$OPENAI_API_KEY
ENV ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY

# Build the application (Vite will inject these env vars)
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port (Cloud Run uses PORT env variable, default to 8080)
ENV PORT=8080
EXPOSE 8080

# Start nginx
CMD sed -i -e 's/$PORT/'"$PORT"'/g' /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'

