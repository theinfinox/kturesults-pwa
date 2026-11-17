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
        // Master Power Switch Check
        const isMasterEnabled = await storage.isMasterEnabled();
        if (!isMasterEnabled) {
            console.log("[KTU Supercharger] Master switch is OFF. Native KTU portal preserved.");
            return;
        }

        const route = preflight.getRoute(document);

        if (route === "login") {
            if (loginSkin) {
                loginSkin.enhanceLoginPage();
                loginSkin.dismissSecurityWarningModal();
            }
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

            // 1. Instant Masking via Cached Vault Snapshot (< 2ms):
            // If a snapshot exists in storage, mask the site and render immediately!
            try {
                const cached = await storage.getLatestSnapshot();
                if (cached && cached.studentInfo && Array.isArray(cached.semesterData) && cached.semesterData.length > 0) {
                    activePayload = cached;
                    activeMetrics = calculator.calculateAcademicMetrics(activePayload.semesterData, activePayload.studentInfo);
                    renderSkin();
                } else {
                    // Show a temporary sleek loading state so ancient portal does not flash
                    showLoadingMask();
                }
            } catch (e) {
                // Ignore storage lookup error
            }

            // 2. Fresh Background Fetch with active session cookies
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

                        // Re-render skin with latest live data
                        renderSkin();
                        return;
                    }
                }
                // If fetch did not return valid curriculum and no cached payload exists, restore view
                if (!activePayload) {
                    document.body.classList.remove("ktu-supercharger-active");
                }
            } catch (err) {
                console.warn("[KTU Supercharger] Background curriculum fetch note:", err.message);
                if (!activePayload) {
                    document.body.classList.remove("ktu-supercharger-active");
                }
            }
        }
    }

    function showLoadingMask() {
        document.body.classList.add("ktu-supercharger-active");
        let container = document.getElementById("ktu-supercharger-container");
        if (!container) {
            container = document.createElement("div");
            container.id = "ktu-supercharger-container";
            container.className = "ktu-supercharger-skin-root";
            document.body.appendChild(container);
        }
        container.innerHTML = `
            <div class="ktu-dash-card ktu-identity-card" style="text-align: center; padding: 40px 20px;">
                <div style="font-size: 28px; margin-bottom: 12px;">⚡</div>
                <div style="font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 6px;">
                    KTU Supercharger
                </div>
                <div style="font-size: 13.5px; color: #64748b;">
                    Connecting to student curriculum vault & preparing executive dashboard...
                </div>
            </div>
        `;
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

    // Master Switch Message Listener (Real-Time Control from Extension Popup)
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
            if (msg && msg.type === "KTU_TOGGLE_MASTER_POWER") {
                if (msg.enabled) {
                    console.log("[KTU Supercharger] Master switch turned ON. Initializing supercharger...");
                    init();
                } else {
                    console.log("[KTU Supercharger] Master switch turned OFF. Completely unmasking portal...");
                    document.body.classList.remove("ktu-supercharger-active");
                    document.body.classList.remove("ktu-bypass-login-modal");
                    const container = document.getElementById("ktu-supercharger-container");
                    if (container) container.style.display = "none";
                    const bar = document.getElementById("ktu-supercharger-toolbar");
                    if (bar) bar.style.display = "none";
                    const loginPill = document.getElementById("ktu-supercharger-login-badge");
                    if (loginPill) loginPill.style.display = "none";
                }
                sendResponse({ success: true, enabled: msg.enabled });
            }
        });
    }

    // Run on document load
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
