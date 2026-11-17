/**
 * KTU Supercharger - Core DOM & HTML Parser
 * Dual-environment compatible: Browser window + Node.js test environment
 */

(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        const constants = require("./constants");
        module.exports = factory(constants);
    } else {
        root.KTU_PARSER = factory(root.KTU_CONSTANTS);
    }
})(typeof self !== "undefined" ? self : this, function (constants) {
    const { GP, BACKLOG_GRADES, AUDIT_GRADES, PENDING_GRADES } = constants;

    const GRADE_REGEX = /^(O|S|A\+|A|B\+|B|C\+|C|D|P|LP|F|FE|I|AB|ABSENT|PASS|FAIL|COMPLETED|AUDIT|SATISFACTORY)$/i;

    function parseStudentInfo(doc) {
        if (!doc) return {};
        const info = {
            name: "",
            registerNo: "",
            branch: "",
            admissionYear: "",
            college: "KTU",
            scheme: "",
            isLateral: false,
            activityPoints: null
        };

        // 1. Check prominent page title / header banner (e.g. "GOVIND S R(CEA20CS026) (COLLEGE OF ENGINEERING ATTINGAL)")
        const titleDiv = doc.querySelector(".page-header, .profile-title, h3, .panel-title, h4");
        if (titleDiv) {
            const rawTitle = (titleDiv.textContent || "").trim();
            // Disregard university portal header banners
            if (!/Technological\s*University|APJ\s*Abdul\s*Kalam/i.test(rawTitle)) {
                const regMatch = rawTitle.match(/\(([A-Z0-9]+)\)/i);
                if (regMatch) info.registerNo = regMatch[1].toUpperCase();

                const instMatch = rawTitle.match(/\((COLLEGE[^)]+|INSTITUTE[^)]+|[A-Z\s]+ENGINEERING[A-Z\s]*)\)/i);
                if (instMatch) info.college = instMatch[1].trim();

                const nameMatch = rawTitle.split("(")[0];
                if (nameMatch && nameMatch.trim() && !/Technological\s*University|APJ\s*Abdul/i.test(nameMatch)) {
                    info.name = nameMatch.trim();
                }
            }
        }

        // 2. Scan all list items, table labels, and form groups
        const listItems = doc.querySelectorAll(".list-group-item, li, .form-group, tr");
        listItems.forEach(item => {
            const text = (item.textContent || "").trim();
            if ((/Student\s*Name\s*:/i.test(text) || /Name\s*:/i.test(text)) && (!info.name || /Technological\s*University/i.test(info.name))) {
                const cand = text.split(/Student\s*Name\s*:|Name\s*:/i)[1]?.trim().split("\n")[0]?.trim();
                if (cand && !/Technological\s*University/i.test(cand)) {
                    info.name = cand;
                }
            }
            if ((/Register\s*No(\.|\s*:)/i.test(text) || /Roll\s*No(\.|\s*:)/i.test(text)) && !info.registerNo) {
                const match = text.match(/([A-Z0-9]{9,12})/i);
                if (match) info.registerNo = match[1].toUpperCase();
            }
            if (/Branch\s*:/i.test(text) || /Department\s*:/i.test(text) || /Admitted\s*Branch\s*:/i.test(text)) {
                const branchRaw = text.split(/(Admitted\s*Branch|Branch|Department)\s*:/i)[2] || text.split(/(Admitted\s*Branch|Branch|Department)\s*:/i)[1];
                const cand = branchRaw?.trim().split("\n")[0]?.trim();
                if (cand && !/^minor\s*branch$/i.test(cand)) {
                    info.branch = cand;
                }
            }
            if (/Admission\s*Year\s*:/i.test(text) || /Batch\s*:/i.test(text)) {
                const match = text.match(/\b(20\d{2})\b/);
                if (match) info.admissionYear = match[1];
            }
            if (/Activity\s*Points?\s*:/i.test(text)) {
                const match = text.match(/Activity\s*Points?\s*:\s*([\d\.]+)/i);
                if (match) info.activityPoints = parseFloat(match[1]);
            }
            if ((/Institution\s*:/i.test(text) || /College\s*:/i.test(text)) && info.college === "KTU") {
                const colRaw = text.split(/(Institution|College)\s*:/i)[2] || text.split(/(Institution|College)\s*:/i)[1];
                if (colRaw && !colRaw.includes("Technological University")) {
                    info.college = colRaw.trim().split("\n")[0]?.trim() || info.college;
                }
            }
        });

        // 3. Fallback: Check KTU's "Welcome <STUDENT NAME>" header greeting (e.g. on dashboard.htm)
        if (!info.name || /Technological\s*University/i.test(info.name)) {
            const welcomeEl = doc.querySelector ? doc.querySelector(".dropdown-user, .user-profile, .navbar-top-links, #user-profile, .welcome") : null;
            const welcomeText = (welcomeEl ? welcomeEl.textContent : "") || (doc.body ? doc.body.textContent : "");
            const wMatch = welcomeText.match(/Welcome\s+([A-Z\s\.]+?)(?:\s*\(|\s*Change|\s*Logout|\s*\||\n|\r|$)/i);
            if (wMatch && wMatch[1] && wMatch[1].trim().length > 2 && !/Technological/i.test(wMatch[1])) {
                info.name = wMatch[1].trim();
            }
        }

        // Register number fallback
        if (!info.registerNo) {
            const bodyText = doc.body ? doc.body.textContent || "" : "";
            const regMatch = bodyText.match(/\b([A-Z]{3,4}\d{2}[A-Z]{2,3}\d{3})\b/i);
            if (regMatch) info.registerNo = regMatch[1].toUpperCase();
        }

        // Detect Lateral Entry
        if (info.registerNo && /^L/i.test(info.registerNo)) {
            info.isLateral = true;
        }

        // Admission Year auto-derivation: decode 2-digit batch year from register number if missing (e.g. CEA20CS026 -> 2020)
        if (!info.admissionYear && info.registerNo) {
            const yearMatch = info.registerNo.match(/^(?:L)?[A-Z]{3,4}(\d{2})/i);
            if (yearMatch) {
                info.admissionYear = "20" + yearMatch[1];
            }
        }

        // Department auto-healing: if "Minor Branch" or missing, decode from register number
        if (!info.branch || /^minor\s*branch$/i.test(info.branch)) {
            info.branch = decodeBranchFromRegisterNo(info.registerNo) || info.branch;
        }

        // Scheme heuristic
        info.scheme = resolveScheme(info);

        return info;
    }

    function decodeBranchFromRegisterNo(regNo) {
        if (!regNo) return "";
        const m = regNo.match(/^(?:L)?(?:[A-Z]{3,4})?(\d{2})([A-Z]{2,3})(\d{3})$/i);
        if (!m) return "";
        const code = m[2].toUpperCase();
        const map = {
            "CS": "Computer Science & Engineering",
            "AD": "Artificial Intelligence & Data Science",
            "EC": "Electronics & Communication Engineering",
            "EE": "Electrical & Electronics Engineering",
            "ME": "Mechanical Engineering",
            "CE": "Civil Engineering",
            "IT": "Information Technology",
            "CH": "Chemical Engineering",
            "BM": "Biomedical Engineering",
            "RA": "Robotics & Automation"
        };
        return map[code] || code;
    }

    function resolveScheme(info) {
        if (info.admissionYear) {
            const yr = parseInt(info.admissionYear, 10);
            if (yr >= 2024) return "2024";
            if (yr >= 2019) return "2019";
            return "2015";
        }
        if (info.registerNo) {
            const m = info.registerNo.match(/^(?:L)?(?:[A-Z]{3,4})?(\d{2})/i);
            if (m) {
                const yr = parseInt(m[1], 10);
                if (yr >= 24) return "2024";
                if (yr >= 19) return "2019";
                return "2015";
            }
        }
        return "2019";
    }

    function parseSemesterData(doc) {
        if (!doc) return [];
        const semesterData = [];
        const semAccordions = doc.querySelectorAll("[id^='collapseFiveS'], [id*='collapseFiveS'], [id^='collapseFive'], [id^='collapseS'], .panel-collapse, .panel");

        semAccordions.forEach(accordion => {
            const id = accordion.id || "";
            let semNum = 0;
            const match = id.match(/collapseFiveS?(\d+)/i) || id.match(/collapseS?(\d+)/i) || id.match(/\bS(\d+)\b/i);
            if (match) {
                semNum = parseInt(match[1], 10);
            } else {
                const heading = accordion.querySelector(".panel-heading, .accordion-heading") || accordion.parentElement?.querySelector(".panel-heading, .accordion-heading");
                const hMatch = (heading?.textContent || "").match(/(?:Semester\s*|S\s*)(\d+)/i);
                if (hMatch) semNum = parseInt(hMatch[1], 10);
            }
            if (!semNum) return;

            const table = accordion.querySelector("table");
            if (!table) return;

            // Dynamic header inspection for Slot, Course, Credits, and Grade
            let slotColIdx = -1;
            let codeColIdx = -1;
            let nameColIdx = -1;
            let courseColIdx = -1;
            let creditColIdx = -1;
            let gradeColIdx = -1;

            const ths = table.querySelectorAll("thead th, tr th, tr:first-child th, tr:first-child td");
            ths.forEach((th, idx) => {
                const txt = (th.textContent || "").trim().toLowerCase();
                if (txt === "slot" || txt.includes("slot")) {
                    slotColIdx = idx;
                } else if (txt === "course code" || txt === "sub code" || txt === "subject code" || txt === "code") {
                    codeColIdx = idx;
                } else if (txt === "course name" || txt === "subject name" || txt === "sub name") {
                    nameColIdx = idx;
                } else if (txt === "course" || txt.includes("subject")) {
                    courseColIdx = idx;
                } else if (txt === "course credit" || txt === "credit" || txt.includes("credit")) {
                    if (!txt.includes("earned")) creditColIdx = idx;
                } else if (txt === "grade" || txt.includes("grade")) {
                    gradeColIdx = idx;
                }
            });

            const rows = table.querySelectorAll("tbody tr, tr:not(:first-child)");

            // If headers were not found, inspect the first row's cells to detect layout dynamically
            if (codeColIdx === -1 && courseColIdx === -1 && rows.length > 0) {
                const sampleCells = rows[0].querySelectorAll("td");
                if (sampleCells.length >= 3) {
                    const c0 = (sampleCells[0]?.textContent || "").trim();
                    const c1 = (sampleCells[1]?.textContent || "").trim();
                    if (/^[A-Z]{2,4}\s*\d{3}/i.test(c0)) {
                        // Case A: Col 0 is course code and Col 1 is course name
                        codeColIdx = 0;
                        nameColIdx = 1;
                        creditColIdx = 2;
                        gradeColIdx = sampleCells.length >= 4 ? 3 : -1;
                        slotColIdx = sampleCells.length >= 5 ? 4 : -1;
                    } else if (c1.includes(" - ") || /^[A-Z\d+]{1,3}$/i.test(c0)) {
                        // Case B: Col 1 has CODE - NAME or Col 0 is Slot
                        slotColIdx = 0;
                        courseColIdx = 1;
                        creditColIdx = 2;
                        gradeColIdx = sampleCells.length >= 8 ? 7 : 3;
                    }
                }
            }

            // Standard fallback indexes if still unresolved
            if (codeColIdx === -1 && courseColIdx === -1) courseColIdx = 1;
            if (slotColIdx === -1) slotColIdx = 0;
            if (creditColIdx === -1) creditColIdx = 2;
            if (gradeColIdx === -1) gradeColIdx = 7;

            rows.forEach(tr => {
                const cells = tr.querySelectorAll("td");
                if (cells.length < 3) return;

                let code = "";
                let name = "";
                if (codeColIdx >= 0 && nameColIdx >= 0) {
                    code = (cells[codeColIdx]?.textContent || "").trim().toUpperCase();
                    name = (cells[nameColIdx]?.textContent || "").trim();
                } else {
                    const rawCourse = (cells[courseColIdx >= 0 ? courseColIdx : 1]?.textContent || "").trim();
                    if (!rawCourse || /course\s*name/i.test(rawCourse)) return;

                    if (rawCourse.includes(" - ")) {
                        const parts = rawCourse.split(" - ");
                        code = parts[0].trim().toUpperCase();
                        name = parts.slice(1).join(" - ").trim();
                    } else if (rawCourse.includes("-")) {
                        const parts = rawCourse.split("-");
                        code = parts[0].trim().toUpperCase();
                        name = parts.slice(1).join("-").trim();
                    } else {
                        const m = rawCourse.match(/^([A-Z]{2,4}\s*\d{3}[A-Z]?)\s+(.*)$/i);
                        if (m) {
                            code = m[1].replace(/\s+/g, "").toUpperCase();
                            name = m[2].trim();
                        } else {
                            code = rawCourse.trim().toUpperCase();
                            name = rawCourse.trim();
                        }
                    }
                }

                if (!code || code === "COURSE CODE" || code === "SLOT") return;

                // Slot
                let slot = "";
                if (slotColIdx >= 0 && cells[slotColIdx]) {
                    const rawSlot = (cells[slotColIdx].textContent || "").trim().toUpperCase();
                    if (rawSlot && !/^[-–—\s]+$/.test(rawSlot) && !/^null$/i.test(rawSlot)) {
                        const m = rawSlot.match(/^(?:slot\s*[:\-]?\s*)?([A-Za-z0-9+]+)/i);
                        slot = m ? m[1].toUpperCase() : rawSlot;
                    }
                }

                // Credits
                const creditsRaw = (cells[creditColIdx >= 0 ? creditColIdx : 2]?.textContent || "").trim();
                const credits = parseFloat(creditsRaw) || 0;

                // Grade extraction (try gradeColIdx first, then scan from right)
                let gradeRaw = "";
                if (gradeColIdx >= 0 && cells[gradeColIdx]) {
                    gradeRaw = (cells[gradeColIdx].textContent || "").trim().toUpperCase();
                }

                if (!gradeRaw || !GRADE_REGEX.test(gradeRaw)) {
                    for (let i = cells.length - 1; i >= 0; i--) {
                        if (i === codeColIdx || i === nameColIdx || i === courseColIdx || i === slotColIdx || i === creditColIdx) continue;
                        const cand = (cells[i]?.textContent || "").trim().toUpperCase();
                        if (GRADE_REGEX.test(cand)) {
                            gradeRaw = cand;
                            break;
                        }
                    }
                }

                let grade = gradeRaw;
                if (!grade || grade === "-" || grade === "NULL") grade = "-";

                const isAudit = AUDIT_GRADES.has(grade);
                const isBacklog = BACKLOG_GRADES.has(grade);
                const isPending = PENDING_GRADES.has(grade);

                const subject = code && name && code !== name ? `${code} - ${name}` : (name || code);
                semesterData.push({
                    semester: `S${semNum}`,
                    semesterNum: semNum,
                    subject: subject,
                    code: code.toUpperCase(),
                    name: name || code,
                    credit: credits,
                    credits: credits,
                    grade,
                    slot: slot || "",
                    isAudit,
                    isBacklog,
                    isPending
                });
            });
        });

        // Deduplicate: Keep latest attempt if re-attempts exist
        const unique = [];
        const seen = new Set();
        for (let i = semesterData.length - 1; i >= 0; i--) {
            const item = semesterData[i];
            const key = `${item.semester}_${item.code}`;
            if (!seen.has(key)) {
                seen.add(key);
                unique.unshift(item);
            }
        }
        return unique;
    }

    function parseActivityPoints(doc) {
        if (!doc) return null;
        const panel = doc.querySelector("#collapseSix, [id*='collapseSix']");
        if (!panel) return null;

        const table = panel.querySelector("table");
        if (!table) return null;

        let totalPoints = 0;
        const rows = table.querySelectorAll("tr");
        rows.forEach(tr => {
            const text = tr.textContent || "";
            if (/Total|Obtained|Eligible/i.test(text)) {
                const nums = text.match(/\b\d+(\.\d+)?\b/g);
                if (nums && nums.length > 0) {
                    const candidate = parseFloat(nums[nums.length - 1]);
                    if (candidate > totalPoints) totalPoints = candidate;
                }
            }
        });
        return totalPoints > 0 ? totalPoints : null;
    }

    function parseFullDocument(doc) {
        const studentInfo = parseStudentInfo(doc);
        const semesterData = parseSemesterData(doc);
        const detailedActivities = parseActivityPoints(doc);

        if (detailedActivities !== null && studentInfo.activityPoints === null) {
            studentInfo.activityPoints = detailedActivities;
        }

        return {
            studentInfo,
            semesterData,
            totalCourses: semesterData.length,
            timestamp: new Date().toISOString()
        };
    }

    return {
        parseStudentInfo,
        parseSemesterData,
        parseActivityPoints,
        parseFullDocument,
        decodeBranchFromRegisterNo,
        resolveScheme
    };
});
