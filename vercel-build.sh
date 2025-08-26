#!/bin/bash

# Vercel Build Script for NoteX
echo "🚀 Starting Vercel build for NoteX..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building project..."
npm run build

# Verify build output
echo "✅ Build completed successfully!"
echo "📁 Build output directory: dist/"
ls -la dist/

echo "🎉 Ready for Vercel deployment!"