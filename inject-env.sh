#!/bin/sh

# This script runs at container startup to inject runtime environment variables
# into the built React app for Cloud Run deployment

set -e

# Path to the built index.html
INDEX_HTML="/usr/share/nginx/html/index.html"

echo "🔧 Injecting runtime environment variables..."

# Create a JavaScript snippet that exposes env vars to the browser
cat > /usr/share/nginx/html/env-config.js << EOF
// Runtime environment configuration injected by Cloud Run
window.__ENV__ = {
  GOOGLE_API_KEY: "${GOOGLE_API_KEY}",
  OPENAI_API_KEY: "${OPENAI_API_KEY}",
  ANTHROPIC_API_KEY: "${ANTHROPIC_API_KEY}"
};
console.log('✅ Environment variables loaded from Cloud Run');
EOF

# Inject the script into index.html (before the closing </head> tag)
# Only inject if not already present
if ! grep -q "env-config.js" "$INDEX_HTML"; then
  sed -i 's|</head>|  <script src="/env-config.js"></script>\n  </head>|' "$INDEX_HTML"
  echo "✅ Injected env-config.js into index.html"
else
  echo "ℹ️  env-config.js already present in index.html"
fi

echo "🚀 Environment injection complete!"
echo "📊 API Keys status:"
echo "   - GOOGLE_API_KEY: ${GOOGLE_API_KEY:+✅ Set}${GOOGLE_API_KEY:-❌ Not set}"
echo "   - OPENAI_API_KEY: ${OPENAI_API_KEY:+✅ Set}${OPENAI_API_KEY:-❌ Not set}"
echo "   - ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:+✅ Set}${ANTHROPIC_API_KEY:-❌ Not set}"

