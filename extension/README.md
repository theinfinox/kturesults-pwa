# ⚡ KTU Supercharger — In-Portal Skin & Scorecard Vault

> **Official Companion Extension for the KTU CGPA Standalone PWA**  
> Manifest V3 • Zero Cloud Dependencies • 100% Client-Side Privacy

---

## 🌟 Features at a Glance

1. **⚡ Crash-Proof Scorecard Capture (< 50ms)**:
   - On result publication day, KTU servers frequently return `504 Gateway Timeout` under peak load.
   - The extension captures `#collapseFive*` and `#collapseSix` on `DOMContentLoaded` before external assets finish loading.
   - Saves complete scorecards into `chrome.storage.local` with anti-degradation protection.

2. **🎨 Executive In-Portal Bento Grid**:
   - Replaces KTU's ancient 2012 Bootstrap 3 curriculum tables with our modern, high-contrast Bento Grid dashboard.
   - Shows CGPA, Percentage, Active Backlogs, Earned Credits vs Target (160 cr / 120 cr), Activity Points (100 / 75 target), and all **9 Academic Comeback Projections**.

3. **🔄 Instant 1-Click View Toggle**:
   - A sticky floating toolbar lets you switch between **✨ Modern Executive View** and **🔄 Classic KTU Table** with zero page reload.

4. **🚀 1-Click Standalone PWA Parity**:
   - Tap `[ 🚀 Open in PWA Forecaster ]` on the KTU portal.
   - The extension transfers the data directly to [`kturesults.govindsr.me`](https://kturesults.govindsr.me/) via a secure local URL fragment (`#ext_sync=<base64>`).
   - The PWA saves it to its offline vault, giving you full degree forecasting and vector PDF generation.

---

## 💻 Desktop Installation (Chrome / Edge / Brave / Arc)

1. Open your browser and navigate to the extensions management page:
   - **Chrome / Brave / Arc**: `chrome://extensions/`
   - **Edge**: `edge://extensions/`
2. Enable **"Developer mode"** (toggle in the top-right corner).
3. Click **"Load unpacked"**.
4. Select the `standalone-pwa/extension` folder from this repository.
5. Visit `https://app.ktu.edu.in/login.htm` and log in. Navigate to your student details page to see the modern skin in action!

---

## 📱 Mobile Installation (Android & iOS)

### 🤖 Android (Kiwi Browser)
1. Download **Kiwi Browser** from the Google Play Store (supports desktop Chrome extensions on Android).
2. Open Kiwi, tap the three dots $\to$ **Extensions**.
3. Enable **"Developer mode"**, tap **"+ (from .zip / crx / dir)"**, and select the extension folder.

### 🍎 iPhone / iPad (Orion Browser)
1. Download **Orion Browser** from the Apple App Store (supports Chrome/Firefox extensions natively on iOS).
2. Open Orion, go to Settings $\to$ Extensions $\to$ Install from Disk.

---

## 🧪 Automated Test Suite

Run the zero-dependency test suite via Node.js:
```bash
node extension/test/run_tests.js
```
Validates:
- DOM parsing across 2015, 2019, and 2024 regulations.
- SGPA, CGPA, audit course exclusion, and 9 Comeback Projections.
- Anti-degradation snapshot shields.
- PWA URL fragment encoding/decoding.
