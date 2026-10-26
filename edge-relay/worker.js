/**
 * KTU PWA Stateless Edge Relay (Cloudflare Worker)
 * 100% Stateless • Zero Logs • Zero Database • Pass-Through Proxy
 * Bypasses mobile browser CORS so students can sync grades in 300ms from mobile.
 */

const KTU_ORIGIN = "https://app.ktu.edu.in";
const LOGIN_URL = `${KTU_ORIGIN}/login.htm`;
const CURRICULUM_URL = `${KTU_ORIGIN}/eu/stu/studentDetailsView.htm`;

function getResponseHeaders(request, env) {
    const origin = request.headers.get("Origin") || "";
    let allowOrigin = "*";

    if (env && env.ALLOWED_ORIGIN) {
        const allowedList = env.ALLOWED_ORIGIN.split(",").map(s => s.trim());
        if (allowedList.includes(origin) || allowedList.includes("*")) {
            allowOrigin = origin;
        } else {
            allowOrigin = allowedList[0];
        }
    } else if (origin) {
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

export default {
    async fetch(request, env, ctx) {
        const corsHeaders = getResponseHeaders(request, env);

        // Handle CORS Preflight
        if (request.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }

        const url = new URL(request.url);

        // Health Check
        if (url.pathname === "/" || url.pathname === "/health") {
            return new Response(JSON.stringify({ status: "online", service: "KTU-Edge-Relay", timestamp: new Date().toISOString() }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // 1-Click Fast Sync Route: POST /api/sync
        if ((url.pathname === "/api/sync" || url.pathname === "/" || url.pathname === "") && request.method === "POST") {
            try {
                const startTime = Date.now();
                const body = await request.json().catch(() => ({}));
                const { username, password, sessionOnly, sessionCookies } = body;

                if (!username || (!password && !sessionOnly)) {
                    return new Response(JSON.stringify({ success: false, error: sessionOnly ? "Username required" : "Username and password required" }), {
                        status: 400,
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                }

                const cookieMap = new Map();
                const updateCookies = (res) => {
                    if (!res || !res.headers) return;
                    let cookieList = [];
                    if (typeof res.headers.getSetCookie === "function") {
                        cookieList = res.headers.getSetCookie();
                    } else {
                        const raw = res.headers.get("set-cookie") || "";
                        cookieList = raw.split(/,(?=\s*[A-Za-z0-9_-]+=)/);
                    }
                    const IGNORED_DIRECTIVES = new Set(["path", "domain", "expires", "max-age", "samesite", "httponly", "secure"]);
                    cookieList.forEach(str => {
                        const part = str.split(";")[0].trim();
                        const eq = part.indexOf("=");
                        if (eq > 0) {
                            const name = part.slice(0, eq).trim();
                            const value = part.slice(eq + 1).trim();
                            if (name && value && !IGNORED_DIRECTIVES.has(name.toLowerCase())) {
                                cookieMap.set(name, value);
                            }
                        }
                    });
                };

                const loadCookiesFromStr = (str) => {
                    if (!str || typeof str !== "string") return;
                    const IGNORED_DIRECTIVES = new Set(["path", "domain", "expires", "max-age", "samesite", "httponly", "secure"]);
                    str.split(";").forEach(part => {
                        const eq = part.indexOf("=");
                        if (eq > 0) {
                            const name = part.slice(0, eq).trim();
                            const value = part.slice(eq + 1).trim();
                            if (name && value && !IGNORED_DIRECTIVES.has(name.toLowerCase())) {
                                cookieMap.set(name, value);
                            }
                        }
                    });
                };

                const getCookieStr = () => {
                    const parts = [];
                    for (const [k, v] of cookieMap.entries()) parts.push(`${k}=${v}`);
                    return parts.join("; ");
                };

                // Zero-Login Session Refresh Mode (0 logins sent to KTU)
                if (sessionOnly) {
                    if (sessionCookies) loadCookiesFromStr(sessionCookies);
                    if (cookieMap.size === 0) {
                        return new Response(JSON.stringify({
                            success: false,
                            sessionExpired: true,
                            error: "No cached session found for this student. Please perform a Fast Sync once to establish a session."
                        }), {
                            status: 200,
                            headers: { ...corsHeaders, "Content-Type": "application/json" }
                        });
                    }

                    const currRes = await fetch(CURRICULUM_URL, {
                        headers: {
                            "Cookie": getCookieStr(),
                            "Referer": `${KTU_ORIGIN}/eu/alt/dashboard.htm`,
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
                        }
                    });
                    updateCookies(currRes);
                    const currHtml = await currRes.text();
                    const elapsedMs = Date.now() - startTime;

                    if (currRes.status === 526) {
                        return new Response(JSON.stringify({
                            success: false,
                            sessionExpired: false,
                            error: "KTU Portal SSL Handshake Error (526): Cloudflare Workers rejected KTU's eMudhra SSL certificate because KTU's server omitted the intermediate CA bundle. Please use the Node.js/Netlify relay or local server."
                        }), {
                            status: 502,
                            headers: { ...corsHeaders, "Content-Type": "application/json" }
                        });
                    }

                    const hasCurriculum = currHtml.includes("collapseFiveS");
                    const hasStudentProfile = currHtml.includes("profile-title") || currHtml.includes("studentDetailsView") || (currHtml.includes("list-group-item") && currHtml.includes("Register"));

                    if (hasCurriculum || hasStudentProfile) {
                        return new Response(JSON.stringify({
                            success: true,
                            html: currHtml,
                            elapsedMs,
                            sessionCookies: getCookieStr(),
                            refreshedViaSession: true
                        }), {
                            headers: { ...corsHeaders, "Content-Type": "application/json" }
                        });
                    } else {
                        const titleMatch = currHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
                        const pageTitle = titleMatch ? titleMatch[1].trim() : "";
                        return new Response(JSON.stringify({
                            success: false,
                            sessionExpired: true,
                            error: `Cached KTU session has expired (Status: ${currRes.status}, Title: "${pageTitle}", Len: ${currHtml.length}).`,
                            diagnostics: {
                                status: currRes.status,
                                title: pageTitle,
                                preview: currHtml.slice(0, 300)
                            }
                        }), {
                            status: 200,
                            headers: { ...corsHeaders, "Content-Type": "application/json" }
                        });
                    }
                }

                // Step 1: GET Login Page to retrieve CSRF_TOKEN & JSESSIONID/AWSALB
                const loginPageRes = await fetch(LOGIN_URL, {
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
                    }
                });

                updateCookies(loginPageRes);

                const loginHtml = await loginPageRes.text();
                const csrfMatch = loginHtml.match(/name="CSRF_TOKEN"[^>]*value="([^"]+)"/i) 
                    || loginHtml.match(/value="([^"]+)"[^>]*name="CSRF_TOKEN"/i);
                const csrfToken = csrfMatch ? csrfMatch[1] : "";

                // Step 2: POST Credentials to KTU
                const postParams = new URLSearchParams();
                postParams.append("username", username.trim());
                postParams.append("password", password);
                if (csrfToken) postParams.append("CSRF_TOKEN", csrfToken);

                let authRes = await fetch(LOGIN_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        "Origin": KTU_ORIGIN,
                        "Referer": LOGIN_URL,
                        "Cookie": getCookieStr(),
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
                    },
                    body: postParams.toString(),
                    redirect: "manual"
                });

                updateCookies(authRes);

                // Follow redirects hop-by-hop (preserving and updating cookies at every stage)
                let currentUrl = LOGIN_URL;
                let redirectCount = 0;
                const MAX_REDIRECTS = 5;

                while ([301, 302, 303, 307, 308].includes(authRes.status) && authRes.headers.get("location") && redirectCount < MAX_REDIRECTS) {
                    redirectCount++;
                    const prevUrl = currentUrl;
                    currentUrl = new URL(authRes.headers.get("location"), prevUrl).toString();
                    authRes = await fetch(currentUrl, {
                        method: "GET",
                        headers: {
                            "Cookie": getCookieStr(),
                            "Referer": prevUrl,
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
                        },
                        redirect: "manual"
                    });
                    updateCookies(authRes);
                }

                // Inspect the final landing page body for auth errors or login forms
                const landingHtml = await authRes.text();

                // Detect Cloudflare SSL 526 Handshake failure to prevent false 401 lockout
                if (loginPageRes.status === 526 || authRes.status === 526) {
                    return new Response(JSON.stringify({ 
                        success: false, 
                        error: "KTU SSL Handshake Error (526): Cloudflare rejected KTU's eMudhra SSL certificate due to a missing intermediate CA bundle on KTU's server. Please use the Node/Netlify relay or local server (server.js)." 
                    }), {
                        status: 502,
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                }

                // Extract human error from .alert-danger
                const dangerAlerts = [...landingHtml.matchAll(/<div[^>]*class="[^"]*alert-danger[^"]*"[^>]*>([\s\S]*?)<\/div>/gi)];
                let portalError = "";
                for (const m of dangerAlerts) {
                    const txt = m[1].replace(/<[^>]+>/g, "").trim();
                    if (txt) {
                        portalError = txt;
                        break;
                    }
                }

                const isLoginForm = landingHtml.includes("name=\"loginform\"") || landingHtml.includes("id=\"login-username\"");
                if (portalError || isLoginForm || authRes.status === 401 || currentUrl.includes("/login.htm")) {
                    const errorMsg = portalError || "Invalid KTU username or password. Please verify your portal credentials.";
                    return new Response(JSON.stringify({ success: false, error: errorMsg }), {
                        status: 401,
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                }

                // Step 3: Fetch Student Curriculum Page
                const currRes = await fetch(CURRICULUM_URL, {
                    method: "GET",
                    headers: {
                        "Cookie": getCookieStr(),
                        "Referer": currentUrl || `${KTU_ORIGIN}/eu/alt/dashboard.htm`,
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
                    }
                });

                updateCookies(currRes);
                const currHtml = await currRes.text();
                const elapsedMs = Date.now() - startTime;

                const hasCurriculum = currHtml.includes("collapseFiveS");
                const hasStudentProfile = currHtml.includes("profile-title") || currHtml.includes("studentDetailsView") || (currHtml.includes("list-group-item") && currHtml.includes("Register"));

                if (!hasCurriculum && !hasStudentProfile) {
                    // Diagnostic extraction: pinpoint why KTU did not return the student page
                    const titleMatch = currHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
                    const pageTitle = titleMatch ? titleMatch[1].trim() : "";
                    
                    let errorMsg = "Curriculum records could not be loaded from KTU portal.";
                    if (currRes.status === 403 || currHtml.includes("Access Denied")) {
                        errorMsg = "KTU portal returned 403 Access Denied. The university firewall may be restricting datacenter IP traffic.";
                    } else if (currHtml.includes("loginform") || currHtml.includes("login-username")) {
                        errorMsg = "KTU portal session expired immediately after login. Please verify your portal credentials or try again.";
                    } else if (currHtml.includes("feedback") || currHtml.includes("survey")) {
                        errorMsg = "KTU portal requires completion of a mandatory student survey or feedback form before academic records can be viewed.";
                    } else if (pageTitle) {
                        errorMsg = `Curriculum records could not be loaded (KTU page title: "${pageTitle}", HTTP status: ${currRes.status}).`;
                    }

                    return new Response(JSON.stringify({ 
                        success: false, 
                        error: errorMsg,
                        diagnostics: {
                            statusCode: currRes.status,
                            pageTitle: pageTitle || null,
                            landingUrl: currentUrl
                        }
                    }), {
                        status: 500,
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                }

                return new Response(JSON.stringify({
                    success: true,
                    html: currHtml,
                    elapsedMs,
                    sessionCookies: getCookieStr()
                }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });

            } catch (err) {
                return new Response(JSON.stringify({ success: false, error: "Network error connecting to KTU: " + err.message }), {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            }
        }

        return new Response(JSON.stringify({ error: "Route not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
};
