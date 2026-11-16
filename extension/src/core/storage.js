/**
 * KTU Supercharger - Storage & Crash-Proof Snapshot Vault
 * Dual-environment compatible: Browser window + Node.js test environment
 */

(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.KTU_STORAGE = factory();
    }
})(typeof self !== "undefined" ? self : this, function () {
    const STORAGE_KEY_PREFIX = "ktu_supercharger_snap_";
    const ACTIVE_STUDENT_KEY = "ktu_supercharger_active";

    // In-memory fallback if neither chrome.storage nor localStorage is available (e.g. testing)
    let memoryStore = {};

    function isChromeStorageAvailable() {
        return typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;
    }

    function isLocalStorageAvailable() {
        try {
            return typeof localStorage !== "undefined" && localStorage !== null;
        } catch (e) {
            return false;
        }
    }

    async function setItem(key, value) {
        if (isChromeStorageAvailable()) {
            return new Promise((resolve) => {
                chrome.storage.local.set({ [key]: value }, () => resolve());
            });
        } else if (isLocalStorageAvailable()) {
            localStorage.setItem(key, JSON.stringify(value));
            return Promise.resolve();
        } else {
            memoryStore[key] = value;
            return Promise.resolve();
        }
    }

    async function getItem(key) {
        if (isChromeStorageAvailable()) {
            return new Promise((resolve) => {
                chrome.storage.local.get([key], (result) => resolve(result[key] || null));
            });
        } else if (isLocalStorageAvailable()) {
            const raw = localStorage.getItem(key);
            try {
                return Promise.resolve(raw ? JSON.parse(raw) : null);
            } catch (e) {
                return Promise.resolve(null);
            }
        } else {
            return Promise.resolve(memoryStore[key] || null);
        }
    }

    /**
     * Anti-Degradation Snapshot Saver
     * Protects existing valid records from being overwritten by 504 / empty / truncated responses
     */
    async function saveSnapshot(payload, options = {}) {
        if (!payload || !payload.studentInfo) {
            return { success: false, reason: "invalid_payload" };
        }

        const regNo = (payload.studentInfo.registerNo || "STUDENT").toUpperCase().trim();
        const key = `${STORAGE_KEY_PREFIX}${regNo}`;
        const newCourseCount = Array.isArray(payload.semesterData) ? payload.semesterData.length : 0;

        // Pre-flight Anti-Degradation Check
        const existing = await getItem(key);
        if (existing && !options.force) {
            const oldCourseCount = Array.isArray(existing.semesterData) ? existing.semesterData.length : 0;
            if (oldCourseCount > 0 && newCourseCount === 0) {
                return {
                    success: false,
                    reason: "anti_degradation_blocked",
                    message: `Blocked overwrite: cached record has ${oldCourseCount} courses, but new page returned 0 courses. Retaining existing snapshot.`,
                    retainedSnapshot: existing
                };
            }
        }

        const snapshot = {
            ...payload,
            lastSavedAt: new Date().toISOString()
        };

        await setItem(key, snapshot);
        await setItem(ACTIVE_STUDENT_KEY, regNo);

        return {
            success: true,
            snapshot,
            coursesSaved: newCourseCount
        };
    }

    async function getLatestSnapshot(regNo = null) {
        let targetReg = regNo;
        if (!targetReg) {
            targetReg = await getItem(ACTIVE_STUDENT_KEY);
        }
        if (!targetReg) return null;
        const key = `${STORAGE_KEY_PREFIX}${targetReg.toUpperCase().trim()}`;
        return await getItem(key);
    }

    function _resetMemoryStore() {
        memoryStore = {};
    }

    return {
        saveSnapshot,
        getLatestSnapshot,
        setItem,
        getItem,
        _resetMemoryStore
    };
});
