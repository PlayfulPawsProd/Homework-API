// --- START OF FILE tracker.js --- (MODIFIED)

// Nyaa~! Period Tracker - Helping you keep track! ♡
// REMEMBER: This is just an estimate and not medical advice! Talk to a trusted adult or doctor if you have questions!
// ** UPDATED with Date Selection **

const PeriodTracker = (() => {
    // --- Settings & Constants ---
    const STORAGE_KEY_DATA = 'mikaPeriodTrackerData_v1';
    const MIN_CYCLES_FOR_PREDICTION = 2;
    const MAX_DAYS_BACK_SELECT = 7; // ** NEW: How many days back user can select **

    // --- State ---
    let gameUiContainer = null;
    let messageCallback = null;
    let currentUserName = "User";
    let currentPersonaInGame = 'Mika';
    let cycleData = []; // { startDate: 'YYYY-MM-DD', endDate: 'YYYY-MM-DD' | null }
    let currentCycleStats = { averageCycleLength: null, averagePeriodLength: null, predictedNextStartDate: null };
    let isPeriodOngoing = false;
    let loggingDate = null; // ** NEW: 'YYYY-MM-DD' string for the currently selected day for logging **

    // --- DOM Element References ---
    let logStartDateButton = null;
    let logEndDateButton = null;
    let predictionDisplay = null;
    let statsDisplay = null;
    let pastCyclesList = null;
    let disclaimerArea = null;
    let dateSelectionArea = null; // ** NEW **
    let loggingDateDisplay = null; // ** NEW **
    let prevDayButton = null; // ** NEW **
    let nextDayButton = null; // ** NEW **

    // --- Helper Functions ---

    function _getCurrentDateString() { return new Date().toISOString().slice(0, 10); }
    function _getYesterdayDateString() { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); }
    function _formatDateForDisplay(dateString) { /* ... (Unchanged from previous) ... */ if (!dateString) return 'N/A'; const today = _getCurrentDateString(); const yesterday = _getYesterdayDateString(); if (dateString === today) return 'Today'; if (dateString === yesterday) return 'Yesterday'; try { const date = new Date(dateString + 'T00:00:00'); return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); } catch (e) { return 'Invalid Date'; } }
    function _addDaysToDate(dateString, days) { /* ... (Unchanged from previous) ... */ try { const date = new Date(dateString + 'T00:00:00'); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10); } catch (e) { console.error("Error adding days to date:", dateString, days, e); return null; } }
    function _daysBetween(dateString1, dateString2) { /* ... (Unchanged from previous) ... */ try { const date1 = new Date(dateString1 + 'T00:00:00'); const date2 = new Date(dateString2 + 'T00:00:00'); const diffTime = Math.abs(date2 - date1); const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); return diffDays; } catch (e) { console.error("Error calculating days between:", dateString1, dateString2, e); return null; } }
    // ** NEW: Helper to get the limit date for selection **
    function _getOldestSelectableDateString() {
        const d = new Date();
        d.setDate(d.getDate() - MAX_DAYS_BACK_SELECT);
        return d.toISOString().slice(0, 10);
    }

    // --- Data Persistence --- (Unchanged)
    function _saveData() { /* ... */ try { cycleData.sort((a, b) => a.startDate.localeCompare(b.startDate)); localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(cycleData)); console.log("Tracker data saved."); } catch (e) { console.error("Failed to save tracker data:", e); } }
    function _loadData() { /* ... */ try { const storedData = localStorage.getItem(STORAGE_KEY_DATA); if (storedData) { cycleData = JSON.parse(storedData); if (!Array.isArray(cycleData)) cycleData = []; cycleData = cycleData.filter(c => c && typeof c.startDate === 'string'); cycleData.sort((a, b) => a.startDate.localeCompare(b.startDate)); console.log(`Loaded ${cycleData.length} tracker entries.`); } else { cycleData = []; console.log("No previous tracker data found."); } const lastCycle = cycleData[cycleData.length - 1]; isPeriodOngoing = !!(lastCycle && lastCycle.startDate && !lastCycle.endDate); } catch (e) { console.error("Failed to load or parse tracker data:", e); cycleData = []; isPeriodOngoing = false; localStorage.removeItem(STORAGE_KEY_DATA); } }

    // --- Calculations --- (Unchanged)
    function _calculateCycleStats() { /* ... */ const completedCycles = cycleData.filter(c => c.endDate); let totalCycleLengthDays = 0; let cycleLengthCount = 0; let totalPeriodLengthDays = 0; let periodLengthCount = 0; for (let i = 0; i < completedCycles.length - 1; i++) { const diff = _daysBetween(completedCycles[i].startDate, completedCycles[i+1].startDate); if (diff !== null && diff > 0) { totalCycleLengthDays += diff; cycleLengthCount++; } } completedCycles.forEach(cycle => { const diff = _daysBetween(cycle.startDate, cycle.endDate); if (diff !== null) { totalPeriodLengthDays += (diff + 1); periodLengthCount++; } }); const avgCycle = cycleLengthCount >= MIN_CYCLES_FOR_PREDICTION -1 ? Math.round(totalCycleLengthDays / cycleLengthCount) : null; const avgPeriod = periodLengthCount > 0 ? Math.round(totalPeriodLengthDays / periodLengthCount) : null; currentCycleStats.averageCycleLength = avgCycle; currentCycleStats.averagePeriodLength = avgPeriod; if (avgCycle && cycleData.length > 0) { const lastStartDate = cycleData[cycleData.length - 1].startDate; currentCycleStats.predictedNextStartDate = _addDaysToDate(lastStartDate, avgCycle); } else { currentCycleStats.predictedNextStartDate = null; } console.log("Calculated Stats:", currentCycleStats); }


    // --- UI Rendering ---

    function _clearUI() { /* ... (clear new elements too) ... */ if (gameUiContainer) gameUiContainer.innerHTML = ''; logStartDateButton = logEndDateButton = predictionDisplay = statsDisplay = pastCyclesList = disclaimerArea = dateSelectionArea = loggingDateDisplay = prevDayButton = nextDayButton = null; }

    function _createMainUI() {
        _clearUI();
        if (!gameUiContainer) return;

        gameUiContainer.style.cssText = `width: 100%; height: 100%; display: flex; flex-direction: column; padding: 10px; box-sizing: border-box; justify-content: space-between;`;

        const topSection = document.createElement('div');
        topSection.style.flexShrink = '0';

        const title = document.createElement('h3'); /* ... (title unchanged) ... */ title.textContent = `${currentPersonaInGame}'s Cycle Tracker ${currentPersonaInGame === 'Mika' ? '🌸' : '🩸'}`; title.style.textAlign = 'center'; title.style.color = 'var(--chat-header-text)'; topSection.appendChild(title);

        // ** NEW: Date Selection Area **
        dateSelectionArea = document.createElement('div');
        dateSelectionArea.style.cssText = `display: flex; justify-content: center; align-items: center; gap: 10px; margin: 10px 0;`;
        prevDayButton = document.createElement('button');
        prevDayButton.textContent = '← Prev Day';
        prevDayButton.className = 'rps-choice-button secondary';
        prevDayButton.onclick = () => _changeLoggingDate(-1); // -1 for one day back
        loggingDateDisplay = document.createElement('span');
        loggingDateDisplay.style.cssText = `font-weight: bold; font-size: 1em; color: var(--chat-header-text); min-width: 110px; text-align: center;`; // Wider display
        nextDayButton = document.createElement('button');
        nextDayButton.textContent = 'Next Day →';
        nextDayButton.className = 'rps-choice-button secondary';
        nextDayButton.onclick = () => _changeLoggingDate(1); // +1 for one day forward
        dateSelectionArea.appendChild(prevDayButton);
        dateSelectionArea.appendChild(loggingDateDisplay);
        dateSelectionArea.appendChild(nextDayButton);
        topSection.appendChild(dateSelectionArea);

        // --- Logging Buttons --- (Moved slightly below date selector)
        const buttonArea = document.createElement('div');
        buttonArea.style.cssText = `display: flex; justify-content: space-around; margin: 15px 0;`;
        logStartDateButton = document.createElement('button');
        logStartDateButton.textContent = "Log Selected Date as START"; // Text Changed
        logStartDateButton.className = 'rps-choice-button';
        logStartDateButton.onclick = _handleLogStart;
        buttonArea.appendChild(logStartDateButton);
        logEndDateButton = document.createElement('button');
        logEndDateButton.textContent = "Log Selected Date as END"; // Text Changed
        logEndDateButton.className = 'rps-choice-button secondary';
        logEndDateButton.onclick = _handleLogEnd;
        buttonArea.appendChild(logEndDateButton);
        topSection.appendChild(buttonArea);

        predictionDisplay = document.createElement('div'); /* ... (prediction display unchanged) ... */ predictionDisplay.id = 'tracker-prediction'; predictionDisplay.style.cssText = `text-align: center; font-size: 1.1em; margin-bottom: 5px; color: var(--mika-message-name); font-weight: bold;`; topSection.appendChild(predictionDisplay);
        statsDisplay = document.createElement('div'); /* ... (stats display unchanged) ... */ statsDisplay.id = 'tracker-stats'; statsDisplay.style.cssText = `text-align: center; font-size: 0.9em; margin-bottom: 15px; color: var(--system-message-text);`; topSection.appendChild(statsDisplay);

        gameUiContainer.appendChild(topSection);

        const listSection = document.createElement('div'); /* ... (list section unchanged) ... */ listSection.style.cssText = `flex-grow: 1; overflow-y: auto; border: 1px solid var(--input-border); border-radius: 5px; padding: 10px; margin-bottom: 10px;`; const listTitle = document.createElement('h4'); listTitle.textContent = 'Past Cycles'; listTitle.style.cssText = `margin-top: 0; margin-bottom: 5px; text-align: center; color: var(--chat-header-text);`; listSection.appendChild(listTitle); pastCyclesList = document.createElement('div'); pastCyclesList.id = 'tracker-past-cycles'; listSection.appendChild(pastCyclesList); gameUiContainer.appendChild(listSection);
        const bottomSection = document.createElement('div'); /* ... (bottom section unchanged) ... */ bottomSection.style.flexShrink = '0'; disclaimerArea = document.createElement('div'); disclaimerArea.id = 'tracker-disclaimer'; disclaimerArea.style.cssText = `font-size: 0.85em; font-style: italic; color: var(--error-color); text-align: center; padding: 5px; border: 1px dashed var(--error-color); border-radius: 4px; margin-top: 10px;`; disclaimerArea.innerHTML = `<strong>Important:</strong> Predictions are just estimates based on past cycles and might not be exact! Cycles can change. This tool is not medical advice. Talk to a parent, guardian, or doctor if you have any questions or worries!`; bottomSection.appendChild(disclaimerArea); const backButton = document.createElement('button'); backButton.id = 'back-to-chat-button'; backButton.textContent = 'Back to Chat'; backButton.className = 'rps-choice-button secondary'; /* Added class */ backButton.onclick = () => { if (typeof switchToChatView === 'function') { switchToChatView(); } else { console.error("Cannot find switchToChatView function!"); } }; backButton.style.marginTop = '10px'; backButton.style.display = 'block'; /* Center */ backButton.style.marginLeft = 'auto'; backButton.style.marginRight = 'auto'; bottomSection.appendChild(backButton); gameUiContainer.appendChild(bottomSection);

        // Initial Render
        _updateDisplay();
    }

    // ** MODIFIED: Update display includes date selector UI **
    function _updateDisplay() {
        if (!gameUiContainer) return;
        _calculateCycleStats(); // Calculate stats first
        _updateDateSelectionUI(); // Update date selector buttons/display
        _updateLogButtonStates(); // Update log buttons based on date and cycle state

        if (predictionDisplay) { /* ... (prediction logic unchanged) ... */ if (currentCycleStats.predictedNextStartDate) { predictionDisplay.textContent = `Predicted Next Start: ~${_formatDateForDisplay(currentCycleStats.predictedNextStartDate)}`; } else if (cycleData.length > 0 && cycleData.length < MIN_CYCLES_FOR_PREDICTION) { predictionDisplay.textContent = `Need ${MIN_CYCLES_FOR_PREDICTION - cycleData.length} more cycle(s) logged for prediction!`; predictionDisplay.style.color = 'var(--system-message-text)'; } else { predictionDisplay.textContent = 'Log your first cycle start day!'; predictionDisplay.style.color = 'var(--system-message-text)'; } }
        if (statsDisplay) { /* ... (stats logic unchanged) ... */ const avgCycleText = currentCycleStats.averageCycleLength ? `${currentCycleStats.averageCycleLength} days` : 'Calculating...'; const avgPeriodText = currentCycleStats.averagePeriodLength ? `${currentCycleStats.averagePeriodLength} days` : 'Calculating...'; statsDisplay.textContent = `Avg. Cycle: ${avgCycleText} | Avg. Period: ${avgPeriodText}`; }
        _renderPastCyclesList(); // History list is independent of selected date
    }

    // ** NEW: Update Date Selector UI Elements **
    function _updateDateSelectionUI() {
        if (!loggingDateDisplay || !prevDayButton || !nextDayButton) return;
        const todayStr = _getCurrentDateString();
        const oldestDateStr = _getOldestSelectableDateString();

        loggingDateDisplay.textContent = `Logging for: ${_formatDateForDisplay(loggingDate)}`;
        prevDayButton.disabled = loggingDate <= oldestDateStr; // Disable if at or past limit
        nextDayButton.disabled = loggingDate >= todayStr; // Disable if at or past today
    }

    // ** NEW: Update Log Button States based on selected date and cycle status **
    function _updateLogButtonStates() {
        if (!logStartDateButton || !logEndDateButton) return;

        const lastCycle = cycleData.length > 0 ? cycleData[cycleData.length - 1] : null;
        const isOngoing = !!(lastCycle && lastCycle.startDate && !lastCycle.endDate);

        // Can log START if:
        // 1. No cycle is ongoing OR
        // 2. The selected loggingDate is *after* the last recorded END date (if any)
        let canLogStart = !isOngoing;
        if (!canLogStart && lastCycle && lastCycle.endDate) {
            canLogStart = loggingDate > lastCycle.endDate;
        }
        // Also check if selected date already has a start logged (edge case if user manually deleted end)
        const existingCycleOnDate = cycleData.find(c => c.startDate === loggingDate);
        if(existingCycleOnDate) {
            canLogStart = false; // Cannot log start if a cycle already started on this date
        }


        logStartDateButton.disabled = !canLogStart;
        if (!canLogStart) {
             logStartDateButton.title = isOngoing ? "Finish the current cycle first!" : "Cannot log start on or before last end date, or if a cycle already started today.";
        } else {
             logStartDateButton.title = "";
        }


        // Can log END if:
        // 1. A cycle is ongoing AND
        // 2. The selected loggingDate is the SAME AS or AFTER the start date of the ongoing cycle
        let canLogEnd = isOngoing && lastCycle && loggingDate >= lastCycle.startDate;

        logEndDateButton.disabled = !canLogEnd;
         if (!canLogEnd) {
             logEndDateButton.title = !isOngoing ? "Start a cycle first!" : "End date cannot be before start date!";
        } else {
            logEndDateButton.title = "";
        }
    }

    // ** NEW: Change the logging date **
    function _changeLoggingDate(dayOffset) {
        if (!loggingDate) return; // Should not happen after init

        const newDateStr = _addDaysToDate(loggingDate, dayOffset);
        const todayStr = _getCurrentDateString();
        const oldestDateStr = _getOldestSelectableDateString();

        // Check boundaries
        if (newDateStr > todayStr || newDateStr < oldestDateStr) {
            console.log(`Change refused: ${newDateStr} out of bounds [${oldestDateStr} - ${todayStr}]`);
            _showSimpleConfirmation(newDateStr > todayStr ? "Can't log for the future!" : "Can only go back 7 days!");
            return;
        }

        loggingDate = newDateStr;
        console.log("Logging date changed to:", loggingDate);
        _updateDisplay(); // Re-render relevant parts of UI
    }


    function _renderPastCyclesList() { /* ... (Unchanged - always shows full history) ... */ if (!pastCyclesList) return; pastCyclesList.innerHTML = ''; if (cycleData.length === 0) { pastCyclesList.innerHTML = '<p style="text-align: center; font-style: italic; color: var(--system-message-text);">No cycles logged yet.</p>'; return; } [...cycleData].reverse().forEach(cycle => { const item = document.createElement('div'); item.style.cssText = `padding: 4px 0; font-size: 0.9em; border-bottom: 1px dotted var(--input-border);`; const startDateText = _formatDateForDisplay(cycle.startDate); const endDateText = cycle.endDate ? _formatDateForDisplay(cycle.endDate) : 'Ongoing'; let durationText = ''; if (cycle.endDate) { const periodDays = _daysBetween(cycle.startDate, cycle.endDate); if (periodDays !== null) { durationText = `(${periodDays + 1} days)`; } } else if (isPeriodOngoing && cycle === cycleData[cycleData.length-1]) { const currentDuration = _daysBetween(cycle.startDate, _getCurrentDateString()); if (currentDuration !== null) { durationText = `(Day ${currentDuration + 1} ongoing)`; } } item.textContent = `${startDateText} - ${endDateText} ${durationText}`; pastCyclesList.appendChild(item); }); }

    // --- Event Handlers ---

    // ** MODIFIED: Use loggingDate and add checks **
    function _handleLogStart() {
        if (logStartDateButton.disabled) return; // Check if button should be disabled

        const dateToLog = loggingDate;
        const lastCycle = cycleData.length > 0 ? cycleData[cycleData.length - 1] : null;

        // Sanity Check 1: Cannot start before or on the last logged END date
        if (lastCycle && lastCycle.endDate && dateToLog <= lastCycle.endDate) {
             alert(`Whoops! Cannot start a cycle on or before the last end date (${_formatDateForDisplay(lastCycle.endDate)}).`);
             return;
        }
        // Sanity Check 2: Cannot start if a cycle already exists with this start date
         if (cycleData.some(c => c.startDate === dateToLog)) {
             alert(`Whoops! A cycle start is already logged for ${_formatDateForDisplay(dateToLog)}.`);
             return;
         }

        if (confirm(`Log ${_formatDateForDisplay(dateToLog)} as the START of your period?`)) {
            cycleData.push({ startDate: dateToLog, endDate: null });
            isPeriodOngoing = true; // A cycle is now definitively ongoing
            _saveData();
            _updateDisplay(); // Update UI including button states
            _showSimpleConfirmation(`Cycle start logged for ${_formatDateForDisplay(dateToLog)}! Take care, nyaa~!`);
        }
    }

    // ** MODIFIED: Use loggingDate and add checks **
    function _handleLogEnd() {
        if (logEndDateButton.disabled) return; // Check if button should be disabled

        const dateToLog = loggingDate;
        const lastCycle = cycleData[cycleData.length - 1];

        // Find the currently ongoing cycle (should be the last one)
        if (!lastCycle || lastCycle.endDate) {
             console.error("Error: Trying to log end day, but no ongoing cycle found in data.");
             alert("Something went wrong! Couldn't find the current cycle start to log the end day.");
             isPeriodOngoing = false; // Reset state as it's inconsistent
             _updateDisplay();
             return;
        }

         // Sanity Check: End date cannot be before the start date of this cycle
         if (dateToLog < lastCycle.startDate) {
             alert(`Hold on! The end date (${_formatDateForDisplay(dateToLog)}) can't be before the start date (${_formatDateForDisplay(lastCycle.startDate)}).`);
             return;
         }

        if (confirm(`Log ${_formatDateForDisplay(dateToLog)} as the END of this period?`)) {
            lastCycle.endDate = dateToLog;
            isPeriodOngoing = false; // Cycle is now complete
            _saveData();
            _updateDisplay(); // Update UI including button states
            _showSimpleConfirmation(`Cycle end logged for ${_formatDateForDisplay(dateToLog)}! Hope you feel okay~`);
        }
    }

    // Simple confirmation function (unchanged)
    function _showSimpleConfirmation(message) { /* ... */ const commentaryEl = document.getElementById('chore-commentary'); if (commentaryEl) { if (commentaryEl.fadeTimeout) clearTimeout(commentaryEl.fadeTimeout); if (commentaryEl.clearTimeout) clearTimeout(commentaryEl.clearTimeout); commentaryEl.textContent = message; commentaryEl.style.opacity = '1'; commentaryEl.style.transition = ''; commentaryEl.style.color = 'var(--mika-message-name)'; commentaryEl.fadeTimeout = setTimeout(() => { if (commentaryEl) { commentaryEl.style.transition = 'opacity 0.5s ease-out'; commentaryEl.style.opacity = '0'; commentaryEl.clearTimeout = setTimeout(() => { if (commentaryEl) { commentaryEl.textContent = ''; commentaryEl.style.opacity = '1'; commentaryEl.style.transition = ''; } }, 500); } }, 2500); } }


    // --- Initialization ---

    function init(_gameUiContainer, _messageCallback, _apiCaller, userName, persona) {
        console.log("Initializing Period Tracker (with date selection)...");
        gameUiContainer = _gameUiContainer;
        messageCallback = _messageCallback;
        currentUserName = userName || "User";
        currentPersonaInGame = persona || 'Mika';

        if (!gameUiContainer) { /* ... (error handling unchanged) ... */ console.error("Period Tracker UI container not provided!"); if(messageCallback) messageCallback('System', 'Error: Tracker UI container missing!'); return; }

        _loadData();
        loggingDate = _getCurrentDateString(); // ** Initialize logging date **
        _createMainUI();

        console.log(`Period Tracker initialized for ${currentUserName}. Logging for: ${loggingDate}. On-going: ${isPeriodOngoing}`);
    }

    // --- Public Interface ---
    return {
        init: init
    };

})();

// --- END OF FILE tracker.js --- (MODIFIED)