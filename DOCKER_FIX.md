# Docker Container Startup Fix

## The Problem

The container was failing to start with the error:
```
The user-provided container failed to start and listen on the port defined by PORT=8080
```

## Root Cause

The initial fix attempted to use the nginx Docker image's `/docker-entrypoint.d/` directory for running scripts, but this approach had issues:
1. The CMD was accidentally removed, so nginx never started
2. When CMD was added back, there were conflicts between the default nginx entrypoint and our custom script
3. The script placement didn't reliably execute before nginx started

## The Solution

Following the pattern from your working `Assignment_Parser` project, we now use a **custom ENTRYPOINT script** that:

1. ✅ Sets up the PORT variable
2. ✅ Generates nginx configuration dynamically
3. ✅ Injects environment variables into index.html as inline script
4. ✅ Tests nginx configuration
5. ✅ Starts nginx with `exec`

## Files Changed

### 1. `docker-entrypoint.sh` (NEW - Replaces inject-env.sh)

**What it does:**
- Reads `PORT` environment variable (defaults to 8080)
- Creates nginx config at `/etc/nginx/conf.d/default.conf` with correct PORT
- Reads Cloud Run environment variables: `GOOGLE_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`
- Injects them directly into `index.html` as an inline `<script>` tag
- Sets `window.__ENV__` with all API keys
- Tests nginx config
- Starts nginx using `exec nginx -g "daemon off;"`

**Key features:**
- Uses `escape_js()` function to safely escape special characters in API keys
- Provides detailed logging for debugging
- Shows API key status (set/not set) without exposing actual values
- Uses `exec` to replace the shell process with nginx (proper signal handling)

### 2. `Dockerfile` (UPDATED)

**Changes:**
- ❌ Removed: `COPY nginx.conf` (generated dynamically now)
- ❌ Removed: `inject-env.sh` script
- ❌ Removed: `CMD` line
- ✅ Added: `COPY docker-entrypoint.sh` and `chmod +x`
- ✅ Added: `ENTRYPOINT ["/docker-entrypoint.sh"]`

**Why this works:**
- Custom ENTRYPOINT has full control over startup sequence
- No conflicts with default nginx entrypoint
- Script runs before anything else
- Nginx starts reliably with correct configuration

### 3. `inject-env.sh` (DELETED)

No longer needed - functionality moved to `docker-entrypoint.sh`

## Comparison with Working Project

This now matches your `Assignment_Parser` project structure:

| Feature | Assignment_Parser | ace-the-interview (Fixed) |
|---------|-------------------|---------------------------|
| Entrypoint | Custom `docker-entrypoint.sh` | ✅ Custom `docker-entrypoint.sh` |
| Nginx config | Generated dynamically | ✅ Generated dynamically |
| Env injection | Inline script in HTML | ✅ Inline script in HTML |
| PORT handling | `envsubst` in entrypoint | ✅ Direct in entrypoint |
| Starts nginx | `exec nginx -g "daemon off;"` | ✅ `exec nginx -g "daemon off;"` |

## Expected Logs on Startup

When the container starts, you should see:

```
🚀 Starting container initialization...
📍 Port: 8080
✅ Nginx configuration created
🔧 Injecting runtime environment variables...
✅ Environment variables injected into index.html
📊 API Keys status:
   - GOOGLE_API_KEY: ✅ Set (39 chars)
   - OPENAI_API_KEY: ✅ Set (164 chars)
   - ANTHROPIC_API_KEY: ✅ Set (108 chars)
🔍 Testing nginx configuration...
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
🚀 Starting nginx...
```

Then in the browser console, you should see:
```
✅ Environment variables loaded from Cloud Run
```

And `console.log(window.__ENV__)` should show your API keys.

## Deploy Now

Your updated code is ready to deploy! Just push and let Cloud Run rebuild:

```bash
git add .
git commit -m "Fix Docker container startup with custom entrypoint"
git push origin main
```

Or if deploying via command line:

```bash
gcloud run deploy ace-the-interview \
  --source . \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_API_KEY="${GOOGLE_API_KEY}",OPENAI_API_KEY="${OPENAI_API_KEY}",ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY}"
```

## Verify Deployment

1. **Check logs:**
   ```bash
   gcloud run services logs read ace-the-interview --region europe-west1 --limit 50
   ```

2. **Test in browser:**
   - Open your app
   - Press F12 for DevTools Console
   - Type: `console.log(window.__ENV__)`
   - Should see your API keys

3. **Test functionality:**
   - Start an interview session
   - Verify AI responses work
   - Check voice input (if using OpenAI Whisper)

## Troubleshooting

### Container still fails to start?

Check logs for the specific error:
```bash
gcloud run services logs read ace-the-interview --region europe-west1 --limit 100
```

### Environment variables not showing?

Verify they're set in Cloud Run:
```bash
gcloud run services describe ace-the-interview --region europe-west1 \
  --format="yaml(spec.template.spec.containers[0].env)"
```

### Nginx test fails?

The entrypoint script will continue even if nginx test fails, but check the logs for syntax errors in the generated config.

## Benefits of This Approach

✅ **Reliable startup** - Custom entrypoint controls entire sequence  
✅ **Better logging** - See exactly what's happening during startup  
✅ **No conflicts** - No interaction with default nginx entrypoint  
✅ **Proven pattern** - Same as your working Assignment_Parser project  
✅ **Easy debugging** - Clear error messages and status indicators  
✅ **Runtime injection** - Update API keys without rebuilding  

