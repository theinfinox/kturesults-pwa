/**
 * Extension Test Suite - Parser Tests
 */

const assert = require("assert");
const parser = require("../src/core/parser");

function runParserTests() {
    console.log("  [Test 1] Testing Student Info Extraction & Register No Decoding...");

    const mockDoc = {
        querySelectorAll(selector) {
            if (selector.includes("list-group-item")) {
                return [
                    { textContent: "Name : GOVIND S R" },
                    { textContent: "Register No : CEA20CS026" },
                    { textContent: "Branch : COMPUTER SCIENCE & ENGINEERING" },
                    { textContent: "Admission Year : 2020" },
                    { textContent: "Institution : College of Engineering Adoor" },
                    { textContent: "Activity Points : 100.0" }
                ];
            }
            if (selector.includes("collapseFive")) {
                return [
                    {
                        id: "collapseFiveS1",
                        querySelector(sel) {
                            if (sel === "table") {
                                return {
                                    querySelectorAll() {
                                        return [
                                            {
                                                querySelectorAll() {
                                                    return [
                                                        { textContent: "MAT101" },
                                                        { textContent: "LINEAR ALGEBRA & CALCULUS" },
                                                        { textContent: "4.0" },
                                                        { textContent: "A" },
                                                        { textContent: "A" }
                                                    ];
                                                }
                                            },
                                            {
                                                querySelectorAll() {
                                                    return [
                                                        { textContent: "CYT100" },
                                                        { textContent: "ENGINEERING CHEMISTRY" },
                                                        { textContent: "4.0" },
                                                        { textContent: "S" },
                                                        { textContent: "B" }
                                                    ];
                                                }
                                            },
                                            {
                                                querySelectorAll() {
                                                    return [
                                                        { textContent: "HUN101" },
                                                        { textContent: "LIFE SKILLS" },
                                                        { textContent: "2.0" },
                                                        { textContent: "PASS" },
                                                        { textContent: "C" }
                                                    ];
                                                }
                                            }
                                        ];
                                    }
                                };
                            }
                            return null;
                        }
                    },
                    {
                        id: "collapseFiveS2",
                        querySelector(sel) {
                            if (sel === "table") {
                                return {
                                    querySelectorAll() {
                                        return [
                                            {
                                                querySelectorAll() {
                                                    return [
                                                        { textContent: "CST100" },
                                                        { textContent: "PROGRAMMING IN C" },
                                                        { textContent: "4.0" },
                                                        { textContent: "F" },
                                                        { textContent: "A" }
                                                    ];
                                                }
                                            }
                                        ];
                                    }
                                };
                            }
                            return null;
                        }
                    }
                ];
            }
            return [];
        },
        querySelector(selector) {
            if (selector.includes("collapseSix")) {
                return {
                    querySelector() {
                        return {
                            querySelectorAll() {
                                return [
                                    { textContent: "Total Eligible Points: 100.0" }
                                ];
                            }
                        };
                    }
                };
            }
            return null;
        }
    };

    const sInfo = parser.parseStudentInfo(mockDoc);
    assert.strictEqual(sInfo.name, "GOVIND S R", "Student name mismatch");
    assert.strictEqual(sInfo.registerNo, "CEA20CS026", "Register No mismatch");
    assert.strictEqual(sInfo.branch, "COMPUTER SCIENCE & ENGINEERING", "Branch mismatch");
    assert.strictEqual(sInfo.admissionYear, "2020", "Batch mismatch");
    assert.strictEqual(sInfo.scheme, "2019", "Scheme must resolve to 2019");
    assert.strictEqual(sInfo.isLateral, false, "Must not be lateral entry");
    assert.strictEqual(sInfo.activityPoints, 100.0, "Activity points mismatch");

    console.log("  [Test 2] Testing Semester Table Extraction & Audit Course Flags...");
    const semData = parser.parseSemesterData(mockDoc);
    assert.strictEqual(semData.length, 4, "Must extract 4 courses");

    const mat101 = semData.find(c => c.code === "MAT101");
    assert.strictEqual(mat101.credits, 4.0);
    assert.strictEqual(mat101.grade, "A");
    assert.strictEqual(mat101.isAudit, false);
    assert.strictEqual(mat101.isBacklog, false);

    const hun101 = semData.find(c => c.code === "HUN101");
    assert.strictEqual(hun101.isAudit, true, "HUN101 with grade PASS must be flagged as audit");

    const cst100 = semData.find(c => c.code === "CST100");
    assert.strictEqual(cst100.isBacklog, true, "CST100 with grade F must be flagged as backlog");

    console.log("  [Test 3] Testing Major vs Minor Branch Auto-Healing...");
    assert.strictEqual(parser.decodeBranchFromRegisterNo("TVE21CS042"), "Computer Science & Engineering");
    assert.strictEqual(parser.decodeBranchFromRegisterNo("PKD20EC015"), "Electronics & Communication Engineering");
    assert.strictEqual(parser.decodeBranchFromRegisterNo("LRET22AD001"), "Artificial Intelligence & Data Science");

    console.log("  [Test 3B] Testing KTU Official 11-Column Curriculum Format & Real Header Banner...");
    const mockOfficialKtuDoc = {
        querySelector(sel) {
            if (sel.includes("page-header") || sel.includes("h3") || sel.includes("profile-title")) {
                return { textContent: "GOVIND S R(CEA20CS026) (COLLEGE OF ENGINEERING ATTINGAL)" };
            }
            return null;
        },
        querySelectorAll(sel) {
            if (sel.includes("list-group-item") || sel.includes(".form-group") || sel.includes("tr")) {
                return [
                    { textContent: "Admitted Program : B.Tech" },
                    { textContent: "Admitted Branch : COMPUTER SCIENCE & ENGINEERING" },
                    { textContent: "Current Semester : S8" }
                ];
            }
            if (sel.includes("collapseFive")) {
                return [
                    {
                        id: "collapseFiveS1",
                        querySelector(s) {
                            if (s === "table") {
                                return {
                                    querySelectorAll(sub) {
                                        if (sub.includes("th") || sub.includes("thead")) {
                                            return [
                                                { textContent: "Slot" },
                                                { textContent: "Course" },
                                                { textContent: "Course Credit" },
                                                { textContent: "Course Valuation Type" },
                                                { textContent: "Completed Status" },
                                                { textContent: "Is Eligible for Written Exam" },
                                                { textContent: "* Re-Registration Required" },
                                                { textContent: "Grade" },
                                                { textContent: "Earned Credit" },
                                                { textContent: "Examination Details" },
                                                { textContent: "SGPA" }
                                            ];
                                        }
                                        return [
                                            {
                                                querySelectorAll() {
                                                    return [
                                                        { textContent: "A" },
                                                        { textContent: "MAT101 - LINEAR ALGEBRA AND CALCULUS" },
                                                        { textContent: "4.0" },
                                                        { textContent: "Valuation by university" },
                                                        { textContent: "No" },
                                                        { textContent: "Yes" },
                                                        { textContent: "No" },
                                                        { textContent: "AB" },
                                                        { textContent: "" },
                                                        { textContent: "Exam May 2026" },
                                                        { textContent: "" }
                                                    ];
                                                }
                                            },
                                            {
                                                querySelectorAll() {
                                                    return [
                                                        { textContent: "B" },
                                                        { textContent: "PHT100 - ENGINEERING PHYSICS A" },
                                                        { textContent: "4.0" },
                                                        { textContent: "Valuation by university" },
                                                        { textContent: "Yes" },
                                                        { textContent: "Yes" },
                                                        { textContent: "No" },
                                                        { textContent: "P" },
                                                        { textContent: "4.0" },
                                                        { textContent: "Exam Dec 2020" },
                                                        { textContent: "" }
                                                    ];
                                                }
                                            },
                                            {
                                                querySelectorAll() {
                                                    return [
                                                        { textContent: "D" },
                                                        { textContent: "EST120 - BASICS OF CIVIL AND MECHANICAL ENGINEERING" },
                                                        { textContent: "4.0" },
                                                        { textContent: "Valuation by university" },
                                                        { textContent: "Yes" },
                                                        { textContent: "Yes" },
                                                        { textContent: "No" },
                                                        { textContent: "C" },
                                                        { textContent: "4.0" },
                                                        { textContent: "Exam Dec 2020" },
                                                        { textContent: "" }
                                                    ];
                                                }
                                            }
                                        ];
                                    }
                                };
                            }
                            return null;
                        }
                    }
                ];
            }
            return [];
        }
    };

    const sOfficial = parser.parseStudentInfo(mockOfficialKtuDoc);
    assert.strictEqual(sOfficial.name, "GOVIND S R");
    assert.strictEqual(sOfficial.registerNo, "CEA20CS026");
    assert.strictEqual(sOfficial.college, "COLLEGE OF ENGINEERING ATTINGAL");
    assert.strictEqual(sOfficial.branch, "COMPUTER SCIENCE & ENGINEERING");
    assert.strictEqual(sOfficial.admissionYear, "2020", "Admission year must be derived from registerNo if missing");

    const semOfficial = parser.parseSemesterData(mockOfficialKtuDoc);
    assert.strictEqual(semOfficial.length, 3);
    const officialMat = semOfficial.find(c => c.code === "MAT101");
    assert(officialMat, "MAT101 must be extracted");
    assert.strictEqual(officialMat.name, "LINEAR ALGEBRA AND CALCULUS");
    assert.strictEqual(officialMat.credits, 4.0);
    assert.strictEqual(officialMat.grade, "AB");
    assert.strictEqual(officialMat.isBacklog, true, "AB grade must be flagged as active backlog");

    console.log("  ✅ Parser tests passed 100%!");
}

module.exports = runParserTests;
