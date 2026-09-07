/**
 * Netlify Serverless Function: KTU 1-Click Fast Sync & Session Refresh Relay
 * Runs natively in Netlify's Node.js runtime with zero external dependencies.
 */

const https = require("https");
const { URL, URLSearchParams } = require("url");

const KTU_HOST = "app.ktu.edu.in";

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

function requestWithJar(targetUrl, options = {}, postData = null, jar = null) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(targetUrl);
        const headers = Object.assign({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Connection": "keep-alive"
        }, options.headers || {});

        if (jar) {
            const cookieHdr = jar.getCookieHeader();
            if (cookieHdr) {
                headers["Cookie"] = cookieHdr;
            }
        }

        const req = https.request({
            hostname: parsed.hostname,
            port: parsed.port || 443,
            path: parsed.pathname + parsed.search,
            method: options.method || "GET",
            headers,
            rejectUnauthorized: false
        }, (res) => {
            if (jar) {
                jar.updateFromHeaders(res.headers);
            }

            // Handle 301/302 Redirects
            if ([301, 302, 303, 307].includes(res.statusCode) && res.headers.location) {
                const nextUrl = new URL(res.headers.location, targetUrl).href;
                res.resume();
                return requestWithJar(nextUrl, { method: "GET", headers: options.headers }, null, jar)
                    .then(resolve)
                    .catch(reject);
            }

            let body = "";
            res.setEncoding("utf8");
            res.on("data", chunk => body += chunk);
            res.on("end", () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body,
                    url: targetUrl
                });
            });
        });

        req.on("error", reject);
        req.setTimeout(15000, () => {
            req.destroy(new Error("KTU portal request timed out after 15s"));
        });

        if (postData) {
            req.write(postData);
        }
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

        // 1. Zero-Login Session Refresh
        if (sessionOnly) {
            if (!sessionCookies) {
                return {
                    statusCode: 401,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        success: false,
                        sessionExpired: true,
                        error: "No cached session found. Please perform a Fast Sync once."
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
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: false,
                    sessionExpired: true,
                    error: "Cached KTU session has expired. Zero login attempts were made. Please use Fast Sync to re-authenticate."
                })
            };
        }

        // 2. 1-Click Fast Sync (Full Login)
        if (!username || !password) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ success: false, error: "Username and password required" })
            };
        }

        const jar = new CookieJar();

        // 2a. Fetch landing page to capture CSRF token and initial session cookies
        const initRes = await requestWithJar(`https://${KTU_HOST}/eu/res/semResultStudentInit.htm`, {
            method: "GET"
        }, null, jar);

        let csrfToken = "";
        const csrfMatch = initRes.body.match(/name="CSRF_TOKEN"\s+value="([^"]+)"/i) ||
                          initRes.body.match(/CSRF_TOKEN\s*=\s*['"]([^'"]+)['"]/i);
        if (csrfMatch) csrfToken = csrfMatch[1];

        // 2b. POST Login credentials to KTU authentication endpoint
        const formParams = new URLSearchParams();
        formParams.append("username", username);
        formParams.append("password", password);
        if (csrfToken) formParams.append("CSRF_TOKEN", csrfToken);
        const postBody = formParams.toString();

        const authRes = await requestWithJar(`https://${KTU_HOST}/login.htm`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Content-Length": Buffer.byteLength(postBody),
                "Referer": `https://${KTU_HOST}/eu/res/semResultStudentInit.htm`
            }
        }, postBody, jar);

        if (authRes.body.includes("Bad credentials") || 
            authRes.body.includes("Invalid Username/Password") ||
            authRes.body.includes("login.htm?error=true")) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ success: false, error: "Invalid KTU credentials. Please check your username/password." })
            };
        }

        // 2c. Fetch Student Curriculum
        const currRes = await requestWithJar(`https://${KTU_HOST}/eu/stu/studentDetailsView.htm`, {
            method: "GET",
            headers: { "Referer": authRes.url || `https://${KTU_HOST}/eu/pub/dashboard.htm` }
        }, null, jar);

        const elapsedMs = Date.now() - startTime;

        if (!currRes.body.includes("collapseFiveS")) {
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ success: false, error: "Curriculum tables not found in KTU response." })
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
            body: JSON.stringify({ success: false, error: err.message || "Relay failure" })
        };
    }
};
