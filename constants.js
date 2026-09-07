window.GP = {
    "S": 10,
    "O": 10,   // KTU 2015 Scheme (Outstanding)
    "A+": 9,
    "A": 8.5,
    "B+": 8,
    "B": 7.5,
    "C+": 7,
    "C": 6.5,
    "D": 6,
    "P": 5.5,
    "LP": 4,   // KTU Low Pass (4.0 points)
    "F": 0,
    "FE": 0,
    "AB": 0,
    "ABSENT": 0,
    "I": 0
};

// Official KTU Backlog Grades
window.BACKLOG_GRADES = new Set(["F", "FE", "AB", "ABSENT", "I"]);

// Helper: check if a grade is an audit, challenge course, or non-graded pass
window.isAuditPass = function(grade) {
    if (!grade) return false;
    const g = String(grade).trim().toLowerCase();
    return (
        g === "pass" ||
        g === "completed" ||
        g === "audit" ||
        g === "challenge" ||
        g === "ch" ||
        g === "satisfactory"
    );
};

// Helper: check if a grade result is truly unpublished or pending
window.isPendingResult = function(grade) {
    if (!grade) return true;
    const g = String(grade).trim().toLowerCase();
    return (
        g === "-" ||
        g === "null" ||
        g === "planned" ||
        g === "not yet generated" ||
        g.includes("not published") ||
        g.includes("withheld") ||
        g.includes("pending")
    );
};

// Helper: check if a grade is an audit, challenge course, or unpublished result (backward compatibility)
window.isUnpublishedOrAudit = function(grade) {
    return window.isAuditPass(grade) || window.isPendingResult(grade);
};

// Official KTU Standardized Percentage Conversion: Percentage = CGPA * 10
window.calculateEquivalentPercentage = function(cgpa) {
    const val = parseFloat(cgpa);
    if (isNaN(val) || val <= 0) return "0.00";
    return (val * 10).toFixed(2);
};

// Helper: check if grade represents an active backlog
window.isBacklogGrade = function(grade) {
    if (!grade) return false;
    return window.BACKLOG_GRADES.has(String(grade).trim().toUpperCase());
};

// CSS class for grade badges
window.getGradeClass = function(grade) {
    const g = String(grade || "").trim().toUpperCase();
    switch (g) {
        case "S":
        case "O":
            return "grade-S";
        case "A+":
            return "grade-Aplus";
        case "A":
            return "grade-A";
        case "B+":
            return "grade-Bplus";
        case "B":
            return "grade-B";
        case "C+":
        case "C":
        case "D":
        case "P":
        case "LP":
            return "grade-C";
        case "F":
        case "FE":
        case "AB":
        case "ABSENT":
        case "I":
            return "grade-F";
        default:
            return "";
    }
};

// Built-in Standard KTU Curriculum Presets
window.KTU_SCHEMES = {
    "2019_BTECH": {
        name: "KTU 2019 B.Tech Standard (160 Credits)",
        totalCredits: 160,
        semesters: {
            "Semester 1": 17,
            "Semester 2": 21,
            "Semester 3": 22,
            "Semester 4": 22,
            "Semester 5": 23,
            "Semester 6": 23,
            "Semester 7": 15,
            "Semester 8": 17
        }
    },
    "2019_BTECH_CSE": {
        name: "KTU 2019 B.Tech CSE (160 Credits)",
        totalCredits: 160,
        semesters: {
            "Semester 1": {
                totalCredits: 17,
                subjects: [
                    { code: "CS11", name: "Linear Algebra and Calculus", credit: 4 },
                    { code: "CS12", name: "Engineering Physics A / Engineering Chemistry", credit: 4 },
                    { code: "CS13", name: "Engineering Mechanics / Engineering Graphics", credit: 3 },
                    { code: "CS14", name: "Basics of Civil & Mechanical / Electrical & Electronics Engineering", credit: 4 },
                    { code: "CS15", name: "Engineering Physics Lab / Engineering Chemistry Lab", credit: 1 },
                    { code: "CS16", name: "Civil & Mechanical Workshop / Electrical & Electronics Workshop", credit: 1 }
                ]
            },
            "Semester 2": {
                totalCredits: 21,
                subjects: [
                    { code: "CS21", name: "Vector Calculus, Differential Equations and Transforms", credit: 4 },
                    { code: "CS22", name: "Engineering Physics A / Engineering Chemistry", credit: 4 },
                    { code: "CS23", name: "Engineering Mechanics / Engineering Graphics", credit: 4 },
                    { code: "CS24", name: "Basics of Civil & Mechanical / Electrical & Electronics Engineering", credit: 3 },
                    { code: "CS25", name: "Engineering Physics Lab / Engineering Chemistry Lab", credit: 1 },
                    { code: "CS26", name: "Civil & Mechanical Workshop / Electrical & Electronics Workshop", credit: 1 },
                    { code: "CS27", name: "Programming in C", credit: 4 }
                ]
            },
            "Semester 3": {
                totalCredits: 22,
                subjects: [
                    { code: "CS31", name: "Discrete Mathematical Structures", credit: 4 },
                    { code: "CS32", name: "Data Structures", credit: 4 },
                    { code: "CS33", name: "Logic System Design", credit: 4 },
                    { code: "CS34", name: "Object Oriented Programming using Java", credit: 4 },
                    { code: "CS35", name: "Design & Engineering / Professional Ethics", credit: 2 },
                    { code: "CS36", name: "Sustainable Engineering", credit: 0 },
                    { code: "CS37", name: "Data Structures Lab", credit: 2 },
                    { code: "CS38", name: "Object Oriented Programming Lab (in Java)", credit: 2 }
                ]
            },
            "Semester 4": {
                totalCredits: 22,
                subjects: [
                    { code: "CS41", name: "Graph Theory", credit: 4 },
                    { code: "CS42", name: "Computer Organization and Architecture", credit: 4 },
                    { code: "CS43", name: "Database Management Systems", credit: 4 },
                    { code: "CS44", name: "Operating Systems", credit: 4 },
                    { code: "CS45", name: "Design & Engineering / Professional Ethics", credit: 2 },
                    { code: "CS46", name: "Constitution of India", credit: 0 },
                    { code: "CS47", name: "Digital Lab", credit: 2 },
                    { code: "CS48", name: "Operating Systems Lab", credit: 2 }
                ]
            },
            "Semester 5": {
                totalCredits: 23,
                subjects: [
                    { code: "CS51", name: "Formal Languages and Automata Theory", credit: 4 },
                    { code: "CS52", name: "Computer Networks", credit: 4 },
                    { code: "CS53", name: "System Software", credit: 4 },
                    { code: "CS54", name: "Microprocessors and Microcontrollers", credit: 4 },
                    { code: "CS55", name: "Management of Software Systems", credit: 3 },
                    { code: "CS56", name: "Disaster Management", credit: 0 },
                    { code: "CS57", name: "System Software and Microprocessors Lab", credit: 2 },
                    { code: "CS58", name: "Database Management Systems Lab", credit: 2 }
                ]
            },
            "Semester 6": {
                totalCredits: 23,
                subjects: [
                    { code: "CS61", name: "Compiler Design", credit: 4 },
                    { code: "CS62", name: "Computer Graphics and Image Processing", credit: 4 },
                    { code: "CS63", name: "Algorithm Analysis and Design", credit: 4 },
                    { code: "CS64", name: "Program Elective I", credit: 3 },
                    { code: "CS65", name: "Industrial Economics & Foreign Trade", credit: 3 },
                    { code: "CS66", name: "Comprehensive Course Work", credit: 1 },
                    { code: "CS67", name: "Networking Lab", credit: 2 },
                    { code: "CS68", name: "Mini Project", credit: 2 }
                ]
            },
            "Semester 7": {
                totalCredits: 15,
                subjects: [
                    { code: "CS71", name: "Artificial Intelligence", credit: 3 },
                    { code: "CS72", name: "Program Elective II", credit: 3 },
                    { code: "CS73", name: "Open Elective", credit: 3 },
                    { code: "CS74", name: "Industrial Safety Engineering", credit: 0 },
                    { code: "CS75", name: "Compiler Lab", credit: 2 },
                    { code: "CS76", name: "Seminar", credit: 2 },
                    { code: "CS77", name: "Project Phase I", credit: 2 }
                ]
            },
            "Semester 8": {
                totalCredits: 17,
                subjects: [
                    { code: "CS81", name: "Distributed Computing", credit: 3 },
                    { code: "CS82", name: "Program Elective III", credit: 3 },
                    { code: "CS83", name: "Program Elective IV", credit: 3 },
                    { code: "CS84", name: "Program Elective V", credit: 3 },
                    { code: "CS85", name: "Comprehensive Course Viva", credit: 1 },
                    { code: "CS86", name: "Project Phase II", credit: 4 }
                ]
            }
        }
    },
    "2019_LATERAL": {
        name: "KTU 2019 Lateral Entry (122 Credits, S3–S8)",
        totalCredits: 122,
        semesters: {
            "Semester 3": 22,
            "Semester 4": 22,
            "Semester 5": 23,
            "Semester 6": 23,
            "Semester 7": 15,
            "Semester 8": 17
        }
    },
    "2015_BTECH": {
        name: "KTU 2015 B.Tech Scheme (180 Credits)",
        totalCredits: 180,
        semesters: {
            "Semester 1": 24,
            "Semester 2": 23,
            "Semester 3": 24,
            "Semester 4": 24,
            "Semester 5": 23,
            "Semester 6": 23,
            "Semester 7": 22,
            "Semester 8": 17
        }
    },
    "2024_LATERAL": {
        name: "KTU 2024 Lateral Entry (126 Credits, S3–S8)",
        totalCredits: 126,
        semesters: {
            "Semester 3": 25,
            "Semester 4": 24,
            "Semester 5": 23,
            "Semester 6": 23,
            "Semester 7": 17,
            "Semester 8": 14
        }
    },
    "2024_BTECH_CSE": {
        name: "KTU 2024 B.Tech CSE (167 Credits)",
        totalCredits: 167,
        semesters: {
            "Semester 1": {
                totalCredits: 20,
                subjects: [
                    { code: "GAMAT101", name: "Mathematics for Information Science-1", credit: 3 },
                    { code: "GAPHT102", name: "Physics for Information Science / Chemistry for Information Science", credit: 4 },
                    { code: "GAEST103", name: "Engineering Graphics and Computer Aided Drawing", credit: 3 },
                    { code: "GAEST104", name: "Introduction to Electrical & Electronics Engineering", credit: 4 },
                    { code: "UCEST105", name: "Algorithmic Thinking with Python", credit: 4 },
                    { code: "GAESL106", name: "Basic Electrical and Electronics Engineering Workshop", credit: 1 },
                    { code: "UCHUL107", name: "Health and Wellness / Life Skills and Professional Communication", credit: 1 }
                ]
            },
            "Semester 2": {
                totalCredits: 24,
                subjects: [
                    { code: "GAMAT201", name: "Mathematics for Information Science-2", credit: 3 },
                    { code: "GAPHT202", name: "Physics for Information Science / Chemistry for Information Science", credit: 4 },
                    { code: "PCCST203", name: "Foundations of Computing: From Hardware Essentials to Web Design", credit: 3 },
                    { code: "UCEST204", name: "Programming in C", credit: 4 },
                    { code: "GAMAT205", name: "Discrete Mathematics", credit: 4 },
                    { code: "UCHUT206", name: "Engineering Entrepreneurship & IPR", credit: 3 },
                    { code: "UCHUL207", name: "Health and Wellness / Life Skills and Professional Communication", credit: 1 },
                    { code: "PCCSL208", name: "IT Workshop", credit: 1 },
                    { code: "UDEST209", name: "Skill Enhancement Course: Digital 101", credit: 1 }
                ]
            },
            "Semester 3": {
                totalCredits: 25,
                subjects: [
                    { code: "GAMAT301", name: "Mathematics for Information Science-3", credit: 3 },
                    { code: "PCCST302", name: "Theory of Computation", credit: 4 },
                    { code: "PCCST303", name: "Data Structures and Algorithms", credit: 4 },
                    { code: "PBCST304", name: "Object Oriented Programming", credit: 4 },
                    { code: "GAEST305", name: "Digital Electronics & Logic Design", credit: 4 },
                    { code: "UCHUT346", name: "Economics for Engineers / Engineering Ethics and Sustainable Development", credit: 2 },
                    { code: "PCCSL307", name: "Data Structures Lab", credit: 2 },
                    { code: "PCCSL308", name: "Digital Lab", credit: 2 }
                ]
            },
            "Semester 4": {
                totalCredits: 24,
                subjects: [
                    { code: "GAMAT401", name: "Mathematics for Information Science-4", credit: 3 },
                    { code: "PCCST402", name: "Database Management Systems", credit: 4 },
                    { code: "PCCST403", name: "Operating Systems", credit: 4 },
                    { code: "PBCST404", name: "Computer Organization and Architecture", credit: 4 },
                    { code: "PECST411", name: "Program Elective 1", credit: 3 },
                    { code: "UCHUT446", name: "Economics for Engineers / Engineering Ethics and Sustainable Development", credit: 2 },
                    { code: "PCCSL407", name: "Operating Systems Lab", credit: 2 },
                    { code: "PCCSL408", name: "DBMS Lab", credit: 2 }
                ]
            },
            "Semester 5": {
                totalCredits: 23,
                subjects: [
                    { code: "PCCST501", name: "Computer Networks", credit: 4 },
                    { code: "PCCST502", name: "Design and Analysis of Algorithms", credit: 4 },
                    { code: "PCCST503", name: "Machine Learning", credit: 3 },
                    { code: "PBCST504", name: "Microcontrollers", credit: 4 },
                    { code: "PECST511", name: "Program Elective 2", credit: 3 },
                    { code: "UCOMT548", name: "Constitution Of India (MOOC)", credit: 1 },
                    { code: "PCCSL507", name: "Networks Lab", credit: 2 },
                    { code: "PCCSL508", name: "Machine Learning Lab", credit: 2 }
                ]
            },
            "Semester 6": {
                totalCredits: 23,
                subjects: [
                    { code: "PCCST601", name: "Compiler Design", credit: 4 },
                    { code: "PCCST602", name: "Advanced Computing Systems", credit: 3 },
                    { code: "PECST611", name: "Program Elective 3", credit: 3 },
                    { code: "PCCST604", name: "Fundamentals of Cyber Security", credit: 4 },
                    { code: "UDEST646", name: "Design Thinking and Product Development", credit: 2 },
                    { code: "UOEST651", name: "Open Elective/Interdisciplinary Learning Elective 1", credit: 3 },
                    { code: "PCCSL607", name: "Systems Lab", credit: 2 },
                    { code: "PROJT608", name: "Mini Project: Socially Relevant Project", credit: 2 }
                ]
            },
            "Semester 7": {
                totalCredits: 17,
                subjects: [
                    { code: "PECST711", name: "Program Elective 4", credit: 3 },
                    { code: "PECST721", name: "Program Elective 5", credit: 3 },
                    { code: "UOEST751", name: "Open Elective/Interdisciplinary Learning Elective 2", credit: 3 },
                    { code: "UOEST761", name: "Elective", credit: 2 },
                    { code: "SEMNT706", name: "Seminar", credit: 2 },
                    { code: "PROJT707", name: "Option 1: Major Project / Option 2: Internship", credit: 4 }
                ]
            },
            "Semester 8": {
                totalCredits: 11,
                subjects: [
                    { code: "PECST811", name: "Program Elective 6", credit: 3 },
                    { code: "UOEST851", name: "Open Elective/Interdisciplinary Learning Elective 3", credit: 3 },
                    { code: "UCHUT846", name: "Organizational Behavior and Business Communication", credit: 1 },
                    { code: "PROJT804", name: "Option 1: Major Project / Option 2: Internship / Option 3: Major Project Phase -II", credit: 4 }
                ]
            }
        }
    }
};

// Normalize and validate custom or preset future curriculum JSON
window.normalizeFutureCurriculum = function(input) {
    if (!input) return null;
    let parsed = input;
    if (typeof input === "string") {
        try {
            parsed = JSON.parse(input);
        } catch (e) {
            if (window.KTU_SCHEMES && window.KTU_SCHEMES[input]) {
                return window.KTU_SCHEMES[input];
            }
            return null;
        }
    }
    if (parsed.preset && window.KTU_SCHEMES && window.KTU_SCHEMES[parsed.preset]) {
        return window.KTU_SCHEMES[parsed.preset];
    }
    if (parsed.scheme && window.KTU_SCHEMES && window.KTU_SCHEMES[parsed.scheme]) {
        return window.KTU_SCHEMES[parsed.scheme];
    }

    // Support Array of course objects [{ i, c, d, n, s }, ...] from external/uploaded JSON
    if (Array.isArray(parsed)) {
        const semMap = {};
        let totalCr = 0;
        parsed.forEach(course => {
            const semNum = Number(course.s || course.sem || course.semester) || 1;
            const semKey = `Semester ${semNum}`;
            if (!semMap[semKey]) {
                semMap[semKey] = {
                    totalCredits: 0,
                    subjects: []
                };
            }
            const cr = Number(course.c ?? course.credit ?? 0);
            semMap[semKey].totalCredits += cr;
            totalCr += cr;
            semMap[semKey].subjects.push({
                code: course.i || course.code || `C${semNum}`,
                name: course.n || course.name || "Planned Course",
                credit: cr
            });
        });
        return {
            name: "Custom Curriculum Array",
            totalCredits: totalCr,
            semesters: semMap
        };
    }

    return parsed;
};

// Robust Multi-Signal Fuzzy Resolver: auto-identifies KTU scheme & branch from metadata, register number, and course fingerprints
window.resolveKTUSchemeAndBranch = function(studentInfo, semesterData = null) {
    if (!studentInfo && (!semesterData || !semesterData.length)) return null;

    let scheme = null;
    let branchCode = null;
    let isLateral = false;

    // Scoring accumulators for fuzzy resolution
    let score2024 = 0;
    let score2019 = 0;
    let score2015 = 0;
    let scoreCSE = 0;
    let scoreAD = 0;
    let scoreEC = 0;
    let scoreEE = 0;
    let scoreME = 0;
    let scoreCE = 0;
    let scoreIT = 0;

    // -------------------------------------------------------------
    // SIGNAL 1: Register Number (Highest Direct Signal: e.g. TVE24CS042, LTVE21CS005)
    // -------------------------------------------------------------
    const regNo = String(studentInfo?.registerNo || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const regMatch = regNo.match(/^(L)?([A-Z]{3,4})?(\d{2})([A-Z]{2,3})(\d{3})$/);
    if (regMatch) {
        if (regMatch[1]) isLateral = true;
        const yr = parseInt(regMatch[3], 10);
        const admissionYear = yr >= 50 ? 1900 + yr : 2000 + yr;
        branchCode = regMatch[4];

        if (admissionYear >= 2024) {
            score2024 += 15;
        } else if (admissionYear <= 2018) {
            score2015 += 15;
        } else {
            score2019 += 15;
        }

        if (branchCode === "CS" || branchCode === "CSE") scoreCSE += 15;
        else if (branchCode === "AD" || branchCode === "AI") scoreAD += 15;
        else if (branchCode === "EC" || branchCode === "ECE") scoreEC += 15;
        else if (branchCode === "EE" || branchCode === "EEE") scoreEE += 15;
        else if (branchCode === "ME") scoreME += 15;
        else if (branchCode === "CE") scoreCE += 15;
        else if (branchCode === "IT") scoreIT += 15;
    }

    // -------------------------------------------------------------
    // SIGNAL 2: Profile / DOM Table Text Fuzzy Matching
    // -------------------------------------------------------------
    const yrText = String(studentInfo?.admissionYear || studentInfo?.scheme || "").trim();
    const yrMatch = yrText.match(/(20\d{2})/);
    if (yrMatch) {
        const yr = parseInt(yrMatch[1], 10);
        if (yr >= 2024) score2024 += 10;
        else if (yr <= 2018) score2015 += 10;
        else score2019 += 10;
    } else if (/2024|24\s*batch/i.test(yrText)) {
        score2024 += 10;
    } else if (/2019|19\s*batch/i.test(yrText)) {
        score2019 += 10;
    }

    let branchText = String(studentInfo?.branch || studentInfo?.program || "")
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9 ]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    // If branchText is generic or invalid like "minor branch", decode from KTU register number
    if (!branchText || /^minor\s*branch$/i.test(branchText) || branchText === "none") {
        const reg = String(studentInfo?.registerNo || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
        const regMatch = reg.match(/^(?:L)?(?:[A-Z]{3,4})?(\d{2})([A-Z]{2,3})(\d{3})$/);
        if (regMatch) {
            const bCode = regMatch[2];
            if (bCode === "CS" || bCode === "CSE") branchText = "computer science and engineering cse";
            else if (bCode === "AD" || bCode === "AI") branchText = "artificial intelligence and data science ad";
            else if (bCode === "EC" || bCode === "ECE") branchText = "electronics and communication ec";
            else if (bCode === "EE" || bCode === "EEE") branchText = "electrical and electronics ee";
            else if (bCode === "ME") branchText = "mechanical engineering me";
            else if (bCode === "CE") branchText = "civil engineering ce";
            else if (bCode === "IT") branchText = "information technology it";
        }
    }

    if (branchText.includes("computer science") || branchText.includes("comp sci") || branchText.includes("cse") || /\bcs\b/.test(branchText)) {
        scoreCSE += 10;
    } else if (branchText.includes("artificial intelligence") || branchText.includes("data science") || branchText.includes("ai and ds") || /\bad\b/.test(branchText)) {
        scoreAD += 10;
    } else if (branchText.includes("electronics") && (branchText.includes("communication") || /\bec\b/.test(branchText))) {
        scoreEC += 10;
    } else if (branchText.includes("electrical") && (branchText.includes("electronics") || /\bee\b/.test(branchText))) {
        scoreEE += 10;
    } else if (branchText.includes("mechanical") || /\bme\b/.test(branchText)) {
        scoreME += 10;
    } else if (branchText.includes("civil") || /\bce\b/.test(branchText)) {
        scoreCE += 10;
    } else if (branchText.includes("information technology") || /\bit\b/.test(branchText)) {
        scoreIT += 10;
    }

    // -------------------------------------------------------------
    // SIGNAL 3: Course Code & Curriculum Fingerprints (from semesterData)
    // -------------------------------------------------------------
    if (Array.isArray(semesterData) && semesterData.length > 0) {
        let hasS1Courses = false;
        let hasS2Courses = false;
        let hasS3PlusCourses = false;

        semesterData.forEach(sub => {
            const rawSub = String(sub.subject || "").toUpperCase();
            const semStr = String(sub.semester || "").toLowerCase();

            if (semStr.includes("1") || semStr === "s1") hasS1Courses = true;
            if (semStr.includes("2") || semStr === "s2") hasS2Courses = true;
            if (/3|4|5|6|7|8/.test(semStr)) hasS3PlusCourses = true;

            // 2024 Scheme 5-Letter Prefix Match (GA, UC, PC, PB, PE, UD, UO, SE, PR)
            if (/\b(?:GA|UC|PC|PB|PE|UD|UO|SE|PR)[A-Z]{3}\d{3}\b/.test(rawSub)) {
                score2024 += 4;
            }

            // 2024 Scheme CSE specific course code prefixes & names
            if (/\b(?:PC|PB|PE)CS[TL]\d{3}\b/.test(rawSub)) {
                score2024 += 6;
                scoreCSE += 8;
            }
            if (rawSub.includes("ALGORITHMIC THINKING WITH PYTHON") || rawSub.includes("MATHEMATICS FOR INFORMATION SCIENCE")) {
                score2024 += 5;
                scoreCSE += 5;
            }
            if (rawSub.includes("FOUNDATIONS OF COMPUTING") || rawSub.includes("THEORY OF COMPUTATION") || rawSub.includes("DATA STRUCTURES AND ALGORITHMS")) {
                scoreCSE += 6;
            }

            // 2019 Scheme 3-Letter Prefix Match: CST, CSL, MAT, CYT, PHT, EST, HUT
            if (/\b(?:CS[TL]|IT[TL]|EC[TL]|EE[TL]|ME[TL]|CE[TL]|MA[TT]|CY[TT]|PH[TT]|ES[TL]|HU[TT])\d{3}\b/.test(rawSub)) {
                score2019 += 3;
            }
            if (/\bCS[TL]\d{3}\b/.test(rawSub)) {
                score2019 += 4;
                scoreCSE += 6;
            }
            if (rawSub.includes("DISCRETE MATHEMATICAL STRUCTURES") || rawSub.includes("OBJECT ORIENTED PROGRAMMING USING JAVA")) {
                score2019 += 4;
                scoreCSE += 6;
            }

            // 2015 Scheme Match
            if (/\b[A-Z]{2}\d{3}\b/.test(rawSub)) {
                score2015 += 2;
            }
        });

        // Lateral Entry Detection: Student has S3+ courses but no S1 or S2 records
        if (!hasS1Courses && !hasS2Courses && hasS3PlusCourses) {
            isLateral = true;
        } else if (hasS1Courses || hasS2Courses) {
            isLateral = false;
        }
    }

    // -------------------------------------------------------------
    // DECISION SYNTHESIS
    // -------------------------------------------------------------
    if (score2024 >= score2019 && score2024 >= score2015 && score2024 > 0) {
        scheme = isLateral ? "2024_LATERAL" : "2024";
    } else if (score2015 > score2019 && score2015 > score2024) {
        scheme = "2015";
    } else if (score2019 > 0) {
        scheme = isLateral ? "2019_LATERAL" : "2019";
    } else {
        scheme = isLateral ? "2019_LATERAL" : "2019";
    }

    // Determine branch key
    let branchKey = null;
    const maxBranchScore = Math.max(scoreCSE, scoreAD, scoreEC, scoreEE, scoreME, scoreCE, scoreIT);
    if (maxBranchScore > 0) {
        if (maxBranchScore === scoreCSE) branchKey = "computer-science-engineering";
        else if (maxBranchScore === scoreAD) branchKey = "artificial-intelligence-data-science";
        else if (maxBranchScore === scoreEC) branchKey = "electronics-communication-engineering";
        else if (maxBranchScore === scoreEE) branchKey = "electrical-electronics-engineering";
        else if (maxBranchScore === scoreME) branchKey = "mechanical-engineering";
        else if (maxBranchScore === scoreCE) branchKey = "civil-engineering";
        else if (maxBranchScore === scoreIT) branchKey = "information-technology";
    }

    // Resolve to recommended preset
    let recommendedPreset = null;
    let presetLabel = null;

    if (scheme === "2024_LATERAL" || (scheme === "2024" && isLateral)) {
        recommendedPreset = "2024_LATERAL";
        presetLabel = "KTU 2024 Lateral Entry (126 Credits)";
    } else if (scheme === "2024" && branchKey === "computer-science-engineering") {
        recommendedPreset = "2024_BTECH_CSE";
        presetLabel = "KTU 2024 B.Tech CSE (167 Credits)";
    } else if (scheme === "2024") {
        // Default 2024 recommendation is CSE
        recommendedPreset = "2024_BTECH_CSE";
        presetLabel = "KTU 2024 B.Tech CSE (167 Credits)";
    } else if (scheme === "2019_LATERAL" || (scheme === "2019" && isLateral)) {
        recommendedPreset = "2019_LATERAL";
        presetLabel = "KTU 2019 Lateral Entry (122 Credits)";
    } else if (scheme === "2019" && branchKey === "computer-science-engineering") {
        recommendedPreset = "2019_BTECH_CSE";
        presetLabel = "KTU 2019 B.Tech CSE (160 Credits)";
    } else if (scheme === "2019" || (!scheme && branchKey)) {
        recommendedPreset = "2019_BTECH";
        presetLabel = "KTU 2019 B.Tech Standard (160 Credits)";
    } else if (scheme === "2015") {
        recommendedPreset = "2015_BTECH";
        presetLabel = "KTU 2015 B.Tech Scheme (180 Credits)";
    }

    return {
        scheme,
        branchKey,
        branchCode,
        isLateral,
        recommendedPreset,
        presetLabel,
        detectionSource: (score2024 > 0 || score2019 > 0) ? "fuzzy_multi_signal" : "default"
    };
};

// Centralized Normalizer: Resolves Name, KTU ID (University Code), Department, Year, and Scheme with resilient fallbacks
window.getNormalizedStudentProfile = function(studentInfo = {}, semesterData = [], metrics = null) {
    const info = studentInfo || {};
    
    // 1. Name
    const name = String(info.name || "").trim() || "KTU Student";

    // 2. University Code / KTU ID (Register Number)
    const ktuId = String(info.registerNo || "").trim() || "N/A";

    // 3. Register Number Decoding for Year and Branch fallbacks
    let decodedYear = null;
    let decodedBranch = null;
    if (ktuId && ktuId !== "N/A") {
        const clean = ktuId.toUpperCase().replace(/[^A-Z0-9]/g, "");
        const match = clean.match(/^(L)?([A-Z]{3,4})?(\d{2})([A-Z]{2,3})(\d{3})$/);
        if (match) {
            const yr = parseInt(match[3], 10);
            decodedYear = yr >= 50 ? String(1900 + yr) : String(2000 + yr);
            const bCode = match[4];
            if (bCode === "CS" || bCode === "CSE") decodedBranch = "Computer Science & Engineering";
            else if (bCode === "AD" || bCode === "AI") decodedBranch = "Artificial Intelligence & Data Science";
            else if (bCode === "EC" || bCode === "ECE") decodedBranch = "Electronics & Communication Engineering";
            else if (bCode === "EE" || bCode === "EEE") decodedBranch = "Electrical & Electronics Engineering";
            else if (bCode === "ME") decodedBranch = "Mechanical Engineering";
            else if (bCode === "CE") decodedBranch = "Civil Engineering";
            else if (bCode === "IT") decodedBranch = "Information Technology";
        }
    }

    // 4. Year (Admission Year / Batch)
    let rawYear = String(info.admissionYear || decodedYear || "").trim();
    if (!rawYear && info.scheme) {
        const m = String(info.scheme).match(/\b(20\d{2})\b/);
        if (m) rawYear = m[1];
    }
    const year = rawYear ? `${rawYear} Batch` : "KTU Batch";

    // 5. Department (Dept / Branch)
    // Filter out invalid KTU portal placeholder strings like "Minor Branch", "None", etc.
    const isInvalidBranch = !info.branch || 
        /^minor\s*(branch|stream|program)?$/i.test(String(info.branch).trim()) ||
        /^none$/i.test(String(info.branch).trim());

    let dept = (!isInvalidBranch ? String(info.branch).trim() : "") || decodedBranch || "";
    if ((!dept || /^minor\s*branch$/i.test(dept)) && window.resolveKTUSchemeAndBranch) {
        const resolved = window.resolveKTUSchemeAndBranch(info, semesterData);
        if (resolved && resolved.branchKey) {
            dept = resolved.branchKey.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
        }
    }
    if (!dept || /^minor\s*branch$/i.test(dept)) dept = "Computer Science & Engineering";

    // Optional Minor Discipline (if student has registered for a separate minor degree)
    let minorDept = null;
    if (info.minorBranch && !/^none$/i.test(info.minorBranch) && !/^minor\s*branch$/i.test(info.minorBranch)) {
        minorDept = String(info.minorBranch).trim();
    }

    // 6. Scheme (Curriculum Regulations: 2024, 2019, etc.)
    let scheme = String(info.scheme || "").trim();
    if (!scheme && metrics && metrics.curriculumPresetName) {
        scheme = metrics.curriculumPresetName;
    } else if (!scheme && window.resolveKTUSchemeAndBranch) {
        const resolved = window.resolveKTUSchemeAndBranch(info, semesterData);
        if (resolved && resolved.presetLabel) {
            scheme = resolved.presetLabel;
        } else if (resolved && resolved.scheme) {
            scheme = `KTU ${resolved.scheme} Scheme`;
        }
    }
    if (!scheme) scheme = "KTU Curriculum Scheme";

    // 7. Institution
    const institution = String(info.institution || "").trim() || "APJ Abdul Kalam Technological University";

    return {
        name,
        ktuId,
        dept,
        minorDept,
        year,
        rawYear,
        scheme,
        institution
    };
};

// Centralized Academic Calculation Engine (3-Level Architecture)
window.calculateAcademicMetrics = function(semesterData, futureCurriculumInput = null) {
    if (!semesterData || !Array.isArray(semesterData) || semesterData.length === 0) {
        return null;
    }

    const GP = window.GP;
    const grouped = {};

    let totalActualCredits = 0;
    let totalEarnedCredits = 0;
    let totalActualPoints = 0;
    let totalBacklogCredits = 0;
    let totalBacklogCount = 0;

    semesterData.forEach(sub => {
        const sem = sub.semester || "S1";
        if (!grouped[sem]) grouped[sem] = [];
        grouped[sem].push(sub);
    });

    const sortedSemesters = Object.keys(grouped).sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, ""), 10) || 0;
        const numB = parseInt(b.replace(/\D/g, ""), 10) || 0;
        return numA - numB;
    });

    const semesterResults = sortedSemesters.map(sem => {
        const subjects = grouped[sem];
        let semGradedCredits = 0;
        let semEarnedCredits = 0;
        let semPoints = 0;
        let semTotalCredits = 0;
        let backlogs = 0;
        let passed = 0;
        let pending = 0;

        subjects.forEach(sub => {
            const credit = Number(sub.credit) || 0;
            const grade = String(sub.grade || "").trim();
            semTotalCredits += credit;

            // 1. Truly Unpublished or Pending results
            if (window.isPendingResult(grade)) {
                pending++;
                return;
            }

            // 2. Audit / Non-graded passed courses (e.g. Health & Wellness, Life Skills, MOOCs)
            if (window.isAuditPass(grade)) {
                passed++;
                if (credit > 0) {
                    semEarnedCredits += credit;
                    totalEarnedCredits += credit;
                }
                // Audit passes do NOT contribute to SGPA/CGPA graded points or graded credit divisor
                return;
            }

            // 3. Graded courses
            const isBacklog = window.isBacklogGrade(grade);
            if (isBacklog) {
                backlogs++;
                totalBacklogCount++;
                totalBacklogCredits += credit;
            } else {
                passed++;
                if (credit > 0) {
                    semEarnedCredits += credit;
                    totalEarnedCredits += credit;
                }
            }

            if (credit > 0) {
                const gp = GP[grade.toUpperCase()] ?? 0;
                semGradedCredits += credit;
                semPoints += gp * credit;

                totalActualCredits += credit;
                totalActualPoints += gp * credit;
            }
        });

        const sgpa = semGradedCredits > 0 
            ? (semPoints / semGradedCredits).toFixed(2) 
            : "0.00";

        return {
            semester: sem,
            subjects,
            totalCredits: semTotalCredits > 0 ? semTotalCredits : semGradedCredits,
            gradedCredits: semGradedCredits,
            earnedCredits: semEarnedCredits,
            sgpaPoints: semPoints,
            sgpa,
            passed,
            backlogs,
            pending
        };
    });

    const currentCGPA = totalActualCredits > 0 
        ? (totalActualPoints / totalActualCredits).toFixed(2) 
        : "0.00";

    // Comeback projections on completed semesters: clearing backlogs with target GP
    const calcProjection = (targetGP) => {
        if (totalActualCredits === 0) return "0.00";
        const projectedPoints = totalActualPoints + (totalBacklogCredits * targetGP);
        return (projectedPoints / totalActualCredits).toFixed(2);
    };

    const projections = {
        minP: calcProjection(5.5),
        maxD: calcProjection(6.0),
        maxC: calcProjection(6.5),
        maxCPlus: calcProjection(7.0),
        maxB: calcProjection(7.5),
        maxBPlus: calcProjection(8.0),
        maxA: calcProjection(8.5),
        maxAPlus: calcProjection(9.0),
        maxS: calcProjection(10.0)
    };

    // -------------------------------------------------------------
    // 3-LEVEL ARCHITECTURE DETERMINATION
    // -------------------------------------------------------------
    // A semester is considered truly completed only if it has graded credits, passed courses, or backlogs
    const completedSemNums = semesterResults
        .filter(r => (r.gradedCredits > 0 || r.passed > 0 || r.backlogs > 0))
        .map(r => parseInt(String(r.semester).replace(/\D/g, ""), 10) || 0)
        .filter(n => n > 0);
    const maxCompletedSemNum = completedSemNums.length > 0 ? Math.max(...completedSemNums) : 0;
    const isFullDegree = completedSemNums.length >= 8 || maxCompletedSemNum >= 8;

    let level = 3;
    let levelName = "Completed Actuals";
    let graduationForecast = null;
    let futureSemesters = [];

    if (isFullDegree) {
        // LEVEL 1: Full degree completed data available from portal
        level = 1;
        levelName = "Full Degree Record";
    } else {
        // Check for Future Curriculum Input (LEVEL 2 candidate)
        const futureCurriculum = window.normalizeFutureCurriculum(futureCurriculumInput);
        if (futureCurriculum) {
            let futureSemMap = {};

            if (futureCurriculum.semesters && typeof futureCurriculum.semesters === "object") {
                futureSemMap = futureCurriculum.semesters;
            } else if (futureCurriculum.futureSemesters && Array.isArray(futureCurriculum.futureSemesters)) {
                futureCurriculum.futureSemesters.forEach(item => {
                    const name = item.semester || `Semester ${item.sem || ""}`;
                    futureSemMap[name] = item;
                });
            } else if (futureCurriculum.remainingSemesterCredits && typeof futureCurriculum.remainingSemesterCredits === "object") {
                futureSemMap = futureCurriculum.remainingSemesterCredits;
            } else if (typeof futureCurriculum === "object") {
                // Shorthand { S6: 23, S7: 16, S8: 16 }
                futureSemMap = futureCurriculum;
            }

            let totalFutureCredits = 0;

            Object.entries(futureSemMap).forEach(([semKey, semVal]) => {
                const semNum = parseInt(String(semKey).replace(/\D/g, ""), 10) || 0;
                // Only include semesters that have not yet been completed in portal data
                if (semNum > maxCompletedSemNum || !completedSemNums.includes(semNum)) {
                    let credits = 0;
                    let subjects = [];

                    if (typeof semVal === "number") {
                        credits = semVal;
                        subjects = [{
                            subject: `CURR-S${semNum} - Planned Curriculum Courses`,
                            credit: credits,
                            grade: "Planned"
                        }];
                    } else if (typeof semVal === "object" && semVal !== null) {
                        credits = Number(semVal.totalCredits) || 0;
                        if (Array.isArray(semVal.subjects)) {
                            subjects = semVal.subjects.map(s => ({
                                subject: `${s.code ? s.code + ' - ' : ''}${s.name || 'Planned Course'}`,
                                credit: Number(s.credit) || 0,
                                grade: "Planned"
                            }));
                            if (credits === 0) {
                                credits = subjects.reduce((sum, s) => sum + s.credit, 0);
                            }
                        } else {
                            subjects = [{
                                subject: `CURR-S${semNum} - Planned Curriculum Courses`,
                                credit: credits,
                                grade: "Planned"
                            }];
                        }
                    }

                    if (credits > 0) {
                        totalFutureCredits += credits;
                        futureSemesters.push({
                            semester: semKey.startsWith("Semester") ? semKey : `Semester ${semNum}`,
                            isProjected: true,
                            totalCredits: credits,
                            earnedCredits: 0,
                            sgpa: "Forecast",
                            subjects,
                            passed: 0,
                            backlogs: 0,
                            pending: subjects.length
                        });
                    }
                }
            });

            if (totalFutureCredits > 0) {
                level = 2;
                levelName = "Hybrid Forecast";

                const totalDegreeCredits = totalActualCredits + totalFutureCredits;
                const totalOpportunityCredits = totalFutureCredits + totalBacklogCredits;

                const calcGradForecast = (targetGP) => {
                    if (totalDegreeCredits === 0) return "0.00";
                    const points = totalActualPoints + (totalOpportunityCredits * targetGP);
                    return (points / totalDegreeCredits).toFixed(2);
                };

                const calcReqFutureSGPA = (targetCGPA) => {
                    if (totalOpportunityCredits <= 0) return null;
                    const requiredPoints = (targetCGPA * totalDegreeCredits) - totalActualPoints;
                    const neededAvg = requiredPoints / totalOpportunityCredits;
                    
                    if (requiredPoints <= 0) return "Achieved";

                    // In KTU, the lowest passing grade is P (5.50 points).
                    // If passing all remaining courses at minimum grade P already reaches or surpasses targetCGPA:
                    const minPassingPoints = totalOpportunityCredits * 5.5;
                    if (requiredPoints <= minPassingPoints) {
                        const minPassCGPA = (totalActualPoints + minPassingPoints) / totalDegreeCredits;
                        return `Secured (Min Pass => ${minPassCGPA.toFixed(2)})`;
                    }

                    if (neededAvg > 10.0) return "Unachievable (> 10.0)";
                    return neededAvg.toFixed(2);
                };

                graduationForecast = {
                    totalDegreeCredits,
                    totalFutureCredits,
                    maxGraduationCGPA: calcGradForecast(10.0),
                    projections: {
                        minP: calcGradForecast(5.5),
                        maxD: calcGradForecast(6.0),
                        maxC: calcGradForecast(6.5),
                        maxCPlus: calcGradForecast(7.0),
                        maxB: calcGradForecast(7.5),
                        maxBPlus: calcGradForecast(8.0),
                        maxA: calcGradForecast(8.5),
                        maxAPlus: calcGradForecast(9.0),
                        maxS: calcGradForecast(10.0)
                    },
                    requiredForDistinction: calcReqFutureSGPA(8.0),
                    requiredForFirstClass: calcReqFutureSGPA(6.5),
                    distinctionRequiresZeroBacklogs: totalBacklogCount > 0
                };
            }
        }
    }

    return {
        level,
        levelName,
        semesters: semesterResults,
        futureSemesters,
        totalCredits: totalActualCredits,
        earnedCredits: totalEarnedCredits,
        backlogCredits: totalBacklogCredits,
        totalPoints: totalActualPoints,
        currentCGPA,
        equivalentPercentage: window.calculateEquivalentPercentage(currentCGPA),
        totalBacklogs: totalBacklogCount,
        hasBacklogs: totalBacklogCount > 0,
        projections,
        graduationForecast
    };
};

// Smart Academic Filename Generator (OS-safe, collision-proof, recruiter & ATS ready)
window.generateSmartAcademicFilename = function(prefix, extension, metrics, studentInfo) {
    const parts = [prefix || "KTU_Report"];

    // 1. Register Number (KTU ID) or First Name
    if (studentInfo && studentInfo.registerNo) {
        const cleanReg = String(studentInfo.registerNo).trim().replace(/[^a-zA-Z0-9]/g, "");
        if (cleanReg) parts.push(cleanReg);
    } else if (studentInfo && studentInfo.name) {
        const cleanName = String(studentInfo.name).trim().split(" ")[0].replace(/[^a-zA-Z0-9]/g, "");
        if (cleanName) parts.push(cleanName);
    }

    // 2. Latest Semester (e.g. S6)
    if (metrics && metrics.semesters && metrics.semesters.length) {
        const lastSem = metrics.semesters[metrics.semesters.length - 1].semester;
        const semMatch = String(lastSem).match(/(\d+)/);
        if (semMatch) {
            parts.push(`S${semMatch[1]}`);
        } else {
            const cleanSem = String(lastSem).replace(/[^a-zA-Z0-9]/g, "");
            if (cleanSem) parts.push(cleanSem);
        }
    }

    // 3. Current CGPA (e.g. CGPA_8.42)
    if (metrics && metrics.currentCGPA && metrics.currentCGPA !== "0.00") {
        parts.push(`CGPA_${metrics.currentCGPA}`);
    }

    // 4. Compact Date (YYYYMMDD)
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    parts.push(`${yyyy}${mm}${dd}`);

    const ext = extension ? String(extension).replace(/^\./, "") : "pdf";
    return `${parts.join("_")}.${ext}`;
};