# Migration to Runtime Environment Variable Injection

## What Changed?

Your app has been updated from **build-time** to **runtime** environment variable injection for Cloud Run deployments.

## The Problem

**Before:**
- Environment variables had to be provided during Docker build
- Setting env vars in Cloud Run UI didn't work because the app was already built
- `window.__ENV__` was always `undefined` in production
- Updating API keys required rebuilding the entire Docker image

**After:**
- Environment variables are injected when the container starts
- Cloud Run UI environment variables work perfectly
- `window.__ENV__` contains your API keys
- Update API keys instantly without rebuilding

## Files Changed

### 1. `inject-env.sh` (NEW)
**Purpose:** Injects Cloud Run environment variables at container startup

**What it does:**
- Runs automatically when nginx container starts
- Reads `GOOGLE_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` from Cloud Run env vars
- Creates `/usr/share/nginx/html/env-config.js` with `window.__ENV__` object
- Injects script tag into `index.html`
- Logs status of API keys for debugging

### 2. `Dockerfile`
**Changes:**
- ❌ Removed: `ARG` and `ENV` directives for API keys (lines 16-23)
- ❌ Removed: Build-time environment variable injection
- ✅ Added: Copy and chmod `inject-env.sh` to `/docker-entrypoint.d/`
- ✅ Added: Comment explaining nginx auto-runs scripts in that directory

**Why:** Nginx official image automatically runs all scripts in `/docker-entrypoint.d/` before starting nginx.

### 3. `services/aiService.ts`
**Changes:**
- ✅ Added: `getApiKey()` helper function
- ✅ Updated: `initializeClients()` to check `window.__ENV__` first, then fall back to `process.env`
- ✅ Added: Debug logging showing where keys are loaded from

**Why:** Support both local dev (process.env from Vite) and production (window.__ENV__ from Cloud Run).

### 4. `vite.config.ts`
**Changes:**
- ✅ Updated: Comments to clarify build-time vs runtime injection
- No functional changes (still supports local .env files)

**Why:** Make it clear that build-time env vars are for local dev only.

### 5. `cloudbuild.yaml`
**Changes:**
- ❌ Removed: `--build-arg` flags from docker build step
- ✅ Added: `--set-env-vars` flag to gcloud run deploy step
- ✅ Updated: Comments explaining runtime injection

**Why:** Pass API keys to Cloud Run service, not to Docker build.

### 6. `deploy-cloudrun.sh`
**Changes:**
- ✅ Updated: Comments to clarify runtime injection
- No functional changes (still passes keys as substitutions)

**Why:** The script still works, but now keys go to Cloud Run service config.

### 7. `DEPLOYMENT.md`
**Changes:**
- ✅ Updated: All sections to reflect runtime injection
- ✅ Added: "How It Works" section
- ✅ Updated: Troubleshooting section with `window.__ENV__` checks
- ✅ Updated: "Update API Keys" section (no rebuild needed!)

### 8. `README.md`
**Changes:**
- ✅ Updated: Deploy to Cloud Run section
- ✅ Added: Link to CLOUD_RUN_SETUP.md
- ✅ Added: Benefits of runtime injection

### 9. `CLOUD_RUN_SETUP.md` (NEW)
**Purpose:** Quick reference guide for Cloud Run setup and troubleshooting

## How to Deploy Your Updated App

### Option 1: GitHub Integration (Recommended)

1. **Commit and push your changes:**
   ```bash
   git add .
   git commit -m "Add runtime environment variable injection"
   git push origin main
   ```

2. **Cloud Run will automatically rebuild** (if you have auto-deploy enabled)

3. **Verify environment variables are set** in Cloud Run UI:
   - Go to your service
   - Click "Edit & Deploy New Revision"
   - Check "Variables & Secrets" tab
   - Ensure `GOOGLE_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` are set

4. **Wait for deployment** and test your app!

### Option 2: Command Line

```bash
# Commit your changes
git add .
git commit -m "Add runtime environment variable injection"
git push origin main

# Deploy via gcloud
gcloud run deploy ace-the-interview \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_API_KEY="your_key",OPENAI_API_KEY="your_key",ANTHROPIC_API_KEY="your_key"
```

### Option 3: Cloud Build

```bash
# If you already have Cloud Build trigger set up
gcloud builds submit --config cloudbuild.yaml \
  --substitutions _GOOGLE_API_KEY="your_key",_OPENAI_API_KEY="your_key",_ANTHROPIC_API_KEY="your_key"
```

## Verify It's Working

After deployment, open your app and check the browser console:

```javascript
// In browser DevTools Console:
console.log(window.__ENV__);

// Expected output:
// {
//   GOOGLE_API_KEY: "AIzaSy...",
//   OPENAI_API_KEY: "sk-proj-...",
//   ANTHROPIC_API_KEY: "sk-ant-..."
// }
```

## Troubleshooting

### Still seeing `undefined`?

1. **Check Cloud Run environment variables:**
   ```bash
   gcloud run services describe ace-the-interview --region us-central1 \
     --format="yaml(spec.template.spec.containers[0].env)"
   ```

2. **Check container logs:**
   ```bash
   gcloud run services logs read ace-the-interview --region us-central1 --limit 50
   ```
   
   Look for: "🔧 Injecting runtime environment variables..."

3. **Hard refresh browser:** `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows/Linux)

4. **Redeploy with env vars explicitly set:**
   ```bash
   gcloud run services update ace-the-interview \
     --region us-central1 \
     --set-env-vars GOOGLE_API_KEY="your_key",OPENAI_API_KEY="your_key"
   ```

## Benefits

✅ **Update keys without rebuilding** - Change API keys in Cloud Run UI instantly  
✅ **More secure** - API keys never embedded in Docker image  
✅ **Better for CI/CD** - Same image works across environments  
✅ **Easier debugging** - Check `window.__ENV__` in console  
✅ **Works with Secret Manager** - Reference secrets directly in Cloud Run  

## Backward Compatibility

This change is **backward compatible** for local development:

- Local dev still uses `.env.local` file
- Vite still injects env vars at build time for local dev
- `process.env` still works in local dev
- No changes needed to your local development workflow

## Need Help?

See:
- [CLOUD_RUN_SETUP.md](./CLOUD_RUN_SETUP.md) - Quick setup guide
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Full deployment documentation
- Cloud Run logs: `gcloud run services logs read ace-the-interview --region us-central1`

