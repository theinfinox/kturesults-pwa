/**
 * KTU Supercharger Extension Test Runner
 * Zero external runtime dependencies. Runs directly with Node.js:
 * node extension/test/run_tests.js
 */

const runParserTests = require("./test_parser");
const runCalculatorTests = require("./test_calculator");
const runStorageTests = require("./test_storage");
const runBridgeTests = require("./test_bridge");

async function runAll() {
    console.log("=================================================");
    console.log("⚡ KTU SUPERCHARGER EXTENSION TEST SUITE");
    console.log("=================================================\n");

    try {
        runParserTests();
        runCalculatorTests();
        await runStorageTests();
        runBridgeTests();

        console.log("\n=================================================");
        console.log("🎉 ALL EXTENSION MODULE TESTS PASSED 100%!");
        console.log("=================================================");
        process.exit(0);
    } catch (err) {
        console.error("\n❌ TEST SUITE FAILED:", err.message);
        console.error(err.stack);
        process.exit(1);
    }
}

runAll();
