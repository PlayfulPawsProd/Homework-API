// --- START OF FILE storytime.js ---

// Nyaa~! Mika's Story Time! Let's Make an Adventure, {user}! 📖♡

const StoryTime = (() => {
    // --- Settings ---
    const STORY_CONTEXT_LENGTH = 3; // How many previous story/choice pairs to send for context
    const MAX_CHOICES = 3; // Max choices Mika should try to generate

    // --- State ---
    let gameUiContainer = null;    // Main container for story UI
    let messageCallback = null;    // For system messages (outside story UI)
    let apiCaller = null;          // To call the actual API
    let currentUserName = "User";
    let storyHistory = [];         // Array of { story: string, choice: string } for context
    let currentChoices = [];       // Array of strings for current button choices
    let gameActive = false;        // Is a story currently in progress?
    let isMikaGenerating = false;  // Prevent multiple simultaneous API calls

    // --- DOM Element References ---
    let storyDisplayArea = null;   // Top window for narration
    let storyChoicesArea = null;   // Area for choice buttons
    let storyInputArea = null;     // Container for text input + send button
    let storyTextInput = null;     // Text input for custom actions
    let storySendButton = null;    // Button to send custom action
    let storyStatusArea = null;    // Area for 'Mika is thinking...' or 'The End' messages
    let initialPromptArea = null;  // Div for the initial genre selection

    // --- Helper Functions ---
    function _sendMessageToLog(text, sender = 'System') {
        if (messageCallback) {
            messageCallback(sender, text);
        } else {
            console.log(`StoryTime SysMsg (${sender}):`, text);
        }
    }

    function _setLoadingState(isLoading) {
        isMikaGenerating = isLoading;
        if (storyTextInput) storyTextInput.disabled = isLoading;
        if (storySendButton) storySendButton.disabled = isLoading;
        if (storyChoicesArea) {
            storyChoicesArea.querySelectorAll('button').forEach(button => button.disabled = isLoading);
        }
        if (storyStatusArea) {
             storyStatusArea.textContent = isLoading ? 'Mika is weaving the tale... *purrrr*' : '';
             storyStatusArea.style.display = isLoading ? 'block' : 'none';
        }
        if (initialPromptArea?.style.display !== 'none') { // Disable initial buttons too
            initialPromptArea?.querySelectorAll('button').forEach(button => button.disabled = isLoading);
        }
    }

    // --- UI Rendering ---
    function _createInitialUI() {
        gameUiContainer.innerHTML = ''; // Clear everything first

        initialPromptArea = document.createElement('div');
        initialPromptArea.id = 'story-initial-prompt';
        initialPromptArea.style.textAlign = 'center';
        initialPromptArea.style.padding = '20px';

        const title = document.createElement('h3');
        title.textContent = `Ready for an adventure, ${currentUserName}?! ♡`;
        initialPromptArea.appendChild(title);

        const promptText = document.createElement('p');
        promptText.textContent = 'What kind of story should we have today?';
        promptText.style.marginBottom = '20px';
        initialPromptArea.appendChild(promptText);

        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'center';
        buttonContainer.style.gap = '10px';
        buttonContainer.style.flexWrap = 'wrap'; // Allow wrapping on small screens

        const genres = ['Magical Quest ✨', 'Spooky Mystery 👻', 'Sci-Fi Exploration 🚀', 'Slice of Life 🌸', 'Surprise Me! 🎉'];

        genres.forEach(genre => {
            const button = document.createElement('button');
            button.textContent = genre;
            button.className = 'rps-choice-button'; // Reuse style
            button.onclick = () => _startGame(genre.replace(/[\s✨👻🚀🌸🎉]/g, '')); // Use clean genre for prompt
            buttonContainer.appendChild(button);
        });

        initialPromptArea.appendChild(buttonContainer);
        gameUiContainer.appendChild(initialPromptArea);
    }

    function _createGameLayout() {
        // Remove initial prompt area if it exists
        if (initialPromptArea) {
            initialPromptArea.remove();
            initialPromptArea = null;
        }

        // Ensure main container is empty before building game layout
        gameUiContainer.innerHTML = '';

        // Main structure
        const storyWrapper = document.createElement('div');
        storyWrapper.id = 'story-wrapper';
        storyWrapper.style.display = 'flex';
        storyWrapper.style.flexDirection = 'column';
        storyWrapper.style.height = '100%'; // Occupy full game area height
        storyWrapper.style.width = '100%';

        // 1. Story Display Area (Top)
        storyDisplayArea = document.createElement('div');
        storyDisplayArea.id = 'story-display-area';
        storyDisplayArea.className = 'story-display-area'; // For styling
        storyWrapper.appendChild(storyDisplayArea);

        // 2. Status Area (between story and choices/input)
        storyStatusArea = document.createElement('div');
        storyStatusArea.id = 'story-status-area';
        storyStatusArea.className = 'story-status-area';
        storyWrapper.appendChild(storyStatusArea);


        // 3. Interaction Area (Bottom) - Contains Choices and Input
        const interactionArea = document.createElement('div');
        interactionArea.id = 'story-interaction-area';
        interactionArea.className = 'story-interaction-area'; // For styling

        storyChoicesArea = document.createElement('div');
        storyChoicesArea.id = 'story-choices-area';
        storyChoicesArea.className = 'story-choices-area'; // For styling
        interactionArea.appendChild(storyChoicesArea);

        storyInputArea = document.createElement('div');
        storyInputArea.id = 'story-input-area';
        storyInputArea.className = 'story-input-area'; // For styling

        storyTextInput = document.createElement('input');
        storyTextInput.type = 'text';
        storyTextInput.id = 'story-text-input';
        storyTextInput.placeholder = 'Or type your own action...';
        storyTextInput.className = 'story-text-input'; // For styling
        storyTextInput.onkeypress = (e) => {
             if (e.key === 'Enter' && !isMikaGenerating && storyTextInput.value.trim()) {
                 e.preventDefault();
                 _handleUserAction(storyTextInput.value.trim());
             }
        };

        storySendButton = document.createElement('button');
        storySendButton.id = 'story-send-button';
        storySendButton.textContent = 'Do It!';
        storySendButton.className = 'story-send-button'; // For styling
        storySendButton.onclick = () => {
            if (!isMikaGenerating && storyTextInput.value.trim()) {
                _handleUserAction(storyTextInput.value.trim());
            }
        };

        storyInputArea.appendChild(storyTextInput);
        storyInputArea.appendChild(storySendButton);
        interactionArea.appendChild(storyInputArea);

        storyWrapper.appendChild(interactionArea); // Add interaction area to main wrapper
        gameUiContainer.appendChild(storyWrapper); // Add wrapper to the game area
    }


    function _appendStoryParagraph(text) {
        if (!storyDisplayArea) return;
        const paragraph = document.createElement('p');
        // Sanitize and apply basic formatting (bold/italic)
        let processedText = DOMPurify.sanitize(text)
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/(?<!<br>)\n/g, '<br>'); // Handle newlines
        paragraph.innerHTML = processedText;
        storyDisplayArea.appendChild(paragraph);
        // Scroll to the bottom of the story area
        storyDisplayArea.scrollTop = storyDisplayArea.scrollHeight;
    }

    function _displayChoices(choices) {
        if (!storyChoicesArea) return;
        storyChoicesArea.innerHTML = ''; // Clear previous choices

        if (!choices || choices.length === 0) {
             // If no choices, maybe story ended? Or API failed?
             console.log("No choices provided to display.");
             // Consider showing an end-game button or message here
             return;
        }

        choices.slice(0, MAX_CHOICES).forEach((choiceText, index) => {
            const button = document.createElement('button');
            // Remove potential leading characters like '*' or '-'
            const cleanChoiceText = choiceText.replace(/^[\*\-\d\.]+\s*/, '').trim();
            button.textContent = `${index + 1}. ${cleanChoiceText}`;
            button.className = 'rps-choice-button story-choice'; // Reuse style + specific class
            button.onclick = () => _handleUserAction(cleanChoiceText); // Send the clean text
            storyChoicesArea.appendChild(button);
        });
    }

    // --- Story Progression ---

    function _parseStoryAndChoices(responseText) {
        const lines = responseText.trim().split('\n');
        let storyPart = "";
        let choices = [];
        let readingChoices = false;

        for (const line of lines) {
            const trimmedLine = line.trim();
            // Check if line looks like a choice (starts with *, -, number+.)
            if (/^[\*\-\d]+\.?\s+/.test(trimmedLine)) {
                readingChoices = true;
                const choiceText = trimmedLine.replace(/^[\*\-\d]+\.?\s*/, '').trim();
                if(choiceText) choices.push(choiceText);
            } else if (readingChoices) {
                // If we were reading choices and hit a line that doesn't look like one, assume it's story again (or noise)
                // Let's assume for now choices are contiguous at the end. If API mixes them, this needs refinement.
                 storyPart += line + "\n"; // Append potentially missed line back to story
                 readingChoices = false; // Reset flag? Or just assume choices are done? Let's assume done for now.
            } else {
                storyPart += line + "\n";
            }
        }

         // Basic fallback if parsing fails completely
         if (choices.length === 0 && storyPart.length < 50) {
            // If we have very little text and no choices, assume entire response was story
             storyPart = responseText.trim();
             console.warn("Choice parsing might have failed, treating response as story only.");
         } else {
            storyPart = storyPart.trim(); // Clean up story part
         }


        // Limit choices just in case API gives too many
        choices = choices.slice(0, MAX_CHOICES);

        return { storyPart, choices };
    }

    async function _callStoryAPI(prompt, context = []) {
        if (!apiCaller) {
            _sendMessageToLog("Mrow! Cannot call the magic box!", "System");
            return null;
        }
        _setLoadingState(true);
        try {
            // Pass context (previous turns) to the main API caller function
            const response = await apiCaller(prompt, context);
            return response;
        } catch (error) {
            console.error("Story API call failed:", error);
            _sendMessageToLog(`Meeeow! The story magic fizzled... (${error})`, "System");
            return null;
        } finally {
            _setLoadingState(false);
        }
    }

    async function _startGame(genre) {
        console.log(`Starting story with genre: ${genre}`);
        _sendMessageToLog(`Okay, ${currentUserName}! Let's begin our ${genre} adventure! ♡`, "Mika");
        _createGameLayout(); // Build the main game UI
        gameActive = true;
        storyHistory = []; // Reset history

        const prompt = `You are Mika, a playful, enthusiastic catgirl telling an interactive story to ${currentUserName}. Start a brand new story in the genre of "${genre}". Describe the opening scene vividly (2-3 paragraphs). End the scene by giving ${currentUserName} exactly ${MAX_CHOICES} clear choices for what to do next, presented as a bulleted list (e.g., '* Choice 1\n* Choice 2'). Make the choices distinct actions.`;

        const responseText = await _callStoryAPI(prompt);

        if (responseText) {
            const { storyPart, choices } = _parseStoryAndChoices(responseText);
            if(storyPart) _appendStoryParagraph(storyPart);
            _displayChoices(choices);
            currentChoices = choices; // Store current choices
            // Add initial part to history (no user choice yet)
            storyHistory.push({ story: storyPart, choice: "[Start]" });
        } else {
            _appendStoryParagraph("Meeeow... My imagination is fuzzy right now. Couldn't start the story. Maybe try again?");
            gameActive = false; // Allow restart
            // Consider adding a 'Try Again' button
        }
    }


    async function _handleUserAction(actionText) {
        if (!gameActive || isMikaGenerating) return;

        console.log(`User action: ${actionText}`);
        _appendStoryParagraph(`> ${currentUserName}: ${sanitizeHTML(actionText)}`); // Show user's choice/action
        if(storyTextInput) storyTextInput.value = ''; // Clear input field

        // Prepare context: last N story parts and user choices
        const context = storyHistory.slice(-STORY_CONTEXT_LENGTH).map(turn => (
             `Previously:\n${turn.story}\n${currentUserName} chose: ${turn.choice}`
         )).join("\n\n");

        const prompt = `You are Mika, a playful, enthusiastic catgirl continuing an interactive story for ${currentUserName}. \n\n${context}\n\nNow, ${currentUserName} decided to: "${actionText}".\n\nDescribe what happens next vividly (2-3 paragraphs). Keep the story engaging and consistent. VERY IMPORTANT: End your response by giving ${currentUserName} exactly ${MAX_CHOICES} new, clear choices as a bulleted list on separate lines (e.g., '* Choice 1\n* Choice 2'). Ensure choices are distinct actions. If the story reaches a natural conclusion or dead end based on the action, describe it and write **(The End)** on a new line instead of offering choices.`;

        const responseText = await _callStoryAPI(prompt);

        if (responseText) {
            const { storyPart, choices } = _parseStoryAndChoices(responseText);

            if(storyPart) _appendStoryParagraph(storyPart);

             // Check for explicit end marker from API
             const storyEnded = storyPart.includes("(The End)");

             if (storyEnded) {
                 _sendMessageToLog("And that's the end of that adventure! Want to start another?", "Mika");
                 _displayChoices([]); // Clear choices
                 gameActive = false;
                 // Show a "New Story" button?
                 const newStoryBtn = document.createElement('button');
                 newStoryBtn.textContent = "Start New Story? ♡";
                 newStoryBtn.className = 'rps-choice-button';
                 newStoryBtn.onclick = _createInitialUI; // Go back to genre selection
                 if(storyChoicesArea) storyChoicesArea.appendChild(newStoryBtn);
                 if(storyInputArea) storyInputArea.style.display = 'none'; // Hide input

            } else if (choices.length > 0) {
                 _displayChoices(choices);
                 currentChoices = choices;
                 // Add this turn to history
                 storyHistory.push({ story: storyPart, choice: actionText });
                 // Keep only necessary history length
                 if (storyHistory.length > STORY_CONTEXT_LENGTH + 2) {
                     storyHistory.shift(); // Remove oldest turn to manage size
                 }
             } else {
                  // API didn't provide choices or an end marker - confused Mika?
                  _appendStoryParagraph("Meeeow? I... I'm not sure what happens next! My story magic fizzled! Maybe try a different action?");
                  // Don't end the game, allow user to retry from current point.
                  // Re-display previous choices? Or let them type? Let them type.
                  _displayChoices(currentChoices); // Re-show last known choices?
             }
        } else {
            _appendStoryParagraph("Mrow... My crystal ball is cloudy... couldn't see what happens next. Try again?");
            // Keep game active, allow retry
        }
    }

    // --- Initialization and Exit ---
    function init(_gameUiContainer, _messageCallback, _apiCaller, userName) {
        gameUiContainer = _gameUiContainer;
        messageCallback = _messageCallback;
        apiCaller = _apiCaller;
        currentUserName = userName || "User";

        if (!gameUiContainer) {
            console.error("StoryTime Game UI container not provided!");
            return;
        }

        // Start by showing the genre selection
        _createInitialUI();
        gameActive = false;
        isMikaGenerating = false;
        storyHistory = [];
        currentChoices = [];
    }

    function onExit() {
         console.log("StoryTime onExit called.");
         // Reset state, maybe prompt to save story in the future
         gameActive = false;
         isMikaGenerating = false; // Ensure loading stops
         storyHistory = [];
         currentChoices = [];
         // No async actions needed for now, resolve immediately
         return Promise.resolve(true);
    }

    // Public interface
    return {
        init: init,
        onExit: onExit
    };

})();

// --- END OF FILE storytime.js ---