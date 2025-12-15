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

# Copy custom entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose port (Cloud Run uses PORT env variable, default to 8080)
EXPOSE 8080

# Use custom entrypoint to handle PORT env var and inject runtime environment variables
ENTRYPOINT ["/docker-entrypoint.sh"]

