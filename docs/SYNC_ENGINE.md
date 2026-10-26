# 🔄 KTU CGPA PWA — Sync Engine & Portal Extraction Pipeline

This document details the headless client-side parsing pipeline, DOM extraction heuristics, regex patterns, and network communications implemented in `sync-engine.js`.

---

## 1. Engine Design & Decoupled Architecture

`sync-engine.js` is a **pure headless client-side extraction engine**:
- **Zero DOM Rendering**: Does not touch the UI, show alerts, or manipulate view states.
- **Pure Functions**: Receives raw strings or DOM instances and returns structured JavaScript objects.
- **Exposed API**: Exposes the `window.KTUSyncEngine` namespace:
  - `executeFastSync(username, password, customRelayUrl)`
  - `executeSessionRefresh(username, sessionCookies, customRelayUrl)`
  - `parseRawHtml(htmlString)`
  - `parseStudentInfo(doc)`
  - `parseSemesterData(doc)`

---

## 2. Extraction Heuristics: `parseStudentInfo(doc)`

The KTU student dashboard (`/eu/stu/studentDetailsView.htm`) displays student profile details across header containers and sidebar list groups.

### 2.1 Header & Register Number Parsing
```javascript
const titleDiv = doc.querySelector(".profile-title") || doc.querySelector("h3") || doc.querySelector(".page-header");
```
From the raw title text (e.g., `GOVIND S R (CEA20CS026) (COLLEGE OF ENGINEERING CHERTHALA)`):
- **Register Number**: Matched via `/\(([A-Z0-9]+)\)/i` &rarr; `CEA20CS026`.
- **Institution**: Matched via `/\((COLLEGE[^)]+|INSTITUTE[^)]+|[A-Z\s]+ENGINEERING[A-Z\s]*)\)/i` &rarr; `COLLEGE OF ENGINEERING CHERTHALA`.
- **Student Name**: String preceding the first opening parenthesis &rarr; `GOVIND S R`.

### 2.2 List Group Label/Value Parsing
Iterates through all `.list-group-item` elements and checks for badges (`.badge`, `.view-badge`) or colon dividers:
- `label.includes("scheme")` &rarr; Stores raw curriculum regulations (e.g. `2019 Scheme`).
- `label.includes("minor")` &rarr; Stores secondary Minor in Engineering discipline.
- `label.includes("branch")` &rarr; Stores primary undergraduate engineering program.
- `label.includes("current semester")` &rarr; Stores enrolled semester (e.g. `S7`).
- `label.includes("cgpa")` &rarr; Stores portal-calculated CGPA if present.

### 2.3 Register Number Auto-Healing Fallback
If the portal branch is missing or clobbered by KTU's `"Minor Branch"` placeholder, the engine immediately runs regex matching against the student's register number:
$$\text{Clean RegNo: } \texttt{^(?:L)?(?:[A-Z]\{3,4\})?(\textbackslash d\{2\})([A-Z]\{2,3\})(\textbackslash d\{3\})\$}$$
- `CS` / `CSE` &rarr; Computer Science & Engineering
- `AD` / `AI` &rarr; Artificial Intelligence & Data Science
- `EC` / `ECE` &rarr; Electronics & Communication Engineering
- `EE` / `EEE` &rarr; Electrical & Electronics Engineering
- `ME` &rarr; Mechanical Engineering
- `CE` &rarr; Civil Engineering
- `IT` &rarr; Information Technology

### 2.4 Official Activity Points Accordion Parsing (`#collapseSix`)
Activity points data is located inside the `#collapseSix` accordion panel (following the semester cards `collapseFiveS1...S8`).
The engine targets `#collapseSix` (or parent/fallback table) and extracts:
- **Eligible / Obtained Points**: Dynamically detects column headers (`Obtained Points`, `Eligible Points`).
- **Degree Minimum Target**: Extracts `Minimum Points` (e.g. `100` or `75`).
- **Year-Wise Breakdown**: Parses `First Year`, `Second Year`, `Third Year`, and `Fourth Year` points.
- **Group Info**: Preserves the batch regulation scheme (e.g. `Default Group-B.Tech Full Time 2019 Scheme`).

---

## 3. Extraction Heuristics: `parseSemesterData(doc)`

Course grade records are contained inside Bootstrap collapse accordion panels matching ID pattern `[id^="collapseFiveS"]` (e.g. `collapseFiveS1`, `collapseFiveS2`, ..., `collapseFiveS8`).

### 3.1 Slot & Grade Column Index Detection
KTU frequently changes column positions between different semesters and schemes. The parser dynamically inspects table header elements (`<th>` or first row `<td>`):
```javascript
let gradeColIdx = -1;
let slotColIdx = -1;
const ths = table.querySelectorAll("thead th, tr th, tr:first-child td");
ths.forEach((th, idx) => {
    const txt = th.textContent.trim().toLowerCase();
    if (txt === "slot" || txt.includes("slot")) {
        slotColIdx = idx;
    }
    if (txt === "grade" || txt.includes("grade")) {
        gradeColIdx = idx;
    }
});
```

### 3.2 Dynamic Slot Extraction & Normalization
For each course row with at least 7 columns:
- **Slot Resolution**:
  1. Inspects `cols[slotColIdx]` if header was identified.
  2. Fallback to `cols[0]` if it matches a valid KTU slot token pattern (`^(?:slot\s*[:\-]?\s*)?[A-Za-z][A-Za-z0-9+]{0,3}$`).
  3. Normalizes slot tokens (e.g. `"Slot A"` &rarr; `"A"`), and ignores empty/dash values (`"-"` or labs without an exam slot).
- **Course Name**: Extracted from column index 1 (`cols[1]`).
- **Course Credit**: Extracted from column index 2 (`parseFloat(cols[2].textContent) || 0`).
- **Grade Token Resolution**:
  1. **Tier 1 (Header Index)**: If `gradeColIdx` was detected, inspect `cols[gradeColIdx]`.
  2. **Tier 2 (Fixed Position)**: If row length $\ge 8$, inspect `cols[7]`.
  3. **Tier 3 (Reverse Regex Scan)**: Scans backwards from the last column toward column 3, testing each cell against the official KTU grade token regex:
     ```javascript
     const GRADE_REGEX = /^(O|S|A\+|A|B\+|B|C\+|C|D|P|LP|F|FE|I|AB|ABSENT|PASS|FAIL|COMPLETED|AUDIT|SATISFACTORY)$/i;
     ```
  4. **Tier 4 (Trailing Fallback)**: Uses the content of the final column in the row.

---

## 4. Network Transport & Security Validation

### 4.1 Enforced HTTPS Relay Security
Before initiating network communication, `executeFastSync` and `executeSessionRefresh` validate the destination URL:
```javascript
const isLocal = relayUrl.startsWith("http://localhost") || relayUrl.startsWith("http://127.0.0.1") || relayUrl.startsWith("/api/sync");
const isHttps = relayUrl.startsWith("https://");
if (!isLocal && !isHttps) {
    throw new Error("Security Error: Relay endpoint must use encrypted HTTPS to protect credentials.");
}
```
If a user accidentally or maliciously configures an unencrypted `http://` endpoint, execution terminates instantly, protecting passwords from cleartext transmission over open Wi-Fi.

### 4.2 DOMParser Context Isolation
Raw HTML returned by the relay is never inserted directly into the active document using `innerHTML` (which would expose the client to XSS). Instead, it is parsed inside an isolated in-memory `DOMParser`:
```javascript
const parser = new DOMParser();
const doc = parser.parseFromString(data.html, "text/html");
```
This isolates external scripts, images, and styles inside an inert sandbox document.
