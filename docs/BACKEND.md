# ⚙️ KTU CGPA PWA — Backend Architecture & Implementation

This document covers the backend implementation of the project, focusing on the native Node.js development server (`server.js`), the serverless Netlify function (`netlify/functions/sync.js`), request handling, security controls, and session state machines.

---

## 1. Zero-Dependency Engineering Philosophy

Both `server.js` and `netlify/functions/sync.js` strictly adhere to a **Zero External Dependencies** principle:
- **No Express, Fastify, or Axios**: Built 100% on native Node.js standard modules:
  - `http`: Local development web server and request routing.
  - `https`: Secure TLS connection to `app.ktu.edu.in`.
  - `fs`: Static file streaming (`createReadStream`).
  - `path`: Safe path normalization and extension lookup.
  - `url`: WHATWG URL and `URLSearchParams` parsing.
- **Benefits**:
  - Instant startup with zero `npm install` requirements.
  - Zero supply-chain attack vectors.
  - Minimal container footprint (`Dockerfile` uses lightweight `node:20-alpine`).
  - Extremely low memory consumption (< 35 MB RSS).

---

## 2. Local Server Implementation (`server.js`)

`server.js` combines a static file server for local PWA development and an API relay endpoint (`/api/sync`) for proxying requests to the KTU portal.

### 2.1 Static File Serving & Hardened Transport
Incoming HTTP requests not targeting `/api/sync` are routed to the file system server:
```javascript
let filePath = path.join(__dirname, reqUrl.pathname === "/" ? "index.html" : reqUrl.pathname);

// Prevent Directory Traversal Attacks
if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
}
```

#### Security Headers Applied to All Responses:
- `X-Content-Type-Options: nosniff`: Prevents MIME-type sniffing.
- `X-Frame-Options: DENY`: Blocks clickjacking and framing attacks.
- `Referrer-Policy: strict-origin-when-cross-origin`: Restricts referrer leaks.
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`: Hardens device access.
- `Content-Security-Policy`: Restricts scripts, styles, and font origins.
- `Access-Control-Allow-Origin`: Dynamically reflects requesting origin or defaults to `*` to allow CORS requests from local dev tools and mobile browsers.

---

## 3. The `CookieJar` Implementation

KTU's web application relies on session cookies (`AWSALB`, `AWSALBCORS`, and `JSESSIONID`). Because native Node.js `https.request` does not maintain cookie state automatically, `server.js` contains an in-memory `CookieJar` utility class:

```javascript
class CookieJar {
    constructor() {
        this.cookies = new Map();
    }

    // Parses raw Set-Cookie response headers from KTU
    updateFromHeaders(headers) {
        let raw = headers["set-cookie"] || headers["Set-Cookie"];
        if (!raw) return;
        if (!Array.isArray(raw)) raw = [raw];
        for (const str of raw) {
            const parts = str.split(";")[0].split("=");
            if (parts.length >= 2) {
                const name = parts[0].trim();
                const value = parts.slice(1).join("=").trim();
                if (name && value) {
                    this.cookies.set(name, value);
                }
            }
        }
    }

    // Serializes active cookies into a standard "Cookie: a=1; b=2" header
    getCookieHeader() {
        const parts = [];
        for (const [name, val] of this.cookies.entries()) {
            parts.push(`${name}=${val}`);
        }
        return parts.join("; ");
    }

    // Ingests serialized cookie headers passed from the client
    loadFromCookieHeader(cookieStr) {
        if (!cookieStr || typeof cookieStr !== "string") return;
        const IGNORED_DIRECTIVES = new Set(["path", "domain", "expires", "max-age", "samesite", "httponly", "secure"]);
        cookieStr.split(";").forEach(part => {
            const eq = part.indexOf("=");
            if (eq > 0) {
                const name = part.slice(0, eq).trim();
                const value = part.slice(eq + 1).trim();
                if (name && value && !IGNORED_DIRECTIVES.has(name.toLowerCase())) {
                    this.cookies.set(name, value);
                }
            }
        });
    }
}
```

---

## 4. State Management in `server.js`

`server.js` maintains two key in-memory state registries:

```javascript
const sessionPool = new Map(); // username -> CookieJar
const attemptShield = new Map(); // username -> { failedCount, lockedUntil, lastAttempt }
```

### 4.1 In-Memory Session Cache (`sessionPool`)
- Caches authenticated `CookieJar` instances keyed by normalized username (`normUser = username.trim().toUpperCase()`).
- Allows repeat requests within the same server lifetime to execute within **200ms–400ms** by skipping re-authentication.

### 4.2 Local Anti-Lockout Shield (`attemptShield`)
KTU has an aggressive account lockout policy: three consecutive invalid password attempts trigger an automated account lock requiring college administrator intervention.
- The `attemptShield` tracks failed logins per student username.
- If `failedCount >= 2` or if the portal returns a temporary disablement notice, the shield enforces a **3-minute local cooldown (180,000ms)**:
  ```javascript
  if (shield.lockedUntil && now < shield.lockedUntil) {
      const remainingSec = Math.ceil((shield.lockedUntil - now) / 1000);
      res.writeHead(429, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
          success: false,
          error: `Account Shield Active: Cooldown active to protect your KTU account. Please wait ${remainingSec}s before retrying.`
      }));
      return;
  }
  ```
- This prevents automated retries or user typos from tripping KTU's lockout threshold.

---

## 5. HTTP Protocol Flow: `requestWithJar`

All HTTPS requests to `app.ktu.edu.in` pass through the `requestWithJar` helper:
```javascript
function requestWithJar(urlStr, options = {}, postData = null, jar = new CookieJar(), maxRedirects = 5)
```

### Features:
1. **Automatic Cookie Ingestion**: Extracts `Set-Cookie` headers on every response and injects the updated cookie string into subsequent requests.
2. **Browser Fingerprint Emulation**: Injects realistic desktop Chrome user agent and `Sec-Ch-Ua` headers to prevent portal bot blocking.
3. **Recursive Redirect Following**: Automatically follows HTTP `301`, `302`, `303`, `307`, and `308` redirects up to a maximum depth of 5, switching to `GET` and passing the previous URL as `Referer`.
4. **Strict Timeout Guard**: Hardened with a **15-second timeout** (`req.setTimeout(15000)`). If the KTU server stalls or hangs, the socket is destroyed and a clean reject is returned.

---

## 6. API Endpoint: `POST /api/sync`

The sync endpoint handles two operational modes:

### Mode 1: Zero-Login Session Refresh (`sessionOnly: true`)
1. Looks up the student's `CookieJar` from `sessionPool` or loads `sessionCookies` passed in the request body.
2. If no cookies are found, returns HTTP 200 with `{ success: false, sessionExpired: true }` **without sending any request to KTU**.
3. Issues a `GET` request directly to `https://app.ktu.edu.in/eu/stu/studentDetailsView.htm`.
4. Tests if the response body contains `"collapseFiveS"`.
   - **Success**: Returns `{ success: true, html, sessionCookies, elapsedMs, refreshedViaSession: true }`.
   - **Expired**: Purges `sessionPool` entry and returns `{ success: false, sessionExpired: true }` without making any login attempt.

### Mode 2: Full Fast Sync (`sessionOnly: false`)
1. Checks the `attemptShield` for active cooldowns. If locked, immediately returns `429 Too Many Requests`.
2. Probes any existing session in `sessionPool` first. If valid, immediately returns cached curriculum HTML (Zero-Login Fast Path).
3. If no session is active or if the cached session has expired:
   - **Step 3a**: `GET https://app.ktu.edu.in/login.htm`
     - Obtains fresh `JSESSIONID` and `AWSALB` cookies.
     - Parses CSRF token regex: `name="CSRF_TOKEN"[^>]*value="([^"]+)"`.
   - **Step 3b**: `POST https://app.ktu.edu.in/login.htm`
     - Submits `username`, `password`, and `CSRF_TOKEN` as `application/x-www-form-urlencoded`.
     - Scans response body for `.alert-danger` error messages or re-rendered login form inputs.
     - If authentication fails, increments `attemptShield.failedCount`, sets 180s cooldown if threshold reached, and returns `HTTP 401`.
   - **Step 3c**: `GET https://app.ktu.edu.in/eu/stu/studentDetailsView.htm`
     - Uses authenticated session cookies.
     - Verifies curriculum table presence (`collapseFiveS`).
     - On success: resets `attemptShield`, saves session to `sessionPool`, and returns full HTML payload and session cookies.

---

## 7. Netlify Serverless Function (`netlify/functions/sync.js`)

For deployments hosted on Netlify, the serverless function mirrors the logic of `server.js` with adaptations for stateless execution:
- **Redirection**: `netlify.toml` maps `/api/sync` &rarr; `/.netlify/functions/sync`.
- **Stateless Lifecycle**: Netlify functions spin down when idle. Session cookies are preserved by returning them in the response JSON to the client, which sends them back in `sessionCookies` on subsequent requests.
- **Native Implementation**: Uses native Node.js `https` without AWS Lambda or Netlify third-party wrapper dependencies.
