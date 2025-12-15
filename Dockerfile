# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application WITHOUT embedding API keys
# API keys will be injected at runtime from Cloud Run environment variables
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy environment injection script
COPY inject-env.sh /docker-entrypoint.d/40-inject-env.sh
RUN chmod +x /docker-entrypoint.d/40-inject-env.sh

# Expose port (Cloud Run uses PORT env variable, default to 8080)
ENV PORT=8080
EXPOSE 8080

# The nginx image automatically runs scripts in /docker-entrypoint.d/ before starting nginx
# Our inject-env.sh script will run automatically and inject the Cloud Run env vars

