# 🛰️ KTU CGPA PWA — Relay Architecture & Fast Sync Engine

This document explains the technical necessity, implementation details, protocol flows, and operational security of the **KTU Portal Sync Relays**.

---

## 1. Why is a Relay Necessary?

Modern web browsers enforce strict security boundaries that prevent client-side JavaScript applications from connecting directly to the KTU student portal (`app.ktu.edu.in`):

1. **CORS (Cross-Origin Resource Sharing) Restriction**:
   - The KTU web portal does not emit `Access-Control-Allow-Origin` headers.
   - Any direct `fetch()` or `XMLHttpRequest` from `http://localhost:3000` or a deployed PWA domain (e.g. `https://my-app.netlify.app`) will be blocked by the browser engine before data can be read.
2. **Cookie Sandbox & Header Restrictions**:
   - Direct cross-origin browser requests cannot manipulate or read HTTP-only session cookies (`JSESSIONID`, `AWSALB`) belonging to `app.ktu.edu.in`.
   - The browser blocks client JavaScript from setting the required `Referer`, `Origin`, and `Sec-Fetch-*` headers that KTU's firewall inspects.
3. **Mobile PWA Independence**:
   - On iOS (WebKit) and Android (Chromium), PWA standalone windows operate under strict sandbox constraints. A high-performance edge relay allows the mobile PWA to communicate with the portal in **300ms–1000ms** without requiring a native app wrapper or browser extension.

---

## 2. Comparison of the Three Relay Implementations

The repository provides three separate relay implementations suited for different deployment environments:

| Feature | Node.js Server (`server.js`) | Cloudflare Worker (`edge-relay/worker.js`) | Netlify Function (`netlify/functions/sync.js`) |
| :--- | :--- | :--- | :--- |
| **Runtime Environment** | Node.js (Local / Docker / VPS) | Cloudflare V8 Edge Worker | AWS Lambda / Netlify Serverless |
| **Dependencies** | Zero (Native `http`/`https`) | Zero (Native Web `fetch`) | Zero (Native Node `https`) |
| **State Storage** | In-Memory (`Map`) | 100% Stateless | 100% Stateless |
| **Session Cache** | Yes (`sessionPool` in RAM) | Client-side cookie return | Client-side cookie return |
| **Anti-Lockout Shield** | Server-side + Client-side | Client-side handled | Client-side handled |
| **Latency (India)** | Local: < 5ms (Relay to PC) | Edge: 15ms–80ms to KTU | Serverless Cold: 600ms–1200ms |
| **Best Used For** | Local dev, Self-hosted Docker | Production mobile PWA users | Static site deployments on Netlify |

---

## 3. Cloudflare Worker Edge Relay Deep Dive (`edge-relay/worker.js`)

The edge relay is designed to be **completely stateless, log-free, and database-free**:

### 3.1 CORS Preflight & Origin Reflection
```javascript
function getResponseHeaders(request, env) {
    const origin = request.headers.get("Origin") || "";
    let allowOrigin = "*";

    if (origin) {
        // Enforce HTTPS or localhost origin safety
        if (origin.startsWith("https://") || origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1")) {
            allowOrigin = origin;
        }
    }

    return {
        "Access-Control-Allow-Origin": allowOrigin,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
        "Access-Control-Max-Age": "86400",
        "Vary": "Origin",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "strict-origin-when-cross-origin"
    };
}
```

### 3.2 Stateless Cookie Preservation
Because Cloudflare Workers run across hundreds of global edge locations, worker instances do not share persistent RAM state. Cookie persistence is achieved via a **round-trip token handshake**:
1. When KTU returns `Set-Cookie` headers during authentication, the worker parses the cookie key-value pairs into a single string (`AWSALB=...; JSESSIONID=...`).
2. The worker returns this string to the client in the response JSON: `{ sessionCookies: "..." }`.
3. The PWA client stores `sessionCookies` in `localStorage` under the active profile.
4. On future requests, the client passes `sessionCookies` in the POST body, allowing the worker to immediately resume the session without re-authenticating.

---

## 4. End-to-End Relay Protocol Flows

### 4.1 Flow 1: 1-Click Fast Sync (Full Portal Authentication)

```
[PWA Client]                  [Relay Gateway]                  [KTU Portal]
     |                               |                              |
     | 1. POST /api/sync             |                              |
     |    { username, password }     |                              |
     | ----------------------------> |                              |
     |                               | 2. GET /login.htm            |
     |                               | ---------------------------> |
     |                               |                              |
     |                               | 3. Set-Cookie: AWSALB, JSESS |
     |                               |    HTML with CSRF_TOKEN      |
     |                               | <--------------------------- |
     |                               |                              |
     |                               | 4. POST /login.htm           |
     |                               |    username, password, CSRF  |
     |                               |    Cookie: AWSALB, JSESS     |
     |                               | ---------------------------> |
     |                               |                              |
     |                               | 5. 302 Redirect / Landing    |
     |                               |    (Checks for errors)       |
     |                               | <--------------------------- |
     |                               |                              |
     |                               | 6. GET /studentDetailsView   |
     |                               |    Cookie: AWSALB, JSESS     |
     |                               | ---------------------------> |
     |                               |                              |
     |                               | 7. 200 OK HTML               |
     |                               |    (contains #collapseFiveS) |
     |                               | <--------------------------- |
     |                               |                              |
     | 8. 200 OK JSON                |                              |
     |    { success: true,           |                              |
     |      html: "...",             |                              |
     |      sessionCookies: "...",   |                              |
     |      elapsedMs: 420 }         |                              |
     | <---------------------------- |                              |
```

### 4.2 Flow 2: Zero-Login Session Refresh (0 Lockout Risk)

```
[PWA Client]                  [Relay Gateway]                  [KTU Portal]
     |                               |                              |
     | 1. POST /api/sync             |                              |
     |    { username,                |                              |
     |      sessionOnly: true,       |                              |
     |      sessionCookies: "..." }  |                              |
     | ----------------------------> |                              |
     |                               | 2. Direct Probe:             |
     |                               |    GET /studentDetailsView   |
     |                               |    Cookie: sessionCookies    |
     |                               | ---------------------------> |
     |                               |                              |
     |                               | Case A: Valid Session        |
     |                               | 3a. 200 OK (#collapseFiveS)  |
     |                               | <--------------------------- |
     |                               |                              |
     | 4a. 200 OK JSON               |                              |
     |     { success: true,          |                              |
     |       html: "...",            |                              |
     |       refreshedViaSession: t }|                              |
     | <---------------------------- |                              |
     |                               |                              |
     |                               | Case B: Expired Session      |
     |                               | 3b. 302 Redirect /login.htm  |
     |                               | <--------------------------- |
     |                               |                              |
     | 4b. 200 OK JSON (No Logins!)  |                              |
     |     { success: false,         |                              |
     |       sessionExpired: true,   |                              |
     |       error: "Expired..." }   |                              |
     | <---------------------------- |                              |
```

---

## 5. Anti-Lockout Shield Architecture

KTU accounts are locked after three consecutive failed password attempts. The sync relay infrastructure implements a multi-layer **Anti-Lockout Shield** to protect users:

### Layer 1: Error Response Inspection
During `POST /login.htm`, the relay inspects the HTML for portal danger alerts:
```javascript
const dangerAlerts = [...authRes.body.matchAll(/<div[^>]*class="[^"]*alert-danger[^"]*"[^>]*>([\s\S]*?)<\/div>/gi)];
```
If KTU reports invalid credentials or an account disabled warning, the relay immediately halts and returns a structured error to prevent further automatic retries.

### Layer 2: Server-Side Cooldown (`server.js`)
- Tracks consecutive failed attempts in `attemptShield`.
- If `failedCount >= 2`, blocks all incoming requests for that user for **180 seconds (3 minutes)** with an HTTP 429 response.

### Layer 3: Client-Side UI Cooldown Lock (`app.js`)
If an authentication failure occurs:
- The UI disables both `⚡ 1-Click Fast Sync` and `🔄 Zero-Login Refresh` buttons.
- A visual countdown timer is displayed: `⏳ Shield Active (180s)`.
- Users cannot spam sync attempts while locked.

---

## 6. Client Relay Configuration & Transport Enforcement

Users can configure a custom relay URL in the application settings modal:
- Default endpoint: `https://kturesults.govindsr.me/api/sync` (or relative `/api/sync` on Netlify)
- Stored in `localStorage` under `ktu_custom_relay`.

### Enforced HTTPS Transport
To protect student passwords against unencrypted network sniffing:
```javascript
const isLocal = relayUrl.startsWith("http://localhost") || relayUrl.startsWith("http://127.0.0.1") || relayUrl.startsWith("/api/sync");
const isHttps = relayUrl.startsWith("https://");

if (!isLocal && !isHttps) {
    throw new Error("Security Error: Relay endpoint must use encrypted HTTPS to protect credentials.");
}
```
Any attempt to point the PWA to an unencrypted `http://remote-server.com` endpoint will immediately throw an error before any network request is created.
