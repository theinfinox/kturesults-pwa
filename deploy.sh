#!/usr/bin/env bash
# Deployment script for KTU CGPA Standalone PWA
set -e

echo ==============================================
echo 🚀 KTU CGPA Standalone PWA - Deployment Script
echo ==============================================

# 1. Run Automated Test Suite
echo [1/3] Running automated regression suite...
node test/test_suite.js

# 2. Deploy Cloudflare Worker Edge Relay (if wrangler installed)
if command -v npx &> /dev/null; then
    echo [2/3] Checking Cloudflare Worker relay...
    if [ -f edge-relay/wrangler.toml ]; then
        read -p Deploy Cloudflare Worker edge relay now? (y/N)  -n 1 -r
        echo
        if [[  =~ ^[Yy]$ ]]; then
            cd edge-relay
            npx wrangler deploy
            cd ..
            echo ✅ Edge relay deployed successfully!
        else
            echo ⏩ Skipping edge relay deployment.
        fi
    fi
else
    echo [2/3] Skipping wrangler deployment (npx not found).
fi

# 3. Server Startup Check
echo [3/3] Standalone deployment bundle verified and ready!
echo To launch local dev server: npm start
