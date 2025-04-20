// --- START OF FILE backup.js ---

// Nyaa~! Mika & Kana's Data Backup & Restore! Keep our memories safe! ♡

const BackupRestore = (() => {
    // --- Internal DOM Element References (will be assigned in init) ---
    let settingsBackupRestoreButton = null;
    let backupRestorePopup = null;
    let backupRestoreTitle = null;
    let backupRestoreExplanation = null;
    let backupButton = null;
    let restoreButton = null;
    let backupRestoreCloseButton = null;
    let restoreFileInput = null; // Hidden file input

    // --- Dependencies (passed in from main.js init) ---
    let currentPersona = 'Mika';
    let currentUserName = 'User';
    let loadFromLocalStorageFn = null;
    let saveToLocalStorageFn = null;
    let clearFromLocalStorageFn = null;
    let appendMessageFn = null; // For messages back to the main chat log

    // --- List of all app localStorage keys to backup/restore ---
    // This list needs to be kept up-to-date with all keys used by the app.
    // Copied from main.js for this module's internal use.
    const APP_LOCAL_STORAGE_KEYS = [
        'geminiApiKey_mikaHelper',
        'mikaHelper_userName',
        'mikaDisclaimerAgreed_v1',
        'mikaThemePreference_v1',
        'mikaPersonaPreference_v1',
        'mikaInstallPromptShown',
        'mikaHelper_allChats',
        'mikaApiCallTracker_v1', // API count tracker key
        'mikaNotificationsEnabled_v1', // Notification state
        'mikaNotificationCache_v1_Mika', // Notification cache (persona specific)
        'mikaNotificationCache_v1_Kana',
        'mikaGotchiData_v1_Mika', // Gotchi data (persona specific)
        'mikaGotchiData_v1_Kana',
        'mikaChores_list_v2',
        'mikaChores_balance_v1',
        'mikaChores_history_v1',
        'mikaChores_pinHash_v1',
        'mikaChores_lockedDate_v1',
        'mikaChores_bonusEnabled_v1',
        'mikaChores_bonusTiers_v1',
        'mikaStoryLibrary_v1',
        'mikaDiaryEntries_v1',
        'mikaPeriodTrackerData_v1',
        'mikaHoroscopeCache_v1',
        'mikaHoroscopeUserSign_v1',
        'mikaRpgLibrary_v1',
        'mikaComicCacheV2',
        'mikaComicThemes_v1',
        'mikaComicGenCount_v1',
        // Add any other keys used by future apps here!
    ];

    // --- Helper Functions ---
    function _getCurrentDateString() { return new Date().toISOString().slice(0, 10); }
    // Simple sanitizer fallback if DOMPurify isn't available when this script loads first
    function _sanitizeHTML(str) {
        if (typeof DOMPurify !== 'undefined' && DOMPurify.sanitize) {
            return DOMPurify.sanitize(str, { USE_PROFILES: { html: true }, ALLOWED_TAGS: ['strong', 'em', 'b', 'i', 'p', 'br', 'span', 'div'] });
        }
        console.warn("DOMPurify missing in BackupRestore, basic fallback.");
        return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // Send message back to the main chat log
    function _sendMessageToMain(text, sender = 'System') {
        if (appendMessageFn) {
            appendMessageFn(sender, text);
        } else {
            console.log(`Backup/Restore SysMsg (${sender}):`, text);
        }
    }

    // --- Backup and Restore Logic ---

    function _backupData() {
        console.log("BackupRestore: Initiating data backup...");
        if (!loadFromLocalStorageFn) {
            console.error("BackupRestore: Local storage loader not provided!");
            _sendMessageToMain("Mrow! My save magic is missing!");
            return;
        }

        const backupData = {};
        let keysFound = 0;
        APP_LOCAL_STORAGE_KEYS.forEach(key => {
            const value = loadFromLocalStorageFn(key); // Use injected loader
            if (value !== null) {
                backupData[key] = value;
                keysFound++;
            }
        });

        if (keysFound === 0) {
            _sendMessageToMain(currentPersona === 'Kana' ? "Nothing to backup. Yet." : `Mrow? There doesn\'t seem to be any data to backup yet, ${currentUserName}! ;_;`, currentPersona);
            console.warn("BackupRestore: No app data found to backup.");
            return;
        }

        const dataString = JSON.stringify(backupData, null, 2); // Pretty print JSON
        const blob = new Blob([dataString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const date = new Date();
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
        const timeStr = date.toTimeString().slice(0, 8).replace(/:/g, ''); // HHMMSS
        const filename = `mika_helper_backup_${dateStr}_${timeStr}.json`;

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;

        // Programmatically click the link to trigger the download
        document.body.appendChild(a);
        a.click();

        // Clean up the temporary URL and element
        setTimeout(() => {
            URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }, 100);

        _sendMessageToMain(currentPersona === 'Kana' ? "Backup file created. Don't lose it." : `Nyaa~! Saved our data to "${filename}"! Keep it safe, ${currentUserName}! ♡`, currentPersona);
        console.log(`BackupRestore: Backup created: ${filename} with ${keysFound} keys.`);
    }

    function _restoreData(file) {
        console.log("BackupRestore: Initiating data restore...");
        if (!file) {
            console.log("BackupRestore: Restore cancelled: No file selected.");
            // No message needed, user cancelled the file picker
            return;
        }
         if (!loadFromLocalStorageFn || !saveToLocalStorageFn || !clearFromLocalStorageFn) {
             console.error("BackupRestore: Local storage utility functions not provided!");
             _sendMessageToMain("Mrow! My save/load magic is missing!");
             return;
         }


        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const fileContent = event.target.result;
                const restoredData = JSON.parse(fileContent);

                if (typeof restoredData !== 'object' || restoredData === null) {
                    throw new Error("Invalid backup format: Not an object.");
                }

                console.log("BackupRestore: File read successfully. Restoring data...");
                let keysRestored = 0;

                // Clear existing app-specific data first
                APP_LOCAL_STORAGE_KEYS.forEach(key => {
                     clearFromLocalStorageFn(key); // Use injected clearer
                });
                console.log(`BackupRestore: Cleared ${APP_LOCAL_STORAGE_KEYS.length} potential old keys.`);


                // Iterate through the restored data and save known keys
                for (const key in restoredData) {
                    // Only restore keys we recognize
                    if (APP_LOCAL_STORAGE_KEYS.includes(key)) {
                        saveToLocalStorageFn(key, restoredData[key]); // Use injected saver
                        keysRestored++;
                    } else {
                        console.warn(`BackupRestore: Skipping unknown key "${key}" found in backup.`);
                    }
                }

                if (keysRestored > 0) {
                     // Close the popup *before* the reload confirmation
                     if(backupRestorePopup) backupRestorePopup.style.display = 'none';

                     // Need to reload for most changes to take effect
                     const confirmReload = confirm(`${currentPersona === 'Kana' ? 'Restored data. Reloading is necessary.' : `Nyaa~! Data restored successfully (${keysRestored} items)! We need to reload the app for everything to update, ${currentUserName}! Okay?`}`);
                     if (confirmReload) {
                        _sendMessageToMain(currentPersona === 'Kana' ? 'Reloading...' : 'Reloading now! ☆', currentPersona);
                        setTimeout(() => window.location.reload(), 500);
                     } else {
                         _sendMessageToMain(currentPersona === 'Kana' ? 'Reload deferred. Data might be inconsistent.' : `Reloading deferred. Some things might be a little messy until you reload, ${currentUserName}! ;_;`, currentPersona);
                     }

                } else {
                    _sendMessageToMain(currentPersona === 'Kana' ? "No recognizable data found in the file. Useless." : `Mrow! The file didn\'t have any data I recognize, ${currentUserName}! Are you sure it was the right backup file? ;_;`, currentPersona);
                    console.warn("BackupRestore: No valid keys found in restored data.");
                }

            } catch (e) {
                console.error("BackupRestore: Error processing restore file:", e);
                _sendMessageToMain(currentPersona === 'Kana' ? `Error reading file. Probably broken. (${e.message})` : `Meeeow! Error reading that file, ${currentUserName}! Are you sure it\'s a valid backup? ;_; (${e.message})`, currentPersona);
            }
        };

        reader.onerror = (error) => {
            console.error("BackupRestore: FileReader error:", error);
            _sendMessageToMain(currentPersona === 'Kana' ? 'File reading failed.' : `Mrow! Couldn\'t read the file, ${currentUserName}! ;_;`, currentPersona);
        };

        reader.readAsText(file); // Read the file as text
    }

    // --- Backup/Restore Popup Handling ---

    function showBackupRestorePopup() {
        // Assign elements here, guaranteed to exist after main.js DOMContentLoaded
        settingsBackupRestoreButton = document.getElementById('settings-backup-restore-button');
        backupRestorePopup = document.getElementById('backup-restore-popup');
        backupRestoreTitle = document.getElementById('backup-restore-title');
        backupRestoreExplanation = document.getElementById('backup-restore-explanation');
        backupButton = document.getElementById('backup-button');
        restoreButton = document.getElementById('restore-button');
        backupRestoreCloseButton = document.getElementById('backup-restore-close-button');
        restoreFileInput = document.getElementById('restore-file-input');

        // Critical check: If any essential elements are missing, log and return
        if (!settingsBackupRestoreButton || !backupRestorePopup || !restoreFileInput || !backupRestoreCloseButton || !backupButton || !restoreButton || !backupRestoreTitle || !backupRestoreExplanation) {
            console.error("BackupRestore: CRITICAL ERROR: One or more required DOM elements not found. Cannot show popup or attach listeners.");
            _sendMessageToMain(currentPersona === 'Kana' ? 'Backup/Restore feature missing. Check console.' : 'Mrow! My backup magic is broken! Some pieces are missing! ;_;', 'System');
            return;
        }

        // Update persona-specific styling and text for the popup
        const isMika = currentPersona === 'Mika';
        const modal = backupRestorePopup.querySelector('.popup-modal');
        if(modal) {
             modal.style.borderColor = isMika ? 'var(--popup-border)' : 'var(--kana-popup-border)';
             const h2 = modal.querySelector('h2');
             if(h2) h2.style.color = isMika ? 'var(--popup-header)' : 'var(--kana-popup-header)';
        }
         backupRestoreTitle.textContent = isMika ? "Backup & Restore Our Data! ♡" : "Data Management. Backup/Restore.";

        const mikaExplanation = `Hiii ${currentUserName}! ♡ We can save all our special data (like our chats, diary, chore progress, and game saves!) into a file! You can download it to keep it safe! And if anything ever gets lost, you can use that file to bring it all back! Nyaa~!\n\n* Backup: Downloads a file with all our data.\n* Restore: Reads a file you choose and loads the data (this will REPLACE your current data, so be careful!)`;

        const kanaExplanation = `Listen up, ${currentUserName}. This is how you deal with data. Don't lose it. You can save all this app's local data (chats, app progress, settings) to a file, or load it back from one you saved earlier.\n\n* Backup: Creates a JSON file for you to download.\n* Restore: Loads data from a JSON file you select. **This will overwrite any data currently saved in your browser.** Don't mess it up.`;

         backupRestoreExplanation.innerHTML = _sanitizeHTML(isMika ? mikaExplanation : kanaExplanation); // Use innerHTML for newlines and sanitize

        // Add listeners directly to the found elements
        backupButton.onclick = _backupData;
        restoreButton.onclick = () => {
             // Trigger the hidden file input click
             if(restoreFileInput) {
                 restoreFileInput.click();
                 // The _restoreData function will be called by the file input's 'change' listener
             } else {
                 console.error("BackupRestore: Restore file input not found during click handler!");
                 _sendMessageToMain(currentPersona === 'Kana' ? 'File input missing.' : 'Mrow! My file button is gone! ;_;', currentPersona);
             }
        };
         backupRestoreCloseButton.onclick = () => {
             if(backupRestorePopup) backupRestorePopup.style.display = 'none';
         };

        // The file input's change listener should be set up only once during initialization
        // We will add this listener attachment below the init function call

        // Close the settings dropdown when showing this popup
        // Assuming settingsDropdown is a globally accessible reference in main.js
        if (typeof closeAllDropdowns === 'function') { // Check if the function exists globally
             closeAllDropdowns();
        } else {
             console.warn("BackupRestore: closeAllDropdowns function not found globally.");
             // Manually hide settings dropdown if it exists as a global variable
             // This part is tricky if main.js variables aren't truly global.
             // Best practice is to pass necessary UI interaction functions in init.
             // For now, we rely on main.js managing this global state and call.
        }

        // Display the popup
        backupRestorePopup.style.display = 'flex';
        console.log("BackupRestore: Popup shown.");
    }

    // --- Initialization ---

    // This init function will be called by main.js after DOMContentLoaded
    function init(_persona, _userName, _loadFn, _saveFn, _clearFn, _messageFn) {
        console.log("BackupRestore: Initializing module...");

        // Assign dependencies passed from main.js
        currentPersona = _persona || 'Mika';
        currentUserName = _userName || 'User';
        loadFromLocalStorageFn = _loadFn;
        saveToLocalStorageFn = _saveFn;
        clearFromLocalStorageFn = _clearFn;
        appendMessageFn = _messageFn;


        // Find the button that triggers the popup (should be in settings dropdown)
        settingsBackupRestoreButton = document.getElementById('settings-backup-restore-button');

        if (settingsBackupRestoreButton) {
            // Attach the listener to show the popup
            settingsBackupRestoreButton.addEventListener('click', (e) => {
                 e.stopPropagation(); // Stop click from closing other dropdowns immediately
                 showBackupRestorePopup(); // This function will find other elements and attach listeners
            });
            console.log("BackupRestore: Settings button listener attached.");
        } else {
            console.error("BackupRestore: Settings Backup/Restore button not found in DOM! Feature will not be accessible.");
            // Optionally disable the feature entirely or show an error in the main chat
            _sendMessageToMain(currentPersona === 'Kana' ? 'Backup button missing. Cannot backup.' : 'Mrow! My backup button seems to be missing! ;_;', 'System');
        }

        // Attach the change listener to the hidden file input ONCE during initialization
        // This listener should ideally be attached regardless of the popup button existing.
         restoreFileInput = document.getElementById('restore-file-input');
         if (restoreFileInput && !restoreFileInput._hasChangeListener) {
              restoreFileInput.addEventListener('change', (event) => {
                   const file = event.target.files[0];
                   _restoreData(file); // Call restore logic
                  // Clear the file input's value so the same file can be selected again if needed
                   event.target.value = null;
              });
              restoreFileInput._hasChangeListener = true; // Flag to ensure listener is only added once
              console.log("BackupRestore: Restore file input change listener attached.");
          } else if (!restoreFileInput) {
              console.error("BackupRestore: Restore file input not found in DOM! Restore feature will not work.");
              _sendMessageToMain(currentPersona === 'Kana' ? 'Restore file input missing. Cannot restore.' : 'Mrow! My restore button is broken! ;_;', 'System');
          }


        console.log("BackupRestore: Module initialized.");
    }

    // --- Public Interface ---
    return {
        init: init
    };

})();

// --- END OF FILE backup.js ---