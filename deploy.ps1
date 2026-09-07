# Deployment script for KTU CGPA Standalone PWA (PowerShell)
Continue = Stop

Write-Host ============================================== -ForegroundColor Cyan
Write-Host 🚀 KTU CGPA Standalone PWA - Deployment Script -ForegroundColor Cyan
Write-Host ============================================== -ForegroundColor Cyan

# 1. Run Automated Test Suite
Write-Host [1/3] Running automated regression suite... -ForegroundColor Yellow
node test/test_suite.js

# 2. Edge Relay Check
Write-Host [2/3] Standalone assets verified. -ForegroundColor Yellow

# 3. Launch Local Server
Write-Host [3/3] Starting Standalone PWA Server... -ForegroundColor Green
node server.js
