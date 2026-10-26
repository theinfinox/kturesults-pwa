/**
 * KTU PWA Headless Sync & Extraction Engine
 * Modular, Decoupled, Client-Side Parser
 */

(function () {
    function getDefaultRelay() {
        if (typeof window !== "undefined" && window.location) {
            const host = window.location.hostname;
            if (host === "kturesults.govindsr.me" || host.endsWith(".netlify.app") || host === "localhost" || host === "127.0.0.1") {
                return "/api/sync";
            }
        }
        return "https://kturesults.govindsr.me/api/sync";
    }

    const DEFAULT_RELAY_ENDPOINT = getDefaultRelay();

    const GRADE_REGEX = /^(O|S|A\+|A|B\+|B|C\+|C|D|P|LP|F|FE|I|AB|ABSENT|PASS|FAIL|COMPLETED|AUDIT|SATISFACTORY)$/i;

    // --- Activity Points Parser from Official KTU #collapseSix Accordion Table ---
    function parseActivityPoints(doc) {
        if (!doc) return null;
        const activityData = {
            totalPoints: 0,
            eligiblePoints: 0,
            obtainedPoints: 0,
            minimumPoints: 100,
            yearlyBreakdown: {
                firstYear: 0,
                secondYear: 0,
                thirdYear: 0,
                fourthYear: 0
            },
            groups: []
        };

        // 1. Locate collapseSix panel or any container/anchor pointing to collapseSix
        let panel = (typeof doc.querySelector === "function") ? doc.querySelector("#collapseSix, [id*='collapseSix'], [id*='CollapseSix']") : null;
        let table = panel && typeof panel.querySelector === "function" ? panel.querySelector("table") : null;

        if (!table && typeof doc.querySelector === "function") {
            const anchor = doc.querySelector('a[href*="collapseSix"], [data-target*="collapseSix"]');
            if (anchor && anchor.parentElement) {
                const parentBlock = (typeof anchor.closest === "function" ? anchor.closest(".panel, .card, .accordion-group") : null) || anchor.parentElement.parentElement;
                if (parentBlock && typeof parentBlock.querySelector === "function") table = parentBlock.querySelector("table");
            }
        }

        if (!table && typeof doc.querySelectorAll === "function") {
            // Fallback: search all tables in document for activity points headers
            const allTables = doc.querySelectorAll("table") || [];
            for (let i = 0; i < allTables.length; i++) {
                const tbl = allTables[i];
                const text = (tbl.textContent || "").toLowerCase();
                if ((text.includes("obtained") || text.includes("eligible")) && (text.includes("activity") || text.includes("minimum") || text.includes("first year"))) {
                    table = tbl;
                    break;
                }
            }
        }

        if (table && typeof table.querySelectorAll === "function") {
            let groupCol = -1;
            let y1Col = -1;
            let y2Col = -1;
            let y3Col = -1;
            let y4Col = -1;
            let obtainedCol = -1;
            let eligibleCol = -1;
            let minCol = -1;

            const ths = table.querySelectorAll("thead th, tr th, tr:first-child td") || [];
            ths.forEach((th, idx) => {
                const txt = (th.textContent || "").trim().toLowerCase();
                if (txt.includes("group")) groupCol = idx;
                else if (txt.includes("first")) y1Col = idx;
                else if (txt.includes("second")) y2Col = idx;
                else if (txt.includes("third")) y3Col = idx;
                else if (txt.includes("fourth")) y4Col = idx;
                else if (txt.includes("obtained")) obtainedCol = idx;
                else if (txt.includes("eligible")) eligibleCol = idx;
                else if (txt.includes("minimum") || txt.includes("target")) minCol = idx;
            });

            const rows = table.querySelectorAll("tbody tr, tr") || [];
            let totalEligible = 0;
            let totalObtained = 0;
            let targetMin = 100;
            let foundDataRow = false;

            rows.forEach(tr => {
                if (typeof tr.querySelectorAll !== "function") return;
                const tds = tr.querySelectorAll("td") || [];
                if (tds.length < 3) return; // ignore headers or spacer rows

                const groupName = groupCol >= 0 && tds[groupCol] ? tds[groupCol].textContent.trim() : "";
                const y1 = y1Col >= 0 && tds[y1Col] ? (parseFloat(tds[y1Col].textContent.trim()) || 0) : 0;
                const y2 = y2Col >= 0 && tds[y2Col] ? (parseFloat(tds[y2Col].textContent.trim()) || 0) : 0;
                const y3 = y3Col >= 0 && tds[y3Col] ? (parseFloat(tds[y3Col].textContent.trim()) || 0) : 0;
                const y4 = y4Col >= 0 && tds[y4Col] ? (parseFloat(tds[y4Col].textContent.trim()) || 0) : 0;

                const obt = obtainedCol >= 0 && tds[obtainedCol] ? parseFloat(tds[obtainedCol].textContent.trim()) : NaN;
                const elig = eligibleCol >= 0 && tds[eligibleCol] ? parseFloat(tds[eligibleCol].textContent.trim()) : NaN;
                const minPts = minCol >= 0 && tds[minCol] ? parseFloat(tds[minCol].textContent.trim()) : NaN;

                if (!isNaN(elig) || !isNaN(obt)) {
                    foundDataRow = true;
                    const rowElig = !isNaN(elig) ? elig : obt;
                    const rowObt = !isNaN(obt) ? obt : elig;
                    totalEligible += rowElig;
                    totalObtained += rowObt;
                    if (!isNaN(minPts) && minPts > 0) targetMin = minPts;

                    activityData.yearlyBreakdown.firstYear += y1;
                    activityData.yearlyBreakdown.secondYear += y2;
                    activityData.yearlyBreakdown.thirdYear += y3;
                    activityData.yearlyBreakdown.fourthYear += y4;

                    activityData.groups.push({
                        group: groupName,
                        firstYear: y1,
                        secondYear: y2,
                        thirdYear: y3,
                        fourthYear: y4,
                        obtained: rowObt,
                        eligible: rowElig,
                        minimum: minPts
                    });
                }
            });

            if (foundDataRow) {
                activityData.totalPoints = totalEligible > 0 ? totalEligible : totalObtained;
                activityData.eligiblePoints = totalEligible;
                activityData.obtainedPoints = totalObtained;
                activityData.minimumPoints = targetMin;
                return activityData;
            }
        }

        return null;
    }

    // --- In-Memory HTML Parsers (Direct Boilerplate from Tested Extension Logic) ---
    function parseStudentInfo(doc) {
        const studentInfo = {
            name: "",
            registerNo: "",
            institution: "",
            scheme: "",
            branch: "",
            minorBranch: "",
            currentSemester: "",
            cgpa: ""
        };

        const titleDiv = doc.querySelector(".profile-title") || doc.querySelector("h3") || doc.querySelector(".page-header");
        if (titleDiv) {
            const rawTitle = titleDiv.textContent.trim();
            const regMatch = rawTitle.match(/\(([A-Z0-9]+)\)/i);
            if (regMatch) studentInfo.registerNo = regMatch[1].toUpperCase();

            const instMatch = rawTitle.match(/\((COLLEGE[^)]+|INSTITUTE[^)]+|[A-Z\s]+ENGINEERING[A-Z\s]*)\)/i);
            if (instMatch) studentInfo.institution = instMatch[1].trim();

            const nameMatch = rawTitle.split("(")[0];
            if (nameMatch && nameMatch.trim()) studentInfo.name = nameMatch.trim();
        }
        const listItems = doc.querySelectorAll(".list-group-item") || [];
        listItems.forEach(li => {
            const text = (li && li.textContent ? li.textContent : "").trim();
            const badge = (li && typeof li.querySelector === "function") ? li.querySelector(".badge, .view-badge") : null;
            let label = "";
            let val = "";

            if (badge) {
                label = badge.textContent.replace(/[:]/g, "").trim().toLowerCase();
                val = li.textContent.replace(badge.textContent, "").replace(/[:]/g, "").trim();
            } else if (text.includes(":")) {
                const parts = text.split(":");
                label = parts[0].trim().toLowerCase();
                val = parts.slice(1).join(":").trim();
            } else {
                label = text.toLowerCase();
            }

            if (label.includes("scheme") || label.includes("curriculum")) {
                studentInfo.scheme = val || text.replace(/Scheme\s*:/i, "").trim();
            } else if (label.includes("minor")) {
                // Minor in Engineering: captures optional secondary minor discipline without clobbering major branch
                if (val && !/^none$/i.test(val) && !/^minor\s*branch$/i.test(val)) {
                    studentInfo.minorBranch = val;
                }
            } else if (label.includes("branch") || label.includes("stream") || label.includes("department") || label.includes("program")) {
                // Primary Undergraduate Major Branch
                if (!val.toLowerCase().includes("minor") && !label.includes("minor")) {
                    const candidate = val || text.replace(/(Branch|Stream|Department|Program)\s*:/i, "").trim();
                    if (!/^minor\s*branch$/i.test(candidate)) {
                        studentInfo.branch = candidate;
                    }
                }
            } else if (label.includes("current semester")) {
                studentInfo.currentSemester = val || text.replace(/Current Semester\s*:/i, "").trim();
            } else if (label.includes("cgpa")) {
                studentInfo.cgpa = val || text.replace(/CGPA\s*:/i, "").trim();
            } else if (label.includes("activity point") || label.includes("activity points")) {
                const actMatch = (val || text).match(/(\d+(?:\.\d+)?)/);
                if (actMatch) studentInfo.activityPoints = parseFloat(actMatch[1]);
            }
        });

        // 1. Primary Source: KTU official #collapseSix activity table
        const actData = parseActivityPoints(doc);
        if (actData && (actData.totalPoints !== undefined && actData.totalPoints !== null)) {
            studentInfo.activityPoints = actData.totalPoints;
            studentInfo.activityDetails = actData;
            if (actData.minimumPoints) {
                studentInfo.activityTarget = actData.minimumPoints;
            }
        }

        // 2. Secondary Scrape: Scan document for Activity Points if not found in table or list-group-items
        if (studentInfo.activityPoints === undefined || studentInfo.activityPoints === null) {
            const allElements = doc.querySelectorAll("td, th, span, div, p, li") || [];
            for (const el of allElements) {
                const t = el.textContent || "";
                if (/activity\s*points?/i.test(t)) {
                    const m = t.match(/activity\s*points?\s*[:\-]?\s*(\d+(?:\.\d+)?)/i);
                    if (m) {
                        studentInfo.activityPoints = parseFloat(m[1]);
                        break;
                    }
                }
            }
        }

        // Resilient Fallback: If primary branch is missing or was parsed as "Minor Branch", decode from registerNo
        if (!studentInfo.branch || /^minor\s*branch$/i.test(studentInfo.branch)) {
            if (studentInfo.registerNo) {
                const clean = studentInfo.registerNo.toUpperCase().replace(/[^A-Z0-9]/g, "");
                const m = clean.match(/^(?:L)?(?:[A-Z]{3,4})?(\d{2})([A-Z]{2,3})(\d{3})$/);
                if (m) {
                    const bCode = m[2];
                    if (bCode === "CS" || bCode === "CSE") studentInfo.branch = "Computer Science & Engineering";
                    else if (bCode === "AD" || bCode === "AI") studentInfo.branch = "Artificial Intelligence & Data Science";
                    else if (bCode === "EC" || bCode === "ECE") studentInfo.branch = "Electronics & Communication Engineering";
                    else if (bCode === "EE" || bCode === "EEE") studentInfo.branch = "Electrical & Electronics Engineering";
                    else if (bCode === "ME") studentInfo.branch = "Mechanical Engineering";
                    else if (bCode === "CE") studentInfo.branch = "Civil Engineering";
                    else if (bCode === "IT") studentInfo.branch = "Information Technology";
                }
            }
        }

        return studentInfo;
    }

    function parseSemesterData(doc) {
        const semesterData = [];
        const semesterPanels = doc.querySelectorAll('[id^="collapseFiveS"]');

        semesterPanels.forEach(panel => {
            const semId = panel.id.replace("collapseFive", "");
            const table = panel.querySelector("table");
            if (!table) return;

            // Header inspection for Slot and Grade columns
            let gradeColIdx = -1;
            let slotColIdx = -1;
            const ths = table.querySelectorAll("thead th, tr th, tr:first-child td");
            ths.forEach((th, idx) => {
                const txt = th.textContent.trim().toLowerCase();
                if (txt === "slot" || txt.includes("slot")) {
                    slotColIdx = idx;
                }
                if (txt === "grade" || txt.includes("grade")) {
                    gradeColIdx = idx;
                }
            });

            const trs = table.querySelectorAll("tbody tr");
            const rows = trs.length > 0 ? trs : table.querySelectorAll("tr");
            rows.forEach(tr => {
                const cols = tr.querySelectorAll("td");
                if (cols.length < 7) return;

                // Robust Slot Extraction: check slotColIdx first, then fallback to cols[0]
                let rawSlot = "";
                if (slotColIdx >= 0 && cols[slotColIdx]) {
                    rawSlot = cols[slotColIdx].textContent.trim();
                } else if (cols[0]) {
                    const cand = cols[0].textContent.trim();
                    if (/^(?:slot\s*[:\-]?\s*)?[A-Za-z][A-Za-z0-9+]{0,3}$/i.test(cand)) {
                        rawSlot = cand;
                    }
                }

                // Clean & normalize slot token
                let slot = "";
                if (rawSlot && !/^[-–—\s]+$/.test(rawSlot) && !/^null$/i.test(rawSlot)) {
                    const matchSlot = rawSlot.match(/^(?:slot\s*[:\-]?\s*)?([A-Za-z0-9+]+)/i);
                    slot = matchSlot ? matchSlot[1].toUpperCase() : rawSlot.toUpperCase();
                }

                const subject = cols[1] ? cols[1].textContent.trim() : "";
                const creditRaw = cols[2] ? cols[2].textContent.trim() : "0";
                const credit = parseFloat(creditRaw) || 0;

                // Multi-tiered robust grade extraction
                let grade = "";
                if (gradeColIdx >= 0 && cols[gradeColIdx]) {
                    grade = cols[gradeColIdx].textContent.trim();
                } else if (cols.length >= 8 && cols[7]) {
                    grade = cols[7].textContent.trim();
                }

                if (!grade || !GRADE_REGEX.test(grade)) {
                    for (let i = cols.length - 1; i >= 3; i--) {
                        const cellText = cols[i].textContent.trim().toUpperCase();
                        if (GRADE_REGEX.test(cellText)) {
                            grade = cellText;
                            break;
                        }
                    }
                }

                if (!grade && cols.length >= 7) {
                    grade = cols[cols.length - 1].textContent.trim();
                }

                if (subject) {
                    semesterData.push({
                        semester: semId,
                        slot: slot || "",
                        subject,
                        credit,
                        grade
                    });
                }
            });
        });

        return semesterData;
    }

    // --- Fail-Safe Relay Transport with Automatic Edge Failover ---
    async function dispatchRelayWithFailover(payload, customRelayUrl = null) {
        let savedRelay = localStorage.getItem("ktu_custom_relay");
        if (savedRelay && (savedRelay.includes("theinfinox.workers.dev") || savedRelay.includes("govindsr.me"))) {
            savedRelay = null;
            localStorage.removeItem("ktu_custom_relay");
        }

        const candidateUrls = [];
        if (customRelayUrl) {
            candidateUrls.push(customRelayUrl);
        } else if (savedRelay) {
            candidateUrls.push(savedRelay);
        } else {
            // Prioritize native relative endpoint if on custom domain, Netlify or localhost
            if (typeof window !== "undefined" && window.location) {
                const host = window.location.hostname;
                if (host === "kturesults.govindsr.me" || host.endsWith(".netlify.app") || host === "localhost" || host === "127.0.0.1") {
                    candidateUrls.push("/api/sync");
                }
            }
            candidateUrls.push("https://kturesults.govindsr.me/api/sync");
            candidateUrls.push("https://kturesults.netlify.app/api/sync");
        }

        // Deduplicate candidates
        const uniqueUrls = [...new Set(candidateUrls)];
        let lastError = null;

        for (const rawUrl of uniqueUrls) {
            let url = rawUrl;
            if (url.startsWith("http") && !url.endsWith("/api/sync") && !url.includes("?")) {
                url = url.replace(/\/+$/, "") + "/api/sync";
            }

            const isLocal = url.startsWith("http://localhost") || url.startsWith("http://127.0.0.1") || url.startsWith("/api/sync");
            const isHttps = url.startsWith("https://");
            if (!isLocal && !isHttps) continue;

            try {
                const response = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });

                if (response.status === 401) {
                    const errData = await response.json().catch(() => ({ error: null }));
                    const msg = (errData && errData.error && errData.error.trim()) || "Invalid KTU username or password. Please verify your portal credentials.";
                    throw new Error(msg); // 401 is auth rejection. NEVER retry, report to student immediately.
                }

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({ error: null }));
                    const msg = (errData && errData.error && errData.error.trim()) || `Relay server error (${response.status})`;
                    throw new Error(msg);
                }

                const data = await response.json().catch(() => null);
                if (!data || (!data.success && !data.sessionExpired)) {
                    throw new Error((data && data.error) || "Relay returned empty response.");
                }

                return data; // Success!
            } catch (err) {
                // If it's authentication error or cooldown shield, immediately bubble up to protect KTU account
                const isAuthError = err.message && (
                    err.message.includes("Invalid") || 
                    err.message.includes("Shield") || 
                    err.message.includes("disabled") || 
                    err.message.includes("password")
                );
                if (isAuthError) throw err;

                lastError = err;
                console.warn(`[KTUSyncEngine] Relay candidate failed (${url}):`, err.message, "Trying failover candidate...");
            }
        }

        if (lastError && (lastError.name === "TypeError" || lastError.message.includes("Failed to fetch"))) {
            throw new Error("Unable to connect to KTU relay servers. Please check your internet connection.");
        }
        throw (lastError || new Error("Relay connection failure."));
    }

    // --- Fast Sync via Stateless Relay ---
    async function executeFastSync(username, password, customRelayUrl = null) {
        const data = await dispatchRelayWithFailover({ username, password }, customRelayUrl);
        if (!data.success || !data.html) {
            throw new Error(data.error || "Portal returned empty response.");
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(data.html, "text/html");

        const studentInfo = parseStudentInfo(doc);
        const semesterData = parseSemesterData(doc);

        if (!semesterData || semesterData.length === 0) {
            throw new Error("Connected to KTU portal, but no course records were found in profile.");
        }

        return {
            studentInfo,
            semesterData,
            sessionCookies: data.sessionCookies || null,
            elapsedMs: data.elapsedMs || 300,
            timestamp: new Date().toISOString()
        };
    }

    // --- Zero-Login Session Refresh via Cached Session ---
    // Strictly uses session cookies without login.htm invocation (0 lockout risk)
    async function executeSessionRefresh(username, sessionCookies = null, customRelayUrl = null) {
        const data = await dispatchRelayWithFailover({
            username,
            sessionOnly: true,
            sessionCookies
        }, customRelayUrl);

        if (!data.success || !data.html) {
            const err = new Error(data.error || "Session refresh failed.");
            err.sessionExpired = Boolean(data.sessionExpired);
            throw err;
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(data.html, "text/html");

        const studentInfo = parseStudentInfo(doc);
        const semesterData = parseSemesterData(doc);

        if (!semesterData || semesterData.length === 0) {
            throw new Error("Connected to KTU portal via session, but no course records were found in profile.");
        }

        return {
            studentInfo,
            semesterData,
            sessionCookies: data.sessionCookies || sessionCookies,
            elapsedMs: data.elapsedMs || 200,
            timestamp: new Date().toISOString(),
            refreshedViaSession: true
        };
    }

    // --- Parse Offline HTML String ---
    function parseRawHtml(htmlString) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, "text/html");
        return {
            studentInfo: parseStudentInfo(doc),
            semesterData: parseSemesterData(doc),
            timestamp: new Date().toISOString()
        };
    }

    // Expose Global Engine
    window.KTUSyncEngine = {
        executeFastSync,
        executeSessionRefresh,
        parseRawHtml,
        parseStudentInfo,
        parseActivityPoints,
        parseSemesterData
    };
})();
