// --- START OF FILE chores.js ---

// Nyaa~! Mika & Kana's Chore Helper! Making tasks fun! ♡
// (Or at least... tolerable. *Tsk* - Kana)

const ChoreHelper = (() => {
    // --- Settings & Constants ---
    const STORAGE_KEY_CHORES = 'mikaChores_list_v1';
    const STORAGE_KEY_BALANCE = 'mikaChores_balance_v1';
    const STORAGE_KEY_HISTORY = 'mikaChores_history_v1';
    const STORAGE_KEY_PIN_HASH = 'mikaChores_pinHash_v1';
    const STORAGE_KEY_LAST_DAY = 'mikaChores_lastDay_v1';
    const REWARD_NAME_SINGULAR = 'Bow'; // Singular reward name
    const REWARD_NAME_PLURAL = 'Bows'; // Plural reward name
    const REWARD_EMOJI = '🎀';
    const BOW_TO_DOLLAR_RATE = 0.10; // 1 Bow = $0.10 (so 10 Bows = $1.00)
    const MAX_HISTORY_ENTRIES = 50; // Limit history size

    // --- State ---
    let gameUiContainer = null;
    let messageCallback = null; // For API commentary -> index.html log
    let apiCaller = null;       // For API commentary -> index.html call
    let currentUserName = "Kiddo"; // Default, updated via init
    let currentPersonaInGame = 'Mika'; // Updated via init
    let chores = []; // { id: number, name: string, value: number, completed: boolean }
    let currentBalance = 0;
    let history = []; // { timestamp: number, message: string }
    let parentPinHash = null; // Store the hashed PIN (simple obfuscation)
    let isParentMode = false; // To track if parent management is unlocked
    let lastDayReset = null; // Stores the YYYY-MM-DD string of the last reset

    // --- DOM Element References (Assigned dynamically) ---
    let choreListElement = null;
    let balanceDisplayElement = null;
    let commentaryElement = null;
    let parentModeButton = null;
    let parentManagementArea = null;
    let addChoreForm = null;
    let historyViewArea = null;
    let statsPiggyBankElement = null;
    let statsTotalEarnedElement = null;
    let mainChoreViewArea = null; // Container for the main view

    // --- Helper Functions ---

    /** _getTimestamp(): Returns current timestamp. */
    function _getTimestamp() { return Date.now(); }

    /** _getCurrentDateString(): Returns 'YYYY-MM-DD'. */
    function _getCurrentDateString() { return new Date().toISOString().slice(0, 10); }

    /** _formatCurrency(amount): Formats a number as $X.XX */
    function _formatCurrency(amount) {
        return `$${(amount).toFixed(2)}`;
    }

    /** _hashPin(pin): VERY simple obfuscation (NOT SECURE). Just encodes to Base64. */
    function _hashPin(pin) {
        try {
            // WARNING: This is NOT cryptographically secure hashing.
            return btoa(pin + "mika-salt-v2"); // Simple Base64 encoding with a salt
        } catch (e) { console.error("Hashing failed:", e); return null; }
    }

    /** _verifyPin(pin): Obfuscates input PIN and compares to stored hash. */
    function _verifyPin(pin) {
        if (!parentPinHash) return false; // No PIN set
        const inputHash = _hashPin(pin);
        return inputHash === parentPinHash;
    }

    /** _saveState(): Saves chores, balance, history, pin hash, last day to localStorage. */
    function _saveState() {
        try {
            localStorage.setItem(STORAGE_KEY_CHORES, JSON.stringify(chores));
            localStorage.setItem(STORAGE_KEY_BALANCE, JSON.stringify(currentBalance));
            // Ensure history doesn't exceed max size when saving
            const limitedHistory = history.slice(-MAX_HISTORY_ENTRIES);
            localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(limitedHistory));
            if (parentPinHash) localStorage.setItem(STORAGE_KEY_PIN_HASH, parentPinHash);
            else localStorage.removeItem(STORAGE_KEY_PIN_HASH);
            localStorage.setItem(STORAGE_KEY_LAST_DAY, lastDayReset || '');
            // console.log("Chore state saved."); // Less console noise
        } catch (e) { console.error("Failed to save chore state:", e); }
    }

    /** _loadState(): Loads state from localStorage. */
    function _loadState() {
        try {
            const storedChores = localStorage.getItem(STORAGE_KEY_CHORES);
            const storedBalance = localStorage.getItem(STORAGE_KEY_BALANCE);
            const storedHistory = localStorage.getItem(STORAGE_KEY_HISTORY);
            const storedPinHash = localStorage.getItem(STORAGE_KEY_PIN_HASH);
            const storedLastDay = localStorage.getItem(STORAGE_KEY_LAST_DAY);

            chores = storedChores ? JSON.parse(storedChores) : [];
            chores = chores.map(c => ({ ...c, completed: c.completed || false, value: Number(c.value) || 0 })); // Ensure completed exists & value is number
            currentBalance = storedBalance ? parseFloat(storedBalance) : 0; // Use parseFloat for balance
             // Ensure history entries are valid objects
             let loadedHistory = storedHistory ? JSON.parse(storedHistory) : [];
             history = Array.isArray(loadedHistory) ? loadedHistory.filter(entry => entry && typeof entry === 'object' && entry.timestamp && entry.message) : [];
            parentPinHash = storedPinHash || null;
            lastDayReset = storedLastDay || null;
            console.log("Chore state loaded.");
        } catch (e) {
            console.error("Failed to load or parse chore state:", e);
            chores = []; currentBalance = 0; history = []; parentPinHash = null; lastDayReset = null;
        }
    }

    /** _resetDailyChores(): Checks date, unchecks chores if new day. */
    function _resetDailyChores() {
        const todayStr = _getCurrentDateString();
        if (lastDayReset !== todayStr) {
            console.log(`New day detected (${todayStr}). Resetting daily chores.`);
            let choresWereReset = false;
            chores.forEach(chore => {
                if (chore.completed) {
                    chore.completed = false;
                    choresWereReset = true;
                }
            });
            lastDayReset = todayStr;
            if (choresWereReset) {
                _saveState(); // Save the reset state immediately
            }
             localStorage.setItem(STORAGE_KEY_LAST_DAY, lastDayReset); // Also save last day even if no chores were reset
        } else {
            // console.log("Chores already up-to-date for today.");
        }
    }

    /** _updateBalanceDisplay(): Updates the UI element showing current balance and monetary value. */
    function _updateBalanceDisplay() {
        const monetaryValue = currentBalance * BOW_TO_DOLLAR_RATE;
        const balanceText = `${currentBalance} ${REWARD_EMOJI} (${_formatCurrency(monetaryValue)})`;
        if (balanceDisplayElement) {
            balanceDisplayElement.textContent = `Balance: ${balanceText}`;
            balanceDisplayElement.title = `Current ${REWARD_NAME_PLURAL}`;
        }
         // Also update stats if history view is active
         const piggyBankValueEl = document.getElementById('piggy-bank-value');
         if (piggyBankValueEl && historyViewArea && historyViewArea.style.display !== 'none') {
             piggyBankValueEl.textContent = balanceText;
         }
    }

    /** _addHistoryEntry(message): Adds a message to the history array, limits size, and saves. */
    function _addHistoryEntry(message) {
        if (!message) return;
        history.push({ timestamp: _getTimestamp(), message });
        // Limit history size
        if (history.length > MAX_HISTORY_ENTRIES) {
            history = history.slice(-MAX_HISTORY_ENTRIES); // Keep only the last N entries
        }
        _saveState();
        // If history view is active, re-render it
        const historyListContainer = document.getElementById('history-list-container');
        if (historyListContainer && historyViewArea && historyViewArea.style.display !== 'none') {
            _renderHistoryList(historyListContainer);
        }
    }

    /** _calculateTotalEarned(): Calculates total ever earned from history. */
    function _calculateTotalEarned() {
        let totalBows = 0;
        // Regex to find patterns like (+10 🎀) or (+5 🎀) or (-3 🎀) including bonus/adjust
        const regex = /\([+-](\d+)\s*🎀\)/g; // Find all +/- adjustments
        history.forEach(entry => {
            let match;
            while ((match = regex.exec(entry.message)) !== null) {
                 // Check the sign preceding the match if possible, or rely on message context
                 // A simpler way: only sum positive entries for "earned"
                 if (entry.message.includes(`(+${match[1]} ${REWARD_EMOJI})`)) {
                     totalBows += parseInt(match[1], 10);
                 }
            }
            // Specifically look for Bonus and Manual Additions
             if (entry.message.startsWith('Bonus Added!') || entry.message.startsWith('Parent Manual Adjust: +')) {
                 const bonusMatch = entry.message.match(/\(\+(\d+)\s*🎀\)/);
                 if(bonusMatch && bonusMatch[1]) {
                     // Avoid double counting if already caught by regex, though regex should handle it.
                     // This logic might need refinement based on exact history message formats.
                     // For simplicity, let's stick to the regex sum for now. A dedicated "earned" field might be better long-term.
                 }
             }
        });
         // Refined approach: Sum *all* additions from history
         let totalEarned = 0;
         const addRegex = /\(\+(\d+)\s*🎀\)/g; // Only additions
         history.forEach(entry => {
            let match;
            while ((match = addRegex.exec(entry.message)) !== null) {
                totalEarned += parseInt(match[1], 10);
            }
         });

        return totalEarned;
    }


    // --- UI Rendering Functions ---

    /** Clears the main game container */
    function _clearUI() {
        if(gameUiContainer) gameUiContainer.innerHTML = '';
        mainChoreViewArea = choreListElement = balanceDisplayElement = commentaryElement = parentModeButton = null;
        parentManagementArea = addChoreForm = historyViewArea = statsPiggyBankElement = statsTotalEarnedElement = null;
        isParentMode = false;
    }

    /** _createMainUI(): Creates the main chore list view. */
    function _createMainUI() {
        _clearUI();

        mainChoreViewArea = document.createElement('div');
        mainChoreViewArea.style.width = '100%';
        mainChoreViewArea.style.height = '100%';
        mainChoreViewArea.style.display = 'flex';
        mainChoreViewArea.style.flexDirection = 'column';
        mainChoreViewArea.style.padding = '10px';
        mainChoreViewArea.style.boxSizing = 'border-box';

        // Header Area
        const headerArea = document.createElement('div');
        headerArea.style.display = 'flex';
        headerArea.style.justifyContent = 'space-between';
        headerArea.style.alignItems = 'center';
        headerArea.style.marginBottom = '10px';
        headerArea.style.flexShrink = '0';
        headerArea.style.flexWrap = 'wrap'; // Allow buttons to wrap on small screens

        balanceDisplayElement = document.createElement('span');
        balanceDisplayElement.style.fontWeight = 'bold';
        balanceDisplayElement.style.fontSize = '1.1em';
        balanceDisplayElement.style.marginRight = '10px'; // Space before buttons
        _updateBalanceDisplay();
        headerArea.appendChild(balanceDisplayElement);

        const buttonGroup = document.createElement('div');
        buttonGroup.style.display = 'flex'; // Keep buttons together
        buttonGroup.style.gap = '5px'; // Space between buttons

        const redeemButton = document.createElement('button');
        redeemButton.textContent = `Redeem ${REWARD_EMOJI}!`;
        redeemButton.className = 'rps-choice-button';
        redeemButton.title = `Ask Parent to redeem your ${REWARD_NAME_PLURAL}!`;
        redeemButton.onclick = _handleRedeem;
        buttonGroup.appendChild(redeemButton);

        const historyButton = document.createElement('button');
        historyButton.textContent = 'History 📜';
        historyButton.className = 'rps-choice-button secondary';
        historyButton.onclick = _createHistoryUI;
        buttonGroup.appendChild(historyButton);

        parentModeButton = document.createElement('button');
        parentModeButton.textContent = '⚙️ Parent';
        parentModeButton.className = 'rps-choice-button secondary';
        parentModeButton.onclick = _handleParentModeToggle;
        buttonGroup.appendChild(parentModeButton);

        headerArea.appendChild(buttonGroup);
        mainChoreViewArea.appendChild(headerArea);

        // Chore List Area
        choreListElement = document.createElement('div');
        choreListElement.id = 'chore-list';
        choreListElement.style.flexGrow = '1';
        choreListElement.style.overflowY = 'auto';
        choreListElement.style.border = '1px solid var(--game-cell-border)';
        choreListElement.style.borderRadius = '5px';
        choreListElement.style.padding = '10px';
        choreListElement.style.marginBottom = '10px';
        mainChoreViewArea.appendChild(choreListElement);

        // Commentary Area - **FIXED** Ensure it's created and added
        commentaryElement = document.createElement('div');
        commentaryElement.id = 'chore-commentary';
        commentaryElement.style.minHeight = '1.5em'; // Ensure space is reserved
        commentaryElement.style.height = '1.5em';    // Fixed height
        commentaryElement.style.textAlign = 'center';
        commentaryElement.style.fontStyle = 'italic';
        commentaryElement.style.fontSize = '0.9em';
        commentaryElement.style.color = 'var(--mika-message-name)';
        commentaryElement.style.flexShrink = '0';
        commentaryElement.style.marginTop = '5px'; // Space above commentary
        commentaryElement.style.overflow = 'hidden'; // Hide overflow
        commentaryElement.style.whiteSpace = 'nowrap'; // Prevent wrapping
        commentaryElement.style.textOverflow = 'ellipsis'; // Add ellipsis if too long
        mainChoreViewArea.appendChild(commentaryElement); // Append it!

        // Hidden Parent Management Area (created but not appended yet)
        _createParentManagementUI();

        gameUiContainer.appendChild(mainChoreViewArea);
        _renderChoreList(); // Populate the list
    }

    /** _renderChoreList(): Clears and redraws the chore list. */
    function _renderChoreList() { /* ... (No changes needed from previous version) ... */
        if (!choreListElement) return;
        choreListElement.innerHTML = '';

        if (chores.length === 0) {
            choreListElement.innerHTML = '<p style="text-align: center; padding-top: 20px; color: var(--system-message-text);"><i>No chores added yet! Ask a parent to add some using the ⚙️ button.</i></p>';
            return;
        }

        chores.forEach(chore => {
            const choreDiv = document.createElement('div');
            choreDiv.style.display = 'flex';
            choreDiv.style.alignItems = 'center';
            choreDiv.style.padding = '8px 5px';
            choreDiv.style.borderBottom = '1px dashed var(--input-border)';
            choreDiv.style.opacity = chore.completed ? 0.6 : 1;
            choreDiv.style.transition = 'opacity 0.3s ease'; // Smooth fade

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = chore.completed;
            checkbox.id = `chore-${chore.id}`;
            checkbox.dataset.choreId = chore.id; // Store ID for handler
            checkbox.style.marginRight = '10px';
            checkbox.style.transform = 'scale(1.3)';
            checkbox.style.cursor = 'pointer';
            checkbox.onchange = (e) => _handleChoreCheck(chore.id, e.target.checked);

            const label = document.createElement('label');
            label.htmlFor = `chore-${chore.id}`;
            label.textContent = `${chore.name} (+${chore.value} ${REWARD_EMOJI})`;
            label.style.flexGrow = '1';
            label.style.textDecoration = chore.completed ? 'line-through' : 'none';
            label.style.cursor = 'pointer';
            // Add click handler to label too for better usability
            label.onclick = () => { checkbox.checked = !checkbox.checked; checkbox.dispatchEvent(new Event('change')); };


            choreDiv.appendChild(checkbox);
            choreDiv.appendChild(label);
            choreListElement.appendChild(choreDiv);
        });
    }

    /** _createParentManagementUI(): Creates the UI elements for managing chores (initially hidden). */
    function _createParentManagementUI() {
        parentManagementArea = document.createElement('div');
        parentManagementArea.id = 'parent-management-area';
        parentManagementArea.style.display = 'none'; // Hidden by default
        parentManagementArea.style.padding = '15px';
        parentManagementArea.style.border = '2px solid var(--popup-border)';
        parentManagementArea.style.borderRadius = '8px';
        parentManagementArea.style.marginTop = '10px';
        parentManagementArea.style.backgroundColor = 'var(--game-board-bg)';
        parentManagementArea.style.maxHeight = 'calc(100% - 40px)'; // Allow space for close button maybe
        parentManagementArea.style.overflowY = 'auto';
        parentManagementArea.style.boxSizing = 'border-box';


        const title = document.createElement('h3');
        title.textContent = 'Parent Controls';
        title.style.textAlign = 'center';
        title.style.marginTop = '0';
        parentManagementArea.appendChild(title);

        // --- Add Chore Form ---
        addChoreForm = document.createElement('form');
        addChoreForm.style.marginBottom = '20px';
        addChoreForm.style.paddingBottom = '15px';
        addChoreForm.style.borderBottom = '1px solid var(--input-border)';
        const addTitle = document.createElement('h4'); addTitle.textContent = 'Add New Chore'; addTitle.style.marginBottom = '10px'; addChoreForm.appendChild(addTitle);
        const nameLabel = document.createElement('label'); nameLabel.textContent = 'Chore Name: '; const nameInput = document.createElement('input'); nameInput.type = 'text'; nameInput.id = 'add-chore-name'; nameInput.required = true; nameInput.style.margin = '5px'; nameInput.style.padding = '5px'; addChoreForm.appendChild(nameLabel); addChoreForm.appendChild(nameInput); addChoreForm.appendChild(document.createElement('br'));
        const valueLabel = document.createElement('label'); valueLabel.textContent = `Value (${REWARD_EMOJI}): `; const valueInput = document.createElement('input'); valueInput.type = 'number'; valueInput.id = 'add-chore-value'; valueInput.min = '0'; valueInput.required = true; valueInput.style.margin = '5px'; valueInput.style.padding = '5px'; valueInput.style.width = '60px'; addChoreForm.appendChild(valueLabel); addChoreForm.appendChild(valueInput); addChoreForm.appendChild(document.createElement('br'));
        const addButton = document.createElement('button'); addButton.type = 'submit'; addButton.textContent = 'Add Chore'; addButton.className = 'rps-choice-button'; addButton.style.marginTop = '10px'; addChoreForm.appendChild(addButton);
        addChoreForm.onsubmit = _handleAddChore;
        parentManagementArea.appendChild(addChoreForm);

         // --- Bonus Points ---
         const bonusArea = document.createElement('div'); bonusArea.style.marginBottom = '20px'; bonusArea.style.paddingBottom = '15px'; bonusArea.style.borderBottom = '1px solid var(--input-border)';
         const bonusTitle = document.createElement('h4'); bonusTitle.textContent = 'Add Bonus'; bonusTitle.style.marginBottom = '10px'; bonusArea.appendChild(bonusTitle);
         const bonusValueLabel = document.createElement('label'); bonusValueLabel.textContent = `Bonus ${REWARD_EMOJI}: `; const bonusValueInput = document.createElement('input'); bonusValueInput.type = 'number'; bonusValueInput.id = 'bonus-value-input'; bonusValueInput.min = '1'; bonusValueInput.style.margin = '5px'; bonusValueInput.style.padding = '5px'; bonusValueInput.style.width = '60px'; bonusArea.appendChild(bonusValueLabel); bonusArea.appendChild(bonusValueInput);
         const bonusAddButton = document.createElement('button'); bonusAddButton.textContent = `Add Bonus ${REWARD_EMOJI}`; bonusAddButton.className = 'rps-choice-button'; bonusAddButton.style.marginLeft = '10px';
         bonusAddButton.onclick = () => { /* ... (Bonus adding logic - unchanged) ... */
             const amount = parseInt(bonusValueInput.value, 10);
             if (amount > 0) {
                 currentBalance += amount;
                 _addHistoryEntry(`Bonus Added! (+${amount} ${REWARD_EMOJI})`);
                 _updateBalanceDisplay();
                 _saveState();
                 _triggerApiCommentary('bonusAdded', { amount: amount });
                 bonusValueInput.value = ''; // Clear input
                 alert(`Added ${amount} ${REWARD_EMOJI} bonus!`);
             } else { alert("Please enter a valid bonus amount."); }
         };
         bonusArea.appendChild(bonusAddButton);
         parentManagementArea.appendChild(bonusArea);

         // --- **NEW** Manual Balance Adjustment ---
         const adjustArea = document.createElement('div');
         adjustArea.style.marginBottom = '20px';
         adjustArea.style.paddingBottom = '15px';
         adjustArea.style.borderBottom = '1px solid var(--input-border)';
         const adjustTitle = document.createElement('h4');
         adjustTitle.textContent = 'Manual Balance Adjust';
         adjustTitle.style.marginBottom = '10px';
         adjustArea.appendChild(adjustTitle);
         const adjustValueLabel = document.createElement('label');
         adjustValueLabel.textContent = `Amount ${REWARD_EMOJI}: `;
         const adjustValueInput = document.createElement('input');
         adjustValueInput.type = 'number';
         adjustValueInput.id = 'adjust-value-input';
         adjustValueInput.min = '1'; // Adjust requires at least 1
         adjustValueInput.style.margin = '5px';
         adjustValueInput.style.padding = '5px';
         adjustValueInput.style.width = '60px';
         adjustArea.appendChild(adjustValueLabel);
         adjustArea.appendChild(adjustValueInput);

         const adjustAddButton = document.createElement('button');
         adjustAddButton.textContent = `Add`;
         adjustAddButton.className = 'rps-choice-button';
         adjustAddButton.style.marginLeft = '10px';
         adjustAddButton.onclick = () => _handleManualBalanceAdjust(adjustValueInput.value, true);
         adjustArea.appendChild(adjustAddButton);

         const adjustSubtractButton = document.createElement('button');
         adjustSubtractButton.textContent = `Subtract`;
         adjustSubtractButton.className = 'rps-choice-button secondary'; // Subtract is secondary
         adjustSubtractButton.style.marginLeft = '5px';
         adjustSubtractButton.onclick = () => _handleManualBalanceAdjust(adjustValueInput.value, false);
         adjustArea.appendChild(adjustSubtractButton);
         parentManagementArea.appendChild(adjustArea);
         // --- End Manual Balance Adjustment ---


        // --- Existing Chores List ---
        const existingTitle = document.createElement('h4'); existingTitle.textContent = 'Manage Existing Chores'; existingTitle.style.marginBottom = '10px'; parentManagementArea.appendChild(existingTitle);
        const existingChoresList = document.createElement('div'); existingChoresList.id = 'manage-chore-list'; parentManagementArea.appendChild(existingChoresList);
        _renderManageChoreList(existingChoresList); // Populate it

        // --- PIN Management ---
        const pinArea = document.createElement('div'); pinArea.style.marginTop = '20px'; pinArea.style.paddingTop = '15px'; pinArea.style.borderTop = '1px solid var(--input-border)';
        const pinTitle = document.createElement('h4'); pinTitle.textContent = 'Set/Change Parent PIN'; pinTitle.style.marginBottom = '10px'; pinArea.appendChild(pinTitle);
        const pinInput = document.createElement('input'); pinInput.type = 'password'; pinInput.id = 'parent-pin-set'; pinInput.placeholder = 'Enter 4-digit PIN'; pinInput.maxLength = 4; pinInput.pattern = "\\d{4}"; pinInput.autocomplete="new-password"; /* Prevent browser save */ pinInput.style.marginRight = '10px'; pinInput.style.padding = '5px'; pinArea.appendChild(pinInput);
        const setPinButton = document.createElement('button'); setPinButton.textContent = parentPinHash ? 'Change PIN' : 'Set PIN'; setPinButton.className = 'rps-choice-button secondary';
        setPinButton.onclick = () => { /* ... (PIN setting logic - unchanged) ... */
             const newPin = pinInput.value;
             if (newPin && /^\d{4}$/.test(newPin)) {
                 _handleSetPin(newPin);
                 pinInput.value = ''; // Clear after setting
                 setPinButton.textContent = 'Change PIN'; // Update button text
             } else { alert("Please enter a valid 4-digit PIN."); }
         };
        pinArea.appendChild(setPinButton);
        parentManagementArea.appendChild(pinArea);


        // --- Close Button ---
        const closeButton = document.createElement('button'); closeButton.textContent = 'Close Parent Controls'; closeButton.className = 'rps-choice-button secondary'; closeButton.style.marginTop = '20px'; closeButton.style.display = 'block'; closeButton.style.marginLeft = 'auto'; closeButton.style.marginRight = 'auto'; closeButton.onclick = _hideParentManagementUI;
        parentManagementArea.appendChild(closeButton);
    }

    /** _renderManageChoreList(container): Renders chores with delete buttons for parent mode. */
    function _renderManageChoreList(container) { /* ... (No changes needed from previous version) ... */
        if (!container) container = document.getElementById('manage-chore-list');
        if (!container) return;
        container.innerHTML = '';

        if (chores.length === 0) {
            container.textContent = 'No chores to manage yet.';
            return;
        }

        chores.forEach(chore => {
            const itemDiv = document.createElement('div');
            itemDiv.style.display = 'flex';
            itemDiv.style.justifyContent = 'space-between';
            itemDiv.style.alignItems = 'center';
            itemDiv.style.padding = '5px 0';
            itemDiv.style.borderBottom = '1px solid var(--input-border)';

            const choreInfo = document.createElement('span');
            choreInfo.textContent = `${chore.name} (${chore.value} ${REWARD_EMOJI})`;

            // Add Edit/Delete buttons (Edit is complex, start with Delete)
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.className = 'rps-choice-button secondary'; // Maybe a smaller style?
            deleteButton.style.fontSize = '0.8em';
            deleteButton.style.padding = '3px 6px';
            deleteButton.style.marginLeft = '10px';
            deleteButton.onclick = () => _handleDeleteChore(chore.id);

            itemDiv.appendChild(choreInfo);
            itemDiv.appendChild(deleteButton);
            container.appendChild(itemDiv);
        });
     }

    /** _showParentManagementUI(): Shows the management UI after PIN entry. */
    function _showParentManagementUI() { /* ... (No changes needed) ... */
        if (!mainChoreViewArea || !parentManagementArea) return;
        mainChoreViewArea.style.display = 'none';
        const listContainer = parentManagementArea.querySelector('#manage-chore-list');
        if(listContainer) _renderManageChoreList(listContainer);
        gameUiContainer.appendChild(parentManagementArea);
        parentManagementArea.style.display = 'block';
        isParentMode = true;
        console.log("Parent mode entered.");
     }

    /** _hideParentManagementUI(): Hides management UI, shows main chore list. */
    function _hideParentManagementUI() { /* ... (No changes needed) ... */
        if (!mainChoreViewArea || !parentManagementArea) return;
        if(parentManagementArea.parentNode === gameUiContainer) {
            gameUiContainer.removeChild(parentManagementArea);
        }
        parentManagementArea.style.display = 'none';
        mainChoreViewArea.style.display = 'flex';
        isParentMode = false;
        console.log("Parent mode exited.");
    }

    /** _createHistoryUI(): Creates and displays the history view page with stats. */
    function _createHistoryUI() {
        _clearUI();

        historyViewArea = document.createElement('div');
        historyViewArea.id = 'chore-history-view';
        historyViewArea.style.width = '100%';
        historyViewArea.style.height = '100%';
        historyViewArea.style.display = 'flex';
        historyViewArea.style.flexDirection = 'column';
        historyViewArea.style.padding = '10px';
        historyViewArea.style.boxSizing = 'border-box';

        const title = document.createElement('h3'); title.textContent = 'Chore History & Stats'; title.style.textAlign = 'center'; title.style.flexShrink = '0'; historyViewArea.appendChild(title);
        const backButton = document.createElement('button'); backButton.textContent = '← Back to Chores'; backButton.className = 'rps-choice-button secondary'; backButton.style.marginBottom = '10px'; backButton.style.alignSelf = 'center'; backButton.style.flexShrink = '0'; backButton.onclick = _createMainUI; historyViewArea.appendChild(backButton);

        // Stats Area
        const statsArea = document.createElement('div'); statsArea.style.marginBottom = '10px'; statsArea.style.padding = '10px'; statsArea.style.border = '1px solid var(--input-border)'; statsArea.style.borderRadius = '5px'; statsArea.style.textAlign = 'center'; statsArea.style.flexShrink = '0';

        // Piggy Bank (Current Balance)
        const piggyBankP = document.createElement('p'); piggyBankP.style.margin = '5px 0';
        piggyBankP.innerHTML = `Current Balance (Piggy Bank): <strong id="piggy-bank-value"></strong>`;
        statsArea.appendChild(piggyBankP);

        // Total Earned Ever
        const totalEarnedP = document.createElement('p'); totalEarnedP.style.margin = '5px 0';
        totalEarnedP.innerHTML = `Total Earned Ever: <strong id="total-earned-value"></strong>`;
        statsArea.appendChild(totalEarnedP);
        historyViewArea.appendChild(statsArea);

        // History List Container
        const historyListContainer = document.createElement('div'); historyListContainer.id = 'history-list-container'; historyListContainer.style.flexGrow = '1'; historyListContainer.style.overflowY = 'auto'; historyListContainer.style.border = '1px solid var(--input-border)'; historyListContainer.style.borderRadius = '5px'; historyListContainer.style.padding = '10px'; historyViewArea.appendChild(historyListContainer);

        gameUiContainer.appendChild(historyViewArea);

        // Populate stats and history list after appending
        _updateStatsDisplay(); // Update balance display
        _updateTotalEarnedDisplay(); // Update total earned display
        _renderHistoryList(historyListContainer);
    }

     /** _updateTotalEarnedDisplay(): Updates the total earned stats element. */
     function _updateTotalEarnedDisplay() {
         const totalEarnedValueEl = document.getElementById('total-earned-value');
         if (totalEarnedValueEl) {
             const totalBows = _calculateTotalEarned();
             const totalDollars = totalBows * BOW_TO_DOLLAR_RATE;
             totalEarnedValueEl.textContent = `${totalBows} ${REWARD_EMOJI} (${_formatCurrency(totalDollars)})`;
             totalEarnedValueEl.title = `Total ${REWARD_NAME_PLURAL} earned over time.`;
         }
     }


    /** _renderHistoryList(container): Renders the history entries into the container. */
    function _renderHistoryList(container) {
        if (!container) return;
        container.innerHTML = ''; // Clear existing list

        if (history.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--system-message-text);"><i>No chore history yet!</i></p>';
            return;
        }

        // Show newest entries first
        [...history].reverse().forEach(entry => {
            const entryDiv = document.createElement('div');
            entryDiv.style.padding = '4px 0';
            entryDiv.style.fontSize = '0.9em';
            entryDiv.style.borderBottom = '1px dotted var(--input-border)';
            entryDiv.style.display = 'flex'; // Use flex for alignment
            entryDiv.style.justifyContent = 'space-between'; // Space out date and message

            const messageSpan = document.createElement('span');
            messageSpan.textContent = entry.message;
            messageSpan.style.flexGrow = '1'; // Allow message to take space
            messageSpan.style.marginRight = '10px'; // Space before date

            const dateSpan = document.createElement('span');
            dateSpan.style.color = 'var(--system-message-text)';
            dateSpan.style.fontSize = '0.8em';
            dateSpan.style.whiteSpace = 'nowrap'; // Prevent date wrapping
            dateSpan.textContent = new Date(entry.timestamp).toLocaleString();

            entryDiv.appendChild(messageSpan); // Message first
            entryDiv.appendChild(dateSpan); // Then date
            container.appendChild(entryDiv);
        });
    }


    // --- Commentary Functions ---

    /** _showCannedCommentary(type, value = 0): Displays a quick, non-API message in commentaryElement. */
    function _showCannedCommentary(type, value = 0) {
        if (!commentaryElement) return;
        let msg = "";
        // Define reward name based on value
        const rewardName = (value === 1) ? REWARD_NAME_SINGULAR : REWARD_NAME_PLURAL;
        const cannedResponses = {
            Mika: {
                choreDone: [`+${value} ${rewardName}! Keep going! (*^▽^*)`, `Nice one! +${value} ${rewardName}!`, `Got it! +${value} ${rewardName} ☆`],
                choreUndone: [`-${value} ${rewardName} undone... (・_・;)`, `Oops! -${value} ${rewardName}.`, `Undid that one! (-${value} ${rewardName})`],
                randomDaily: [`Keep up the great work, ${currentUserName}! (๑˃ᴗ˂)ﻭ`, `Don't forget your chores today~ Hehe! (ΦωΦ)`, `Making Master proud! ♡`],
                redeemEmpty: [`Your piggy bank is empty, silly! (⌒_⌒;) Do some chores!`],
            },
            Kana: {
                choreDone: [`+${value} ${REWARD_NAME_PLURAL}.`, `Done. +${value} ${REWARD_NAME_PLURAL}.`],
                choreUndone: [`-${value} ${REWARD_NAME_PLURAL}. Undone.`, `Took back ${value} ${REWARD_NAME_PLURAL}.`, `Undid chore. (-${value} ${REWARD_NAME_PLURAL})`],
                randomDaily: [`Are those chores done yet?`, `Still waiting... (¬_¬)`, `Just get it over with.`],
                redeemEmpty: [`Empty. Do something first.`],
            }
        };
        const personaMsgs = cannedResponses[currentPersonaInGame] || cannedResponses.Mika;
        if (personaMsgs[type] && personaMsgs[type].length > 0) {
            const randomIndex = Math.floor(Math.random() * personaMsgs[type].length);
            msg = personaMsgs[type][randomIndex];

            commentaryElement.textContent = `${msg} ${REWARD_EMOJI}`; // Add emoji at the end
            commentaryElement.title = msg; // Tooltip for full message if cut off
            commentaryElement.style.opacity = '1';
            setTimeout(() => {
                 if(commentaryElement) {
                    commentaryElement.style.transition = 'opacity 0.5s ease-out';
                    commentaryElement.style.opacity = '0';
                    setTimeout(() => {
                         if(commentaryElement) {
                            commentaryElement.textContent = '';
                            commentaryElement.title = '';
                            commentaryElement.style.opacity = '1';
                            commentaryElement.style.transition = '';
                         }
                    }, 500);
                 }
             }, 2500);
        }
    }

    /** _triggerApiCommentary(eventType, details): Builds prompt and calls API via apiCaller. */
    async function _triggerApiCommentary(eventType, details = {}) { /* ... (No changes needed from previous version) ... */
         if (!apiCaller || !messageCallback) { console.warn("API Caller or Message Callback not available for commentary."); return; }
        let prompt = "";
        const kidName = currentUserName;
        const reward = REWARD_NAME_PLURAL; // Use plural for most commentary
        const emoji = REWARD_EMOJI;
        const baseRoleMika = `[ROLE: You are Mika, the cheerful catgirl helper. ${kidName} is using the chore app.]`;
        const baseRoleKana = `[ROLE: You are Kana, the sarcastic catgirl helper. ${kidName} is using the chore app.]`;
        const baseRole = (currentPersonaInGame === 'Mika') ? baseRoleMika : baseRoleKana;

        switch (eventType) {
            case 'allChoresDone':
                prompt = (currentPersonaInGame === 'Mika')
                    ? `${baseRole} ${kidName} just finished ALL chores for the day, earning ${details.earnedToday} ${reward}! Cheer them on enthusiastically! Be super proud! Use cute noises/emojis like (*^▽^*), (≧∀≦), (ﾉ´ヮ´)ﾉ*:･ﾟ✧, (๑˃ᴗ˂)ﻭ, (ΦωΦ), (=^･ω･^=), *purrrr*, *giggle*, Nyaa~! ☆(≧∀≦*)ﾉ`
                    : `${baseRole} ${kidName} finally finished all chores, earning ${details.earnedToday} ${reward}. Give a sarcastic but maybe slightly impressed acknowledgement. Keep it short and dry. Use emojis like (¬_¬), *Tsk*, *Sigh*, (￣_￣), 😼.`;
                break;
            case 'bonusAdded':
                prompt = (currentPersonaInGame === 'Mika')
                    ? `${baseRole} The parent just gave ${kidName} a bonus of ${details.amount} ${reward}! React with surprise and excitement! Tell them they must be doing super well! Use cute noises/emojis! Yay! (ﾉ´ヮ´)ﾉ*:･ﾟ✧`
                    : `${baseRole} The parent just gave ${kidName} a bonus of ${details.amount} ${reward}. Make a sarcastic remark about it. Maybe imply they bribed the parent or that it won't happen again. *Tsk*.`;
                break;
            case 'cashOut':
                prompt = (currentPersonaInGame === 'Mika')
                    ? `${baseRole} ${kidName} is ready to cash out ${details.amount} ${reward}! Congratulate them excitedly! Tell them to go show their parent! So exciting! Yay! Use cute noises/emojis! ♡＼(￣▽￣)／♡`
                    : `${baseRole} ${kidName} is cashing out ${details.amount} ${reward}. Make a dry comment about them finally claiming their reward or asking what they'll waste it on. Keep it brief.`;
                break;
             // Add case for manual adjustment if API commentary is desired
             case 'manualAdjust':
                 const action = details.amount > 0 ? 'added' : 'subtracted';
                 const absAmount = Math.abs(details.amount);
                 prompt = (currentPersonaInGame === 'Mika')
                     ? `${baseRole} The parent manually ${action} ${absAmount} ${reward} ${action === 'added' ? 'to' : 'from'} ${kidName}'s balance! React appropriately (happy if added, maybe concerned if subtracted?). Current balance is ${details.newBalance}.`
                     : `${baseRole} The parent manually adjusted ${kidName}'s balance by ${details.amount > 0 ? '+' : ''}${details.amount} ${reward}. Make a dry or suspicious comment about why. Current balance is ${details.newBalance}.`;
                 break;
            default: console.warn("Unknown API commentary event:", eventType); return;
        }
        console.log(`Triggering API commentary for ${eventType} with prompt: ${prompt}`);
        try {
            const response = await apiCaller(prompt, []);
            if (response) { messageCallback(currentPersonaInGame, response); }
             else { console.warn(`API commentary for ${eventType} returned empty response.`); }
        } catch (error) {
            console.error("API commentary failed:", error);
             messageCallback('System', `${currentPersonaInGame === 'Kana' ? 'Commentary failed.' : 'Mrow! Couldn\'t think of anything to say...'} API Error: ${error}`);
        }
    }


    // --- Event Handlers & Logic ---

    /** _handleChoreCheck(choreId, isChecked): Updates chore state, points, history, checks if all done. */
    function _handleChoreCheck(choreId, isChecked) {
        const chore = chores.find(c => c.id === choreId);
        if (!chore) { console.warn(`Chore with ID ${choreId} not found.`); return; }

        // Prevent changing if state is already correct (e.g., double clicks)
        if (chore.completed === isChecked) { console.log("Chore state already matches."); return; }

        console.log(`Chore ${choreId} (${chore.name}) changing to checked: ${isChecked}`);
        const wasCompleted = chore.completed; // Store previous state
        chore.completed = isChecked;
        let pointsChange = 0;
        let historyMsg = "";

        if (isChecked) {
            // Completing a chore
            pointsChange = chore.value;
            currentBalance += pointsChange;
            historyMsg = `Completed '${chore.name}' (+${pointsChange} ${REWARD_EMOJI})`;
            _showCannedCommentary('choreDone', chore.value);
        } else {
            // Unchecking a chore - **ONLY DEDUCT if it WAS completed**
            if (wasCompleted) {
                pointsChange = -chore.value;
                // Prevent balance going below zero unless desired (simple clamp)
                currentBalance = Math.max(0, currentBalance + pointsChange);
                historyMsg = `Unchecked '${chore.name}' (${pointsChange} ${REWARD_EMOJI})`; // Show deduction
                _showCannedCommentary('choreUndone', Math.abs(pointsChange));
            } else {
                // Chore was already incomplete, unchecking does nothing to points
                 historyMsg = `(Unchecked '${chore.name}', no change)`; // Optional history log
                console.log(`Chore '${chore.name}' was already unchecked.`);
            }
        }

        _addHistoryEntry(historyMsg);
        _updateBalanceDisplay();
        _saveState(); // Save after each change

        // Check if all chores are now completed *only if* we just checked one off
        if (isChecked) {
            const allDone = chores.every(c => c.completed);
            if (allDone) {
                console.log("All chores completed!");
                const earnedToday = chores.reduce((sum, c) => sum + c.value, 0);
                _triggerApiCommentary('allChoresDone', { earnedToday: earnedToday });
            }
        }
        _renderChoreList(); // Re-render to update visual state
    }

    /** _handleRedeem(): Confirms, resets balance, adds history, triggers API commentary. */
    function _handleRedeem() { /* ... (No changes needed from previous version) ... */
        if (currentBalance <= 0) { _showCannedCommentary('redeemEmpty'); return; }
         if (confirm(`Redeem ${currentBalance} ${REWARD_EMOJI} (${_formatCurrency(currentBalance * BOW_TO_DOLLAR_RATE)})? Make sure to tell your parent!`)) {
             const redeemedAmount = currentBalance;
             _addHistoryEntry(`Cashed Out ${redeemedAmount} ${REWARD_EMOJI}`);
             currentBalance = 0;
             _updateBalanceDisplay();
             _saveState();
             _triggerApiCommentary('cashOut', { amount: redeemedAmount });
         }
    }

    /** _handleParentModeToggle(): Prompts for PIN, verifies, shows/hides management UI. */
    function _handleParentModeToggle() { /* ... (No changes needed from previous version) ... */
        if (isParentMode) { _hideParentManagementUI(); }
        else {
             if (!parentPinHash) { alert("No Parent PIN set. Accessing controls. Please set a PIN inside."); _showParentManagementUI(); return; }
             const enteredPin = prompt("Enter 4-digit Parent PIN:");
             if (enteredPin === null) return;
             if (_verifyPin(enteredPin)) { _showParentManagementUI(); }
             else { alert("Incorrect PIN!"); }
         }
     }

    /** _handleAddChore(event): Handles form submission, adds chore, saves, rerenders. */
    function _handleAddChore(event) { /* ... (No changes needed from previous version) ... */
        event.preventDefault();
        const nameInput = document.getElementById('add-chore-name');
        const valueInput = document.getElementById('add-chore-value');
        if (!nameInput || !valueInput) return;
        const name = nameInput.value.trim();
        const value = parseInt(valueInput.value, 10);
        if (name && value >= 0) {
             const newChore = { id: _getTimestamp(), name: name, value: value, completed: false };
             chores.push(newChore);
             _addHistoryEntry(`Parent added chore: '${name}' (${value} ${REWARD_EMOJI})`);
             _saveState();
             const listContainer = parentManagementArea?.querySelector('#manage-chore-list');
             if (listContainer) _renderManageChoreList(listContainer);
             nameInput.value = ''; valueInput.value = '';
         } else { alert("Please enter a valid name and non-negative value."); }
     }

    /** _handleDeleteChore(choreId): Confirms, removes chore, saves, rerenders. */
    function _handleDeleteChore(choreId) { /* ... (No changes needed from previous version) ... */
        const choreToDelete = chores.find(c => c.id === choreId);
        if (!choreToDelete) return;
        if (confirm(`Are you sure you want to delete the chore: "${choreToDelete.name}"?`)) {
             chores = chores.filter(c => c.id !== choreId);
             _addHistoryEntry(`Parent deleted chore: '${choreToDelete.name}'`);
             _saveState();
             const listContainer = parentManagementArea?.querySelector('#manage-chore-list');
             if (listContainer) _renderManageChoreList(listContainer);
         }
     }

    /** _handleSetPin(newPin): Hashes and saves a new PIN. */
    function _handleSetPin(newPin) { /* ... (No changes needed from previous version) ... */
        const newHash = _hashPin(newPin);
         if (newHash) {
             parentPinHash = newHash;
             _saveState();
             alert("Parent PIN updated successfully!");
             const setPinButton = parentManagementArea?.querySelector('#parent-pin-set + button');
             if(setPinButton) setPinButton.textContent = 'Change PIN';
         } else { alert("Failed to set PIN."); }
     }

     /** _handleManualBalanceAdjust(amountStr, isAdding): Adjusts balance manually */
     function _handleManualBalanceAdjust(amountStr, isAdding) {
         const amount = parseInt(amountStr, 10);
         if (isNaN(amount) || amount <= 0) {
             alert("Please enter a valid positive amount to adjust.");
             return;
         }

         const change = isAdding ? amount : -amount;
         const sign = isAdding ? '+' : '-';

         // Prevent balance going below zero on subtraction
         if (!isAdding && currentBalance < amount) {
             alert(`Cannot subtract ${amount} ${REWARD_EMOJI}, current balance is only ${currentBalance}.`);
             return;
         }

         currentBalance += change;
         _addHistoryEntry(`Parent Manual Adjust: ${sign}${amount} ${REWARD_EMOJI}`);
         _updateBalanceDisplay();
         _saveState();

         // Optionally trigger API commentary for the adjustment
         _triggerApiCommentary('manualAdjust', { amount: change, newBalance: currentBalance });

         alert(`Balance adjusted by ${sign}${amount} ${REWARD_EMOJI}. New balance: ${currentBalance}`);
         // Clear the input field
         const adjustValueInput = document.getElementById('adjust-value-input');
         if (adjustValueInput) adjustValueInput.value = '';
     }


    // --- Initialization and Public Interface ---

    /** init(): Sets up the module, loads state, creates initial UI. */
    function init(_gameUiContainer, _messageCallback, _apiCaller, userName, persona) {
        console.log("Initializing Chore Helper...");
        gameUiContainer = _gameUiContainer;
        messageCallback = _messageCallback;
        apiCaller = _apiCaller;
        currentUserName = userName || "Kiddo";
        currentPersonaInGame = persona || 'Mika';

        if (!gameUiContainer) {
            console.error("Chore Helper UI container not provided!");
            _clearUI();
            if(gameUiContainer) gameUiContainer.innerHTML = '<p style="color: red; text-align: center;">Error: Chore Helper UI container missing!</p>';
            return;
        }

        _loadState();
        _resetDailyChores(); // Reset before creating UI
        _createMainUI();     // Build the interface
        console.log(`Chore Helper initialized for ${currentUserName} with ${currentPersonaInGame}. Balance: ${currentBalance}`);
    }

    // Public interface - expose only the init function
    return {
        init: init
    };

})();

// --- END OF FILE chores.js ---