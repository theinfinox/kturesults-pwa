/**
 * Extension Test Suite - Storage & Anti-Degradation Tests
 */

const assert = require("assert");
const storage = require("../src/core/storage");

async function runStorageTests() {
    console.log("  [Test 7] Testing Snapshot Persistence & Retrieval...");
    storage._resetMemoryStore();

    const samplePayload = {
        studentInfo: { registerNo: "CEA20CS026", name: "GOVIND S R" },
        semesterData: [
            { code: "MAT101", credits: 4, grade: "A" },
            { code: "CYT100", credits: 4, grade: "S" }
        ]
    };

    const saveRes = await storage.saveSnapshot(samplePayload);
    assert.strictEqual(saveRes.success, true, "Snapshot save must succeed");
    assert.strictEqual(saveRes.coursesSaved, 2, "Must save 2 courses");

    const retrieved = await storage.getLatestSnapshot("CEA20CS026");
    assert(retrieved, "Retrieved snapshot must not be null");
    assert.strictEqual(retrieved.studentInfo.name, "GOVIND S R");
    assert.strictEqual(retrieved.semesterData.length, 2);

    console.log("  [Test 8] Testing Anti-Degradation Shield Against Truncated / 504 Responses...");
    // A broken server response with 0 courses tries to overwrite the valid snapshot
    const brokenPayload = {
        studentInfo: { registerNo: "CEA20CS026", name: "GOVIND S R" },
        semesterData: []
    };

    const blockedRes = await storage.saveSnapshot(brokenPayload);
    assert.strictEqual(blockedRes.success, false, "Must block overwrite of valid snapshot by empty response");
    assert.strictEqual(blockedRes.reason, "anti_degradation_blocked");

    // Verify existing snapshot remained intact
    const verifyRetained = await storage.getLatestSnapshot("CEA20CS026");
    assert.strictEqual(verifyRetained.semesterData.length, 2, "Valid 2-course snapshot must be retained");

    console.log("  ✅ Storage & Anti-Degradation tests passed 100%!");
}

module.exports = runStorageTests;
