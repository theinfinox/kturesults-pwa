/**
 * KTU Supercharger - Content Script Master Orchestrator
 */

(function () {
    "use strict";

    const preflight = window.KTU_PREFLIGHT;
    const parser = window.KTU_PARSER;
    const calculator = window.KTU_CALCULATOR;
    const storage = window.KTU_STORAGE;
    const bridge = window.KTU_BRIDGE;
    const toolbar = window.KTU_TOOLBAR;
    const dashboardSkin = window.KTU_DASHBOARD_SKIN;
    const loginSkin = window.KTU_LOGIN_SKIN;

    if (!preflight || !parser || !calculator || !storage) {
        console.warn("[KTU Supercharger] Core modules not yet loaded.");
        return;
    }

    let activePayload = null;
    let activeMetrics = null;
    let isModernViewActive = true;
    let rawHtmlCapture = "";

    async function init() {
        const route = preflight.getRoute(document);

        if (route === "login") {
            if (loginSkin) loginSkin.enhanceLoginPage();
            return;
        }

        if (route === "student_details") {
            rawHtmlCapture = document.documentElement ? document.documentElement.outerHTML : "";
            const integrity = preflight.checkPageIntegrity(document);
            if (!integrity.isComplete && !integrity.hasAccordion) {
                console.log("[KTU Supercharger] Not on active curriculum view or page incomplete.");
                return;
            }

            // --- 1. INSTANT SCORECARD CAPTURE (< 50ms) ---
            activePayload = parser.parseFullDocument(document);
            activeMetrics = calculator.calculateAcademicMetrics(activePayload.semesterData, activePayload.studentInfo);

            // Persist to local crash-proof vault
            const saveRes = await storage.saveSnapshot(activePayload);
            if (!saveRes.success) {
                console.warn("[KTU Supercharger] Snapshot save note:", saveRes.message || saveRes.reason);
            } else {
                console.log(`[KTU Supercharger] Successfully captured ${saveRes.coursesSaved} courses in offline vault.`);
            }

            // --- 2. RENDER EXECUTIVE IN-PORTAL SKIN (Entire Site Masking) ---
            renderSkin();
            return;
        }

        // Post-login / Dashboard / Home page support: auto-fetch curriculum in background
        if (route === "authenticated_home" || route === "dashboard") {
            console.log("[KTU Supercharger] Authenticated portal dashboard/home detected. Fetching curriculum...");
            try {
                const res = await fetch("/eu/stu/studentDetailsView.htm", { credentials: "same-origin" });
                if (res.ok) {
                    const html = await res.text();
                    rawHtmlCapture = html;
                    const parserDom = new DOMParser().parseFromString(html, "text/html");
                    const integrity = preflight.checkPageIntegrity(parserDom);
                    if (integrity.hasAccordion || integrity.hasProfile) {
                        activePayload = parser.parseFullDocument(parserDom);
                        activeMetrics = calculator.calculateAcademicMetrics(activePayload.semesterData, activePayload.studentInfo);
                        await storage.saveSnapshot(activePayload);
                        console.log(`[KTU Supercharger] Background fetch captured ${activePayload.semesterData.length} courses!`);

                        // Render the modern skin directly over the home page!
                        renderSkin();
                    }
                }
            } catch (err) {
                console.warn("[KTU Supercharger] Background curriculum fetch note:", err.message);
            }
        }
    }

    function renderSkin() {
        if (!activePayload || !activeMetrics) return;

        // Render Toolbar
        toolbar.renderToolbar(activePayload, {
            onOpenPwa: () => {
                bridge.launchPwaWithPayload(activePayload);
            },
            onSaveHtml: () => {
                downloadHtmlBackup();
            },
            onExportJson: () => {
                downloadJsonBackup(activePayload);
            },
            onToggleView: () => {
                toggleView();
            }
        });

        // Render Modern Dashboard
        const modernRoot = dashboardSkin.renderModernDashboard(activePayload, activeMetrics);

        // Entirely mask the whole KTU site:
        // Set body class so all native navbars, sidebars, headers, and footers are hidden!
        document.body.classList.add("ktu-supercharger-active");
        if (modernRoot) modernRoot.style.display = "block";
        isModernViewActive = true;
        updateToggleLabel();
    }

    function toggleView() {
        const modernRoot = document.getElementById("ktu-supercharger-container");
        isModernViewActive = !isModernViewActive;

        if (isModernViewActive) {
            // Mask entire native site; show modern PWA skin
            document.body.classList.add("ktu-supercharger-active");
            if (modernRoot) modernRoot.style.display = "block";
        } else {
            // Restore entire native site; unmask all KTU menus, sidebars, and tables
            document.body.classList.remove("ktu-supercharger-active");
            if (modernRoot) modernRoot.style.display = "none";
        }
        updateToggleLabel();
    }

    function updateToggleLabel() {
        const lbl = document.getElementById("ktuToggleLabel");
        if (lbl) {
            lbl.textContent = isModernViewActive ? "🔄 Classic KTU Portal" : "✨ Modern Result View";
        }
    }

    function downloadHtmlBackup() {
        const reg = (activePayload?.studentInfo?.registerNo || "STUDENT").toUpperCase();
        const filename = `KTU_Curriculum_Raw_${reg}.html`;
        const htmlToSave = rawHtmlCapture || (document.documentElement ? document.documentElement.outerHTML : "");
        const blob = new Blob([htmlToSave], { type: "text/html;charset=utf-8" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    function downloadJsonBackup(payload) {
        const reg = (payload.studentInfo?.registerNo || "STUDENT").toUpperCase();
        const filename = `KTU_Scorecard_${reg}_${new Date().toISOString().split("T")[0]}.json`;
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    // Run on document load
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
