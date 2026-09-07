document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("exportVectorPdf");
    if (btn) btn.addEventListener("click", exportVectorPdf);
});

async function exportVectorPdf(explicitData, explicitStudentInfo, explicitCurriculum) {
    const { jsPDF } = window.jspdf;
    const btn = document.getElementById("exportVectorPdf") || document.getElementById("downloadPdfBtn") || document.getElementById("headerPdfBtn");
    const originalBtnText = btn ? btn.innerHTML : "";

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = "⏳ Generating Academic PDF...";
    }

    const restoreBtn = () => {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalBtnText;
        }
    };

    const processExport = (semesterData, studentInfo, futureCurriculum) => {
        if (!semesterData || !semesterData.length) {
            restoreBtn();
            alert("No semester data found. Please sync or import grades first.");
            return;
        }

        let activeCurriculum = futureCurriculum;
        if (!activeCurriculum && window.resolveKTUSchemeAndBranch) {
            const autoResolved = window.resolveKTUSchemeAndBranch(studentInfo, semesterData);
            if (autoResolved && autoResolved.recommendedPreset) {
                activeCurriculum = { preset: autoResolved.recommendedPreset };
            }
        } else if (activeCurriculum && activeCurriculum.disabled) {
            activeCurriculum = null;
        }

        const metrics = window.calculateAcademicMetrics(semesterData, activeCurriculum);
        if (!metrics) {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalBtnText;
            }
            alert("Could not calculate academic metrics.");
            return;
        }

        try {
            const pdf = new jsPDF("p", "mm", "a4");

            // Document Metadata for AI LLMs & Parsers
            pdf.setProperties({
                title: "KTU Academic Performance & Transcript Summary",
                subject: "Official Academic Grades, SGPA, and CGPA Summary",
                author: studentInfo?.name || "KTU Student",
                keywords: "KTU, CGPA, SGPA, Academic Transcript, Engineering Grades, APJ Abdul Kalam Technological University",
                creator: "KTU CGPA Extension"
            });

            // Minimalist Academic RGB Palette
            const COLORS = {
                primary: [15, 23, 42],        // #0F172A
                primaryLight: [30, 41, 59],   // #1E293B
                textMain: [15, 23, 42],       // #0F172A
                textMuted: [100, 116, 139],   // #64748B
                textLight: [148, 163, 184],   // #94A3B8
                borderLight: [226, 232, 240], // #E2E8F0
                bgHeader: [248, 250, 252],    // #F8FAFC
                tableHeader: [241, 245, 249], // #F1F5F9
                
                // Semantic Grade Colors
                gradeS: [220, 252, 231],      // #DCFCE7
                gradeAplus: [209, 250, 229],  // #D1FAE5
                gradeA: [224, 242, 254],      // #E0F2FE
                gradeBplus: [254, 243, 199],  // #FEF3C7
                gradeB: [255, 237, 213],      // #FFEDD5
                gradeC: [241, 245, 249],      // #F1F5F9
                gradeD: [226, 232, 240],      // #E2E8F0
                gradeF: [254, 226, 226],      // #FEE2E2
                
                // High contrast badge text colors
                textS: [22, 101, 52],
                textA: [7, 89, 133],
                textB: [146, 64, 14],
                textC: [51, 65, 85],
                textF: [153, 27, 27]
            };

            pdf.setFont("helvetica");

            // =========================================================
            // 1. TOP DOCUMENT HEADER (PAGE 1)
            // =========================================================
            // Top Accent Rule
            pdf.setFillColor(...COLORS.primary);
            pdf.rect(12, 10, 186, 1.8, "F");

            // Institution Title
            pdf.setTextColor(...COLORS.primary);
            pdf.setFontSize(14.5);
            pdf.setFont("helvetica", "bold");
            pdf.text("APJ ABDUL KALAM TECHNOLOGICAL UNIVERSITY", 12, 19);

            pdf.setTextColor(...COLORS.textMuted);
            pdf.setFontSize(9);
            pdf.setFont("helvetica", "bold");
            pdf.text("ACADEMIC PERFORMANCE & TRANSCRIPT SUMMARY", 12, 24.5);

            // Right-aligned Date & Source
            pdf.setFontSize(8);
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(...COLORS.textLight);
            pdf.text(`Date: ${new Date().toLocaleDateString("en-GB")}`, 198, 19, { align: "right" });
            pdf.text("KTU Student Portal Extract", 198, 24, { align: "right" });

            let currentY = 28;

            // Student Information Bar (Two-Row Structured Academic Header)
            if (studentInfo && (studentInfo.name || studentInfo.registerNo || studentInfo.branch || studentInfo.institution)) {
                const profile = window.getNormalizedStudentProfile 
                    ? window.getNormalizedStudentProfile(studentInfo, semesterData, metrics)
                    : {
                        name: studentInfo?.name || "N/A",
                        ktuId: studentInfo?.registerNo || "N/A",
                        dept: studentInfo?.branch || "B.Tech Programme",
                        year: studentInfo?.admissionYear ? `${studentInfo.admissionYear} Batch` : "KTU Batch",
                        scheme: studentInfo?.scheme || (metrics.curriculumPresetName || "KTU Scheme"),
                        institution: studentInfo?.institution || "APJ Abdul Kalam Technological University"
                    };

                const boxH = 15.5;
                pdf.setFillColor(...COLORS.bgHeader);
                pdf.setDrawColor(...COLORS.borderLight);
                pdf.roundedRect(12, currentY, 186, boxH, 1.5, 1.5, "FD");

                // --- ROW 1 ---
                // 1. Student Name
                pdf.setFontSize(9);
                pdf.setFont("helvetica", "bold");
                pdf.setTextColor(...COLORS.textMain);
                pdf.text(`Student: ${studentInfo.name || profile.name}`, 16, currentY + 5.5);

                // 2. KTU ID / University Code (Register No)
                pdf.setFontSize(8.5);
                pdf.setFont("helvetica", "bold");
                pdf.setTextColor(...COLORS.textMuted);
                pdf.text(`Register No: ${studentInfo.registerNo || profile.ktuId}`, 82, currentY + 5.5);

                // 3. Scheme / Regulations
                const cleanScheme = profile.scheme.length > 32 ? profile.scheme.substring(0, 29) + "..." : profile.scheme;
                pdf.setFont("helvetica", "normal");
                pdf.setFontSize(8);
                pdf.setTextColor(...COLORS.textMuted);
                pdf.text(`Scheme: ${cleanScheme}`, 194, currentY + 5.5, { align: "right" });

                // --- ROW 2 ---
                // College Name
                pdf.setFontSize(8);
                pdf.setFont("helvetica", "normal");
                pdf.setTextColor(...COLORS.textMuted);
                const instStr = `College: ${studentInfo.institution || profile.institution}`;
                const cleanInst = instStr.length > 48 ? instStr.substring(0, 45) + "..." : instStr;
                pdf.text(cleanInst, 16, currentY + 11.2);

                // 4. Department & 5. Admission Year / Batch
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(8.5);
                pdf.setTextColor(...COLORS.textMain);
                const deptStr = profile.dept.length > 28 ? profile.dept.substring(0, 25) + "..." : (profile.dept || "B.Tech Programme");
                const deptYearStr = `Dept: ${deptStr}  •  Batch: ${profile.year}`;
                pdf.text(deptYearStr, 194, currentY + 11.2, { align: "right" });

                currentY += boxH + 4;
            } else {
                currentY += 4;
            }

            // =========================================================
            // 2. ADAPTIVE EXECUTIVE SUMMARY CARDS (NO OVERFLOW)
            // =========================================================
            const cardW = 43.5;
            const cardGap = 4;

            // Clean, non-overlapping card drawer
            function drawSummaryCard(x, y, w, h, bgColor, borderColor, title, val, subText = "") {
                pdf.setFillColor(...bgColor);
                pdf.setDrawColor(...borderColor);
                pdf.roundedRect(x, y, w, h, 2, 2, "FD");

                pdf.setTextColor(...COLORS.textMain);
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(13);
                pdf.text(String(val), x + (w / 2), y + (subText ? 6.8 : 7.8), { align: "center" });

                if (subText) {
                    pdf.setTextColor(...COLORS.textMuted);
                    pdf.setFontSize(7.5);
                    pdf.setFont("helvetica", "bold");
                    pdf.text(subText, x + (w / 2), y + 10.5, { align: "center" });
                }

                pdf.setTextColor(...COLORS.textMuted);
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(7);
                pdf.text(title.toUpperCase(), x + (w / 2), y + 14.2, { align: "center" });
            }

            const eqPctStr = metrics.equivalentPercentage ? `${metrics.equivalentPercentage}% Marks` : `${(parseFloat(metrics.currentCGPA) * 10).toFixed(1)}% Marks`;

            if (metrics.level === 2 && metrics.graduationForecast) {
                const gf = metrics.graduationForecast;
                // Level 2 Hybrid Forecast: 4 clean cards showing actuals + degree credit progress
                drawSummaryCard(12, currentY, cardW, 17, COLORS.bgHeader, COLORS.primary, "Current CGPA", metrics.currentCGPA, eqPctStr);
                drawSummaryCard(12 + (cardW + cardGap), currentY, cardW, 17, metrics.hasBacklogs ? COLORS.gradeF : COLORS.gradeS, COLORS.borderLight, metrics.hasBacklogs ? "Active Backlogs" : "Backlog Status", `${metrics.totalBacklogs}`, metrics.hasBacklogs ? "Requires Clearance" : "All Clear");
                drawSummaryCard(12 + (cardW + cardGap) * 2, currentY, cardW, 17, COLORS.gradeA, COLORS.borderLight, "Earned Credits", `${metrics.earnedCredits} cr`);
                drawSummaryCard(12 + (cardW + cardGap) * 3, currentY, cardW, 17, COLORS.bgHeader, COLORS.borderLight, "Degree Progress", `${metrics.earnedCredits} / ${gf.totalDegreeCredits} cr`, `${gf.totalFutureCredits} cr remaining`);

                currentY += 22;
            } else if (!metrics.hasBacklogs) {
                // Zero-Backlog Student: 4 clean executive cards (No duplicate projection cards)
                drawSummaryCard(12, currentY, cardW, 17, COLORS.bgHeader, COLORS.primary, "Current CGPA", metrics.currentCGPA, eqPctStr);
                drawSummaryCard(12 + (cardW + cardGap), currentY, cardW, 17, COLORS.gradeS, COLORS.borderLight, "Backlog Status", "0", "All Clear");
                drawSummaryCard(12 + (cardW + cardGap) * 2, currentY, cardW, 17, COLORS.gradeA, COLORS.borderLight, "Earned Credits", `${metrics.earnedCredits} cr`);
                drawSummaryCard(12 + (cardW + cardGap) * 3, currentY, cardW, 17, COLORS.bgHeader, COLORS.borderLight, "Total Registered", `${metrics.totalCredits} cr`);

                currentY += 22;
            } else {
                // Backlog Student: Primary Stats Row + Structured Projections Grid
                drawSummaryCard(12, currentY, cardW, 17, COLORS.bgHeader, COLORS.primary, "Current CGPA", metrics.currentCGPA, eqPctStr);
                drawSummaryCard(12 + (cardW + cardGap), currentY, cardW, 17, COLORS.gradeF, COLORS.borderLight, "Active Backlogs", `${metrics.totalBacklogs}`, "Requires Clearance");
                drawSummaryCard(12 + (cardW + cardGap) * 2, currentY, cardW, 17, COLORS.gradeA, COLORS.borderLight, "Earned Credits", `${metrics.earnedCredits} cr`);
                drawSummaryCard(12 + (cardW + cardGap) * 3, currentY, cardW, 17, COLORS.bgHeader, COLORS.borderLight, "Total Registered", `${metrics.totalCredits} cr`, `${metrics.earnedCredits} / ${metrics.totalCredits}`);

                currentY += 21;

                // Academic Comeback Projections Header (Clean LLM Context)
                pdf.setTextColor(...COLORS.textMuted);
                pdf.setFontSize(7.5);
                pdf.setFont("helvetica", "bold");
                pdf.text("ACADEMIC COMEBACK PROJECTIONS (POTENTIAL CGPA IF CURRENT BACKLOGS CLEARED)", 12, currentY + 3);

                currentY += 5.5;

                // Row 1 of Projections: 4 cards (43.5mm width each)
                const projRow1 = [
                    ["Min Pass P (5.5)", metrics.projections.minP, COLORS.gradeC],
                    ["Grade D (6.0)", metrics.projections.maxD, COLORS.gradeC],
                    ["Grade C (6.5)", metrics.projections.maxC, COLORS.gradeC],
                    ["Grade B (7.5)", metrics.projections.maxB, COLORS.gradeBplus]
                ];

                projRow1.forEach((s, idx) => {
                    const px = 12 + idx * (cardW + cardGap);
                    pdf.setFillColor(...s[2]);
                    pdf.setDrawColor(...COLORS.borderLight);
                    pdf.roundedRect(px, currentY, cardW, 12.5, 1.5, 1.5, "FD");

                    pdf.setTextColor(...COLORS.textMain);
                    pdf.setFont("helvetica", "bold");
                    pdf.setFontSize(11);
                    pdf.text(String(s[1]), px + (cardW / 2), currentY + 5.5, { align: "center" });

                    pdf.setTextColor(...COLORS.textMuted);
                    pdf.setFont("helvetica", "bold");
                    pdf.setFontSize(6.8);
                    pdf.text(s[0].toUpperCase(), px + (cardW / 2), currentY + 9.8, { align: "center" });
                });

                currentY += 14.5;

                // Row 2 of Projections: 3 wider cards (58mm width each)
                const row2CardW = (186 - 2 * 4) / 3; // ~59.3mm
                const projRow2 = [
                    ["Grade A (8.5)", metrics.projections.maxA, COLORS.gradeAplus],
                    ["Grade A+ (9.0)", metrics.projections.maxAPlus, COLORS.gradeAplus],
                    ["Max S / Outstanding (10.0)", metrics.projections.maxS, COLORS.gradeS]
                ];

                projRow2.forEach((s, idx) => {
                    const px = 12 + idx * (row2CardW + 4);
                    pdf.setFillColor(...s[2]);
                    pdf.setDrawColor(...COLORS.borderLight);
                    pdf.roundedRect(px, currentY, row2CardW, 12.5, 1.5, 1.5, "FD");

                    pdf.setTextColor(...COLORS.textMain);
                    pdf.setFont("helvetica", "bold");
                    pdf.setFontSize(11);
                    pdf.text(String(s[1]), px + (row2CardW / 2), currentY + 5.5, { align: "center" });

                    pdf.setTextColor(...COLORS.textMuted);
                    pdf.setFont("helvetica", "bold");
                    pdf.setFontSize(6.8);
                    pdf.text(s[0].toUpperCase(), px + (row2CardW / 2), currentY + 9.8, { align: "center" });
                });

                currentY += 18;
            }

            // =========================================================
            // 3. SEMESTER TABLES (LLM-OPTIMIZED TABULAR STREAM)
            // =========================================================
            // Column boundaries:
            // Col 1 (Code): x=14 to 36
            // Col 2 (Title): x=38 to 150 (Width 112mm)
            // Col 3 (Credits): x=152 to 170 (Width 18mm)
            // Col 4 (Grade): x=172 to 196 (Width 24mm)

            metrics.semesters.forEach(sem => {
                const subjects = sem.subjects || [];
                
                // Pre-check page space: Semester header (9mm) + Table Header (6mm) + estimated 2 rows (18mm)
                if (currentY + 33 > 275 && currentY > 35) {
                    pdf.addPage();
                    drawSubsequentPageHeader();
                }

                // A. Semester Bar
                pdf.setFillColor(...COLORS.primary);
                pdf.roundedRect(12, currentY, 186, 8.5, 1.5, 1.5, "F");

                pdf.setTextColor(255, 255, 255);
                pdf.setFontSize(9.5);
                pdf.setFont("helvetica", "bold");
                pdf.text(sem.semester.toUpperCase(), 16, currentY + 5.8);

                pdf.setTextColor(203, 213, 225);
                pdf.setFontSize(8);
                pdf.setFont("helvetica", "normal");
                const semMeta = `SGPA: ${sem.sgpa}  |  Credits: ${sem.earnedCredits} / ${sem.totalCredits}  |  Passed: ${sem.passed}  |  Backlogs: ${sem.backlogs}${sem.pending > 0 ? '  |  Pending: ' + sem.pending : ''}`;
                pdf.text(semMeta, 194, currentY + 5.8, { align: "right" });

                currentY += 9.5;

                // B. Table Column Header (Strict linear stream)
                pdf.setFillColor(...COLORS.tableHeader);
                pdf.setDrawColor(...COLORS.borderLight);
                pdf.rect(12, currentY, 186, 6, "FD");

                pdf.setTextColor(...COLORS.textMuted);
                pdf.setFontSize(7.5);
                pdf.setFont("helvetica", "bold");
                pdf.text("COURSE CODE", 14, currentY + 4.2);
                pdf.text("COURSE TITLE", 38, currentY + 4.2);
                pdf.text("CREDITS", 161, currentY + 4.2, { align: "center" });
                pdf.text("GRADE", 184, currentY + 4.2, { align: "center" });

                currentY += 6;

                // C. Subject Rows (With intelligent wrapping and no clipping)
                subjects.forEach(sub => {
                    const parts = (sub.subject || "").split("-");
                    const code = (parts[0] || "").trim();
                    const name = parts.length > 1 ? parts.slice(1).join("-").trim() : code;

                    // Compute text wrapping for course title within 110mm width
                    pdf.setFont("helvetica", "normal");
                    pdf.setFontSize(8);
                    const titleLines = pdf.splitTextToSize(name, 110);
                    const isMultiLine = titleLines.length > 1;
                    const rowHeight = isMultiLine ? 11 : 7.5;

                    // Overflow check before drawing row
                    if (currentY + rowHeight > 275) {
                        pdf.addPage();
                        drawSubsequentPageHeader();

                        // Re-print column header on new page for uninterrupted table continuity
                        pdf.setFillColor(...COLORS.tableHeader);
                        pdf.setDrawColor(...COLORS.borderLight);
                        pdf.rect(12, currentY, 186, 6, "FD");

                        pdf.setTextColor(...COLORS.textMuted);
                        pdf.setFontSize(7.5);
                        pdf.setFont("helvetica", "bold");
                        pdf.text("COURSE CODE", 14, currentY + 4.2);
                        pdf.text("COURSE TITLE", 38, currentY + 4.2);
                        pdf.text("CREDITS", 161, currentY + 4.2, { align: "center" });
                        pdf.text("GRADE", 184, currentY + 4.2, { align: "center" });

                        currentY += 6;
                    }

                    // Background line divider
                    pdf.setDrawColor(...COLORS.borderLight);
                    pdf.line(12, currentY + rowHeight, 198, currentY + rowHeight);

                    // 1. Course Code
                    pdf.setTextColor(...COLORS.textMuted);
                    pdf.setFontSize(8);
                    pdf.setFont("helvetica", "bold");
                    pdf.text(code, 14, currentY + (isMultiLine ? 5.2 : 5));

                    // 2. Course Title (Wrapped lines drawn in order)
                    pdf.setTextColor(...COLORS.textMain);
                    pdf.setFontSize(8);
                    pdf.setFont("helvetica", "normal");
                    if (isMultiLine) {
                        pdf.text(titleLines[0], 38, currentY + 4.2);
                        pdf.text(titleLines[1], 38, currentY + 8.2);
                    } else {
                        pdf.text(titleLines[0], 38, currentY + 5);
                    }

                    // 3. Credits (Center-aligned in column)
                    pdf.setTextColor(...COLORS.textMuted);
                    pdf.setFontSize(8);
                    pdf.setFont("helvetica", "normal");
                    pdf.text(`${sub.credit} cr`, 161, currentY + (isMultiLine ? 5.2 : 5), { align: "center" });

                    // 4. Semantic Grade Badge
                    const gradeStr = String(sub.grade || "").trim().toUpperCase();
                    let gradeBg = COLORS.gradeC;
                    let gradeTxt = COLORS.textC;

                    switch (gradeStr) {
                        case "S":
                        case "O": gradeBg = COLORS.gradeS; gradeTxt = COLORS.textS; break;
                        case "A+": gradeBg = COLORS.gradeAplus; gradeTxt = COLORS.textS; break;
                        case "A": gradeBg = COLORS.gradeA; gradeTxt = COLORS.textA; break;
                        case "B+": gradeBg = COLORS.gradeBplus; gradeTxt = COLORS.textB; break;
                        case "B": gradeBg = COLORS.gradeB; gradeTxt = COLORS.textB; break;
                        case "C+":
                        case "C": gradeBg = COLORS.gradeC; gradeTxt = COLORS.textC; break;
                        case "D":
                        case "P":
                        case "LP": gradeBg = COLORS.gradeD; gradeTxt = COLORS.textC; break;
                        case "F":
                        case "FE":
                        case "AB":
                        case "ABSENT":
                        case "I": gradeBg = COLORS.gradeF; gradeTxt = COLORS.textF; break;
                    }

                    // Badge rect (Centered in grade column from 172 to 196)
                    const pillY = currentY + (isMultiLine ? 3 : 1.3);
                    pdf.setFillColor(...gradeBg);
                    pdf.roundedRect(174, pillY, 20, 5.2, 1.2, 1.2, "F");

                    // Badge text (Exact horizontal & vertical alignment)
                    pdf.setTextColor(...gradeTxt);
                    pdf.setFontSize(7.5);
                    pdf.setFont("helvetica", "bold");
                    pdf.text(gradeStr || "-", 184, pillY + 3.8, { align: "center" });

                    currentY += rowHeight;
                });

                currentY += 5.5; // Spacing after semester
            });

            // =========================================================
            // 3B. DEGREE GRADUATION SIMULATION (LEVEL 2 HYBRID FORECAST)
            // =========================================================
            if (metrics.level === 2 && metrics.graduationForecast) {
                const gf = metrics.graduationForecast;
                // Check page break: Simulation block needs ~48mm
                if (currentY + 48 > 275) {
                    pdf.addPage();
                    drawSubsequentPageHeader();
                }

                // Section Container Box
                pdf.setFillColor(...COLORS.bgHeader);
                pdf.setDrawColor(...COLORS.borderLight);
                pdf.roundedRect(12, currentY, 186, 44, 2, 2, "FD");

                // Simulation Header (Clean ASCII - prevents Latin-1 emoji corruption)
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(8.5);
                pdf.setTextColor(...COLORS.primary);
                pdf.text("DEGREE GRADUATION FORECAST & SIMULATION (AT S8 DEGREE COMPLETION)", 16, currentY + 6.5);

                pdf.setFont("helvetica", "normal");
                pdf.setFontSize(7);
                pdf.setTextColor(...COLORS.textMuted);
                const presetText = metrics.curriculumPresetName ? `Curriculum Preset: ${metrics.curriculumPresetName}  •  ` : "";
                pdf.text(`${presetText}Analytical simulation based on ${gf.totalFutureCredits} planned credits. Unofficial estimate.`, 16, currentY + 11.2);

                // 3 Forecast KPI Cards
                const fCardW = (186 - 8 - 8) / 3; // ~56.6mm
                const fY = currentY + 14.5;

                // Card 1: Max Graduation CGPA
                pdf.setFillColor(...COLORS.gradeS);
                pdf.setDrawColor(...COLORS.borderLight);
                pdf.roundedRect(16, fY, fCardW, 12, 1.5, 1.5, "FD");
                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(10.5);
                pdf.setTextColor(...COLORS.textMain);
                pdf.text(String(gf.maxGraduationCGPA), 16 + (fCardW / 2), fY + 5.2, { align: "center" });
                pdf.setFontSize(6.5);
                pdf.setTextColor(...COLORS.textMuted);
                pdf.text("CUMULATIVE DEGREE MAX (ALL S)", 16 + (fCardW / 2), fY + 9.5, { align: "center" });

                // Card 2: Req for Distinction
                pdf.setFillColor(...COLORS.gradeA);
                pdf.roundedRect(16 + fCardW + 4, fY, fCardW, 12, 1.5, 1.5, "FD");
                pdf.setFont("helvetica", "bold");
                const distStr = String(gf.requiredForDistinction || "N/A");
                pdf.setFontSize(distStr.length > 8 ? 7.5 : (distStr.length > 5 ? 9 : 10.5));
                pdf.setTextColor(...COLORS.textMain);
                pdf.text(distStr, 16 + fCardW + 4 + (fCardW / 2), fY + 5.2, { align: "center" });
                pdf.setFontSize(6.5);
                pdf.setTextColor(...COLORS.textMuted);
                const distLabel = metrics.hasBacklogs ? "REQ. FUTURE SGPA FOR 8.00 CGPA*" : "REQ. FUTURE SGPA FOR DISTINCTION (8.0)";
                pdf.text(distLabel, 16 + fCardW + 4 + (fCardW / 2), fY + 9.5, { align: "center" });

                // Card 3: Req for First Class
                pdf.setFillColor(...COLORS.bgHeader);
                pdf.roundedRect(16 + (fCardW + 4) * 2, fY, fCardW, 12, 1.5, 1.5, "FD");
                pdf.setFont("helvetica", "bold");
                const fcStr = String(gf.requiredForFirstClass || "N/A");
                pdf.setFontSize(fcStr.length > 8 ? 7.5 : (fcStr.length > 5 ? 9 : 10.5));
                pdf.setTextColor(...COLORS.textMain);
                pdf.text(fcStr, 16 + (fCardW + 4) * 2 + (fCardW / 2), fY + 5.2, { align: "center" });
                pdf.setFontSize(6.5);
                pdf.setTextColor(...COLORS.textMuted);
                pdf.text("REQ. FUTURE SGPA FOR FIRST CLASS (6.5)", 16 + (fCardW + 4) * 2 + (fCardW / 2), fY + 9.5, { align: "center" });

                // Row of Projections: 7 target grade milestones (P, C, C+, B, B+, A, S)
                const pY = fY + 15;
                const pCardW = (186 - 8 - 12) / 7; // ~23.7mm
                const pList = [
                    ["P (5.5)", gf.projections.minP],
                    ["C (6.5)", gf.projections.maxC],
                    ["C+ (7.0)", gf.projections.maxCPlus],
                    ["B (7.5)", gf.projections.maxB],
                    ["B+ (8.0)", gf.projections.maxBPlus],
                    ["A (8.5)", gf.projections.maxA],
                    ["S (10.0)", gf.projections.maxS]
                ];

                pList.forEach((p, idx) => {
                    const px = 16 + idx * (pCardW + 2);
                    pdf.setFillColor(...COLORS.bgHeader);
                    pdf.setDrawColor(...COLORS.borderLight);
                    pdf.roundedRect(px, pY, pCardW, 10.5, 1, 1, "FD");

                    pdf.setFont("helvetica", "bold");
                    pdf.setFontSize(8.5);
                    pdf.setTextColor(...COLORS.textMain);
                    pdf.text(String(p[1]), px + (pCardW / 2), pY + 4.5, { align: "center" });

                    pdf.setFontSize(6.2);
                    pdf.setTextColor(...COLORS.textMuted);
                    pdf.text(p[0], px + (pCardW / 2), pY + 8.5, { align: "center" });
                });

                currentY += 50;
            }

            // Running header helper for subsequent pages
            function drawSubsequentPageHeader() {
                pdf.setFillColor(...COLORS.bgHeader);
                pdf.setDrawColor(...COLORS.borderLight);
                pdf.roundedRect(12, 10, 186, 7.5, 1.5, 1.5, "FD");

                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(8);
                pdf.setTextColor(...COLORS.primary);
                pdf.text("APJ ABDUL KALAM TECHNOLOGICAL UNIVERSITY • ACADEMIC PERFORMANCE REPORT", 16, 15);

                if (studentInfo && (studentInfo.name || studentInfo.registerNo)) {
                    pdf.setFont("helvetica", "normal");
                    pdf.setTextColor(...COLORS.textMuted);
                    pdf.text(`${studentInfo.name || ""} (${studentInfo.registerNo || ""})`, 194, 15, { align: "right" });
                }

                currentY = 22;
            }

            // =========================================================
            // 4. TWO-PASS RUNNING FOOTERS (PAGE X OF Y)
            // =========================================================
            const totalPages = pdf.internal.getNumberOfPages();
            for (let p = 1; p <= totalPages; p++) {
                pdf.setPage(p);

                // Divider line
                pdf.setDrawColor(...COLORS.borderLight);
                pdf.line(12, 287, 198, 287);

                // Footer Text
                pdf.setFont("helvetica", "normal");
                pdf.setFontSize(7.5);
                pdf.setTextColor(...COLORS.textLight);
                pdf.text("KTU CGPA Extension  •  Unofficial Academic Transcript Extract", 12, 291.5);
                pdf.text(`Page ${p} of ${totalPages}`, 198, 291.5, { align: "right" });
            }

            // Smart, collision-proof, recruiter-ready filename
            const filename = window.generateSmartAcademicFilename 
                ? window.generateSmartAcademicFilename("KTU_Academic_Report", "pdf", metrics, studentInfo)
                : "KTU-Academic-Report.pdf";
            pdf.save(filename);

            if (btn) {
                btn.innerHTML = "✅ Academic PDF Exported!";
                setTimeout(() => {
                    btn.innerHTML = originalBtnText;
                    btn.disabled = false;
                }, 2200);
            }
        } catch (err) {
            console.error("PDF Export Error:", err);
            if (btn) {
                btn.innerHTML = originalBtnText;
                btn.disabled = false;
            }
            alert("An error occurred while generating the PDF report.");
        }
    };

    if (explicitData && explicitData.length) {
        processExport(explicitData, explicitStudentInfo, explicitCurriculum);
    } else if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(["semesterData", "studentInfo", "futureCurriculum"], ({ semesterData, studentInfo, futureCurriculum }) => {
            processExport(semesterData, studentInfo, futureCurriculum);
        });
    } else {
        const activeId = localStorage.getItem("ktu_pwa_active_profile_id");
        let sData = null;
        let sInfo = null;
        let fCurriculum = null;
        if (activeId) {
            try {
                const parsed = JSON.parse(localStorage.getItem(`ktu_pwa_data_${activeId}`) || "null");
                if (parsed) {
                    sData = parsed.semesterData || parsed;
                    sInfo = parsed.studentInfo || null;
                }
                fCurriculum = JSON.parse(localStorage.getItem(`ktu_pwa_curriculum_${activeId}`) || "null");
            } catch (e) {}
        }
        processExport(sData, sInfo, fCurriculum);
    }
}