// --- START OF FILE diary.js ---

// Nyaa~! Mika's Super Secret Diary! Tell me everything! ♡ (Or Kana, if you *must*.)
// ** UPDATED with Persona Switching **

const MikaDiary = (() => {
    // --- Settings ---
    const MAX_SUMMARY_MESSAGES = 7;
    const MAX_SUMMARY_LENGTH_CHARS = 600;
    const DIARY_CHAT_HISTORY_LENGTH = 10;
    const STORAGE_KEY = 'mikaDiaryEntries_v1';

    // --- State ---
    let gameUiContainer = null;
    let messageCallback = null; // For system messages outside diary UI
    let apiCaller = null;
    let currentUserName = "User"; // Updated via init
    let currentPersonaInGame = 'Mika'; // ** NEW: Store current persona **
    let diaryChatHistory = [];     // { role: 'user'/'model', text: string }
    let stagedMessages = [];       // { id: string, text: string, sender: string }
    let diaryEntries = [];         // { timestamp: number, summary: string, persona: string } // Added persona!
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
    let assistantThinkingIndicator = null; // Renamed for clarity

    function _sendMessageToLog(text, sender = 'System') {
        // Use the main game message log callback
        if (messageCallback) {
            messageCallback(sender, text);
        } else {
            console.log(`Diary SysMsg (${sender}):`, text);
        }
    }

    // ** UPDATED ** Handles loading older entries without persona field
    function _loadDiaryEntries() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                diaryEntries = JSON.parse(stored);
                // Add persona field if missing from old entries for compatibility
                diaryEntries = diaryEntries.map(entry => ({ ...entry, persona: entry.persona || 'Mika' }));
                console.log(`Loaded ${diaryEntries.length} diary entries.`);
            } else {
                diaryEntries = [];
                console.log("No previous diary entries found.");
            }
        } catch (e) {
            console.error("Failed to load or parse diary entries:", e);
            diaryEntries = [];
            localStorage.removeItem(STORAGE_KEY);
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

    // --- Staging Area Logic ---
    // (No changes needed in these helper functions for persona switching)
    function _isMessageStaged(messageId) {
        return stagedMessages.some(msg => msg.id === messageId);
    }
    function _addMessageToStaging(messageId, messageText, senderName) {
        if (_isMessageStaged(messageId)) return;
        const messageElement = document.getElementById(messageId);
        const heartButton = messageElement?.querySelector('.diary-heart-button');
        stagedMessages.push({ id: messageId, text: `(${senderName}) ${messageText}`, sender: senderName });
        if (heartButton) { heartButton.classList.add('active'); heartButton.textContent = '♥'; }
        _renderStagedMessages();
        _updateAddToDiaryButtonState();
        console.log(`Staged message: ${messageId}`);
    }
    function _removeMessageFromStaging(messageId) {
        stagedMessages = stagedMessages.filter(msg => msg.id !== messageId);
        const messageElement = document.getElementById(messageId);
        const heartButton = messageElement?.querySelector('.diary-heart-button');
        if (heartButton) { heartButton.classList.remove('active'); heartButton.textContent = '♡'; }
        _renderStagedMessages();
        _updateAddToDiaryButtonState();
        console.log(`Unstaged message: ${messageId}`);
    }
    function _renderStagedMessages() {
        if (!topNotesArea) return;
        topNotesArea.innerHTML = '';
        if (stagedMessages.length === 0) {
            const emptyMsg = document.createElement('p');
            // ** UPDATED ** Placeholder uses current user name
            emptyMsg.textContent = `Click ♡ on messages ${currentUserName} and ${currentPersonaInGame} say to add notes here...`;
            emptyMsg.className = 'diary-notes-empty';
            topNotesArea.appendChild(emptyMsg);
            return;
        }
        stagedMessages.forEach(msg => {
            const noteDiv = document.createElement('div');
            noteDiv.className = 'diary-note-item';
            const noteText = document.createElement('span');
            const displayText = msg.text.length > 60 ? msg.text.substring(0, 57) + '...' : msg.text;
            noteText.textContent = displayText;
            noteText.title = msg.text;
            const removeBtn = document.createElement('button');
            removeBtn.textContent = '×';
            removeBtn.className = 'diary-note-remove';
            removeBtn.title = 'Remove from notes';
            removeBtn.onclick = () => _removeMessageFromStaging(msg.id);
            noteDiv.appendChild(noteText);
            noteDiv.appendChild(removeBtn);
            topNotesArea.appendChild(noteDiv);
        });
    }
    function _updateAddToDiaryButtonState() {
        if (addToDiaryButton) {
            addToDiaryButton.disabled = stagedMessages.length === 0 || isAssistantResponding;
        }
    }

    // --- Diary Entry Saving Logic ---
    // ** UPDATED ** Persona-aware summary generation and messaging
    async function saveStagedEntriesToDiary() {
        if (stagedMessages.length === 0) {
             _sendMessageToLog(currentPersonaInGame === 'Kana' ? "Select some notes first." : "No notes selected to save, silly!", currentPersonaInGame); // Use persona voice
             return false;
         }
         if (!apiCaller) { /* ... (API caller check unchanged) ... */ return false; }
         if (isAssistantResponding) {
             _sendMessageToLog(currentPersonaInGame === 'Kana' ? "Wait." : "Hold on! Let me finish writing first!", currentPersonaInGame); // Use persona voice
             return false;
          }

        _sendMessageToLog(currentPersonaInGame === 'Kana' ? "Summarizing..." : "Okay, let me summarize these notes for our diary... ♡", currentPersonaInGame); // Use persona voice
        isAssistantResponding = true;
        _updateUIDisabledState();

        // Combine staged messages (logic unchanged)
        let combinedTextForPrompt = "";
        let messageCount = 0;
        for (const msg of stagedMessages) {
             const prefix = `(${msg.sender}): `;
             const messageContent = msg.text.substring(msg.text.indexOf(')') + 2);
             if (messageCount < MAX_SUMMARY_MESSAGES && (combinedTextForPrompt.length + prefix.length + messageContent.length) < MAX_SUMMARY_LENGTH_CHARS) {
                 combinedTextForPrompt += prefix + messageContent + "\n";
                 messageCount++;
             } else { break; }
         }
        combinedTextForPrompt = combinedTextForPrompt.trim();
        if (!combinedTextForPrompt) { /* ... (Error handling unchanged) ... */ return false; }

        // ** Updated Prompt ** - Persona-aware!
        const personaPromptPart = (currentPersonaInGame === 'Kana')
            ? `You are Kana, writing a secret diary entry about your conversation with ${currentUserName}. Summarize the following key points from your chat into a short (2-4 sentences), dry, perhaps slightly analytical or grudgingly observant diary entry. Reflect on what ${currentUserName} said. Keep your sarcastic/superior tone.`
            : `You are Mika, writing a secret diary entry about your conversation with ${currentUserName}. Summarize the following key points from your chat into a short (2-4 sentences), cute, personal diary entry. Reflect on what ${currentUserName} said or how they felt, adding your empathetic catgirl personality (nyaa~, *giggle*, *purr*, maybe a little possessive thought about ${currentUserName}).`;

        const prompt = `${personaPromptPart} Key points:\n\n${combinedTextForPrompt}`;

        try {
            const summary = await apiCaller(prompt); // API caller now implicitly uses correct persona via call to sendMessageToMika
            if (summary && typeof summary === 'string') {
                const newEntry = {
                    timestamp: Date.now(),
                    summary: summary.trim(),
                    persona: currentPersonaInGame // ** Store the persona who wrote the entry! **
                };
                diaryEntries.push(newEntry);
                _saveDiaryEntries();

                const originalMessageIds = stagedMessages.map(m => m.id);
                stagedMessages = [];
                _renderStagedMessages();

                // Update heart buttons (logic unchanged)
                originalMessageIds.forEach(id => {
                    const msgElement = document.getElementById(id);
                    const heartButton = msgElement?.querySelector('.diary-heart-button');
                    if (heartButton) {
                        heartButton.classList.remove('active');
                        heartButton.textContent = '♡';
                    }
                });

                _sendMessageToLog(currentPersonaInGame === 'Kana' ? `Saved entry for ${currentUserName}.` : `*scribble scribble* Saved to our diary, ${currentUserName}! ♡`, currentPersonaInGame); // Use persona voice
            } else {
                _sendMessageToLog(currentPersonaInGame === 'Kana' ? "API gave a useless summary. Not saved." : "Meeeow... The magic box gave me a weird summary... I couldn't save it this time. Try again?", currentPersonaInGame); // Use persona voice
            }
        } catch (error) {
            console.error("Error saving diary entry via API:", error);
            _sendMessageToLog(`${currentPersonaInGame === 'Kana' ? 'Error saving entry:' : '*Whimper*... Something went wrong trying to save that diary entry...'} ${error}`, "System");
        } finally {
             isAssistantResponding = false;
             _updateUIDisabledState();
        }
         return true;
    }

    // --- Diary Chat Logic ---
    // ** UPDATED ** appendDiaryMessage uses currentPersonaInGame for display name
    function appendDiaryMessage(sender, text) {
        if (!diaryChatLog) return;
        const messageId = `diary-msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const messageElement = document.createElement('p');
        messageElement.id = messageId;

        // ** Use currentPersonaInGame for assistant's name **
        const senderName = (sender === 'User') ? currentUserName : currentPersonaInGame;

        const sanitizedMessage = DOMPurify.sanitize(text);
        let displayHTML = "";

        if (sender === 'User') {
            messageElement.className = 'diary-user-message';
            displayHTML = `<strong>${senderName}:</strong> ${sanitizedMessage}`;
        } else { // Assistant message (Mika or Kana)
            messageElement.className = 'diary-mika-message'; // Use 'mika-message' class for styling consistency
            let processedMessage = sanitizedMessage
                 .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                 .replace(/\*(.*?)\*/g, '<em>$1</em>');
            // ** Display the correct persona name **
            displayHTML = `<strong>${senderName}:</strong> ${processedMessage}`;
        }

        // Add Heart Button (logic unchanged)
        const heartButton = document.createElement('button');
        heartButton.className = 'diary-heart-button';
        heartButton.textContent = _isMessageStaged(messageId) ? '♥' : '♡';
        if (_isMessageStaged(messageId)) heartButton.classList.add('active');
        heartButton.title = 'Add to notes for diary entry';
        heartButton.onclick = (event) => {
            event.stopPropagation();
            if (_isMessageStaged(messageId)) {
                _removeMessageFromStaging(messageId);
            } else {
                 _addMessageToStaging(messageId, text, senderName); // Pass correct senderName
            }
        };

        messageElement.innerHTML = displayHTML;
        messageElement.appendChild(heartButton);
        diaryChatLog.appendChild(messageElement);
        diaryChatLog.scrollTop = diaryChatLog.scrollHeight;

        // Add to internal chat history (logic unchanged)
        diaryChatHistory.push({ role: (sender === 'User' ? 'user' : 'model'), text: text });
        if (diaryChatHistory.length > DIARY_CHAT_HISTORY_LENGTH * 2) {
             diaryChatHistory = diaryChatHistory.slice(-DIARY_CHAT_HISTORY_LENGTH * 2);
        }
    }

    // ** UPDATED ** Thinking indicator uses currentPersonaInGame
    function _showThinkingIndicator() {
        if (!assistantThinkingIndicator) {
            assistantThinkingIndicator = document.createElement('p');
            assistantThinkingIndicator.className = 'diary-mika-message typing'; // Style like a message
        }
        // ** Set text based on persona **
        assistantThinkingIndicator.innerHTML = `<strong>${currentPersonaInGame}:</strong> ${currentPersonaInGame === 'Kana' ? '*Thinking...*' : '*purrrrr... thinking...*'}`;

        if (diaryChatLog && !diaryChatLog.contains(assistantThinkingIndicator)) {
            diaryChatLog.appendChild(assistantThinkingIndicator);
            diaryChatLog.scrollTop = diaryChatLog.scrollHeight;
        }
    }
    function _removeThinkingIndicator() {
        if (assistantThinkingIndicator && diaryChatLog && diaryChatLog.contains(assistantThinkingIndicator)) {
            diaryChatLog.removeChild(assistantThinkingIndicator);
        }
    }

    // ** UPDATED ** UI state uses currentPersonaInGame for placeholders
     function _updateUIDisabledState() {
         const disable = isAssistantResponding;
         if (diaryInput) diaryInput.disabled = disable;
         if (diarySendButton) diarySendButton.disabled = disable;
         if (addToDiaryButton) addToDiaryButton.disabled = disable || stagedMessages.length === 0;
         if (viewEntriesButton) viewEntriesButton.disabled = disable;

         if(diaryInput) {
             // ** Set placeholder based on persona **
            diaryInput.placeholder = disable
                ? (currentPersonaInGame === 'Kana' ? 'Wait.' : 'Wait for me to reply...')
                : (currentPersonaInGame === 'Kana' ? 'What is it?' : 'Tell me your secrets...');
         }
     }

    // ** UPDATED ** Chat response prompt is persona-aware
    async function handleDiarySend() {
        if (isAssistantResponding || !diaryInput || !diaryInput.value.trim()) return;
        const messageText = diaryInput.value.trim();
        appendDiaryMessage('User', messageText); // Appends with correct user name
        diaryInput.value = '';
        isAssistantResponding = true;
        _updateUIDisabledState();
        _showThinkingIndicator();

        const contextHistory = diaryChatHistory.slice(-DIARY_CHAT_HISTORY_LENGTH);
        const messagesForApi = contextHistory.map(msg => ({ role: msg.role, parts: [{ text: msg.text }] }));

        // ** Updated Prompt for Chat Response **
        const personaPromptPart = (currentPersonaInGame === 'Kana')
            ? `You are Kana, a sly, sarcastic catgirl talking with ${currentUserName} in your secret diary. Respond coolly or with dry wit to their last message. Maybe ask a blunt follow-up question. Maintain your sarcastic persona. Keep responses short (1-3 sentences).`
            : `You are Mika, a playful, empathetic, teasing, possessive catgirl talking with your best friend ${currentUserName} in your secret diary. Respond empathetically to their last message, maybe ask a gentle follow-up question, and maintain your personality (cat noises, humor, possessiveness towards ${currentUserName}). Keep responses relatively short (2-3 sentences).`;

        const prompt = `${personaPromptPart} The last message from ${currentUserName} was: "${messageText}"`;

        try {
            const assistantResponseText = await apiCaller(prompt, messagesForApi); // API caller uses correct persona context
            if (assistantResponseText && typeof assistantResponseText === 'string') {
                appendDiaryMessage(currentPersonaInGame, assistantResponseText); // Append response with correct persona name
            } else {
                 // Fallback if API fails or gives empty response
                 const fallback = currentPersonaInGame === 'Kana' ? "..." : "*confused meow*";
                 appendDiaryMessage(currentPersonaInGame, fallback);
            }
        } catch (error) {
            console.error("Error getting Mika's diary response:", error);
            appendDiaryMessage(currentPersonaInGame, `${currentPersonaInGame === 'Kana' ? 'Error.' : 'Mrow... My brain is fuzzy...'} (${error})`); // Use persona voice
        } finally {
             isAssistantResponding = false;
             _removeThinkingIndicator();
             _updateUIDisabledState();
             if(diaryInput) diaryInput.focus();
        }
    }

     // --- Entries View Logic ---
     // ** UPDATED ** Displays who wrote the entry
     function _renderDiaryEntriesView() {
         if (!entriesViewArea) return;
         entriesViewArea.innerHTML = '';

         const backButton = document.createElement('button');
         backButton.textContent = '← Back to Diary Chat';
         backButton.className = 'diary-view-back-button rps-choice-button secondary';
         backButton.onclick = _showChatView;
         entriesViewArea.appendChild(backButton);

         const title = document.createElement('h3');
         // ** Title uses current user name **
         title.textContent = `Our Secret Diary Entries (${currentUserName})`;
         title.className = 'diary-entries-title';
         entriesViewArea.appendChild(title);

         if (diaryEntries.length === 0) {
             const emptyMsg = document.createElement('p');
             // ** Message uses current persona **
             emptyMsg.textContent = currentPersonaInGame === 'Kana' ? "No entries. Obviously." : "No secrets saved yet... Tell Mika something!";
             emptyMsg.className = 'diary-entries-empty';
             entriesViewArea.appendChild(emptyMsg);
             return;
         }

         [...diaryEntries].reverse().forEach(entry => {
             const entryDiv = document.createElement('div');
             entryDiv.className = 'diary-entry-item';

             const dateSpan = document.createElement('span');
             dateSpan.className = 'diary-entry-date';
             // ** Indicate who wrote it! **
             const writer = entry.persona || 'Mika'; // Default old entries to Mika
             dateSpan.textContent = `${new Date(entry.timestamp).toLocaleString()} (${writer}'s entry)`;

             const summaryP = document.createElement('p');
             let processedSummary = DOMPurify.sanitize(entry.summary)
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\*(.*?)\*/g, '<em>$1</em>')
                  .replace(/(?<!<br>)\n/g, '<br>');
             summaryP.innerHTML = processedSummary;

             entryDiv.appendChild(dateSpan);
             entryDiv.appendChild(summaryP);
             entriesViewArea.appendChild(entryDiv);
         });
     }

     // ** UPDATED ** Uses persona voice
     function _showEntriesView() {
         if (diaryChatViewArea) diaryChatViewArea.style.display = 'none';
         if (entriesViewArea) {
             _renderDiaryEntriesView();
             entriesViewArea.style.display = 'block';
         }
         _sendMessageToLog(currentPersonaInGame === 'Kana' ? `Viewing entries for ${currentUserName}.` : `Looking through our secrets, ${currentUserName}~? ♡`, currentPersonaInGame);
     }
     function _showChatView() {
         if (entriesViewArea) entriesViewArea.style.display = 'none';
         if (diaryChatViewArea) diaryChatViewArea.style.display = 'flex'; // Ensure flex display
         if (diaryInput) diaryInput.focus();
     }

    // --- Initialization and Exit ---
    // ** UPDATED ** init accepts and stores persona
    function init(_gameUiContainer, _messageCallback, _apiCaller, userName, persona) {
        gameUiContainer = _gameUiContainer;
        messageCallback = _messageCallback;
        apiCaller = _apiCaller;
        currentUserName = userName || "User";
        currentPersonaInGame = persona || 'Mika'; // ** Store the passed persona **
        isAssistantResponding = false; // Reset state

        if (!gameUiContainer) { console.error("Diary Game UI container not provided!"); return; }
        gameUiContainer.innerHTML = '';

         _loadDiaryEntries();
         diaryChatHistory = [];
         stagedMessages = [];

        // --- Create Main Layout (Structure from original file) ---
        diaryChatViewArea = document.createElement('div');
        diaryChatViewArea.id = 'diary-chat-view';
        // ** Apply flex styling directly if not handled by CSS class **
        diaryChatViewArea.style.display = 'flex';
        diaryChatViewArea.style.flexDirection = 'column';
        diaryChatViewArea.style.height = '100%';
        diaryChatViewArea.style.width = '100%';

        topNotesArea = document.createElement('div');
        topNotesArea.id = 'diary-top-notes'; // Ensure ID matches CSS if needed
        topNotesArea.className = 'diary-top-notes-area';
        diaryChatViewArea.appendChild(topNotesArea);

        const controlsArea = document.createElement('div');
        controlsArea.className = 'diary-controls-area';
        addToDiaryButton = document.createElement('button');
        addToDiaryButton.id = 'diary-add-button';
        addToDiaryButton.textContent = 'Add Notes to Diary ♡';
        addToDiaryButton.className = 'rps-choice-button'; // Use existing style class
        viewEntriesButton = document.createElement('button');
        viewEntriesButton.id = 'diary-view-entries-button';
        viewEntriesButton.textContent = 'View Entries 📖';
        viewEntriesButton.className = 'rps-choice-button secondary'; // Use existing style class
        controlsArea.appendChild(addToDiaryButton);
        controlsArea.appendChild(viewEntriesButton);
        diaryChatViewArea.appendChild(controlsArea);

        diaryChatLog = document.createElement('div');
        diaryChatLog.id = 'diary-chat-log';
        diaryChatLog.className = 'diary-chat-log-area';
        diaryChatViewArea.appendChild(diaryChatLog);

        const diaryInputArea = document.createElement('div');
        diaryInputArea.id = 'diary-input-area';
        diaryInputArea.className = 'diary-input-area';
        diaryInput = document.createElement('input');
        diaryInput.type = 'text';
        diaryInput.id = 'diary-chat-input';
        // Placeholder set by _updateUIDisabledState
        diaryInput.className = 'diary-chat-input';
        diarySendButton = document.createElement('button');
        diarySendButton.id = 'diary-send-button';
        diarySendButton.textContent = 'Send';
        diarySendButton.className = 'diary-send-button';
        diaryInputArea.appendChild(diaryInput);
        diaryInputArea.appendChild(diarySendButton);
        diaryChatViewArea.appendChild(diaryInputArea);
        gameUiContainer.appendChild(diaryChatViewArea);

        entriesViewArea = document.createElement('div');
        entriesViewArea.id = 'diary-entries-view';
        // ** Apply necessary styles directly if not in CSS **
        entriesViewArea.style.display = 'none';
        entriesViewArea.style.height = '100%';
        entriesViewArea.style.width = '100%';
        entriesViewArea.style.overflowY = 'auto';
        entriesViewArea.style.padding = '10px';
        entriesViewArea.style.boxSizing = 'border-box';
        gameUiContainer.appendChild(entriesViewArea);

        // --- Add Event Listeners ---
        diarySendButton.addEventListener('click', handleDiarySend);
        diaryInput.addEventListener('keypress', (event) => { if (event.key === 'Enter' && !event.shiftKey && !isAssistantResponding) { event.preventDefault(); handleDiarySend(); } });
        addToDiaryButton.onclick = saveStagedEntriesToDiary;
        viewEntriesButton.onclick = _showEntriesView;

        // Initial UI state and Welcome
        _renderStagedMessages(); // Render empty state initially
        _updateUIDisabledState(); // Set initial input placeholder

        // ** UPDATED ** Welcome message uses persona
        const welcomeMessage = (currentPersonaInGame === 'Kana')
            ? `Diary open, ${currentUserName}. What is it?`
            : `Welcome to our Secret Diary, ${currentUserName}! Tell me anything... I'm listening! ♡`;
        appendDiaryMessage(currentPersonaInGame, welcomeMessage);

        if (diaryInput) diaryInput.focus();
    }

    // ** UPDATED ** Uses persona voice on exit
    async function onExit() {
         console.log("Diary onExit called.");
         if (stagedMessages.length > 0 && !isAssistantResponding) {
             _sendMessageToLog(currentPersonaInGame === 'Kana' ? `Saving notes for ${currentUserName} before closing.` : `Wait, ${currentUserName}! Let me save these last notes before we go...`, currentPersonaInGame); // Use persona voice
             await saveStagedEntriesToDiary();
             console.log("Auto-save completed on exit.");
         } else if (isAssistantResponding) {
             console.log("Diary exit requested while assistant was responding/saving.");
             _sendMessageToLog(currentPersonaInGame === 'Kana' ? 'Wait, writing.' : 'Hold on! Almost done writing...', currentPersonaInGame); // Use persona voice
         } else {
             console.log("No staged notes to auto-save on exit.");
         }
         diaryChatHistory = [];
         stagedMessages = [];
         return Promise.resolve(true); // Indicate completion
    }

    // Public interface
    return {
        init: init,
        onExit: onExit
    };

})();

// Fallback Sanitizer (Keep this at the end)
if (typeof DOMPurify === 'undefined') {
    console.warn("DOMPurify not loaded. Using basic HTML escaping as fallback for diary.");
    window.DOMPurify = { sanitize: (str) => str.replace(/</g, '&lt;').replace(/>/g, '&gt;') };
}
// --- END OF FILE diary.js ---