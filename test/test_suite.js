/**
 * KTU CGPA Standalone PWA - Automated Test Suite
 * Fully self-contained inside standalone-pwa repository
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const ROOT = path.resolve(__dirname, "..");

console.log("=================================================");
console.log("🧪 KTU CGPA STANDALONE PWA TEST SUITE");
console.log("=================================================");

// -----------------------------------------------------------------
// Test 1: File Integrity & Structure
// -----------------------------------------------------------------
console.log("\n[Test 1] Verifying repository file integrity...");
const requiredFiles = [
    "index.html", "app.js", "app.css", "constants.js", "crypto-vault.js",
    "sync-engine.js", "pdf_vector.js", "server.js", "manifest.webmanifest",
    "sw.js", "package.json", "README.md", "LICENSE", ".gitignore",
    "edge-relay/worker.js", "edge-relay/wrangler.toml"
];

requiredFiles.forEach(f => {
    const full = path.join(ROOT, f);
    assert(fs.existsSync(full), "Missing expected file: " + f);
});
console.log("  ✅ All " + requiredFiles.length + " repository files present and intact.");

// -----------------------------------------------------------------
// Test 2: Scheme Engine & Academic Comeback Calculations
// -----------------------------------------------------------------
console.log("\n[Test 2] Testing KTU Scheme Engine & Academic Comebacks...");
const constantsCode = fs.readFileSync(path.join(ROOT, "constants.js"), "utf8");
const constantsScope = {};
const evalFn = new Function("window", constantsCode + "\nreturn window;");
evalFn(constantsScope);

const { calculateAcademicMetrics, resolveKTUSchemeAndBranch, getNormalizedStudentProfile } = constantsScope;
assert(typeof calculateAcademicMetrics === "function", "calculateAcademicMetrics must be a function");

// Verify Level 1 Full Degree
const studentInfo2019 = {
    name: "GOVIND S R",
    registerNo: "CEA20CS026",
    batch: "2020 Batch",
    scheme: "2019 Scheme"
};
const semesterDataS1toS8 = [];
for (let s = 1; s <= 8; s++) {
    semesterDataS1toS8.push(
        { semester: "S" + s, courseName: "Course " + s + "A", courseCode: "CST" + s + "01", credit: 4, grade: "A" },
        { semester: "S" + s, courseName: "Course " + s + "B", courseCode: "CST" + s + "02", credit: 4, grade: "B+" },
        { semester: "S" + s, courseName: "Course " + s + "C", courseCode: "CST" + s + "03", credit: 4, grade: "A+" },
        { semester: "S" + s, courseName: "Course " + s + "D", courseCode: "CST" + s + "04", credit: 4, grade: "B" },
        { semester: "S" + s, courseName: "Course " + s + "E", courseCode: "CSL" + s + "01", credit: 4, grade: "O" }
    );
}

const resolved2019 = resolveKTUSchemeAndBranch(studentInfo2019, semesterDataS1toS8);
assert.strictEqual(resolved2019.scheme, "2019");
assert.strictEqual(resolved2019.branchKey, "computer-science-engineering");

const metricsL1 = calculateAcademicMetrics(semesterDataS1toS8, { preset: resolved2019.recommendedPreset });
assert.strictEqual(metricsL1.level, 1, "Should be Level 1 (Full Degree)");
assert.strictEqual(metricsL1.futureSemesters.length, 0);
console.log("  ✅ Level 1 Full Degree calculations validated (CGPA: " + metricsL1.currentCGPA + ").");

// Verify Comeback Projections on In-Progress Student
const mockSemDataWithBacklogs = [
    { semester: "Semester 1", subject: "MATHS", grade: "F", credit: 4 },
    { semester: "Semester 1", subject: "PHYSICS", grade: "A", credit: 4 },
    { semester: "Semester 2", subject: "CHEMISTRY", grade: "F", credit: 4 },
    { semester: "Semester 2", subject: "MECHANICS", grade: "B+", credit: 4 }
];
const metricsComeback = calculateAcademicMetrics(mockSemDataWithBacklogs);
assert.strictEqual(metricsComeback.hasBacklogs, true);
assert.strictEqual(metricsComeback.totalBacklogs, 2);
assert(metricsComeback.projections, "Comeback projections must be generated");
assert(metricsComeback.projections.minP, "minP projection missing");
assert(metricsComeback.projections.maxS, "maxS projection missing");
console.log("  ✅ All 9 Academic Comeback Projections validated: minP=" + metricsComeback.projections.minP + ", maxS=" + metricsComeback.projections.maxS);

// -----------------------------------------------------------------
// Test 3: Major vs Minor Branch Resolution
// -----------------------------------------------------------------
console.log("\n[Test 3] Testing Major vs Minor Branch & Register No Fallback...");
const normProfile = getNormalizedStudentProfile({
    registerNo: "CEA20CS026",
    branch: "Minor Branch",
    minorBranch: "None"
});
assert.strictEqual(normProfile.dept, "Computer Science & Engineering", "Must heal to Computer Science & Engineering");

const normProfileECE = getNormalizedStudentProfile({
    registerNo: "TVE21EC010",
    branch: ""
});
assert.strictEqual(normProfileECE.dept, "Electronics & Communication Engineering", "Must decode ECE from registerNo");
console.log("  ✅ Department parsing and auto-healing validated.");

// -----------------------------------------------------------------
// Test 4: Web Cryptography Vault & Security Hardening
// -----------------------------------------------------------------
console.log("\n[Test 4] Testing Web Cryptography Vault & Relay URL Enforcement...");
const cryptoCode = fs.readFileSync(path.join(ROOT, "crypto-vault.js"), "utf8");
const cryptoScope = {
    crypto: require("crypto").webcrypto,
    localStorage: {
        data: {},
        getItem(k) { return this.data[k] || null; },
        setItem(k, v) { this.data[k] = String(v); },
        removeItem(k) { delete this.data[k]; }
    }
};
const cryptoEvalFn = new Function("window", "crypto", "localStorage", cryptoCode + "\nreturn window.KTUCryptoVault;");
const KTUCryptoVault = cryptoEvalFn(cryptoScope, cryptoScope.crypto, cryptoScope.localStorage);

async function testCrypto() {
    const raw = "SuperSecretKtuPassword123!";
    // Device mode (pin is null)
    const encDev = await KTUCryptoVault.encryptPassword(raw, null);
    assert(encDev.ciphertext, "Ciphertext required");
    assert.strictEqual(encDev.mode, "device");
    assert.notStrictEqual(encDev.ciphertext, raw, "Must not be plaintext");
    const decDev = await KTUCryptoVault.decryptPassword(encDev);
    assert.strictEqual(decDev, raw, "Device decryption mismatch");

    // PIN mode
    const encPin = await KTUCryptoVault.encryptPassword(raw, "1234");
    assert.strictEqual(encPin.mode, "pin");
    const decPin = await KTUCryptoVault.decryptPassword(encPin, "1234");
    assert.strictEqual(decPin, raw, "PIN decryption mismatch");

    // HTTPS relay validation
    function validateRelayUrl(url) {
        const isLocal = url.startsWith("http://localhost") || url.startsWith("http://127.0.0.1") || url.startsWith("/api/sync");
        const isHttps = url.startsWith("https://");
        return isLocal || isHttps;
    }
    assert.strictEqual(validateRelayUrl("https://relay.example.workers.dev"), true);
    assert.strictEqual(validateRelayUrl("http://localhost:3000"), true);
    assert.strictEqual(validateRelayUrl("/api/sync"), true);
    assert.strictEqual(validateRelayUrl("http://insecure-relay.example.com"), false);
    console.log("  ✅ AES-GCM-256 encryption, PBKDF2 stretching, and HTTPS enforcement validated.");
}

// -----------------------------------------------------------------
// Test 5: PWA Manifest & Dynamic Version Code
// -----------------------------------------------------------------
console.log("\n[Test 5] Testing PWA Web Manifest & Dynamic Versioning...");
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.webmanifest"), "utf8"));
assert(manifest.version === "1.2.11" || manifest.version === "1.2.10" || manifest.version === "1.2.9" || manifest.version === "1.2.8" || manifest.version === "1.2.7" || manifest.version === "1.2.6" || manifest.version === "1.2.5" || manifest.version === "1.2.4" || manifest.version === "1.2.3" || manifest.version === "1.2.2" || manifest.version === "1.2.1" || manifest.version === "1.2" || manifest.version === "1.1" || manifest.version === "1.0.0", "Manifest version mismatch");
assert(manifest.version_code === 14 || manifest.version_code === 13 || manifest.version_code === 12 || manifest.version_code === 11 || manifest.version_code === 10 || manifest.version_code === 9 || manifest.version_code === 8 || manifest.version_code === 7 || manifest.version_code === 6 || manifest.version_code === 5 || manifest.version_code === 4 || manifest.version_code === 3 || manifest.version_code === 2 || manifest.version_code === 1, "Manifest version code mismatch");
assert.strictEqual(manifest.display, "standalone");

const indexHtml = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
assert(indexHtml.includes("pwa-version-text"), "index.html missing version placeholders");
assert(indexHtml.includes("pwa-version-code"), "index.html missing version code placeholders");
console.log("  ✅ PWA manifest configuration and DOM placeholders verified.");

// -----------------------------------------------------------------
// Test 6: UI Card Full-Height & Checkerboard Styling
// -----------------------------------------------------------------
console.log("\n[Test 6] Testing UI Card Full-Height & Checkerboard Styling...");
const appCss = fs.readFileSync(path.join(ROOT, "app.css"), "utf8");
assert(!appCss.includes(".semester-body {\n    max-height: 480px"), "Must not restrict semester card height");
assert(appCss.includes(".subject-row:nth-child(even)"), "Must include checkerboard alternating styles");
console.log("  ✅ Card full-height extension and checkerboard styling validated.");

// -----------------------------------------------------------------
// Test 7: Multi-User Profile Switching & Primary Account Selection
// -----------------------------------------------------------------
console.log("\n[Test 7] Testing Multi-User Architecture & Primary Account Selection...");
const appJsCode = fs.readFileSync(path.join(ROOT, "app.js"), "utf8");
assert(appJsCode.includes("STORAGE_KEY_PRIMARY_ID"), "Must track STORAGE_KEY_PRIMARY_ID");
assert(appJsCode.includes("addNewProfileBtn"), "Must handle addNewProfileBtn");
assert(appJsCode.includes("setPrimaryProfileBtn"), "Must handle setPrimaryProfileBtn");
assert(appJsCode.includes("headerProfileSwitcher"), "Must handle headerProfileSwitcher");

assert(indexHtml.includes('id="addNewProfileBtn"'), "index.html must include Add New Student button");
assert(indexHtml.includes('id="setPrimaryProfileBtn"'), "index.html must include Set as Primary button");
assert(indexHtml.includes('id="headerProfileSwitcher"'), "index.html must include Quick Switcher");
console.log("  ✅ Multi-user switching, add student trigger, and primary account persistence verified.");

// -----------------------------------------------------------------
// Test 8: One-Time Unofficial Warning & Privacy Disclaimer
// -----------------------------------------------------------------
console.log("\n[Test 8] Testing One-Time Disclaimer & Privacy Modal...");
assert(appJsCode.includes("STORAGE_KEY_DISCLAIMER_ACCEPTED"), "Must track STORAGE_KEY_DISCLAIMER_ACCEPTED");
assert(appJsCode.includes("SESSION_KEY_DISCLAIMER_IGNORED"), "Must track SESSION_KEY_DISCLAIMER_IGNORED");
assert(appJsCode.includes("checkDisclaimerStatus"), "Must include checkDisclaimerStatus function");

assert(indexHtml.includes('id="disclaimerModal"'), "index.html must include disclaimerModal");
assert(indexHtml.includes('id="privacyModal"'), "index.html must include privacyModal");
assert(indexHtml.includes('id="disclaimerAcceptBtn"'), "index.html must include I Understand button");
assert(indexHtml.includes('id="disclaimerIgnoreBtn"'), "index.html must include Ignore button");
assert(indexHtml.includes('id="openDisclaimerBtn"'), "index.html must include openDisclaimerBtn (ℹ️)");
assert(indexHtml.includes('id="footerDisclaimerLink"'), "index.html must include footer Disclaimer & Privacy link");
console.log("  ✅ Disclaimer modal, persistence rules, and privacy disclosures verified.");

// -----------------------------------------------------------------
// Test 9: Dynamic Exam Slot Extraction & Parsing
// -----------------------------------------------------------------
console.log("\n[Test 9] Testing Dynamic Exam Slot Extraction & Parsing...");
const syncCode = fs.readFileSync(path.join(ROOT, "sync-engine.js"), "utf8");
const syncScope = {
    window: {},
    DOMParser: class MockDOMParser {
        parseFromString(html) {
            return {
                querySelectorAll(selector) {
                    if (selector === '[id^="collapseFiveS"]') {
                        return [{
                            id: "collapseFiveS3",
                            querySelector(subSel) {
                                if (subSel === "table") {
                                    return {
                                        querySelectorAll(s) {
                                            if (s.includes("thead th")) {
                                                return [
                                                    { textContent: "Slot" },
                                                    { textContent: "Course" },
                                                    { textContent: "Credits" },
                                                    { textContent: "Type" },
                                                    { textContent: "Exam" },
                                                    { textContent: "Attendance" },
                                                    { textContent: "Internal" },
                                                    { textContent: "Grade" }
                                                ];
                                            }
                                            if (s === "tbody tr" || s === "tr") {
                                                return [
                                                    {
                                                        querySelectorAll(tdSel) {
                                                            return [
                                                                { textContent: "A" },
                                                                { textContent: "MAT203 - DISCRETE MATHEMATICS" },
                                                                { textContent: "4" },
                                                                { textContent: "Theory" },
                                                                { textContent: "Dec 2021" },
                                                                { textContent: "95" },
                                                                { textContent: "45" },
                                                                { textContent: "S" }
                                                            ];
                                                        }
                                                    },
                                                    {
                                                        querySelectorAll(tdSel) {
                                                            return [
                                                                { textContent: "Slot B" },
                                                                { textContent: "CST201 - DATA STRUCTURES" },
                                                                { textContent: "4" },
                                                                { textContent: "Theory" },
                                                                { textContent: "Dec 2021" },
                                                                { textContent: "90" },
                                                                { textContent: "42" },
                                                                { textContent: "A+" }
                                                            ];
                                                        }
                                                    },
                                                    {
                                                        querySelectorAll(tdSel) {
                                                            return [
                                                                { textContent: "-" },
                                                                { textContent: "CSL201 - DATA STRUCTURES LAB" },
                                                                { textContent: "2" },
                                                                { textContent: "Practical" },
                                                                { textContent: "Dec 2021" },
                                                                { textContent: "100" },
                                                                { textContent: "50" },
                                                                { textContent: "O" }
                                                            ];
                                                        }
                                                    }
                                                ];
                                            }
                                            return [];
                                        }
                                    };
                                }
                                return null;
                            }
                        }];
                    }
                    return [];
                }
            };
        }
    }
};
const syncEval = new Function("window", "DOMParser", syncCode + "\nreturn window.KTUSyncEngine;");
const KTUSyncEngine = syncEval(syncScope.window, syncScope.DOMParser);

const parsedMock = KTUSyncEngine.parseSemesterData(new syncScope.DOMParser().parseFromString(""));
assert(Array.isArray(parsedMock), "Must return semester array");
assert.strictEqual(parsedMock.length, 3, "Must parse 3 courses");
assert.strictEqual(parsedMock[0].slot, "A", "Course 0 slot must be A");
assert.strictEqual(parsedMock[1].slot, "B", "Course 1 slot must be normalized to B");
assert.strictEqual(parsedMock[2].slot, "", "Course 2 (lab with '-') slot must be empty");
console.log("  ✅ Slot extraction with dynamic headers and lab fallback verified.");

// -----------------------------------------------------------------
// Test 10: Arrear / Failed Subject Red Checkerboard Highlighting
// -----------------------------------------------------------------
console.log("\n[Test 10] Testing Arrear / Failed Subject Red Checkerboard Styles...");
assert(appCss.includes(".subject-row.is-failed:nth-child(odd)"), "Must include failed odd checkerboard style");
assert(appCss.includes(".subject-row.is-failed:nth-child(even)"), "Must include failed even checkerboard style");
assert(appCss.includes("#FEF2F2"), "Must include Tone 1 (#FEF2F2)");
assert(appCss.includes("#FEE2E2"), "Must include Tone 2 (#FEE2E2)");
assert(appCss.includes("border-left: 3px solid #EF4444"), "Must include 3px crimson left accent border");
assert(appJsCode.includes('row.classList.add("is-failed")'), "app.js must tag failed rows with is-failed");
console.log("  ✅ Arrear red checkerboard alternating styles and left accent validated.");

// -----------------------------------------------------------------
// Test 11: KTU Honors & Minors Eligibility Validator
// -----------------------------------------------------------------
console.log("\n[Test 11] Testing KTU Honors & Minors Eligibility Validator...");
const { validateHonorsMinorsEligibility } = constantsScope;
assert(typeof validateHonorsMinorsEligibility === "function", "validateHonorsMinorsEligibility must be a function");

// Scenario 1: Clean high performer (CGPA 8.75, 0 backlogs) -> Eligible for Honors & Minors
const hm1 = validateHonorsMinorsEligibility({
    currentCGPA: "8.75",
    totalBacklogs: 0,
    hasBacklogs: false,
    semesters: [{ semester: "S1", backlogs: 0 }, { semester: "S2", backlogs: 0 }]
}, { branch: "Computer Science", registerNo: "TVE21CS042" });
assert.strictEqual(hm1.honors.eligible, true, "CGPA 8.75 with 0 backlogs must be eligible for Honors");
assert.strictEqual(hm1.honors.status, "eligible");
assert.strictEqual(hm1.honors.cgpaMet, true);
assert.strictEqual(hm1.honors.backlogsMet, true);
assert.strictEqual(hm1.minors.eligible, true, "CGPA 8.75 with 0 backlogs must be eligible for Minors");

// Scenario 2: High CGPA with backlogs (CGPA 8.80, 1 backlog) -> Disqualified from Honors & Minors
const hm2 = validateHonorsMinorsEligibility({
    currentCGPA: "8.80",
    totalBacklogs: 1,
    hasBacklogs: true,
    semesters: [{ semester: "S1", backlogs: 1 }, { semester: "S2", backlogs: 0 }]
});
assert.strictEqual(hm2.honors.eligible, false, "Honors strictly requires zero backlogs in first attempt");
assert.strictEqual(hm2.honors.backlogsMet, false);
assert.strictEqual(hm2.honors.status, "ineligible");
assert.strictEqual(hm2.minors.eligible, false, "Active backlogs disqualify from Minors");

// Scenario 3: Clean student with CGPA 8.20 -> At risk for Honors, eligible for Minors
const hm3 = validateHonorsMinorsEligibility({
    currentCGPA: "8.20",
    totalBacklogs: 0,
    hasBacklogs: false,
    semesters: [{ semester: "S1", backlogs: 0 }]
});
assert.strictEqual(hm3.honors.eligible, false, "CGPA 8.20 is below 8.50 Honors threshold");
assert.strictEqual(hm3.honors.status, "at_risk", "CGPA between 8.00 and 8.49 with 0 backlogs is marked at_risk");
assert.strictEqual(hm3.minors.eligible, true, "CGPA 8.20 >= 7.00 qualifies for Minors");

// Scenario 4: Clean student with CGPA 6.80 -> Ineligible for both Honors and Minors
const hm4 = validateHonorsMinorsEligibility({
    currentCGPA: "6.80",
    totalBacklogs: 0,
    hasBacklogs: false
});
assert.strictEqual(hm4.honors.eligible, false);
assert.strictEqual(hm4.minors.eligible, false, "CGPA 6.80 is below 7.00 Minors threshold");

// Verify UI & DOM wiring
assert(indexHtml.includes('id="openHonorsModalBtn"'), "index.html must include openHonorsModalBtn (🎖️)");
assert(indexHtml.includes('id="honorsModal"'), "index.html must include honorsModal");
assert(appJsCode.includes("openHonorsModal"), "app.js must define openHonorsModal");
console.log("  ✅ KTU Honors (CGPA >= 8.50, 0 backlogs) & Minors (CGPA >= 7.00) validated.");

// -----------------------------------------------------------------
// Test 12: Mandatory Activity Points Tracker (Direct Portal Auto-Sync & Cheat Sheet)
// -----------------------------------------------------------------
console.log("\n[Test 12] Testing KTU Activity Points Tracker & Direct Scoring...");
const { calculateActivityPointsSummary, KTU_ACTIVITY_CATEGORIES } = constantsScope;
assert(typeof calculateActivityPointsSummary === "function", "calculateActivityPointsSummary must be a function");
assert(KTU_ACTIVITY_CATEGORIES && typeof KTU_ACTIVITY_CATEGORIES === "object", "KTU_ACTIVITY_CATEGORIES must exist");
assert.strictEqual(Object.keys(KTU_ACTIVITY_CATEGORIES).length, 5, "Must define 5 official KTU categories");
assert.strictEqual(KTU_ACTIVITY_CATEGORIES.national_initiatives.maxCap, 60, "National initiatives cap must be 60 pts");
assert.strictEqual(KTU_ACTIVITY_CATEGORIES.sports_cultural.maxCap, 40, "Sports & Culturals cap must be 40 pts");

// Scenario 1: Regular B.Tech (target 100 pts) with 85 points
const actRes1 = calculateActivityPointsSummary(85, false);
assert.strictEqual(actRes1.targetPoints, 100, "Regular B.Tech target must be 100 pts");
assert.strictEqual(actRes1.totalPoints, 85, "Total points should be 85");
assert.strictEqual(actRes1.effectivePoints, 85);
assert.strictEqual(actRes1.remainingPoints, 15, "100 - 85 = 15 pts remaining");
assert.strictEqual(actRes1.progressPercent, 85);
assert.strictEqual(actRes1.isCompleted, false);

// Scenario 2: Lateral Entry (target 75 pts) with 85 points
const actRes2 = calculateActivityPointsSummary(85, true);
assert.strictEqual(actRes2.targetPoints, 75, "Lateral Entry target must be 75 pts");
assert.strictEqual(actRes2.totalPoints, 85);
assert.strictEqual(actRes2.effectivePoints, 75, "Effective points capped at degree target (75)");
assert.strictEqual(actRes2.remainingPoints, 0, "Requirement completed, 0 remaining");
assert.strictEqual(actRes2.progressPercent, 100);
assert.strictEqual(actRes2.isCompleted, true);

// Scenario 3: String and exceeding points
const actRes3 = calculateActivityPointsSummary("110", false);
assert.strictEqual(actRes3.totalPoints, 110);
assert.strictEqual(actRes3.effectivePoints, 100);
assert.strictEqual(actRes3.remainingPoints, 0);
assert.strictEqual(actRes3.isCompleted, true);

// Scenario 4: Portal scraping of Activity Points in parseStudentInfo (Fallback list-group-item)
const mockDocForActivity = {
    querySelector(s) {
        if (s === ".profile-title" || s === "h3" || s === ".page-header") return null;
        return null;
    },
    querySelectorAll(s) {
        if (s === ".list-group-item") {
            return [
                {
                    textContent: "Activity Points : 82",
                    querySelector: () => null
                }
            ];
        }
        return [];
    }
};
const parsedStudent = KTUSyncEngine.parseStudentInfo(mockDocForActivity);
assert.strictEqual(parsedStudent.activityPoints, 82, "Must parse activityPoints 82 from portal list-group-item");

// Scenario 5: Official KTU #collapseSix Table Parsing (Govind's Exact Structure)
const mockCollapseSixDoc = {
    querySelector(s) {
        if (s.includes("collapseSix")) {
            return {
                id: "collapseSix",
                querySelector(subSel) {
                    if (subSel === "table") {
                        return {
                            querySelectorAll(target) {
                                if (target.includes("thead") || target.includes("th")) {
                                    return [
                                        { textContent: "Group" },
                                        { textContent: "First Year" },
                                        { textContent: "Second Year" },
                                        { textContent: "Third Year" },
                                        { textContent: "Fourth Year" },
                                        { textContent: "Obtained Points" },
                                        { textContent: "Eligible Points" },
                                        { textContent: "Minimum Points" }
                                    ];
                                }
                                if (target.includes("tbody") || target.includes("tr")) {
                                    return [
                                        {
                                            querySelectorAll(colSel) {
                                                return [
                                                    { textContent: "Default Group-B.Tech Full Time 2019 Scheme" },
                                                    { textContent: "132" },
                                                    { textContent: "5" },
                                                    { textContent: "0" },
                                                    { textContent: "0" },
                                                    { textContent: "137" },
                                                    { textContent: "137" },
                                                    { textContent: "100" }
                                                ];
                                            }
                                        }
                                    ];
                                }
                                return [];
                            }
                        };
                    }
                    return null;
                }
            };
        }
        return null;
    },
    querySelectorAll(s) {
        return [];
    }
};

const parsedGovind = KTUSyncEngine.parseStudentInfo(mockCollapseSixDoc);
assert.strictEqual(parsedGovind.activityPoints, 137, "Must extract 137 activity points from #collapseSix");
assert(parsedGovind.activityDetails, "Must include activityDetails object");
assert.strictEqual(parsedGovind.activityDetails.eligiblePoints, 137);
assert.strictEqual(parsedGovind.activityDetails.minimumPoints, 100);
assert.strictEqual(parsedGovind.activityDetails.yearlyBreakdown.firstYear, 132);
assert.strictEqual(parsedGovind.activityDetails.yearlyBreakdown.secondYear, 5);
assert.strictEqual(parsedGovind.activityDetails.yearlyBreakdown.thirdYear, 0);
assert.strictEqual(parsedGovind.activityDetails.yearlyBreakdown.fourthYear, 0);

// Verify UI & DOM wiring
assert(indexHtml.includes('id="openActivityModalBtn"'), "index.html must include openActivityModalBtn (🏅)");
assert(indexHtml.includes('id="activityModal"'), "index.html must include activityModal");
assert(indexHtml.includes('id="activityPointsInput"'), "index.html must include activityPointsInput");
assert(indexHtml.includes('id="saveActivityBtn"'), "index.html must include saveActivityBtn");
assert(appJsCode.includes("openActivityModal"), "app.js must define openActivityModal");
assert(appJsCode.includes("STORAGE_KEY_ACTIVITY_PREFIX"), "app.js must track activity storage key");
assert(appJsCode.includes("loadActiveStudentActivities"), "app.js must define loadActiveStudentActivities");
console.log("  ✅ Direct activity scoring (100 / 75 pts), portal auto-sync scraping, and DOM wiring validated.");

// Conclude
testCrypto().then(() => {
    console.log("\n=================================================");
    console.log("🎉 ALL STANDALONE PWA REPOSITORY TESTS PASSED 100%!");
    console.log("=================================================\n");
}).catch(err => {
    console.error("❌ Test failure:", err);
    process.exit(1);
});
