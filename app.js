/**
 * KTU CGPA Standalone Mobile PWA - Main Application Controller
 * 100% Client-Side • LocalStorage Powered • Decoupled
 */

(function () {
    // --- Local Storage Keys ---
    const STORAGE_KEY_PROFILES = "ktu_pwa_saved_profiles";
    const STORAGE_KEY_ACTIVE_ID = "ktu_pwa_active_profile_id";
    const STORAGE_KEY_PRIMARY_ID = "ktu_pwa_primary_profile_id";
    const STORAGE_KEY_DATA_PREFIX = "ktu_pwa_data_";
    const STORAGE_KEY_CURRICULUM_PREFIX = "ktu_pwa_curriculum_";
    const STORAGE_KEY_CUSTOM_RELAY = "ktu_custom_relay";

    // --- In-Memory App State ---
    let savedProfiles = {};
    let activeProfileId = null;
    let currentSemesterData = null;
    let currentStudentInfo = null;
    let currentLastScraped = null;
    let currentFutureCurriculum = null;
    let currentMetrics = null;

    // --- DOM Elements ---
    const heroFastSyncBtn = document.getElementById("heroFastSyncBtn");
    const heroRefreshBtn = document.getElementById("heroRefreshBtn");
    const syncStatusPill = document.getElementById("syncStatusPill");
    const heroProfileName = document.getElementById("heroProfileName");
    const heroFreshnessBadge = document.getElementById("heroFreshnessBadge");

    const emptyState = document.getElementById("emptyState");
    const profileCard = document.getElementById("profileCard");
    const statsContainer = document.getElementById("statsContainer");
    const activeForecastBanner = document.getElementById("activeForecastBanner");
    const semesterContainer = document.getElementById("semesterContainer");
    const bottomActionBar = document.getElementById("bottomActionBar");

    const downloadPdfBtn = document.getElementById("downloadPdfBtn");
    const downloadCsvBtn = document.getElementById("downloadCsvBtn");
    const headerPdfBtn = document.getElementById("headerPdfBtn");
    const headerCsvBtn = document.getElementById("headerCsvBtn");
    const headerRefreshBtn = document.getElementById("headerRefreshBtn");
    const headerMenuDivider = document.getElementById("headerMenuDivider");

    // Modals
    const profileModal = document.getElementById("profileModal");
    const forecastModal = document.getElementById("forecastModal");
    const importModal = document.getElementById("importModal");

    // Modal Trigger Buttons
    const openProfileModalBtn = document.getElementById("openProfileModalBtn");
    const openForecastModalBtn = document.getElementById("openForecastModalBtn");
    const openImportModalBtn = document.getElementById("openImportModalBtn");
    const emptyConfigureBtn = document.getElementById("emptyConfigureBtn");
    const emptyImportBtn = document.getElementById("emptyImportBtn");
    const changeForecastInlineBtn = document.getElementById("changeForecastInlineBtn");

    // Modal Form Elements
    const profileSelectDropdown = document.getElementById("profileSelectDropdown");
    const headerProfileSwitcher = document.getElementById("headerProfileSwitcher");
    const addNewProfileBtn = document.getElementById("addNewProfileBtn");
    const setPrimaryProfileBtn = document.getElementById("setPrimaryProfileBtn");
    const primaryStatusText = document.getElementById("primaryStatusText");
    const inputProfileLabel = document.getElementById("inputProfileLabel");
    const inputProfileUsername = document.getElementById("inputProfileUsername");
    const inputProfilePassword = document.getElementById("inputProfilePassword");
    const inputProfilePin = document.getElementById("inputProfilePin");
    const saveProfileBtn = document.getElementById("saveProfileBtn");
    const deleteProfileBtn = document.getElementById("deleteProfileBtn");
    const formModeTitle = document.getElementById("formModeTitle");

    const schemeSelect = document.getElementById("schemeSelect");
    const applyForecastBtn = document.getElementById("applyForecastBtn");
    const clearForecastBtn = document.getElementById("clearForecastBtn");

    const jsonFileInput = document.getElementById("jsonFileInput");
    const customRelayInput = document.getElementById("customRelayInput");
    const saveRelayBtn = document.getElementById("saveRelayBtn");

    // In-Memory Session PIN Cache (Never persisted to disk)
    let cachedSessionPin = null;

    // --- 1. Initialization ---
    async function init() {
        loadProfilesFromStorage();
        await migrateLegacyProfiles();
        loadActiveStudentData();
        setupEventListeners();
        renderApp();
        await loadManifestVersion();
    }

    // --- Dynamic Manifest Version Sync ---
    async function loadManifestVersion() {
        try {
            const manifestLink = document.querySelector('link[rel="manifest"]');
            const manifestUrl = manifestLink ? manifestLink.getAttribute('href') : 'manifest.webmanifest';
            const res = await fetch(manifestUrl);
            if (res.ok) {
                const manifest = await res.json();
                const version = manifest.version || '1.0.0';
                const versionCode = manifest.version_code !== undefined ? manifest.version_code : (manifest.versionCode !== undefined ? manifest.versionCode : 1);

                document.querySelectorAll('.pwa-version-text').forEach(el => {
                    el.textContent = `v${version}`;
                });
                document.querySelectorAll('.pwa-version-code').forEach(el => {
                    el.textContent = `(Build ${versionCode})`;
                });
                document.querySelectorAll('.pwa-full-version').forEach(el => {
                    el.textContent = `v${version} (Build ${versionCode})`;
                });

                if (typeof window !== "undefined") {
                    window.__KTU_PWA_VERSION__ = { version, versionCode };
                }
                return { version, versionCode };
            }
        } catch (err) {
            console.log('[PWA] Manifest version reader notice:', err);
        }
    }

    // --- 2. Storage Helpers ---
    async function migrateLegacyProfiles() {
        if (!window.KTUCryptoVault) return;
        let modified = false;
        for (const [id, prof] of Object.entries(savedProfiles)) {
            if (prof.password && !prof.encryptedPassword) {
                try {
                    const enc = await window.KTUCryptoVault.encryptPassword(prof.password, null);
                    prof.encryptedPassword = enc;
                    delete prof.password; // Remove plaintext password from disk
                    modified = true;
                } catch (e) {
                    console.warn("[PWA] Migration to AES-256 failed for profile:", id, e);
                }
            }
        }
        if (modified) {
            saveProfilesToStorage();
            console.log("[PWA] 🔒 Successfully upgraded legacy profiles to AES-GCM-256 encryption.");
        }
    }

    function loadProfilesFromStorage() {
        try {
            savedProfiles = JSON.parse(localStorage.getItem(STORAGE_KEY_PROFILES) || "{}");
            const primaryId = localStorage.getItem(STORAGE_KEY_PRIMARY_ID);
            activeProfileId = (primaryId && savedProfiles[primaryId])
                ? primaryId
                : (localStorage.getItem(STORAGE_KEY_ACTIVE_ID) || Object.keys(savedProfiles)[0] || null);

            if (!activeProfileId && Object.keys(savedProfiles).length > 0) {
                activeProfileId = Object.keys(savedProfiles)[0];
                localStorage.setItem(STORAGE_KEY_ACTIVE_ID, activeProfileId);
            }
        } catch (e) {
            savedProfiles = {};
            activeProfileId = null;
        }
        updateProfileDropdown();
    }

    function saveProfilesToStorage() {
        localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(savedProfiles));
        if (activeProfileId) {
            localStorage.setItem(STORAGE_KEY_ACTIVE_ID, activeProfileId);
        } else {
            localStorage.removeItem(STORAGE_KEY_ACTIVE_ID);
        }
        updateProfileDropdown();
    }

    function loadActiveStudentData() {
        if (!activeProfileId) {
            currentSemesterData = null;
            currentStudentInfo = null;
            currentLastScraped = null;
            currentFutureCurriculum = null;
            return;
        }

        try {
            const rawData = localStorage.getItem(STORAGE_KEY_DATA_PREFIX + activeProfileId);
            if (rawData) {
                const parsed = JSON.parse(rawData);
                currentSemesterData = parsed.semesterData || null;
                currentStudentInfo = parsed.studentInfo || null;
                currentLastScraped = parsed.lastScraped || null;
            } else {
                currentSemesterData = null;
                currentStudentInfo = null;
                currentLastScraped = null;
            }

            const rawCurr = localStorage.getItem(STORAGE_KEY_CURRICULUM_PREFIX + activeProfileId);
            currentFutureCurriculum = rawCurr ? JSON.parse(rawCurr) : null;
        } catch (e) {
            currentSemesterData = null;
            currentStudentInfo = null;
            currentLastScraped = null;
            currentFutureCurriculum = null;
        }
    }

    function saveActiveStudentData(semesterData, studentInfo, timestamp) {
        if (!activeProfileId) return;
        const payload = {
            semesterData,
            studentInfo,
            lastScraped: timestamp || new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEY_DATA_PREFIX + activeProfileId, JSON.stringify(payload));
        currentSemesterData = semesterData;
        currentStudentInfo = studentInfo;
        currentLastScraped = payload.lastScraped;

        // Also update lastGrabbed timestamp on the profile
        if (savedProfiles[activeProfileId]) {
            savedProfiles[activeProfileId].lastGrabbed = currentLastScraped;
            saveProfilesToStorage();
        }
    }

    // --- 3. UI Helpers ---
    function formatRelativeTime(isoStr) {
        if (!isoStr) return "Offline Ready";
        try {
            const sec = Math.max(0, Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000));
            if (sec < 45) return "Synced just now";
            const min = Math.floor(sec / 60);
            if (min < 60) return `Synced ${min}m ago`;
            const hr = Math.floor(min / 60);
            if (hr < 24) return `Synced ${hr}h ago`;
            const days = Math.floor(hr / 24);
            return `Synced ${days}d ago`;
        } catch (e) {
            return "Offline Ready";
        }
    }

    function showStatus(msg, type = "loading") {
        if (!syncStatusPill) return;
        syncStatusPill.className = `status-pill ${type}`;
        syncStatusPill.innerHTML = msg;
        syncStatusPill.style.display = "block";
    }

    function hideStatus() {
        if (syncStatusPill) syncStatusPill.style.display = "none";
    }

    function openModal(el) {
        if (el) el.style.display = "flex";
    }

    function closeModal(el) {
        if (el) el.style.display = "none";
    }

    // --- 4. Profile Form Management ---
    function updateProfileDropdown() {
        if (!profileSelectDropdown) return;
        profileSelectDropdown.innerHTML = "";
        if (headerProfileSwitcher) headerProfileSwitcher.innerHTML = "";

        const keys = Object.keys(savedProfiles);
        const primaryId = localStorage.getItem(STORAGE_KEY_PRIMARY_ID) || (keys.length > 0 ? keys[0] : null);

        if (keys.length === 0) {
            profileSelectDropdown.innerHTML = `<option value="">-- No Profiles Saved --</option>`;
            if (headerProfileSwitcher) headerProfileSwitcher.style.display = "none";
            if (heroProfileName) heroProfileName.textContent = "No Profile Configured";
            if (heroFreshnessBadge) heroFreshnessBadge.textContent = "Setup Required";
            if (primaryStatusText) primaryStatusText.innerHTML = "⭐ <strong>Default Account:</strong> None";
            if (setPrimaryProfileBtn) setPrimaryProfileBtn.style.display = "none";
            populateProfileForm(null);
            return;
        }

        keys.forEach(k => {
            const p = savedProfiles[k];
            const isPrimary = (k === primaryId);
            const optText = isPrimary ? `⭐ ${p.label} (${p.username}) [Primary]` : `👤 ${p.label} (${p.username})`;

            // Modal Dropdown
            const opt = document.createElement("option");
            opt.value = k;
            opt.textContent = optText;
            if (k === activeProfileId) opt.selected = true;
            profileSelectDropdown.appendChild(opt);

            // Header Quick Switcher Dropdown
            if (headerProfileSwitcher) {
                const hOpt = document.createElement("option");
                hOpt.value = k;
                hOpt.textContent = isPrimary ? `⭐ ${p.label}` : `👤 ${p.label}`;
                if (k === activeProfileId) hOpt.selected = true;
                headerProfileSwitcher.appendChild(hOpt);
            }
        });

        // Show header switcher if 2 or more profiles exist
        if (headerProfileSwitcher) {
            headerProfileSwitcher.style.display = (keys.length >= 2) ? "inline-block" : "none";
        }

        const activeProf = savedProfiles[activeProfileId];
        if (activeProf) {
            if (heroProfileName) heroProfileName.textContent = `${activeProf.label} (${activeProf.username})`;
            if (heroFreshnessBadge) heroFreshnessBadge.textContent = formatRelativeTime(currentLastScraped || activeProf.lastGrabbed);
            populateProfileForm(activeProf);

            // Update Primary Status Controls
            const isCurrPrimary = (activeProfileId === primaryId);
            if (primaryStatusText) {
                const primProf = savedProfiles[primaryId];
                primaryStatusText.innerHTML = `⭐ <strong>Default Account:</strong> ${primProf ? primProf.label : 'None'}`;
            }
            if (setPrimaryProfileBtn) {
                setPrimaryProfileBtn.style.display = "block";
                if (isCurrPrimary) {
                    setPrimaryProfileBtn.textContent = "Current Primary ⭐";
                    setPrimaryProfileBtn.disabled = true;
                    setPrimaryProfileBtn.style.opacity = "0.7";
                } else {
                    setPrimaryProfileBtn.textContent = "Set as Primary ⭐";
                    setPrimaryProfileBtn.disabled = false;
                    setPrimaryProfileBtn.style.opacity = "1";
                }
            }
        }
    }

    function populateProfileForm(profile) {
        if (!profile) {
            if (inputProfileLabel) inputProfileLabel.value = "";
            if (inputProfileUsername) inputProfileUsername.value = "";
            if (inputProfilePassword) {
                inputProfilePassword.value = "";
                inputProfilePassword.placeholder = "Your password";
            }
            if (inputProfilePin) {
                inputProfilePin.value = "";
                inputProfilePin.placeholder = "Leave blank for automatic device key";
            }
            if (deleteProfileBtn) deleteProfileBtn.style.display = "none";
            if (formModeTitle) formModeTitle.textContent = "Add New Profile";
            return;
        }

        if (inputProfileLabel) inputProfileLabel.value = profile.label || "";
        if (inputProfileUsername) inputProfileUsername.value = profile.username || "";
        if (inputProfilePassword) {
            inputProfilePassword.value = "";
            inputProfilePassword.placeholder = profile.encryptedPassword ? "•••••••• (Password Encrypted)" : "Your password";
        }
        if (inputProfilePin) {
            inputProfilePin.value = "";
            inputProfilePin.placeholder = (profile.encryptedPassword?.mode === "pin") 
                ? "PIN is set (Enter new PIN to change)" 
                : "Leave blank for automatic device key";
        }
        if (deleteProfileBtn) deleteProfileBtn.style.display = "block";
        if (formModeTitle) formModeTitle.textContent = `Edit Profile: ${profile.label}`;
    }

    // --- Decryption Helper with PIN Authentication Modal ---
    async function getDecryptedPassword(profile) {
        if (!profile) return null;
        if (profile.password) return profile.password; // Legacy unmigrated
        if (!profile.encryptedPassword) return null;

        const enc = profile.encryptedPassword;
        if (enc.mode === "device" || !enc.mode) {
            return await window.KTUCryptoVault.decryptPassword(enc, null);
        }

        if (enc.mode === "pin") {
            // Check if PIN already cached in memory for this session
            if (cachedSessionPin) {
                try {
                    return await window.KTUCryptoVault.decryptPassword(enc, cachedSessionPin);
                } catch (e) {
                    cachedSessionPin = null; // PIN was wrong or changed
                }
            }

            // Prompt user via pinUnlockModal
            return new Promise((resolve, reject) => {
                const pinModal = document.getElementById("pinUnlockModal");
                const pinInput = document.getElementById("inputUnlockPin");
                const confirmBtn = document.getElementById("confirmUnlockPinBtn");
                const promptLabel = document.getElementById("pinUnlockPromptLabel");

                if (promptLabel) promptLabel.textContent = `Enter PIN for ${profile.label} (${profile.username}):`;
                if (pinInput) pinInput.value = "";
                openModal(pinModal);
                if (pinInput) pinInput.focus();

                const cleanup = () => {
                    confirmBtn?.removeEventListener("click", onConfirm);
                    document.querySelectorAll("[data-close='pinUnlockModal']").forEach(b => b.removeEventListener("click", onCancel));
                };

                const onConfirm = async () => {
                    const pin = (pinInput?.value || "").trim();
                    if (!pin) {
                        alert("Please enter your Security PIN.");
                        return;
                    }
                    try {
                        const plain = await window.KTUCryptoVault.decryptPassword(enc, pin);
                        cachedSessionPin = pin;
                        cleanup();
                        closeModal(pinModal);
                        resolve(plain);
                    } catch (err) {
                        alert("❌ Incorrect Security PIN. Please try again.");
                        if (pinInput) {
                            pinInput.value = "";
                            pinInput.focus();
                        }
                    }
                };

                const onCancel = () => {
                    cleanup();
                    closeModal(pinModal);
                    reject(new Error("PIN authentication cancelled."));
                };

                confirmBtn?.addEventListener("click", onConfirm);
                document.querySelectorAll("[data-close='pinUnlockModal']").forEach(b => b.addEventListener("click", onCancel));
            });
        }

        return null;
    }

    // --- 5. 1-Click Fast Sync Trigger ---
    async function handleFastSync() {
        if (!activeProfileId || !savedProfiles[activeProfileId]) {
            openModal(profileModal);
            showStatus("⚠️ Please save your KTU portal credentials first.", "error");
            return;
        }

        const profile = savedProfiles[activeProfileId];
        let plainPassword = "";
        try {
            plainPassword = await getDecryptedPassword(profile);
            if (!plainPassword) {
                openModal(profileModal);
                showStatus("⚠️ Please enter your portal password.", "error");
                return;
            }
        } catch (err) {
            showStatus(`🔒 ${err.message}`, "warning");
            return;
        }

        heroFastSyncBtn.disabled = true;
        if (heroRefreshBtn) heroRefreshBtn.disabled = true;
        if (headerRefreshBtn) headerRefreshBtn.disabled = true;
        showStatus(`🌐 Connecting to KTU portal for <strong>${profile.username}</strong>...`, "loading");

        try {
            const result = await window.KTUSyncEngine.executeFastSync(profile.username, plainPassword);
            plainPassword = ""; // Memory hygiene: purge plaintext password immediately
            if (result.sessionCookies) {
                profile.sessionCookies = result.sessionCookies;
                saveProfilesToStorage();
            }
            saveActiveStudentData(result.semesterData, result.studentInfo, result.timestamp);
            renderApp();
            showStatus(`✅ <strong>Fast Synced in ${result.elapsedMs}ms!</strong> ${result.semesterData.length} courses loaded for ${result.studentInfo.name || profile.username}.`, "success");
            setTimeout(hideStatus, 4000);
            heroFastSyncBtn.disabled = false;
            if (heroRefreshBtn) heroRefreshBtn.disabled = false;
            if (headerRefreshBtn) headerRefreshBtn.disabled = false;
        } catch (err) {
            plainPassword = ""; // Memory hygiene: purge plaintext password on failure
            const isLockoutOrThrottle = err.message.includes("disabled") || err.message.includes("wait") || err.message.includes("Shield") || err.message.includes("Invalid");
            showStatus(`❌ <strong>Sync Failed:</strong> ${err.message}`, "error");

            if (isLockoutOrThrottle) {
                // Determine cooldown duration: 180s for lockout, 30s for standard invalid credential
                let cooldownSec = err.message.includes("disabled") ? 180 : 30;
                const matchWait = err.message.match(/(\d+)\s*s/i);
                if (matchWait) cooldownSec = parseInt(matchWait[1], 10);

                heroFastSyncBtn.disabled = true;
                if (heroRefreshBtn) heroRefreshBtn.disabled = true;
                if (headerRefreshBtn) headerRefreshBtn.disabled = true;
                const origHtml = heroFastSyncBtn.innerHTML;
                const timerId = setInterval(() => {
                    cooldownSec--;
                    if (cooldownSec <= 0) {
                        clearInterval(timerId);
                        heroFastSyncBtn.disabled = false;
                        if (heroRefreshBtn) heroRefreshBtn.disabled = false;
                        if (headerRefreshBtn) headerRefreshBtn.disabled = false;
                        heroFastSyncBtn.innerHTML = origHtml;
                    } else {
                        heroFastSyncBtn.innerHTML = `<span>⏳ Shield Active (${cooldownSec}s)</span>`;
                    }
                }, 1000);
            } else {
                heroFastSyncBtn.disabled = false;
                if (heroRefreshBtn) heroRefreshBtn.disabled = false;
                if (headerRefreshBtn) headerRefreshBtn.disabled = false;
            }
        }
    }

    // --- 5b. Zero-Login Session Refresh Trigger ---
    // Strictly re-fetches latest document via cached session cookies (0 login requests to KTU)
    async function handleSessionRefresh() {
        if (!activeProfileId || !savedProfiles[activeProfileId]) {
            openModal(profileModal);
            showStatus("⚠️ Please configure or select a student profile first.", "error");
            return;
        }

        const profile = savedProfiles[activeProfileId];
        if (heroRefreshBtn) heroRefreshBtn.disabled = true;
        if (headerRefreshBtn) headerRefreshBtn.disabled = true;
        if (heroFastSyncBtn) heroFastSyncBtn.disabled = true;

        showStatus(`🔄 Probing KTU with cached session for <strong>${profile.username}</strong> (0 logins sent)...`, "loading");

        try {
            const result = await window.KTUSyncEngine.executeSessionRefresh(profile.username, profile.sessionCookies || null);
            if (result.sessionCookies) {
                profile.sessionCookies = result.sessionCookies;
                saveProfilesToStorage();
            }
            saveActiveStudentData(result.semesterData, result.studentInfo, result.timestamp);
            renderApp();
            showStatus(`⚡ <strong>Zero-Login Refresh in ${result.elapsedMs}ms!</strong> Latest records loaded (0 logins sent to KTU).`, "success");
            setTimeout(hideStatus, 4000);
        } catch (err) {
            console.warn("[PWA] Session refresh warning:", err);
            if (err.sessionExpired) {
                showStatus(`ℹ️ <strong>Cached session expired.</strong> Zero login attempts were made to protect your account. Click <strong>Fast Sync</strong> to re-authenticate.`, "warning");
            } else {
                showStatus(`❌ <strong>Refresh Failed:</strong> ${err.message}`, "error");
            }
        } finally {
            if (heroRefreshBtn) heroRefreshBtn.disabled = false;
            if (headerRefreshBtn) headerRefreshBtn.disabled = false;
            if (heroFastSyncBtn) heroFastSyncBtn.disabled = false;
        }
    }

    // --- 6. Core Dashboard Rendering ---
    function renderApp() {
        const semesterData = currentSemesterData;
        const studentInfo = currentStudentInfo;
        const futureCurriculum = currentFutureCurriculum;

        // Active Profile Label in Hero
        const activeProf = savedProfiles[activeProfileId];
        if (heroProfileName) {
            heroProfileName.textContent = activeProf ? `${activeProf.label} (${activeProf.username})` : "No Profile Configured";
        }
        if (heroFreshnessBadge) {
            heroFreshnessBadge.textContent = formatRelativeTime(currentLastScraped);
        }

        // Empty State Handler
        if (!semesterData || !semesterData.length) {
            if (emptyState) emptyState.style.display = "block";
            if (profileCard) profileCard.style.display = "none";
            if (statsContainer) statsContainer.innerHTML = "";
            if (activeForecastBanner) activeForecastBanner.style.display = "none";
            if (semesterContainer) semesterContainer.innerHTML = "";
            if (bottomActionBar) bottomActionBar.style.display = "none";
            if (headerPdfBtn) headerPdfBtn.style.display = "none";
            if (headerCsvBtn) headerCsvBtn.style.display = "none";
            if (headerMenuDivider) headerMenuDivider.style.display = "none";
            return;
        }

        if (emptyState) emptyState.style.display = "none";
        if (profileCard) profileCard.style.display = "flex";
        if (bottomActionBar) bottomActionBar.style.display = "flex";
        if (headerPdfBtn) headerPdfBtn.style.display = "inline-flex";
        if (headerCsvBtn) headerCsvBtn.style.display = "inline-flex";
        if (headerMenuDivider) headerMenuDivider.style.display = "block";

        // Auto-Detect Curriculum Scheme
        let activeCurriculum = currentFutureCurriculum;
        let isAutoDetected = false;
        let isExplicitlyDisabled = false;
        let autoResolvedInfo = null;

        if (activeCurriculum && activeCurriculum.disabled) {
            activeCurriculum = null;
            isExplicitlyDisabled = true;
        }

        if (window.resolveKTUSchemeAndBranch) {
            autoResolvedInfo = window.resolveKTUSchemeAndBranch(studentInfo, semesterData);
        }

        if (!activeCurriculum && !isExplicitlyDisabled && autoResolvedInfo && autoResolvedInfo.recommendedPreset) {
            activeCurriculum = { preset: autoResolvedInfo.recommendedPreset };
            isAutoDetected = true;
        }

        let activePresetLabel = "Standard KTU Curriculum";
        if (activeCurriculum && activeCurriculum.preset && window.KTU_SCHEMES && window.KTU_SCHEMES[activeCurriculum.preset]) {
            activePresetLabel = window.KTU_SCHEMES[activeCurriculum.preset].name;
        } else if (isAutoDetected && autoResolvedInfo && autoResolvedInfo.presetLabel) {
            activePresetLabel = autoResolvedInfo.presetLabel;
        }

        const metrics = window.calculateAcademicMetrics(semesterData, activeCurriculum);
        if (!metrics) return;

        currentMetrics = metrics;
        metrics.curriculumPresetName = (metrics.level === 2 && !isExplicitlyDisabled) ? activePresetLabel : null;

        // Render Student Profile Card
        const normProfile = window.getNormalizedStudentProfile 
            ? window.getNormalizedStudentProfile(studentInfo, semesterData, metrics)
            : null;

        // Auto-heal legacy cached "Minor Branch" in studentInfo if found
        if (studentInfo && normProfile && (/^minor\s*branch$/i.test(studentInfo.branch) || !studentInfo.branch)) {
            studentInfo.branch = normProfile.dept;
            if (activeProfileId) {
                const payload = {
                    semesterData,
                    studentInfo,
                    lastScraped: currentLastScraped || new Date().toISOString()
                };
                localStorage.setItem(STORAGE_KEY_DATA_PREFIX + activeProfileId, JSON.stringify(payload));
            }
        }

        const profileNameEl = document.getElementById("profileName");
        const profileRegNoEl = document.getElementById("profileRegNo");
        const institutionTextEl = document.getElementById("institutionText");
        const badgeDeptEl = document.getElementById("badgeDept");
        const badgeBatchEl = document.getElementById("badgeBatch");
        const badgeSchemeEl = document.getElementById("badgeScheme");
        const badgeLevelEl = document.getElementById("badgeLevel");

        const cleanStr = (s) => (s ? String(s).replace(/\s+/g, " ").trim() : "");
        if (profileNameEl) profileNameEl.textContent = cleanStr(normProfile?.name || studentInfo?.name) || "Student Profile";
        if (profileRegNoEl) profileRegNoEl.textContent = cleanStr(normProfile?.ktuId || studentInfo?.registerNo) || "N/A";
        if (institutionTextEl) institutionTextEl.textContent = cleanStr(normProfile?.institution || studentInfo?.institution) || "APJ Abdul Kalam Technological University";
        
        let deptLabel = cleanStr(normProfile?.dept) || "Engineering";
        if (normProfile?.minorDept && !normProfile.minorDept.toLowerCase().includes("none") && !normProfile.minorDept.toLowerCase().includes("minor")) {
            deptLabel += ` (Minor: ${normProfile.minorDept})`;
        }
        if (badgeDeptEl) badgeDeptEl.textContent = `💻 ${deptLabel}`;
        if (badgeBatchEl) badgeBatchEl.textContent = `📅 ${cleanStr(normProfile?.year) || "KTU Batch"}`;
        if (badgeSchemeEl) badgeSchemeEl.textContent = `📜 ${cleanStr(normProfile?.scheme) || "KTU Scheme"}`;
        if (badgeLevelEl) {
            badgeLevelEl.textContent = metrics.level === 1 ? "🎓 Full Degree" : (metrics.level === 2 ? "🔮 Forecast" : "📚 Completed Actuals");
        }

        // Render Active Forecast Banner
        if (activeForecastBanner) {
            const presetLabelEl = document.getElementById("forecastPresetLabel");
            const subLabelEl = document.getElementById("forecastSubLabel");
            if (metrics.level === 2 && !isExplicitlyDisabled) {
                activeForecastBanner.style.display = "flex";
                if (presetLabelEl) presetLabelEl.textContent = activePresetLabel;
                if (subLabelEl) {
                    subLabelEl.textContent = isAutoDetected 
                        ? `✨ Auto-detected from coursework • ${metrics.futureSemesters.length} Future Semesters Projected`
                        : `⚙️ Manually Selected • ${metrics.futureSemesters.length} Future Semesters Projected`;
                }
            } else {
                activeForecastBanner.style.display = "none";
                if (presetLabelEl) presetLabelEl.textContent = "";
                if (subLabelEl) subLabelEl.textContent = "";
            }
        }

        // Render Stats Grid
        renderStats(metrics);

        // Render Semester Cards
        const allSemesters = metrics.level === 2 && metrics.futureSemesters.length > 0
            ? [...metrics.semesters, ...metrics.futureSemesters]
            : metrics.semesters;

        renderSemesterCards(allSemesters, metrics.level === 2);
    }

    // --- 7. Stats Grid Renderer ---
    function renderStats(metrics) {
        if (!statsContainer) return;
        const eqPct = metrics.equivalentPercentage || (parseFloat(metrics.currentCGPA) * 10).toFixed(2);
        const gf = metrics.graduationForecast;
        const totalTarget = gf ? gf.totalDegreeCredits : (metrics.totalCredits || 160);
        const progressPct = Math.min(100, Math.max(0, Math.round((metrics.earnedCredits / (totalTarget || 160)) * 100)));

        let html = `
            <div class="stats-grid">
                <div class="stat-card featured" id="cgpaCard" title="Tap to copy CGPA">
                    <div class="copy-toast" id="copyToast">✓ Copied!</div>
                    <div class="value">${metrics.currentCGPA}</div>
                    <div class="label">Cumulative CGPA (${eqPct}%)</div>
                </div>

                <div class="stat-card ${metrics.hasBacklogs ? 'accent-danger' : 'accent-success'}">
                    <div class="value">${metrics.totalBacklogs}</div>
                    <div class="label">${metrics.hasBacklogs ? '💀 Active Backlogs' : '✨ Backlogs (All Clear)'}</div>
                </div>

                <div class="stat-card accent-success">
                    <div class="value">${metrics.earnedCredits} cr</div>
                    <div class="label">Earned Credits</div>
                </div>

                <div class="stat-card">
                    <div class="value">${metrics.earnedCredits} / ${totalTarget}</div>
                    <div class="label">${gf ? `Degree Progress (${progressPct}% • ${gf.totalFutureCredits}cr rem.)` : `Degree Progress (${progressPct}%)`}</div>
                    <div class="stat-progress-bar" title="${progressPct}% completed"><div class="stat-progress-fill" style="width: ${progressPct}%;"></div></div>
                </div>
            </div>
        `;

        // Level 2 Forecast Projections
        if (metrics.level === 2 && gf) {
            html += `
                <div class="section-header">
                    <div class="section-title">🔮 Degree Graduation Forecast (At S8 Completion)</div>
                </div>
                <div class="stats-grid" style="grid-template-columns: repeat(2, 1fr); margin-bottom: 12px;">
                    <div class="stat-card accent-success" style="padding: 14px;">
                        <div class="value" style="font-size: 24px;">${gf.maxGraduationCGPA}</div>
                        <div class="label">👑 Max Possible Degree CGPA (All S)</div>
                    </div>
                    <div class="stat-card" style="padding: 14px;">
                        <div class="value" style="font-size: 18px;">${gf.requiredForDistinction || "N/A"}</div>
                        <div class="label">${metrics.hasBacklogs ? '🎯 Req. for 8.0 CGPA' : '🎯 Req. for First Class with Distinction'}</div>
                    </div>
                </div>
            `;

            if (gf.projections) {
                html += `
                    <div class="section-header">
                        <div class="section-title">📈 Degree Projections by Future Grade Average</div>
                    </div>
                    <div class="comeback-grid">
                        <div class="stat-card">
                            <div class="value">${gf.projections.minP}</div>
                            <div class="label">P (5.5)</div>
                        </div>
                        <div class="stat-card">
                            <div class="value">${gf.projections.maxD}</div>
                            <div class="label">D (6.0)</div>
                        </div>
                        <div class="stat-card">
                            <div class="value">${gf.projections.maxC}</div>
                            <div class="label">C (6.5)</div>
                        </div>
                        <div class="stat-card">
                            <div class="value">${gf.projections.maxCPlus || "N/A"}</div>
                            <div class="label">C+ (7.0)</div>
                        </div>
                        <div class="stat-card">
                            <div class="value">${gf.projections.maxB}</div>
                            <div class="label">B (7.5)</div>
                        </div>
                        <div class="stat-card">
                            <div class="value">${gf.projections.maxBPlus || "N/A"}</div>
                            <div class="label">B+ (8.0)</div>
                        </div>
                        <div class="stat-card">
                            <div class="value">${gf.projections.maxA}</div>
                            <div class="label">A (8.5)</div>
                        </div>
                        <div class="stat-card">
                            <div class="value">${gf.projections.maxAPlus}</div>
                            <div class="label">A+ (9.0)</div>
                        </div>
                    </div>
                `;
            }
        }

        // Academic Comeback Projections (Clear Backlogs) - ALL POSSIBILITIES
        if (metrics.hasBacklogs && metrics.projections) {
            html += `
                <div class="section-header">
                    <div class="section-title">🚀 Academic Comeback Projections (Clear Backlogs)</div>
                </div>
                <div class="comeback-grid">
                    <div class="stat-card">
                        <div class="value">${metrics.projections.minP}</div>
                        <div class="label">Min P (5.5)</div>
                    </div>
                    <div class="stat-card">
                        <div class="value">${metrics.projections.maxD}</div>
                        <div class="label">Max D (6.0)</div>
                    </div>
                    <div class="stat-card">
                        <div class="value">${metrics.projections.maxC}</div>
                        <div class="label">Max C (6.5)</div>
                    </div>
                    <div class="stat-card">
                        <div class="value">${metrics.projections.maxCPlus || "N/A"}</div>
                        <div class="label">Max C+ (7.0)</div>
                    </div>
                    <div class="stat-card">
                        <div class="value">${metrics.projections.maxB}</div>
                        <div class="label">Max B (7.5)</div>
                    </div>
                    <div class="stat-card">
                        <div class="value">${metrics.projections.maxBPlus || "N/A"}</div>
                        <div class="label">Max B+ (8.0)</div>
                    </div>
                    <div class="stat-card">
                        <div class="value">${metrics.projections.maxA}</div>
                        <div class="label">Max A (8.5)</div>
                    </div>
                    <div class="stat-card">
                        <div class="value">${metrics.projections.maxAPlus}</div>
                        <div class="label">Max A+ (9.0)</div>
                    </div>
                </div>
                <div class="featured-comeback-card">
                    <div class="value">${metrics.projections.maxS}</div>
                    <div class="label">👑 Maximum Possible CGPA (If All Backlogs Cleared with S Grade • 10.0)</div>
                </div>
            `;
        }

        statsContainer.innerHTML = html;

        // Bind CGPA Copy
        const cgpaCard = document.getElementById("cgpaCard");
        if (cgpaCard) {
            cgpaCard.addEventListener("click", () => {
                const text = `${metrics.currentCGPA} CGPA (${eqPct}%)`;
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(text).then(() => {
                        const toast = document.getElementById("copyToast");
                        if (toast) {
                            toast.classList.add("show");
                            setTimeout(() => toast.classList.remove("show"), 1800);
                        }
                    });
                }
            });
        }
    }

    // --- 8. Semester Cards Renderer ---
    function renderSemesterCards(semesters, hasProjected = false) {
        if (!semesterContainer) return;
        semesterContainer.innerHTML = "";

        const header = document.createElement("div");
        header.className = "section-header";
        header.innerHTML = `<div class="section-title">📚 Semester Breakdown ${hasProjected ? '(Completed & Forecast)' : ''}</div>`;
        semesterContainer.appendChild(header);

        semesters.forEach(sem => {
            const card = document.createElement("div");
            card.className = `semester-card ${sem.isProjected ? 'projected' : ''}`;

            const badgeHtml = sem.isProjected
                ? `<span style="font-size: 11px; font-weight: 700; color: #1D4ED8; background: #DBEAFE; padding: 2px 8px; border-radius: 999px;">🔮 FORECAST</span>`
                : `<span class="semester-sgpa-badge">SGPA: ${sem.sgpa}</span>`;

            card.innerHTML = `
                <div class="semester-header">
                    <div class="semester-title">
                        <span>${sem.semester}</span>
                        <span class="accordion-chevron">▾</span>
                    </div>
                    ${badgeHtml}
                </div>
                <div class="semester-meta">
                    <span class="pill-badge">📚 ${sem.earnedCredits} / ${sem.totalCredits} Credits</span>
                    ${!sem.isProjected ? `<span class="pill-badge">✅ ${sem.passed} Passed</span>` : ''}
                    ${!sem.isProjected && sem.backlogs > 0 ? `<span class="pill-badge" style="background:#FEF2F2; color:#991B1B;">💀 ${sem.backlogs} Backlogs</span>` : ''}
                    ${sem.pending > 0 ? `<span class="pill-badge">⏳ ${sem.pending} Pending</span>` : ''}
                </div>
                <div class="semester-body"></div>
            `;

            // Toggle collapse
            const headerEl = card.querySelector(".semester-header");
            headerEl.addEventListener("click", () => {
                card.classList.toggle("collapsed");
                equalizeSemesterCardHeights();
            });

            const bodyEl = card.querySelector(".semester-body");

            sem.subjects.forEach(sub => {
                const row = document.createElement("div");
                row.className = "subject-row";

                const parts = (sub.subject || "").split("-");
                const code = parts[0]?.trim() || "";
                const name = parts.length > 1 ? parts.slice(1).join("-").trim() : code;
                const grade = String(sub.grade || "").trim();

                const gradeClass = sem.isProjected 
                    ? "grade-planned" 
                    : (window.getGradeClass ? window.getGradeClass(grade) : "");

                row.innerHTML = `
                    <div class="subject-info">
                        <div class="subject-code">${code}</div>
                        <div class="subject-name">${name}</div>
                    </div>
                    <div class="subject-right">
                        <span class="subject-credit">${sub.credit} cr</span>
                        <span class="grade-badge ${gradeClass}">${sem.isProjected ? 'Planned' : (grade || '-')}</span>
                    </div>
                `;
                bodyEl.appendChild(row);
            });

            semesterContainer.appendChild(card);
        });

        equalizeSemesterCardHeights();
    }

    // --- Equalize Card Heights Across Grid (Matches Longest Card) ---
    function equalizeSemesterCardHeights() {
        if (typeof window === "undefined") return;
        if (window.innerWidth < 768) {
            document.querySelectorAll(".semester-card").forEach(c => {
                c.style.minHeight = "";
            });
            return;
        }
        const cards = Array.from(document.querySelectorAll(".semester-card:not(.collapsed)"));
        if (cards.length === 0) return;
        cards.forEach(c => { c.style.minHeight = ""; });
        const maxH = Math.max(...cards.map(c => c.scrollHeight || c.offsetHeight));
        if (maxH > 0) {
            cards.forEach(c => { c.style.minHeight = `${maxH}px`; });
        }
    }

    // --- 9. Event Listeners ---
    function setupEventListeners() {
        // Window Resize: Maintain Card Equalization
        window.addEventListener("resize", () => {
            equalizeSemesterCardHeights();
        });

        // Fast Sync & Zero-Login Refresh
        if (heroFastSyncBtn) heroFastSyncBtn.addEventListener("click", handleFastSync);
        if (heroRefreshBtn) heroRefreshBtn.addEventListener("click", handleSessionRefresh);
        if (headerRefreshBtn) headerRefreshBtn.addEventListener("click", handleSessionRefresh);

        // Modal Open/Close Handlers
        const openForecastModal = () => {
            const forecastLevelNotice = document.getElementById("forecastLevelNotice");
            if (forecastLevelNotice) {
                if (currentMetrics && currentMetrics.level === 1) {
                    forecastLevelNotice.style.display = "block";
                } else {
                    forecastLevelNotice.style.display = "none";
                }
            }

            // Pre-select matching preset in dropdown
            if (schemeSelect) {
                let resolvedPreset = "2019_BTECH_CSE";
                if (currentFutureCurriculum && currentFutureCurriculum.preset) {
                    resolvedPreset = currentFutureCurriculum.preset;
                } else if (window.resolveKTUSchemeAndBranch) {
                    const info = window.resolveKTUSchemeAndBranch(currentStudentInfo, currentSemesterData);
                    if (info && info.recommendedPreset) {
                        resolvedPreset = info.recommendedPreset;
                    }
                }
                schemeSelect.value = resolvedPreset;
            }

            openModal(forecastModal);
        };

        if (openProfileModalBtn) openProfileModalBtn.addEventListener("click", () => openModal(profileModal));
        if (emptyConfigureBtn) emptyConfigureBtn.addEventListener("click", () => openModal(profileModal));
        if (openForecastModalBtn) openForecastModalBtn.addEventListener("click", openForecastModal);
        if (changeForecastInlineBtn) changeForecastInlineBtn.addEventListener("click", openForecastModal);
        if (openImportModalBtn) openImportModalBtn.addEventListener("click", () => openModal(importModal));
        if (emptyImportBtn) emptyImportBtn.addEventListener("click", () => openModal(importModal));

        // Close on backdrop or close button
        document.querySelectorAll("[data-close]").forEach(btn => {
            btn.addEventListener("click", () => {
                const targetId = btn.getAttribute("data-close");
                closeModal(document.getElementById(targetId));
            });
        });

        document.querySelectorAll(".modal-overlay").forEach(overlay => {
            overlay.addEventListener("click", (e) => {
                if (e.target === overlay) closeModal(overlay);
            });
        });

        // Profile Selection Changed
        if (profileSelectDropdown) {
            profileSelectDropdown.addEventListener("change", (e) => {
                activeProfileId = e.target.value || null;
                saveProfilesToStorage();
                loadActiveStudentData();
                renderApp();
            });
        }

        // Add New Student Button (Clears form)
        if (addNewProfileBtn) {
            addNewProfileBtn.addEventListener("click", () => {
                populateProfileForm(null);
                if (profileSelectDropdown) profileSelectDropdown.value = "";
                if (formModeTitle) formModeTitle.textContent = "➕ Add New Student Profile";
                if (inputProfileLabel) inputProfileLabel.focus();
            });
        }

        // Set as Primary Account Button
        if (setPrimaryProfileBtn) {
            setPrimaryProfileBtn.addEventListener("click", () => {
                if (!activeProfileId || !savedProfiles[activeProfileId]) return;
                localStorage.setItem(STORAGE_KEY_PRIMARY_ID, activeProfileId);
                updateProfileDropdown();
                alert(`⭐ "${savedProfiles[activeProfileId].label}" is now set as your default primary student!`);
            });
        }

        // Header Quick Switcher
        if (headerProfileSwitcher) {
            headerProfileSwitcher.addEventListener("change", (e) => {
                const targetId = e.target.value;
                if (targetId && savedProfiles[targetId]) {
                    activeProfileId = targetId;
                    saveProfilesToStorage();
                    loadActiveStudentData();
                    renderApp();
                    updateProfileDropdown();
                }
            });
        }

        // Save Profile
        if (saveProfileBtn) {
            saveProfileBtn.addEventListener("click", async () => {
                const label = (inputProfileLabel?.value || "").trim();
                const username = (inputProfileUsername?.value || "").trim().toUpperCase();
                const password = inputProfilePassword?.value || "";
                const pin = (inputProfilePin?.value || "").trim();

                const id = username;
                const existing = savedProfiles[id];

                if (!username) {
                    alert("Please enter your KTU username (Register No).");
                    return;
                }

                if (!password && (!existing || !existing.encryptedPassword)) {
                    alert("Please enter your KTU portal password.");
                    return;
                }

                let encryptedPassword = existing ? existing.encryptedPassword : null;
                if (password) {
                    if (window.KTUCryptoVault) {
                        encryptedPassword = await window.KTUCryptoVault.encryptPassword(password, pin || null);
                    } else {
                        encryptedPassword = { ciphertext: btoa(password), mode: "fallback" };
                    }
                    if (pin) cachedSessionPin = pin;
                } else if (pin && existing && existing.encryptedPassword) {
                    alert("To change your Security PIN, please re-enter your KTU portal password.");
                    return;
                }

                savedProfiles[id] = {
                    id,
                    label: label || username,
                    username,
                    encryptedPassword,
                    sessionCookies: existing ? existing.sessionCookies : null,
                    createdAt: existing?.createdAt || new Date().toISOString(),
                    lastGrabbed: existing?.lastGrabbed || null
                };

                // If this is the first profile ever saved, automatically set as primary
                if (Object.keys(savedProfiles).length === 1 || !localStorage.getItem(STORAGE_KEY_PRIMARY_ID)) {
                    localStorage.setItem(STORAGE_KEY_PRIMARY_ID, id);
                }

                activeProfileId = id;
                saveProfilesToStorage();
                closeModal(profileModal);
                alert(`✅ Saved & encrypted profile: ${savedProfiles[id].label}`);
                renderApp();
            });
        }

        // Delete Profile
        if (deleteProfileBtn) {
            deleteProfileBtn.addEventListener("click", () => {
                if (!activeProfileId || !savedProfiles[activeProfileId]) return;
                const conf = confirm(`Delete profile "${savedProfiles[activeProfileId].label}"?`);
                if (!conf) return;

                const deletedId = activeProfileId;
                delete savedProfiles[deletedId];
                localStorage.removeItem(STORAGE_KEY_DATA_PREFIX + deletedId);
                localStorage.removeItem(STORAGE_KEY_CURRICULUM_PREFIX + deletedId);

                const keys = Object.keys(savedProfiles);
                activeProfileId = keys.length > 0 ? keys[0] : null;

                saveProfilesToStorage();
                loadActiveStudentData();
                closeModal(profileModal);
                renderApp();
            });
        }

        // Apply Forecast
        if (applyForecastBtn) {
            applyForecastBtn.addEventListener("click", () => {
                const val = schemeSelect?.value;
                if (!val || val === "none") {
                    alert("Please select a curriculum scheme preset.");
                    return;
                }

                currentFutureCurriculum = { preset: val };
                if (activeProfileId) {
                    localStorage.setItem(STORAGE_KEY_CURRICULUM_PREFIX + activeProfileId, JSON.stringify(currentFutureCurriculum));
                }
                closeModal(forecastModal);
                renderApp();
            });
        }

        // Clear Forecast / Reset to Pure Actuals
        if (clearForecastBtn) {
            clearForecastBtn.addEventListener("click", () => {
                currentFutureCurriculum = { disabled: true };
                if (activeProfileId) {
                    localStorage.setItem(STORAGE_KEY_CURRICULUM_PREFIX + activeProfileId, JSON.stringify(currentFutureCurriculum));
                }
                if (schemeSelect) schemeSelect.value = "none";
                closeModal(forecastModal);
                renderApp();
            });
        }

        // Save Custom Relay
        if (saveRelayBtn) {
            saveRelayBtn.addEventListener("click", () => {
                let relay = (customRelayInput?.value || "").trim();
                if (relay && !relay.endsWith("/api/sync") && relay.startsWith("http")) {
                    relay = relay.replace(/\/+$/, "") + "/api/sync";
                }
                if (relay) {
                    const isLocal = relay.startsWith("http://localhost") || relay.startsWith("http://127.0.0.1") || relay.startsWith("/api/sync");
                    const isHttps = relay.startsWith("https://");

                    if (!isLocal && !isHttps) {
                        alert("⚠️ Insecure Relay Rejected:\nCustom relay URLs must use encrypted HTTPS (e.g. https://relay.example.com/api/sync) to protect student credentials from network interception.");
                        return;
                    }

                    localStorage.setItem(STORAGE_KEY_CUSTOM_RELAY, relay);
                    alert(`✅ Saved secure custom relay: ${relay}`);
                } else {
                    localStorage.removeItem(STORAGE_KEY_CUSTOM_RELAY);
                    alert("✅ Reverted to default relay (/api/sync)");
                }
                closeModal(importModal);
            });
        }

        // Offline JSON Import
        if (jsonFileInput) {
            jsonFileInput.addEventListener("change", (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (evt) => {
                    try {
                        const parsed = JSON.parse(evt.target.result);
                        let sData = Array.isArray(parsed) ? parsed : (parsed.semesterData || null);
                        let sInfo = parsed.studentInfo || {};

                        if (!sData || !Array.isArray(sData) || sData.length === 0) {
                            alert("Invalid JSON: No course records found.");
                            return;
                        }

                        const reg = (sInfo.registerNo || "IMPORTED_STUDENT").toUpperCase().trim();
                        if (!savedProfiles[reg]) {
                            savedProfiles[reg] = {
                                id: reg,
                                label: sInfo.name || reg,
                                username: reg,
                                password: "",
                                createdAt: new Date().toISOString()
                            };
                        }
                        activeProfileId = reg;
                        saveProfilesToStorage();
                        saveActiveStudentData(sData, sInfo, parsed.lastScraped || new Date().toISOString());
                        closeModal(importModal);
                        renderApp();
                        alert(`✅ Successfully imported ${sData.length} courses!`);
                    } catch (err) {
                        alert("Failed to parse JSON file: " + err.message);
                    }
                };
                reader.readAsText(file);
                e.target.value = "";
            });
        }

        // PDF Export
        const handlePdfClick = () => {
            if (typeof exportVectorPdf === "function") {
                exportVectorPdf(currentSemesterData, currentStudentInfo, currentFutureCurriculum);
            } else {
                alert("PDF module not ready.");
            }
        };

        if (downloadPdfBtn) downloadPdfBtn.addEventListener("click", handlePdfClick);
        if (headerPdfBtn) headerPdfBtn.addEventListener("click", handlePdfClick);

        // CSV Export
        if (downloadCsvBtn) downloadCsvBtn.addEventListener("click", exportCsv);
        if (headerCsvBtn) headerCsvBtn.addEventListener("click", exportCsv);
    }

    // --- 10. CSV Export ---
    function exportCsv() {
        if (!currentSemesterData || currentSemesterData.length === 0) return;
        let csv = "";

        const profile = window.getNormalizedStudentProfile 
            ? window.getNormalizedStudentProfile(currentStudentInfo, currentSemesterData, currentMetrics)
            : null;

        // Academic Profile Metadata Header (Guaranteed 5 Fields)
        csv += "# ========================================================\n";
        csv += "# APJ ABDUL KALAM TECHNOLOGICAL UNIVERSITY (KTU)\n";
        csv += "# Academic Transcript & Performance Summary\n";
        csv += "# ========================================================\n";
        csv += `# Student Name: ${profile?.name || currentStudentInfo?.name || "KTU Student"}\n`;
        csv += `# KTU ID / University Code: ${profile?.ktuId || currentStudentInfo?.registerNo || "N/A"}\n`;
        csv += `# Department / Branch: ${profile?.dept || currentStudentInfo?.branch || "Engineering"}\n`;
        csv += `# Admission Year / Batch: ${profile?.year || (currentStudentInfo?.admissionYear ? `${currentStudentInfo.admissionYear} Batch` : "N/A")}\n`;
        csv += `# Curriculum Scheme: ${profile?.scheme || currentStudentInfo?.scheme || "KTU Curriculum Scheme"}\n`;
        csv += `# Institution: ${profile?.institution || currentStudentInfo?.institution || "APJ Abdul Kalam Technological University"}\n`;
        if (currentMetrics) {
            const eqPct = currentMetrics.equivalentPercentage || (parseFloat(currentMetrics.currentCGPA) * 10).toFixed(2);
            csv += `# Cumulative CGPA: ${currentMetrics.currentCGPA} (${eqPct}%)\n`;
            csv += `# Total Graded Credits: ${currentMetrics.earnedCredits} / ${currentMetrics.totalCredits}\n`;
            csv += `# Active Backlogs: ${currentMetrics.totalBacklogs}\n`;
            if (currentMetrics.level === 2 && currentMetrics.graduationForecast) {
                csv += `# Degree Forecast Preset: ${currentMetrics.curriculumPresetName || "Standard"}\n`;
                csv += `# Max Degree CGPA (All S): ${currentMetrics.graduationForecast.maxGraduationCGPA}\n`;
            }
        }
        csv += `# Export Date: ${new Date().toLocaleDateString("en-GB")}\n`;
        csv += "# ========================================================\n\n";

        csv += "Semester,Subject,Grade,Credit\n";
        currentSemesterData.forEach(r => {
            csv += `"${r.semester}","${r.subject}","${r.grade}",${r.credit}\n`;
        });

        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = window.generateSmartAcademicFilename 
            ? window.generateSmartAcademicFilename("KTU_Grades", "csv", currentMetrics, currentStudentInfo)
            : `KTU_Grades_${activeProfileId || 'export'}.csv`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    // Start on DOM Ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
