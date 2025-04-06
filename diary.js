// --- START OF FILE diary.js ---

// Nyaa~! Mika's Super Secret Diary! Tell me everything, {user}! ♡

const MikaDiary = (() => {
    // --- Settings ---
    const MAX_SUMMARY_MESSAGES = 7; // Slightly more context for summary
    const MAX_SUMMARY_LENGTH_CHARS = 600; // Slightly more chars for summary
    const DIARY_CHAT_HISTORY_LENGTH = 10; // How many recent messages to send for chat context

    // --- State ---
    let gameUiContainer = null;
    let messageCallback = null;
    let apiCaller = null;
    let currentUserName = "User"; // ** Will be updated by init, NOT Master here! **
    let diaryChatHistory = [];     // Stores { role: 'user'/'model', text: string } for this session's chat context
    let stagedMessages = [];       // Array of { id: string, text: string, sender: string } for staging
    let diaryEntries = [];         // Array of { timestamp: number, summary: string } loaded from storage
    const STORAGE_KEY = 'mikaDiaryEntries_v1';
    let isMikaResponding = false; // Prevent multiple simultaneous API calls

    // --- DOM Element References ---
    let topNotesArea = null;
    let diaryChatLog = null;
    let diaryInput = null;
    let diarySendButton = null;
    let addToDiaryButton = null;
    let viewEntriesButton = null;
    let entriesViewArea = null;
    let diaryChatViewArea = null;
    let mikaThinkingIndicator = null; // For API response waiting

    function _sendMessageToLog(text, sender = 'Mika') {
        // Use the main game message log callback (outside the diary UI)
        if (messageCallback) {
            messageCallback(sender, text);
        } else {
            console.log(`Diary System Msg (${sender}):`, text);
        }
    }

    function _loadDiaryEntries() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                diaryEntries = JSON.parse(stored);
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

    function _isMessageStaged(messageId) {
        return stagedMessages.some(msg => msg.id === messageId);
    }

    function _addMessageToStaging(messageId, messageText, senderName) {
        if (_isMessageStaged(messageId)) return;

        const messageElement = document.getElementById(messageId);
        const heartButton = messageElement?.querySelector('.diary-heart-button');

        stagedMessages.push({ id: messageId, text: `(${senderName}) ${messageText}`, sender: senderName }); // Store sender with text
        if (heartButton) {
             heartButton.classList.add('active');
             heartButton.textContent = '♥';
        }
        _renderStagedMessages();
        _updateAddToDiaryButtonState();
        console.log(`Staged message: ${messageId}`);
    }

    function _removeMessageFromStaging(messageId) {
        stagedMessages = stagedMessages.filter(msg => msg.id !== messageId);

        const messageElement = document.getElementById(messageId);
        const heartButton = messageElement?.querySelector('.diary-heart-button');
        if (heartButton) {
             heartButton.classList.remove('active');
             heartButton.textContent = '♡';
        }

        _renderStagedMessages();
        _updateAddToDiaryButtonState();
        console.log(`Unstaged message: ${messageId}`);
    }

    function _renderStagedMessages() {
        if (!topNotesArea) return;
        topNotesArea.innerHTML = '';

        if (stagedMessages.length === 0) {
            const emptyMsg = document.createElement('p');
            emptyMsg.textContent = `Click ♡ on messages ${currentUserName} and Mika say to add notes here...`;
            emptyMsg.className = 'diary-notes-empty';
            topNotesArea.appendChild(emptyMsg);
            return;
        }

        stagedMessages.forEach(msg => {
            const noteDiv = document.createElement('div');
            noteDiv.className = 'diary-note-item';

            const noteText = document.createElement('span');
             // Show truncated text WITH sender prefix
             const displayText = msg.text.length > 60 ? msg.text.substring(0, 57) + '...' : msg.text;
             noteText.textContent = displayText;
             noteText.title = msg.text; // Full text on hover

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
            addToDiaryButton.disabled = stagedMessages.length === 0 || isMikaResponding;
        }
    }

    // --- Diary Entry Saving Logic ---

    async function saveStagedEntriesToDiary() {
        if (stagedMessages.length === 0) {
             _sendMessageToLog("No notes selected to save, silly!", "Mika");
             return false;
         }
         if (!apiCaller) {
             _sendMessageToLog("Mrow! Can't save the summary, magic connection is off!", "System");
             return false;
         }
         if (isMikaResponding) {
            _sendMessageToLog("Hold on! Let me finish writing first!", "Mika");
            return false;
         }

         _sendMessageToLog("Okay, let me summarize these notes for our diary... ♡", "Mika");
         isMikaResponding = true; // Block other actions
         if (addToDiaryButton) addToDiaryButton.disabled = true;
         if (diarySendButton) diarySendButton.disabled = true;


         // Combine staged messages smartly
         let combinedTextForPrompt = "";
         let messageCount = 0;
         // Iterate through staged messages to build the prompt text
         for (const msg of stagedMessages) {
              // Add prefix like "(User Name): " or "(Mika): " for clarity in the prompt
             const prefix = `(${msg.sender}): `;
             const messageContent = msg.text.substring(msg.text.indexOf(')') + 2); // Get text after "(Sender)"

             if (messageCount < MAX_SUMMARY_MESSAGES && (combinedTextForPrompt.length + prefix.length + messageContent.length) < MAX_SUMMARY_LENGTH_CHARS) {
                 combinedTextForPrompt += prefix + messageContent + "\n";
                 messageCount++;
             } else {
                 break;
             }
         }
         combinedTextForPrompt = combinedTextForPrompt.trim();

         if (!combinedTextForPrompt) {
             _sendMessageToLog("Mrow? Couldn't combine the notes properly...", "System");
             isMikaResponding = false; _updateUIDisabledState();
             return false;
         }

        // ** Updated Prompt ** - Emphasizes diary entry style about the user
        const prompt = `You are Mika, writing a secret diary entry about your conversation with ${currentUserName}. Summarize the following key points from your chat into a short (2-4 sentences), cute, personal diary entry. Reflect on what ${currentUserName} said or how they felt, adding your empathetic catgirl personality (nyaa~, *giggle*, *purr*, maybe a little possessive thought about ${currentUserName}). Key points:\n\n${combinedTextForPrompt}`;

        try {
            const summary = await apiCaller(prompt);
            if (summary && typeof summary === 'string') {
                const newEntry = {
                    timestamp: Date.now(),
                    summary: summary.trim()
                };
                diaryEntries.push(newEntry);
                _saveDiaryEntries();

                const originalMessageIds = stagedMessages.map(m => m.id);
                stagedMessages = []; // Clear staging AFTER successful save
                _renderStagedMessages(); // Update notes UI

                // Update heart buttons on original messages in chat log
                originalMessageIds.forEach(id => {
                    const msgElement = document.getElementById(id);
                    const heartButton = msgElement?.querySelector('.diary-heart-button');
                    if (heartButton) {
                        heartButton.classList.remove('active');
                        heartButton.textContent = '♡';
                    }
                });

                _sendMessageToLog(`*scribble scribble* Saved to our diary, ${currentUserName}! ♡`, "Mika");
            } else {
                _sendMessageToLog("Meeeow... The magic box gave me a weird summary... I couldn't save it this time. Try again?", "Mika");
            }
        } catch (error) {
            console.error("Error saving diary entry via API:", error);
            _sendMessageToLog(`*Whimper*... Something went wrong trying to save that diary entry... ${error}`, "System");
        } finally {
             isMikaResponding = false;
             _updateUIDisabledState(); // Re-enable buttons
        }
        // Return true/false based on actual saving? For now, just complete.
         return true; // Indicate attempt was made
    }

    // --- Diary Chat Logic ---

    function appendDiaryMessage(sender, text) {
        if (!diaryChatLog) return;

        const messageId = `diary-msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const messageElement = document.createElement('p');
        messageElement.id = messageId;

        // ** Use provided currentUserName, NOT "User" or "Master" **
        const senderName = (sender === 'User') ? currentUserName : 'Mika';

        // Sanitize the raw text first
        const sanitizedMessage = DOMPurify.sanitize(text);
        let displayHTML = "";

        if (sender === 'User') {
            messageElement.className = 'diary-user-message';
            displayHTML = `<strong>${senderName}:</strong> ${sanitizedMessage}`;
        } else { // Assume Mika
            messageElement.className = 'diary-mika-message';
            let processedMessage = sanitizedMessage
                 .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                 .replace(/\*(.*?)\*/g, '<em>$1</em>');
            displayHTML = `<strong>${senderName}:</strong> ${processedMessage}`;
        }

        // Add Heart Button (Can heart User and Mika messages)
        const heartButton = document.createElement('button');
        heartButton.className = 'diary-heart-button';
        heartButton.textContent = _isMessageStaged(messageId) ? '♥' : '♡'; // Set initial state correctly
        if (_isMessageStaged(messageId)) heartButton.classList.add('active');
        heartButton.title = 'Add to notes for diary entry';
        heartButton.onclick = (event) => {
            event.stopPropagation();
            if (_isMessageStaged(messageId)) {
                _removeMessageFromStaging(messageId);
            } else {
                 // Pass senderName so staged item knows who said it
                 _addMessageToStaging(messageId, text, senderName);
            }
        };

        messageElement.innerHTML = displayHTML;
        messageElement.appendChild(heartButton);

        diaryChatLog.appendChild(messageElement);
        diaryChatLog.scrollTop = diaryChatLog.scrollHeight;

        // Add to internal chat history for context
        diaryChatHistory.push({ role: (sender === 'User' ? 'user' : 'model'), text: text });
        // Prune history if needed
        if (diaryChatHistory.length > DIARY_CHAT_HISTORY_LENGTH * 2) { // Keep a bit more than context window
             diaryChatHistory = diaryChatHistory.slice(-DIARY_CHAT_HISTORY_LENGTH * 2);
        }
    }

    function _showThinkingIndicator() {
        if (!mikaThinkingIndicator) {
            mikaThinkingIndicator = document.createElement('p');
            mikaThinkingIndicator.className = 'diary-mika-message typing'; // Style like a message but indicate typing
            mikaThinkingIndicator.innerHTML = '<strong>Mika:</strong> *purrrrr... thinking...*';
        }
        if (diaryChatLog && !diaryChatLog.contains(mikaThinkingIndicator)) {
            diaryChatLog.appendChild(mikaThinkingIndicator);
            diaryChatLog.scrollTop = diaryChatLog.scrollHeight;
        }
    }

    function _removeThinkingIndicator() {
        if (mikaThinkingIndicator && diaryChatLog && diaryChatLog.contains(mikaThinkingIndicator)) {
            diaryChatLog.removeChild(mikaThinkingIndicator);
        }
    }

     function _updateUIDisabledState() {
         const disable = isMikaResponding;
         if (diaryInput) diaryInput.disabled = disable;
         if (diarySendButton) diarySendButton.disabled = disable;
         if (addToDiaryButton) addToDiaryButton.disabled = disable || stagedMessages.length === 0; // Also check staged messages
         if (viewEntriesButton) viewEntriesButton.disabled = disable;
         // Disable heart buttons while responding? Maybe not necessary.
         if(disable) {
            if(diaryInput) diaryInput.placeholder = "Wait for Mika to reply...";
         } else {
            if(diaryInput) diaryInput.placeholder = "Tell Mika your secrets...";
         }
     }


    async function handleDiarySend() {
        if (isMikaResponding || !diaryInput || !diaryInput.value.trim()) return;

        const messageText = diaryInput.value.trim();
        appendDiaryMessage('User', messageText); // Appends to log and internal history
        diaryInput.value = '';
        isMikaResponding = true;
        _updateUIDisabledState();
        _showThinkingIndicator();

        // Prepare context for API
        // Get last N messages from internal history
        const contextHistory = diaryChatHistory.slice(-DIARY_CHAT_HISTORY_LENGTH);
        const messagesForApi = contextHistory.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.text }]
        }));

        // ** Updated Prompt for Chat Response **
        // Instructs Mika to be empathetic, ask questions, use user's name, and maintain personality
        const prompt = `You are Mika, a playful, empathetic, teasing, possessive catgirl talking with your best friend ${currentUserName} in your secret diary. Respond empathetically to their last message, maybe ask a gentle follow-up question, and maintain your personality (cat noises, humor, possessiveness towards ${currentUserName}). Keep responses relatively short (2-3 sentences). The last message from ${currentUserName} was: "${messageText}"`;

        try {
            // Use the main API caller, but pass the specific diary context
            // Note: We're modifying the *chat response* prompt here. The summary prompt is separate.
            // We pass the constructed history to the *main* api.js function
            const mikaResponseText = await apiCaller(prompt, messagesForApi); // Pass history context

            if (mikaResponseText && typeof mikaResponseText === 'string') {
                appendDiaryMessage('Mika', mikaResponseText); // Append response to log and internal history
            } else {
                // Fallback if API fails or gives empty response
                appendDiaryMessage('Mika', _getRandomResponse('nonCommittal')); // Use a vague fallback
            }
        } catch (error) {
            console.error("Error getting Mika's diary response:", error);
            appendDiaryMessage('Mika', `Mrow... My brain is fuzzy... (${error})`); // Error response
        } finally {
             isMikaResponding = false;
             _removeThinkingIndicator();
             _updateUIDisabledState();
             if(diaryInput) diaryInput.focus();
        }
    }

     // --- Entries View Logic ---

     function _renderDiaryEntriesView() {
         if (!entriesViewArea) return;
         entriesViewArea.innerHTML = ''; // Clear previous

         const backButton = document.createElement('button');
         backButton.textContent = '← Back to Diary Chat';
         backButton.className = 'diary-view-back-button rps-choice-button'; // Reuse button style
         backButton.onclick = _showChatView;
         entriesViewArea.appendChild(backButton);

         const title = document.createElement('h3');
         title.textContent = `Our Secret Diary Entries ♡ (${currentUserName})`; // Add name!
         title.className = 'diary-entries-title';
         entriesViewArea.appendChild(title);

         if (diaryEntries.length === 0) {
             const emptyMsg = document.createElement('p');
             emptyMsg.textContent = "No secrets saved yet... Tell Mika something!";
             emptyMsg.className = 'diary-entries-empty';
             entriesViewArea.appendChild(emptyMsg);
             return;
         }

         [...diaryEntries].reverse().forEach(entry => {
             const entryDiv = document.createElement('div');
             entryDiv.className = 'diary-entry-item';

             const dateSpan = document.createElement('span');
             dateSpan.className = 'diary-entry-date';
             dateSpan.textContent = new Date(entry.timestamp).toLocaleString();

             const summaryP = document.createElement('p');
              // Sanitize and format summary
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

     function _showEntriesView() {
         if (diaryChatViewArea) diaryChatViewArea.style.display = 'none';
         if (entriesViewArea) {
             _renderDiaryEntriesView();
             entriesViewArea.style.display = 'block';
         }
         _sendMessageToLog(`Looking through our secrets, ${currentUserName}~? ♡`, "Mika");
     }

     function _showChatView() {
         if (entriesViewArea) entriesViewArea.style.display = 'none';
         if (diaryChatViewArea) diaryChatViewArea.style.display = 'flex';
         if (diaryInput) diaryInput.focus();
     }


    // --- Initialization and Exit ---

    function init(_gameUiContainer, _messageCallback, _apiCaller, userName) {
        gameUiContainer = _gameUiContainer;
        messageCallback = _messageCallback; // This is for the *main* game log (outside diary UI)
        apiCaller = _apiCaller; // The wrapper function from index.html
        currentUserName = userName || "User"; // ** Use the actual user name **

        if (!gameUiContainer) {
            console.error("Diary Game UI container not provided!");
            return;
        }
        gameUiContainer.innerHTML = ''; // Clear previous content

         _loadDiaryEntries();
         diaryChatHistory = []; // Reset chat history for new session
         stagedMessages = []; // Reset staged messages

        // --- Create Main Layout ---
        diaryChatViewArea = document.createElement('div');
        diaryChatViewArea.id = 'diary-chat-view';
        diaryChatViewArea.style.cssText = 'display: flex; flex-direction: column; height: 100%; width: 100%;';

        topNotesArea = document.createElement('div');
        topNotesArea.id = 'diary-top-notes';
        topNotesArea.className = 'diary-top-notes-area';
        _renderStagedMessages();
        diaryChatViewArea.appendChild(topNotesArea);

        const controlsArea = document.createElement('div');
        controlsArea.className = 'diary-controls-area';
        addToDiaryButton = document.createElement('button');
        addToDiaryButton.id = 'diary-add-button';
        addToDiaryButton.textContent = 'Add Notes to Diary ♡';
        addToDiaryButton.className = 'rps-choice-button';
        addToDiaryButton.onclick = saveStagedEntriesToDiary;
        controlsArea.appendChild(addToDiaryButton);

        viewEntriesButton = document.createElement('button');
        viewEntriesButton.id = 'diary-view-entries-button';
        viewEntriesButton.textContent = 'View Entries 📖';
        viewEntriesButton.className = 'rps-choice-button secondary';
        viewEntriesButton.onclick = _showEntriesView;
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
        diaryInput.placeholder = 'Tell Mika your secrets...';
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
        entriesViewArea.style.cssText = 'display: none; height: 100%; width: 100%; overflow-y: auto; padding: 10px; box-sizing: border-box;';
        gameUiContainer.appendChild(entriesViewArea);

        // --- Add Event Listeners ---
        diarySendButton.addEventListener('click', handleDiarySend);
        diaryInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter' && !event.shiftKey && !isMikaResponding) { // Prevent send while responding
                event.preventDefault();
                handleDiarySend();
            }
        });

        // Initial UI state
        isMikaResponding = false;
        _updateUIDisabledState();

        // Initial message using the internal append function
        appendDiaryMessage('Mika', `Welcome to our Secret Diary, ${currentUserName}! Tell me anything... I'm listening! ♡`);
        if (diaryInput) diaryInput.focus();
    }

    // Function called by index.html when switching away from the game
    async function onExit() {
         console.log("Diary onExit called.");
         // Automatically save any staged notes
         if (stagedMessages.length > 0 && !isMikaResponding) { // Don't save if already saving
             _sendMessageToLog("Wait, "+currentUserName+"! Let me save these last notes before we go...", "Mika");
             await saveStagedEntriesToDiary(); // Wait for save to complete
             console.log("Auto-save completed on exit.");
         } else if (isMikaResponding) {
             console.log("Diary exit requested while Mika was responding/saving. Staged notes not saved automatically.");
             _sendMessageToLog("Hold on! Almost done writing...", "Mika"); // Inform user
             // Optionally, try to cancel the ongoing API call? Difficult/unreliable.
         } else {
             console.log("No staged notes to auto-save on exit.");
         }
         // Clear transient state for next time
         diaryChatHistory = [];
         stagedMessages = [];
         // Don't clear diaryEntries, that's loaded from storage.
    }

    // Public interface
    return {
        init: init,
        onExit: onExit // Expose the exit handler
    };

})();
// Ensure DOMPurify is loaded or provide a fallback sanitizer
if (typeof DOMPurify === 'undefined') {
    console.warn("DOMPurify not loaded. Using basic HTML escaping as fallback for diary.");
    window.DOMPurify = {
        sanitize: (str) => str.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    };
}

// --- END OF FILE diary.js ---