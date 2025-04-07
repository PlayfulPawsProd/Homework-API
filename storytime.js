// --- START OF FILE storytime.js ---

// Nyaa~! Mika's Story Time! Let's Make an Adventure, {user}! 📖♡
// ** UPDATED with Persona Switching, Length Options, and "End" Command **

const StoryTime = (() => {
    // --- Settings ---
    const STORY_CONTEXT_LENGTH = 3; // How many previous turns to send to API for context
    const MAX_CHOICES = 3;          // How many choices to request from the API
    const LIBRARY_STORAGE_KEY = 'mikaStoryLibrary_v1';
    // Define turn counts for nudges (Adjusted based on user feedback for stronger ending)
    const MIN_TURNS_FOR_SHORT_NUDGE = 4;  // Start nudge earlier for short
    const MIN_TURNS_FOR_MEDIUM_NUDGE = 7; // Nudge around turn 7/8
    const MIN_TURNS_FOR_LONG_NUDGE = 11;  // Nudge around turn 11/12
    const MAX_LIBRARY_ENTRIES = 30;     // Limit library size

    // --- State ---
    let gameUiContainer = null;
    let messageCallback = null;
    let apiCaller = null;
    let currentUserName = "User"; // Updated via init
    let currentPersonaInGame = 'Mika'; // Store current persona
    let storyHistory = [];           // { story: string, choice: string } - Turns of the current story
    let currentChoices = [];         // Stores the last set of choices offered to the user
    let gameActive = false;
    let isAssistantGenerating = false; // Prevent simultaneous actions while API is working
    let storyLibrary = [];           // { title, timestamp, history, persona } - Saved stories
    let currentView = 'prompt';      // Tracks current UI view ('prompt', 'story', 'library', 'detail')
    let currentStoryLengthPreference = 'Medium'; // 'Short', 'Medium', 'Long', 'Endless' - Default

    // --- DOM Element References ---
    // (References assigned dynamically in UI creation functions)
    let storyDisplayArea = null;
    let storyChoicesArea = null;
    let storyInputArea = null;
    let storyTextInput = null;
    let storySendButton = null;
    let storyStatusArea = null;
    let initialPromptArea = null;
    let libraryViewArea = null;
    let storyDetailViewArea = null;
    let customPromptInput = null;

    // --- Helper Functions ---
    function _sendMessageToLog(text, sender = 'System') {
        // Uses the main message log (outside the game UI - in index.html)
        // This function is now less likely to be called for displaying errors within the story itself
        if (messageCallback) {
            messageCallback(sender, text);
        } else {
            console.log(`StoryTime SysMsg (${sender}):`, text);
        }
    }
    function _sanitizeHTML(str) { // Simple fallback, assuming index.html provides DOMPurify
        if (typeof DOMPurify !== 'undefined' && DOMPurify.sanitize) {
            // Allow basic formatting tags used in narrative/choices
            return DOMPurify.sanitize(str, { USE_PROFILES: { html: true }, ALLOWED_TAGS: ['strong', 'em', 'b', 'i', 'p', 'br', 'span', 'div'] });
        }
        console.warn("DOMPurify missing in StoryTime, basic fallback.");
        return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function _setLoadingState(isLoading) {
        isAssistantGenerating = isLoading;
        // Disable/enable relevant UI elements based on loading state
        if (storyTextInput) storyTextInput.disabled = isLoading;
        if (storySendButton) storySendButton.disabled = isLoading;
        if (storyChoicesArea) {
            storyChoicesArea.querySelectorAll('button').forEach(button => button.disabled = isLoading);
        }
        // Also handle initial prompt area buttons/input if loading during that phase
        if (initialPromptArea) {
             initialPromptArea.querySelectorAll('button, input, select').forEach(el => el.disabled = isLoading); // Include select for length buttons
        }
        // Update status display
        if (storyStatusArea) {
             // ** Set text based on persona **
             storyStatusArea.textContent = isLoading
                ? (currentPersonaInGame === 'Kana' ? 'Generating narrative...' : 'Mika is weaving the tale... *purrrr*')
                : '';
             storyStatusArea.style.display = isLoading ? 'block' : 'none';
        }
    }

    // --- Library Persistence ---
    // ** UPDATED ** Handles loading older entries without persona field
    function _loadLibrary() {
        try {
            const stored = localStorage.getItem(LIBRARY_STORAGE_KEY);
            if (stored) {
                storyLibrary = JSON.parse(stored);
                // Ensure old entries have a default persona
                storyLibrary = storyLibrary.map(story => ({ ...story, persona: story.persona || 'Mika' }));
                // Sort newest first after loading
                storyLibrary.sort((a, b) => b.timestamp - a.timestamp);
                console.log(`Loaded ${storyLibrary.length} stories from the library.`);
            } else {
                storyLibrary = [];
                console.log("No story library found, starting fresh!");
            }
        } catch (e) {
            console.error("Failed to load or parse story library:", e);
            _sendMessageToLog("Mrow! Had trouble reading our story library... starting fresh!", "System");
            storyLibrary = [];
            localStorage.removeItem(LIBRARY_STORAGE_KEY);
        }
    }

    function _saveLibrary() {
        try {
            // Prune if library exceeds max size BEFORE saving
             if (storyLibrary.length > MAX_LIBRARY_ENTRIES) {
                storyLibrary.sort((a, b) => b.timestamp - a.timestamp); // Ensure newest are kept
                storyLibrary = storyLibrary.slice(0, MAX_LIBRARY_ENTRIES);
                console.log(`Pruned story library to ${MAX_LIBRARY_ENTRIES} entries.`);
            }
            localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(storyLibrary));
            console.log(`Saved ${storyLibrary.length} stories to the library.`);
        } catch (e) {
            console.error("Failed to save story library:", e);
            _sendMessageToLog("Meeeow! Couldn't save our newest story to the library... is storage full?", "System");
        }
    }

    // --- UI Rendering Functions ---

    function _clearGameContainer() {
        if (gameUiContainer) gameUiContainer.innerHTML = '';
        // Reset DOM references to avoid stale elements
        storyDisplayArea = storyChoicesArea = storyInputArea = storyTextInput = storySendButton = null;
        storyStatusArea = initialPromptArea = libraryViewArea = storyDetailViewArea = customPromptInput = null;
    }

    function _createInitialUI() {
        _clearGameContainer();
        currentView = 'prompt';
        gameActive = false;

        initialPromptArea = document.createElement('div');
        initialPromptArea.id = 'story-initial-prompt'; // Matches CSS

        const title = document.createElement('h3');
        title.textContent = (currentPersonaInGame === 'Kana') ? `Story time, ${currentUserName}. Choose or type.` : `Ready for an adventure, ${currentUserName}?! ♡`;
        initialPromptArea.appendChild(title);

        const promptText = document.createElement('p');
        promptText.textContent = (currentPersonaInGame === 'Kana') ? 'Pick a genre, length, view the library, or give me your own idea. Try not to make it boring.' : 'What kind of story should we have today? Pick a genre, choose a length, view our library, or tell me your idea!';
        initialPromptArea.appendChild(promptText);

        // Length Selection
        const lengthContainer = document.createElement('div');
        lengthContainer.style.marginBottom = '15px'; lengthContainer.style.textAlign = 'center';
        const lengthLabel = document.createElement('span');
        lengthLabel.textContent = 'Story Length: '; lengthLabel.style.marginRight = '5px'; lengthLabel.style.fontWeight = 'bold';
        lengthContainer.appendChild(lengthLabel);
        const lengths = { 'Short': 'Short (≈4-6 turns)', 'Medium': 'Medium (≈7-10 turns)', 'Long': 'Long (≈11-15 turns)', 'Endless': 'Endless~ ☆' };
        Object.entries(lengths).forEach(([key, text]) => {
            const button = document.createElement('button');
            button.textContent = text; button.dataset.lengthKey = key;
            button.className = 'rps-choice-button secondary length-button';
            button.onclick = () => {
                currentStoryLengthPreference = key;
                lengthContainer.querySelectorAll('.length-button').forEach(btn => { btn.classList.add('secondary'); btn.classList.remove('selected-length'); });
                button.classList.remove('secondary'); button.classList.add('selected-length');
                console.log(`Story length set to: ${currentStoryLengthPreference}`);
            };
            if (key === currentStoryLengthPreference) { button.classList.remove('secondary'); button.classList.add('selected-length'); }
            lengthContainer.appendChild(button);
        });
        initialPromptArea.appendChild(lengthContainer);

        // Genre Buttons
        const genreButtonContainer = document.createElement('div');
        const genres = ['Magical Quest ✨', 'Spooky Mystery 👻', 'Sci-Fi Exploration 🚀', 'Slice of Life 🌸', 'Surprise Me! 🎉'];
        genres.forEach(genre => {
            const button = document.createElement('button'); button.textContent = genre; button.className = 'rps-choice-button';
            button.onclick = () => _startGame(genre.replace(/[\s✨👻🚀🌸🎉]/g, ''));
            genreButtonContainer.appendChild(button);
        });
        initialPromptArea.appendChild(genreButtonContainer);

        // Custom Prompt Input
        customPromptInput = document.createElement('input');
        customPromptInput.type = 'text'; customPromptInput.id = 'story-custom-prompt-input';
        customPromptInput.placeholder = 'Or type your own adventure idea here!';
        initialPromptArea.appendChild(customPromptInput);

        // Custom Start Button
        const customStartButton = document.createElement('button');
        customStartButton.textContent = 'Start My Idea!'; customStartButton.className = 'rps-choice-button';
        customStartButton.style.marginTop = '10px'; customStartButton.onclick = _startCustomStory;
        initialPromptArea.appendChild(customStartButton);

        // Library Button
        const libraryButton = document.createElement('button');
        libraryButton.textContent = 'View Library 📚'; libraryButton.className = 'rps-choice-button secondary';
        libraryButton.style.marginTop = '15px'; libraryButton.onclick = _showLibraryView;
        initialPromptArea.appendChild(libraryButton);

         // Add back button
         const backBtn = document.createElement('button');
         backBtn.id = 'back-to-chat-button'; // Reuse ID
         backBtn.textContent = 'Back to Chat';
         backBtn.className = 'rps-choice-button secondary'; // Keep style consistent
         backBtn.style.marginTop = '20px'; // Add space
         backBtn.onclick = () => { if (typeof switchToChatView === 'function') switchToChatView(); };
         initialPromptArea.appendChild(backBtn);


        gameUiContainer.appendChild(initialPromptArea);
    }

    function _createGameLayout() {
        _clearGameContainer();
        currentView = 'story';

        const storyWrapper = document.createElement('div');
        storyWrapper.id = 'story-wrapper'; // Matches CSS

        storyDisplayArea = document.createElement('div');
        storyDisplayArea.id = 'story-display-area'; // Matches CSS
        storyDisplayArea.className = 'story-display-area';
        storyWrapper.appendChild(storyDisplayArea);

        storyStatusArea = document.createElement('div');
        storyStatusArea.id = 'story-status-area'; // Matches CSS
        storyStatusArea.className = 'story-status-area';
        storyWrapper.appendChild(storyStatusArea);

        const interactionArea = document.createElement('div');
        interactionArea.id = 'story-interaction-area'; // Matches CSS
        interactionArea.className = 'story-interaction-area';

        storyChoicesArea = document.createElement('div');
        storyChoicesArea.id = 'story-choices-area'; // Matches CSS
        storyChoicesArea.className = 'story-choices-area';
        interactionArea.appendChild(storyChoicesArea);

        storyInputArea = document.createElement('div');
        storyInputArea.id = 'story-input-area'; // Matches CSS
        storyInputArea.className = 'story-input-area';

        storyTextInput = document.createElement('input');
        storyTextInput.type = 'text';
        storyTextInput.placeholder = 'Or type your own action... (type "end" to finish)'; // Updated placeholder
        storyTextInput.className = 'story-text-input'; // Matches CSS
        storyTextInput.onkeypress = (e) => {
             if (e.key === 'Enter' && gameActive && !isAssistantGenerating && storyTextInput.value.trim()) {
                 e.preventDefault();
                 _handleUserAction(storyTextInput.value.trim());
             }
        };

        storySendButton = document.createElement('button');
        storySendButton.textContent = 'Do It!';
        storySendButton.className = 'story-send-button rps-choice-button'; // Matches CSS
        storySendButton.onclick = () => {
            if (gameActive && !isAssistantGenerating && storyTextInput.value.trim()) {
                _handleUserAction(storyTextInput.value.trim());
            }
        };

        storyInputArea.appendChild(storyTextInput);
        storyInputArea.appendChild(storySendButton);
        interactionArea.appendChild(storyInputArea);

        storyWrapper.appendChild(interactionArea);
        gameUiContainer.appendChild(storyWrapper);
    }

    function _appendStoryParagraph(text, cssClass = null) {
        if (!storyDisplayArea) return;
        const paragraph = document.createElement('p');
        if (cssClass) paragraph.className = cssClass;

        if (cssClass !== 'user-action') {
            let processedText = _sanitizeHTML(text)
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/(?<!<br>)\n/g, '<br>');
            paragraph.innerHTML = `<strong>${currentPersonaInGame}:</strong> ${processedText}`;
        } else {
            paragraph.innerHTML = text; // Assumes text is already formatted/sanitized
        }

        storyDisplayArea.appendChild(paragraph);
        setTimeout(() => { if(storyDisplayArea) storyDisplayArea.scrollTop = storyDisplayArea.scrollHeight; }, 50);
    }

     function _appendUserActionToStory(actionText) {
         if (!storyDisplayArea) return;
         const sanitizedAction = _sanitizeHTML(actionText);
         const formattedText = `> ${currentUserName}: ${sanitizedAction}`;
         _appendStoryParagraph(formattedText, 'user-action');
     }

    // Updated with scrolling logic
    function _displayChoices(choices) {
        if (!storyChoicesArea) return;
        storyChoicesArea.innerHTML = '';
        if (!choices || choices.length === 0) { return; }
        currentChoices = choices; // Store the current choices
        choices.slice(0, MAX_CHOICES).forEach((choiceText, index) => {
            const button = document.createElement('button');
            const cleanChoiceText = choiceText.replace(/^[\*\-\d]+\.?\s*/, '').trim();
            button.className = 'rps-choice-button story-choice'; // Matches CSS
            button.onclick = () => _handleUserAction(cleanChoiceText);
            const textSpan = document.createElement('span');
            textSpan.textContent = `${index + 1}. ${cleanChoiceText}`;
            textSpan.className = 'scrollable-text'; // Matches CSS for potential scrolling
            button.appendChild(textSpan);
            storyChoicesArea.appendChild(button);

            // Check for text overflow to apply scrolling animation after the element is rendered
            requestAnimationFrame(() => {
                 if (!button.isConnected) return; // Ensure button is still in the DOM
                 const computedStyle = window.getComputedStyle(button);
                 const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
                 const paddingRight = parseFloat(computedStyle.paddingRight) || 0;
                 const availableWidth = button.clientWidth - paddingLeft - paddingRight;
                 const textWidth = textSpan.scrollWidth;

                 if (textWidth > availableWidth + 1) { // +1 for safety margin
                     button.classList.add('text-overflow-scroll'); // Add class from CSS
                     const scrollDistance = availableWidth - textWidth;
                     // Set CSS variable used by the animation
                     button.style.setProperty('--scroll-distance', `${scrollDistance - 5}px`); // Add a little extra padding

                     // Dynamically adjust animation duration based on overflow amount
                     const overflowAmount = textWidth - availableWidth;
                     const baseDuration = 6; // Minimum duration in seconds
                     const extraPerPixel = 0.06; // Extra seconds per pixel of overflow
                     let duration = Math.max(6, baseDuration + overflowAmount * extraPerPixel);
                     duration = Math.min(duration, 25); // Cap duration
                     textSpan.style.animationDuration = `${duration.toFixed(1)}s`;

                     button.title = cleanChoiceText; // Add tooltip for full text
                 } else {
                     button.classList.remove('text-overflow-scroll');
                     button.title = '';
                     button.style.removeProperty('--scroll-distance');
                     textSpan.style.animationDuration = '';
                 }
            });
        });
    }


    // --- Story Progression ---
    function _parseStoryAndChoices(responseText) {
        const lines = (responseText || "").trim().split('\n'); // Handle null/undefined input
        let storyPart = ""; let choices = []; let readingChoices = false;
        const endMarker = "(The End)"; let storyEnded = false;

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.includes(endMarker)) {
                 storyPart += line.replace(endMarker, '').trim() + "\n";
                 storyEnded = true; choices = []; readingChoices = false; break;
             }
            if (/^[\*\-\d]+\.?\s+/.test(trimmedLine)) {
                if (!readingChoices) { readingChoices = true; }
                const choiceText = trimmedLine.replace(/^[\*\-\d]+\.?\s*/, '').trim();
                if(choiceText) choices.push(choiceText);
            } else if (readingChoices && trimmedLine) { storyPart += line + "\n"; }
             else if (!readingChoices) { storyPart += line + "\n"; }
        }
        storyPart = storyPart.trim();
        choices = storyEnded ? [] : choices.slice(0, MAX_CHOICES);
        // Ensure storyPart is not empty if choices exist but no narrative was before them
        if(!storyPart && choices.length > 0 && !storyEnded) {
            storyPart = "(The story continues...)"; // Add a default narrative if missing
        }
        return { storyPart, choices, storyEnded };
    }


    async function _callStoryAPI(prompt, contextTurns = []) {
        if (!apiCaller) {
            _sendMessageToLog("Mrow! Cannot call the magic box!", "System");
            if (storyDisplayArea) _appendStoryParagraph("System Error: Cannot contact the API.", "system-gamemsg");
            _setLoadingState(false); return Promise.reject("API Caller not available");
        }
        _setLoadingState(true);
        const apiContext = contextTurns.flatMap(turn => [
            { role: 'model', parts: [{ text: turn.story }] },
            { role: 'user', parts: [{ text: turn.choice }] }
        ]);
        try { const response = await apiCaller(prompt, apiContext); return response; }
        catch (error) {
            console.error("Story API call failed:", error);
            const errorText = `${currentPersonaInGame === 'Kana' ? 'API error.' : 'Meeeow! The story magic fizzled...'}`;
            if (storyDisplayArea) _appendStoryParagraph(`${errorText} (${error})`, "system-gamemsg");
            return null;
        } finally { _setLoadingState(false); }
    }

    async function _startCustomStory() {
        if (!customPromptInput || isAssistantGenerating) return;
        const customText = customPromptInput.value.trim();
        if (!customText) {
            _sendMessageToLog(currentPersonaInGame === 'Kana' ? "You have to actually type something." : "Hehe~ You need to give me *some* idea!", currentPersonaInGame);
            if (customPromptInput) customPromptInput.placeholder = "Please enter an idea first!"; return;
        }
        await _startGame(customText);
    }

    async function _startGame(promptText) {
        console.log(`Starting story (${currentPersonaInGame}, Length: ${currentStoryLengthPreference}) with prompt: ${promptText.substring(0, 50)}...`);
        _sendMessageToLog(currentPersonaInGame === 'Kana' ? `Starting story for ${currentUserName}. Try to keep up.` : `Okay, ${currentUserName}! Let's begin our adventure! ♡`, currentPersonaInGame);
        _createGameLayout(); gameActive = true; storyHistory = [];

        const isGenre = ['MagicalQuest', 'SpookyMystery', 'SciFiExploration', 'SliceOfLife', 'SurpriseMe'].includes(promptText);
        const startingInstruction = isGenre ? `Start a brand new interactive story in the genre of "${promptText}".` : `Start a brand new interactive story based on this idea from ${currentUserName}: "${promptText}".`;
        const personaPromptPart = (currentPersonaInGame === 'Kana') ? `You are Kana, a sarcastic and witty catgirl telling an interactive story to ${currentUserName}. ${startingInstruction} Describe the opening scene (2-3 paragraphs) with your characteristic dry wit or slightly dark humor.` : `You are Mika, a playful, enthusiastic catgirl telling an interactive story to ${currentUserName}. ${startingInstruction} Describe the opening scene vividly (2-3 paragraphs). Make it exciting!`;
        const initialPrompt = `${personaPromptPart} End the scene by giving ${currentUserName} exactly ${MAX_CHOICES} clear choices for what to do next, presented as a bulleted or numbered list on separate lines (e.g., '* Choice 1\\n* Choice 2'). Make the choices distinct actions.`;

        try {
            const responseText = await _callStoryAPI(initialPrompt);
            if (responseText) {
                const { storyPart, choices, storyEnded } = _parseStoryAndChoices(responseText);
                if(storyPart) {
                    _appendStoryParagraph(storyPart);
                     storyHistory.push({ story: storyPart, choice: "[Start]" });
                }
                 if (storyEnded) {
                     _sendMessageToLog(currentPersonaInGame === 'Kana' ? "Ended already? Weird." : "Huh? It ended right away!", currentPersonaInGame);
                     gameActive = false; await _saveCompletedStory();
                     _showRestartButton(currentPersonaInGame === 'Kana' ? "New Story." : "Start New Story? ♡");
                     if(storyInputArea) storyInputArea.style.display = 'none';
                } else if (choices.length > 0) { _displayChoices(choices); }
                else { // No choices and no end marker - API might have failed to follow instructions
                     _appendStoryParagraph(currentPersonaInGame === 'Kana' ? "Couldn't generate a proper start. Try again." : "Meeeow... My story starter is broken! Couldn't begin. Try again?");
                     gameActive = false; _showRestartButton();
                }
            } else {
                 _appendStoryParagraph(currentPersonaInGame === 'Kana' ? "Couldn't start. API failed. Try again." : "Meeeow... My imagination is fuzzy right now. Couldn't start the story. Maybe try again?");
                 gameActive = false; _showRestartButton();
            }
        } catch (error) {
             _appendStoryParagraph(currentPersonaInGame === 'Kana' ? "Error starting story." : "*Hiss!* Something went wrong starting our story! Try again?");
             console.error("Error starting story:", error); gameActive = false; _showRestartButton();
         }
    }

    // *** UPDATED _handleUserAction with stronger length instructions ***
    async function _handleUserAction(actionText) {
        if (!gameActive || isAssistantGenerating) return;

        const lowerCaseAction = actionText.toLowerCase().trim();
        const currentTurn = storyHistory.length;
        const isEndingCommand = lowerCaseAction === "end";

        console.log(`User action (Turn ${currentTurn}, Length: ${currentStoryLengthPreference}): ${actionText}`);
        _appendUserActionToStory(actionText);
        if (storyTextInput) storyTextInput.value = '';
        _displayChoices([]);

        const context = storyHistory.slice(-STORY_CONTEXT_LENGTH);
        let prompt = "";

        const personaPromptPart = (currentPersonaInGame === 'Kana')
            ? `You are Kana, a sarcastic and witty catgirl continuing an interactive story for ${currentUserName}. The story so far involved these recent turns (your text then their choice).`
            : `You are Mika, a playful, enthusiastic catgirl continuing an interactive story for ${currentUserName}. The story so far involved these recent turns (your text then their choice).`;

        if (isEndingCommand) {
            const lastStoryPart = context.length > 0 ? context[context.length - 1].story : "the very beginning";
            prompt = `${personaPromptPart} Now, ${currentUserName} has decided to **end the story immediately**. Write a concluding paragraph (1-2 paragraphs) that wraps up the current situation based on the last story segment: "${lastStoryPart.substring(0, 150)}...". Make the ending fitting for the tone of the story (${currentPersonaInGame}). Then write **(The End)** on a new, separate line. Do not offer any choices.`;
            console.log("Generating final prompt due to 'end' command.");
        } else {
            let lengthInstruction = "";
            // *** STRONGER LENGTH INSTRUCTIONS ***
            switch (currentStoryLengthPreference) {
                 case 'Short':
                     if (currentTurn >= MIN_TURNS_FOR_SHORT_NUDGE) lengthInstruction = ` CRITICAL: The user chose a 'Short' story (target ≈${MIN_TURNS_FOR_SHORT_NUDGE+1}-${MIN_TURNS_FOR_SHORT_NUDGE+2} turns). This is turn ${currentTurn}. The story MUST conclude very soon. Guide the narrative definitively towards an ending within the NEXT 1-2 turns. If possible, write '(The End)' on a new line after the narrative THIS turn. Otherwise, provide choices that directly lead to an immediate conclusion.`;
                     break;
                 case 'Medium':
                     if (currentTurn >= MIN_TURNS_FOR_MEDIUM_NUDGE) lengthInstruction = ` REMINDER: The user chose a 'Medium' story (target ≈${MIN_TURNS_FOR_MEDIUM_NUDGE+1}-${MIN_TURNS_FOR_MEDIUM_NUDGE+3} turns). This is turn ${currentTurn}. Start guiding the story towards a conclusion within the next 2-3 turns. Provide choices that progress the plot towards an ending or write '(The End)' if the narrative reaches a natural end point.`;
                     break;
                 case 'Long':
                     if (currentTurn >= MIN_TURNS_FOR_LONG_NUDGE) lengthInstruction = ` NOTE: The user chose a 'Long' story (target ≈${MIN_TURNS_FOR_LONG_NUDGE+1}-${MIN_TURNS_FOR_LONG_NUDGE+4} turns). This is turn ${currentTurn}. Look for opportunities to bring the story to a satisfying conclusion within the next 3-4 turns. Write '(The End)' when appropriate.`;
                     break;
                 case 'Endless': default: lengthInstruction = ""; break;
            }
            // *** END OF STRONGER INSTRUCTIONS ***

            prompt = `${personaPromptPart} Now, ${currentUserName} decided to: "${actionText}". Describe what happens next (2-3 paragraphs) in your distinct voice (${currentPersonaInGame === 'Kana' ? 'dry wit, sarcasm' : 'bubbly, enthusiastic'}). Keep the story engaging and consistent.${lengthInstruction} VERY IMPORTANT: Unless the story is ending, end your response by giving ${currentUserName} exactly ${MAX_CHOICES} new, clear choices as a bulleted or numbered list on separate lines (e.g., '* Choice 1\\n* Choice 2'). Ensure choices are distinct actions. If the story reaches a natural conclusion or dead end based on the action or length guidance, describe it and write **(The End)** on a new line instead of offering choices.`;
        }


        try {
            const apiContext = isEndingCommand && context.length > 0 ? context.slice(-1) : context;
            const responseText = await _callStoryAPI(prompt, apiContext);

            if (responseText) {
                const { storyPart, choices, storyEnded } = _parseStoryAndChoices(responseText);

                 // Add to history *before* checking end state if it wasn't the manual 'end' command
                 // Ensure we have narrative before adding to history
                if (storyPart && !isEndingCommand) {
                     storyHistory.push({ story: storyPart, choice: actionText });
                } else if (storyPart && storyEnded) { // Add final part if ended via '(The End)'
                    storyHistory.push({ story: storyPart, choice: actionText });
                }

                if (storyPart) _appendStoryParagraph(storyPart); // Display narrative


                if (storyEnded) {
                    _sendMessageToLog(currentPersonaInGame === 'Kana' ? "The end. Start another if you want." : "And that's the end of that adventure! Want to start another?", currentPersonaInGame);
                    gameActive = false;
                     // Ensure history includes the final part before saving
                     if (!storyHistory.find(turn => turn.story === storyPart)) { // Add if not already added (e.g., via 'end' cmd)
                        storyHistory.push({ story: storyPart || "(Final narrative)", choice: actionText });
                     }
                     await _saveCompletedStory();
                    _showRestartButton(currentPersonaInGame === 'Kana' ? "New Story." : "Start New Story? ♡");
                    if (storyInputArea) storyInputArea.style.display = 'none';
                } else if (choices.length > 0) {
                    _displayChoices(choices);
                    if (storyHistory.length > 20) { storyHistory = storyHistory.slice(-20); console.log("Pruned story history length."); }
                } else { // No choices and no end marker
                    _appendStoryParagraph(currentPersonaInGame === 'Kana' ? "It seems stuck. Try 'end' or another action." : "Meeeow? I... I'm not sure what happens next! My story magic fizzled! Maybe try a different action, or type 'end' to finish?");
                    _displayChoices(currentChoices); // Re-show last choices as a fallback
                }
            } else {
                _appendStoryParagraph(currentPersonaInGame === 'Kana' ? "Connection fuzzy. Try again or type 'end'." : "Mrow... My crystal ball is cloudy... couldn't see what happens next. Try again, type something different, or type 'end'?");
                _displayChoices(currentChoices); // Re-show last choices
            }
        } catch (error) {
            _appendStoryParagraph(currentPersonaInGame === 'Kana' ? "Error continuing story. Try 'end' maybe?" : "*Whimper* Something went wrong continuing our story! Maybe try typing 'end' or try again?");
            console.error("Error handling user action:", error); _displayChoices(currentChoices); // Re-show last choices
        }
    }

    async function _saveCompletedStory() {
        if (!storyHistory || storyHistory.length === 0) { console.warn("Attempted to save an empty story history."); return; }
        _sendMessageToLog(currentPersonaInGame === 'Kana' ? "Saving story..." : "Saving our adventure to the library...", currentPersonaInGame);
        let title = `A ${currentPersonaInGame} Story (${new Date().toLocaleDateString()})`;

        try {
            const generatedTitle = await _generateStoryTitle([...storyHistory]);
            if (generatedTitle) { title = generatedTitle; console.log("Generated story title:", title); }
             else { console.log("Using default title as generation failed."); }
        } catch (error) {
             console.error("Error during title generation:", error);
             _sendMessageToLog(currentPersonaInGame === 'Kana' ? "Couldn't generate title." : "Couldn't think of a title... it remains a mystery!", currentPersonaInGame);
        }

        const completedStory = { title: title, timestamp: Date.now(), history: [...storyHistory], persona: currentPersonaInGame };
        storyLibrary.push(completedStory); _saveLibrary(); // SaveLibrary now handles pruning
        _sendMessageToLog(`Story "${title}" saved! ${currentPersonaInGame === 'Kana' ? 'It\'s in the library.' : 'You can find it in the library later~ ♡'}`, currentPersonaInGame);
    }

    async function _generateStoryTitle(history) {
        if (!apiCaller || !history || history.length === 0) return null;
        const firstRealChoice = history.find(turn => turn.choice !== "[Start]");
        const firstActionText = firstRealChoice ? firstRealChoice.choice : "the beginning";
        const lastStoryPart = history[history.length - 1]?.story || "the end";
        const contextSummary = `The story started with ${currentUserName} choosing "${firstActionText.substring(0, 50)}..." and ended near: "${lastStoryPart.substring(0, 100)}..."`;
        const personaPromptPart = (currentPersonaInGame === 'Kana') ? `You are Kana. Summarize the essence of this short interactive story based on the context: ${contextSummary}.` : `You are Mika. Summarize the essence of this short interactive story based on the context: ${contextSummary}.`;
        const prompt = `${personaPromptPart} Generate a short, catchy title (4-8 words maximum) suitable for a storybook. Just output the title itself, nothing else.`;
        try {
            const response = await apiCaller(prompt, []);
            if (response && typeof response === 'string') {
                 let cleanTitle = response.trim().replace(/["'*]/g, '');
                  // Basic title case
                  cleanTitle = cleanTitle.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                 if (cleanTitle.length > 0 && cleanTitle.length < 80) { return cleanTitle; }
            }
             console.warn("Generated title was invalid or empty:", response); return null;
        } catch (error) { console.error("API call for story title failed:", error); return null; }
    }

    function _showRestartButton(buttonText = null) {
         const interactionArea = document.getElementById('story-interaction-area');
         if (interactionArea) {
             if (storyChoicesArea) storyChoicesArea.innerHTML = '';
             if (storyInputArea) storyInputArea.style.display = 'none';
             const container = document.createElement('div');
             container.style.textAlign = 'center'; container.style.marginTop = '15px';
             const newStoryBtn = document.createElement('button');
             newStoryBtn.textContent = buttonText || (currentPersonaInGame === 'Kana' ? "New Story." : "Play Again? ♡");
             newStoryBtn.className = 'rps-choice-button'; newStoryBtn.style.marginRight = '10px';
             newStoryBtn.onclick = _createInitialUI;
             container.appendChild(newStoryBtn);
             const backBtn = document.createElement('button');
             backBtn.id = 'back-to-chat-button'; backBtn.textContent = 'Back to Chat';
             backBtn.className = 'rps-choice-button secondary';
             backBtn.onclick = () => { if (typeof switchToChatView === 'function') switchToChatView(); };
             container.appendChild(backBtn);
             if(storyChoicesArea) { storyChoicesArea.appendChild(container); }
             else { interactionArea.appendChild(container); }
         }
     }

    // --- Library UI Functions ---
    function _showLibraryView() {
        _clearGameContainer(); currentView = 'library'; gameActive = false;
        libraryViewArea = document.createElement('div'); libraryViewArea.className = 'library-view';
        const title = document.createElement('h2'); title.textContent = 'Story Library 📚'; title.className = 'library-title';
        libraryViewArea.appendChild(title);
        const backButton = document.createElement('button');
        backButton.textContent = '← Back to Story Prompt'; backButton.className = 'rps-choice-button secondary library-back-button';
        backButton.onclick = _createInitialUI; libraryViewArea.appendChild(backButton);
        const listContainer = document.createElement('div'); listContainer.id = 'library-list-container';
        libraryViewArea.appendChild(listContainer); gameUiContainer.appendChild(libraryViewArea);
        _renderLibraryList(listContainer);
    }

    function _renderLibraryList(container) {
        container.innerHTML = '';
        if (storyLibrary.length === 0) {
            const emptyMsg = document.createElement('p');
            emptyMsg.textContent = currentPersonaInGame === 'Kana' ? "Library empty. Obviously." : "No adventures saved yet... Let's make some memories!";
            emptyMsg.style.textAlign = 'center'; emptyMsg.style.fontStyle = 'italic'; emptyMsg.style.color = 'var(--system-message-text)';
            container.appendChild(emptyMsg); return;
        }
        // Use the already sorted library (newest first)
        storyLibrary.forEach((story, index) => {
            const itemDiv = document.createElement('div'); itemDiv.className = 'library-item';
            itemDiv.onclick = () => _showStoryDetailView(index); // Use index from sorted array
            const titleSpan = document.createElement('span'); titleSpan.className = 'library-item-title';
            titleSpan.textContent = story.title || `Untitled Story (${storyLibrary.length - index})`; // Display index descending for user
            itemDiv.appendChild(titleSpan);
            const dateSpan = document.createElement('span'); dateSpan.className = 'library-item-date';
            const writer = story.persona || 'Mika';
            dateSpan.textContent = `Finished: ${new Date(story.timestamp).toLocaleString()} (by ${writer})`;
            itemDiv.appendChild(dateSpan);
            container.appendChild(itemDiv);
        });
    }

    function _showStoryDetailView(storyIndex) {
        _clearGameContainer(); currentView = 'detail'; gameActive = false;
        const story = storyLibrary[storyIndex]; // Use index from sorted array
        if (!story) {
            console.error(`Story with index ${storyIndex} not found.`); _showLibraryView(); return;
        }
        const writerPersona = story.persona || 'Mika';
        storyDetailViewArea = document.createElement('div'); storyDetailViewArea.className = 'story-detail-view';
        const title = document.createElement('h3'); title.textContent = story.title || `Untitled Story (${storyLibrary.length - storyIndex})`;
        storyDetailViewArea.appendChild(title);
        const backButton = document.createElement('button');
        backButton.textContent = '← Back to Library'; backButton.className = 'rps-choice-button secondary library-back-button';
        backButton.onclick = _showLibraryView; storyDetailViewArea.appendChild(backButton);

        story.history.forEach(turn => {
            if (turn.choice === "[Start]") {
                 const storyP = document.createElement('p');
                 let processedText = _sanitizeHTML(turn.story).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/(?<!<br>)\n/g, '<br>');
                 storyP.innerHTML = `<strong>${writerPersona}:</strong> ${processedText}`;
                 storyDetailViewArea.appendChild(storyP);
            } else {
                 const choiceP = document.createElement('p'); choiceP.className = 'detail-user-action';
                 choiceP.innerHTML = `> ${currentUserName}: ${_sanitizeHTML(turn.choice)}`;
                 storyDetailViewArea.appendChild(choiceP);
                 const storyP = document.createElement('p');
                 // Ensure narrative exists before processing
                 let processedText = turn.story ? _sanitizeHTML(turn.story).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/(?<!<br>)\n/g, '<br>') : "(Narrative missing)";
                 storyP.innerHTML = `<strong>${writerPersona}:</strong> ${processedText}`;
                 storyDetailViewArea.appendChild(storyP);
            }
        });
        gameUiContainer.appendChild(storyDetailViewArea);
        if(storyDetailViewArea) storyDetailViewArea.scrollTop = 0;
    }

    // --- Initialization and Exit ---
    function init(_gameUiContainer, _messageCallback, _apiCaller, userName, persona) {
        gameUiContainer = _gameUiContainer; messageCallback = _messageCallback; apiCaller = _apiCaller;
        currentUserName = userName || "User"; currentPersonaInGame = persona || 'Mika';
        isAssistantGenerating = false;
        if (!gameUiContainer) { console.error("StoryTime Game UI container not provided!"); return; }
        _loadLibrary(); _createInitialUI();
        storyHistory = []; currentChoices = []; gameActive = false; currentView = 'prompt';
    }

    function onExit() {
         console.log("StoryTime onExit called.");
         storyHistory = []; currentChoices = []; gameActive = false; isAssistantGenerating = false; currentView = 'prompt'; currentStoryLengthPreference = 'Medium';
         return Promise.resolve(true);
    }

    // Public interface
    return { init: init, onExit: onExit };

})();

// Fallback Sanitizer
if (typeof DOMPurify === 'undefined') {
    console.warn("DOMPurify not loaded. Using basic HTML escaping as fallback for storytime.");
    window.DOMPurify = { sanitize: (str) => str.replace(/</g, '&lt;').replace(/>/g, '&gt;') };
}
// --- END OF FILE storytime.js ---