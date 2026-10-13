---
description: Mandatory rule to ingest /docs as the authoritative knowledge base for the repository
globs: **/*
---

# 📖 Repository Knowledge Base Directive: Consult `/docs`

Before formulating solutions, writing code, or answering architecture questions in this repository, you **MUST** consult the comprehensive documentation in the `/docs` directory.

The repository documentation is organized as follows:

- **[`docs/INDEX.md`](file:///c:/Users/1sree/Documents/standalone-pwa/docs/INDEX.md)**: Master documentation index.
- **[`docs/ARCHITECTURE.md`](file:///c:/Users/1sree/Documents/standalone-pwa/docs/ARCHITECTURE.md)**: Overall system topology, component interactions, storage schemas, and data flow.
- **[`docs/BACKEND.md`](file:///c:/Users/1sree/Documents/standalone-pwa/docs/BACKEND.md)**: Native Node.js `server.js` architecture, zero-dependency policy, cookie jars, and Netlify functions.
- **[`docs/RELAY.md`](file:///c:/Users/1sree/Documents/standalone-pwa/docs/RELAY.md)**: KTU sync relays (Node.js vs Cloudflare Worker edge relay vs Netlify functions), CORS bypass, Fast Sync vs Zero-Login Refresh, and Anti-Lockout shields.
- **[`docs/BUSINESS_LOGIC.md`](file:///c:/Users/1sree/Documents/standalone-pwa/docs/BUSINESS_LOGIC.md)**: KTU grade point mappings, 3-Level Metric Architecture, 9 Academic Comeback Projections, Degree Forecasting, and fuzzy branch/scheme resolution.
- **[`docs/SYNC_ENGINE.md`](file:///c:/Users/1sree/Documents/standalone-pwa/docs/SYNC_ENGINE.md)**: Headless portal parser (`sync-engine.js`), DOM traversal, regex pattern extractors, and cookie handling.
- **[`docs/SECURITY_AND_VAULT.md`](file:///c:/Users/1sree/Documents/standalone-pwa/docs/SECURITY_AND_VAULT.md)**: Web Cryptography API (`crypto-vault.js`), AES-GCM-256 + PBKDF2 (100,000 iterations), device seed vs PIN modes, memory hygiene, and HTTPS enforcement.

## Invariants to Preserve:
1. Zero runtime npm dependencies in backend and frontend.
2. Stored passwords encrypted via AES-GCM-256 + PBKDF2 at all times.
3. Plaintext credentials wiped from memory immediately after sync.
4. Protect against KTU account lockout using the Anti-Lockout Shield and Zero-Login Session Refresh.
5. Offline-first PWA operation with updated Service Worker caching.
