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

    function getRoute() {
        if (typeof window === "undefined" || !window.location) return "unknown";
        const path = window.location.pathname.toLowerCase();
        if (path.includes("login.htm") || path === "" || path === "/") {
            return "login";
        }
        if (path.includes("studentdetailsview.htm") || path.includes("studentdetailsview")) {
            return "student_details";
        }
        return "other";
    }

    function checkPageIntegrity(doc) {
        if (!doc) return { isComplete: false, reason: "missing_document" };
        const route = getRoute();

        if (route === "student_details") {
            const hasAccordion = !!doc.querySelector("[id^='collapseFiveS'], [id*='collapseFiveS'], [id^='collapseFive']");
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

        return { isComplete: true, reason: "general_page" };
    }

    return {
        getRoute,
        checkPageIntegrity
    };
});
