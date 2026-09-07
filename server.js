/**
 * KTU CGPA Standalone PWA - Local Development & Relay Server
 * Zero External Dependencies (Native Node.js http/https/fs)
 * 
 * Usage:
 *   node server.js
 * Open in browser:
 *   http://localhost:3000
 */

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { URL, URLSearchParams } = require("url");

const PORT = process.env.PORT || 3000;
const KTU_HOST = "app.ktu.edu.in";

const MIME_TYPES = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".json": "application/json",
    ".webmanifest": "application/manifest+json",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon"
};

class CookieJar {
    constructor() {
        this.cookies = new Map();
    }
    updateFromHeaders(headers) {
        if (!headers) return;
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
    getCookieHeader() {
        const parts = [];
        for (const [name, val] of this.cookies.entries()) {
            parts.push(`${name}=${val}`);
        }
        return parts.join("; ");
    }
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

const BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1"
};

// In-Memory Session Cache (Zero-Login Fast Sync) & Anti-Lockout Shield
const sessionPool = new Map(); // username -> CookieJar
const attemptShield = new Map(); // username -> { failedCount, lockedUntil, lastAttempt }

function requestWithJar(urlStr, options = {}, postData = null, jar = new CookieJar(), maxRedirects = 5) {
    return new Promise((resolve, reject) => {
        const targetUrl = new URL(urlStr);
        const headers = Object.assign({}, BROWSER_HEADERS, options.headers || {});

        const cookieHdr = jar.getCookieHeader();
        if (cookieHdr) {
            headers["Cookie"] = cookieHdr;
        }

        const reqOpts = {
            hostname: targetUrl.hostname,
            port: targetUrl.port || (targetUrl.protocol === "https:" ? 443 : 80),
            path: targetUrl.pathname + targetUrl.search,
            method: options.method || "GET",
            headers: headers
        };

        const req = https.request(reqOpts, async (res) => {
            jar.updateFromHeaders(res.headers);
            let body = "";
            res.on("data", (chunk) => (body += chunk));
            res.on("end", async () => {
                // Follow 301, 302, 303, 307, 308 redirects automatically
                if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && maxRedirects > 0) {
                    const nextUrl = new URL(res.headers.location, urlStr).toString();
                    try {
                        const redirectRes = await requestWithJar(nextUrl, {
                            method: "GET",
                            headers: { "Referer": urlStr }
                        }, null, jar, maxRedirects - 1);
                        resolve(redirectRes);
                    } catch (e) {
                        reject(e);
                    }
                    return;
                }
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body,
                    url: urlStr
                });
            });
        });

        req.on("error", reject);
        req.setTimeout(15000, () => {
            req.destroy();
            reject(new Error("KTU connection timed out after 15s"));
        });

        if (postData) req.write(postData);
        req.end();
    });
}

const server = http.createServer(async (req, res) => {
    // Security & Transport Hardening Headers
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https: http://localhost:* http://127.0.0.1:*; img-src 'self' data: blob:;");

    // CORS headers
    const origin = req.headers.origin;
    if (origin) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Vary", "Origin");
    } else {
        res.setHeader("Access-Control-Allow-Origin", "*");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }

    const reqUrl = new URL(req.url, `http://${req.headers.host}`);

    // --- API Endpoint: POST /api/sync ---
    if (reqUrl.pathname === "/api/sync" && req.method === "POST") {
        let rawBody = "";
        req.on("data", (chunk) => (rawBody += chunk));
        req.on("end", async () => {
            const startTime = Date.now();
            try {
                const { username, password, sessionOnly, sessionCookies } = JSON.parse(rawBody);
                if (!username || (!password && !sessionOnly)) {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ success: false, error: sessionOnly ? "Username required" : "Username and password required" }));
                    return;
                }

                const normUser = username.trim().toUpperCase();

                // --- ZERO-LOGIN CACHED SESSION REFRESH MODE ---
                // Guarantees ZERO login requests to KTU login.htm, completely eliminating lockout risk
                if (sessionOnly) {
                    console.log(`\n[KTU Relay] 🔄 Zero-Login Session Refresh requested for: ${normUser}`);
                    let jar = sessionPool.get(normUser);
                    if (!jar && sessionCookies) {
                        jar = new CookieJar();
                        jar.loadFromCookieHeader(sessionCookies);
                    } else if (jar && sessionCookies) {
                        jar.loadFromCookieHeader(sessionCookies);
                    }

                    if (!jar || jar.cookies.size === 0) {
                        console.log(`[KTU Relay] ⚠️ No active session cookies available for ${normUser}. 0 logins attempted.`);
                        res.writeHead(200, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({
                            success: false,
                            sessionExpired: true,
                            error: "No cached session found for this student. Please perform a Fast Sync once to establish a session."
                        }));
                        return;
                    }

                    console.log(`[KTU Relay] 📡 Probing KTU curriculum page with cached session (${jar.cookies.size} cookies)...`);
                    const probeRes = await requestWithJar(`https://${KTU_HOST}/eu/stu/studentDetailsView.htm`, {
                        method: "GET",
                        headers: { "Referer": `https://${KTU_HOST}/eu/pub/dashboard.htm` }
                    }, null, jar);

                    if (probeRes.body.includes("collapseFiveS")) {
                        const elapsedMs = Date.now() - startTime;
                        sessionPool.set(normUser, jar);
                        console.log(`[KTU Relay] ⚡ Zero-Login Refresh succeeded in ${elapsedMs}ms! (0 logins sent to KTU)`);
                        res.writeHead(200, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({
                            success: true,
                            html: probeRes.body,
                            elapsedMs,
                            sessionCookies: jar.getCookieHeader(),
                            refreshedViaSession: true
                        }));
                        return;
                    } else {
                        console.log(`[KTU Relay] ⚠️ Cached session expired on KTU. Zero login attempts made.`);
                        sessionPool.delete(normUser);
                        res.writeHead(200, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({
                            success: false,
                            sessionExpired: true,
                            error: "Cached KTU session has expired. Zero login attempts were made to protect your account. Please use Fast Sync to re-authenticate."
                        }));
                        return;
                    }
                }

                console.log(`\n[KTU Relay] ⚡ Fast Sync requested for user: ${normUser}`);

                // --- 1. LOCAL ANTI-LOCKOUT SHIELD ---
                // Prevents hitting KTU's 3-attempt lockout threshold
                const shield = attemptShield.get(normUser) || { failedCount: 0, lockedUntil: 0, lastAttempt: 0 };
                const now = Date.now();

                if (shield.lockedUntil && now < shield.lockedUntil) {
                    const remainingSec = Math.ceil((shield.lockedUntil - now) / 1000);
                    console.log(`[KTU Relay] 🛡️ Shield Blocked Request: ${normUser} is cooling down (${remainingSec}s remaining).`);
                    res.writeHead(429, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({
                        success: false,
                        error: `Account Shield Active: Cooldown active to protect your KTU account. Please wait ${remainingSec}s before retrying.`
                    }));
                    return;
                }

                // --- 2. ZERO-LOGIN SESSION PROBE ---
                // If we already hold an active authenticated session for this student, reuse it!
                let jar = sessionPool.get(normUser);
                if (!jar && sessionCookies) {
                    jar = new CookieJar();
                    jar.loadFromCookieHeader(sessionCookies);
                }
                if (jar) {
                    console.log(`[KTU Relay] 🔄 Reusing cached session cookie (Zero-Login Fast Path)...`);
                    const probeRes = await requestWithJar(`https://${KTU_HOST}/eu/stu/studentDetailsView.htm`, {
                        method: "GET",
                        headers: { "Referer": `https://${KTU_HOST}/eu/pub/dashboard.htm` }
                    }, null, jar);

                    if (probeRes.body.includes("collapseFiveS")) {
                        const elapsedMs = Date.now() - startTime;
                        console.log(`[KTU Relay] ⚡ Instant Sync via cached session in ${elapsedMs}ms! (0 logins sent to KTU)`);
                        res.writeHead(200, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({
                            success: true,
                            html: probeRes.body,
                            elapsedMs,
                            sessionCookies: jar.getCookieHeader(),
                            refreshedViaSession: true
                        }));
                        return;
                    } else {
                        console.log(`[KTU Relay] Cached session expired. Initiating fresh portal authentication...`);
                        sessionPool.delete(normUser);
                    }
                }

                // --- 3. FRESH AUTHENTICATION FLOW ---
                jar = new CookieJar();

                // 3a. GET Login Page to collect session cookies (AWSALB, JSESSIONID) & CSRF_TOKEN
                const loginPage = await requestWithJar(`https://${KTU_HOST}/login.htm`, {
                    method: "GET"
                }, null, jar);

                const csrfMatch = loginPage.body.match(/name="CSRF_TOKEN"[^>]*value="([^"]+)"/i) 
                    || loginPage.body.match(/value="([^"]+)"[^>]*name="CSRF_TOKEN"/i);
                const csrfToken = csrfMatch ? csrfMatch[1] : "";
                console.log(`[KTU Relay] 1. Session initiated (Status ${loginPage.statusCode}, CSRF: ${csrfToken ? "Present" : "None"})`);

                // 3b. POST Login Credentials with full browser headers & session jar
                const postParams = new URLSearchParams();
                postParams.append("username", normUser);
                postParams.append("password", password);
                if (csrfToken) postParams.append("CSRF_TOKEN", csrfToken);
                const postData = postParams.toString();

                const authRes = await requestWithJar(`https://${KTU_HOST}/login.htm`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        "Content-Length": Buffer.byteLength(postData),
                        "Origin": `https://${KTU_HOST}`,
                        "Referer": `https://${KTU_HOST}/login.htm`
                    }
                }, postData, jar);

                console.log(`[KTU Relay] 2. Login response received (Status ${authRes.statusCode}, Landing URL: ${authRes.url})`);

                // Check for portal alert or failed login re-rendering
                const dangerAlerts = [...authRes.body.matchAll(/<div[^>]*class="[^"]*alert-danger[^"]*"[^>]*>([\s\S]*?)<\/div>/gi)];
                let portalError = "";
                for (const m of dangerAlerts) {
                    const txt = m[1].replace(/<[^>]+>/g, "").trim();
                    if (txt) {
                        portalError = txt;
                        break;
                    }
                }

                const isLoginForm = authRes.body.includes("name=\"loginform\"") || authRes.body.includes("id=\"login-username\"");
                if (portalError || (authRes.statusCode === 200 && isLoginForm)) {
                    const errorMsg = portalError || "Invalid KTU username or password";
                    console.log(`[KTU Relay] ❌ Authentication rejected by KTU: "${errorMsg}"`);

                    // Shield record failed attempt
                    shield.failedCount = (shield.failedCount || 0) + 1;
                    shield.lastAttempt = Date.now();
                    if (shield.failedCount >= 2 || errorMsg.includes("temporarily disabled")) {
                        // Enforce a 3-minute local cooldown to protect the student account
                        shield.lockedUntil = Date.now() + 180000;
                        console.log(`[KTU Relay] 🛡️ Shield Triggered: Enforcing 3-minute cooldown on ${normUser} to prevent portal lock.`);
                    }
                    attemptShield.set(normUser, shield);

                    res.writeHead(401, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ success: false, error: errorMsg }));
                    return;
                }

                // 3c. GET Student Curriculum using full authenticated session
                console.log(`[KTU Relay] 3. Fetching student curriculum page...`);
                const currRes = await requestWithJar(`https://${KTU_HOST}/eu/stu/studentDetailsView.htm`, {
                    method: "GET",
                    headers: {
                        "Referer": authRes.url || `https://${KTU_HOST}/eu/pub/dashboard.htm`
                    }
                }, null, jar);

                const elapsedMs = Date.now() - startTime;

                if (!currRes.body.includes("collapseFiveS")) {
                    console.log(`[KTU Relay] ⚠️ Curriculum tables missing in response (Length: ${currRes.body.length} bytes)`);
                    res.writeHead(500, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ success: false, error: "Curriculum tables not found in KTU response. Please verify student account permissions." }));
                    return;
                }

                // Authentication succeeded: cache session and reset failed counter
                sessionPool.set(normUser, jar);
                attemptShield.delete(normUser);

                console.log(`[KTU Relay] ✅ Fast Sync succeeded in ${elapsedMs}ms! Cached session for zero-login syncs.`);
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                    success: true,
                    html: currRes.body,
                    elapsedMs,
                    sessionCookies: jar.getCookieHeader()
                }));

            } catch (err) {
                console.error(`[KTU Relay] ❌ Server error:`, err.message);
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ success: false, error: err.message || "Failed to connect to KTU portal" }));
            }
        });
        return;
    }

    // --- Static File Server ---
    let filePath = path.join(__dirname, reqUrl.pathname === "/" ? "index.html" : reqUrl.pathname);
    
    // Normalize safe path
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("404 Not Found");
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || "application/octet-stream";

        res.writeHead(200, { "Content-Type": contentType });
        fs.createReadStream(filePath).pipe(res);
    });
});

if (require.main === module) {
    server.listen(PORT, () => {
        console.log(`===================================================`);
        console.log(`🚀 KTU CGPA Standalone PWA Server running!`);
        console.log(`📍 Web App URL:  http://localhost:${PORT}`);
        console.log(`⚡ Built-in CORS Fast Sync Relay: Active (/api/sync)`);
        console.log(`===================================================`);
    });
}

module.exports = server;
