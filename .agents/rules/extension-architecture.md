---
description: Mandatory rules and invariants for the KTU Supercharger Browser Extension (/extension)
globs: extension/**/*
---

# 🧩 KTU Supercharger Extension Architecture & Guidelines

The `/extension` directory contains the **KTU Supercharger Browser Extension** (Manifest V3), an in-portal companion to the KTU CGPA Standalone PWA.

## Core Directives & Invariants:

1. **Non-Destructive Isolation**:
   - The extension code must remain strictly contained inside `/extension/`.
   - Never break or modify root PWA functionality without testing both the root test suite (`npm test`) and the extension test suite (`node extension/test/run_tests.js`).

2. **Turnstile & Login Safety Invariant**:
   - On `app.ktu.edu.in/login.htm`, the extension must **NEVER** hide, intercept, alter, or automate Cloudflare Turnstile (`.cf-turnstile`), `#welcomeModal`, `#understandCheckbox`, or form submission.
   - Respect strict AI safety guidelines: never script automated CAPTCHA bypasses.

3. **Instant Scorecard Capture & Anti-Degradation**:
   - On `studentDetailsView.htm`, extract academic tables as early as possible (`DOMContentLoaded`) into `chrome.storage.local`.
   - Never overwrite a valid cached snapshot with a blank or truncated view (`newCoursesCount >= cachedCoursesCount` rule).

4. **Unified Storage Parity with PWA**:
   - The extension transfers data to `kturesults.govindsr.me` via URL fragment (`#ext_sync=<base64_json>`).
   - The PWA receives, stores in `localStorage`, and cleans the URL fragment via `history.replaceState`.

5. **Standalone Test Suite**:
   - All parser, calculation, storage, and bridge logic in the extension must be verified via:
     ```bash
     node extension/test/run_tests.js
     ```
   - Must maintain 100% test passing status.

6. **Incremental Milestone Tracking**:
   - Every enhancement to the extension or PWA must be recorded incrementally in `milestones.md` without clearing previous history.
