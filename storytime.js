// --- START OF FILE storytime.js ---

// Nyaa~! Mika's Story Time! Let's Make an Adventure, {user}! 📖♡

const StoryTime = (() => {
    // --- Settings ---
    const STORY_CONTEXT_LENGTH = 3; // How many previous story/choice pairs to send for context
    const MAX_CHOICES = 3;          // Max choices Mika should try to generate
    const LIBRARY_STORAGE_KEY = 'mikaStoryLibrary_v1'; // Key for saving our adventures!

    // --- State ---
    let gameUiContainer = null;      // Main container for story UI
    let messageCallback = null;      // For system messages (outside story UI)
    let apiCaller = null;            // To call the actual API
    let currentUserName = "User";
    let storyHistory = [];           // Array of { story: string, choice: string } for context
    let currentChoices = [];         // Array of strings for current button choices
    let gameActive = false;          // Is a story currently in progress?
    let isMikaGenerating = false;    // Prevent multiple simultaneous API calls
    let storyLibrary = [];           // Array to hold saved story objects { title, timestamp, history }
    let currentView = 'prompt';      // Tracks current UI state: 'prompt', 'story', 'library', 'detail'

    // --- DOM Element References ---
    // These will be assigned dynamically when UI is built
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
        // Uses the main message log (outside the game UI) for system messages
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
        // Disable custom prompt input/buttons if loading during initial phase
        if (initialPromptArea) {
             initialPromptArea.querySelectorAll('button, input').forEach(el => el.disabled = isLoading);
        }
        // Update status display
        if (storyStatusArea) {
             storyStatusArea.textContent = isLoading ? 'Mika is weaving the tale... *purrrr*' : '';
             storyStatusArea.style.display = isLoading ? 'block' : 'none';
        }
    }

    // --- Library Persistence ---
    function _loadLibrary() {
        try {
            const stored = localStorage.getItem(LIBRARY_STORAGE_KEY);
            if (stored) {
                storyLibrary = JSON.parse(stored);
                console.log(`Loaded ${storyLibrary.length} stories from the library.`);
            } else {
                storyLibrary = [];
                console.log("No story library found, starting fresh!");
            }
        } catch (e) {
            console.error("Failed to load or parse story library:", e);
            _sendMessageToLog("Mrow! Had trouble reading our story library... starting fresh!", "System");
            storyLibrary = [];
            localStorage.removeItem(LIBRARY_STORAGE_KEY); // Clear potentially corrupted data
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

    function _clearGameContainer() {
        if (gameUiContainer) gameUiContainer.innerHTML = '';
        // Reset DOM references
        storyDisplayArea = storyChoicesArea = storyInputArea = storyTextInput = storySendButton = null;
        storyStatusArea = initialPromptArea = libraryViewArea = storyDetailViewArea = customPromptInput = null;
    }

    function _createInitialUI() {
        _clearGameContainer();
        currentView = 'prompt';
        gameActive = false; // Ensure game is not active here

        initialPromptArea = document.createElement('div');
        initialPromptArea.id = 'story-initial-prompt';
        // Styles applied via CSS in index.html

        const title = document.createElement('h3');
        title.textContent = `Ready for an adventure, ${currentUserName}?! ♡`;
        initialPromptArea.appendChild(title);

        const promptText = document.createElement('p');
        promptText.textContent = 'What kind of story should we have today? Pick a genre, view our library, or tell me your idea!';
        initialPromptArea.appendChild(promptText);

        // Genre Buttons
        const genreButtonContainer = document.createElement('div');
        const genres = ['Magical Quest ✨', 'Spooky Mystery 👻', 'Sci-Fi Exploration 🚀', 'Slice of Life 🌸', 'Surprise Me! 🎉'];
        genres.forEach(genre => {
            const button = document.createElement('button');
            button.textContent = genre;
            button.className = 'rps-choice-button'; // Reuse style
            button.onclick = () => _startGame(genre.replace(/[\s✨👻🚀🌸🎉]/g, '')); // Use clean genre for prompt
            genreButtonContainer.appendChild(button);
        });
        initialPromptArea.appendChild(genreButtonContainer);

        // Custom Prompt Input
        customPromptInput = document.createElement('input');
        customPromptInput.type = 'text';
        customPromptInput.id = 'story-custom-prompt-input';
        customPromptInput.placeholder = 'Or type your own adventure idea here!';
        initialPromptArea.appendChild(customPromptInput);

        // Custom Start Button
        const customStartButton = document.createElement('button');
        customStartButton.textContent = 'Start My Idea!';
        customStartButton.className = 'rps-choice-button';
        customStartButton.style.marginTop = '10px'; // Add some space
        customStartButton.onclick = _startCustomStory;
        initialPromptArea.appendChild(customStartButton);

        // Library Button
        const libraryButton = document.createElement('button');
        libraryButton.textContent = 'View Library 📚';
        libraryButton.className = 'rps-choice-button secondary'; // Different style
        libraryButton.style.marginTop = '15px';
        libraryButton.onclick = _showLibraryView;
        initialPromptArea.appendChild(libraryButton);

        gameUiContainer.appendChild(initialPromptArea);

         // Add the main "Back to Chat" button at the very bottom of the game area container
         // Note: This relies on theswitchToChatView function existing in the global scope (index.html)
         // It might be better practice for index.html to always provide this button outside gameArea if needed.
         /*
         const backToChatBtn = document.createElement('button');
         backToChatBtn.id = 'back-to-chat-button'; // Use consistent ID if needed
         backToChatBtn.textContent = 'Back to Chat ♡';
         backToChatBtn.onclick = () => {
             if (typeof switchToChatView === 'function') {
                 switchToChatView();
             } else {
                 console.error("switchToChatView function not found!");
                 _sendMessageToLog("Mrow! Can't get back to chat from here!", "System");
             }
         };
         gameUiContainer.appendChild(backToChatBtn);
         */
         // Relying on Header "Home" button for primary navigation back
    }

    function _createGameLayout() {
        _clearGameContainer();
        currentView = 'story';

        const storyWrapper = document.createElement('div');
        storyWrapper.id = 'story-wrapper';

        storyDisplayArea = document.createElement('div');
        storyDisplayArea.id = 'story-display-area';
        storyDisplayArea.className = 'story-display-area';
        storyWrapper.appendChild(storyDisplayArea);

        storyStatusArea = document.createElement('div');
        storyStatusArea.id = 'story-status-area';
        storyStatusArea.className = 'story-status-area';
        storyWrapper.appendChild(storyStatusArea);

        const interactionArea = document.createElement('div');
        interactionArea.id = 'story-interaction-area';
        interactionArea.className = 'story-interaction-area';

        storyChoicesArea = document.createElement('div');
        storyChoicesArea.id = 'story-choices-area';
        storyChoicesArea.className = 'story-choices-area';
        interactionArea.appendChild(storyChoicesArea);

        storyInputArea = document.createElement('div');
        storyInputArea.id = 'story-input-area';
        storyInputArea.className = 'story-input-area';

        storyTextInput = document.createElement('input');
        storyTextInput.type = 'text';
        storyTextInput.id = 'story-text-input';
        storyTextInput.placeholder = 'Or type your own action...';
        storyTextInput.className = 'story-text-input';
        storyTextInput.onkeypress = (e) => {
             if (e.key === 'Enter' && gameActive && !isMikaGenerating && storyTextInput.value.trim()) {
                 e.preventDefault();
                 _handleUserAction(storyTextInput.value.trim());
             }
        };

        storySendButton = document.createElement('button');
        storySendButton.id = 'story-send-button';
        storySendButton.textContent = 'Do It!';
        storySendButton.className = 'story-send-button rps-choice-button'; // Use base style
        storySendButton.onclick = () => {
            if (gameActive && !isMikaGenerating && storyTextInput.value.trim()) {
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

        let processedText = text; // Assume already sanitized if coming internally
        // Apply basic formatting (bold/italic)
        processedText = processedText
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/(?<!<br>)\n/g, '<br>'); // Handle newlines
        paragraph.innerHTML = processedText;
        storyDisplayArea.appendChild(paragraph);
        storyDisplayArea.scrollTop = storyDisplayArea.scrollHeight;
    }

     function _appendUserActionToStory(actionText) {
         if (!storyDisplayArea) return;
         // Sanitize user input before displaying
         const sanitizedAction = DOMPurify.sanitize(actionText);
         _appendStoryParagraph(`> ${currentUserName}: ${sanitizedAction}`, 'user-action');
     }


    // --- Auto-Scrolling Choices ---
    function _displayChoices(choices) {
        if (!storyChoicesArea) return;
        storyChoicesArea.innerHTML = ''; // Clear previous choices

        if (!choices || choices.length === 0) {
             console.log("No choices provided to display.");
             // If game is active, this might indicate an issue or the end
             if (gameActive && !isMikaGenerating) {
                 // Maybe add a default "Continue?" or "The End?" button here?
                 // For now, just clear and do nothing, wait for end state or next action
             }
             return;
        }

        currentChoices = choices; // Store current choices

        choices.slice(0, MAX_CHOICES).forEach((choiceText, index) => {
            const button = document.createElement('button');
            // Remove potential list markers for cleaner display/action text
            const cleanChoiceText = choiceText.replace(/^[\*\-\d]+\.?\s*/, '').trim();
            button.className = 'rps-choice-button story-choice'; // Base classes
            button.onclick = () => _handleUserAction(cleanChoiceText); // Send the clean text

            // Create inner span for text and potential scrolling
            const textSpan = document.createElement('span');
            textSpan.textContent = `${index + 1}. ${cleanChoiceText}`; // Include number in scrolling text
            textSpan.className = 'scrollable-text'; // Add class for styling/selection
            button.appendChild(textSpan);

            // Append to DOM to calculate sizes accurately
            storyChoicesArea.appendChild(button);

            // Use requestAnimationFrame to check sizes after browser layout
            requestAnimationFrame(() => {
                // Check if the button is still in the DOM (might have been cleared quickly)
                if (!button.isConnected) return;

                const computedStyle = window.getComputedStyle(button);
                const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
                const paddingRight = parseFloat(computedStyle.paddingRight) || 0;
                const availableWidth = button.clientWidth - paddingLeft - paddingRight;
                const textWidth = textSpan.scrollWidth;

                if (textWidth > availableWidth + 1) { // Add 1px tolerance for rounding
                    button.classList.add('text-overflow-scroll');
                    const scrollDistance = availableWidth - textWidth;
                    button.style.setProperty('--scroll-distance', `${scrollDistance - 5}px`); // Negative distance, slight buffer

                    const overflowAmount = textWidth - availableWidth;
                    const baseDuration = 6; // Longer base duration for auto-scroll
                    const extraPerPixel = 0.06; // Adjust speed
                    let duration = Math.max(6, baseDuration + overflowAmount * extraPerPixel);
                    duration = Math.min(duration, 25); // Cap duration
                    textSpan.style.animationDuration = `${duration.toFixed(1)}s`;
                    button.title = cleanChoiceText; // Add title attribute as fallback
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
        const lines = responseText.trim().split('\n');
        let storyPart = "";
        let choices = [];
        let readingChoices = false;
        const endMarker = "(The End)";

        for (const line of lines) {
            const trimmedLine = line.trim();

            // Explicit end marker check FIRST
            if (trimmedLine.includes(endMarker)) {
                 storyPart += line.replace(endMarker, '').trim() + "\n"; // Add line content before marker
                 choices = []; // No choices if story ended
                 readingChoices = false; // Stop reading choices
                 break; // Stop processing lines
             }

            // Check if line looks like a choice
            if (/^[\*\-\d]+\.?\s+/.test(trimmedLine)) {
                readingChoices = true;
                const choiceText = trimmedLine.replace(/^[\*\-\d]+\.?\s*/, '').trim();
                if(choiceText) choices.push(choiceText);
            } else if (readingChoices) {
                // If we were reading choices and hit a line that doesn't look like one, assume it's story again
                 storyPart += line + "\n";
                 // Let's not reset readingChoices flag, API might intersperse things weirdly
                 // but prioritize adding text to story if it doesn't look like a choice.
            } else {
                // Not reading choices, must be story
                storyPart += line + "\n";
            }
        }

        storyPart = storyPart.trim(); // Clean up final story part

         // Basic fallback if parsing fails, but response doesn't contain end marker
        if (choices.length === 0 && !responseText.includes(endMarker)) {
             // Might be a continuation without choices, or a failed parse
             console.warn("No choices parsed and no end marker found. Treating as story continuation.");
             // Let the calling function decide how to handle lack of choices if not ended
        }

        // Limit choices just in case API gives too many
        choices = choices.slice(0, MAX_CHOICES);

        return { storyPart, choices, storyEnded: responseText.includes(endMarker) };
    }

    async function _callStoryAPI(prompt, contextTurns = []) {
        if (!apiCaller) {
            _sendMessageToLog("Mrow! Cannot call the magic box!", "System");
            return Promise.reject("API Caller not available");
        }
        _setLoadingState(true);

        // Format context for the API call if needed by api.js structure
        // Example: convert {story, choice} pairs into Gemini {role, parts} format
         const apiContext = contextTurns.flatMap(turn => [
             // Assuming the story part is Mika's response (model)
             { role: 'model', parts: [{ text: turn.story }] },
             // Assuming the choice is the user's input
             { role: 'user', parts: [{ text: turn.choice }] }
         ]);

        try {
            const response = await apiCaller(prompt, apiContext); // Pass formatted context
            return response;
        } catch (error) {
            console.error("Story API call failed:", error);
            _sendMessageToLog(`Meeeow! The story magic fizzled... (${error})`, "System");
             return null; // Return null on error
        } finally {
            _setLoadingState(false);
        }
    }

    async function _startCustomStory() {
        if (!customPromptInput || isMikaGenerating) return;
        const customText = customPromptInput.value.trim();
        if (!customText) {
            _sendMessageToLog("Hehe~ You need to give me *some* idea, Master!", "Mika");
            return;
        }
        // Treat the custom text as the starting prompt
        await _startGame(customText);
    }

    async function _startGame(promptText) { // Accepts genre keyword or custom text
        console.log(`Starting story with prompt: ${promptText.substring(0, 50)}...`);
        _sendMessageToLog(`Okay, ${currentUserName}! Let's begin our adventure! ♡`, "Mika");
        _createGameLayout(); // Build the main game UI
        gameActive = true;
        storyHistory = []; // Reset history

        // Determine if it's a genre or custom prompt for the API message
        const isGenre = ['MagicalQuest', 'SpookyMystery', 'SciFiExploration', 'SliceOfLife', 'SurpriseMe'].includes(promptText);
        const startingInstruction = isGenre
            ? `Start a brand new story in the genre of "${promptText}".`
            : `Start a brand new story based on this idea from ${currentUserName}: "${promptText}".`;

        const initialPrompt = `You are Mika, a playful, enthusiastic catgirl telling an interactive story to ${currentUserName}. ${startingInstruction} Describe the opening scene vividly (2-3 paragraphs). End the scene by giving ${currentUserName} exactly ${MAX_CHOICES} clear choices for what to do next, presented as a bulleted list (e.g., '* Choice 1\\n* Choice 2'). Make the choices distinct actions.`;

        try {
            const responseText = await _callStoryAPI(initialPrompt);
            if (responseText) {
                const { storyPart, choices } = _parseStoryAndChoices(responseText);
                if(storyPart) _appendStoryParagraph(`<strong>Mika:</strong> ${storyPart}`); // Add Mika identifier
                _displayChoices(choices);
                // Add initial part to history
                storyHistory.push({ story: storyPart, choice: "[Start]" });
            } else {
                 _appendStoryParagraph("<strong>Mika:</strong> Meeeow... My imagination is fuzzy right now. Couldn't start the story. Maybe try again?");
                 gameActive = false; // Allow restart via initial UI
                  _showRestartButton(); // Offer a restart button
            }
        } catch (error) {
             _appendStoryParagraph("<strong>Mika:</strong> *Hiss!* Something went wrong starting our story! Try again?");
             console.error("Error starting story:", error);
             gameActive = false;
             _showRestartButton();
         }
    }

    async function _handleUserAction(actionText) {
        if (!gameActive || isMikaGenerating) return;

        console.log(`User action: ${actionText}`);
        _appendUserActionToStory(actionText); // Display user's sanitized choice/action
        if(storyTextInput) storyTextInput.value = ''; // Clear input field
        _displayChoices([]); // Clear old choices immediately

        // Prepare context: last N story parts and user choices
        const context = storyHistory.slice(-STORY_CONTEXT_LENGTH);

        const prompt = `You are Mika, a playful, enthusiastic catgirl continuing an interactive story for ${currentUserName}. The story so far involved these recent turns (Mika's text then ${currentUserName}'s choice). Now, ${currentUserName} decided to: "${actionText}". Describe what happens next vividly (2-3 paragraphs). Keep the story engaging and consistent with the previous context. VERY IMPORTANT: End your response by giving ${currentUserName} exactly ${MAX_CHOICES} new, clear choices as a bulleted list on separate lines (e.g., '* Choice 1\\n* Choice 2'). Ensure choices are distinct actions. If the story reaches a natural conclusion or dead end based on the action, describe it and write **(The End)** on a new line instead of offering choices.`;

         try {
            const responseText = await _callStoryAPI(prompt, context); // Pass context history
             if (responseText) {
                 const { storyPart, choices, storyEnded } = _parseStoryAndChoices(responseText);

                 if(storyPart) _appendStoryParagraph(`<strong>Mika:</strong> ${storyPart}`); // Add Mika identifier

                 if (storyEnded) {
                     _sendMessageToLog("And that's the end of that adventure! Want to start another?", "Mika");
                     gameActive = false;
                     await _saveCompletedStory(); // Attempt to save the story
                     _showRestartButton("Start New Story? ♡"); // Show restart button
                     if(storyInputArea) storyInputArea.style.display = 'none'; // Hide input
                 } else if (choices.length > 0) {
                     _displayChoices(choices);
                     // Add this turn to history *after* successfully getting response
                     storyHistory.push({ story: storyPart, choice: actionText });
                     // Keep only necessary history length
                     if (storyHistory.length > STORY_CONTEXT_LENGTH + 2) {
                         storyHistory.shift();
                     }
                 } else {
                     // API didn't provide choices or an end marker - confused Mika?
                     _appendStoryParagraph("<strong>Mika:</strong> Meeeow? I... I'm not sure what happens next! My story magic fizzled! Maybe try a different action, or type something yourself?");
                      _displayChoices(currentChoices); // Re-show last known choices as a fallback
                 }
             } else {
                 _appendStoryParagraph("<strong>Mika:</strong> Mrow... My crystal ball is cloudy... couldn't see what happens next. Try again, or type something different?");
                 _displayChoices(currentChoices); // Re-show last known choices
             }
         } catch (error) {
             _appendStoryParagraph("<strong>Mika:</strong> *Whimper* Something went wrong continuing our story! Maybe try again?");
             console.error("Error handling user action:", error);
             _displayChoices(currentChoices); // Re-show last known choices
         }
    }

    async function _saveCompletedStory() {
        if (!storyHistory || storyHistory.length === 0) {
            console.log("No story history to save.");
            return;
        }

        _sendMessageToLog("Saving our adventure to the library...", "Mika");
        let title = "An Untitled Adventure"; // Default title

        try {
            // Attempt to generate a title via API
            const generatedTitle = await _generateStoryTitle([...storyHistory]); // Pass copy
            if (generatedTitle) {
                title = generatedTitle;
            }
        } catch (error) {
            console.error("Failed to generate story title:", error);
            _sendMessageToLog("Couldn't think of a title... it remains a mystery!", "Mika");
        }

        const completedStory = {
            title: title,
            timestamp: Date.now(),
            history: [...storyHistory] // Save a copy of the history
        };

        storyLibrary.push(completedStory);
        _saveLibrary();
        _sendMessageToLog(`Story "${title}" saved! You can find it in the library later~ ♡`, "Mika");
    }

    async function _generateStoryTitle(history) {
        if (!apiCaller || !history || history.length === 0) return null;

        // Simple context: Combine first user action and last story part?
         const firstAction = history.find(turn => turn.choice !== "[Start]")?.choice || "the beginning";
         const lastStoryPart = history[history.length - 1]?.story || "the end";
         const contextSummary = `The story started with ${currentUserName} choosing "${firstAction.substring(0, 50)}..." and ended near: "${lastStoryPart.substring(0, 100)}..."`;

        const prompt = `You are Mika. Summarize the essence of this short interactive story based on the following context: ${contextSummary}. Generate a short, catchy, creative title (4-8 words maximum) suitable for a storybook. Just output the title itself, nothing else.`;

        try {
            // Use a separate, non-contextual API call for title generation?
            const response = await apiCaller(prompt); // No history context needed for title
            if (response && typeof response === 'string') {
                 // Clean up potential quotes or extra text from the title
                 let cleanTitle = response.trim().replace(/["']/g, '');
                 // Basic sanity check on length
                 if (cleanTitle.length > 0 && cleanTitle.length < 80) {
                     console.log("Generated title:", cleanTitle);
                     return cleanTitle;
                 }
            }
             console.warn("Generated title was invalid:", response);
             return null;
        } catch (error) {
            console.error("API call for story title failed:", error);
            return null;
        }
    }

    function _showRestartButton(buttonText = "Play Again? ♡") {
         if (storyChoicesArea) {
             storyChoicesArea.innerHTML = ''; // Clear any remnants
             const newStoryBtn = document.createElement('button');
             newStoryBtn.textContent = buttonText;
             newStoryBtn.className = 'rps-choice-button';
             newStoryBtn.style.marginTop = '15px';
             newStoryBtn.onclick = _createInitialUI; // Go back to genre selection
             storyChoicesArea.appendChild(newStoryBtn);
         }
     }

    // --- Library UI Functions ---

    function _showLibraryView() {
        _clearGameContainer();
        currentView = 'library';
        gameActive = false;

        libraryViewArea = document.createElement('div');
        libraryViewArea.className = 'library-view';

        const title = document.createElement('h2');
        title.textContent = 'Our Story Library 📚';
        title.className = 'library-title';
        libraryViewArea.appendChild(title);

        const backButton = document.createElement('button');
        backButton.textContent = '← Back to Story Prompt';
        backButton.className = 'rps-choice-button secondary library-back-button';
        backButton.onclick = _createInitialUI;
        libraryViewArea.appendChild(backButton);

        const listContainer = document.createElement('div');
        listContainer.id = 'library-list-container';
        libraryViewArea.appendChild(listContainer);

        gameUiContainer.appendChild(libraryViewArea);
        _renderLibraryList(listContainer); // Populate the list
    }

    function _renderLibraryList(container) {
        container.innerHTML = ''; // Clear previous list

        if (storyLibrary.length === 0) {
            const emptyMsg = document.createElement('p');
            emptyMsg.textContent = "No adventures saved yet... Let's make some memories!";
            emptyMsg.style.textAlign = 'center';
            emptyMsg.style.fontStyle = 'italic';
            emptyMsg.style.color = 'var(--system-message-text)';
            container.appendChild(emptyMsg);
            return;
        }

        // Display newest first
        [...storyLibrary].reverse().forEach((story, index) => {
            const originalIndex = storyLibrary.length - 1 - index; // Index in the original array
            const itemDiv = document.createElement('div');
            itemDiv.className = 'library-item';
            itemDiv.onclick = () => _showStoryDetailView(originalIndex);

            const titleSpan = document.createElement('span');
            titleSpan.className = 'library-item-title';
            titleSpan.textContent = story.title;
            itemDiv.appendChild(titleSpan);

            const dateSpan = document.createElement('span');
            dateSpan.className = 'library-item-date';
            dateSpan.textContent = `Finished: ${new Date(story.timestamp).toLocaleString()}`;
            itemDiv.appendChild(dateSpan);

            container.appendChild(itemDiv);
        });
    }

    function _showStoryDetailView(storyIndex) {
        _clearGameContainer();
        currentView = 'detail';
        gameActive = false;

        const story = storyLibrary[storyIndex];
        if (!story) {
            console.error("Invalid story index for detail view:", storyIndex);
            _showLibraryView(); // Go back if error
            return;
        }

        storyDetailViewArea = document.createElement('div');
        storyDetailViewArea.className = 'story-detail-view';

        const title = document.createElement('h3');
        title.textContent = story.title;
        storyDetailViewArea.appendChild(title);

        const backButton = document.createElement('button');
        backButton.textContent = '← Back to Library';
        backButton.className = 'rps-choice-button secondary library-back-button';
        backButton.onclick = _showLibraryView;
        storyDetailViewArea.appendChild(backButton);

        // Render the story history
        story.history.forEach(turn => {
            if (turn.choice === "[Start]") {
                 // Display initial story part
                 const storyP = document.createElement('p');
                 // Sanitize and format
                 let processedText = DOMPurify.sanitize(turn.story)
                     .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                     .replace(/\*(.*?)\*/g, '<em>$1</em>')
                     .replace(/(?<!<br>)\n/g, '<br>');
                 storyP.innerHTML = `<strong>Mika:</strong> ${processedText}`;
                 storyDetailViewArea.appendChild(storyP);
            } else {
                 // Display user choice first, then Mika's response
                 const choiceP = document.createElement('p');
                 choiceP.className = 'detail-user-action'; // Specific class for styling
                 choiceP.innerHTML = `> ${currentUserName}: ${DOMPurify.sanitize(turn.choice)}`;
                 storyDetailViewArea.appendChild(choiceP);

                 const storyP = document.createElement('p');
                 let processedText = DOMPurify.sanitize(turn.story)
                     .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                     .replace(/\*(.*?)\*/g, '<em>$1</em>')
                     .replace(/(?<!<br>)\n/g, '<br>');
                 storyP.innerHTML = `<strong>Mika:</strong> ${processedText}`;
                 storyDetailViewArea.appendChild(storyP);
            }
        });

        gameUiContainer.appendChild(storyDetailViewArea);
        // Scroll to top of detail view
         storyDetailViewArea.scrollTop = 0;
    }


    // --- Initialization and Exit ---
    function init(_gameUiContainer, _messageCallback, _apiCaller, userName) {
        gameUiContainer = _gameUiContainer;
        messageCallback = _messageCallback;
        apiCaller = _apiCaller;
        currentUserName = userName || "User"; // Use provided name

        if (!gameUiContainer) {
            console.error("StoryTime Game UI container not provided!");
            return;
        }

        _loadLibrary(); // Load saved stories
        // Start by showing the initial prompt/genre selection UI
        _createInitialUI();
        // Reset other states
        storyHistory = [];
        currentChoices = [];
        gameActive = false;
        isMikaGenerating = false;
    }

    function onExit() {
         console.log("StoryTime onExit called.");
         // Reset transient state, library persists in localStorage
         storyHistory = [];
         currentChoices = [];
         gameActive = false;
         isMikaGenerating = false;
         currentView = 'prompt'; // Reset view state
         // No async actions needed that must complete before exiting
         return Promise.resolve(true);
    }

    // Public interface
    return {
        init: init,
        onExit: onExit
    };

})();

// --- END OF FILE storytime.js ---