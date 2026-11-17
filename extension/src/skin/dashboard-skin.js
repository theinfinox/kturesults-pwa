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
            document.body.appendChild(container);
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
                        ${metrics.honorsMinors?.honorsEligible ? '<span class="ktu-spec-dot">•</span><span class="ktu-track-badge badge-honors" title="CGPA >= 8.50 with zero backlog history">🎖️ KTU Honors Eligible</span>' : ''}
                        ${!metrics.honorsMinors?.honorsEligible && metrics.honorsMinors?.minorsEligible ? '<span class="ktu-spec-dot">•</span><span class="ktu-track-badge badge-minors" title="CGPA >= 7.00 with zero active backlogs">📘 KTU Minor Eligible</span>' : ''}
                    </div>
                </div>
            </div>

            <!-- 2. Bento Stats Grid -->
            <div class="ktu-bento-grid">
                <!-- CGPA Card (Click to Copy) -->
                <div class="ktu-dash-card ktu-bento-stat stat-cgpa" title="Click to copy CGPA">
                    <div class="ktu-stat-header">
                        <span class="ktu-stat-label">CGPA</span>
                        <span class="ktu-stat-tag">${(metrics.cgpa * 10).toFixed(1)}%</span>
                    </div>
                    <div class="ktu-stat-big-value">${metrics.cgpa.toFixed(2)}</div>
                    <div class="ktu-stat-sub">
                        <span>Cumulative Grade Point Average</span>
                        <span class="ktu-click-copy-hint">📋 Click to copy</span>
                    </div>
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
                ${metrics.activeBacklogs === 0 ? `
                    <div class="ktu-comeback-clear-banner">
                        <span class="ktu-clear-icon">🎉</span>
                        <div class="ktu-clear-body">
                            <div class="ktu-clear-title">Zero Active Backlogs — Excellent Academic Standing!</div>
                            <div class="ktu-clear-desc">All registered courses successfully passed. Projections reflect your current locked CGPA of <strong>${metrics.cgpa.toFixed(2)}</strong>.</div>
                        </div>
                    </div>
                ` : ""}
                <div class="ktu-comeback-grid">
                    ${renderComebackTiles(metrics.comebackProjections)}
                </div>
            </div>

            <!-- 4. Interactive Semester Records -->
            <div class="ktu-dash-card ktu-semesters-card">
                <div class="ktu-card-header-row">
                    <div class="ktu-card-title" style="margin-bottom: 0;">
                        <span>📚</span> Semester Course Records (${sData.length} Total Courses)
                    </div>
                    <button id="ktuToggleAllSems" class="ktu-sem-toggle-all-btn" type="button" title="Expand or collapse all semester cards">
                        ↕ Collapse All
                    </button>
                </div>
                <div class="ktu-sem-accordion-list" id="ktuSemAccordionList">
                    ${renderSemesterCards(sData, metrics.semesters)}
                </div>
            </div>
        `;

        // Wire Up Interactive Handlers
        attachInteractiveListeners(container, metrics);

        return container;
    }

    function attachInteractiveListeners(container, metrics) {
        // 1. 1-Click Copy CGPA
        const cgpaCard = container.querySelector(".stat-cgpa");
        if (cgpaCard) {
            cgpaCard.addEventListener("click", () => {
                const textToCopy = `${metrics.cgpa.toFixed(2)} CGPA`;
                if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(textToCopy).then(() => {
                        showToast(`📋 Copied ${textToCopy} to clipboard!`);
                    }).catch(() => {
                        showToast(`📋 ${textToCopy}`);
                    });
                } else {
                    showToast(`📋 ${textToCopy}`);
                }
            });
        }

        // 2. Click on Semester Header to Toggle Expand/Collapse
        const headers = container.querySelectorAll(".ktu-sem-header");
        headers.forEach(hdr => {
            hdr.addEventListener("click", () => {
                const block = hdr.closest(".ktu-sem-block");
                if (block) {
                    block.classList.toggle("is-collapsed");
                    const chev = block.querySelector(".ktu-sem-chevron");
                    if (chev) {
                        chev.textContent = block.classList.contains("is-collapsed") ? "▶" : "▼";
                    }
                }
            });
        });

        // 3. Expand / Collapse All Toggle Button
        const toggleAllBtn = container.querySelector("#ktuToggleAllSems");
        if (toggleAllBtn) {
            let allCollapsed = false;
            toggleAllBtn.addEventListener("click", () => {
                allCollapsed = !allCollapsed;
                const blocks = container.querySelectorAll(".ktu-sem-block");
                blocks.forEach(block => {
                    if (allCollapsed) {
                        block.classList.add("is-collapsed");
                        const chev = block.querySelector(".ktu-sem-chevron");
                        if (chev) chev.textContent = "▶";
                    } else {
                        block.classList.remove("is-collapsed");
                        const chev = block.querySelector(".ktu-sem-chevron");
                        if (chev) chev.textContent = "▼";
                    }
                });
                toggleAllBtn.textContent = allCollapsed ? "↕ Expand All" : "↕ Collapse All";
            });
        }
    }

    function showToast(message) {
        if (typeof document === "undefined") return;
        let toast = document.getElementById("ktu-supercharger-toast");
        if (!toast) {
            toast = document.createElement("div");
            toast.id = "ktu-supercharger-toast";
            toast.className = "ktu-supercharger-toast";
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.add("show");
        if (toast._timer) clearTimeout(toast._timer);
        toast._timer = setTimeout(() => {
            toast.classList.remove("show");
        }, 2200);
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
                <div class="ktu-sem-block" data-semester="${sem}">
                    <div class="ktu-sem-header" role="button" tabindex="0" title="Click to expand/collapse ${sem}">
                        <div class="ktu-sem-title-box">
                            <span class="ktu-sem-chevron">▼</span>
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
        renderModernDashboard,
        showToast
    };
});
