// --- START OF FILE diary.js ---

// Nyaa~! Mika's Super Secret Diary! Tell me everything! ♡ (Or Kana, if you *must*.)
// ** UPDATED with Persona Switching & Role Instructions **

const MikaDiary = (() => {
    // --- Settings ---
    const MAX_SUMMARY_MESSAGES = 7;
    const MAX_SUMMARY_LENGTH_CHARS = 600;
    const DIARY_CHAT_HISTORY_LENGTH = 10; // How many turns of conversation context to send to API for chat
    const STORAGE_KEY = 'mikaDiaryEntries_v1';

    // --- State ---
    let gameUiContainer = null;
    let messageCallback = null; // For system messages outside diary UI
    let apiCaller = null; // Function to call API (expects prompt, [history]) -> Promise<string>
    let currentUserName = "User"; // Updated via init
    let currentPersonaInGame = 'Mika'; // Store current persona
    let diaryChatHistory = [];     // { role: 'user'/'model', text: string } - Internal history for API context
    let stagedMessages = [];       // { id: string, text: string, sender: string } - Messages selected by user
    let diaryEntries = [];         // { timestamp: number, summary: string, persona: string } - Saved summaries
    let isAssistantResponding = false; // Prevent multiple simultaneous API calls

    // --- DOM Element References ---
    let topNotesArea = null;
    let diaryChatLog = null;
    let diaryInput = null;
    let diarySendButton = null;
    let addToDiaryButton = null;
    let viewEntriesButton = null;
    let entriesViewArea = null;
    let diaryChatViewArea = null;
    let assistantThinkingIndicator = null;

    // --- Helper Functions ---
    function _sendMessageToLog(text, sender = 'System') {
        if (messageCallback) {
            messageCallback(sender, text);
        } else {
            console.log(`Diary SysMsg (${sender}):`, text);
        }
    }

    function _loadDiaryEntries() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                diaryEntries = JSON.parse(stored);
                diaryEntries = diaryEntries.map(entry => ({ ...entry, persona: entry.persona || 'Mika' })); // Add persona if missing
                console.log(`Loaded ${diaryEntries.length} diary entries.`);
            } else {
                diaryEntries = []; console.log("No previous diary entries found.");
            }
        } catch (e) {
            console.error("Failed to load or parse diary entries:", e);
            diaryEntries = []; localStorage.removeItem(STORAGE_KEY);
            _sendMessageToLog("Mrow! Had trouble reading our old diary entries... starting fresh!", "System");
        }
    }

    function _saveDiaryEntries() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(diaryEntries));
            console.log(`Saved ${diaryEntries.length} diary entries.`);
        } catch (e) {
            console.error("Failed to save diary entries:", e);
            _sendMessageToLog("Meeeow! Couldn't save our newest diary entry... is storage full?", "System");
        }
    }

    // --- Staging Area Logic --- (Unchanged)
    function _isMessageStaged(messageId) { /* ... */ return stagedMessages.some(msg => msg.id === messageId); }
    function _addMessageToStaging(messageId, messageText, senderName) { /* ... */ if (_isMessageStaged(messageId)) return; const messageElement = document.getElementById(messageId); const heartButton = messageElement?.querySelector('.diary-heart-button'); stagedMessages.push({ id: messageId, text: `(${senderName}) ${messageText}`, sender: senderName }); if (heartButton) { heartButton.classList.add('active'); heartButton.textContent = '♥'; } _renderStagedMessages(); _updateAddToDiaryButtonState(); console.log(`Staged message: ${messageId}`); }
    function _removeMessageFromStaging(messageId) { /* ... */ stagedMessages = stagedMessages.filter(msg => msg.id !== messageId); const messageElement = document.getElementById(messageId); const heartButton = messageElement?.querySelector('.diary-heart-button'); if (heartButton) { heartButton.classList.remove('active'); heartButton.textContent = '♡'; } _renderStagedMessages(); _updateAddToDiaryButtonState(); console.log(`Unstaged message: ${messageId}`); }
    function _renderStagedMessages() { /* ... */ if (!topNotesArea) return; topNotesArea.innerHTML = ''; if (stagedMessages.length === 0) { const emptyMsg = document.createElement('p'); emptyMsg.textContent = `Click ♡ on messages ${currentUserName} and ${currentPersonaInGame} say to add notes here...`; emptyMsg.className = 'diary-notes-empty'; topNotesArea.appendChild(emptyMsg); return; } stagedMessages.forEach(msg => { const noteDiv = document.createElement('div'); noteDiv.className = 'diary-note-item'; const noteText = document.createElement('span'); const displayText = msg.text.length > 60 ? msg.text.substring(0, 57) + '...' : msg.text; noteText.textContent = displayText; noteText.title = msg.text; const removeBtn = document.createElement('button'); removeBtn.textContent = '×'; removeBtn.className = 'diary-note-remove'; removeBtn.title = 'Remove from notes'; removeBtn.onclick = () => _removeMessageFromStaging(msg.id); noteDiv.appendChild(noteText); noteDiv.appendChild(removeBtn); topNotesArea.appendChild(noteDiv); }); }
    function _updateAddToDiaryButtonState() { /* ... */ if (addToDiaryButton) { addToDiaryButton.disabled = stagedMessages.length === 0 || isAssistantResponding; } }


    // --- Diary Entry Saving Logic ---
    // ** UPDATED ** Prepends role instructions for summary generation
    async function saveStagedEntriesToDiary() {
        if (stagedMessages.length === 0) {
             _sendMessageToLog(currentPersonaInGame === 'Kana' ? "Select some notes first." : "No notes selected to save, silly!", currentPersonaInGame);
             return false;
         }
         if (!apiCaller) { _sendMessageToLog("Mrow! Magic connection is missing!", "System"); return false; }
         if (isAssistantResponding) {
             _sendMessageToLog(currentPersonaInGame === 'Kana' ? "Wait." : "Hold on! Let me finish writing first!", currentPersonaInGame);
             return false;
          }

        _sendMessageToLog(currentPersonaInGame === 'Kana' ? "Summarizing..." : "Okay, let me summarize these notes for our diary... ♡", currentPersonaInGame);
        isAssistantResponding = true;
        _updateUIDisabledState();

        // Combine staged messages for context
        let combinedTextForPrompt = ""; let messageCount = 0;
        for (const msg of stagedMessages) { /* ... unchanged combining logic ... */ const prefix = `(${msg.sender}): `; const messageContent = msg.text.substring(msg.text.indexOf(')') + 2); if (messageCount < MAX_SUMMARY_MESSAGES && (combinedTextForPrompt.length + prefix.length + messageContent.length) < MAX_SUMMARY_LENGTH_CHARS) { combinedTextForPrompt += prefix + messageContent + "\n"; messageCount++; } else { break; } }
        combinedTextForPrompt = combinedTextForPrompt.trim();
        if (!combinedTextForPrompt) { /* ... unchanged error handling ... */ _sendMessageToLog("Mrow! Couldn't read the notes!", "System"); isAssistantResponding = false; _updateUIDisabledState(); return false; }

        // --- ROLE INSTRUCTION for Summary ---
        let roleInstruction = "";
        if (currentPersonaInGame === 'Kana') {
            roleInstruction = `[ROLE: You are Kana, writing a secret diary entry about your conversation with ${currentUserName}. Summarize the following key points from your chat into a short (2-4 sentences), dry, perhaps slightly analytical or grudgingly observant diary entry reflecting on what ${currentUserName} said. Maintain your sarcastic/superior tone from the system prompt. Output only the diary entry text.]\n\n`;
        } else { // Mika
            roleInstruction = `[ROLE: You are Mika, writing a secret diary entry about your conversation with ${currentUserName}. Summarize the following key points from your chat into a short (2-4 sentences), cute, personal diary entry. Reflect on what ${currentUserName} said or how they felt, adding your bubbly, friendly, catgirl personality from the system prompt (nyaa~, *giggle*, *purr*). Address ${currentUserName} fondly in your thoughts. Output only the diary entry text.]\n\n`;
        }
        // --- ---

        const prompt = `${roleInstruction}Key points from the conversation:\n\n${combinedTextForPrompt}`;

        try {
            // Pass the prompt with role instruction, no history needed for summary
            const summary = await apiCaller(prompt);
            if (summary && typeof summary === 'string') {
                const newEntry = { timestamp: Date.now(), summary: summary.trim(), persona: currentPersonaInGame };
                diaryEntries.push(newEntry); _saveDiaryEntries();
                const originalMessageIds = stagedMessages.map(m => m.id); stagedMessages = []; _renderStagedMessages();
                originalMessageIds.forEach(id => { /* ... unchanged heart button update ... */ const msgElement = document.getElementById(id); const heartButton = msgElement?.querySelector('.diary-heart-button'); if (heartButton) { heartButton.classList.remove('active'); heartButton.textContent = '♡'; } });
                _sendMessageToLog(currentPersonaInGame === 'Kana' ? `Saved entry for ${currentUserName}.` : `*scribble scribble* Saved to our diary, ${currentUserName}! ♡`, currentPersonaInGame);
            } else {
                _sendMessageToLog(currentPersonaInGame === 'Kana' ? "API gave a useless summary. Not saved." : "Meeeow... The magic box gave me a weird summary... I couldn't save it this time. Try again?", currentPersonaInGame);
            }
        } catch (error) {
            console.error("Error saving diary entry via API:", error);
            _sendMessageToLog(`${currentPersonaInGame === 'Kana' ? 'Error saving entry:' : '*Whimper*... Something went wrong trying to save that diary entry...'} ${error}`, "System");
        } finally {
             isAssistantResponding = false; _updateUIDisabledState();
        }
         return true;
    }

    // --- Diary Chat Logic ---
    // ** UPDATED ** appendDiaryMessage uses currentUserName consistently
    function appendDiaryMessage(sender, text) {
        if (!diaryChatLog) return;
        const messageId = `diary-msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const messageElement = document.createElement('p'); messageElement.id = messageId;

        // Use currentUserName for the user's display name
        const senderName = (sender === 'User') ? currentUserName : currentPersonaInGame; // Mika or Kana

        const sanitizedMessage = DOMPurify.sanitize(text); let displayHTML = "";

        if (sender === 'User') {
            messageElement.className = 'diary-user-message';
            displayHTML = `<strong>${senderName}:</strong> ${sanitizedMessage}`; // Uses currentUserName
        } else { // Assistant message (Mika or Kana)
            messageElement.className = 'diary-mika-message'; // Use 'mika-message' class for styling consistency
            let processedMessage = sanitizedMessage.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
            displayHTML = `<strong>${senderName}:</strong> ${processedMessage}`; // Displays Mika or Kana
        }

        // Add Heart Button (logic unchanged, passes senderName correctly)
        const heartButton = document.createElement('button'); heartButton.className = 'diary-heart-button'; heartButton.textContent = _isMessageStaged(messageId) ? '♥' : '♡'; if (_isMessageStaged(messageId)) heartButton.classList.add('active'); heartButton.title = 'Add to notes for diary entry'; heartButton.onclick = (event) => { event.stopPropagation(); if (_isMessageStaged(messageId)) { _removeMessageFromStaging(messageId); } else { _addMessageToStaging(messageId, text, senderName); } };

        messageElement.innerHTML = displayHTML; messageElement.appendChild(heartButton); diaryChatLog.appendChild(messageElement); diaryChatLog.scrollTop = diaryChatLog.scrollHeight;

        // Add to internal chat history for API context (logic unchanged)
        diaryChatHistory.push({ role: (sender === 'User' ? 'user' : 'model'), text: text });
        if (diaryChatHistory.length > DIARY_CHAT_HISTORY_LENGTH * 2) { diaryChatHistory = diaryChatHistory.slice(-DIARY_CHAT_HISTORY_LENGTH * 2); }
    }

    // ** UPDATED ** Thinking indicator uses currentPersonaInGame
    function _showThinkingIndicator() { /* ... */ if (!assistantThinkingIndicator) { assistantThinkingIndicator = document.createElement('p'); assistantThinkingIndicator.className = 'diary-mika-message typing'; } assistantThinkingIndicator.innerHTML = `<strong>${currentPersonaInGame}:</strong> ${currentPersonaInGame === 'Kana' ? '*Thinking...*' : '*purrrrr... thinking...*'}`; if (diaryChatLog && !diaryChatLog.contains(assistantThinkingIndicator)) { diaryChatLog.appendChild(assistantThinkingIndicator); diaryChatLog.scrollTop = diaryChatLog.scrollHeight; } }
    function _removeThinkingIndicator() { /* ... */ if (assistantThinkingIndicator && diaryChatLog && diaryChatLog.contains(assistantThinkingIndicator)) { diaryChatLog.removeChild(assistantThinkingIndicator); } }

    // ** UPDATED ** UI state uses currentPersonaInGame for placeholders (uses currentUserName)
     function _updateUIDisabledState() {
         const disable = isAssistantResponding;
         if (diaryInput) diaryInput.disabled = disable;
         if (diarySendButton) diarySendButton.disabled = disable;
         if (addToDiaryButton) addToDiaryButton.disabled = disable || stagedMessages.length === 0;
         if (viewEntriesButton) viewEntriesButton.disabled = disable;
         if(diaryInput) {
            diaryInput.placeholder = disable
                ? (currentPersonaInGame === 'Kana' ? 'Wait.' : 'Wait for me to reply...')
                : (currentPersonaInGame === 'Kana' ? `What is it, ${currentUserName}?` : `Tell me your secrets, ${currentUserName}...`); // Use name
         }
     }

    // ** UPDATED ** handleDiarySend prepends role instructions for chat response
    async function handleDiarySend() {
        if (isAssistantResponding || !diaryInput || !diaryInput.value.trim()) return;
        const messageText = diaryInput.value.trim();
        appendDiaryMessage('User', messageText); // Appends with currentUserName
        diaryInput.value = '';
        isAssistantResponding = true;
        _updateUIDisabledState();
        _showThinkingIndicator();

        // Prepare context for API call
        const contextHistory = diaryChatHistory.slice(-DIARY_CHAT_HISTORY_LENGTH); // Get last N turns
        const messagesForApi = contextHistory.map(msg => ({ role: msg.role, parts: [{ text: msg.text }] }));

        // --- ROLE INSTRUCTION for Chat Response ---
        let roleInstruction = "";
        if (currentPersonaInGame === 'Kana') {
             roleInstruction = `[ROLE: You are Kana, talking privately with ${currentUserName} in a secret diary chat. Respond coolly or with dry wit to their last message. Maintain your sarcastic persona from the system prompt. FORGET HOMEWORK HELP. Focus only on the conversation. Keep responses short (1-3 sentences).]\n\n`;
        } else { // Mika
             roleInstruction = `[ROLE: You are Mika, talking privately with your best friend ${currentUserName} in a secret diary chat. Respond empathetically, playfully, or curiously to their last message. Maintain your bubbly, friendly catgirl personality from the system prompt. FORGET HOMEWORK HELP. Focus only on the conversation. Keep responses relatively short (2-3 sentences).]\n\n`;
        }
        // --- ---

        // Prepend role to the user's actual message text for this turn's API call
        const promptWithRole = `${roleInstruction}${messageText}`;

        try {
            // Pass the combined prompt and the history context
            const assistantResponseText = await apiCaller(promptWithRole, messagesForApi);
            if (assistantResponseText && typeof assistantResponseText === 'string') {
                appendDiaryMessage(currentPersonaInGame, assistantResponseText); // Append response with correct persona name
            } else {
                 const fallback = currentPersonaInGame === 'Kana' ? "..." : "*confused meow*";
                 appendDiaryMessage(currentPersonaInGame, fallback);
            }
        } catch (error) {
            console.error("Error getting Mika's diary response:", error);
            appendDiaryMessage(currentPersonaInGame, `${currentPersonaInGame === 'Kana' ? 'Error.' : 'Mrow... My brain is fuzzy...'} (${error})`);
        } finally {
             isAssistantResponding = false; _removeThinkingIndicator(); _updateUIDisabledState(); if(diaryInput) diaryInput.focus();
        }
    }

     // --- Entries View Logic ---
     // ** UPDATED ** Uses currentUserName and persona correctly
     function _renderDiaryEntriesView() {
         if (!entriesViewArea) return;
         entriesViewArea.innerHTML = '';
         const backButton = document.createElement('button'); backButton.textContent = '← Back to Diary Chat'; backButton.className = 'diary-view-back-button rps-choice-button secondary'; backButton.onclick = _showChatView; entriesViewArea.appendChild(backButton);
         const title = document.createElement('h3'); title.textContent = `Our Secret Diary Entries (${currentUserName})`; title.className = 'diary-entries-title'; entriesViewArea.appendChild(title);
         if (diaryEntries.length === 0) {
             const emptyMsg = document.createElement('p');
             emptyMsg.textContent = currentPersonaInGame === 'Kana' ? "No entries. Obviously." : `No secrets saved yet... Tell ${currentPersonaInGame} something, ${currentUserName}!`;
             emptyMsg.className = 'diary-entries-empty'; entriesViewArea.appendChild(emptyMsg); return;
         }
         [...diaryEntries].reverse().forEach(entry => {
             const entryDiv = document.createElement('div'); entryDiv.className = 'diary-entry-item';
             const dateSpan = document.createElement('span'); dateSpan.className = 'diary-entry-date'; const writer = entry.persona || 'Mika'; dateSpan.textContent = `${new Date(entry.timestamp).toLocaleString()} (${writer}'s entry)`;
             const summaryP = document.createElement('p'); let processedSummary = DOMPurify.sanitize(entry.summary).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/(?<!<br>)\n/g, '<br>'); summaryP.innerHTML = processedSummary;
             entryDiv.appendChild(dateSpan); entryDiv.appendChild(summaryP); entriesViewArea.appendChild(entryDiv);
         });
     }
     function _showEntriesView() { /* ... */ if (diaryChatViewArea) diaryChatViewArea.style.display = 'none'; if (entriesViewArea) { _renderDiaryEntriesView(); entriesViewArea.style.display = 'block'; } _sendMessageToLog(currentPersonaInGame === 'Kana' ? `Viewing entries for ${currentUserName}.` : `Looking through our secrets, ${currentUserName}~? ♡`, currentPersonaInGame); }
     function _showChatView() { /* ... */ if (entriesViewArea) entriesViewArea.style.display = 'none'; if (diaryChatViewArea) diaryChatViewArea.style.display = 'flex'; if (diaryInput) diaryInput.focus(); }

    // --- Initialization and Exit ---
    // ** UPDATED ** init accepts persona, sets up UI with currentUserName
    function init(_gameUiContainer, _messageCallback, _apiCaller, userName, persona) {
        gameUiContainer = _gameUiContainer; messageCallback = _messageCallback; apiCaller = _apiCaller;
        currentUserName = userName || "User"; currentPersonaInGame = persona || 'Mika';
        isAssistantResponding = false;

        if (!gameUiContainer) { console.error("Diary Game UI container not provided!"); return; }
        gameUiContainer.innerHTML = ''; _loadDiaryEntries(); diaryChatHistory = []; stagedMessages = [];

        // --- Create Main Layout --- (Structure is fine, relies on classes/ids)
        diaryChatViewArea = document.createElement('div'); diaryChatViewArea.id = 'diary-chat-view'; diaryChatViewArea.style.display = 'flex'; diaryChatViewArea.style.flexDirection = 'column'; diaryChatViewArea.style.height = '100%'; diaryChatViewArea.style.width = '100%';
        topNotesArea = document.createElement('div'); topNotesArea.id = 'diary-top-notes'; topNotesArea.className = 'diary-top-notes-area'; diaryChatViewArea.appendChild(topNotesArea);
        const controlsArea = document.createElement('div'); controlsArea.className = 'diary-controls-area'; addToDiaryButton = document.createElement('button'); addToDiaryButton.id = 'diary-add-button'; addToDiaryButton.textContent = 'Add Notes to Diary ♡'; addToDiaryButton.className = 'rps-choice-button'; viewEntriesButton = document.createElement('button'); viewEntriesButton.id = 'diary-view-entries-button'; viewEntriesButton.textContent = 'View Entries 📖'; viewEntriesButton.className = 'rps-choice-button secondary'; controlsArea.appendChild(addToDiaryButton); controlsArea.appendChild(viewEntriesButton); diaryChatViewArea.appendChild(controlsArea);
        diaryChatLog = document.createElement('div'); diaryChatLog.id = 'diary-chat-log'; diaryChatLog.className = 'diary-chat-log-area'; diaryChatViewArea.appendChild(diaryChatLog);
        const diaryInputArea = document.createElement('div'); diaryInputArea.id = 'diary-input-area'; diaryInputArea.className = 'diary-input-area'; diaryInput = document.createElement('input'); diaryInput.type = 'text'; diaryInput.id = 'diary-chat-input'; diaryInput.className = 'diary-chat-input'; diarySendButton = document.createElement('button'); diarySendButton.id = 'diary-send-button'; diarySendButton.textContent = 'Send'; diarySendButton.className = 'diary-send-button'; diaryInputArea.appendChild(diaryInput); diaryInputArea.appendChild(diarySendButton); diaryChatViewArea.appendChild(diaryInputArea); gameUiContainer.appendChild(diaryChatViewArea);
        entriesViewArea = document.createElement('div'); entriesViewArea.id = 'diary-entries-view'; entriesViewArea.style.display = 'none'; entriesViewArea.style.height = '100%'; entriesViewArea.style.width = '100%'; entriesViewArea.style.overflowY = 'auto'; entriesViewArea.style.padding = '10px'; entriesViewArea.style.boxSizing = 'border-box'; gameUiContainer.appendChild(entriesViewArea);

        // --- Add Event Listeners ---
        diarySendButton.addEventListener('click', handleDiarySend); diaryInput.addEventListener('keypress', (event) => { if (event.key === 'Enter' && !event.shiftKey && !isAssistantResponding) { event.preventDefault(); handleDiarySend(); } }); addToDiaryButton.onclick = saveStagedEntriesToDiary; viewEntriesButton.onclick = _showEntriesView;

        // Initial UI state and Welcome (Uses currentUserName)
        _renderStagedMessages(); _updateUIDisabledState(); // Sets initial placeholder using name
        const welcomeMessage = (currentPersonaInGame === 'Kana')
            ? `Diary open, ${currentUserName}. What is it?`
            : `Welcome to our Secret Diary, ${currentUserName}! Tell me anything... I'm listening! ♡`;
        appendDiaryMessage(currentPersonaInGame, welcomeMessage); // Appends welcome message
        if (diaryInput) diaryInput.focus();
    }

    // ** UPDATED ** onExit uses currentUserName
    async function onExit() {
         console.log("Diary onExit called.");
         if (stagedMessages.length > 0 && !isAssistantResponding) {
             _sendMessageToLog(currentPersonaInGame === 'Kana' ? `Saving notes for ${currentUserName} before closing.` : `Wait, ${currentUserName}! Let me save these last notes before we go...`, currentPersonaInGame);
             await saveStagedEntriesToDiary(); console.log("Auto-save completed on exit.");
         } else if (isAssistantResponding) {
             console.log("Diary exit requested while assistant was responding/saving.");
             _sendMessageToLog(currentPersonaInGame === 'Kana' ? 'Wait, writing.' : 'Hold on! Almost done writing...', currentPersonaInGame);
         } else { console.log("No staged notes to auto-save on exit."); }
         diaryChatHistory = []; stagedMessages = []; return Promise.resolve(true); // Indicate completion
    }

    // Public interface
    return {
        init: init,
        onExit: onExit,
        appendDiaryMessage: appendDiaryMessage // Expose for game message display if needed elsewhere (like index.html)
    };

})();

// Fallback Sanitizer (Keep this at the end)
if (typeof DOMPurify === 'undefined') {
    console.warn("DOMPurify not loaded. Using basic HTML escaping as fallback for diary.");
    window.DOMPurify = { sanitize: (str) => str.replace(/</g, '&lt;').replace(/>/g, '&gt;') };
}
// --- END OF FILE diary.js ---