/**
 * Netlify Serverless Function: KTU 1-Click Fast Sync & Session Refresh Relay
 * 100% Native Node.js (Zero External Dependencies)
 * Mirrors tested standalone server.js architecture
 */

const https = require("https");
const { URL, URLSearchParams } = require("url");

const KTU_HOST = "app.ktu.edu.in";

const BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "max-age=0",
    "Connection": "keep-alive",
    "Sec-Ch-Ua": '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1"
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
        const pairs = cookieStr.split(";");
        for (const pair of pairs) {
            const trimmed = pair.trim();
            if (!trimmed) continue;
            const eqIdx = trimmed.indexOf("=");
            if (eqIdx > 0) {
                const name = trimmed.substring(0, eqIdx).trim();
                const value = trimmed.substring(eqIdx + 1).trim();
                if (name && !IGNORED_DIRECTIVES.has(name.toLowerCase())) {
                    this.cookies.set(name, value);
                }
            }
        }
    }
}

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
            headers: headers,
            rejectUnauthorized: false
        };

        const req = https.request(reqOpts, async (res) => {
            jar.updateFromHeaders(res.headers);
            let body = "";
            res.on("data", (chunk) => (body += chunk));
            res.on("end", async () => {
                // Follow 301, 302, 303, 307, 308 redirects automatically with clean GET headers
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

exports.handler = async (event, context) => {
    const origin = event.headers.origin || event.headers.Origin || "*";
    const corsHeaders = {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Credentials": "true",
        "Content-Type": "application/json"
    };

    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 204, headers: corsHeaders, body: "" };
    }

    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405,
            headers: corsHeaders,
            body: JSON.stringify({ success: false, error: "Method Not Allowed" })
        };
    }

    const startTime = Date.now();

    try {
        const payload = JSON.parse(event.body || "{}");
        const { username, password, sessionCookies, sessionOnly } = payload;
        const normUser = (username || "").trim();

        // --- 1. ZERO-LOGIN SESSION REFRESH PATH ---
        if (sessionOnly) {
            if (!sessionCookies) {
                return {
                    statusCode: 200,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        success: false,
                        sessionExpired: true,
                        error: "No cached session found for this student. Please perform a Fast Sync once to establish a session."
                    })
                };
            }

            const jar = new CookieJar();
            jar.loadFromCookieHeader(sessionCookies);

            const currRes = await requestWithJar(`https://${KTU_HOST}/eu/stu/studentDetailsView.htm`, {
                method: "GET",
                headers: { "Referer": `https://${KTU_HOST}/eu/pub/dashboard.htm` }
            }, null, jar);

            const elapsedMs = Date.now() - startTime;

            if (currRes.body.includes("collapseFiveS")) {
                return {
                    statusCode: 200,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        success: true,
                        html: currRes.body,
                        elapsedMs,
                        sessionCookies: jar.getCookieHeader(),
                        refreshedViaSession: true
                    })
                };
            }

            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: false,
                    sessionExpired: true,
                    error: "Cached KTU session has expired. Zero login attempts were made to protect your account. Please use Fast Sync to re-authenticate."
                })
            };
        }

        // --- 2. 1-CLICK FAST SYNC (FULL LOGIN) ---
        if (!normUser || !password) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ success: false, error: "Username and password required" })
            };
        }

        // Check if cached cookies can fulfill request without logging in
        let jar = new CookieJar();
        if (sessionCookies) {
            jar.loadFromCookieHeader(sessionCookies);
            const probeRes = await requestWithJar(`https://${KTU_HOST}/eu/stu/studentDetailsView.htm`, {
                method: "GET",
                headers: { "Referer": `https://${KTU_HOST}/eu/pub/dashboard.htm` }
            }, null, jar);

            if (probeRes.body.includes("collapseFiveS")) {
                const elapsedMs = Date.now() - startTime;
                return {
                    statusCode: 200,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        success: true,
                        html: probeRes.body,
                        elapsedMs,
                        sessionCookies: jar.getCookieHeader(),
                        refreshedViaSession: true
                    })
                };
            }
            jar = new CookieJar(); // Reset jar if expired
        }

        // 2a. GET Login Page to collect session cookies (AWSALB, JSESSIONID) & CSRF_TOKEN
        const loginPage = await requestWithJar(`https://${KTU_HOST}/login.htm`, {
            method: "GET"
        }, null, jar);

        const csrfMatch = loginPage.body.match(/name="CSRF_TOKEN"[^>]*value="([^"]+)"/i) 
            || loginPage.body.match(/value="([^"]+)"[^>]*name="CSRF_TOKEN"/i);
        const csrfToken = csrfMatch ? csrfMatch[1] : "";

        // 2b. POST Login Credentials with full browser headers & session jar
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

        const isLoginForm = authRes.body.includes('name="loginform"') || authRes.body.includes('id="login-username"');
        if (portalError || (authRes.statusCode === 200 && isLoginForm)) {
            const errorMsg = portalError || "Invalid KTU username or password. Please verify your credentials.";
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ success: false, error: errorMsg })
            };
        }

        // 2c. Fetch Student Curriculum
        const currRes = await requestWithJar(`https://${KTU_HOST}/eu/stu/studentDetailsView.htm`, {
            method: "GET",
            headers: {
                "Referer": authRes.url || `https://${KTU_HOST}/eu/pub/dashboard.htm`
            }
        }, null, jar);

        const elapsedMs = Date.now() - startTime;

        if (!currRes.body.includes("collapseFiveS")) {
            // Diagnostic extraction: check what KTU actually sent back
            const titleMatch = currRes.body.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
            const pageTitle = titleMatch ? titleMatch[1].trim() : "Unknown Page";
            let reason = "Curriculum tables not found in KTU response.";
            
            if (currRes.body.includes("Access Denied") || currRes.statusCode === 403) {
                reason = "KTU portal returned 403 Access Denied. The university firewall may be restricting datacenter IP traffic.";
            } else if (currRes.body.includes("loginform") || currRes.body.includes("login-username")) {
                reason = "Session expired or rejected by KTU after login redirect.";
            } else if (pageTitle) {
                reason += ` (Page title: "${pageTitle}", Status: ${currRes.statusCode})`;
            }

            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: false,
                    error: reason,
                    diagnostics: {
                        statusCode: currRes.statusCode,
                        landingUrl: currRes.url,
                        contentLength: currRes.body.length
                    }
                })
            };
        }

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                html: currRes.body,
                elapsedMs,
                sessionCookies: jar.getCookieHeader()
            })
        };

    } catch (err) {
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                success: false,
                error: err.message || "Relay failure connecting to KTU portal"
            })
        };
    }
};
