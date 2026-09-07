/**
 * KTU PWA Headless Sync & Extraction Engine
 * Modular, Decoupled, Client-Side Parser
 */

(function () {
    const DEFAULT_RELAY_ENDPOINT = "/api/sync";

    const GRADE_REGEX = /^(O|S|A\+|A|B\+|B|C\+|C|D|P|LP|F|FE|I|AB|ABSENT|PASS|FAIL|COMPLETED|AUDIT|SATISFACTORY)$/i;

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
            }
        });

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

            // Header inspection for Grade column
            let gradeColIdx = -1;
            const ths = table.querySelectorAll("thead th, tr th, tr:first-child td");
            ths.forEach((th, idx) => {
                const txt = th.textContent.trim().toLowerCase();
                if (txt === "grade" || txt.includes("grade")) {
                    gradeColIdx = idx;
                }
            });

            const trs = table.querySelectorAll("tbody tr");
            const rows = trs.length > 0 ? trs : table.querySelectorAll("tr");
            rows.forEach(tr => {
                const cols = tr.querySelectorAll("td");
                if (cols.length < 7) return;

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
                        subject,
                        credit,
                        grade
                    });
                }
            });
        });

        return semesterData;
    }

    // --- Fast Sync via Stateless Relay ---
    async function executeFastSync(username, password, customRelayUrl = null) {
        const relayUrl = customRelayUrl || localStorage.getItem("ktu_custom_relay") || DEFAULT_RELAY_ENDPOINT;

        const isLocal = relayUrl.startsWith("http://localhost") || relayUrl.startsWith("http://127.0.0.1") || relayUrl.startsWith("/api/sync");
        const isHttps = relayUrl.startsWith("https://");
        if (!isLocal && !isHttps) {
            throw new Error("Security Error: Relay endpoint must use encrypted HTTPS to protect credentials.");
        }

        const response = await fetch(relayUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({ error: null }));
            const defaultMsg = response.status === 401 
                ? "Invalid KTU username or password. Please verify your portal credentials." 
                : `Sync failed (${response.status})`;
            throw new Error((errData && errData.error && errData.error.trim()) ? errData.error.trim() : defaultMsg);
        }

        const data = await response.json();
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
        const relayUrl = customRelayUrl || localStorage.getItem("ktu_custom_relay") || DEFAULT_RELAY_ENDPOINT;

        const isLocal = relayUrl.startsWith("http://localhost") || relayUrl.startsWith("http://127.0.0.1") || relayUrl.startsWith("/api/sync");
        const isHttps = relayUrl.startsWith("https://");
        if (!isLocal && !isHttps) {
            throw new Error("Security Error: Relay endpoint must use encrypted HTTPS to protect session tokens.");
        }

        const response = await fetch(relayUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username,
                sessionOnly: true,
                sessionCookies
            })
        });

        const data = await response.json().catch(() => ({ success: false, error: `Relay responded with status ${response.status}` }));
        if (!response.ok || !data.success || !data.html) {
            const err = new Error((data && data.error && data.error.trim()) ? data.error.trim() : "Session refresh failed.");
            err.sessionExpired = Boolean(data && data.sessionExpired);
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
        parseSemesterData
    };
})();
