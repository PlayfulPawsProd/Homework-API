// --- START OF FILE chores.js ---

// Nyaa~! Mika & Kana's Chore Helper! Making tasks fun! ♡
// (Or at least... tolerable. *Tsk* - Kana)

const ChoreHelper = (() => {
    // --- Settings & Constants ---
    const STORAGE_KEY_CHORES = 'mikaChores_list_v1';
    const STORAGE_KEY_BALANCE = 'mikaChores_balance_v1';
    const STORAGE_KEY_HISTORY = 'mikaChores_history_v1';
    const STORAGE_KEY_PIN_HASH = 'mikaChores_pinHash_v1'; // Store a hashed version!
    const STORAGE_KEY_LAST_DAY = 'mikaChores_lastDay_v1';
    const REWARD_NAME_SINGULAR = 'Bow'; // Singular reward name
    const REWARD_NAME_PLURAL = 'Bows'; // Plural reward name
    const REWARD_EMOJI = '🎀'; // Reward currency emoji
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
    let commentaryElement = null; // For temporary canned messages
    let parentModeButton = null;
    let parentManagementArea = null;
    let addChoreForm = null;
    let historyViewArea = null;
    let statsPiggyBankElement = null; // Direct reference to the <strong> value part in history view
    let statsTotalEarnedElement = null; // Direct reference to the <strong> value part in history view
    let mainChoreViewArea = null; // Container for the main view

    // --- Helper Functions ---

    function _getTimestamp() { return Date.now(); }
    function _getCurrentDateString() { return new Date().toISOString().slice(0, 10); }
    function _formatCurrency(amount) { return `$${(amount).toFixed(2)}`; }
    function _hashPin(pin) { try { return btoa(pin + "mika-salt-v2"); } catch (e) { console.error("Hashing failed:", e); return null; } } // Simple Base64
    function _verifyPin(pin) { if (!parentPinHash) return false; const inputHash = _hashPin(pin); return inputHash === parentPinHash; }

    function _saveState() {
        try {
            localStorage.setItem(STORAGE_KEY_CHORES, JSON.stringify(chores));
            localStorage.setItem(STORAGE_KEY_BALANCE, JSON.stringify(currentBalance));
            const limitedHistory = history.slice(-MAX_HISTORY_ENTRIES);
            localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(limitedHistory));
            if (parentPinHash) localStorage.setItem(STORAGE_KEY_PIN_HASH, parentPinHash);
            else localStorage.removeItem(STORAGE_KEY_PIN_HASH);
            localStorage.setItem(STORAGE_KEY_LAST_DAY, lastDayReset || '');
        } catch (e) { console.error("Failed to save chore state:", e); }
    }

    function _loadState() {
        try {
            const storedChores = localStorage.getItem(STORAGE_KEY_CHORES);
            const storedBalance = localStorage.getItem(STORAGE_KEY_BALANCE);
            const storedHistory = localStorage.getItem(STORAGE_KEY_HISTORY);
            const storedPinHash = localStorage.getItem(STORAGE_KEY_PIN_HASH);
            const storedLastDay = localStorage.getItem(STORAGE_KEY_LAST_DAY);

            chores = storedChores ? JSON.parse(storedChores) : [];
            chores = chores.map(c => ({ ...c, completed: c.completed || false, value: Number(c.value) || 0 }));
            currentBalance = storedBalance ? parseFloat(storedBalance) : 0;
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
            localStorage.setItem(STORAGE_KEY_LAST_DAY, lastDayReset);
            if (choresWereReset) {
                _saveState();
            }
        }
    }

    function _updateBalanceDisplay() {
        const monetaryValue = currentBalance * BOW_TO_DOLLAR_RATE;
        const balanceText = `${currentBalance} ${REWARD_EMOJI} (${_formatCurrency(monetaryValue)})`;
        if (balanceDisplayElement) {
            balanceDisplayElement.textContent = `Balance: ${balanceText}`;
            balanceDisplayElement.title = `Current ${REWARD_NAME_PLURAL}`;
        }
         const piggyBankValueEl = document.getElementById('piggy-bank-value');
         if (piggyBankValueEl && historyViewArea && historyViewArea.style.display !== 'none') {
             piggyBankValueEl.textContent = balanceText;
         }
    }

    function _addHistoryEntry(message) {
        if (!message) return;
        const newEntry = { timestamp: _getTimestamp(), message };
        history.push(newEntry);
        if (history.length > MAX_HISTORY_ENTRIES) {
            history = history.slice(-MAX_HISTORY_ENTRIES);
        }
        _saveState();
        const historyListContainer = document.getElementById('history-list-container');
        if (historyListContainer && historyViewArea && historyViewArea.style.display !== 'none') {
            _renderHistoryList(historyListContainer);
            _updateTotalEarnedDisplay(); // Update total earned when history changes
        }
    }

    /** **FIXED** _calculateTotalEarned(): Calculates total ever earned from history by summing positive adjustments. */
    function _calculateTotalEarned() {
         let totalEarnedBows = 0;
         // Regex specifically for positive additions like (+10 🎀)
         const addRegex = /\(\+(\d+)\s*🎀\)/g; // Find all (+Number Emoji) patterns

         // console.log("Calculating Total Earned from history:", history); // Keep for debugging if needed

         history.forEach((entry, index) => {
             // Ensure the entry and message exist and are strings
             if (!entry || typeof entry.message !== 'string') {
                 console.warn(`Skipping invalid history entry at index ${index} during total calculation.`);
                 return; // Skip this entry
             }

             let match;
             // IMPORTANT: Reset lastIndex for global regex before each use on a new string
             addRegex.lastIndex = 0;

             // Find all positive adjustments within this message string
             while ((match = addRegex.exec(entry.message)) !== null) {
                 const earnedAmount = parseInt(match[1], 10);
                 if (!isNaN(earnedAmount)) {
                     totalEarnedBows += earnedAmount;
                     // console.log(`  Found +${earnedAmount} in entry: "${entry.message}"`); // More detailed debugging
                 }
             }
         });
         // console.log("Calculated Total Earned:", totalEarnedBows); // Keep for debugging if needed
         return totalEarnedBows;
     }


    // --- UI Rendering Functions ---

    function _clearUI() {
        if(gameUiContainer) gameUiContainer.innerHTML = '';
        mainChoreViewArea = choreListElement = balanceDisplayElement = commentaryElement = parentModeButton = null;
        parentManagementArea = addChoreForm = historyViewArea = statsPiggyBankElement = statsTotalEarnedElement = null;
        isParentMode = false;
    }

    function _createMainUI() {
        _clearUI();
        mainChoreViewArea = document.createElement('div');
        mainChoreViewArea.style.cssText = `width: 100%; height: 100%; display: flex; flex-direction: column; padding: 10px; box-sizing: border-box;`;

        const headerArea = document.createElement('div'); headerArea.style.cssText = `display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-shrink: 0; flex-wrap: wrap;`;
        balanceDisplayElement = document.createElement('span'); balanceDisplayElement.style.cssText = `font-weight: bold; font-size: 1.1em; margin-right: 10px;`; headerArea.appendChild(balanceDisplayElement);
        const buttonGroup = document.createElement('div'); buttonGroup.style.cssText = `display: flex; gap: 5px;`;
        const redeemButton = document.createElement('button'); redeemButton.textContent = `Redeem ${REWARD_EMOJI}!`; redeemButton.className = 'rps-choice-button'; redeemButton.title = `Ask Parent to redeem your ${REWARD_NAME_PLURAL}!`; redeemButton.onclick = _handleRedeem; buttonGroup.appendChild(redeemButton);
        const historyButton = document.createElement('button'); historyButton.textContent = 'History 📜'; historyButton.className = 'rps-choice-button secondary'; historyButton.onclick = _createHistoryUI; buttonGroup.appendChild(historyButton);
        parentModeButton = document.createElement('button'); parentModeButton.textContent = '⚙️ Parent'; parentModeButton.className = 'rps-choice-button secondary'; parentModeButton.onclick = _handleParentModeToggle; buttonGroup.appendChild(parentModeButton);
        headerArea.appendChild(buttonGroup); mainChoreViewArea.appendChild(headerArea);

        choreListElement = document.createElement('div'); choreListElement.id = 'chore-list'; choreListElement.style.cssText = `flex-grow: 1; overflow-y: auto; border: 1px solid var(--game-cell-border); border-radius: 5px; padding: 10px; margin-bottom: 10px;`; mainChoreViewArea.appendChild(choreListElement);

        commentaryElement = document.createElement('div'); commentaryElement.id = 'chore-commentary'; commentaryElement.style.cssText = `min-height: 1.5em; height: 1.5em; text-align: center; font-style: italic; font-size: 0.9em; color: var(--mika-message-name); flex-shrink: 0; margin-top: 5px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; opacity: 1; transition: opacity 0.5s ease-out;`; commentaryElement.textContent = ''; mainChoreViewArea.appendChild(commentaryElement);

        _createParentManagementUI(); // Create hidden elements
        gameUiContainer.appendChild(mainChoreViewArea);
        _updateBalanceDisplay();
        _renderChoreList();
    }

    function _renderChoreList() {
        if (!choreListElement) return;
        choreListElement.innerHTML = '';
        if (chores.length === 0) { choreListElement.innerHTML = '<p style="text-align: center; padding-top: 20px; color: var(--system-message-text);"><i>No chores added yet! Ask a parent to add some using the ⚙️ button.</i></p>'; return; }

        chores.forEach(chore => {
            const choreDiv = document.createElement('div'); choreDiv.style.cssText = `display: flex; align-items: center; padding: 8px 5px; border-bottom: 1px dashed var(--input-border); opacity: ${chore.completed ? 0.6 : 1}; transition: opacity 0.3s ease;`;
            const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = chore.completed; checkbox.id = `chore-${chore.id}`; checkbox.dataset.choreId = chore.id; checkbox.style.cssText = `margin-right: 10px; transform: scale(1.3); cursor: pointer;`; checkbox.onchange = (e) => _handleChoreCheck(chore.id, e.target.checked);
            const label = document.createElement('label'); label.htmlFor = `chore-${chore.id}`; label.textContent = `${chore.name} (+${chore.value} ${REWARD_EMOJI})`; label.style.cssText = `flex-grow: 1; text-decoration: ${chore.completed ? 'line-through' : 'none'}; cursor: pointer;`; label.onclick = () => { checkbox.checked = !checkbox.checked; checkbox.dispatchEvent(new Event('change')); };
            choreDiv.appendChild(checkbox); choreDiv.appendChild(label);
            choreListElement.appendChild(choreDiv);
        });
     }

    function _createParentManagementUI() {
        parentManagementArea = document.createElement('div'); parentManagementArea.id = 'parent-management-area'; parentManagementArea.style.cssText = `display: none; padding: 15px; border: 2px solid var(--popup-border); border-radius: 8px; margin-top: 10px; background-color: var(--game-board-bg); max-height: calc(100% - 40px); overflow-y: auto; box-sizing: border-box;`;
        const title = document.createElement('h3'); title.textContent = 'Parent Controls'; title.style.cssText = `text-align: center; margin-top: 0; color: var(--chat-header-text);`; parentManagementArea.appendChild(title);

        // Add Chore Form
        addChoreForm = document.createElement('form'); addChoreForm.style.cssText = `margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid var(--input-border);`; const addTitle = document.createElement('h4'); addTitle.textContent = 'Add New Chore'; addTitle.style.cssText = `margin-bottom: 10px; color: var(--chat-header-text);`; addChoreForm.appendChild(addTitle); const nameLabel = document.createElement('label'); nameLabel.textContent = 'Chore Name: '; const nameInput = document.createElement('input'); nameInput.type = 'text'; nameInput.id = 'add-chore-name'; nameInput.required = true; nameInput.style.cssText = `margin: 5px; padding: 5px; background-color: var(--input-bg); color: var(--text-color); border: 1px solid var(--input-border); border-radius: 4px;`; addChoreForm.appendChild(nameLabel); addChoreForm.appendChild(nameInput); addChoreForm.appendChild(document.createElement('br')); const valueLabel = document.createElement('label'); valueLabel.textContent = `Value (${REWARD_EMOJI}): `; const valueInput = document.createElement('input'); valueInput.type = 'number'; valueInput.id = 'add-chore-value'; valueInput.min = '0'; valueInput.required = true; valueInput.style.cssText = `margin: 5px; padding: 5px; width: 60px; background-color: var(--input-bg); color: var(--text-color); border: 1px solid var(--input-border); border-radius: 4px;`; addChoreForm.appendChild(valueLabel); addChoreForm.appendChild(valueInput); addChoreForm.appendChild(document.createElement('br')); const addButton = document.createElement('button'); addButton.type = 'submit'; addButton.textContent = 'Add Chore'; addButton.className = 'rps-choice-button'; addButton.style.marginTop = '10px'; addChoreForm.appendChild(addButton); addChoreForm.onsubmit = _handleAddChore; parentManagementArea.appendChild(addChoreForm);

        // Bonus Points
        const bonusArea = document.createElement('div'); bonusArea.style.cssText = `margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid var(--input-border);`; const bonusTitle = document.createElement('h4'); bonusTitle.textContent = 'Add Bonus'; bonusTitle.style.cssText = `margin-bottom: 10px; color: var(--chat-header-text);`; bonusArea.appendChild(bonusTitle); const bonusValueLabel = document.createElement('label'); bonusValueLabel.textContent = `Bonus ${REWARD_EMOJI}: `; const bonusValueInput = document.createElement('input'); bonusValueInput.type = 'number'; bonusValueInput.id = 'bonus-value-input'; bonusValueInput.min = '1'; bonusValueInput.style.cssText = `margin: 5px; padding: 5px; width: 60px; background-color: var(--input-bg); color: var(--text-color); border: 1px solid var(--input-border); border-radius: 4px;`; bonusArea.appendChild(bonusValueLabel); bonusArea.appendChild(bonusValueInput); const bonusAddButton = document.createElement('button'); bonusAddButton.textContent = `Add Bonus ${REWARD_EMOJI}`; bonusAddButton.className = 'rps-choice-button'; bonusAddButton.style.marginLeft = '10px'; bonusAddButton.onclick = () => { const amount = parseInt(bonusValueInput.value, 10); if (amount > 0) { currentBalance += amount; _addHistoryEntry(`Bonus Added! (+${amount} ${REWARD_EMOJI})`); _updateBalanceDisplay(); _saveState(); _triggerApiCommentary('bonusAdded', { amount: amount }); bonusValueInput.value = ''; alert(`Added ${amount} ${REWARD_EMOJI} bonus!`); } else { alert("Please enter a valid bonus amount."); } }; bonusArea.appendChild(bonusAddButton); parentManagementArea.appendChild(bonusArea);

        // Manual Balance Adjustment Area
        const adjustArea = document.createElement('div'); adjustArea.style.cssText = `margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid var(--input-border);`; const adjustTitle = document.createElement('h4'); adjustTitle.textContent = 'Manual Balance Adjust'; adjustTitle.style.cssText = `margin-bottom: 10px; color: var(--chat-header-text);`; adjustArea.appendChild(adjustTitle); const adjustValueLabel = document.createElement('label'); adjustValueLabel.textContent = `Amount ${REWARD_EMOJI}: `; const adjustValueInput = document.createElement('input'); adjustValueInput.type = 'number'; adjustValueInput.id = 'adjust-value-input'; adjustValueInput.min = '1'; adjustValueInput.placeholder = 'Amount'; adjustValueInput.style.cssText = `margin: 5px; padding: 5px; width: 60px; background-color: var(--input-bg); color: var(--text-color); border: 1px solid var(--input-border); border-radius: 4px;`; adjustArea.appendChild(adjustValueLabel); adjustArea.appendChild(adjustValueInput); const adjustAddButton = document.createElement('button'); adjustAddButton.textContent = `Add`; adjustAddButton.className = 'rps-choice-button'; adjustAddButton.style.marginLeft = '10px'; adjustAddButton.onclick = () => _handleManualBalanceAdjust(adjustValueInput.value, true); adjustArea.appendChild(adjustAddButton); const adjustSubtractButton = document.createElement('button'); adjustSubtractButton.textContent = `Subtract`; adjustSubtractButton.className = 'rps-choice-button secondary'; adjustSubtractButton.style.marginLeft = '5px'; adjustSubtractButton.onclick = () => _handleManualBalanceAdjust(adjustValueInput.value, false); adjustArea.appendChild(adjustSubtractButton); parentManagementArea.appendChild(adjustArea);

        // Existing Chores List
        const existingTitle = document.createElement('h4'); existingTitle.textContent = 'Manage Existing Chores'; existingTitle.style.cssText = `margin-bottom: 10px; color: var(--chat-header-text);`; parentManagementArea.appendChild(existingTitle); const existingChoresList = document.createElement('div'); existingChoresList.id = 'manage-chore-list'; parentManagementArea.appendChild(existingChoresList);
        _renderManageChoreList(existingChoresList);

        // PIN Management
        const pinArea = document.createElement('div'); pinArea.style.cssText = `margin-top: 20px; padding-top: 15px; border-top: 1px solid var(--input-border);`; const pinTitle = document.createElement('h4'); pinTitle.textContent = 'Set/Change Parent PIN'; pinTitle.style.cssText = `margin-bottom: 10px; color: var(--chat-header-text);`; pinArea.appendChild(pinTitle); const pinInput = document.createElement('input'); pinInput.type = 'password'; pinInput.id = 'parent-pin-set'; pinInput.placeholder = 'Enter 4-digit PIN'; pinInput.maxLength = 4; pinInput.pattern = "\\d{4}"; pinInput.autocomplete="new-password"; pinInput.style.cssText = `margin-right: 10px; padding: 5px; background-color: var(--input-bg); color: var(--text-color); border: 1px solid var(--input-border); border-radius: 4px;`; pinArea.appendChild(pinInput); const setPinButton = document.createElement('button'); setPinButton.textContent = parentPinHash ? 'Change PIN' : 'Set PIN'; setPinButton.className = 'rps-choice-button secondary'; setPinButton.onclick = () => { const newPin = pinInput.value; if (newPin && /^\d{4}$/.test(newPin)) { _handleSetPin(newPin); pinInput.value = ''; setPinButton.textContent = 'Change PIN'; } else { alert("Please enter a valid 4-digit PIN."); } }; pinArea.appendChild(setPinButton); parentManagementArea.appendChild(pinArea);

        // Close Button
        const closeButton = document.createElement('button'); closeButton.textContent = 'Close Parent Controls'; closeButton.className = 'rps-choice-button secondary'; closeButton.style.cssText = `margin-top: 20px; display: block; margin-left: auto; margin-right: auto;`; closeButton.onclick = _hideParentManagementUI; parentManagementArea.appendChild(closeButton);
    }

    function _renderManageChoreList(container) { if (!container) container = document.getElementById('manage-chore-list'); if (!container) return; container.innerHTML = ''; if (chores.length === 0) { container.textContent = 'No chores to manage yet.'; return; } chores.forEach(chore => { const itemDiv = document.createElement('div'); itemDiv.style.cssText = `display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px solid var(--input-border);`; const choreInfo = document.createElement('span'); choreInfo.textContent = `${chore.name} (${chore.value} ${REWARD_EMOJI})`; choreInfo.style.marginRight = '10px'; const deleteButton = document.createElement('button'); deleteButton.textContent = 'Delete'; deleteButton.className = 'rps-choice-button secondary'; deleteButton.style.cssText = `font-size: 0.8em; padding: 3px 6px; margin-left: 10px;`; deleteButton.onclick = () => _handleDeleteChore(chore.id); itemDiv.appendChild(choreInfo); itemDiv.appendChild(deleteButton); container.appendChild(itemDiv); }); }
    function _showParentManagementUI() { if (!mainChoreViewArea || !parentManagementArea) return; mainChoreViewArea.style.display = 'none'; const listContainer = parentManagementArea.querySelector('#manage-chore-list'); if(listContainer) _renderManageChoreList(listContainer); gameUiContainer.appendChild(parentManagementArea); parentManagementArea.style.display = 'block'; isParentMode = true; console.log("Parent mode entered."); }
    function _hideParentManagementUI() { if (!mainChoreViewArea || !parentManagementArea) return; if(parentManagementArea.parentNode === gameUiContainer) { gameUiContainer.removeChild(parentManagementArea); } parentManagementArea.style.display = 'none'; mainChoreViewArea.style.display = 'flex'; isParentMode = false; console.log("Parent mode exited."); }

    function _createHistoryUI() {
        _clearUI();
        historyViewArea = document.createElement('div'); historyViewArea.id = 'chore-history-view'; historyViewArea.style.cssText = `width: 100%; height: 100%; display: flex; flex-direction: column; padding: 10px; box-sizing: border-box;`;
        const title = document.createElement('h3'); title.textContent = 'Chore History & Stats'; title.style.cssText = `text-align: center; flex-shrink: 0; color: var(--chat-header-text); margin-bottom: 10px;`; historyViewArea.appendChild(title);
        const backButton = document.createElement('button'); backButton.textContent = '← Back to Chores'; backButton.className = 'rps-choice-button secondary'; backButton.style.cssText = `margin-bottom: 10px; align-self: center; flex-shrink: 0;`; backButton.onclick = _createMainUI; historyViewArea.appendChild(backButton);
        const statsArea = document.createElement('div'); statsArea.style.cssText = `margin-bottom: 10px; padding: 10px; border: 1px solid var(--input-border); border-radius: 5px; text-align: center; flex-shrink: 0;`;
        const piggyBankP = document.createElement('p'); piggyBankP.style.margin = '5px 0'; piggyBankP.innerHTML = `Current Balance (Piggy Bank): <strong id="piggy-bank-value">---</strong>`; statsArea.appendChild(piggyBankP);
        const totalEarnedP = document.createElement('p'); totalEarnedP.style.margin = '5px 0'; totalEarnedP.innerHTML = `Total Earned Ever: <strong id="total-earned-value">---</strong>`; statsArea.appendChild(totalEarnedP);
        historyViewArea.appendChild(statsArea);
        const historyListContainer = document.createElement('div'); historyListContainer.id = 'history-list-container'; historyListContainer.style.cssText = `flex-grow: 1; overflow-y: auto; border: 1px solid var(--input-border); border-radius: 5px; padding: 10px; background-color: rgba(0,0,0,0.1);`; historyViewArea.appendChild(historyListContainer);
        gameUiContainer.appendChild(historyViewArea);
        statsPiggyBankElement = document.getElementById('piggy-bank-value'); // Assign reference after creation
        statsTotalEarnedElement = document.getElementById('total-earned-value'); // Assign reference after creation
        _updateBalanceDisplay();
        _updateTotalEarnedDisplay();
        _renderHistoryList(historyListContainer);
     }

     function _updateTotalEarnedDisplay() {
         if (statsTotalEarnedElement) { // Check if element exists
             const totalBows = _calculateTotalEarned();
             const totalDollars = totalBows * BOW_TO_DOLLAR_RATE;
             statsTotalEarnedElement.textContent = `${totalBows} ${REWARD_EMOJI} (${_formatCurrency(totalDollars)})`;
             statsTotalEarnedElement.title = `Total ${REWARD_NAME_PLURAL} earned over time.`;
         }
     }

    function _renderHistoryList(container) {
        if (!container) { console.error("History list container not found!"); return; }
        container.innerHTML = '';
        console.log(`Rendering history list. Found ${history.length} entries.`);

        if (history.length === 0) { container.innerHTML = '<p style="text-align: center; color: var(--system-message-text);"><i>No chore history yet! Complete some chores!</i></p>'; return; }

        [...history].reverse().forEach((entry, index) => {
            if (!entry || typeof entry !== 'object' || !entry.timestamp || typeof entry.message !== 'string') { console.warn(`Skipping invalid history entry at index ${index}:`, entry); return; }
            const entryDiv = document.createElement('div'); entryDiv.style.cssText = `padding: 4px 0; font-size: 0.9em; border-bottom: 1px dotted var(--input-border); display: flex; justify-content: space-between; align-items: center;`;
            const messageSpan = document.createElement('span'); messageSpan.textContent = entry.message; messageSpan.style.cssText = `flex-grow: 1; margin-right: 10px; word-break: break-word;`;
            const dateSpan = document.createElement('span'); dateSpan.style.cssText = `color: var(--system-message-text); font-size: 0.8em; white-space: nowrap;`;
            try { dateSpan.textContent = new Date(entry.timestamp).toLocaleString(); } catch (e) { dateSpan.textContent = 'Invalid Date'; console.error("Error formatting history date:", e, "Timestamp:", entry.timestamp); }
            entryDiv.appendChild(messageSpan); entryDiv.appendChild(dateSpan); container.appendChild(entryDiv);
        });
        container.scrollTop = 0;
    }


    // --- Commentary Functions ---

    function _showCannedCommentary(type, value = 0) {
        if (!commentaryElement) { console.warn("Commentary element not found."); return; }
        let msg = "";
        const rewardName = (Math.abs(value) === 1) ? REWARD_NAME_SINGULAR : REWARD_NAME_PLURAL;
        const absValue = Math.abs(value);
        const cannedResponses = {
             Mika: { choreDone: [`+${absValue} ${rewardName}! Keep going! (*^▽^*)`, `Nice one! +${absValue} ${rewardName}!`, `Got it! +${absValue} ${rewardName} ☆`], choreUndone: [`-${absValue} ${rewardName} undone... (・_・;)`, `Oops! -${absValue} ${rewardName}.`, `Undid that one! (-${absValue} ${rewardName})`], randomDaily: [`Keep up the great work, ${currentUserName}! (๑˃ᴗ˂)ﻭ`, `Don't forget your chores today~ Hehe! (ΦωΦ)`, `Making Master proud! ♡`], redeemEmpty: [`Your redeemable balance is empty, silly! (⌒_⌒;) Do some chores!`], },
             Kana: { choreDone: [`+${absValue} ${REWARD_NAME_PLURAL}.`, `Done. +${absValue} ${REWARD_NAME_PLURAL}.`], choreUndone: [`-${absValue} ${REWARD_NAME_PLURAL}. Undone.`, `Took back ${absValue} ${REWARD_NAME_PLURAL}.`, `Undid chore. (-${absValue} ${REWARD_NAME_PLURAL})`], randomDaily: [`Are those chores done yet?`, `Still waiting... (¬_¬)`, `Just get it over with.`], redeemEmpty: [`Empty. Do something first.`], }
        };
        const personaMsgs = cannedResponses[currentPersonaInGame] || cannedResponses.Mika;
        if (personaMsgs[type] && personaMsgs[type].length > 0) {
            const randomIndex = Math.floor(Math.random() * personaMsgs[type].length);
            msg = personaMsgs[type][randomIndex];
            if (commentaryElement.fadeTimeout) clearTimeout(commentaryElement.fadeTimeout);
            if (commentaryElement.clearTimeout) clearTimeout(commentaryElement.clearTimeout);
            commentaryElement.textContent = `${msg} ${type.startsWith('chore') ? REWARD_EMOJI : ''}`;
            commentaryElement.title = msg; commentaryElement.style.opacity = '1'; commentaryElement.style.transition = '';
            commentaryElement.fadeTimeout = setTimeout(() => { if(commentaryElement) { commentaryElement.style.transition = 'opacity 0.5s ease-out'; commentaryElement.style.opacity = '0'; commentaryElement.clearTimeout = setTimeout(() => { if(commentaryElement) { commentaryElement.textContent = ''; commentaryElement.title = ''; commentaryElement.style.opacity = '1'; commentaryElement.style.transition = ''; } }, 500); } }, 2500);
        }
     }

    async function _triggerApiCommentary(eventType, details = {}) {
         if (!apiCaller || !messageCallback) { console.warn("API Caller or Message Callback not available."); return; }
        let prompt = "";
        const kidName = currentUserName; const reward = REWARD_NAME_PLURAL; const emoji = REWARD_EMOJI;
        const baseRoleMika = `[ROLE: You are Mika, the cheerful catgirl helper. ${kidName} is using the chore app.]`;
        const baseRoleKana = `[ROLE: You are Kana, the sarcastic catgirl helper. ${kidName} is using the chore app.]`;
        const baseRole = (currentPersonaInGame === 'Mika') ? baseRoleMika : baseRoleKana;
        let monetaryValueStr = '';
        if (details.amount !== undefined && eventType !== 'allChoresDone') monetaryValueStr = ` (${_formatCurrency(details.amount * BOW_TO_DOLLAR_RATE)})`;
        if (details.newBalance !== undefined) monetaryValueStr = ` (${_formatCurrency(details.newBalance * BOW_TO_DOLLAR_RATE)})`;

        switch (eventType) {
            case 'allChoresDone': prompt = (currentPersonaInGame === 'Mika') ? `${baseRole} ${kidName} just finished ALL chores for the day, earning ${details.earnedToday} ${reward}! Cheer them on enthusiastically! Be super proud! Use cute noises/emojis like (*^▽^*), (≧∀≦), (ﾉ´ヮ´)ﾉ*:･ﾟ✧, (๑˃ᴗ˂)ﻭ, (ΦωΦ), (=^･ω･^=), *purrrr*, *giggle*, Nyaa~! ☆(≧∀≦*)ﾉ` : `${baseRole} ${kidName} finally finished all chores, earning ${details.earnedToday} ${reward}. Give a sarcastic but maybe slightly impressed acknowledgement. Keep it short and dry. Use emojis like (¬_¬), *Tsk*, *Sigh*, (￣_￣), 😼.`; break;
            case 'bonusAdded': prompt = (currentPersonaInGame === 'Mika') ? `${baseRole} The parent just gave ${kidName} a bonus of ${details.amount} ${reward}! React with surprise and excitement! Tell them they must be doing super well! Use cute noises/emojis! Yay! (ﾉ´ヮ´)ﾉ*:･ﾟ✧` : `${baseRole} The parent just gave ${kidName} a bonus of ${details.amount} ${reward}. Make a sarcastic remark about it. Maybe imply they bribed the parent or that it won't happen again. *Tsk*.`; break;
            case 'cashOut': prompt = (currentPersonaInGame === 'Mika') ? `${baseRole} ${kidName} is ready to cash out ${details.amount} ${reward}${monetaryValueStr}! Congratulate them excitedly! Tell them to go show their parent! So exciting! Yay! Use cute noises/emojis! ♡＼(￣▽￣)／♡` : `${baseRole} ${kidName} is cashing out ${details.amount} ${reward}${monetaryValueStr}. Make a dry comment about them finally claiming their reward or asking what they'll waste it on. Keep it brief.`; break;
            case 'manualAdjust': const action = details.amount > 0 ? 'added' : 'subtracted'; const absAmount = Math.abs(details.amount); prompt = (currentPersonaInGame === 'Mika') ? `${baseRole} The parent manually ${action} ${absAmount} ${reward} ${action === 'added' ? 'to' : 'from'} ${kidName}'s balance! React appropriately (happy if added, maybe concerned if subtracted?). Current balance is ${details.newBalance} ${reward}${monetaryValueStr}.` : `${baseRole} The parent manually adjusted ${kidName}'s balance by ${details.amount > 0 ? '+' : ''}${details.amount} ${reward}. Make a dry or suspicious comment about why. Current balance is ${details.newBalance} ${reward}${monetaryValueStr}.`; break;
            default: console.warn("Unknown API commentary event:", eventType); return;
        }
        console.log(`Triggering API commentary for ${eventType}`);
        try { const response = await apiCaller(prompt, []); if (response) { messageCallback(currentPersonaInGame, response); } else { console.warn(`API commentary for ${eventType} returned empty response.`); } }
        catch (error) { console.error("API commentary failed:", error); messageCallback('System', `${currentPersonaInGame === 'Kana' ? 'Commentary failed.' : 'Mrow! Couldn\'t think of anything to say...'} API Error: ${error}`); }
     }


    // --- Event Handlers & Logic ---

    function _handleChoreCheck(choreId, isChecked) {
        const chore = chores.find(c => c.id === choreId);
        if (!chore || chore.completed === isChecked) return;
        console.log(`Chore ${choreId} (${chore.name}) -> checked: ${isChecked}`);
        const wasCompleted = chore.completed; chore.completed = isChecked; let pointsChange = 0; let historyMsg = "";
        const rewardName = (chore.value === 1) ? REWARD_NAME_SINGULAR : REWARD_NAME_PLURAL;
        if (isChecked) { pointsChange = chore.value; currentBalance += pointsChange; historyMsg = `Completed '${chore.name}' (+${pointsChange} ${REWARD_EMOJI})`; _showCannedCommentary('choreDone', chore.value); }
        else { if (wasCompleted) { pointsChange = -chore.value; currentBalance = Math.max(0, currentBalance + pointsChange); historyMsg = `Unchecked '${chore.name}' (${pointsChange} ${REWARD_EMOJI})`; _showCannedCommentary('choreUndone', Math.abs(pointsChange)); } else { historyMsg = `(Marked '${chore.name}' as not done)`; } }
        _addHistoryEntry(historyMsg); _updateBalanceDisplay(); _saveState();
        if (isChecked) { const allDone = chores.every(c => c.completed); if (allDone) { console.log("All chores completed!"); const earnedToday = chores.reduce((sum, c) => c.completed ? sum + c.value : sum, 0); _triggerApiCommentary('allChoresDone', { earnedToday: earnedToday }); } }
        _renderChoreList();
    }

    function _handleRedeem() {
        let earnedToday = 0; chores.forEach(chore => { if (chore.completed) { earnedToday += chore.value; } });
        const redeemableBalance = Math.max(0, currentBalance - earnedToday);
        console.log(`Redeem attempt: Total=${currentBalance}, EarnedToday=${earnedToday}, Redeemable=${redeemableBalance}`);
        if (redeemableBalance <= 0) { const msg = currentBalance > 0 ? `You only have points earned today (${currentBalance} ${REWARD_EMOJI})! Redeem tomorrow!` : `Your redeemable balance is empty! (⌒_⌒;)`; alert(msg); return; }
        const monetaryValue = redeemableBalance * BOW_TO_DOLLAR_RATE;
        if (confirm(`Redeem ${redeemableBalance} ${REWARD_EMOJI} (${_formatCurrency(monetaryValue)})? (Points earned today will remain). Make sure to tell your parent!`)) {
            const redeemedAmount = redeemableBalance; _addHistoryEntry(`Cashed Out ${redeemedAmount} ${REWARD_EMOJI} (${_formatCurrency(monetaryValue)})`);
            currentBalance -= redeemedAmount; currentBalance = Math.max(0, currentBalance);
            _updateBalanceDisplay(); _saveState(); _triggerApiCommentary('cashOut', { amount: redeemedAmount });
        }
    }

    function _handleParentModeToggle() { if (isParentMode) { _hideParentManagementUI(); } else { if (!parentPinHash) { alert("No Parent PIN set. Accessing controls. Please set a PIN inside."); _showParentManagementUI(); return; } const enteredPin = prompt("Enter 4-digit Parent PIN:"); if (enteredPin === null) return; if (_verifyPin(enteredPin)) { _showParentManagementUI(); } else { alert("Incorrect PIN!"); } } }
    function _handleAddChore(event) { event.preventDefault(); const nameInput = document.getElementById('add-chore-name'); const valueInput = document.getElementById('add-chore-value'); if (!nameInput || !valueInput) return; const name = nameInput.value.trim(); const value = parseInt(valueInput.value, 10); if (name && value >= 0) { const newChore = { id: _getTimestamp(), name: name, value: value, completed: false }; chores.push(newChore); _addHistoryEntry(`Parent added chore: '${name}' (+${value} ${REWARD_EMOJI})`); _saveState(); const listContainer = parentManagementArea?.querySelector('#manage-chore-list'); if (listContainer) _renderManageChoreList(listContainer); nameInput.value = ''; valueInput.value = ''; } else { alert("Please enter a valid name and non-negative value."); } }
    function _handleDeleteChore(choreId) { const choreToDelete = chores.find(c => c.id === choreId); if (!choreToDelete) return; if (confirm(`Are you sure you want to delete the chore: "${choreToDelete.name}"?`)) { chores = chores.filter(c => c.id !== choreId); _addHistoryEntry(`Parent deleted chore: '${choreToDelete.name}'`); _saveState(); const listContainer = parentManagementArea?.querySelector('#manage-chore-list'); if (listContainer) _renderManageChoreList(listContainer); } }
    function _handleSetPin(newPin) { const newHash = _hashPin(newPin); if (newHash) { parentPinHash = newHash; _saveState(); alert("Parent PIN updated successfully!"); const setPinButton = parentManagementArea?.querySelector('#parent-pin-set + button'); if(setPinButton) setPinButton.textContent = 'Change PIN'; } else { alert("Failed to set PIN."); } }

    // **FIXED** Use correct history format for calculation
    function _handleManualBalanceAdjust(amountStr, isAdding) {
        const amount = parseInt(amountStr, 10);
        if (isNaN(amount) || amount <= 0) { alert("Please enter a valid positive amount to adjust."); return; }
        const change = isAdding ? amount : -amount;
        const sign = isAdding ? '+' : '-';
        if (!isAdding && currentBalance < amount) { alert(`Cannot subtract ${amount} ${REWARD_EMOJI}, current balance is only ${currentBalance}.`); return; }
        currentBalance += change;
        // **FIX:** Use parentheses in history message
        _addHistoryEntry(`Parent Manual Adjust: (${sign}${amount} ${REWARD_EMOJI})`);
        _updateBalanceDisplay();
        _saveState();
        _triggerApiCommentary('manualAdjust', { amount: change, newBalance: currentBalance });
        alert(`Balance adjusted by ${sign}${amount} ${REWARD_EMOJI}. New balance: ${currentBalance}`);
        const adjustValueInput = document.getElementById('adjust-value-input');
        if (adjustValueInput) adjustValueInput.value = '';
    }


    // --- Initialization and Public Interface ---

    function init(_gameUiContainer, _messageCallback, _apiCaller, userName, persona) {
        console.log("Initializing Chore Helper...");
        gameUiContainer = _gameUiContainer;
        messageCallback = _messageCallback;
        apiCaller = _apiCaller;
        currentUserName = userName || "Kiddo";
        currentPersonaInGame = persona || 'Mika';
        if (!gameUiContainer) { console.error("Chore Helper UI container not provided!"); _clearUI(); if(gameUiContainer) gameUiContainer.innerHTML = '<p style="color: red; text-align: center;">Error: Chore Helper UI container missing!</p>'; return; }
        _loadState();
        _resetDailyChores();
        _createMainUI();
        console.log(`Chore Helper initialized for ${currentUserName} with ${currentPersonaInGame}. Balance: ${currentBalance}`);
    }

    return { init: init };
})();

// --- END OF FILE chores.js ---