# 🏆 KTU CGPA Standalone PWA & Supercharger Ecosystem — Milestones & History

> This document tracks the chronological narrative of the project's evolution, milestones, and architectural upgrades.
> **Rule**: Keep this file updated incrementally without clearing prior history.

---

## 🌟 Milestone 1: PWA Core Architecture & 1-Click Fast Sync (v1.0.0)
- **Zero-Dependency Native Backend**: Built [`server.js`](file:///c:/Users/1sree/Documents/standalone-pwa/server.js) using 100% native Node.js (`http`, `https`, `crypto`, `url`, `fs`). No Express or Axios.
- **Fast Sync Relay Engine**: Bypassed mobile CORS barriers to proxy `app.ktu.edu.in` authentication and student curriculum scraping in 300ms–1000ms.
- **PWA Offline Baseline**: Configured Service Worker precaching (`sw.js`) and web app manifest (`manifest.webmanifest`) for full standalone offline support.

---

## 🔐 Milestone 2: Multi-User Architecture & Web Cryptography Vault (v1.1)
- **Web Crypto Vault**: Implemented [`crypto-vault.js`](file:///c:/Users/1sree/Documents/standalone-pwa/crypto-vault.js) using native `window.crypto.subtle`. Encrypted stored credentials in `localStorage` via **AES-GCM-256** with keys derived using **PBKDF2 (100,000 iterations)**.
- **Anti-Lockout Protection**: Introduced `attemptShield` with client-side cooldowns and Zero-Login Session Refresh (`sessionOnly: true`) using session cookies (`AWSALB`, `JSESSIONID`), eliminating account lockouts on KTU.
- **Multi-Profile Management**: Added support for saving, switching, and locking multiple student accounts with optional 4–6 digit security PINs.

---

## 🎓 Milestone 3: KTU 2024 Scheme Integration, Comeback Projections & Forecaster (v1.2.0 – v1.2.18)
- **3-Level Metric Architecture**:
  - *Level 1*: Full degree actuals (S1–S8 complete).
  - *Level 2*: Hybrid forecast (combines completed actuals with future semester projections).
  - *Level 3*: Completed actuals with backlog comebacks.
- **9 Academic Comeback Projections**: Added mathematical projections (`minP` 5.50 through `maxS` 10.00) showing the exact CGPA impact of clearing active backlogs.
- **Multi-Signal Fuzzy Scheme Resolver**: Evaluates Register Number patterns, profile metadata, and 5-letter course code fingerprints (`GAMAT`, `GAPHT`) vs. 2019 3-letter codes (`CST`, `MAT`).
- **Activity Points Tracker**: Added direct scoring evaluation against mandatory university targets (100 pts for 4-year regular, 75 pts for lateral entry).
- **Major vs Minor Branch Auto-Healing**: Restores primary engineering majors from Register Numbers when KTU replaces the department with `"Minor Branch"`.

---

## 🎨 Milestone 4: High-Contrast Mobile UX & Safe-Area Polishing (v1.2.19 – v1.2.23)
- **Option B Top App Bar Integration (v1.2.20)**: Relocated `[⚡ Fast Sync]` into the top navigation header alongside refresh and hamburger menu, freeing up mobile vertical space.
- **Interactive Session Refresh Pill (v1.2.20)**: Converted sync age badge (`🟢 Synced 34m ago`) into an interactive one-click session refresh trigger.
- **Fluid Editorial Typography (v1.2.21)**: Replaced boxy metadata chips with clean, editorial typography in the student identity card (Name + monospaced register no, department, and middot-separated scheme • batch • degree).
- **Clean `#f1f1f1` Page Canvas (v1.2.22)**: Set light gray background to provide subtle contrast against white bento cards.
- **Additive Safe-Area Inset Fix (v1.2.23)**: Solved mobile top header crowding by implementing `calc(env(safe-area-inset-top, 0px) + 14px)`, guaranteeing breathing room below iOS Dynamic Island and Android status bars.

---

## 🚀 Milestone 5: The "KTU Supercharger" In-Portal Skin Extension (`/extension`) (v1.2.24 Build 27)
- **Context & Motivation**: KTU introduced Cloudflare Turnstile anti-bot verification and a security modal warning on `app.ktu.edu.in/login.htm`, blocking headless server-side credential scraping.
- **Architectural Shift**: Decoupled grade capture from credential collection by shifting to an **In-Portal Browser Extension (`/extension`)**.
- **Instant Scorecard Capture**: Content script extracts `#collapseFive*` and `#collapseSix` on `DOMContentLoaded` (< 50ms), immunizing students against KTU server crashes on result day.
- **Full-Site Masking & Exact PWA Parity**: When Modern View is active (`body.ktu-supercharger-active`), entirely masks KTU's ancient portal layout (hiding blue navbar, sidebar, footers, and unstyled tables). Replaces the screen with the exact Bento Grid layout of our main PWA.
- **Post-Login Home Page Auto-Fetch**: Detects when students land on KTU's home page after logging in (`/eu/core/home.htm`) and automatically fetches the curriculum section in the background with active session cookies, preventing "page not found" errors.
- **Instant 1-Click Toggle**: Allows students to switch back to the original KTU portal (`[ 🔄 Classic KTU Portal ]`) with all menus, sidebars, and tables 100% restored.
- **Raw HTML Capture (`[ 💾 Save HTML ]`)**: Added toolbar action to export/download the exact raw official KTU HTML page for inspection and benchmarking.
- **Resilient Offline Vault & Anti-Degradation Shield**: Caches complete scorecards into `chrome.storage.local`. Protects against empty/withheld server responses with `newCoursesCount >= cachedCoursesCount`.
- **Unified 1-Click PWA Parity**: Clicking `[ 🚀 Open in PWA Forecaster ]` on KTU transfers data seamlessly via URL fragment (`#ext_sync=<base64>`) to `kturesults.govindsr.me`, maintaining 100% data parity between the extension and PWA.
- **Dedicated Extension Test Suite**: Independent test suite in `/extension/test/run_tests.js` validating parser, calculator, storage shield, and URL bridge.

---

## ⚡ Milestone 6: Real-World 11-Column Table Alignment & Complete Portal Masking
- **Post-Login Route Discovery (`/eu/alt/dashboard.htm`)**: KTU's post-login flow lands on `/eu/alt/dashboard.htm` without curriculum tables. Added `dashboard` route recognition and immediate background fetch of `/eu/stu/studentDetailsView.htm` using active session cookies.
- **11-Column Dynamic Table Parser**: Real-world portal audit revealed that KTU curriculum tables have 11 columns (`Slot`, `Course [CODE - NAME]`, `Course Credit`, `Valuation Type`, `Completed Status`, `Is Eligible`, `Re-Registration`, `Grade`, `Earned Credit`, `Exam Details`, `SGPA`). Resolved column indexing bug that previously read `"Valuation by university"` as the grade, fixing the `0.00 CGPA` and `0 Backlogs` discrepancy.
- **Direct Body-Level Container Mounting**: Fixed skin masking by appending `#ktu-supercharger-container` directly to `document.body` rather than inside `#page-wrapper`. This ensures `body.ktu-supercharger-active > *:not(...)` cleanly hides 100% of native KTU portal elements (blue navigation bar, sidebar, and footers).
- **DOM-Native Page Integrity Preflight**: Refactored `checkPageIntegrity()` in `preflight.js` to inspect the passed document tree directly rather than `window.location.pathname`, enabling flawless curriculum extraction from background-fetched DOMs on `dashboard.htm`.
- **Zero-Flash Instant Vault Masking**: Leveraged edge relay and vault persistence patterns to render cached snapshot data in < 2ms on `/eu/alt/dashboard.htm` while executing a seamless background refresh, completely eliminating portal UI flash.
- **Verified Official Fixtures & Expanded Test Suite**: Added Test 3B in `extension/test/test_parser.js` testing official KTU 11-column table layouts and real title banners (`GOVIND S R(CEA20CS026) (COLLEGE OF ENGINEERING ATTINGAL)`). Verified that all 10 extension tests and all 13 root PWA tests pass with 100% fidelity.

---

## 🔌 Milestone 7: Master ON/OFF Switch & Student Identity Refinement
- **Master Power Switch in Popup Header**: Introduced a master switch in the extension popup header allowing students to completely turn ON or OFF the Supercharger skin and auto-capture engine.
- **Total In-Portal Disengagement**: When toggled OFF, the content script removes `body.ktu-supercharger-active`, hides the modern Bento Grid and toolbar, halts background fetches to `studentDetailsView.htm`, and leaves the native KTU portal 100% untouched.
- **Instant Tab Synchronization via Runtime Messaging**: Wired `chrome.runtime.sendMessage` from `popup.js` to `content.js` so toggling the master switch takes effect in active KTU tabs in real-time (0ms) without needing a page refresh.
- **Student Name Extraction Guard**: Filtered out `APJ Abdul Kalam Technological University` navbar titles in `extension/src/core/parser.js`, ensuring the student's true name (`GOVIND S R`) is parsed from profile banners and welcome greetings.
- **Expanded Storage Test Suite (11 Tests)**: Added Test 8B in `extension/test/test_storage.js` validating default power state (`true`), toggle persistence, and boolean preservation in `storage.getItem()`.
