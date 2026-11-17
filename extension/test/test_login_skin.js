/**
 * Extension Test Suite - Login Skin & Security Modal Bypass Tests
 */

const assert = require("assert");
const loginSkin = require("../src/skin/login-skin");

function runLoginSkinTests() {
    console.log("  [Test 10] Testing KTU Security Warning Modal Auto-Bypass...");

    // Mock DOM environment
    const fakeBackdrop = {
        removeCalled: false,
        remove() { this.removeCalled = true; }
    };

    let checkboxChanged = false;
    let okBtnClicked = false;
    let sessionStorageStore = {};

    global.sessionStorage = {
        setItem(k, v) { sessionStorageStore[k] = v; },
        getItem(k) { return sessionStorageStore[k] || null; }
    };

    const mockModal = {
        id: "welcomeModal",
        classList: {
            classes: new Set(["in", "modal"]),
            contains(c) { return this.classes.has(c); },
            remove(c) { this.classes.delete(c); }
        },
        style: { display: "block" },
        setAttribute() {}
    };

    const mockCheckbox = {
        id: "understandCheckbox",
        checked: false,
        dispatchEvent(e) {
            if (e.type === "change") checkboxChanged = true;
        }
    };

    const mockOkBtn = {
        id: "modalOkBtn",
        disabled: true,
        click() { okBtnClicked = true; }
    };

    global.document = {
        body: {
            classList: {
                classes: new Set(["modal-open"]),
                add(c) { this.classes.add(c); },
                remove(c) { this.classes.delete(c); },
                contains(c) { return this.classes.has(c); }
            },
            style: { paddingRight: "15px", overflow: "hidden" }
        },
        getElementById(id) {
            if (id === "welcomeModal") return mockModal;
            if (id === "understandCheckbox") return mockCheckbox;
            if (id === "modalOkBtn") return mockOkBtn;
            return null;
        },
        querySelectorAll(sel) {
            if (sel.includes("modal-backdrop")) return [fakeBackdrop];
            return [];
        }
    };

    global.Event = function(type) { this.type = type; };

    // Execute auto-dismiss
    loginSkin.dismissSecurityWarningModal();

    assert.strictEqual(sessionStorage.getItem("welcomeModalShown"), "true", "Must pre-seed sessionStorage to prevent modal display");
    assert.strictEqual(mockCheckbox.checked, true, "Checkbox must be checked automatically");
    assert.strictEqual(checkboxChanged, true, "Checkbox change event must be dispatched");
    assert.strictEqual(okBtnClicked, true, "Modal OK button must be clicked");
    assert.strictEqual(mockModal.style.display, "none", "Modal must be hidden");
    assert.strictEqual(document.body.classList.contains("ktu-bypass-login-modal"), true, "Body must have bypass class");
    assert.strictEqual(document.body.classList.contains("modal-open"), false, "modal-open must be removed");
    assert.strictEqual(fakeBackdrop.removeCalled, true, "Modal backdrop must be purged");

    console.log("  ✅ Security Modal Auto-Bypass verified 100%!");
}

module.exports = runLoginSkinTests;
