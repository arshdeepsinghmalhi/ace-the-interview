#!/bin/sh
set -e

# Use PORT environment variable if set, otherwise default to 8080
export PORT=${PORT:-8080}

echo "🚀 Starting container initialization..."
echo "📍 Port: ${PORT}"

# Create nginx configuration directory
mkdir -p /etc/nginx/conf.d

# Create nginx config with the PORT variable
cat > /etc/nginx/conf.d/default.conf <<EOF
server {
    listen ${PORT};
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Enable gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # SPA fallback - serve index.html for all routes
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Don't cache HTML
    location ~* \.html\$ {
        expires -1;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}
EOF

echo "✅ Nginx configuration created"

# Inject environment variables into index.html
# These come from Cloud Run environment variables
GOOGLE_API_KEY_VALUE="${GOOGLE_API_KEY:-}"
OPENAI_API_KEY_VALUE="${OPENAI_API_KEY:-}"
ANTHROPIC_API_KEY_VALUE="${ANTHROPIC_API_KEY:-}"

echo "🔧 Injecting runtime environment variables..."

# Function to escape single quotes and backslashes for JavaScript strings
escape_js() {
  if [ -z "$1" ]; then
    echo ""
  else
    echo "$1" | sed "s/'/\\\\'/g" | sed 's/\\/\\\\/g'
  fi
}

# Only proceed if we have index.html to modify
if [ -f /usr/share/nginx/html/index.html ]; then
  GOOGLE_KEY_JS=$(escape_js "$GOOGLE_API_KEY_VALUE")
  OPENAI_KEY_JS=$(escape_js "$OPENAI_API_KEY_VALUE")
  ANTHROPIC_KEY_JS=$(escape_js "$ANTHROPIC_API_KEY_VALUE")

  # Inject directly into index.html as an inline script
  # This ensures the config is available immediately when the page loads
  CONFIG_SCRIPT="<script>window.__ENV__=window.__ENV__||{};window.__ENV__.GOOGLE_API_KEY='${GOOGLE_KEY_JS}';window.__ENV__.OPENAI_API_KEY='${OPENAI_KEY_JS}';window.__ENV__.ANTHROPIC_API_KEY='${ANTHROPIC_KEY_JS}';console.log('✅ Environment variables loaded from Cloud Run');</script>"
  
  # Insert before </head> tag in index.html
  sed -i "s|</head>|${CONFIG_SCRIPT}</head>|" /usr/share/nginx/html/index.html 2>/dev/null || true
  
  echo "✅ Environment variables injected into index.html"
fi

echo "📊 API Keys status:"
echo "   - GOOGLE_API_KEY: ${GOOGLE_API_KEY_VALUE:+✅ Set (${#GOOGLE_API_KEY_VALUE} chars)}${GOOGLE_API_KEY_VALUE:-❌ Not set}"
echo "   - OPENAI_API_KEY: ${OPENAI_API_KEY_VALUE:+✅ Set (${#OPENAI_API_KEY_VALUE} chars)}${OPENAI_API_KEY_VALUE:-❌ Not set}"
echo "   - ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY_VALUE:+✅ Set (${#ANTHROPIC_API_KEY_VALUE} chars)}${ANTHROPIC_API_KEY_VALUE:-❌ Not set}"

# Test nginx configuration
echo "🔍 Testing nginx configuration..."
nginx -t 2>&1 || echo "⚠️  Warning: Nginx configuration test had issues, but continuing..."

echo "🚀 Starting nginx..."

# Execute nginx (replaces the shell process)
exec nginx -g "daemon off;"

