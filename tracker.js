// --- START OF FILE tracker.js ---

// Nyaa~! Period Tracker - Helping you keep track! ♡
// REMEMBER: This is just an estimate and not medical advice! Talk to a trusted adult or doctor if you have questions!

const PeriodTracker = (() => {
    // --- Settings & Constants ---
    const STORAGE_KEY_DATA = 'mikaPeriodTrackerData_v1';
    const MIN_CYCLES_FOR_PREDICTION = 2; // Need at least 2 completed cycles for a prediction

    // --- State ---
    let gameUiContainer = null; // Renamed conceptually, still the App Area container
    let messageCallback = null; // To send non-sensitive messages (like initial greeting?) outside the app UI if needed
    let currentUserName = "User"; // Updated via init
    let currentPersonaInGame = 'Mika'; // Updated via init

    let cycleData = []; // Array of { startDate: 'YYYY-MM-DD', endDate: 'YYYY-MM-DD' | null }
    let currentCycleStats = { // To store calculated values
        averageCycleLength: null, // In days
        averagePeriodLength: null, // In days
        predictedNextStartDate: null // 'YYYY-MM-DD'
    };
    let isPeriodOngoing = false; // Tracks if the current cycle is marked as started but not ended

    // --- DOM Element References (Assigned in _createMainUI) ---
    let logStartDateButton = null;
    let logEndDateButton = null;
    let predictionDisplay = null;
    let statsDisplay = null;
    let pastCyclesList = null;
    let disclaimerArea = null;

    // --- Helper Functions ---

    function _getCurrentDateString() {
        // Returns date in 'YYYY-MM-DD' format
        return new Date().toISOString().slice(0, 10);
    }

    function _formatDateForDisplay(dateString) {
        if (!dateString) return 'N/A';
        try {
            // Format as Month Day, Year (e.g., Aug 15, 2024)
            const date = new Date(dateString + 'T00:00:00'); // Ensure correct date interpretation
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        } catch (e) {
            console.error("Error formatting date:", dateString, e);
            return 'Invalid Date';
        }
    }

    function _addDaysToDate(dateString, days) {
        try {
            const date = new Date(dateString + 'T00:00:00');
            date.setDate(date.getDate() + days);
            return date.toISOString().slice(0, 10);
        } catch (e) {
            console.error("Error adding days to date:", dateString, days, e);
            return null;
        }
    }

    function _daysBetween(dateString1, dateString2) {
        try {
            const date1 = new Date(dateString1 + 'T00:00:00');
            const date2 = new Date(dateString2 + 'T00:00:00');
            const diffTime = Math.abs(date2 - date1);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays;
        } catch (e) {
            console.error("Error calculating days between:", dateString1, dateString2, e);
            return null;
        }
    }


    // --- Data Persistence ---

    function _saveData() {
        try {
            // Sort data just in case before saving
            cycleData.sort((a, b) => a.startDate.localeCompare(b.startDate));
            localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(cycleData));
            console.log("Tracker data saved.");
        } catch (e) {
            console.error("Failed to save tracker data:", e);
            // Maybe show an error in the UI? For now, just log it.
        }
    }

    function _loadData() {
        try {
            const storedData = localStorage.getItem(STORAGE_KEY_DATA);
            if (storedData) {
                cycleData = JSON.parse(storedData);
                // Basic validation
                if (!Array.isArray(cycleData)) cycleData = [];
                cycleData = cycleData.filter(c => c && typeof c.startDate === 'string');
                cycleData.sort((a, b) => a.startDate.localeCompare(b.startDate)); // Ensure sorted
                console.log(`Loaded ${cycleData.length} tracker entries.`);
            } else {
                cycleData = [];
                console.log("No previous tracker data found.");
            }
            // Determine if the last cycle is ongoing
            const lastCycle = cycleData[cycleData.length - 1];
            isPeriodOngoing = !!(lastCycle && lastCycle.startDate && !lastCycle.endDate);
        } catch (e) {
            console.error("Failed to load or parse tracker data:", e);
            cycleData = [];
            isPeriodOngoing = false;
            // Clear potentially corrupted data
            localStorage.removeItem(STORAGE_KEY_DATA);
        }
    }

    // --- Calculations ---

    function _calculateCycleStats() {
        const completedCycles = cycleData.filter(c => c.endDate);
        let totalCycleLengthDays = 0;
        let cycleLengthCount = 0;
        let totalPeriodLengthDays = 0;
        let periodLengthCount = 0;

        // Calculate cycle lengths (start date to start date)
        for (let i = 0; i < completedCycles.length - 1; i++) {
            const diff = _daysBetween(completedCycles[i].startDate, completedCycles[i+1].startDate);
            if (diff !== null && diff > 0) { // Basic sanity check
                totalCycleLengthDays += diff;
                cycleLengthCount++;
            }
        }

        // Calculate period lengths (start date to end date)
        completedCycles.forEach(cycle => {
            const diff = _daysBetween(cycle.startDate, cycle.endDate);
            if (diff !== null) {
                // Period length includes the start and end day, so add 1
                totalPeriodLengthDays += (diff + 1);
                periodLengthCount++;
            }
        });

        const avgCycle = cycleLengthCount >= MIN_CYCLES_FOR_PREDICTION -1 ? Math.round(totalCycleLengthDays / cycleLengthCount) : null;
        const avgPeriod = periodLengthCount > 0 ? Math.round(totalPeriodLengthDays / periodLengthCount) : null;

        currentCycleStats.averageCycleLength = avgCycle;
        currentCycleStats.averagePeriodLength = avgPeriod;

        // Predict next start date if possible
        if (avgCycle && cycleData.length > 0) {
            const lastStartDate = cycleData[cycleData.length - 1].startDate;
            currentCycleStats.predictedNextStartDate = _addDaysToDate(lastStartDate, avgCycle);
        } else {
            currentCycleStats.predictedNextStartDate = null;
        }

        console.log("Calculated Stats:", currentCycleStats);
    }


    // --- UI Rendering ---

    function _clearUI() {
        if (gameUiContainer) gameUiContainer.innerHTML = '';
        // Reset DOM references
        logStartDateButton = logEndDateButton = predictionDisplay = statsDisplay = pastCyclesList = disclaimerArea = null;
    }

    function _createMainUI() {
        _clearUI();
        if (!gameUiContainer) return;

        gameUiContainer.style.cssText = `width: 100%; height: 100%; display: flex; flex-direction: column; padding: 10px; box-sizing: border-box; justify-content: space-between;`;

        const topSection = document.createElement('div');
        topSection.style.flexShrink = '0';

        // --- Title ---
        const title = document.createElement('h3');
        title.textContent = `${currentPersonaInGame}'s Cycle Tracker ${currentPersonaInGame === 'Mika' ? '🌸' : '🩸'}`; // Persona touch
        title.style.textAlign = 'center';
        title.style.color = 'var(--chat-header-text)';
        topSection.appendChild(title);

        // --- Logging Buttons ---
        const buttonArea = document.createElement('div');
        buttonArea.style.cssText = `display: flex; justify-content: space-around; margin: 15px 0;`;

        logStartDateButton = document.createElement('button');
        logStartDateButton.textContent = "Log Today as START Day";
        logStartDateButton.className = 'rps-choice-button'; // Reuse button style
        logStartDateButton.onclick = _handleLogStart;
        logStartDateButton.disabled = isPeriodOngoing; // Disable if already started
        buttonArea.appendChild(logStartDateButton);

        logEndDateButton = document.createElement('button');
        logEndDateButton.textContent = "Log Today as END Day";
        logEndDateButton.className = 'rps-choice-button secondary'; // Style differently
        logEndDateButton.onclick = _handleLogEnd;
        logEndDateButton.disabled = !isPeriodOngoing; // Disable if not started
        buttonArea.appendChild(logEndDateButton);

        topSection.appendChild(buttonArea);

        // --- Prediction & Stats Display ---
        predictionDisplay = document.createElement('div');
        predictionDisplay.id = 'tracker-prediction';
        predictionDisplay.style.cssText = `text-align: center; font-size: 1.1em; margin-bottom: 5px; color: var(--mika-message-name); font-weight: bold;`;
        topSection.appendChild(predictionDisplay);

        statsDisplay = document.createElement('div');
        statsDisplay.id = 'tracker-stats';
        statsDisplay.style.cssText = `text-align: center; font-size: 0.9em; margin-bottom: 15px; color: var(--system-message-text);`;
        topSection.appendChild(statsDisplay);

        gameUiContainer.appendChild(topSection);

        // --- Past Cycles List ---
        const listSection = document.createElement('div');
        listSection.style.cssText = `flex-grow: 1; overflow-y: auto; border: 1px solid var(--input-border); border-radius: 5px; padding: 10px; margin-bottom: 10px;`;
        const listTitle = document.createElement('h4');
        listTitle.textContent = 'Past Cycles';
        listTitle.style.cssText = `margin-top: 0; margin-bottom: 5px; text-align: center; color: var(--chat-header-text);`;
        listSection.appendChild(listTitle);
        pastCyclesList = document.createElement('div');
        pastCyclesList.id = 'tracker-past-cycles';
        listSection.appendChild(pastCyclesList);

        gameUiContainer.appendChild(listSection);


        // --- Disclaimer ---
        const bottomSection = document.createElement('div');
        bottomSection.style.flexShrink = '0';

        disclaimerArea = document.createElement('div');
        disclaimerArea.id = 'tracker-disclaimer';
        disclaimerArea.style.cssText = `font-size: 0.85em; font-style: italic; color: var(--error-color); text-align: center; padding: 5px; border: 1px dashed var(--error-color); border-radius: 4px; margin-top: 10px;`;
        disclaimerArea.innerHTML = `<strong>Important:</strong> Predictions are just estimates based on past cycles and might not be exact! Cycles can change. This tool is not medical advice. Talk to a parent, guardian, or doctor if you have any questions or worries!`;
        bottomSection.appendChild(disclaimerArea);

        // --- Back Button ---
        const backButton = document.createElement('button');
        backButton.id = 'back-to-chat-button'; // Consistent ID for potential styling
        backButton.textContent = 'Back to Chat';
        backButton.onclick = () => {
            // Find the global function to switch back - assuming it's named switchToChatView
            if (typeof switchToChatView === 'function') {
                switchToChatView();
            } else {
                console.error("Cannot find switchToChatView function!");
            }
        };
        backButton.style.marginTop = '10px'; // Add some space
        bottomSection.appendChild(backButton);


        gameUiContainer.appendChild(bottomSection);

        // Initial Render
        _updateDisplay();
    }

    function _updateDisplay() {
        if (!gameUiContainer) return; // Don't try to update if UI isn't built

        // Update button states
        if (logStartDateButton) logStartDateButton.disabled = isPeriodOngoing;
        if (logEndDateButton) logEndDateButton.disabled = !isPeriodOngoing;

        // Calculate latest stats
        _calculateCycleStats();

        // Update prediction text
        if (predictionDisplay) {
            if (currentCycleStats.predictedNextStartDate) {
                predictionDisplay.textContent = `Predicted Next Start: ~${_formatDateForDisplay(currentCycleStats.predictedNextStartDate)}`;
            } else if (cycleData.length > 0 && cycleData.length < MIN_CYCLES_FOR_PREDICTION) {
                predictionDisplay.textContent = `Need ${MIN_CYCLES_FOR_PREDICTION - cycleData.length} more cycle(s) logged for prediction!`;
                 predictionDisplay.style.color = 'var(--system-message-text)'; // Less prominent color
            } else {
                 predictionDisplay.textContent = 'Log your first cycle start day!';
                 predictionDisplay.style.color = 'var(--system-message-text)';
            }
        }

        // Update stats text
        if (statsDisplay) {
            const avgCycleText = currentCycleStats.averageCycleLength ? `${currentCycleStats.averageCycleLength} days` : 'Calculating...';
            const avgPeriodText = currentCycleStats.averagePeriodLength ? `${currentCycleStats.averagePeriodLength} days` : 'Calculating...';
            statsDisplay.textContent = `Avg. Cycle: ${avgCycleText} | Avg. Period: ${avgPeriodText}`;
        }

        // Update past cycles list
        _renderPastCyclesList();
    }

    function _renderPastCyclesList() {
        if (!pastCyclesList) return;
        pastCyclesList.innerHTML = ''; // Clear list

        if (cycleData.length === 0) {
            pastCyclesList.innerHTML = '<p style="text-align: center; font-style: italic; color: var(--system-message-text);">No cycles logged yet.</p>';
            return;
        }

        // Display newest first
        [...cycleData].reverse().forEach(cycle => {
            const item = document.createElement('div');
            item.style.cssText = `padding: 4px 0; font-size: 0.9em; border-bottom: 1px dotted var(--input-border);`;

            const startDateText = _formatDateForDisplay(cycle.startDate);
            const endDateText = cycle.endDate ? _formatDateForDisplay(cycle.endDate) : 'Ongoing';
            let durationText = '';
            if (cycle.endDate) {
                const periodDays = _daysBetween(cycle.startDate, cycle.endDate);
                 if (periodDays !== null) {
                    durationText = `(${periodDays + 1} days)`; // Include start/end days
                 }
            } else if (isPeriodOngoing && cycle === cycleData[cycleData.length-1]) {
                 const currentDuration = _daysBetween(cycle.startDate, _getCurrentDateString());
                 if (currentDuration !== null) {
                     durationText = `(Day ${currentDuration + 1} ongoing)`;
                 }
            }


            item.textContent = `${startDateText} - ${endDateText} ${durationText}`;
            pastCyclesList.appendChild(item);
        });
    }


    // --- Event Handlers ---

    function _handleLogStart() {
        if (isPeriodOngoing) return; // Should be disabled, but double-check

        const today = _getCurrentDateString();

        // Prevent logging start if today is *before* the last logged start date (basic sanity check)
        const lastCycle = cycleData[cycleData.length - 1];
        if (lastCycle && today < lastCycle.startDate) {
             alert("Whoops! Looks like this date is before the last logged start date. Please check your logs.");
             return;
        }
         // Prevent logging start if today is *before* or *on* the last logged end date
         if (lastCycle && lastCycle.endDate && today <= lastCycle.endDate) {
             alert("Whoops! Looks like this start date overlaps with the last cycle's end date. Please check your logs.");
             return;
         }


        if (confirm(`Log today (${_formatDateForDisplay(today)}) as the START of your period?`)) {
            cycleData.push({ startDate: today, endDate: null });
            isPeriodOngoing = true;
            _saveData();
            _updateDisplay();
            // Optional: Simple confirmation message using canned commentary logic
            _showSimpleConfirmation("Cycle start logged! Take care, nyaa~!");
        }
    }

    function _handleLogEnd() {
        if (!isPeriodOngoing) return; // Should be disabled, but double-check

        const today = _getCurrentDateString();
        const lastCycle = cycleData[cycleData.length - 1];

        if (!lastCycle || lastCycle.endDate) {
             console.error("Error: Trying to log end day, but no ongoing cycle found in data.");
             alert("Something went wrong! Couldn't find the cycle start to log the end day.");
             isPeriodOngoing = false; // Reset state as it's inconsistent
             _updateDisplay();
             return;
        }

         // Prevent logging end date if it's *before* the start date of the current cycle
         if (today < lastCycle.startDate) {
             alert("Hold on! The end date can't be before the start date. Please check the date.");
             return;
         }


        if (confirm(`Log today (${_formatDateForDisplay(today)}) as the END of your period?`)) {
            lastCycle.endDate = today;
            isPeriodOngoing = false;
            _saveData();
            _updateDisplay();
            _showSimpleConfirmation("Cycle end logged! Hope you feel okay~");
        }
    }

     // Simple function to show a temporary message where commentary usually goes
     function _showSimpleConfirmation(message) {
         const commentaryEl = document.getElementById('chore-commentary'); // Reuse chore commentary element ID for simplicity
         if (commentaryEl) {
             if (commentaryEl.fadeTimeout) clearTimeout(commentaryEl.fadeTimeout);
             if (commentaryEl.clearTimeout) clearTimeout(commentaryEl.clearTimeout);

             commentaryEl.textContent = message;
             commentaryEl.style.opacity = '1';
             commentaryEl.style.transition = ''; // Ensure transition is cleared initially
             commentaryEl.style.color = 'var(--mika-message-name)'; // Use a noticeable color

             commentaryEl.fadeTimeout = setTimeout(() => {
                 if (commentaryEl) {
                     commentaryEl.style.transition = 'opacity 0.5s ease-out'; // Add fade out transition
                     commentaryEl.style.opacity = '0';
                     // Set timeout to clear text *after* fade out
                     commentaryEl.clearTimeout = setTimeout(() => {
                         if (commentaryEl) {
                             commentaryEl.textContent = '';
                             commentaryEl.style.opacity = '1'; // Reset opacity for next message
                             commentaryEl.style.transition = ''; // Clear transition
                         }
                     }, 500); // Wait 500ms (duration of fade)
                 }
             }, 2500); // Message visible for 2.5 seconds
         }
     }


    // --- Initialization ---

    function init(_gameUiContainer, _messageCallback, _apiCaller, userName, persona) {
        console.log("Initializing Period Tracker...");
        gameUiContainer = _gameUiContainer;
        messageCallback = _messageCallback;
        // apiCaller = _apiCaller; // We are NOT using the API caller for this app!
        currentUserName = userName || "User"; // Use username for potential greetings if needed later
        currentPersonaInGame = persona || 'Mika';

        if (!gameUiContainer) {
            console.error("Period Tracker UI container not provided!");
            // Maybe display error using messageCallback?
            if(messageCallback) messageCallback('System', 'Error: Tracker UI container missing!');
            return;
        }

        _loadData(); // Load existing cycle data
        _createMainUI(); // Build the UI elements

        console.log(`Period Tracker initialized for ${currentUserName}. On-going: ${isPeriodOngoing}`);
        // Optional: Send a non-sensitive greeting via messageCallback if desired
        // messageCallback(currentPersonaInGame, `Tracker ready, ${currentUserName}! Remember, I'm just here to help estimate!`);
    }

    // --- Public Interface ---
    return {
        init: init
        // No onExit needed currently as state is saved immediately
    };

})();

// --- END OF FILE tracker.js ---