# 🎓 KTU CGPA & SGPA Standalone Progressive Web App (PWA)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PWA Ready](https://img.shields.io/badge/PWA-100%25%20Offline-emerald.svg)](manifest.webmanifest)
[![Web Cryptography](https://img.shields.io/badge/Security-AES--GCM--256-purple.svg)](crypto-vault.js)
[![Zero External Dependencies](https://img.shields.io/badge/Dependencies-Zero%20(Native%20Node.js)-orange.svg)](server.js)

A high-performance, offline-capable Progressive Web Application (PWA) and 1-Click Fast Sync engine for **APJ Abdul Kalam Technological University (KTU)** engineering students. Accurately calculates SGPA, CGPA, graduation requirements, academic comeback projections, and degree forecasts across both the **2019 Scheme** and the **2024 Scheme**.

---

## ⚡ Key Highlights

- **⚡ 1-Click Fast Sync (300ms - 1000ms)**: Directly connects to the KTU portal to extract academic records, bypassing portal congestion.
- **🔄 Zero-Login Session Refresh (500ms)**: Re-uses verified portal session cookies (AWSALB / JSESSIONID) to fetch fresh records without making any new login attempts.
- **🔐 Web Cryptography Vault (AES-GCM-256 + PBKDF2)**: Encrypts cached credentials using native browser cryptography (window.crypto.subtle) with 100,000 PBKDF2 iterations. Plaintext passwords never touch disk. Includes an optional zero-knowledge User PIN mode.
- **🎓 2019 & 2024 Scheme Engine**: Comprehensive support for all engineering departments (CSE, ECE, EEE, ME, CE, AI&DS, IT), automatic course credit assignment, and proper segregation of Primary Major from optional Minors/Honors.
- **🚀 9 Academic Comeback Projections**: Calculates exact minimum passing grades needed to clear backlogs, plus full target forecast projections (Min P through Max S).
- **📄 Vector PDF & CSV Grade Card Reports**: Generates professional, print-ready grade card documents directly in the browser.
- **📱 100% Offline PWA**: Installable on Android, iOS, Windows, macOS, and Linux with full Service Worker caching.

---

## 🚀 Quick Start

### 1. Local Development (Zero npm install needed)

The built-in development server and sync relay use **100% native Node.js standard libraries** (http, https, s, path, crypto). No 
pm install or third-party packages are required:

`ash
# Clone or navigate to the repository
git clone https://github.com/theinfinox/standalone-pwa.git
cd standalone-pwa

# Launch the server
npm start
# or: node server.js
`

Open your browser at **http://localhost:3000**.

### 2. Running Automated Tests

`ash
npm test
# or: node test/test_suite.js
`

---

## 🌐 Production Deployment

### Option A: Static Web + Cloudflare Worker Edge Relay (Recommended)

1. **Deploy Edge Relay**:
   `ash
   cd edge-relay
   npx wrangler deploy
   `
   Note your Cloudflare Worker URL (e.g. https://ktu-fast-sync.your-subdomain.workers.dev).

2. **Deploy Frontend**:
   Host the root files (index.html, pp.js, pp.css, constants.js, crypto-vault.js, manifest.webmanifest, sw.js, icons/, libs/) on any static host:
   - **Cloudflare Pages**
   - **Vercel**
   - **Netlify**
   - **GitHub Pages**

3. **Configure Custom Relay**:
   In the PWA, click **⚙️ Settings** &rarr; paste your Worker URL into **Custom Sync Relay URL** (must use https://).

### Option B: Self-Hosted Docker Container

`ash
# Build container image
docker build -t ktu-pwa .

# Run on port 3000
docker run -d -p 3000:3000 --name ktu-pwa ktu-pwa
`

---

## 📁 Repository Structure

`
standalone-pwa/
├── index.html            # Main responsive application interface & modals
├── app.js                # Core controller, reactive state, UI render engine
├── app.css               # Modern glassmorphic styles, responsive grid, checkerboard theme
├── constants.js          # KTU 2019 & 2024 scheme regulations, credit tables, math engines
├── crypto-vault.js       # Native Web Cryptography API AES-GCM-256 + PBKDF2 vault
├── sync-engine.js        # High-resilience KTU portal parser & register number decoder
├── pdf_vector.js         # Pure client-side vector PDF grade card generator
├── manifest.webmanifest  # PWA manifest with dynamic versioning support
├── sw.js                 # Offline service worker cache engine
├── server.js             # Native Node.js HTTP server & CORS sync relay
├── edge-relay/
│   ├── worker.js         # Cloudflare Worker serverless edge relay
│   └── wrangler.toml     # Cloudflare Worker configuration
├── test/
│   └── test_suite.js     # Consolidated automated test suite
├── icons/                # High-resolution PWA icons (48x48 to 512x512)
├── libs/                 # Offline vendor libraries (PapaParse, html2pdf)
├── package.json          # Node project metadata & scripts
├── deploy.sh             # POSIX deployment script
├── deploy.ps1            # Windows deployment script
├── Dockerfile            # Container deployment definition
└── docker-compose.yml    # Docker Compose stack
`

---

## 🔐 Security & Privacy Architecture

- **Zero-Knowledge Password Vault**: Passwords stored on the client are encrypted using 256-bit AES-GCM derived via 100,000 PBKDF2 rounds. Plaintext secrets are strictly wiped from RAM immediately after use.
- **Enforced HTTPS Relays**: Custom sync relay endpoints are validated to strictly disallow unencrypted http:// transmission (permits only https:// or localhost).
- **Strict Content Security Policy (CSP)**: Blocks unauthorized external scripts and framing attacks (X-Frame-Options: DENY, X-Content-Type-Options: nosniff).
- **Private & Local**: Student academic records are stored strictly in the student's personal browser sandbox (localStorage / IndexedDB). No analytics or student PII are collected.

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
