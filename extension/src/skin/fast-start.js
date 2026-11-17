/**
 * KTU Supercharger - Fast-Start Zero-Flash Shield
 * Executes at document_start before KTU scripts or DOM parse.
 */

(function () {
    "use strict";

    // 1. Tag documentElement immediately for instant CSS suppression of KTU's security modal
    if (document.documentElement) {
        document.documentElement.classList.add("ktu-bypass-login-modal");
    }

    // 2. Pre-seed sessionStorage so KTU's jQuery script:
    //    if (!sessionStorage.getItem('welcomeModalShown')) { $('#welcomeModal').modal('show'); }
    // never triggers the modal in the first place!
    try {
        if (typeof sessionStorage !== "undefined") {
            sessionStorage.setItem("welcomeModalShown", "true");
        }
    } catch (e) {
        // Restricted storage context
    }

    // 3. Verify Master Power switch in background; if explicitly disabled by user, remove bypass
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(["ktu_supercharger_master_power"], (res) => {
            if (res && res.ktu_supercharger_master_power === false) {
                if (document.documentElement) {
                    document.documentElement.classList.remove("ktu-bypass-login-modal");
                }
                if (document.body) {
                    document.body.classList.remove("ktu-bypass-login-modal");
                }
                try {
                    sessionStorage.removeItem("welcomeModalShown");
                } catch (e) {}
            }
        });
    }
})();
