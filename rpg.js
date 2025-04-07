// --- START OF FILE rpg.js ---

// Nyaa~! Mika & Kana's RPG Adventure! Let's go on a Quest, Master! ⚔️✨🎲
// Remember: This is all just pretend! Have fun!

const RpgApp = (() => {
    // --- Settings & Constants ---
    const QUEST_LIBRARY_KEY = 'mikaRpgLibrary_v1';
    const QUEST_CONTEXT_LENGTH = 4; // How many past turns (narrative + action) to send for context
    const MAX_CHOICES_DISPLAYED = 3; // How many choices to show, even if API gives more
    const GENRES = { // Using objects for potential future expansion (e.g., icons)
        'Fantasy': { display: 'Fantasy Kingdom 🏰', promptTerm: 'High Fantasy Kingdom' },
        'SciFi': { display: 'Deep Space Station 🚀', promptTerm: 'Science Fiction Space Station' },
        'Horror': { display: 'Spooky Haunted Mansion 👻', promptTerm: 'Gothic Horror Haunted Mansion' },
        'Cyberpunk': { display: 'Cyberpunk City 🌃', promptTerm: 'Neon-lit Cyberpunk City' },
        'Surprise': { display: 'Surprise Me! 🎲', promptTerm: 'a surprise genre decided by the GM' }
    };
    const ARCHETYPES = {
        'Knight': { display: 'Brave Knight ⚔️', promptTerm: 'a brave Knight' },
        'Wizard': { display: 'Clever Wizard ✨', promptTerm: 'a clever Wizard' },
        'Rogue': { display: 'Sneaky Rogue 🤫', promptTerm: 'a sneaky Rogue' },
        'SpacePilot': { display: 'Daring Space Pilot 🚀', promptTerm: 'a daring Space Pilot' },
        'CyberRunner': { display: 'Tough Cyber-Runner 💻', promptTerm: 'a tough Cyber-Runner' },
        'Adventurer': { display: 'Adventurer 🗺️', promptTerm: 'an Adventurer' } // General default
    };
    const LENGTHS = { // Keys match StoryTime for consistency if needed
        'Short': { display: 'Short (≈4-6 turns)', turns: 5 }, // Approx target turns
        'Medium': { display: 'Medium (≈7-10 turns)', turns: 8 },
        'Long': { display: 'Long (≈11-15 turns)', turns: 13 },
        'Endless': { display: 'Endless~ ☆', turns: Infinity }
    };
    const MAX_LIBRARY_ENTRIES = 30;

    // --- State ---
    let gameUiContainer = null;
    let messageCallback = null; // For non-sensitive system messages outside app UI
    let apiCaller = null;       // Function to call our Gemini API
    let currentUserName = "Adventurer";
    let currentPersonaInGame = 'Mika';

    let questHistory = [];      // Array of { narrative: string, action: string } for current quest
    let gameActive = false;
    let isGenerating = false;   // Prevent simultaneous actions
    let questLibrary = [];      // Array of { title, timestamp, history, persona, outcome, genre, archetype, length }
    let currentView = 'prompt'; // 'prompt', 'quest', 'library', 'detail'
    let currentQuestLengthPreference = 'Medium';
    let currentCharacterArchetype = 'Adventurer';
    let currentGenre = 'Fantasy'; // Default genre

    // --- DOM Element References ---
    let initialPromptArea = null;
    let questDisplayArea = null;
    let questChoicesArea = null;
    let questInputArea = null;
    let questTextInput = null;
    let questSendButton = null;
    let questStatusArea = null;
    let libraryViewArea = null;
    let questDetailViewArea = null;
    let genreSelector = null;
    let archetypeSelector = null;
    let lengthSelector = null;
    let customQuestInput = null; // *** NEW: For custom prompt ***

    // --- Helper Functions ---
    function _getCurrentDateString() { return new Date().toISOString().slice(0, 10); }
    function _formatDateForDisplay(timestamp) {
        if (!timestamp) return 'N/A';
        try { return new Date(timestamp).toLocaleString(); }
        catch (e) { return 'Invalid Date'; }
    }
    function _sanitizeHTML(str) { // Simple fallback, assuming index.html provides DOMPurify
        if (typeof DOMPurify !== 'undefined' && DOMPurify.sanitize) {
            // Allow basic formatting tags used in narrative/choices
            return DOMPurify.sanitize(str, { USE_PROFILES: { html: true }, ALLOWED_TAGS: ['strong', 'em', 'b', 'i', 'p', 'br', 'span', 'div'] });
        }
        console.warn("DOMPurify missing in RPG, basic fallback.");
        return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // --- Data Persistence ---
    function _loadLibrary() {
        try {
            const stored = localStorage.getItem(QUEST_LIBRARY_KEY);
            if (stored) {
                questLibrary = JSON.parse(stored);
                // Basic validation and adding default persona if missing
                questLibrary = questLibrary.map(q => ({ ...q, persona: q.persona || 'Mika' }));
                questLibrary.sort((a, b) => b.timestamp - a.timestamp); // Sort newest first
                console.log(`Loaded ${questLibrary.length} quests from library.`);
            } else {
                questLibrary = [];
            }
        } catch (e) {
            console.error("Failed to load RPG library:", e);
            questLibrary = [];
            localStorage.removeItem(QUEST_LIBRARY_KEY);
        }
    }

    function _saveLibrary() {
        try {
            // Prune if library exceeds max size
            if (questLibrary.length > MAX_LIBRARY_ENTRIES) {
                questLibrary.sort((a, b) => b.timestamp - a.timestamp); // Ensure newest are kept
                questLibrary = questLibrary.slice(0, MAX_LIBRARY_ENTRIES);
                console.log(`Pruned RPG library to ${MAX_LIBRARY_ENTRIES} entries.`);
            }
            localStorage.setItem(QUEST_LIBRARY_KEY, JSON.stringify(questLibrary));
            console.log(`Saved ${questLibrary.length} quests.`);
        } catch (e) {
            console.error("Failed to save RPG library:", e);
        }
    }

    // --- Core Logic ---

    // *** UPDATED: _startGame now accepts optional custom prompt ***
    async function _startGame(customPromptText = null) {
        const selectedGenre = customPromptText ? "Custom" : currentGenre; // Mark genre if custom
        const selectedArchetype = currentCharacterArchetype;
        const selectedLength = currentQuestLengthPreference;

        console.log(`Starting RPG Quest: Genre=${selectedGenre}, Archetype=${selectedArchetype}, Length=${selectedLength}`);
        _createGameLayout(); // Set up the display area
        gameActive = true;
        isGenerating = true;
        _setLoadingState(true);
        questHistory = [];

        // Build the initial prompt
        const archetypeTerm = ARCHETYPES[selectedArchetype]?.promptTerm || 'an Adventurer';
        let startingScenario;
        if (customPromptText) {
            startingScenario = `based on this idea from ${currentUserName}: "${customPromptText}". Make sure the quest has a clear goal.`;
        } else {
            const genreTerm = GENRES[selectedGenre]?.promptTerm || 'a fantasy setting';
            startingScenario = `in ${genreTerm}. Create a clear quest goal for them.`;
        }

        const initialPrompt = `[ROLE: You are ${currentPersonaInGame}, the Game Master!] Start an interactive RPG quest for ${currentUserName}, who is playing as ${archetypeTerm}, ${startingScenario}. Describe the opening scene vividly (2 paragraphs) and present the main quest goal clearly. End by giving ${currentUserName} exactly ${MAX_CHOICES_DISPLAYED} distinct action choices as a numbered list (e.g., '1. Choice one').`;

        _appendNarrative(`**(GM ${currentPersonaInGame} is preparing the adventure...)**`, 'system-gamemsg');

        try {
             // *** ACTUAL API CALL ***
            const responseText = await callMikaApiForApp(initialPrompt); // No context needed for start

            if (responseText) {
                const { narrative, choices, questEnded } = _parseGmResponse(responseText); // Process the REAL response

                _clearDisplayArea(); // Clear the "preparing" message
                if (narrative) {
                    questHistory.push({ narrative: narrative, action: "[Start]" }); // Add initial state
                    _appendNarrative(narrative);
                    if (!questEnded && choices.length > 0) {
                        _displayChoices(choices);
                    } else {
                        // Handle API response that ended immediately or gave no choices
                        _appendNarrative(`GM: Hmm, the adventure ended before it began! Maybe try a different setup?`);
                        _showRestartButton();
                        gameActive = false;
                    }
                } else {
                     _appendNarrative("GM: Meeeow! My imagination is fuzzy... Couldn't start the quest. Try again?");
                     _showRestartButton();
                     gameActive = false;
                }
            } else {
                _clearDisplayArea();
                _appendNarrative(`GM: ${currentPersonaInGame === 'Kana' ? 'Failed to generate quest start.' : 'Mrow! Couldn\'t get the adventure started... API error?'} Try again?`);
                _showRestartButton();
                gameActive = false;
            }
        } catch (error) {
             _clearDisplayArea();
             console.error("Error starting RPG quest:", error);
             _appendNarrative(`GM: *Hiss!* Something went wrong starting the quest! (${error}). Try again?`);
             _showRestartButton();
             gameActive = false;
        } finally {
            isGenerating = false;
            _setLoadingState(false);
        }
    }

    // *** NEW: Function to handle starting with custom text ***
    function _startCustomQuest() {
        if (!customQuestInput || isGenerating) return;
        const customText = customQuestInput.value.trim();
        if (!customText) {
            messageCallback('System', `${currentPersonaInGame === 'Kana' ? 'Type something first.' : 'Nyaa~ Tell me your idea first!'}`);
            customQuestInput.placeholder = "Please enter an idea first!";
            customQuestInput.focus();
            return;
        }
        _startGame(customText); // Pass the custom text to _startGame
    }


    // *** UPDATED: _handleUserAction uses real API call ***
    async function _handleUserAction(actionText) {
        if (!gameActive || isGenerating) return;

        // Handle "end" command separately
        const lowerCaseAction = actionText.toLowerCase().trim();
        if (lowerCaseAction === 'end') {
            _appendUserActionToQuest(actionText);
            _appendNarrative(`GM: You decided to end the quest here. Adventure awaits another day!`);
            gameActive = false;
            await _saveCompletedQuest('Ended'); // Mark as ended manually
            _showRestartButton();
            if (questInputArea) questInputArea.style.display = 'none';
            return; // Stop processing
        }


        console.log(`User action (Turn ${questHistory.length}): ${actionText}`);
        _appendUserActionToQuest(actionText);
        if (questTextInput) questTextInput.value = '';
        _displayChoices([]); // Clear old choices

        isGenerating = true;
        _setLoadingState(true);

        // Build context and prompt for API
        const contextTurns = questHistory.slice(-QUEST_CONTEXT_LENGTH);
        // Format context for the API call
        const apiContext = contextTurns
            .filter(turn => turn.action !== "[Start]") // Filter out the starting entry which has no user action
            .flatMap(turn => [
                { role: 'model', parts: [{ text: turn.narrative }] }, // GM narrative = model
                { role: 'user', parts: [{ text: turn.action }] }     // User action = user
            ]);


        const turnCount = questHistory.length; // Current turn number (starts at 1 after first narrative)
        const targetTurns = LENGTHS[currentQuestLengthPreference]?.turns || Infinity;
        let lengthNudge = "";
        // Add nudge slightly before the target to give API a chance to wrap up
        if (targetTurns !== Infinity && turnCount >= targetTurns - 1 ) {
            lengthNudge = ` IMPORTANT: The player prefers a '${currentQuestLengthPreference}' length quest (around ${targetTurns} turns). This is turn ${turnCount}. Guide the narrative towards a conclusion based on their action. If the action naturally leads to the end (success or failure), describe it and write '(Quest Complete)' or '(Quest Failed)' on a new line after the description, instead of offering choices.`;
        }

        const prompt = `[ROLE: You are ${currentPersonaInGame}, the Game Master!] Continue the interactive RPG based on the recent history. The player is ${currentUserName} (${ARCHETYPES[currentCharacterArchetype]?.promptTerm}). Their latest action was: "${actionText}".\n\nDescribe what happens next (1-2 paragraphs) in the ${GENRES[currentGenre]?.promptTerm} setting, maintaining your ${currentPersonaInGame} GM personality. Determine success/failure/consequences narratively based on the action and situation.${lengthNudge} Unless the quest is ending (due to the action or length guidance), give ${currentUserName} exactly ${MAX_CHOICES_DISPLAYED} new, distinct action choices as a numbered list (e.g., '1. Choice one'). Ensure choices make sense.`;

        try {
             // *** ACTUAL API CALL ***
             const responseText = await callMikaApiForApp(prompt, apiContext);

            if (responseText) {
                 const { narrative, choices, questEnded, outcome } = _parseGmResponse(responseText);

                 if (narrative) {
                     questHistory.push({ narrative: narrative, action: actionText }); // Store turn *after* getting response
                     _appendNarrative(narrative);

                     if (questEnded) {
                         _appendNarrative(`GM: ${outcome === 'Failed' ? 'Quest Failed...' : 'Quest Complete!'} ${currentPersonaInGame === 'Mika' ? 'Nyaa~!' : '.'}`);
                         gameActive = false;
                         await _saveCompletedQuest(outcome);
                         _showRestartButton();
                         if (questInputArea) questInputArea.style.display = 'none';
                     } else if (choices.length > 0) {
                         _displayChoices(choices);
                         // Prune history internally if needed (optional)
                         // if (questHistory.length > 20) questHistory = questHistory.slice(-20);
                     } else {
                          _appendNarrative("GM: ...Hmm, I seem to have run out of ideas for choices! Where do we go from here? Maybe type 'end' or try something specific?");
                          // Don't end game, let user type something
                     }
                 } else {
                     // API gave response, but parsing failed to get narrative
                     _appendNarrative(`GM: ${currentPersonaInGame === 'Kana' ? 'My response was garbled.' : 'Meeeow! My crystal ball is fuzzy...'} Try again?`);
                     _displayChoices([]); // Show no choices
                 }

            } else {
                 // API call failed or returned empty
                 _appendNarrative(`GM: ${currentPersonaInGame === 'Kana' ? 'Connection error or empty response.' : 'Mrow! Couldn\'t reach the adventure realm...'} Try again?`);
                 _displayChoices([]); // Show no choices
            }
        } catch (error) {
            console.error("Error processing RPG turn:", error);
            _appendNarrative(`GM: *Hiss!* My GM powers fizzled! Error: ${error}. Try again?`);
            _displayChoices([]); // Show no choices
        } finally {
            isGenerating = false;
            _setLoadingState(false);
             // Refocus input if game is still active
             if (gameActive && questTextInput) {
                questTextInput.focus();
             }
        }
    }

    // _parseGmResponse (remains the same as previous version - might need tweaking based on real API output)
    function _parseGmResponse(responseText) {
        let narrative = responseText || "";
        let choices = [];
        let questEnded = false;
        let outcome = null;

        const endCompleteMarker = "(Quest Complete)";
        const endFailedMarker = "(Quest Failed)";

        if (narrative.includes(endCompleteMarker)) {
            questEnded = true;
            outcome = 'Complete';
            narrative = narrative.replace(endCompleteMarker, "").trim();
        } else if (narrative.includes(endFailedMarker)) {
            questEnded = true;
            outcome = 'Failed';
            narrative = narrative.replace(endFailedMarker, "").trim();
        }

        const lines = narrative.split('\n');
        const potentialChoices = [];
        let narrativeEndIndex = lines.length;

        for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i].trim();
            if (/^\d+\.\s+/.test(line)) {
                 const choiceText = line.replace(/^\d+\.\s*/, '').trim();
                 if (choiceText) potentialChoices.unshift(choiceText);
                 narrativeEndIndex = i;
            } else if (potentialChoices.length > 0) { break; }
            else if (line === "") { narrativeEndIndex = i; }
            else { break; }
        }

        narrative = lines.slice(0, narrativeEndIndex).join('\n').trim();

        if (!questEnded && potentialChoices.length > 0) {
            choices = potentialChoices.slice(0, MAX_CHOICES_DISPLAYED);
        } else { choices = []; }

        if (!narrative && questEnded) { narrative = `(The quest reached its conclusion: ${outcome})`; }

        return { narrative, choices, questEnded, outcome };
    }

    // *** PLACEHOLDER: Needs real implementation ***
     async function _generateQuestTitle(history) {
         if (!apiCaller || !history || history.length === 0) return null;
         console.warn("Quest title generation using API not yet implemented, using default.");
         // Basic Placeholder Logic:
         const firstNarrative = history[0]?.narrative.substring(0, 100) || "Adventure";
         const lastAction = history[history.length-1]?.action || "the End";
         // This would ideally be a prompt to the API
         // const prompt = `Generate a short title (4-8 words) for an RPG quest that started like: "${firstNarrative}..." and involved the action "${lastAction}". Output only the title.`;
         // const titleResponse = await callMikaApiForApp(prompt);
         // if(titleResponse) return titleResponse.replace(/["'*]/g, '');
         await new Promise(resolve => setTimeout(resolve, 100)); // Simulate potential API delay
         return `Quest about ${lastAction.substring(0, 20)}...`; // Very basic default
     }


    async function _saveCompletedQuest(outcome) {
        if (!questHistory || questHistory.length === 0) return;
        console.log("Saving completed quest. Outcome:", outcome);
        let title = `A ${currentGenre} Quest (${_getCurrentDateString()})`; // Default

        try {
            const generatedTitle = await _generateQuestTitle([...questHistory]); // Pass copy
            if (generatedTitle) {
                title = generatedTitle;
            }
        } catch(error) {
             console.error("Error generating quest title:", error);
        }

        const questLog = {
            title: title,
            timestamp: Date.now(),
            history: [...questHistory], // Save copy
            persona: currentPersonaInGame,
            outcome: outcome || 'Ended',
            genre: currentGenre,
            archetype: currentCharacterArchetype,
            length: currentQuestLengthPreference
        };
        questLibrary.push(questLog);
        _saveLibrary();
        // Use messageCallback for system messages outside the app UI
        if(messageCallback) messageCallback('System', `Quest "${title}" saved to log!`);
    }

    // --- UI Rendering ---
    function _clearGameContainer() { if (gameUiContainer) gameUiContainer.innerHTML = ''; initialPromptArea = questDisplayArea = questChoicesArea = questInputArea = questTextInput = questSendButton = questStatusArea = libraryViewArea = questDetailViewArea = genreSelector = archetypeSelector = lengthSelector = customQuestInput = null; }
    function _clearDisplayArea() { if(questDisplayArea) questDisplayArea.innerHTML = ''; }

    // *** UPDATED: _createInitialUI includes custom prompt input ***
    function _createInitialUI() {
        _clearGameContainer();
        currentView = 'prompt';
        gameActive = false;

        initialPromptArea = document.createElement('div');
        initialPromptArea.id = 'rpg-initial-prompt';
        initialPromptArea.style.cssText = `text-align: center; padding: 15px; display: flex; flex-direction: column; align-items: center; height: 100%; box-sizing: border-box; overflow-y: auto;`;

        const title = document.createElement('h3');
        title.textContent = `Let's Go on an Adventure, ${currentUserName}!`;
        title.style.color = 'var(--chat-header-text)';
        initialPromptArea.appendChild(title);

        const setupGrid = document.createElement('div');
        setupGrid.style.display = 'grid';
        setupGrid.style.gridTemplateColumns = 'auto 1fr';
        setupGrid.style.gap = '10px 5px';
        setupGrid.style.alignItems = 'center';
        setupGrid.style.margin = '15px 0';
        setupGrid.style.maxWidth = '400px';

        // Genre Selection
        const genreLabel = document.createElement('label'); genreLabel.textContent = 'Setting: '; genreLabel.style.textAlign = 'right';
        genreSelector = document.createElement('select');
        Object.entries(GENRES).forEach(([key, data]) => { const option = document.createElement('option'); option.value = key; option.textContent = data.display; if (key === currentGenre) option.selected = true; genreSelector.appendChild(option); });
        genreSelector.onchange = (e) => { currentGenre = e.target.value; };
        setupGrid.appendChild(genreLabel); setupGrid.appendChild(genreSelector);

        // Archetype Selection
        const archetypeLabel = document.createElement('label'); archetypeLabel.textContent = 'Your Role: '; archetypeLabel.style.textAlign = 'right';
        archetypeSelector = document.createElement('select');
        Object.entries(ARCHETYPES).forEach(([key, data]) => { const option = document.createElement('option'); option.value = key; option.textContent = data.display; if (key === currentCharacterArchetype) option.selected = true; archetypeSelector.appendChild(option); });
        archetypeSelector.onchange = (e) => { currentCharacterArchetype = e.target.value; };
        setupGrid.appendChild(archetypeLabel); setupGrid.appendChild(archetypeSelector);

        // Length Selection
        const lengthLabel = document.createElement('label'); lengthLabel.textContent = 'Quest Length: '; lengthLabel.style.textAlign = 'right';
        lengthSelector = document.createElement('select');
        Object.entries(LENGTHS).forEach(([key, data]) => { const option = document.createElement('option'); option.value = key; option.textContent = data.display; if (key === currentQuestLengthPreference) option.selected = true; lengthSelector.appendChild(option); });
        lengthSelector.onchange = (e) => { currentQuestLengthPreference = e.target.value; };
        setupGrid.appendChild(lengthLabel); setupGrid.appendChild(lengthSelector);

        initialPromptArea.appendChild(setupGrid);

        // Start Button (for selected options)
        const startButton = document.createElement('button');
        startButton.textContent = 'Start Selected Quest!';
        startButton.className = 'rps-choice-button';
        startButton.style.marginTop = '10px';
        startButton.onclick = () => _startGame(); // No argument = use selected options
        initialPromptArea.appendChild(startButton);

        // *** NEW: Custom Prompt Area ***
        const customArea = document.createElement('div');
        customArea.style.marginTop = '20px';
        customArea.style.width = '100%';
        customArea.style.maxWidth = '450px'; // Limit width
        const customLabel = document.createElement('p');
        customLabel.textContent = 'Or Describe Your Own Quest Idea:';
        customLabel.style.marginBottom = '5px';
        customQuestInput = document.createElement('input');
        customQuestInput.type = 'text';
        customQuestInput.placeholder = 'e.g., Find a lost kitten in a magical forest';
        customQuestInput.style.cssText = `width: 100%; padding: 8px; box-sizing: border-box; margin-bottom: 5px; background-color: var(--input-bg); color: var(--text-color); border: 1px solid var(--input-border); border-radius: 4px;`;
        const customStartButton = document.createElement('button');
        customStartButton.textContent = 'Start Custom Quest!';
        customStartButton.className = 'rps-choice-button secondary'; // Different style maybe
        customStartButton.onclick = _startCustomQuest;
        customArea.appendChild(customLabel);
        customArea.appendChild(customQuestInput);
        customArea.appendChild(customStartButton);
        initialPromptArea.appendChild(customArea);
        // *** END: Custom Prompt Area ***


        // Library Button
        const libraryButton = document.createElement('button');
        libraryButton.textContent = 'View Quest Log 📚';
        libraryButton.className = 'rps-choice-button secondary';
        libraryButton.style.marginTop = '25px'; // Increased margin
        libraryButton.onclick = _createLibraryUI;
        initialPromptArea.appendChild(libraryButton);

        // Back to Chat Button
        const backBtn = document.createElement('button');
        backBtn.id = 'back-to-chat-button';
        backBtn.textContent = 'Back to Chat';
        backBtn.className = 'rps-choice-button secondary'; // Consistent secondary style
        backBtn.style.marginTop = '10px';
        backBtn.onclick = () => { if (typeof switchToChatView === 'function') switchToChatView(); };
        initialPromptArea.appendChild(backBtn);

        gameUiContainer.appendChild(initialPromptArea);
        // Apply common styles to selects
        [genreSelector, archetypeSelector, lengthSelector].forEach(sel => {
            if(sel) { sel.style.padding = '5px'; sel.style.borderRadius = '4px'; sel.style.backgroundColor = 'var(--input-bg)'; sel.style.color = 'var(--text-color)'; sel.style.border = '1px solid var(--input-border)'; }
        });
    }

    function _createGameLayout() {
        _clearGameContainer();
        currentView = 'quest';

        const questWrapper = document.createElement('div');
        questWrapper.id = 'story-wrapper';
        questWrapper.style.cssText = `display: flex; flex-direction: column; height: 100%; width: 100%; box-sizing: border-box;`;

        questDisplayArea = document.createElement('div');
        questDisplayArea.id = 'quest-display-area';
        questDisplayArea.className = 'story-display-area';
        questWrapper.appendChild(questDisplayArea);

        questStatusArea = document.createElement('div');
        questStatusArea.id = 'quest-status-area';
        questStatusArea.className = 'story-status-area';
        questWrapper.appendChild(questStatusArea);

        const interactionArea = document.createElement('div');
        interactionArea.id = 'quest-interaction-area';
        interactionArea.className = 'story-interaction-area';

        questChoicesArea = document.createElement('div');
        questChoicesArea.id = 'quest-choices-area';
        questChoicesArea.className = 'story-choices-area';
        interactionArea.appendChild(questChoicesArea);

        questInputArea = document.createElement('div');
        questInputArea.id = 'quest-input-area';
        questInputArea.className = 'story-input-area';

        questTextInput = document.createElement('input');
        questTextInput.type = 'text';
        questTextInput.placeholder = 'Type your action... (or "end" to quit)';
        questTextInput.className = 'story-text-input';
        questTextInput.onkeypress = (e) => { if (e.key === 'Enter' && gameActive && !isGenerating && questTextInput.value.trim()) { e.preventDefault(); _handleUserAction(questTextInput.value.trim()); } };

        questSendButton = document.createElement('button');
        questSendButton.textContent = 'Do It!';
        questSendButton.className = 'story-send-button rps-choice-button';
        questSendButton.onclick = () => { if (gameActive && !isGenerating && questTextInput.value.trim()) { _handleUserAction(questTextInput.value.trim()); } };

        questInputArea.appendChild(questTextInput);
        questInputArea.appendChild(questSendButton);
        interactionArea.appendChild(questInputArea);

        questWrapper.appendChild(interactionArea);
        gameUiContainer.appendChild(questWrapper);
    }

    function _appendNarrative(text, cssClass = null) {
        if (!questDisplayArea) return;
        const paragraph = document.createElement('p');
        if (cssClass) paragraph.className = cssClass;

        if (cssClass !== 'user-action') {
            let processedText = _sanitizeHTML(text)
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/(?<!<br>)\n/g, '<br>');
            paragraph.innerHTML = `<strong>${currentPersonaInGame} (GM):</strong> ${processedText}`;
        } else {
            paragraph.innerHTML = text;
        }

        questDisplayArea.appendChild(paragraph);
        setTimeout(() => { if (questDisplayArea) questDisplayArea.scrollTop = questDisplayArea.scrollHeight; }, 50);
    }

    function _appendUserActionToQuest(actionText) {
        if (!questDisplayArea) return;
        const sanitizedAction = _sanitizeHTML(actionText);
        const formattedText = `> ${currentUserName}: ${sanitizedAction}`;
        _appendNarrative(formattedText, 'user-action');
    }

    function _displayChoices(choices) {
        if (!questChoicesArea) return;
        questChoicesArea.innerHTML = '';
        if (!choices || choices.length === 0) return;

        choices.forEach((choiceText, index) => {
            const button = document.createElement('button');
            const cleanChoiceText = choiceText.replace(/^[\*\-\d]+\.?\s*/, '').trim();
            button.className = 'rps-choice-button story-choice';
            button.onclick = () => _handleUserAction(cleanChoiceText);

            const textSpan = document.createElement('span');
            textSpan.textContent = `${index + 1}. ${cleanChoiceText}`;
            textSpan.className = 'scrollable-text';
            button.appendChild(textSpan);
            questChoicesArea.appendChild(button);
            // Add text scrolling logic if desired
        });
    }

    function _setLoadingState(isLoading) {
        isGenerating = isLoading;
        if (questTextInput) questTextInput.disabled = isLoading;
        if (questSendButton) questSendButton.disabled = isLoading;
        if (questChoicesArea) questChoicesArea.querySelectorAll('button').forEach(button => button.disabled = isLoading);
        if (initialPromptArea) initialPromptArea.querySelectorAll('button, select, input').forEach(el => el.disabled = isLoading);

        if (questStatusArea) {
            questStatusArea.textContent = isLoading ? (currentPersonaInGame === 'Kana' ? 'Calculating fate...' : 'GM is thinking... *rolls dice*') : '';
            questStatusArea.style.display = isLoading ? 'block' : 'none';
        }
    }

    function _showRestartButton(buttonText = null) {
        const interactionArea = document.getElementById('quest-interaction-area');
        if (interactionArea) {
            if (questChoicesArea) questChoicesArea.innerHTML = '';
            if (questInputArea) questInputArea.style.display = 'none';

            const container = document.createElement('div');
            container.style.textAlign = 'center';
            container.style.marginTop = '15px';

            const newQuestBtn = document.createElement('button');
            newQuestBtn.textContent = buttonText || (currentPersonaInGame === 'Kana' ? "New Quest." : "New Quest? ♡");
            newQuestBtn.className = 'rps-choice-button';
            newQuestBtn.style.marginRight = '10px';
            newQuestBtn.onclick = _createInitialUI;
            container.appendChild(newQuestBtn);

            const backBtn = document.createElement('button');
             backBtn.id = 'back-to-chat-button';
             backBtn.textContent = 'Back to Chat';
             backBtn.className = 'rps-choice-button secondary';
             backBtn.onclick = () => { if (typeof switchToChatView === 'function') switchToChatView(); };
             container.appendChild(backBtn);

            if (questChoicesArea) { questChoicesArea.appendChild(container); }
            else { interactionArea.appendChild(container); }
        }
    }

    // --- Library UI Functions ---
    function _createLibraryUI() {
         _clearGameContainer();
         currentView = 'library';
         libraryViewArea = document.createElement('div');
         libraryViewArea.className = 'library-view';

         const title = document.createElement('h2');
         title.textContent = 'Quest Log 📚';
         title.className = 'library-title';
         libraryViewArea.appendChild(title);

         const backButton = document.createElement('button');
         backButton.textContent = '← Back to Quest Setup';
         backButton.className = 'rps-choice-button secondary library-back-button';
         backButton.onclick = _createInitialUI;
         libraryViewArea.appendChild(backButton);

         const listContainer = document.createElement('div');
         listContainer.id = 'quest-library-list-container';
         libraryViewArea.appendChild(listContainer);

         gameUiContainer.appendChild(libraryViewArea);
         _renderLibraryList(listContainer);
    }

    function _renderLibraryList(container) {
        container.innerHTML = '';
        if (questLibrary.length === 0) {
            container.innerHTML = `<p style="text-align: center; font-style: italic; color: var(--system-message-text);">No quests recorded yet. Go have an adventure!</p>`;
            return;
        }
        questLibrary.forEach((quest, index) => { // Use index directly as it's sorted on load
            const itemDiv = document.createElement('div');
            itemDiv.className = 'library-item';
            itemDiv.onclick = () => _createQuestDetailView(index);

            const titleSpan = document.createElement('span');
            titleSpan.className = 'library-item-title';
            titleSpan.textContent = `${quest.title || `Quest ${questLibrary.length - index}`}`;
             if (quest.outcome === 'Complete') titleSpan.textContent += ' (✔️)';
             else if (quest.outcome === 'Failed') titleSpan.textContent += ' (❌)';
             else titleSpan.textContent += ' (?)';
            itemDiv.appendChild(titleSpan);

            const dateSpan = document.createElement('span');
            dateSpan.className = 'library-item-date';
            const genreDisplay = GENRES[quest.genre]?.display || quest.genre || 'Unknown Genre';
            const archetypeDisplay = ARCHETYPES[quest.archetype]?.display || quest.archetype || 'Unknown Role';
            dateSpan.textContent = `${genreDisplay} | ${archetypeDisplay} | GM: ${quest.persona} | ${_formatDateForDisplay(quest.timestamp)}`;
            itemDiv.appendChild(dateSpan);

            container.appendChild(itemDiv);
        });
    }

     function _createQuestDetailView(questIndex) {
         _clearGameContainer();
         currentView = 'detail';
         const quest = questLibrary[questIndex]; // Access using index from sorted list
         if (!quest) {
             console.error(`Quest with index ${questIndex} not found in sorted library.`);
             _createLibraryUI(); return;
         }

         const writerPersona = quest.persona || 'Mika';

         questDetailViewArea = document.createElement('div');
         questDetailViewArea.className = 'story-detail-view';

         const title = document.createElement('h3');
         title.textContent = quest.title || `Quest ${questLibrary.length - questIndex}`;
         questDetailViewArea.appendChild(title);

         const outcomeText = document.createElement('p');
         outcomeText.style.textAlign = 'center';
         outcomeText.style.fontWeight = 'bold';
         if (quest.outcome === 'Complete') { outcomeText.textContent = 'Outcome: Success! ✔️'; outcomeText.style.color = 'lightgreen'; }
         else if (quest.outcome === 'Failed') { outcomeText.textContent = 'Outcome: Failed! ❌'; outcomeText.style.color = 'var(--error-color)'; }
         else { outcomeText.textContent = 'Outcome: Ended (?)'; outcomeText.style.color = 'var(--system-message-text)'; }
         questDetailViewArea.appendChild(outcomeText);

         const backButton = document.createElement('button');
         backButton.textContent = '← Back to Quest Log';
         backButton.className = 'rps-choice-button secondary library-back-button';
         backButton.onclick = _createLibraryUI;
         questDetailViewArea.appendChild(backButton);

         // Render quest history
         quest.history.forEach(turn => {
             if (turn.action === "[Start]") {
                 const narrativeP = document.createElement('p');
                 let processedText = _sanitizeHTML(turn.narrative).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/(?<!<br>)\n/g, '<br>');
                 narrativeP.innerHTML = `<strong>${writerPersona} (GM):</strong> ${processedText}`;
                 questDetailViewArea.appendChild(narrativeP);
             } else {
                 const actionP = document.createElement('p');
                 actionP.className = 'detail-user-action';
                 actionP.innerHTML = `> ${currentUserName}: ${_sanitizeHTML(turn.action)}`;
                 questDetailViewArea.appendChild(actionP);

                 const narrativeP = document.createElement('p');
                 let processedText = _sanitizeHTML(turn.narrative).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/(?<!<br>)\n/g, '<br>');
                 narrativeP.innerHTML = `<strong>${writerPersona} (GM):</strong> ${processedText}`;
                 questDetailViewArea.appendChild(narrativeP);
             }
         });

         gameUiContainer.appendChild(questDetailViewArea);
         if (questDetailViewArea) questDetailViewArea.scrollTop = 0;
     }


    // --- Initialization and Exit ---
    function init(_gameUiContainer, _messageCallback, _apiCaller, userName, persona) {
        console.log("Initializing RPG Adventure App...");
        gameUiContainer = _gameUiContainer;
        messageCallback = _messageCallback;
        apiCaller = _apiCaller; // Needed for generating quest content
        currentUserName = userName || "Adventurer";
        currentPersonaInGame = persona || 'Mika';
        isGenerating = false;

        if (!gameUiContainer) {
            console.error("RPG App UI container not provided!");
            if(messageCallback) messageCallback('System', 'Error: RPG App UI container missing!');
            return;
        }

        _loadLibrary();
        _createInitialUI(); // Start at the setup screen

        console.log(`RPG App initialized for ${currentUserName} with GM ${currentPersonaInGame}.`);
    }

    function onExit() {
        console.log("RpgApp onExit called.");
        questHistory = [];
        gameActive = false;
        isGenerating = false;
        currentView = 'prompt';
        return Promise.resolve(true);
    }

    // --- Public Interface ---
    return {
        init: init,
        onExit: onExit
    };

})();

// --- END OF FILE rpg.js ---