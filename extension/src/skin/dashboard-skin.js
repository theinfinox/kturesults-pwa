/**
 * KTU Supercharger - Executive Modern Bento Grid Dashboard
 */

(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.KTU_DASHBOARD_SKIN = factory();
    }
})(typeof self !== "undefined" ? self : this, function () {

    function renderModernDashboard(payload, metrics) {
        if (typeof document === "undefined") return null;

        let container = document.getElementById("ktu-supercharger-container");
        if (!container) {
            container = document.createElement("div");
            container.id = "ktu-supercharger-container";
            container.className = "ktu-supercharger-skin-root";

            // Find KTU's main container or insert before the accordion
            const nativeTarget = document.querySelector("#collapseFive")?.closest(".panel-group, .container") ||
                                 document.querySelector(".container, #page-wrapper, body");
            if (nativeTarget && nativeTarget.parentElement) {
                nativeTarget.parentElement.insertBefore(container, nativeTarget);
            } else {
                document.body.appendChild(container);
            }
        }

        const sInfo = payload.studentInfo || {};
        const sData = payload.semesterData || [];

        // Build HTML
        container.innerHTML = `
            <!-- 1. Executive Student Identity -->
            <div class="ktu-dash-card ktu-identity-card">
                <div class="ktu-identity-main">
                    <div class="ktu-student-headline">
                        <span class="ktu-name-highlight">${sInfo.name || "Student"}</span>
                        <span class="ktu-reg-badge">${sInfo.registerNo || "KTU REG"}</span>
                    </div>
                    <div class="ktu-student-dept">${sInfo.branch || "Engineering Discipline"}</div>
                    <div class="ktu-student-specs">
                        <span>${sInfo.scheme ? sInfo.scheme + " Scheme" : "KTU Scheme"}</span>
                        <span class="ktu-spec-dot">•</span>
                        <span>${sInfo.admissionYear ? sInfo.admissionYear + " Batch" : "KTU Batch"}</span>
                        <span class="ktu-spec-dot">•</span>
                        <span>${sInfo.isLateral ? "Lateral Entry Degree" : "Full Degree"}</span>
                        <span class="ktu-spec-dot">•</span>
                        <span>${sInfo.college || "KTU"}</span>
                    </div>
                </div>
            </div>

            <!-- 2. Bento Stats Grid -->
            <div class="ktu-bento-grid">
                <!-- CGPA Card -->
                <div class="ktu-dash-card ktu-bento-stat stat-cgpa">
                    <div class="ktu-stat-header">
                        <span class="ktu-stat-label">CGPA</span>
                        <span class="ktu-stat-tag">${(metrics.cgpa * 10).toFixed(1)}%</span>
                    </div>
                    <div class="ktu-stat-big-value">${metrics.cgpa.toFixed(2)}</div>
                    <div class="ktu-stat-sub">Cumulative Grade Point Average</div>
                </div>

                <!-- Backlogs Card -->
                <div class="ktu-dash-card ktu-bento-stat stat-backlogs ${metrics.activeBacklogs > 0 ? 'has-backlogs' : 'clear'}">
                    <div class="ktu-stat-header">
                        <span class="ktu-stat-label">BACKLOGS</span>
                        <span class="ktu-stat-tag ${metrics.activeBacklogs > 0 ? 'tag-danger' : 'tag-success'}">
                            ${metrics.activeBacklogs > 0 ? metrics.activeBacklogs + ' Active' : '0 Cleared'}
                        </span>
                    </div>
                    <div class="ktu-stat-big-value ${metrics.activeBacklogs > 0 ? 'text-danger' : 'text-success'}">
                        ${metrics.activeBacklogs}
                    </div>
                    <div class="ktu-stat-sub">
                        ${metrics.activeBacklogs > 0 ? metrics.backlogCredits + ' Backlog Credits' : 'All Passed'}
                    </div>
                </div>

                <!-- Credits Card -->
                <div class="ktu-dash-card ktu-bento-stat stat-credits">
                    <div class="ktu-stat-header">
                        <span class="ktu-stat-label">CREDITS</span>
                        <span class="ktu-stat-tag">${metrics.creditPercent}%</span>
                    </div>
                    <div class="ktu-stat-big-value">
                        ${metrics.totalEarnedCredits} <span class="ktu-stat-unit">cr</span>
                    </div>
                    <div class="ktu-progress-bar-wrap">
                        <div class="ktu-progress-bar-fill" style="width: ${metrics.creditPercent}%"></div>
                    </div>
                    <div class="ktu-stat-sub">${metrics.targetCredits} cr Degree Target</div>
                </div>

                <!-- Activities Card -->
                <div class="ktu-dash-card ktu-bento-stat stat-activities">
                    <div class="ktu-stat-header">
                        <span class="ktu-stat-label">ACTIVITIES</span>
                        <span class="ktu-stat-tag">${metrics.activitySummary.percent}%</span>
                    </div>
                    <div class="ktu-stat-big-value">
                        ${metrics.activitySummary.completed} <span class="ktu-stat-unit">/ ${metrics.activitySummary.target}</span>
                    </div>
                    <div class="ktu-progress-bar-wrap">
                        <div class="ktu-progress-bar-fill act-fill" style="width: ${metrics.activitySummary.percent}%"></div>
                    </div>
                    <div class="ktu-stat-sub">${metrics.activitySummary.completed >= metrics.activitySummary.target ? 'Target Achieved' : (metrics.activitySummary.target - metrics.activitySummary.completed) + ' pts required'}</div>
                </div>
            </div>

            <!-- 3. Academic Comeback Projections -->
            <div class="ktu-dash-card ktu-comeback-card">
                <div class="ktu-card-title">
                    <span>🚀</span> Academic Comeback Projections (Upon Clearing Backlogs)
                </div>
                <div class="ktu-comeback-grid">
                    ${renderComebackTiles(metrics.comebackProjections)}
                </div>
            </div>

            <!-- 4. Interactive Semester Records -->
            <div class="ktu-dash-card ktu-semesters-card">
                <div class="ktu-card-title">
                    <span>📚</span> Semester Course Records (${sData.length} Total Courses)
                </div>
                <div class="ktu-sem-accordion-list">
                    ${renderSemesterCards(sData, metrics.semesters)}
                </div>
            </div>
        `;

        return container;
    }

    function renderComebackTiles(comebacks) {
        if (!comebacks) return "";
        const labels = [
            { key: "minP", label: "Min P (5.5)" },
            { key: "maxD", label: "Max D (6.0)" },
            { key: "maxC", label: "Max C (6.5)" },
            { key: "maxCPlus", label: "Max C+ (7.0)" },
            { key: "maxB", label: "Max B (7.5)" },
            { key: "maxBPlus", label: "Max B+ (8.0)" },
            { key: "maxA", label: "Max A (8.5)" },
            { key: "maxAPlus", label: "Max A+ (9.0)" },
            { key: "maxS", label: "Max S (10.0)" }
        ];

        return labels.map(l => `
            <div class="ktu-comeback-tile">
                <div class="ktu-comeback-cgpa">${(comebacks[l.key] || 0.00).toFixed(2)}</div>
                <div class="ktu-comeback-label">${l.label}</div>
            </div>
        `).join("");
    }

    function renderSemesterCards(courses, semMetrics = {}) {
        const groups = {};
        courses.forEach(c => {
            const sem = c.semester || "S1";
            if (!groups[sem]) groups[sem] = [];
            groups[sem].push(c);
        });

        const sortedSems = Object.keys(groups).sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, ""), 10) || 0;
            const numB = parseInt(b.replace(/\D/g, ""), 10) || 0;
            return numA - numB;
        });

        return sortedSems.map(sem => {
            const list = groups[sem];
            const m = semMetrics[sem] || { sgpa: 0, earnedCredits: 0, backlogs: 0 };
            return `
                <div class="ktu-sem-block">
                    <div class="ktu-sem-header">
                        <div class="ktu-sem-title-box">
                            <span class="ktu-sem-name">${sem}</span>
                            <span class="ktu-sem-courses-count">${list.length} Courses</span>
                        </div>
                        <div class="ktu-sem-pills">
                            <span class="ktu-pill-sgpa">SGPA: <strong>${m.sgpa.toFixed(2)}</strong></span>
                            <span class="ktu-pill-credits">${m.earnedCredits} Credits</span>
                            ${m.backlogs > 0 ? `<span class="ktu-pill-backlog">${m.backlogs} Backlog</span>` : ""}
                        </div>
                    </div>
                    <div class="ktu-sem-table-wrap">
                        <table class="ktu-modern-table">
                            <thead>
                                <tr>
                                    <th>Code</th>
                                    <th>Course Name</th>
                                    <th>Slot</th>
                                    <th>Credits</th>
                                    <th>Grade</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${list.map(c => `
                                    <tr class="${c.isBacklog ? 'row-backlog' : (c.isAudit ? 'row-audit' : '')}">
                                        <td class="td-code">${c.code}</td>
                                        <td class="td-name">${c.name}</td>
                                        <td class="td-slot">${c.slot || "-"}</td>
                                        <td class="td-credits">${c.credits}</td>
                                        <td class="td-grade">
                                            <span class="ktu-grade-badge ${getGradeClass(c.grade)}">${c.grade}</span>
                                        </td>
                                    </tr>
                                `).join("")}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }).join("");
    }

    function getGradeClass(grade) {
        const g = (grade || "").toUpperCase();
        if (g === "S" || g === "O" || g === "A+") return "badge-top";
        if (g === "A" || g === "B+" || g === "B") return "badge-good";
        if (g === "C+" || g === "C" || g === "D" || g === "P") return "badge-pass";
        if (g === "F" || g === "FE" || g === "AB" || g === "I") return "badge-fail";
        return "badge-neutral";
    }

    return {
        renderModernDashboard
    };
});
