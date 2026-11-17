/**
 * KTU Supercharger - PWA Communication Bridge
 * Dual-environment compatible: Browser window + Node.js test environment
 */

(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        const constants = require("./constants");
        module.exports = factory(constants);
    } else {
        root.KTU_BRIDGE = factory(root.KTU_CONSTANTS);
    }
})(typeof self !== "undefined" ? self : this, function (constants) {
    const PWA_BASE_URL = (constants && constants.PWA_TARGET_URL) || "https://kturesults.govindsr.me/";

    function safeBtoa(str) {
        if (typeof btoa === "function") {
            return btoa(unescape(encodeURIComponent(str)));
        } else if (typeof Buffer !== "undefined") {
            return Buffer.from(str, "utf-8").toString("base64");
        }
        return encodeURIComponent(str);
    }

    function safeAtob(b64) {
        if (typeof atob === "function") {
            return decodeURIComponent(escape(atob(b64)));
        } else if (typeof Buffer !== "undefined") {
            return Buffer.from(b64, "base64").toString("utf-8");
        }
        return decodeURIComponent(b64);
    }

    function encodePayload(payload) {
        if (!payload) return "";
        const rawSemesterData = payload.semesterData || [];
        const normalizedSemesterData = rawSemesterData.map(item => {
            const credit = Number(item.credit !== undefined ? item.credit : (item.credits !== undefined ? item.credits : 0)) || 0;
            const code = (item.code || "").toUpperCase();
            const name = item.name || code;
            let subject = item.subject || "";
            if (!subject && (code || name)) {
                subject = code && name && code !== name ? `${code} - ${name}` : (name || code);
            }
            return {
                semester: item.semester || "S1",
                subject,
                credit,
                credits: credit,
                grade: item.grade || "-",
                slot: item.slot || "",
                code: code || (subject.split("-")[0]?.trim() || ""),
                name: name || (subject.split("-").slice(1).join("-").trim() || subject),
                isAudit: Boolean(item.isAudit),
                isBacklog: Boolean(item.isBacklog),
                isPending: Boolean(item.isPending)
            };
        });

        const sInfo = { ...(payload.studentInfo || {}) };
        if (!sInfo.name || /Technological\s*University/i.test(sInfo.name)) {
            sInfo.name = sInfo.registerNo || "KTU Student";
        }

        const jsonStr = JSON.stringify({
            studentInfo: sInfo,
            semesterData: normalizedSemesterData,
            activityPoints: sInfo.activityPoints !== undefined ? sInfo.activityPoints : null,
            lastScraped: payload.timestamp || new Date().toISOString(),
            source: "ktu_supercharger_extension"
        });
        return safeBtoa(jsonStr);
    }

    function decodePayload(encodedStr) {
        if (!encodedStr) return null;
        try {
            const raw = safeAtob(encodedStr);
            return JSON.parse(raw);
        } catch (e) {
            return null;
        }
    }

    function getPwaSyncUrl(payload) {
        const encoded = encodePayload(payload);
        return `${PWA_BASE_URL}#ext_sync=${encodeURIComponent(encoded)}`;
    }

    function launchPwaWithPayload(payload) {
        const url = getPwaSyncUrl(payload);
        if (typeof window !== "undefined" && typeof window.open === "function") {
            window.open(url, "_blank");
        }
        return url;
    }

    return {
        encodePayload,
        decodePayload,
        getPwaSyncUrl,
        launchPwaWithPayload
    };
});
