/**
 * KTU Supercharger - Pre-Flight Route & Health Inspector
 */

(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.KTU_PREFLIGHT = factory();
    }
})(typeof self !== "undefined" ? self : this, function () {

    function getRoute(doc = (typeof document !== "undefined" ? document : null)) {
        if (typeof window === "undefined" || !window.location) return "unknown";
        const path = window.location.pathname.toLowerCase();
        if (path.includes("login.htm") || path === "" || path === "/") {
            return "login";
        }
        if (path.includes("studentdetailsview.htm") || path.includes("studentdetailsview")) {
            return "student_details";
        }
        
        // Detect if user is logged into KTU portal on any internal page (e.g. /home.htm, /eu/core/home.htm)
        if (doc) {
            const hasLogout = !!doc.querySelector("a[href*='logout'], a[href*='Logout'], #logout, .glyphicon-log-out, .dropdown-user");
            const hasUserNav = !!doc.querySelector(".navbar, .nav-user, .user-profile, #page-wrapper");
            if (hasLogout || hasUserNav) {
                return "authenticated_home";
            }
        }
        
        return "other";
    }

    function checkPageIntegrity(doc) {
        if (!doc) return { isComplete: false, reason: "missing_document" };
        const route = getRoute(doc);

        if (route === "student_details") {
            const hasAccordion = !!doc.querySelector("[id^='collapseFiveS'], [id*='collapseFiveS'], [id^='collapseFive'], a[href*='collapseFive']");
            const hasProfile = !!doc.querySelector(".list-group-item, .panel-heading");
            return {
                isComplete: hasAccordion || hasProfile,
                hasAccordion,
                hasProfile,
                reason: hasAccordion ? "valid_curriculum" : (hasProfile ? "profile_only" : "missing_curriculum")
            };
        }

        if (route === "login") {
            const hasLoginForm = !!doc.querySelector("form[name='loginform'], #loginForm, input[name='username']");
            const hasTurnstile = !!doc.querySelector(".cf-turnstile, [data-sitekey]");
            return {
                isComplete: hasLoginForm,
                hasLoginForm,
                hasTurnstile,
                reason: hasLoginForm ? "valid_login" : "missing_login_form"
            };
        }

        if (route === "authenticated_home") {
            return {
                isComplete: true,
                hasAccordion: false,
                hasProfile: true,
                reason: "authenticated_home"
            };
        }

        return { isComplete: true, reason: "general_page" };
    }

        return { isComplete: true, reason: "general_page" };
    }

    return {
        getRoute,
        checkPageIntegrity
    };
});
