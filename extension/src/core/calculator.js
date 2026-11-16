/**
 * KTU Supercharger - Core Academic Calculator & Regulations Engine
 * Dual-environment compatible: Browser window + Node.js test environment
 */

(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        const constants = require("./constants");
        module.exports = factory(constants);
    } else {
        root.KTU_CALCULATOR = factory(root.KTU_CONSTANTS);
    }
})(typeof self !== "undefined" ? self : this, function (constants) {
    const {
        GP,
        BACKLOG_GRADES,
        AUDIT_GRADES,
        PENDING_GRADES,
        COMEBACK_TARGETS,
        TARGET_CREDITS_DEFAULT,
        TARGET_CREDITS_LATERAL,
        TARGET_ACTIVITY_REGULAR,
        TARGET_ACTIVITY_LATERAL
    } = constants;

    function calculateSemesterSGPA(courses) {
        let earnedPoints = 0;
        let gradedCredits = 0;
        let earnedCredits = 0;
        let backlogs = 0;

        courses.forEach(c => {
            const grade = (c.grade || "").toUpperCase().trim();
            const credits = parseFloat(c.credits) || 0;

            if (PENDING_GRADES.has(grade)) {
                return;
            }

            if (AUDIT_GRADES.has(grade)) {
                // Audit course: earns credits, but strictly ZERO contribution to SGPA divisor
                if (grade !== "FAIL") earnedCredits += credits;
                return;
            }

            if (BACKLOG_GRADES.has(grade)) {
                // Backlog: contributes credits to denominator with 0 points
                gradedCredits += credits;
                backlogs++;
                return;
            }

            const pt = GP[grade];
            if (pt !== undefined && pt > 0) {
                earnedPoints += credits * pt;
                gradedCredits += credits;
                earnedCredits += credits;
            }
        });

        const sgpa = gradedCredits > 0 ? parseFloat((earnedPoints / gradedCredits).toFixed(2)) : 0.00;
        return {
            sgpa,
            earnedPoints,
            gradedCredits,
            earnedCredits,
            backlogs
        };
    }

    function calculateAcademicMetrics(semesterData, studentInfo = {}) {
        if (!Array.isArray(semesterData) || semesterData.length === 0) {
            return {
                cgpa: 0.00,
                totalPoints: 0,
                totalGradedCredits: 0,
                totalEarnedCredits: 0,
                activeBacklogs: 0,
                backlogCredits: 0,
                semesters: {},
                comebackProjections: {},
                honorsMinors: { honors: "ineligible", minors: "ineligible" },
                activitySummary: { completed: 0, target: 100, percent: 0 }
            };
        }

        // Group courses by semester
        const semGroups = {};
        semesterData.forEach(c => {
            const sem = c.semester || "S1";
            if (!semGroups[sem]) semGroups[sem] = [];
            semGroups[sem].push(c);
        });

        let totalPoints = 0;
        let totalGradedCredits = 0;
        let totalEarnedCredits = 0;
        let activeBacklogs = 0;
        let backlogCredits = 0;
        let hadAnyBacklogHistory = false;
        const semesters = {};

        Object.keys(semGroups).sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, ""), 10) || 0;
            const numB = parseInt(b.replace(/\D/g, ""), 10) || 0;
            return numA - numB;
        }).forEach(sem => {
            const metrics = calculateSemesterSGPA(semGroups[sem]);
            semesters[sem] = metrics;
            totalPoints += metrics.earnedPoints;
            totalGradedCredits += metrics.gradedCredits;
            totalEarnedCredits += metrics.earnedCredits;
            activeBacklogs += metrics.backlogs;

            semGroups[sem].forEach(c => {
                const grade = (c.grade || "").toUpperCase().trim();
                const cr = parseFloat(c.credits) || 0;
                if (BACKLOG_GRADES.has(grade)) {
                    backlogCredits += cr;
                    hadAnyBacklogHistory = true;
                }
            });
        });

        const cgpa = totalGradedCredits > 0 ? parseFloat((totalPoints / totalGradedCredits).toFixed(2)) : 0.00;

        // 9 Academic Comeback Projections
        const comebackProjections = {};
        COMEBACK_TARGETS.forEach(target => {
            if (activeBacklogs === 0) {
                comebackProjections[target.key] = cgpa;
            } else {
                const projectedPoints = totalPoints + (backlogCredits * target.gp);
                const proj = totalGradedCredits > 0 ? parseFloat((projectedPoints / totalGradedCredits).toFixed(2)) : cgpa;
                comebackProjections[target.key] = proj;
            }
        });

        // Honors & Minors
        const honorsMinors = evaluateHonorsMinors(cgpa, activeBacklogs, hadAnyBacklogHistory);

        // Activity Points Summary
        const isLateral = !!studentInfo.isLateral;
        const targetAct = isLateral ? TARGET_ACTIVITY_LATERAL : TARGET_ACTIVITY_REGULAR;
        const actVal = parseFloat(studentInfo.activityPoints) || 0;
        const actPercent = Math.min(100, Math.floor((actVal / targetAct) * 100));

        return {
            cgpa,
            totalPoints,
            totalGradedCredits,
            totalEarnedCredits,
            targetCredits: isLateral ? TARGET_CREDITS_LATERAL : TARGET_CREDITS_DEFAULT,
            creditPercent: Math.min(100, Math.floor((totalEarnedCredits / (isLateral ? TARGET_CREDITS_LATERAL : TARGET_CREDITS_DEFAULT)) * 100)),
            activeBacklogs,
            backlogCredits,
            semesters,
            comebackProjections,
            honorsMinors,
            activitySummary: {
                completed: actVal,
                target: targetAct,
                percent: actPercent
            }
        };
    }

    function evaluateHonorsMinors(cgpa, activeBacklogs, hadAnyBacklogHistory) {
        let honors = "ineligible";
        let minors = "ineligible";

        // Honors: CGPA >= 8.50 and zero history of backlogs (first attempt clearance rule)
        if (!hadAnyBacklogHistory && activeBacklogs === 0) {
            if (cgpa >= 8.50) honors = "eligible";
            else if (cgpa >= 8.00) honors = "at_risk";
        }

        // Minors: CGPA >= 7.00 and no active backlogs
        if (activeBacklogs === 0) {
            if (cgpa >= 7.00) minors = "eligible";
            else if (cgpa >= 6.75) minors = "at_risk";
        }

        return { honors, minors };
    }

    return {
        calculateSemesterSGPA,
        calculateAcademicMetrics,
        evaluateHonorsMinors
    };
});
