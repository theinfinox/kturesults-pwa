/**
 * Extension Test Suite - Calculator Tests
 */

const assert = require("assert");
const calculator = require("../src/core/calculator");

function runCalculatorTests() {
    console.log("  [Test 4] Testing SGPA & Audit Course Divisor Exclusion...");

    const s1Courses = [
        { code: "MAT101", credits: 4.0, grade: "A" },    // 4 * 8.5 = 34
        { code: "CYT100", credits: 4.0, grade: "S" },    // 4 * 10  = 40
        { code: "HUN101", credits: 2.0, grade: "PASS" }  // Audit: 2 earned cr, 0 graded cr!
    ];

    const s1Res = calculator.calculateSemesterSGPA(s1Courses);
    // Total graded points = 74, total graded credits = 8 -> SGPA = 74 / 8 = 9.25
    assert.strictEqual(s1Res.sgpa, 9.25, `SGPA must be 9.25, got ${s1Res.sgpa}`);
    assert.strictEqual(s1Res.gradedCredits, 8.0, "Graded credits must be 8");
    assert.strictEqual(s1Res.earnedCredits, 10.0, "Earned credits must include 2 cr from audit pass");
    assert.strictEqual(s1Res.backlogs, 0, "Backlogs must be 0");

    console.log("  [Test 5] Testing CGPA with Active Backlogs & 9 Comeback Projections...");

    const allCourses = [
        { semester: "S1", code: "MAT101", credits: 4.0, grade: "A" },    // 4 * 8.5 = 34
        { semester: "S1", code: "CYT100", credits: 4.0, grade: "S" },    // 4 * 10  = 40
        { semester: "S1", code: "HUN101", credits: 2.0, grade: "PASS" }, // Audit
        { semester: "S2", code: "CST100", credits: 4.0, grade: "F" }     // Backlog: 4 cr in denom, 0 pts in num
    ];

    const metrics = calculator.calculateAcademicMetrics(allCourses, { activityPoints: 100, isLateral: false });
    // Total points = 74, Graded credits = 8 (S1) + 4 (S2) = 12.
    // CGPA = 74 / 12 = 6.166... => 6.17
    assert.strictEqual(metrics.cgpa, 6.17, `CGPA must be 6.17, got ${metrics.cgpa}`);
    assert.strictEqual(metrics.activeBacklogs, 1, "Active backlogs must be 1");
    assert.strictEqual(metrics.backlogCredits, 4.0, "Backlog credits must be 4.0");

    // Comeback: minP (5.5) -> (74 + 4*5.5) / 12 = (74 + 22) / 12 = 96 / 12 = 8.00!
    assert.strictEqual(metrics.comebackProjections.minP, 8.00, `minP must be 8.00, got ${metrics.comebackProjections.minP}`);
    // Comeback: maxS (10.0) -> (74 + 4*10) / 12 = 114 / 12 = 9.50!
    assert.strictEqual(metrics.comebackProjections.maxS, 9.50, `maxS must be 9.50, got ${metrics.comebackProjections.maxS}`);

    console.log("  [Test 6] Testing Honors & Minors Evaluation...");
    // With backlog history, honors must be ineligible
    assert.strictEqual(metrics.honorsMinors.honors, "ineligible", "Student with backlog must be ineligible for Honors");

    // Clean student with CGPA 8.60 and 0 backlogs
    const cleanHonors = calculator.evaluateHonorsMinors(8.60, 0, false);
    assert.strictEqual(cleanHonors.honors, "eligible", "CGPA 8.60 with 0 backlogs must be eligible for Honors");
    assert.strictEqual(cleanHonors.minors, "eligible", "CGPA 8.60 must be eligible for Minors");

    console.log("  ✅ Calculator tests passed 100%!");
}

module.exports = runCalculatorTests;
