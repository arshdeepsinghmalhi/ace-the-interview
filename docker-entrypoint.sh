#!/bin/sh

echo "==> Container starting..."

# Use PORT environment variable if set, otherwise default to 8080
PORT=${PORT:-8080}
echo "==> PORT is set to: ${PORT}"

# Create nginx configuration directory
echo "==> Creating nginx config directory..."
mkdir -p /etc/nginx/conf.d || { echo "ERROR: Failed to create nginx conf.d directory"; exit 1; }

# Create nginx config
echo "==> Creating nginx configuration for port ${PORT}..."
cat > /etc/nginx/conf.d/default.conf << EOF
server {
    listen ${PORT};
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location ~* \.html\$ {
        expires -1;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}
EOF

if [ ! -f /etc/nginx/conf.d/default.conf ]; then
  echo "ERROR: Failed to create nginx configuration"
  exit 1
fi

echo "==> Nginx configuration created successfully"

# Inject environment variables
echo "==> Injecting environment variables..."

if [ -f /usr/share/nginx/html/index.html ]; then
  # Escape environment variables for JavaScript (simple approach: replace ' with \')
  GOOGLE_KEY="${GOOGLE_API_KEY:-}"
  OPENAI_KEY="${OPENAI_API_KEY:-}"
  ANTHROPIC_KEY="${ANTHROPIC_API_KEY:-}"
  
  # Replace single quotes with escaped quotes
  GOOGLE_KEY=$(echo "$GOOGLE_KEY" | sed "s/'/\\\\'/g")
  OPENAI_KEY=$(echo "$OPENAI_KEY" | sed "s/'/\\\\'/g")
  ANTHROPIC_KEY=$(echo "$ANTHROPIC_KEY" | sed "s/'/\\\\'/g")

  # Create inline script
  ENV_SCRIPT="<script>window.__ENV__={GOOGLE_API_KEY:'$GOOGLE_KEY',OPENAI_API_KEY:'$OPENAI_KEY',ANTHROPIC_API_KEY:'$ANTHROPIC_KEY'};</script>"
  
  # Inject before </head>
  sed -i "s|</head>|$ENV_SCRIPT</head>|" /usr/share/nginx/html/index.html 2>/dev/null && \
    echo "==> Environment variables injected" || \
    echo "==> Warning: Could not inject environment variables"
  
  # Log status (without exposing full keys)
  [ -n "$GOOGLE_API_KEY" ] && echo "   GOOGLE_API_KEY: Set" || echo "   GOOGLE_API_KEY: Not set"
  [ -n "$OPENAI_API_KEY" ] && echo "   OPENAI_API_KEY: Set" || echo "   OPENAI_API_KEY: Not set"
  [ -n "$ANTHROPIC_API_KEY" ] && echo "   ANTHROPIC_API_KEY: Set" || echo "   ANTHROPIC_API_KEY: Not set"
else
  echo "==> ERROR: index.html not found at /usr/share/nginx/html/"
  ls -la /usr/share/nginx/html/ || true
fi

# Test nginx configuration
echo "==> Testing nginx configuration..."
nginx -t || {
  echo "==> ERROR: Nginx configuration test failed!"
  echo "==> Config file contents:"
  cat /etc/nginx/conf.d/default.conf || true
  exit 1
}

echo "==> Nginx configuration is valid"
echo "==> Starting nginx on port ${PORT}..."

# Start nginx (this replaces the current process)
exec nginx -g "daemon off;"

