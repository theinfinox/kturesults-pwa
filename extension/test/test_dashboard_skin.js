/**
 * Extension Test Suite - Dashboard Skin & UX Features
 */

const assert = require("assert");
const dashboardSkin = require("../src/skin/dashboard-skin");

function runDashboardSkinTests() {
    console.log("  [Test 11] Testing Modern Dashboard Skin, Collapsible Semesters & UX Toast...");

    // Mock DOM environment
    const createdElements = [];
    const listeners = {};

    function createMockElement(tag) {
        const el = {
            tagName: tag.toUpperCase(),
            id: "",
            className: "",
            innerHTML: "",
            textContent: "",
            style: {},
            classList: {
                classes: new Set(),
                add(c) { this.classes.add(c); },
                remove(c) { this.classes.delete(c); },
                toggle(c) {
                    if (this.classes.has(c)) { this.classes.delete(c); return false; }
                    else { this.classes.add(c); return true; }
                },
                contains(c) { return this.classes.has(c); }
            },
            children: [],
            appendChild(child) {
                this.children.push(child);
                return child;
            },
            addEventListener(event, fn) {
                if (!listeners[event]) listeners[event] = [];
                listeners[event].push(fn);
            },
            querySelector(sel) {
                if (sel === ".stat-cgpa") return createMockElement("div");
                if (sel === "#ktuToggleAllSems") return createMockElement("button");
                if (sel === ".ktu-sem-chevron") return createMockElement("span");
                return null;
            },
            querySelectorAll(sel) {
                if (sel === ".ktu-sem-header") return [createMockElement("div")];
                if (sel === ".ktu-sem-block") return [createMockElement("div")];
                return [];
            },
            closest() {
                return createMockElement("div");
            }
        };
        createdElements.push(el);
        return el;
    }

    global.document = {
        body: createMockElement("body"),
        createElement: createMockElement,
        getElementById(id) {
            return createdElements.find(e => e.id === id) || null;
        }
    };

    const mockPayload = {
        studentInfo: {
            name: "GOVIND S R",
            registerNo: "CEA20CS026",
            branch: "Computer Science & Engineering",
            scheme: "2019",
            admissionYear: "2020",
            isLateral: false,
            college: "College of Engineering Attingal"
        },
        semesterData: [
            { code: "MAT101", name: "Linear Algebra", credits: 4, grade: "A", semester: "S1" },
            { code: "CYT100", name: "Engineering Chemistry", credits: 4, grade: "S", semester: "S1" }
        ]
    };

    const mockMetrics = {
        cgpa: 8.55,
        totalPoints: 68.4,
        totalGradedCredits: 8,
        totalEarnedCredits: 8,
        targetCredits: 160,
        creditPercent: 5,
        activeBacklogs: 0,
        backlogCredits: 0,
        semesters: {
            S1: { sgpa: 8.55, earnedCredits: 8, backlogs: 0 }
        },
        comebackProjections: {
            minP: 8.55, maxD: 8.55, maxC: 8.55, maxCPlus: 8.55,
            maxB: 8.55, maxBPlus: 8.55, maxA: 8.55, maxAPlus: 8.55, maxS: 8.55
        },
        honorsMinors: {
            honorsEligible: true,
            minorsEligible: true
        },
        activitySummary: {
            completed: 100,
            target: 100,
            percent: 100
        }
    };

    const container = dashboardSkin.renderModernDashboard(mockPayload, mockMetrics);
    assert(container, "Dashboard container must be rendered");
    assert(container.innerHTML.includes("GOVIND S R"), "Student name must be in dashboard HTML");
    assert(container.innerHTML.includes("CEA20CS026"), "Register no must be in dashboard HTML");
    assert(container.innerHTML.includes("8.55"), "CGPA must be in dashboard HTML");
    assert(container.innerHTML.includes("Zero Active Backlogs"), "Must show celebration banner when backlogs === 0");
    assert(container.innerHTML.includes("KTU Honors Eligible"), "Must show Honors badge when eligible");
    assert(container.innerHTML.includes("ktu-sem-toggle-all-btn"), "Must include expand/collapse all button");

    // Test Toast utility
    dashboardSkin.showToast("Test Toast Notification");
    const toastEl = global.document.getElementById("ktu-supercharger-toast");
    assert(toastEl, "Toast element must be created");
    assert.strictEqual(toastEl.textContent, "Test Toast Notification");
    assert.strictEqual(toastEl.classList.contains("show"), true, "Toast must have 'show' class");

    console.log("  ✅ Modern Dashboard Skin & UX verified 100%!");
}

module.exports = runDashboardSkinTests;
