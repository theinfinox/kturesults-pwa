# 🚀 KTU CGPA PWA — Versioning, Release Protocol & Service Worker Updates

This document defines the mandatory, automated release protocol for the KTU CGPA Standalone PWA.

> **CRITICAL DIRECTIVE FOR ALL DEVELOPERS & AI AGENTS**:
> Whenever ANY code change, bug fix, styling tweak, or new feature is applied to this codebase, you **MUST** execute the atomic version upgrade checklist documented below.
> 
> Simply editing frontend JavaScript or CSS will **NOT** reach existing users because the PWA Service Worker serves assets from its offline cache. The cache name and manifest **MUST** be bumped atomically.

---

## 1. How PWA Updates Work in This Repository

Progressive Web Applications on mobile devices (Android/iOS) and desktop browsers operate under strict offline-first caching policies:

```
+----------------------------------------------------------------------------------+
|                            PWA UPDATE LIFECYCLE                                  |
+----------------------------------------------------------------------------------+
|                                                                                  |
|  1. User opens PWA                                                               |
|     Browser loads active cached assets immediately from CACHE_NAME.              |
|                                                                                  |
|  2. Browser fetches sw.js in background (Byte-by-Byte Check)                     |
|     - If sw.js is IDENTICAL: Browser does nothing. Cache stays active.           |
|     - If sw.js CHANGED (CACHE_NAME bumped): Triggers install event.              |
|                                                                                  |
|  3. Install Event (caches.open('ktu-cgpa-pwa-vX'))                               |
|     - Downloads fresh copies of all files in ASSETS_TO_CACHE into the new cache. |
|     - self.skipWaiting() forces the new service worker to become active.         |
|                                                                                  |
|  4. Activate Event                                                               |
|     - Deletes all legacy cache buckets where key !== CACHE_NAME.                 |
|     - self.clients.claim() immediately takes control of open client tabs.        |
|                                                                                  |
|  5. Manifest Ingestion (app.js loadManifestVersion)                              |
|     - Fetches manifest.webmanifest to extract fresh version & versionCode.       |
|     - Updates .pwa-version-text, .pwa-version-code, and window.__KTU_PWA_VERSION__|
|                                                                                  |
+----------------------------------------------------------------------------------+
```

---

## 2. Mandatory Atomic Release Touchpoints

Whenever modifying the application, you **MUST** update all **5 touchpoints** in a single atomic commit:

| Touchpoint | File Path | What to Increment | Purpose |
| :--- | :--- | :--- | :--- |
| **1. Cache Name** | [`sw.js`](file:///c:/Users/1sree/Documents/standalone-pwa/sw.js#L1) | `CACHE_NAME = "ktu-cgpa-pwa-v<X>"` &rarr; increment `X` by +1 | **Cache Invalidation**: Triggers service worker reinstallation and evicts stale cached JavaScript/CSS. |
| **2. Web Manifest** | [`manifest.webmanifest`](file:///c:/Users/1sree/Documents/standalone-pwa/manifest.webmanifest#L4-L5) | `"version_code": <Z>` &rarr; increment `Z` by +1<br>`"version": "<X.Y>"` &rarr; increment minor/patch | Informs operating system PWA engines (Android APK/Chrome/iOS) of a new build. |
| **3. Node Metadata** | [`package.json`](file:///c:/Users/1sree/Documents/standalone-pwa/package.json#L9-L10) | `"version_code": <Z>` &rarr; match manifest<br>`"version": "<X.Y.0>"` &rarr; match manifest | Keeps npm package metadata in strict parity with the manifest. |
| **4. Static HTML** | [`index.html`](file:///c:/Users/1sree/Documents/standalone-pwa/index.html#L36-L37) | `#headerVersionBadge`: `v<X.Y>`<br>`#headerBuildBadge`: `(Build <Z>)` | Eliminates visual text flicker before `app.js` finishes loading the manifest asynchronously. |
| **5. Test Suite** | [`test/test_suite.js`](file:///c:/Users/1sree/Documents/standalone-pwa/test/test_suite.js#L156-L157) | Update Test 5 assertions to accept the new version string and `version_code` | Ensures `npm test` continues to pass 100% on automated CI and local runs. |

---

## 3. Step-by-Step AI Agent / Developer Protocol

When you finish implementing any code changes:

### Step 1: Read the current build code
Inspect [`manifest.webmanifest`](file:///c:/Users/1sree/Documents/standalone-pwa/manifest.webmanifest) to determine current `version` and `version_code`.
For example, if current is `"version": "1.2"` and `"version_code": 3`:
- Target `version_code`: `4`
- Target `version`: `"1.2.1"` (for patches/fixes) or `"1.3"` (for features)

### Step 2: Read the current cache name
Inspect [`sw.js`](file:///c:/Users/1sree/Documents/standalone-pwa/sw.js#L1).
For example, if current is `ktu-cgpa-pwa-v9`:
- Target `CACHE_NAME`: `"ktu-cgpa-pwa-v10"`

### Step 3: Apply the 5-point atomic bump
Update `sw.js`, `manifest.webmanifest`, `package.json`, `index.html`, and `test/test_suite.js`.

### Step 4: Run the automated test suite
Execute:
```bash
npm test
```
Verify that all tests pass, including:
```
[Test 5] Testing PWA Web Manifest & Dynamic Versioning...
  ✅ PWA manifest configuration and DOM placeholders verified.
```

---

## 4. Invariant Rule for AI Agents

> **AGENT DIRECTIVE**: 
> Never consider a code modification complete until the 5-touchpoint release protocol has been executed and verified via `npm test`. If this step is omitted, users with installed PWAs will remain stuck on legacy cached code.
