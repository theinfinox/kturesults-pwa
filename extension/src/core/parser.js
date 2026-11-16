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

        const listItems = doc.querySelectorAll(".list-group-item, li, .form-group");
        listItems.forEach(item => {
            const text = (item.textContent || "").trim();
            if (/Name\s*:/i.test(text)) {
                info.name = text.split(/Name\s*:/i)[1]?.trim().split("\n")[0]?.trim() || info.name;
            }
            if (/Register\s*No(\.|\s*:)/i.test(text) || /Roll\s*No(\.|\s*:)/i.test(text)) {
                const match = text.match(/([A-Z0-9]{9,12})/i);
                if (match) info.registerNo = match[1].toUpperCase();
            }
            if (/Branch\s*:/i.test(text) || /Department\s*:/i.test(text)) {
                const branchRaw = text.split(/(Branch|Department)\s*:/i)[2] || text.split(/(Branch|Department)\s*:/i)[1];
                info.branch = branchRaw?.trim().split("\n")[0]?.trim() || info.branch;
            }
            if (/Admission\s*Year\s*:/i.test(text) || /Batch\s*:/i.test(text)) {
                const match = text.match(/\b(20\d{2})\b/);
                if (match) info.admissionYear = match[1];
            }
            if (/Activity\s*Points?\s*:/i.test(text)) {
                const match = text.match(/Activity\s*Points?\s*:\s*([\d\.]+)/i);
                if (match) info.activityPoints = parseFloat(match[1]);
            }
            if (/Institution\s*:/i.test(text) || /College\s*:/i.test(text)) {
                const colRaw = text.split(/(Institution|College)\s*:/i)[2] || text.split(/(Institution|College)\s*:/i)[1];
                if (colRaw && !colRaw.includes("Technological University")) {
                    info.college = colRaw.trim().split("\n")[0]?.trim() || info.college;
                }
            }
        });

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
        const semAccordions = doc.querySelectorAll("[id^='collapseFiveS'], [id*='collapseFiveS'], [id^='collapseFive'], .panel-collapse");

        semAccordions.forEach(accordion => {
            const id = accordion.id || "";
            let semNum = 0;
            const match = id.match(/collapseFiveS?(\d+)/i);
            if (match) {
                semNum = parseInt(match[1], 10);
            } else {
                const heading = accordion.parentElement?.querySelector(".panel-heading, .accordion-heading");
                const hMatch = (heading?.textContent || "").match(/Semester\s*(\d+)/i);
                if (hMatch) semNum = parseInt(hMatch[1], 10);
            }
            if (!semNum) return;

            const table = accordion.querySelector("table");
            if (!table) return;

            const rows = table.querySelectorAll("tbody tr, tr:not(:first-child)");
            rows.forEach(tr => {
                const cells = tr.querySelectorAll("td");
                if (cells.length < 4) return;

                const code = (cells[0]?.textContent || "").trim();
                const name = (cells[1]?.textContent || "").trim();
                const creditsRaw = (cells[2]?.textContent || "").trim();
                const gradeRaw = (cells[3]?.textContent || "").trim().toUpperCase();

                if (!code || code.toLowerCase().includes("course code")) return;

                const credits = parseFloat(creditsRaw) || 0;
                let grade = gradeRaw;
                if (!grade || grade === "-" || grade === "NULL") grade = "-";

                const isAudit = AUDIT_GRADES.has(grade);
                const isBacklog = BACKLOG_GRADES.has(grade);
                const isPending = PENDING_GRADES.has(grade);

                semesterData.push({
                    semester: `S${semNum}`,
                    semesterNum: semNum,
                    code: code.toUpperCase(),
                    name: name || code,
                    credits,
                    grade,
                    slot: cells.length >= 5 ? (cells[4]?.textContent || "").trim() : "",
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
