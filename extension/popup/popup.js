/**
 * KTU Supercharger - Popup Controller
 */

(function () {
    "use strict";

    const storage = window.KTU_STORAGE;
    const calculator = window.KTU_CALCULATOR;
    const bridge = window.KTU_BRIDGE;

    let cachedSnapshot = null;

    async function initPopup() {
        if (!storage) return;

        cachedSnapshot = await storage.getLatestSnapshot();

        const elName = document.getElementById("vaultStudentName");
        const elReg = document.getElementById("vaultStudentReg");
        const elCgpa = document.getElementById("vCgpa");
        const elCourses = document.getElementById("vCourses");
        const elBacklogs = document.getElementById("vBacklogs");
        const elTime = document.getElementById("vaultSyncTime");

        if (!cachedSnapshot || !cachedSnapshot.studentInfo) {
            if (elName) elName.textContent = "No Scorecard Captured Yet";
            if (elReg) elReg.textContent = "Open KTU portal to capture automatically.";
            if (elTime) elTime.textContent = "";
            return;
        }

        const sInfo = cachedSnapshot.studentInfo || {};
        const sData = cachedSnapshot.semesterData || [];
        const metrics = calculator ? calculator.calculateAcademicMetrics(sData, sInfo) : { cgpa: 0, activeBacklogs: 0 };

        if (elName) elName.textContent = sInfo.name || "KTU Student";
        if (elReg) elReg.textContent = `${sInfo.registerNo || ""} • ${sInfo.branch || ""}`;
        if (elCgpa) elCgpa.textContent = metrics.cgpa.toFixed(2);
        if (elCourses) elCourses.textContent = sData.length;
        if (elBacklogs) elBacklogs.textContent = metrics.activeBacklogs;
        if (elTime) {
            const date = new Date(cachedSnapshot.lastSavedAt || cachedSnapshot.timestamp || Date.now());
            elTime.textContent = `Saved: ${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }
    }

    document.getElementById("btnPopupOpenPwa")?.addEventListener("click", () => {
        if (cachedSnapshot && bridge) {
            bridge.launchPwaWithPayload(cachedSnapshot);
        } else {
            window.open("https://kturesults.govindsr.me/", "_blank");
        }
    });

    document.getElementById("btnPopupGoKtu")?.addEventListener("click", () => {
        window.open("https://app.ktu.edu.in/login.htm", "_blank");
    });

    document.addEventListener("DOMContentLoaded", initPopup);
})();
