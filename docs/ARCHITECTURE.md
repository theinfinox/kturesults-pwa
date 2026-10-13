# 🏛️ KTU CGPA PWA — System Architecture

This document describes the high-level system architecture, client-side application design, reactive state management, data storage schemas, and operational boundaries of the KTU CGPA Standalone Progressive Web App.

---

## 1. High-Level System Topology

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT TIER                                       |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |                           Browser PWA Sandbox                               |  |
|  |                                                                             |  |
|  |  +--------------------+   +---------------------+   +--------------------+  |  |
|  |  |     app.js         |   |    constants.js     |   |   crypto-vault.js  |  |  |
|  |  | (UI Controller &   |---|  (Academic Logic,   |---| (AES-GCM-256 +     |  |  |
|  |  |  State Management) |   |   Schemes, Formulas)|   |  PBKDF2 Storage)   |  |  |
|  |  +--------------------+   +---------------------+   +--------------------+  |  |
|  |            |                         |                         |            |  |
|  |  +--------------------+   +---------------------+   +--------------------+  |  |
|  |  |   sync-engine.js   |   |    pdf_vector.js    |   |       sw.js        |  |  |
|  |  | (Headless Parser & |   |  (Vector jsPDF      |   |  (Service Worker   |  |  |
|  |  |  DOM Extraction)   |   |   Grade Reports)    |   |   Precache Engine) |  |  |
|  |  +--------------------+   +---------------------+   +--------------------+  |  |
|  |            |                                                                |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  |  |                 Browser LocalStorage & IndexedDB Sandbox              |  |  |
|  |  |      - ktu_pwa_saved_profiles (Encrypted Credential Records)          |  |  |
|  |  |      - ktu_pwa_data_<id>      (Cached Academic Semester Records)      |  |  |
|  |  |      - ktu_pwa_curriculum_<id>(Target Future Curriculum Preset)       |  |  |
|  |  |      - ktu_pwa_device_crypto_seed (Device-Bound AES Derivation Salt)  |  |  |
|  |  +-----------------------------------------------------------------------+  |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
                                        |
                            JSON HTTPS / POST Relay
                                        |
                                        v
+-----------------------------------------------------------------------------------+
|                                  RELAY TIER                                       |
|                                                                                   |
|  Option A: Local Server (Node.js)    Option B: Edge Worker (Cloudflare)           |
|  server.js (Zero-Dependency)         edge-relay/worker.js (Stateless Proxy)       |
|  - Anti-Lockout Attempt Shield       - CORS Bypassing Pass-Through                |
|  - In-Memory sessionPool             - Mobile HTTPS Gateway                       |
|  - Static Asset Delivery                                                          |
|                                                                                   |
|  Option C: Serverless Function (Netlify)                                          |
|  netlify/functions/sync.js                                                        |
+-----------------------------------------------------------------------------------+
                                        |
                          HTTPS / Scraping Requests
                                        |
                                        v
+-----------------------------------------------------------------------------------+
|                               KTU PORTAL TIER                                     |
|                               app.ktu.edu.in                                      |
|                                                                                   |
|  - /login.htm                   (Session Initiation & Form POST Auth)             |
|  - /eu/stu/studentDetailsView.htm (Curriculum & Semester Grade Accordions)        |
+-----------------------------------------------------------------------------------+
```

---

## 2. Component Decoupling & Responsibilities

The codebase follows a strictly modular, decoupled architecture without build steps or bundlers. Each module is loaded via standard script tags into the global window context:

### 2.1 `app.js` (Core Application Controller)
- **Role**: Coordinates the view layer, responsive modals, user interactions, and state mutations.
- **Key Tasks**:
  - Manages active student profile selection and multi-profile switching.
  - Controls modal states (`profileModal`, `forecastModal`, `importModal`, `disclaimerModal`, `pinUnlockModal`).
  - Orchestrates credential decryption by invoking `crypto-vault.js`.
  - Dispatches sync requests to `sync-engine.js` and updates UI with sync timers/pills.
  - Re-renders stats cards, semester accordions, and forecasting banners upon data updates.
  - Dynamically synchronizes PWA version information from `manifest.webmanifest`.

### 2.2 `constants.js` (Academic Domain & Calculation Engine)
- **Role**: Acts as the single source of truth for university academic regulations, credit tables, and mathematical formulas.
- **Key Tasks**:
  - Contains official KTU Grade Point scales (`GP`) and backlog definitions (`BACKLOG_GRADES`).
  - Implements the **3-Level Academic Architecture** (Full Degree, Hybrid Forecast, and Completed Actuals).
  - Calculates SGPA, CGPA, equivalent percentages (`CGPA * 10`), earned credits, and backlog tallies.
  - Computes all **9 Academic Comeback Projections** (`minP` through `maxS`).
  - Houses the **Multi-Signal Fuzzy Scheme & Branch Resolver** (`resolveKTUSchemeAndBranch`) which classifies student regulation schemes (2015, 2019, 2024, Lateral Entry) and branch disciplines via regex and course code signatures.
  - Generates standardized recruiter-ready filenames (`generateSmartAcademicFilename`).

### 2.3 `crypto-vault.js` (Web Cryptography Vault)
- **Role**: Secures stored student portal passwords using native browser cryptography.
- **Key Tasks**:
  - Uses the native W3C Web Cryptography API (`window.crypto.subtle`).
  - Derives 256-bit AES-GCM encryption keys using **PBKDF2-HMAC-SHA256 with 100,000 iterations**.
  - Supports two operational security modes:
    1. **Device Mode**: Uses a locally generated, device-bound cryptographically random seed stored in `localStorage`.
    2. **PIN Mode**: Uses a zero-knowledge user-provided 4-to-6 digit PIN.
  - Ensures plaintext secrets are scrubbed from memory immediately after sync requests finish.

### 2.4 `sync-engine.js` (Headless Scraping & Extraction Engine)
- **Role**: Decoupled network and DOM parser that extracts structured student data from raw KTU HTML pages.
- **Key Tasks**:
  - Dispatches network requests to either local or edge relays.
  - Enforces HTTPS on remote relay endpoints to prevent transmission of credentials over plain HTTP.
  - Parses student profile metadata (Name, Register Number, Institution, Branch, Current Semester) from HTML markup.
  - Parses semester course tables from accordion sections (`#collapseFiveS1`, `#collapseFiveS2`, etc.).
  - Extracts course codes, titles, credits, and grade assignments using multi-tier heuristic fallbacks.
  - Supports both **1-Click Fast Sync** (credential authentication) and **Zero-Login Session Refresh** (reusing cached session cookies).

### 2.5 `pdf_vector.js` (Client-Side Vector PDF Engine)
- **Role**: Generates professional, publication-quality academic transcripts and grade cards directly in the browser.
- **Key Tasks**:
  - Built on top of client-side `jsPDF` (`libs/jspdf.umd.min.js`).
  - Renders true vector typography, rules, and semantic grade badges (not raster screenshots).
  - Formats multi-column tables, SGPA progression summaries, degree forecast badges, and official disclaimers.

### 2.6 `sw.js` (Service Worker Offline Engine)
- **Role**: Provides progressive web app offline resilience.
- **Key Tasks**:
  - Precaches essential core assets on installation (`index.html`, `app.css`, `app.js`, `constants.js`, `crypto-vault.js`, `sync-engine.js`, `pdf_vector.js`, icons, and libraries).
  - Intercepts network fetch events: uses a **network-first strategy** for app updates, falling back instantly to the cache when offline.
  - Passes all `/api/` network requests straight through without caching.

---

## 3. Client-Side Data Storage Schema

All student information is stored strictly within the browser's `localStorage` sandbox under the following key hierarchy:

| Storage Key | Format | Description |
| :--- | :--- | :--- |
| `ktu_pwa_saved_profiles` | JSON Object Map | Map of saved profile objects keyed by unique ID (`prof_<timestamp>_<random>`). Stored passwords are encrypted with AES-GCM-256 (`encryptedPassword`). |
| `ktu_pwa_active_profile_id` | String | ID of the currently selected profile. |
| `ktu_pwa_primary_profile_id` | String | ID of the designated default/primary profile loaded on launch. |
| `ktu_pwa_data_<profileId>` | JSON Object | Academic payload for a specific profile: `{ semesterData: [...], studentInfo: {...}, lastScraped: "ISO String" }`. |
| `ktu_pwa_curriculum_<profileId>` | JSON Object | Custom or preset curriculum configuration selected for degree forecasting. |
| `ktu_pwa_device_crypto_seed` | Base64 String | 32-byte cryptographically secure random seed generated once per browser instance for Device Mode key derivation. |
| `ktu_custom_relay` | String | User-configured custom relay endpoint URL (e.g. `https://my-worker.workers.dev/api/sync`). |
| `ktu_disclaimer_accepted` | String ("true") | Timestamp or flag indicating acceptance of the academic disclaimer. |

### Profile Object Structure (`ktu_pwa_saved_profiles[id]`)
```json
{
  "id": "prof_1712900000000_abc123",
  "label": "Govind (CSE)",
  "username": "CEA20CS026",
  "encryptedPassword": {
    "ciphertext": "base64...",
    "iv": "base64...",
    "salt": "base64...",
    "mode": "device",
    "v": 1
  },
  "sessionCookies": "AWSALB=...; JSESSIONID=...",
  "lastGrabbed": "2026-10-13T14:00:00.000Z"
}
```

---

## 4. End-to-End Data Flow Pipelines

### 4.1 1-Click Fast Sync Pipeline
1. **Trigger**: User clicks `⚡ 1-Click Fast Sync` on dashboard.
2. **Key Decryption**: `app.js` reads `encryptedPassword` from profile.
   - If `mode: "device"`, derives key using `ktu_pwa_device_crypto_seed`.
   - If `mode: "pin"`, prompts user via `pinUnlockModal` and derives key using entered PIN.
3. **Dispatch**: `sync-engine.js` dispatches POST request with `{ username, password }` to the configured relay (`/api/sync`).
4. **Relay Negotiation**:
   - Relay fetches `https://app.ktu.edu.in/login.htm` to capture `CSRF_TOKEN` and session cookies (`AWSALB`, `JSESSIONID`).
   - Relay submits form credentials via POST to `https://app.ktu.edu.in/login.htm`.
   - Relay verifies login success (scans for `.alert-danger` errors or login form recurrence).
   - Relay navigates to `https://app.ktu.edu.in/eu/stu/studentDetailsView.htm` using authenticated cookie jar.
   - Relay returns `{ success: true, html: "...", sessionCookies: "...", elapsedMs: 450 }`.
5. **Client Parsing**: `DOMParser` in `sync-engine.js` extracts `studentInfo` and `semesterData`.
6. **Persistence & Render**: `app.js` saves parsed records to `ktu_pwa_data_<id>` and updates profile's `sessionCookies`. Plaintext password is wiped from memory. UI re-renders stats and grade tables.

### 4.2 Zero-Login Session Refresh Pipeline
1. **Trigger**: User clicks `🔄 Zero-Login Refresh`.
2. **Dispatch**: `sync-engine.js` sends `{ username, sessionOnly: true, sessionCookies }` to relay. Zero plaintext passwords or PINs are involved.
3. **Relay Probe**: Relay creates a CookieJar containing `sessionCookies` and directly issues a GET request to `https://app.ktu.edu.in/eu/stu/studentDetailsView.htm`.
4. **Verification**:
   - If response contains `#collapseFiveS` accordions, the session is valid! Fresh HTML is returned.
   - If response redirects to `login.htm`, the cached session has expired. Relay returns `{ success: false, sessionExpired: true }` **without sending any login requests to KTU**.
5. **Safety**: Guarantees **0 failed login attempts** against KTU servers, completely preventing portal account lockout.

---

## 5. Security & Isolation Model

- **No Remote Database**: There is no database on the relay server. Relays are either 100% stateless (Cloudflare Workers) or hold volatile, in-memory caches only (`server.js`).
- **Encrypted Storage at Rest**: Plaintext passwords never exist on the client disk.
- **Strict HTTPS Relay Transport**: The frontend validates relay URLs and blocks unencrypted `http://` transmission to any remote host (allowing only `http://localhost`, `http://127.0.0.1`, or `https://`).
- **Content Security Policy (CSP)**:
  ```http
  default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https: http://localhost:* http://127.0.0.1:*; img-src 'self' data: blob:;
  ```
  Blocks untrusted scripts, clickjacking (`X-Frame-Options: DENY`), and MIME confusion (`nosniff`).
