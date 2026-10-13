# 📚 KTU CGPA & SGPA Standalone PWA — Knowledge Base & Documentation Index

Welcome to the comprehensive technical documentation for the **KTU CGPA & SGPA Standalone Progressive Web App (PWA)** and its **Fast Sync Relay Engine**.

This knowledge base is specifically crafted to serve as an authoritative technical reference for both human engineers and AI/LLM agents working on this codebase.

---

## 🗂️ Documentation Suite Structure

| Document | Primary Focus | Key Topics Covered |
| :--- | :--- | :--- |
| **[ARCHITECTURE.md](file:///c:/Users/1sree/Documents/standalone-pwa/docs/ARCHITECTURE.md)** | System Design & Topology | PWA client model, network boundaries, storage schemas, client-side state machine, data flows, and offline service worker lifecycle. |
| **[BACKEND.md](file:///c:/Users/1sree/Documents/standalone-pwa/docs/BACKEND.md)** | Local Server & Runtime | Native Node.js HTTP server (`server.js`), zero-dependency philosophy, static file server, HTTP security headers, CSP, and session management. |
| **[RELAY.md](file:///c:/Users/1sree/Documents/standalone-pwa/docs/RELAY.md)** | KTU Portal Relays | Why relays are necessary (CORS bypass), Node.js server relay vs Cloudflare Worker edge relay (`edge-relay/worker.js`) vs Netlify serverless functions (`netlify/functions/sync.js`), 1-Click Fast Sync vs Zero-Login Session Refresh, and Anti-Lockout Shield. |
| **[BUSINESS_LOGIC.md](file:///c:/Users/1sree/Documents/standalone-pwa/docs/BUSINESS_LOGIC.md)** | Academic Engine & Regulations | KTU grade point mappings, 2015/2019/2024 schemes, credit tables, 3-Level Academic Architecture, 9 Academic Comeback Projections, Degree Forecasting, fuzzy scheme/branch resolver, and major/minor branch auto-healing. |
| **[SYNC_ENGINE.md](file:///c:/Users/1sree/Documents/standalone-pwa/docs/SYNC_ENGINE.md)** | Portal Scraping & Parsing | Headless client parser (`sync-engine.js`), DOM traversal, regex pattern extractors for KTU accordion tables (`#collapseFiveS*`), register number decoding, and session cookie lifecycle (`AWSALB`, `JSESSIONID`). |
| **[SECURITY_AND_VAULT.md](file:///c:/Users/1sree/Documents/standalone-pwa/docs/SECURITY_AND_VAULT.md)** | Cryptography & Privacy | Web Cryptography API (`crypto-vault.js`), AES-GCM-256 + PBKDF2 (100,000 iterations), device seed vs zero-knowledge user PIN mode, memory hygiene, CSP, and strict HTTPS relay enforcement. |

---

## 🧭 System Overview at a Glance

The KTU CGPA PWA is an enterprise-grade, privacy-first progressive web application engineered for engineering students under APJ Abdul Kalam Technological University (KTU).

### Key Architectural Tenets
1. **Zero External Runtime Dependencies**:
   - The backend runs on 100% native Node.js standard libraries (`http`, `https`, `fs`, `path`, `crypto`, `url`).
   - The client runs on native ES6+ vanilla JavaScript and standard browser APIs (`window.crypto.subtle`, `DOMParser`, `localStorage`, `caches`).
2. **Privacy by Design**:
   - Student academic records are stored strictly in the user's browser sandbox (`localStorage`).
   - Plaintext passwords never touch disk.
   - Relays are stateless or store volatile sessions only in-memory without persistent databases.
3. **100% Offline Capability**:
   - Progressive Web App with Service Worker precaching (`sw.js`).
   - Full calculation engine, comeback projections, and vector PDF generators execute entirely client-side without internet connectivity once loaded.
4. **Resilient Fast Sync & Anti-Lockout**:
   - 1-Click Fast Sync authenticates with KTU in 300ms–1000ms.
   - Zero-Login Session Refresh reuses active session cookies to pull fresh grades without sending any login attempts to KTU's authentication endpoint, neutralizing the risk of account lockout.

---

## 🤖 Instructions for AI Agents & LLMs

When adding new features, troubleshooting, or proposing changes:
1. **Consult `/docs` First**: Review the corresponding document before suggesting or making changes.
2. **Preserve Zero-Dependency Principle**: Do not introduce heavy npm runtime packages into `server.js` or frontend code without explicit user permission.
3. **Preserve Security Boundaries**: Plaintext passwords must never be stored in `localStorage` or printed in application logs.
4. **Follow KTU Academic Regulations**: Check `docs/BUSINESS_LOGIC.md` before altering grade calculations, credit divisors, or scheme mappings.
