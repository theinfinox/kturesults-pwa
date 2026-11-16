/**
 * KTU Supercharger - Login Page Enhancer (Option A: Safe & Minimalist)
 * Injects non-intrusive status indicators without touching Turnstile or security modals
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
            <span class="ktu-pill-sub">• Auto-Capture Ready</span>
        `;

        // Insert gently right above the username field
        targetForm.insertBefore(badge, targetForm.firstChild);
    }

    return {
        enhanceLoginPage
    };
});
