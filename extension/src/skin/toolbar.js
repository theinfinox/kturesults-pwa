/**
 * KTU Supercharger - Floating Executive Action Bar
 */

(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.KTU_TOOLBAR = factory();
    }
})(typeof self !== "undefined" ? self : this, function () {

    function renderToolbar(payload, callbacks = {}) {
        if (typeof document === "undefined") return null;

        let bar = document.getElementById("ktu-supercharger-toolbar");
        if (bar) return bar;

        bar = document.createElement("div");
        bar.id = "ktu-supercharger-toolbar";
        bar.className = "ktu-supercharger-toolbar-bar";

        const sInfo = payload?.studentInfo || {};
        const reg = sInfo.registerNo || "STUDENT";
        const name = sInfo.name || "KTU Student";

        bar.innerHTML = `
            <div class="ktu-toolbar-left">
                <div class="ktu-toolbar-brand">
                    <span class="ktu-brand-icon">⚡</span>
                    <span class="ktu-brand-text">KTU Supercharger</span>
                </div>
                <div class="ktu-toolbar-student">
                    <span class="ktu-student-name">${name}</span>
                    <span class="ktu-student-reg">${reg}</span>
                    <span class="ktu-capture-status" title="Scorecard captured locally in memory">
                        <span class="ktu-status-dot"></span> Captured & Offline Ready
                    </span>
                </div>
            </div>
            <div class="ktu-toolbar-actions">
                <button id="ktuBtnOpenPwa" class="ktu-btn ktu-btn-primary" title="Open full degree forecasting & comebacks in KTU PWA">
                    <span>🚀 Open in PWA Forecaster</span>
                </button>
                <button id="ktuBtnSaveHtml" class="ktu-btn ktu-btn-secondary" title="Save & download the raw official KTU HTML page for inspection">
                    <span>💾 Save HTML</span>
                </button>
                <button id="ktuBtnExportJson" class="ktu-btn ktu-btn-secondary" title="Export raw JSON scorecard backup">
                    <span>📥 Export JSON</span>
                </button>
                <button id="ktuBtnToggleView" class="ktu-btn ktu-btn-toggle" title="Switch between Modern Executive View and Classic KTU Table">
                    <span id="ktuToggleLabel">🔄 Classic View</span>
                </button>
            </div>
        `;

        document.body.prepend(bar);

        // Bind Events
        const btnOpenPwa = document.getElementById("ktuBtnOpenPwa");
        if (btnOpenPwa && callbacks.onOpenPwa) {
            btnOpenPwa.addEventListener("click", callbacks.onOpenPwa);
        }

        const btnSaveHtml = document.getElementById("ktuBtnSaveHtml");
        if (btnSaveHtml && callbacks.onSaveHtml) {
            btnSaveHtml.addEventListener("click", callbacks.onSaveHtml);
        }

        const btnExportJson = document.getElementById("ktuBtnExportJson");
        if (btnExportJson && callbacks.onExportJson) {
            btnExportJson.addEventListener("click", callbacks.onExportJson);
        }

        const btnToggleView = document.getElementById("ktuBtnToggleView");
        if (btnToggleView && callbacks.onToggleView) {
            btnToggleView.addEventListener("click", callbacks.onToggleView);
        }

        return bar;
    }

    return {
        renderToolbar
    };
});
