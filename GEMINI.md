# 🤖 Gemini & LLM Knowledge Base Rules

> **MANDATORY DIRECTIVE FOR GEMINI AND OTHER LLMS**:
> Before formulating plans, answering questions, or modifying code in this repository, you **MUST** read and understand the documentation files located in the `/docs` directory.
>
> The `/docs` folder serves as the single source of truth for repository architecture, business logic, backend server mechanics, relay flows, sync engines, and security invariants.

---

## 📚 Mandatory Context Ingestion Protocol

When initializing a new session or addressing user requests without context:

1. **Start with the Master Index**:
   Read **[`docs/INDEX.md`](file:///c:/Users/1sree/Documents/standalone-pwa/docs/INDEX.md)** to orient yourself on the system modules.

2. **Route by Task Domain**:
   - **System Design & Overall Topology**: Consult **[`docs/ARCHITECTURE.md`](file:///c:/Users/1sree/Documents/standalone-pwa/docs/ARCHITECTURE.md)**.
   - **Backend Server (`server.js`, Netlify)**: Consult **[`docs/BACKEND.md`](file:///c:/Users/1sree/Documents/standalone-pwa/docs/BACKEND.md)**.
   - **Relays & KTU Portal Proxying (`edge-relay/worker.js`, CORS)**: Consult **[`docs/RELAY.md`](file:///c:/Users/1sree/Documents/standalone-pwa/docs/RELAY.md)**.
   - **Academic Calculations, KTU Schemes, Formulas, Projections**: Consult **[`docs/BUSINESS_LOGIC.md`](file:///c:/Users/1sree/Documents/standalone-pwa/docs/BUSINESS_LOGIC.md)**.
   - **Portal Scraping, Heuristics, & DOM Parsing (`sync-engine.js`)**: Consult **[`docs/SYNC_ENGINE.md`](file:///c:/Users/1sree/Documents/standalone-pwa/docs/SYNC_ENGINE.md)**.
   - **Security, Encryption, PBKDF2, AES-GCM (`crypto-vault.js`)**: Consult **[`docs/SECURITY_AND_VAULT.md`](file:///c:/Users/1sree/Documents/standalone-pwa/docs/SECURITY_AND_VAULT.md)**.

---

## ⚠️ Core Non-Negotiable Rules & Invariants

All future contributions and code modifications MUST preserve the following invariants:

1. **Zero External Runtime Dependencies**:
   - The backend (`server.js`) strictly uses **native Node.js modules** (`http`, `https`, `fs`, `path`, `url`, `crypto`).
   - Do **NOT** install or introduce Express, Fastify, Axios, or heavy npm libraries without explicit user consent.
2. **Strict Privacy & Zero Plaintext Disk Storage**:
   - Stored credentials in `localStorage` must always remain encrypted via AES-GCM-256 derived using PBKDF2 (100,000 rounds).
   - Plaintext passwords must be wiped from RAM immediately after network requests finish.
   - Never log passwords or student PII to console or server logs.
3. **Anti-Lockout Protection**:
   - KTU portal locks accounts after 3 consecutive failed attempts.
   - Never bypass the `attemptShield` or remove the client-side cooldown timers.
   - Preserve the **Zero-Login Session Refresh** mechanism (`sessionOnly: true`), which probes with cookies and sends 0 login attempts to KTU.
4. **KTU Academic Calculation Accuracy**:
   - Audit courses (e.g., `PASS`, `COMPLETED`, `AUDIT`) contribute to `earnedCredits` but **MUST NEVER** contribute to graded credit divisors in SGPA or CGPA.
   - Preserves all 9 Academic Comeback Projections (`minP` through `maxS`).
   - Backlog grades (`F`, `FE`, `AB`, `ABSENT`, `I`) contribute credits to the denominator with 0 points until cleared.
5. **100% Offline PWA Ready**:
   - When modifying web assets, ensure the Service Worker precache list in `sw.js` remains up-to-date.
   - All academic calculation, forecasting, and vector PDF generation must function offline without an active internet connection.
