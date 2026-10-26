# 📐 KTU CGPA PWA — Academic Business Logic & Regulation Engine

This document provides a thorough breakdown of the academic calculation engine, KTU curriculum regulation schemes, the 3-Level Metric Architecture, 9 Academic Comeback Projections, and the Multi-Signal Fuzzy Resolver implemented in `constants.js` and `app.js`.

---

## 1. Grade Point Scales & Definitions

KTU employs a 10-point Letter Grade system. The application maintains full backward and forward compatibility across the 2015, 2019, and 2024 schemes:

```javascript
window.GP = {
    "S": 10,    // Outstanding (2019 & 2024 Scheme)
    "O": 10,    // Outstanding (2015 Scheme)
    "A+": 9,    // Excellent
    "A": 8.5,   // Very Good
    "B+": 8,    // Good
    "B": 7.5,   // Above Average
    "C+": 7,    // Average
    "C": 6.5,   // Below Average
    "D": 6,     // Marginal
    "P": 5.5,   // Pass (Lowest passing grade in KTU)
    "LP": 4,    // Low Pass (Special regulation category, 4.0 GP)
    "F": 0,     // Failed
    "FE": 0,    // Failed due to lack of eligibility/attendance
    "AB": 0,    // Absent
    "ABSENT": 0,// Absent (Portal alternate token)
    "I": 0      // Incomplete / Course Incomplete
};
```

### 1.1 Backlog Identification
Grades defined in `window.BACKLOG_GRADES` are strictly treated as active backlogs:
```javascript
window.BACKLOG_GRADES = new Set(["F", "FE", "AB", "ABSENT", "I"]);
```

### 1.2 Audit & Non-Graded Courses (`isAuditPass`)
Non-graded requirement courses (such as Sustainable Engineering, Constitution of India, Life Skills, Health & Wellness, MOOCs, or Challenge Exams) return status tokens such as `PASS`, `COMPLETED`, `AUDIT`, `CH`, or `SATISFACTORY`.
- **Academic Rule**: These courses count towards **earned credits** (`earnedCredits`), but are **strictly excluded from the SGPA/CGPA graded points and credit divisor**. Including them would distort the student's true university GPA.

### 1.3 Truly Pending / Unpublished Results (`isPendingResult`)
Grades marked as `-`, `null`, `Planned`, `Withheld`, or `Pending` are treated as unpublished:
- Excluded from graded calculations until officially published.

### 1.4 Percentage Conversion Formula
Per APJ Abdul Kalam Technological University B.Tech regulations:
$$\text{Equivalent Percentage (\%)} = \text{CGPA} \times 10.0$$

---

## 2. SGPA & CGPA Calculation Formulas

### 2.1 Semester Grade Point Average (SGPA)
For any semester $k$:
$$\text{SGPA}_k = \frac{\sum_{i=1}^{n} (C_{k,i} \times GP_{k,i})}{\sum_{i=1}^{n} C_{k,i}}$$
Where:
- $C_{k,i}$ is the credit value of course $i$ in semester $k$ (where course is graded and not an audit course).
- $GP_{k,i}$ is the grade point earned in course $i$.

### 2.2 Cumulative Grade Point Average (CGPA)
Across all completed semesters:
$$\text{CGPA} = \frac{\sum_{\text{all semesters}} (C_i \times GP_i)}{\sum_{\text{all semesters}} C_i}$$
*Note: Backlog courses contribute their credit value to the denominator while contributing 0 grade points to the numerator until cleared, reflecting the true active university standing.*

---

## 3. The 3-Level Academic Metric Architecture

To accommodate students at any point in their engineering career, the calculation engine (`window.calculateAcademicMetrics`) operates on a **3-Level State Architecture**:

```
+-----------------------------------------------------------------------------+
|                      3-LEVEL METRIC ARCHITECTURE                            |
+-----------------------------------------------------------------------------+
|                                                                             |
|  [LEVEL 1: Full Degree Record]                                              |
|  Trigger: Student has completed all 8 semesters (S1–S8) in portal.           |
|  Output: Final official graduation CGPA, total degree credits, 0 forecast.  |
|                                                                             |
|  [LEVEL 2: Hybrid Forecast]                                                 |
|  Trigger: In-progress student + selected curriculum scheme preset.          |
|  Output: Current CGPA + projected remaining semester credits +              |
|          Max Graduation CGPA + required future SGPA for Distinction (8.0)   |
|          and First Class (6.5).                                             |
|                                                                             |
|  [LEVEL 3: Completed Actuals Only]                                          |
|  Trigger: In-progress student with future forecasting disabled.             |
|  Output: Current CGPA strictly on completed coursework + 9 Academic          |
|          Comeback Projections for backlog clearance.                        |
|                                                                             |
+-----------------------------------------------------------------------------+
```

---

## 4. The 9 Academic Comeback Projections

When a student has active backlogs, clearing them increases their existing CGPA without needing additional semesters. The engine calculates the exact projected CGPA for all 9 university passing grade thresholds:

$$\text{Projected CGPA} = \frac{\text{Total Actual Points} + (\text{Total Backlog Credits} \times GP_{\text{target}})}{\text{Total Actual Credits}}$$

The engine computes:
1. **minP (5.50 GP)**: Minimum possible comeback by passing all backlogs at grade P.
2. **maxD (6.00 GP)**: Clearing all backlogs at grade D.
3. **maxC (6.50 GP)**: Clearing all backlogs at grade C.
4. **maxCPlus (7.00 GP)**: Clearing all backlogs at grade C+.
5. **maxB (7.50 GP)**: Clearing all backlogs at grade B.
6. **maxBPlus (8.00 GP)**: Clearing all backlogs at grade B+.
7. **maxA (8.50 GP)**: Clearing all backlogs at grade A.
8. **maxAPlus (9.00 GP)**: Clearing all backlogs at grade A+.
9. **maxS (10.00 GP)**: Maximum possible comeback by clearing all backlogs at grade S.

---

## 5. Degree Forecasting & Target SGPA Calculations (Level 2)

In Level 2 mode, the engine projects the student's graduation outcome by combining completed credits with remaining planned semester credits:

$$\text{Total Degree Credits} = \text{Total Completed Credits} + \text{Total Future Credits}$$
$$\text{Total Opportunity Credits} = \text{Total Future Credits} + \text{Total Backlog Credits}$$

### 5.1 Max Possible Graduation CGPA
$$\text{Max CGPA} = \frac{\text{Total Actual Points} + (\text{Total Opportunity Credits} \times 10.0)}{\text{Total Degree Credits}}$$

### 5.2 Required Future SGPA for Degree Honors
To calculate the average SGPA required in remaining semesters to achieve a target CGPA (e.g. 8.0 for First Class with Distinction, 6.5 for First Class):

$$\text{Required Points} = (\text{Target CGPA} \times \text{Total Degree Credits}) - \text{Total Actual Points}$$
$$\text{Needed Avg SGPA} = \frac{\text{Required Points}}{\text{Total Opportunity Credits}}$$

#### Intelligent Threshold Classifications:
- If $\text{Required Points} \le 0$: Evaluates to `"Achieved"`.
- If $\text{Required Points} \le (\text{Total Opportunity Credits} \times 5.5)$: The student will achieve the goal even with the minimum passing grade (P). Evaluates to `"Secured (Min Pass => X.XX)"`.
- If $\text{Needed Avg SGPA} > 10.0$: Mathematically impossible to achieve. Evaluates to `"Unachievable (> 10.0)"`.
- **Distinction Backlog Rule**: KTU regulations specify that First Class with Distinction requires $\text{CGPA} \ge 8.0$ **and zero history of backlogs**. The engine explicitly flags `distinctionRequiresZeroBacklogs: true` if backlogs exist.

---

## 6. Multi-Signal Fuzzy Scheme & Branch Resolver (`resolveKTUSchemeAndBranch`)

Because portal HTML does not always clearly state whether a student belongs to the 2019 or 2024 regulations, the resolver evaluates **three independent signals** using a weighted scoring model:

### Signal 1: University Register Number (Weight: 15)
Matches KTU register number format: `^(L)?([A-Z]{3,4})?(\d{2})([A-Z]{2,3})(\d{3})$`
- Prefix `L`: Flags **Lateral Entry** student.
- Admission Year Digits (`\d{2}`):
  - `24+` &rarr; Adds +15 to 2024 Scheme score.
  - `19–23` &rarr; Adds +15 to 2019 Scheme score.
  - `15–18` &rarr; Adds +15 to 2015 Scheme score.
- Branch Code (`CS`, `AD`, `EC`, `EE`, `ME`, `CE`, `IT`) &rarr; Adds +15 to corresponding discipline.

### Signal 2: Profile & DOM Metadata (Weight: 10)
- Parses text in `.list-group-item` for admission year and department strings.
- Filters out portal placeholder bugs like `"Minor Branch"` or `"None"`.

### Signal 3: Course Code Fingerprints (Weight: 4 to 8 per course)
Inspects course code prefixes in completed records:
- **2024 Scheme 5-Letter Prefixes**: `GAMAT`, `GAPHT`, `GAEST`, `UCEST`, `PCCST`, `PBCST`, `PECST`, `UDEST`, `UOEST`, `PROJT` &rarr; Awards strong 2024 Scheme score.
- **2019 Scheme 3-Letter Prefixes**: `CST`, `CSL`, `MAT`, `CYT`, `PHT`, `EST`, `HUT` &rarr; Awards strong 2019 Scheme score.
- **Lateral Entry Detection**: If student has records in S3+ but **zero records in S1 and S2**, auto-classifies as Lateral Entry.

---

## 7. Major vs Minor Discipline Auto-Healing

When KTU students enroll in an optional Minor in Engineering or Honors program, the portal frequently replaces their primary branch label with generic strings like `"Minor Branch"`.

The normalizer (`getNormalizedStudentProfile`) protects against this bug:
1. Tests if `studentInfo.branch` matches `/^minor\s*branch$/i`.
2. If invalid, decodes the student's true primary major directly from their University Register Number (e.g. `TVE21CS042` &rarr; Computer Science & Engineering).
3. Preserves any true secondary minor discipline in a separate `minorDept` property, ensuring the primary B.Tech degree major is never overwritten.

---

## 8. KTU Honors & Minors Eligibility Validator (`validateHonorsMinorsEligibility`)

Under KTU B.Tech Regulations (2019 & 2024 Schemes), students may opt for specialized degree enhancements:

### 8.1 B.Tech (Honors)
- **Cumulative CGPA Requirement**: $\ge 8.50$ maintained across all completed semesters.
- **Backlog Invariant**: Must have cleared **all courses in the first attempt** (zero history of backlogs). Any previous or active `F`, `FE`, `AB`, or `I` grade permanently disqualifies the student.
- **Credit Requirement**: Must earn **20 additional stream credits** (typically 4 discipline theory courses + 1 mini-project across S5–S8).
- **State Evaluation**:
  - `eligible`: $\text{CGPA} \ge 8.50$ and zero backlogs.
  - `at_risk`: $8.00 \le \text{CGPA} < 8.50$ with zero backlogs (can achieve Honors with grade boost).
  - `ineligible`: $\text{CGPA} < 8.00$ or any backlog history.

### 8.2 Minor in Engineering
- **Cumulative CGPA Requirement**: $\ge 7.00$ at registration (end of S2).
- **Backlog Invariant**: No active uncleared backlogs.
- **Credit Requirement**: Must earn **20 additional inter-discipline credits** from an approved secondary engineering department.

---

## 9. Mandatory Activity Points Tracker & Portal Auto-Sync (`calculateActivityPointsSummary`)

KTU B.Tech degree award mandates student activity points in addition to academic course credits:
- **Regular 4-Year B.Tech**: **100 Points**
- **Lateral Entry B.Tech**: **75 Points**

### 9.1 Portal Auto-Extraction & Direct Scoring Architecture
On `app.ktu.edu.in` (`studentDetailsView.htm`), the college staff advisor uploads verified points, and the portal displays a single aggregated `Activity Points` count at the curriculum/profile summary. The portal does not expose the per-category breakdown to students.

To eliminate student confusion and tedious manual logging, the engine adopts a direct scoring model:
1. **Auto-Extraction (`KTUSyncEngine.parseStudentInfo`)**: Automatically parses `Activity Points : <num>` directly from portal profile HTML during 1-click sync or session refresh.
2. **Direct Score Tracker (`calculateActivityPointsSummary`)**: Accepts a numeric score, numeric string, or existing payload:
   $$\text{effectivePoints} = \min(\text{totalPoints}, \text{targetPoints})$$
   $$\text{remainingPoints} = \max(0, \text{targetPoints} - \text{effectivePoints})$$
   $$\text{progressPercent} = \min\left(100, \left\lfloor \frac{\text{effectivePoints}}{\text{targetPoints}} \times 100 \right\rfloor\right)$$
3. **Manual Override Support**: Enables students to manually save updated scores when advisors haven't yet updated the KTU portal.

### 9.2 University Category Reference Caps (Cheat Sheet)
While the score tracker evaluates aggregate completion against the 100 pt / 75 pt degree target, the UI provides an informational cheat sheet of the 5 official KTU category caps so students know where to earn future points:
1. **National Initiatives (`national_initiatives`)**: NSS, NCC, Unnat Bharat Abhiyan (UBA), Blood donation drives &rarr; **Max 60 Points**.
2. **Sports & Culturals (`sports_cultural`)**: Inter-college, zonal, state, national sports & arts fest competitions &rarr; **Max 40 Points**.
3. **Professional Bodies & Leadership (`professional_leadership`)**: IEEE, CSI, ISTE, ACM chapters, student senate, class representative, club chair &rarr; **Max 40 Points**.
4. **Innovation, Hackathons & Startups (`innovation_hackathons`)**: IEDC, hackathon wins, product patents, paper publications &rarr; **Max 50 Points**.
5. **Internships & Certified MOOCs (`internships_moocs`)**: Industrial training ($\ge 20$ days), NPTEL / Swayam / Coursera certs, workshops &rarr; **Max 50 Points**.
