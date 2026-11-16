/**
 * KTU Supercharger - Core Constants & Academic Regulations
 * Dual-environment compatible: Browser window + Node.js test environment
 */

(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.KTU_CONSTANTS = factory();
    }
})(typeof self !== "undefined" ? self : this, function () {
    const GP = {
        "S": 10,
        "O": 10,
        "A+": 9,
        "A": 8.5,
        "B+": 8,
        "B": 7.5,
        "C+": 7,
        "C": 6.5,
        "D": 6,
        "P": 5.5,
        "LP": 4,
        "F": 0,
        "FE": 0,
        "AB": 0,
        "ABSENT": 0,
        "I": 0
    };

    const BACKLOG_GRADES = new Set(["F", "FE", "AB", "ABSENT", "I"]);
    const AUDIT_GRADES = new Set(["PASS", "COMPLETED", "AUDIT", "CH", "SATISFACTORY"]);
    const PENDING_GRADES = new Set(["-", "NULL", "PLANNED", "WITHHELD", "PENDING", ""]);

    const COMEBACK_TARGETS = [
        { key: "minP", label: "Min P (5.5)", gp: 5.5 },
        { key: "maxD", label: "Max D (6.0)", gp: 6.0 },
        { key: "maxC", label: "Max C (6.5)", gp: 6.5 },
        { key: "maxCPlus", label: "Max C+ (7.0)", gp: 7.0 },
        { key: "maxB", label: "Max B (7.5)", gp: 7.5 },
        { key: "maxBPlus", label: "Max B+ (8.0)", gp: 8.0 },
        { key: "maxA", label: "Max A (8.5)", gp: 8.5 },
        { key: "maxAPlus", label: "Max A+ (9.0)", gp: 9.0 },
        { key: "maxS", label: "Max S (10.0)", gp: 10.0 }
    ];

    const SCHEMES = {
        SCHEME_2015: "2015",
        SCHEME_2019: "2019",
        SCHEME_2024: "2024"
    };

    const TARGET_CREDITS_DEFAULT = 160;
    const TARGET_CREDITS_LATERAL = 120;
    const TARGET_ACTIVITY_REGULAR = 100;
    const TARGET_ACTIVITY_LATERAL = 75;

    const PWA_TARGET_URL = "https://kturesults.govindsr.me/";

    return {
        GP,
        BACKLOG_GRADES,
        AUDIT_GRADES,
        PENDING_GRADES,
        COMEBACK_TARGETS,
        SCHEMES,
        TARGET_CREDITS_DEFAULT,
        TARGET_CREDITS_LATERAL,
        TARGET_ACTIVITY_REGULAR,
        TARGET_ACTIVITY_LATERAL,
        PWA_TARGET_URL
    };
});
