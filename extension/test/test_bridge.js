/**
 * Extension Test Suite - PWA Bridge Tests
 */

const assert = require("assert");
const bridge = require("../src/core/bridge");

function runBridgeTests() {
    console.log("  [Test 9] Testing PWA URL Fragment Payload Encoding & Decoding...");

    const testPayload = {
        studentInfo: { registerNo: "CEA20CS026", name: "GOVIND S R" },
        semesterData: [
            { code: "MAT101", credits: 4, grade: "A" }
        ],
        timestamp: "2026-11-17T00:00:00Z"
    };

    const encoded = bridge.encodePayload(testPayload);
    assert(encoded && typeof encoded === "string", "Encoded payload must be non-empty string");

    const decoded = bridge.decodePayload(encoded);
    assert(decoded, "Decoded payload must not be null");
    assert.strictEqual(decoded.studentInfo.registerNo, "CEA20CS026");
    assert.strictEqual(decoded.semesterData.length, 1);
    assert.strictEqual(decoded.semesterData[0].credit, 4, "Must normalize credit field for PWA");
    assert.strictEqual(decoded.semesterData[0].credits, 4, "Must normalize credits field");
    assert.strictEqual(decoded.semesterData[0].subject, "MAT101", "Must populate subject string for PWA");
    assert.strictEqual(decoded.source, "ktu_supercharger_extension");

    const syncUrl = bridge.getPwaSyncUrl(testPayload);
    assert(syncUrl.startsWith("https://kturesults.govindsr.me/#ext_sync="), "Sync URL must start with target PWA domain");

    console.log("  ✅ PWA Bridge tests passed 100%!");
}

module.exports = runBridgeTests;
