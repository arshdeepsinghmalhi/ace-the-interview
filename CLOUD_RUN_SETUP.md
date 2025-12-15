# Cloud Run Environment Variables Setup

## Quick Fix for Your Issue

Your app couldn't access the environment variables because they were being set at **runtime** in Cloud Run, but the old setup required them at **build time**.

**Solution:** The app now uses runtime environment variable injection! 🎉

## How to Deploy (GitHub Integration)

1. **Connect GitHub to Cloud Run:**
   - Go to [Cloud Run Console](https://console.cloud.google.com/run)
   - Click "Create Service"
   - Select "Continuously deploy from a repository (source)"
   - Authenticate with GitHub and select your repository
   - Choose your branch (e.g., `main`)

2. **Configure the Build:**
   - Build Type: `Dockerfile`
   - Dockerfile path: `Dockerfile` (default)

3. **Set Environment Variables:**
   Go to the "Variables & Secrets" tab and add:
   
   | Name | Value | Description |
   |------|-------|-------------|
   | `GOOGLE_API_KEY` | `AIza...` | Your Google Gemini API key |
   | `OPENAI_API_KEY` | `sk-proj-...` | Your OpenAI API key |
   | `ANTHROPIC_API_KEY` | `sk-ant-...` | Your Anthropic Claude API key |

4. **Deploy!**
   - Click "Create" or "Deploy"
   - Wait for the build to complete
   - Your app will be live!

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Build Time (Docker build)                                │
│    - Builds React app WITHOUT API keys                      │
│    - Creates static bundle                                   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Container Startup (Cloud Run)                            │
│    - inject-env.sh script runs automatically                │
│    - Reads Cloud Run environment variables                  │
│    - Creates /usr/share/nginx/html/env-config.js            │
│    - Injects <script src="/env-config.js"> into index.html  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Browser Runtime                                           │
│    - Loads env-config.js                                     │
│    - window.__ENV__ = { GOOGLE_API_KEY: "...", ... }        │
│    - React app reads from window.__ENV__                     │
└─────────────────────────────────────────────────────────────┘
```

## Verify It's Working

### 1. Check Container Logs
```bash
gcloud run services logs read ace-the-interview --region us-central1 --limit 50
```

Look for:
```
🔧 Injecting runtime environment variables...
✅ Injected env-config.js into index.html
🚀 Environment injection complete!
📊 API Keys status:
   - GOOGLE_API_KEY: ✅ Set
   - OPENAI_API_KEY: ✅ Set
   - ANTHROPIC_API_KEY: ✅ Set
```

### 2. Check Browser Console
Open your deployed app and press `F12` to open DevTools Console, then type:

```javascript
console.log(window.__ENV__);
```

You should see:
```javascript
{
  GOOGLE_API_KEY: "AIzaSyDh...",
  OPENAI_API_KEY: "sk-proj-VJi...",
  ANTHROPIC_API_KEY: "sk-ant-api..."
}
```

### 3. Check Environment Variables in Cloud Run
```bash
gcloud run services describe ace-the-interview \
  --region us-central1 \
  --format="yaml(spec.template.spec.containers[0].env)"
```

## Updating API Keys

**No rebuild needed!** Just update the environment variables:

### Via Cloud Run Console:
1. Go to your service
2. Click "Edit & Deploy New Revision"
3. Go to "Variables & Secrets"
4. Update the values
5. Click "Deploy"

### Via Command Line:
```bash
gcloud run services update ace-the-interview \
  --region us-central1 \
  --update-env-vars GOOGLE_API_KEY="new_key"
```

## Troubleshooting

### ❌ `window.__ENV__` is undefined

**Cause:** Environment variables not set in Cloud Run or injection script failed.

**Fix:**
1. Check if env vars are set in Cloud Run:
   ```bash
   gcloud run services describe ace-the-interview --region us-central1 --format="yaml(spec.template.spec.containers[0].env)"
   ```

2. Check container logs for errors:
   ```bash
   gcloud run services logs read ace-the-interview --region us-central1
   ```

3. Redeploy with environment variables:
   ```bash
   gcloud run services update ace-the-interview \
     --region us-central1 \
     --set-env-vars GOOGLE_API_KEY="your_key",OPENAI_API_KEY="your_key"
   ```

### ❌ API Keys showing but API calls fail

**Cause:** Invalid API keys or insufficient quota.

**Fix:**
1. Verify keys are valid on respective platforms:
   - Google: https://makersuite.google.com/app/apikey
   - OpenAI: https://platform.openai.com/api-keys
   - Anthropic: https://console.anthropic.com/

2. Check API quota and billing

3. Check browser console for specific error messages

### ❌ Old build still showing after updating env vars

**Cause:** Browser cache.

**Fix:** Hard refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows/Linux)

## Files Modified

- `Dockerfile` - Removed build-time ARG, added runtime injection script
- `inject-env.sh` - New script that injects env vars at container startup
- `services/aiService.ts` - Updated to read from `window.__ENV__`
- `cloudbuild.yaml` - Changed to set runtime env vars instead of build args
- `DEPLOYMENT.md` - Updated documentation

## Benefits of This Approach

✅ **Update keys without rebuilding** - Save time and resources  
✅ **More secure** - No keys baked into Docker image  
✅ **Same image across environments** - Dev, staging, prod use same build  
✅ **Works with Cloud Run UI** - Easy to manage via web console  
✅ **Works with Secret Manager** - Can reference secrets directly  
✅ **Faster CI/CD** - No need to pass secrets to build process  

## Next Steps

After deployment:
1. Test the app with all three AI providers
2. Set up custom domain (optional)
3. Configure CDN for better performance (optional)
4. Set up monitoring and alerts (optional)

## Support

- Cloud Run Docs: https://cloud.google.com/run/docs
- Troubleshooting: See DEPLOYMENT.md
- API Issues: Check respective provider documentation

