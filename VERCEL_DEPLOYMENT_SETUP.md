# Vercel Deployment Setup Guide

This guide explains how to fix the Vercel deployment error and set up automatic deployments.

## Error Description

The error you encountered:
```
Error: Input required and not supplied: vercel-token
```

This occurs because the GitHub Actions workflow is missing required Vercel configuration secrets.

## Required Secrets

You need to add the following secrets to your GitHub repository:

1. **VERCEL_TOKEN** - Your Vercel API token
2. **ORG_ID** - Your Vercel organization ID  
3. **PROJECT_ID** - Your Vercel project ID

## Step-by-Step Setup

### 1. Get Your Vercel API Token

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your profile picture → **Settings**
3. Go to **Tokens** tab
4. Click **Create Token**
5. Give it a name (e.g., "GitHub Actions")
6. Set expiration (recommend: 1 year)
7. Copy the token value

### 2. Get Your Organization ID

1. In Vercel Dashboard, go to **Settings** → **General**
2. Look for **Organization ID** field
3. Copy the value

### 3. Get Your Project ID

1. In Vercel Dashboard, go to your project
2. Go to **Settings** → **General**
3. Look for **Project ID** field
4. Copy the value

### 4. Add Secrets to GitHub

1. Go to your GitHub repository
2. Click **Settings** tab
3. Click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Add each secret:

   **Name:** `VERCEL_TOKEN`  
   **Value:** [Your Vercel API token]

   **Name:** `ORG_ID`  
   **Value:** [Your Vercel organization ID]

   **Name:** `PROJECT_ID`  
   **Value:** [Your Vercel project ID]

### 5. Test the Deployment

1. Push a change to your `main` branch
2. Go to **Actions** tab in GitHub
3. Check the deployment workflow
4. Verify it completes successfully

## Alternative: Manual Deployment

If you prefer not to use GitHub Actions, you can deploy manually:

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

## Troubleshooting

### Secret Not Found
- Ensure secrets are added to the correct repository
- Check that secret names match exactly (case-sensitive)
- Verify the repository has access to the secrets

### Permission Denied
- Ensure your Vercel token has the correct permissions
- Check that you're a member of the Vercel organization
- Verify the project ID belongs to your organization

### Build Failures
- Check the build logs in GitHub Actions
- Ensure all dependencies are properly installed
- Verify the build command works locally

## Updated Workflow Features

The updated workflow now includes:

- ✅ **Secret validation** - Checks if all required secrets are present
- ✅ **Graceful fallback** - Skips deployment if secrets are missing
- ✅ **Clear error messages** - Explains what's missing and how to fix it
- ✅ **Helpful guidance** - Provides setup instructions in the logs

## Security Notes

- **Never commit secrets** to your repository
- **Rotate tokens regularly** (recommended: yearly)
- **Use least privilege** - Only grant necessary permissions
- **Monitor usage** - Check Vercel dashboard for deployment activity

## Next Steps

After setting up the secrets:

1. **Test deployment** with a small change
2. **Monitor builds** in GitHub Actions
3. **Set up preview deployments** for pull requests
4. **Configure custom domains** if needed
5. **Set up environment variables** for different environments