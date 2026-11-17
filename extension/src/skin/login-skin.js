/**
 * KTU Supercharger - Login Page Enhancer & Auto-Dismiss Security Modal
 */

(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.KTU_LOGIN_SKIN = factory();
    }
})(typeof self !== "undefined" ? self : this, function () {

    function enhanceLoginPage() {
        if (typeof document === "undefined") return;

        // Prevent duplicate injection
        if (document.getElementById("ktu-supercharger-login-badge")) return;

        const targetForm = document.querySelector("form[name='loginform'], .form-signin, #loginForm");
        if (!targetForm) return;

        const badge = document.createElement("div");
        badge.id = "ktu-supercharger-login-badge";
        badge.className = "ktu-supercharger-login-pill";
        badge.innerHTML = `
            <span class="ktu-pill-dot"></span>
            <span class="ktu-pill-title">KTU Supercharger Active</span>
            <span class="ktu-pill-sub">• Security Modal Auto-Bypassed</span>
        `;

        // Insert gently right above the username field
        targetForm.insertBefore(badge, targetForm.firstChild);
    }

    function dismissSecurityWarningModal() {
        if (typeof document === "undefined") return;

        // 1. Tag body for instant CSS hiding
        if (document.body) {
            document.body.classList.add("ktu-bypass-login-modal");
            document.body.classList.remove("modal-open");
            document.body.style.paddingRight = "";
            document.body.style.overflow = "auto";
        }

        // 2. Pre-seed sessionStorage so KTU's own script never attempts to call .modal('show')
        try {
            if (typeof sessionStorage !== "undefined") {
                sessionStorage.setItem("welcomeModalShown", "true");
            }
        } catch (e) {
            // Ignore restricted storage
        }

        function executeDismiss() {
            const chk = document.getElementById("understandCheckbox");
            const okBtn = document.getElementById("modalOkBtn");
            const modal = document.getElementById("welcomeModal");

            if (chk && !chk.checked) {
                chk.checked = true;
                chk.dispatchEvent(new Event("change", { bubbles: true }));
            }

            if (okBtn) {
                okBtn.disabled = false;
                okBtn.click();
            }

            if (modal) {
                modal.classList.remove("in");
                modal.setAttribute("aria-hidden", "true");
                modal.style.display = "none";
            }

            const backdrops = document.querySelectorAll(".modal-backdrop");
            backdrops.forEach(b => b.remove());

            if (document.body) {
                document.body.classList.remove("modal-open");
                document.body.style.paddingRight = "";
                document.body.style.overflow = "auto";
            }
        }

        executeDismiss();

        // 3. Staggered micro-retries to ensure late-loading jQuery scripts don't flash the modal
        const timers = [50, 150, 300, 600];
        timers.forEach(delay => {
            setTimeout(executeDismiss, delay);
        });

        // 4. MutationObserver backup if modal is dynamically shown/inserted
        if (typeof MutationObserver !== "undefined" && document.body) {
            const observer = new MutationObserver(() => {
                const modal = document.getElementById("welcomeModal");
                if (modal && (modal.classList.contains("in") || modal.style.display === "block")) {
                    executeDismiss();
                }
            });
            observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style"] });
            setTimeout(() => observer.disconnect(), 4000);
        }
    }

    return {
        enhanceLoginPage,
        dismissSecurityWarningModal
    };
});
