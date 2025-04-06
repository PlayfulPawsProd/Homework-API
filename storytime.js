// --- START OF FILE storytime.js ---

// Nyaa~! Mika's Story Time! Let's Make an Adventure, {user}! 📖♡
// ** UPDATED with Persona Switching, Length Options, and "End" Command **

const StoryTime = (() => {
    // --- Settings ---
    const STORY_CONTEXT_LENGTH = 3; // How many previous turns to send to API for context
    const MAX_CHOICES = 3;          // How many choices to request from the API
    const LIBRARY_STORAGE_KEY = 'mikaStoryLibrary_v1';
    const MIN_TURNS_FOR_SHORT_NUDGE = 3;
    const MIN_TURNS_FOR_MEDIUM_NUDGE = 6;
    const MIN_TURNS_FOR_LONG_NUDGE = 10;

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

    // ** UPDATED ** Uses persona-specific loading text
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
             initialPromptArea.querySelectorAll('button, input').forEach(el => el.disabled = isLoading);
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
            localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(storyLibrary));
            console.log(`Saved ${storyLibrary.length} stories to the library.`);
        } catch (e) {
            console.error("Failed to save story library:", e);
            _sendMessageToLog("Meeeow! Couldn't save our newest story to the library... is storage full?", "System");
        }
    }

    // --- UI Rendering Functions ---
    // (Based on the structure implied by original index.html CSS selectors)

    function _clearGameContainer() {
        if (gameUiContainer) gameUiContainer.innerHTML = '';
        // Reset DOM references to avoid stale elements
        storyDisplayArea = storyChoicesArea = storyInputArea = storyTextInput = storySendButton = null;
        storyStatusArea = initialPromptArea = libraryViewArea = storyDetailViewArea = customPromptInput = null;
    }

    // ** UPDATED ** _createInitialUI uses persona for title/text AND ADDS LENGTH BUTTONS
    function _createInitialUI() {
        _clearGameContainer();
        currentView = 'prompt';
        gameActive = false;

        initialPromptArea = document.createElement('div');
        initialPromptArea.id = 'story-initial-prompt'; // Matches CSS

        const title = document.createElement('h3');
        // ** Persona Title **
        title.textContent = (currentPersonaInGame === 'Kana')
            ? `Story time, ${currentUserName}. Choose or type.`
            : `Ready for an adventure, ${currentUserName}?! ♡`;
        initialPromptArea.appendChild(title);

        const promptText = document.createElement('p');
        // ** Persona Text **
        promptText.textContent = (currentPersonaInGame === 'Kana')
            ? 'Pick a genre, length, view the library, or give me your own idea. Try not to make it boring.'
            : 'What kind of story should we have today? Pick a genre, choose a length, view our library, or tell me your idea!';
        initialPromptArea.appendChild(promptText);

        // --- NEW: Length Selection ---
        const lengthContainer = document.createElement('div');
        lengthContainer.style.marginBottom = '15px';
        lengthContainer.style.textAlign = 'center';
        const lengthLabel = document.createElement('span');
        lengthLabel.textContent = 'Story Length: ';
        lengthLabel.style.marginRight = '5px';
        lengthLabel.style.fontWeight = 'bold';
        lengthContainer.appendChild(lengthLabel);

        const lengths = {
            'Short': 'Short (≈4-6 turns)',
            'Medium': 'Medium (≈7-10 turns)',
            'Long': 'Long (≈11-15 turns)',
            'Endless': 'Endless~ ☆'
        };

        Object.entries(lengths).forEach(([key, text]) => {
            const button = document.createElement('button');
            button.textContent = text;
            button.dataset.lengthKey = key; // Store the key ('Short', 'Medium', etc.)
            button.className = 'rps-choice-button secondary length-button'; // Add 'length-button' class for potential styling
            button.style.fontSize = '0.8em';
            button.style.padding = '4px 8px';
            button.style.margin = '0 3px';
            button.onclick = () => {
                currentStoryLengthPreference = key;
                // Update button styles to show selection visually
                lengthContainer.querySelectorAll('.length-button').forEach(btn => {
                    btn.classList.add('secondary'); // Reset others to default secondary style
                    btn.classList.remove('selected-length'); // Remove highlight class if any
                });
                button.classList.remove('secondary'); // Make selected button look primary
                button.classList.add('selected-length'); // Optional: Add a class for more specific styling of the selected button
                console.log(`Story length set to: ${currentStoryLengthPreference}`);
            };
            // Highlight the default/current selection on initial load
            if (key === currentStoryLengthPreference) {
                button.classList.remove('secondary');
                button.classList.add('selected-length');
            }
            lengthContainer.appendChild(button);
        });
        initialPromptArea.appendChild(lengthContainer);
        // --- End of Length Selection ---

        // Genre Buttons container (matches original structure for CSS)
        const genreButtonContainer = document.createElement('div');
        const genres = ['Magical Quest ✨', 'Spooky Mystery 👻', 'Sci-Fi Exploration 🚀', 'Slice of Life 🌸', 'Surprise Me! 🎉'];
        genres.forEach(genre => {
            const button = document.createElement('button');
            button.textContent = genre;
            button.className = 'rps-choice-button'; // Reuses button style from other games
            button.onclick = () => _startGame(genre.replace(/[\s✨👻🚀🌸🎉]/g, '')); // Clean genre name for internal use
            genreButtonContainer.appendChild(button);
        });
        initialPromptArea.appendChild(genreButtonContainer);

        // Custom Prompt Input
        customPromptInput = document.createElement('input');
        customPromptInput.type = 'text';
        customPromptInput.id = 'story-custom-prompt-input'; // Matches CSS
        customPromptInput.placeholder = 'Or type your own adventure idea here!';
        initialPromptArea.appendChild(customPromptInput);

        // Custom Start Button
        const customStartButton = document.createElement('button');
        customStartButton.textContent = 'Start My Idea!';
        customStartButton.className = 'rps-choice-button'; // Reuses button style
        customStartButton.style.marginTop = '10px'; // As per original CSS implication
        customStartButton.onclick = _startCustomStory;
        initialPromptArea.appendChild(customStartButton);

        // Library Button
        const libraryButton = document.createElement('button');
        libraryButton.textContent = 'View Library 📚';
        libraryButton.className = 'rps-choice-button secondary'; // Matches CSS style
        libraryButton.style.marginTop = '15px'; // As per original CSS implication
        libraryButton.onclick = _showLibraryView;
        initialPromptArea.appendChild(libraryButton);

        gameUiContainer.appendChild(initialPromptArea);
    }


    // (Structure based on original index.html CSS for story-wrapper etc.)
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
        storyTextInput.id = 'story-text-input'; // Matches CSS (though maybe unnecessary)
        storyTextInput.placeholder = 'Or type your own action... (type "end" to finish)'; // Updated placeholder
        storyTextInput.className = 'story-text-input'; // Matches CSS
        storyTextInput.onkeypress = (e) => {
             if (e.key === 'Enter' && gameActive && !isAssistantGenerating && storyTextInput.value.trim()) {
                 e.preventDefault();
                 _handleUserAction(storyTextInput.value.trim());
             }
        };

        storySendButton = document.createElement('button');
        storySendButton.id = 'story-send-button'; // Matches CSS (though maybe unnecessary)
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

    // ** UPDATED ** Appends story paragraph with correct persona name prefix
    function _appendStoryParagraph(text, cssClass = null) {
        if (!storyDisplayArea) return;
        const paragraph = document.createElement('p');
        if (cssClass) paragraph.className = cssClass; // Assign class if provided (e.g., for user action)

        // Apply formatting and add persona prefix only if it's not a user action
        if (cssClass !== 'user-action') {
            let processedText = text; // Assume text is from assistant
             // Basic Markdown-like processing + newline handling
             processedText = DOMPurify.sanitize(processedText) // Sanitize first!
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/(?<!<br>)\n/g, '<br>');
            // ** Add Persona Name Prefix **
            paragraph.innerHTML = `<strong>${currentPersonaInGame}:</strong> ${processedText}`;
        } else {
            // For user actions, the calling function formats it correctly
            paragraph.innerHTML = text; // Assumes text is already formatted/sanitized
        }

        storyDisplayArea.appendChild(paragraph);
        // Use setTimeout to ensure scroll happens after render, fixes potential race conditions
        setTimeout(() => { if(storyDisplayArea) storyDisplayArea.scrollTop = storyDisplayArea.scrollHeight; }, 0);
    }

    // ** UPDATED ** _appendUserActionToStory uses currentUserName
     function _appendUserActionToStory(actionText) {
         if (!storyDisplayArea) return;
         const sanitizedAction = DOMPurify.sanitize(actionText);
         // ** Format with currentUserName **
         const formattedText = `> ${currentUserName}: ${sanitizedAction}`;
         _appendStoryParagraph(formattedText, 'user-action'); // Pass the formatted text and class
     }

    // (Auto-scrolling choices logic - unchanged from previous implementation)
    function _displayChoices(choices) {
        if (!storyChoicesArea) return;
        storyChoicesArea.innerHTML = '';
        if (!choices || choices.length === 0) { return; }
        currentChoices = choices; // Store the current choices in case needed later (e.g., after error)
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
    // (_parseStoryAndChoices remains unchanged as it just extracts text)
    function _parseStoryAndChoices(responseText) {
        const lines = responseText.trim().split('\n');
        let storyPart = "";
        let choices = [];
        let readingChoices = false;
        const endMarker = "(The End)"; // Marker indicating the story should end
        let storyEnded = false;

        for (const line of lines) {
            const trimmedLine = line.trim();
            // Check for the end marker explicitly
            if (trimmedLine.includes(endMarker)) {
                 storyPart += line.replace(endMarker, '').trim() + "\n"; // Add text before marker
                 storyEnded = true; // Mark story as ended
                 choices = []; // No choices if story ended
                 readingChoices = false;
                 break; // Stop processing lines once the end is found
             }

            // Identify potential choice lines
            if (/^[\*\-\d]+\.?\s+/.test(trimmedLine)) {
                // If we weren't already reading choices, finalize the story part accumulated so far
                if (!readingChoices) {
                    readingChoices = true;
                }
                const choiceText = trimmedLine.replace(/^[\*\-\d]+\.?\s*/, '').trim();
                if(choiceText) choices.push(choiceText);
            }
            // If we are reading choices, but the line doesn't look like a choice, assume it's story text again
            else if (readingChoices && trimmedLine) {
                 // Maybe the AI added more story text after starting the list? Append it.
                 storyPart += line + "\n";
                 // It's debatable whether to reset readingChoices here. Let's assume AI might interleave.
                 // readingChoices = false; // Option: Force choices to be contiguous
            }
            // If not reading choices, it's part of the main story text
            else if (!readingChoices) {
                 storyPart += line + "\n";
             }
        }
        storyPart = storyPart.trim();
        // Take only the first MAX_CHOICES valid choices found, unless the story ended
        choices = storyEnded ? [] : choices.slice(0, MAX_CHOICES);
        return { storyPart, choices, storyEnded };
    }


    // ** UPDATED ** _callStoryAPI passes context correctly
    async function _callStoryAPI(prompt, contextTurns = []) {
        if (!apiCaller) {
            _sendMessageToLog("Mrow! Cannot call the magic box!", "System");
            // Display error to user within the game UI if possible
            if (storyDisplayArea) _appendStoryParagraph("System Error: Cannot contact the API.", "system-gamemsg");
            _setLoadingState(false);
            return Promise.reject("API Caller not available");
        }
        _setLoadingState(true);

        // Format context for the API call structure expected by api.js
        // Send turns as pairs: assistant's story text, then user's choice/action
        const apiContext = contextTurns.flatMap(turn => [
            // Story part is from the 'model' (assistant)
            { role: 'model', parts: [{ text: turn.story }] },
            // Choice/action is from the 'user'
            { role: 'user', parts: [{ text: turn.choice }] }
        ]);

        try {
            // apiCaller (in index.html) handles passing the currentPersona
            const response = await apiCaller(prompt, apiContext);
            return response; // Return the raw text response
        } catch (error) {
            console.error("Story API call failed:", error);
             // Display a user-friendly error in the story area
             const errorText = `${currentPersonaInGame === 'Kana' ? 'API error.' : 'Meeeow! The story magic fizzled...'}`;
             if (storyDisplayArea) _appendStoryParagraph(`${errorText} (${error})`, "system-gamemsg");
             return null; // Indicate failure
        } finally {
            _setLoadingState(false);
        }
    }

    // ** UPDATED ** _startCustomStory uses persona voice
    async function _startCustomStory() {
        if (!customPromptInput || isAssistantGenerating) return;
        const customText = customPromptInput.value.trim();
        if (!customText) {
             // ** Persona voice **
            _sendMessageToLog(currentPersonaInGame === 'Kana' ? "You have to actually type something." : "Hehe~ You need to give me *some* idea!", currentPersonaInGame);
            // Optionally show a message in the UI too
            if (customPromptInput) customPromptInput.placeholder = "Please enter an idea first!";
            return;
        }
        await _startGame(customText);
    }

    // ** UPDATED ** _startGame uses persona-aware prompt and messaging
    async function _startGame(promptText) {
        console.log(`Starting story (${currentPersonaInGame}, Length: ${currentStoryLengthPreference}) with prompt: ${promptText.substring(0, 50)}...`);
         // ** Persona voice for system log **
        _sendMessageToLog(currentPersonaInGame === 'Kana' ? `Starting story for ${currentUserName}. Try to keep up.` : `Okay, ${currentUserName}! Let's begin our adventure! ♡`, currentPersonaInGame);
        _createGameLayout(); // Set up the story display, input, etc.
        gameActive = true;
        storyHistory = []; // Reset history for the new story

        const isGenre = ['MagicalQuest', 'SpookyMystery', 'SciFiExploration', 'SliceOfLife', 'SurpriseMe'].includes(promptText);
        const startingInstruction = isGenre
            ? `Start a brand new interactive story in the genre of "${promptText}".`
            : `Start a brand new interactive story based on this idea from ${currentUserName}: "${promptText}".`;

        // ** Persona-aware initial prompt **
        const personaPromptPart = (currentPersonaInGame === 'Kana')
            ? `You are Kana, a sarcastic and witty catgirl telling an interactive story to ${currentUserName}. ${startingInstruction} Describe the opening scene (2-3 paragraphs) with your characteristic dry wit or slightly dark humor.`
            : `You are Mika, a playful, enthusiastic catgirl telling an interactive story to ${currentUserName}. ${startingInstruction} Describe the opening scene vividly (2-3 paragraphs). Make it exciting!`;

        // Combine persona, instruction, and choice requirement
        const initialPrompt = `${personaPromptPart} End the scene by giving ${currentUserName} exactly ${MAX_CHOICES} clear choices for what to do next, presented as a bulleted list on separate lines (e.g., '* Choice 1\\n* Choice 2'). Make the choices distinct actions.`;

        try {
            const responseText = await _callStoryAPI(initialPrompt); // No context needed for the start
            if (responseText) {
                const { storyPart, choices, storyEnded } = _parseStoryAndChoices(responseText);
                if(storyPart) _appendStoryParagraph(storyPart); // Appends with persona name prefix

                // It's unlikely the story ends immediately, but handle it just in case
                if (storyEnded) {
                     _sendMessageToLog(currentPersonaInGame === 'Kana' ? "Ended already? Weird." : "Huh? It ended right away!", currentPersonaInGame);
                     gameActive = false;
                     await _saveCompletedStory();
                     _showRestartButton(currentPersonaInGame === 'Kana' ? "New Story." : "Start New Story? ♡");
                     if(storyInputArea) storyInputArea.style.display = 'none';
                } else if (choices.length > 0) {
                    _displayChoices(choices);
                    storyHistory.push({ story: storyPart, choice: "[Start]" }); // Mark the start
                } else {
                    // API failed to provide choices or story part
                     _appendStoryParagraph(currentPersonaInGame === 'Kana' ? "Couldn't generate a proper start. Try again." : "Meeeow... My story starter is broken! Couldn't begin. Try again?");
                     gameActive = false;
                     _showRestartButton();
                }
            } else {
                 _appendStoryParagraph(currentPersonaInGame === 'Kana' ? "Couldn't start. API failed. Try again." : "Meeeow... My imagination is fuzzy right now. Couldn't start the story. Maybe try again?");
                 gameActive = false;
                 _showRestartButton();
            }
        } catch (error) {
             _appendStoryParagraph(currentPersonaInGame === 'Kana' ? "Error starting story." : "*Hiss!* Something went wrong starting our story! Try again?");
             console.error("Error starting story:", error);
             gameActive = false;
             _showRestartButton();
         }
    }

    // ** UPDATED ** _handleUserAction uses persona-aware prompt, length nudges, and "end" command
    async function _handleUserAction(actionText) {
        if (!gameActive || isAssistantGenerating) return;

        const lowerCaseAction = actionText.toLowerCase().trim();
        const currentTurn = storyHistory.length; // Turn number (starts at 1 after first API call)
        const isEndingCommand = lowerCaseAction === "end";

        console.log(`User action (Turn ${currentTurn}, Length: ${currentStoryLengthPreference}): ${actionText}`);
        _appendUserActionToStory(actionText); // Displays user action correctly with name
        if (storyTextInput) storyTextInput.value = ''; // Clear input after submission
        _displayChoices([]); // Clear old choices while generating

        const context = storyHistory.slice(-STORY_CONTEXT_LENGTH); // Get recent history for context
        let prompt = ""; // Initialize prompt variable

        // --- Build the Prompt ---
        const personaPromptPart = (currentPersonaInGame === 'Kana')
            ? `You are Kana, a sarcastic and witty catgirl continuing an interactive story for ${currentUserName}. The story so far involved these recent turns (your text then their choice).`
            : `You are Mika, a playful, enthusiastic catgirl continuing an interactive story for ${currentUserName}. The story so far involved these recent turns (your text then their choice).`;

        if (isEndingCommand) {
            // *** Handle "end" command ***
            const lastStoryPart = context.length > 0 ? context[context.length - 1].story : "the very beginning";
            // Ask the AI to write a concluding paragraph based on the last known situation
            prompt = `${personaPromptPart} Now, ${currentUserName} has decided to **end the story immediately**. Write a concluding paragraph (1-2 paragraphs) that wraps up the current situation based on the last story segment: "${lastStoryPart.substring(0, 150)}...". Make the ending fitting for the tone of the story (${currentPersonaInGame}). Then write **(The End)** on a new, separate line. Do not offer any choices.`;
            console.log("Generating final prompt due to 'end' command.");

        } else {
            // *** Normal continuation prompt with length nudge ***
            let lengthInstruction = "";
            // Determine if a length nudge is needed based on preference and turn count
            switch (currentStoryLengthPreference) {
                case 'Short':
                    if (currentTurn >= MIN_TURNS_FOR_SHORT_NUDGE) lengthInstruction = `The story should wrap up soon, aim to conclude naturally within the next 1-2 turns. Provide choices that lead towards an ending, or write '(The End)' if appropriate.`;
                    break;
                case 'Medium':
                    if (currentTurn >= MIN_TURNS_FOR_MEDIUM_NUDGE) lengthInstruction = `The story is getting longer, start guiding it towards a conclusion within the next 2-4 turns. Provide choices that progress the plot towards an end, or write '(The End)' if appropriate.`;
                    break;
                case 'Long':
                    if (currentTurn >= MIN_TURNS_FOR_LONG_NUDGE) lengthInstruction = `The story is quite long now. Look for opportunities to bring it to a satisfying conclusion within the next 3-5 turns, or write '(The End)'.`;
                    break;
                case 'Endless':
                default:
                    lengthInstruction = ""; // No nudge for Endless or unknown preference
                    break;
            }

            // Combine persona, action, length guidance, and choice requirement
            prompt = `${personaPromptPart} Now, ${currentUserName} decided to: "${actionText}". Describe what happens next (2-3 paragraphs) in your distinct voice (${currentPersonaInGame === 'Kana' ? 'dry wit, sarcasm' : 'bubbly, enthusiastic'}). Keep the story engaging and consistent. ${lengthInstruction} VERY IMPORTANT: Unless the story is ending, end your response by giving ${currentUserName} exactly ${MAX_CHOICES} new, clear choices as a bulleted list on separate lines (e.g., '* Choice 1\\n* Choice 2'). Ensure choices are distinct actions. If the story reaches a natural conclusion or dead end based on the action or length guidance, describe it and write **(The End)** on a new line instead of offering choices.`;
        }
        // --- End of Prompt Building ---


        try {
            // Call the API with the constructed prompt and relevant context
            // For the 'end' command, sending just the last turn might be enough context for the conclusion.
            const apiContext = isEndingCommand && context.length > 0 ? context.slice(-1) : context;
            const responseText = await _callStoryAPI(prompt, apiContext);

            if (responseText) {
                const { storyPart, choices, storyEnded } = _parseStoryAndChoices(responseText);
                if (storyPart) _appendStoryParagraph(storyPart); // Appends story text with persona name prefix

                // Add the current turn to history *before* checking the end state,
                // so the final paragraph is included if the story ends now.
                 if (!isEndingCommand) { // Only add if it wasn't the manual 'end' command (that adds history later)
                     storyHistory.push({ story: storyPart, choice: actionText });
                 } else if (storyEnded) { // Specifically for the 'end' command that successfully ended
                     storyHistory.push({ story: storyPart, choice: actionText }); // Add the final generated part
                 }

                if (storyEnded) {
                    // Story ended naturally or via 'end' command response
                    // ** Persona voice **
                    _sendMessageToLog(currentPersonaInGame === 'Kana' ? "The end. Start another if you want." : "And that's the end of that adventure! Want to start another?", currentPersonaInGame);
                    gameActive = false;
                    await _saveCompletedStory(); // Save the complete history
                    // ** Persona button text **
                    _showRestartButton(currentPersonaInGame === 'Kana' ? "New Story." : "Start New Story? ♡");
                    if (storyInputArea) storyInputArea.style.display = 'none'; // Hide input area on story end
                } else if (choices.length > 0) {
                    // Story continues, display new choices
                    _displayChoices(choices);
                     // Simple history pruning to prevent it getting too large
                     if (storyHistory.length > 20) { // Keep a reasonable amount of history
                         storyHistory = storyHistory.slice(-20);
                         console.log("Pruned story history length.");
                     }
                } else {
                    // API responded but gave no choices and no end marker (likely an error or ignored instruction)
                    // ** Persona voice **
                    _appendStoryParagraph(currentPersonaInGame === 'Kana' ? "It seems stuck. Try 'end' or another action." : "Meeeow? I... I'm not sure what happens next! My story magic fizzled! Maybe try a different action, or type 'end' to finish?");
                    _displayChoices(currentChoices); // Re-show last choices as a fallback
                }
            } else {
                // API returned null/empty (likely connection error handled in _callStoryAPI)
                // ** Persona voice **
                _appendStoryParagraph(currentPersonaInGame === 'Kana' ? "Connection fuzzy. Try again or type 'end'." : "Mrow... My crystal ball is cloudy... couldn't see what happens next. Try again, type something different, or type 'end'?");
                _displayChoices(currentChoices); // Re-show last choices
            }
        } catch (error) {
            // Catch errors specifically from the API call or subsequent processing
            // ** Persona voice **
            _appendStoryParagraph(currentPersonaInGame === 'Kana' ? "Error continuing story. Try 'end' maybe?" : "*Whimper* Something went wrong continuing our story! Maybe try typing 'end' or try again?");
            console.error("Error handling user action:", error);
            _displayChoices(currentChoices); // Re-show last choices
        }
    }

    // ** UPDATED ** Saves story with current persona tag
    async function _saveCompletedStory() {
        if (!storyHistory || storyHistory.length === 0) {
            console.warn("Attempted to save an empty story history.");
            return;
        }
         // ** Persona voice **
        _sendMessageToLog(currentPersonaInGame === 'Kana' ? "Saving story..." : "Saving our adventure to the library...", currentPersonaInGame);
        let title = `A ${currentPersonaInGame} Story (${new Date().toLocaleDateString()})`; // Default persona title

        try {
            const generatedTitle = await _generateStoryTitle([...storyHistory]);
            if (generatedTitle) {
                title = generatedTitle;
                console.log("Generated story title:", title);
             } else {
                 console.log("Using default title as generation failed.");
             }
        } catch (error) {
             // Log error but continue with default title
             console.error("Error during title generation:", error);
             // ** Persona voice **
             _sendMessageToLog(currentPersonaInGame === 'Kana' ? "Couldn't generate title." : "Couldn't think of a title... it remains a mystery!", currentPersonaInGame);
        }

        const completedStory = {
            title: title,
            timestamp: Date.now(),
            history: [...storyHistory], // Save a copy of the history
            persona: currentPersonaInGame // ** Save the persona who told the story! **
        };
        storyLibrary.push(completedStory);
        _saveLibrary();
         // ** Persona voice **
        _sendMessageToLog(`Story "${title}" saved! ${currentPersonaInGame === 'Kana' ? 'It\'s in the library.' : 'You can find it in the library later~ ♡'}`, currentPersonaInGame);
    }

    // ** UPDATED ** Uses persona-aware title generation prompt
    async function _generateStoryTitle(history) {
        if (!apiCaller || !history || history.length === 0) return null;

        // Try to get a meaningful snippet for context
        const firstRealChoice = history.find(turn => turn.choice !== "[Start]");
        const firstActionText = firstRealChoice ? firstRealChoice.choice : "the beginning";
        const lastStoryPart = history[history.length - 1]?.story || "the end";
        // Limit context length to avoid overly long prompts
        const contextSummary = `The story started with ${currentUserName} choosing "${firstActionText.substring(0, 50)}..." and ended near: "${lastStoryPart.substring(0, 100)}..."`;

        // ** Persona-aware title prompt **
        const personaPromptPart = (currentPersonaInGame === 'Kana')
            ? `You are Kana. Summarize the essence of this short interactive story based on the context: ${contextSummary}.`
            : `You are Mika. Summarize the essence of this short interactive story based on the context: ${contextSummary}.`;

        const prompt = `${personaPromptPart} Generate a short, catchy title (4-8 words maximum) suitable for a storybook. Just output the title itself, nothing else.`;

        try {
             // Use a short context for title generation - often just the summary prompt is enough
            const response = await apiCaller(prompt, []); // No history context needed, just the prompt
            if (response && typeof response === 'string') {
                 // Clean up potential quotes or markdown
                 let cleanTitle = response.trim().replace(/["'*]/g, '');
                 if (cleanTitle.length > 0 && cleanTitle.length < 80) { return cleanTitle; }
            }
             console.warn("Generated title was invalid or empty:", response); return null;
        } catch (error) { console.error("API call for story title failed:", error); return null; }
    }

    // ** UPDATED ** Shows restart button with persona-specific text
    function _showRestartButton(buttonText = null) {
         // Ensure the interaction area exists before trying to add a button
         const interactionArea = document.getElementById('story-interaction-area');
         if (interactionArea) {
             // Clear existing choices and input
             if (storyChoicesArea) storyChoicesArea.innerHTML = '';
             if (storyInputArea) storyInputArea.style.display = 'none'; // Hide text input area

             const newStoryBtn = document.createElement('button');
             // ** Use persona text **
             newStoryBtn.textContent = buttonText || (currentPersonaInGame === 'Kana' ? "New Story." : "Play Again? ♡");
             newStoryBtn.className = 'rps-choice-button'; // Matches CSS
             newStoryBtn.style.marginTop = '15px'; // Matches CSS
             newStoryBtn.style.display = 'block'; // Make it block to center easily
             newStoryBtn.style.marginLeft = 'auto';
             newStoryBtn.style.marginRight = 'auto';
             newStoryBtn.onclick = _createInitialUI; // Go back to initial prompt screen
             // Append to the interaction area, maybe replacing choices area content
             if(storyChoicesArea) storyChoicesArea.appendChild(newStoryBtn); // Add to choices area if available
             else interactionArea.appendChild(newStoryBtn); // Otherwise append directly
         }
     }

    // --- Library UI Functions ---
    // (Structure based on original index.html CSS)

    // ** UPDATED ** _showLibraryView has persona-aware empty message
    function _showLibraryView() {
        _clearGameContainer();
        currentView = 'library';
        gameActive = false;
        libraryViewArea = document.createElement('div');
        libraryViewArea.className = 'library-view'; // Matches CSS

        const title = document.createElement('h2');
        title.textContent = 'Story Library 📚';
        title.className = 'library-title'; // Matches CSS
        libraryViewArea.appendChild(title);

        const backButton = document.createElement('button');
        backButton.textContent = '← Back to Story Prompt';
        backButton.className = 'rps-choice-button secondary library-back-button'; // Matches CSS
        backButton.onclick = _createInitialUI;
        libraryViewArea.appendChild(backButton);

        const listContainer = document.createElement('div');
        listContainer.id = 'library-list-container'; // Matches potential CSS
        libraryViewArea.appendChild(listContainer);
        gameUiContainer.appendChild(libraryViewArea);
        _renderLibraryList(listContainer); // Populate the list
    }

    // ** UPDATED ** _renderLibraryList shows persona who told story
    function _renderLibraryList(container) {
        container.innerHTML = ''; // Clear previous list
        if (storyLibrary.length === 0) {
            const emptyMsg = document.createElement('p');
             // ** Persona voice **
            emptyMsg.textContent = currentPersonaInGame === 'Kana' ? "Library empty. Obviously." : "No adventures saved yet... Let's make some memories!";
            emptyMsg.style.textAlign = 'center';
            emptyMsg.style.fontStyle = 'italic';
            emptyMsg.style.color = 'var(--system-message-text)';
            container.appendChild(emptyMsg);
            return;
        }
        // Show newest stories first
        [...storyLibrary].reverse().forEach((story, index) => {
            // Calculate original index if needed elsewhere, though not used here
            const originalIndex = storyLibrary.length - 1 - index;
            const itemDiv = document.createElement('div');
            itemDiv.className = 'library-item'; // Matches CSS
            itemDiv.onclick = () => _showStoryDetailView(originalIndex); // Pass original index to load correct story

            const titleSpan = document.createElement('span');
            titleSpan.className = 'library-item-title'; // Matches CSS
            titleSpan.textContent = story.title || `Untitled Story (${originalIndex + 1})`; // Fallback title
            itemDiv.appendChild(titleSpan);

            const dateSpan = document.createElement('span');
            dateSpan.className = 'library-item-date'; // Matches CSS
            // ** Add persona who told it **
            const writer = story.persona || 'Mika'; // Default to Mika if somehow missing
            dateSpan.textContent = `Finished: ${new Date(story.timestamp).toLocaleString()} (by ${writer})`;
            itemDiv.appendChild(dateSpan);

            container.appendChild(itemDiv);
        });
    }

    // ** UPDATED ** _showStoryDetailView displays using correct persona/user names
    function _showStoryDetailView(storyIndex) {
        _clearGameContainer();
        currentView = 'detail';
        gameActive = false;
        const story = storyLibrary[storyIndex];
        if (!story) {
            console.error(`Story with index ${storyIndex} not found.`);
             _sendMessageToLog("Mrow! Couldn't find that story in the library!", "System");
            _showLibraryView(); // Go back to library if story doesn't exist
            return;
        }

        const writerPersona = story.persona || 'Mika'; // Get writer persona, default to Mika

        storyDetailViewArea = document.createElement('div');
        storyDetailViewArea.className = 'story-detail-view'; // Matches CSS

        const title = document.createElement('h3');
        title.textContent = story.title || `Untitled Story (${storyIndex + 1})`; // Matches CSS structure
        storyDetailViewArea.appendChild(title);

        const backButton = document.createElement('button');
        backButton.textContent = '← Back to Library';
        backButton.className = 'rps-choice-button secondary library-back-button'; // Matches CSS
        backButton.onclick = _showLibraryView;
        storyDetailViewArea.appendChild(backButton);

        // Render story history using correct names and formatting
        story.history.forEach(turn => {
            // Handle the very first turn ([Start])
            if (turn.choice === "[Start]") {
                 const storyP = document.createElement('p');
                 let processedText = DOMPurify.sanitize(turn.story)
                     .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                     .replace(/\*(.*?)\*/g, '<em>$1</em>')
                     .replace(/(?<!<br>)\n/g, '<br>');
                 // ** Use writer's name **
                 storyP.innerHTML = `<strong>${writerPersona}:</strong> ${processedText}`;
                 storyDetailViewArea.appendChild(storyP);
            } else {
                // Display the user's choice/action first
                 const choiceP = document.createElement('p');
                 choiceP.className = 'detail-user-action'; // Matches CSS
                 // ** Use current user name ** (The user reading the library is the current user)
                 choiceP.innerHTML = `> ${currentUserName}: ${DOMPurify.sanitize(turn.choice)}`;
                 storyDetailViewArea.appendChild(choiceP);

                 // Then display the assistant's story part that followed
                 const storyP = document.createElement('p');
                 let processedText = DOMPurify.sanitize(turn.story)
                     .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                     .replace(/\*(.*?)\*/g, '<em>$1</em>')
                     .replace(/(?<!<br>)\n/g, '<br>');
                 // ** Use writer's name **
                 storyP.innerHTML = `<strong>${writerPersona}:</strong> ${processedText}`;
                 storyDetailViewArea.appendChild(storyP);
            }
        });
        gameUiContainer.appendChild(storyDetailViewArea);
        // Ensure view scrolls to the top when loaded
        if(storyDetailViewArea) storyDetailViewArea.scrollTop = 0;
    }

    // --- Initialization and Exit ---
    // ** UPDATED ** init accepts and stores persona
    function init(_gameUiContainer, _messageCallback, _apiCaller, userName, persona) {
        gameUiContainer = _gameUiContainer;
        messageCallback = _messageCallback;
        apiCaller = _apiCaller;
        currentUserName = userName || "User";
        currentPersonaInGame = persona || 'Mika'; // ** Store passed persona **
        isAssistantGenerating = false; // Reset state

        if (!gameUiContainer) {
            console.error("StoryTime Game UI container not provided!");
            return;
        }

        _loadLibrary(); // Load saved stories
        _createInitialUI(); // Creates UI based on currentPersonaInGame and default length
        storyHistory = []; // Reset current story state
        currentChoices = [];
        gameActive = false;
        currentView = 'prompt'; // Start at the prompt screen
    }

    // (onExit remains unchanged - no specific persona logic needed on cleanup)
    function onExit() {
         console.log("StoryTime onExit called.");
         // Reset state variables to ensure clean start next time
         storyHistory = [];
         currentChoices = [];
         gameActive = false;
         isAssistantGenerating = false;
         currentView = 'prompt';
         currentStoryLengthPreference = 'Medium'; // Reset length preference
         // No asynchronous operations needed here currently
         return Promise.resolve(true); // Indicate synchronous completion
    }

    // Public interface - expose only necessary functions
    return {
        init: init,
        onExit: onExit
        // Internal functions like _appendStoryParagraph are not exposed
    };

})();

// Fallback Sanitizer (Keep this at the end)
if (typeof DOMPurify === 'undefined') {
    console.warn("DOMPurify not loaded. Using basic HTML escaping as fallback for storytime.");
    window.DOMPurify = { sanitize: (str) => str.replace(/</g, '&lt;').replace(/>/g, '&gt;') };
}
// --- END OF FILE storytime.js ---