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

    async function init() {
        const route = preflight.getRoute();

        if (route === "login") {
            if (loginSkin) loginSkin.enhanceLoginPage();
            return;
        }

        if (route === "student_details") {
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

            // --- 2. RENDER EXECUTIVE IN-PORTAL SKIN (Auto-Modern Option A) ---
            renderSkin();
        }
    }

    function renderSkin() {
        if (!activePayload || !activeMetrics) return;

        // Locate KTU's native accordion container
        const nativeContainer = document.querySelector("#collapseFive")?.closest(".panel-group, .container") ||
                                document.querySelector(".panel-group, #page-wrapper .container");

        // Render Toolbar
        toolbar.renderToolbar(activePayload, {
            onOpenPwa: () => {
                bridge.launchPwaWithPayload(activePayload);
            },
            onExportJson: () => {
                downloadJsonBackup(activePayload);
            },
            onToggleView: () => {
                toggleView(nativeContainer);
            }
        });

        // Render Modern Dashboard
        const modernRoot = dashboardSkin.renderModernDashboard(activePayload, activeMetrics);

        // Auto-Modern by default: Hide native container, show modern skin
        if (nativeContainer && modernRoot) {
            nativeContainer.style.display = "none";
            modernRoot.style.display = "block";
            isModernViewActive = true;
            updateToggleLabel();
        }
    }

    function toggleView(nativeContainer) {
        const modernRoot = document.getElementById("ktu-supercharger-container");
        isModernViewActive = !isModernViewActive;

        if (isModernViewActive) {
            if (nativeContainer) nativeContainer.style.display = "none";
            if (modernRoot) modernRoot.style.display = "block";
        } else {
            if (nativeContainer) nativeContainer.style.display = "";
            if (modernRoot) modernRoot.style.display = "none";
        }
        updateToggleLabel();
    }

    function updateToggleLabel() {
        const lbl = document.getElementById("ktuToggleLabel");
        if (lbl) {
            lbl.textContent = isModernViewActive ? "🔄 Classic Table" : "✨ Modern Executive";
        }
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
