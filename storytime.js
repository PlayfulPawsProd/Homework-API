// --- START OF FILE storytime.js ---

// Nyaa~! Mika's Story Time! Let's Make an Adventure, {user}! 📖♡
// ** UPDATED with Persona Switching - CORRECTED VERSION **

const StoryTime = (() => {
    // --- Settings ---
    const STORY_CONTEXT_LENGTH = 3;
    const MAX_CHOICES = 3;
    const LIBRARY_STORAGE_KEY = 'mikaStoryLibrary_v1';

    // --- State ---
    let gameUiContainer = null;
    let messageCallback = null;
    let apiCaller = null;
    let currentUserName = "User"; // Updated via init
    let currentPersonaInGame = 'Mika'; // ** NEW: Store current persona **
    let storyHistory = [];           // { story: string, choice: string }
    let currentChoices = [];
    let gameActive = false;
    let isAssistantGenerating = false; // Renamed for clarity
    let storyLibrary = [];           // { title, timestamp, history, persona } // Added persona!
    let currentView = 'prompt';

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
        // Uses the main message log (outside the game UI)
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
        // Reset DOM references
        storyDisplayArea = storyChoicesArea = storyInputArea = storyTextInput = storySendButton = null;
        storyStatusArea = initialPromptArea = libraryViewArea = storyDetailViewArea = customPromptInput = null;
    }

    // ** UPDATED ** _createInitialUI uses persona for title/text
    function _createInitialUI() {
        _clearGameContainer();
        currentView = 'prompt';
        gameActive = false;

        // Create the container for the initial prompt screen
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
            ? 'Pick a genre, view the library, or give me your own idea. Try not to make it boring.'
            : 'What kind of story should we have today? Pick a genre, view our library, or tell me your idea!';
        initialPromptArea.appendChild(promptText);

        // Genre Buttons container (matches original structure for CSS)
        const genreButtonContainer = document.createElement('div');
        const genres = ['Magical Quest ✨', 'Spooky Mystery 👻', 'Sci-Fi Exploration 🚀', 'Slice of Life 🌸', 'Surprise Me! 🎉'];
        genres.forEach(genre => {
            const button = document.createElement('button');
            button.textContent = genre;
            button.className = 'rps-choice-button'; // Reuses button style from other games
            button.onclick = () => _startGame(genre.replace(/[\s✨👻🚀🌸🎉]/g, '')); // Clean genre name for prompt
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
        storyTextInput.placeholder = 'Or type your own action...';
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
            processedText = processedText
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/(?<!<br>)\n/g, '<br>');
            // ** Add Persona Name Prefix **
            paragraph.innerHTML = `<strong>${currentPersonaInGame}:</strong> ${processedText}`;
        } else {
            // For user actions, the calling function formats it correctly
            paragraph.innerHTML = text;
        }

        storyDisplayArea.appendChild(paragraph);
        // Use setTimeout to ensure scroll happens after render
        setTimeout(() => { storyDisplayArea.scrollTop = storyDisplayArea.scrollHeight; }, 0);
    }

    // ** UPDATED ** _appendUserActionToStory uses currentUserName
    function _appendUserActionToStory(actionText) {
         if (!storyDisplayArea) return;
         const sanitizedAction = DOMPurify.sanitize(actionText);
         // ** Format with currentUserName **
         const formattedText = `> ${currentUserName}: ${sanitizedAction}`;
         _appendStoryParagraph(formattedText, 'user-action'); // Pass the formatted text and class
     }

    // (Auto-scrolling choices logic - unchanged from original implementation)
    function _displayChoices(choices) {
        if (!storyChoicesArea) return;
        storyChoicesArea.innerHTML = '';
        if (!choices || choices.length === 0) { return; }
        currentChoices = choices;
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
            requestAnimationFrame(() => { // Check for overflow after render
                 if (!button.isConnected) return;
                 const computedStyle = window.getComputedStyle(button);
                 const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
                 const paddingRight = parseFloat(computedStyle.paddingRight) || 0;
                 const availableWidth = button.clientWidth - paddingLeft - paddingRight;
                 const textWidth = textSpan.scrollWidth;
                 if (textWidth > availableWidth + 1) {
                     button.classList.add('text-overflow-scroll'); // Add class from CSS
                     const scrollDistance = availableWidth - textWidth;
                     button.style.setProperty('--scroll-distance', `${scrollDistance - 5}px`);
                     const overflowAmount = textWidth - availableWidth;
                     const baseDuration = 6; const extraPerPixel = 0.06;
                     let duration = Math.max(6, baseDuration + overflowAmount * extraPerPixel);
                     duration = Math.min(duration, 25);
                     textSpan.style.animationDuration = `${duration.toFixed(1)}s`;
                     button.title = cleanChoiceText;
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
        const endMarker = "(The End)";
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.includes(endMarker)) {
                 storyPart += line.replace(endMarker, '').trim() + "\n";
                 choices = []; readingChoices = false; break;
             }
            if (/^[\*\-\d]+\.?\s+/.test(trimmedLine)) {
                readingChoices = true;
                const choiceText = trimmedLine.replace(/^[\*\-\d]+\.?\s*/, '').trim();
                if(choiceText) choices.push(choiceText);
            } else if (readingChoices && trimmedLine) { // If reading choices and get non-empty line not starting like a choice
                 storyPart += line + "\n"; // Assume it's part of the story now
                 // Optionally reset readingChoices = false here if needed, but let's keep flexible
            } else if (!readingChoices) { // Only add to story if not in choice mode
                 storyPart += line + "\n";
             }
        }
        storyPart = storyPart.trim();
        choices = choices.slice(0, MAX_CHOICES);
        return { storyPart, choices, storyEnded: responseText.includes(endMarker) };
    }


    // ** UPDATED ** _callStoryAPI passes context correctly
    async function _callStoryAPI(prompt, contextTurns = []) {
        if (!apiCaller) {
            _sendMessageToLog("Mrow! Cannot call the magic box!", "System");
            return Promise.reject("API Caller not available");
        }
        _setLoadingState(true);

        // Format context for the API call structure expected by api.js
        const apiContext = contextTurns.flatMap(turn => [
            // Story part is from the 'model' (assistant)
            { role: 'model', parts: [{ text: turn.story }] },
            // Choice/action is from the 'user'
            { role: 'user', parts: [{ text: turn.choice }] }
        ]);

        try {
            // apiCaller (in index.html) now handles passing the currentPersona
            const response = await apiCaller(prompt, apiContext);
            return response;
        } catch (error) {
            console.error("Story API call failed:", error);
             _sendMessageToLog(`${currentPersonaInGame === 'Kana' ? 'API error.' : 'Meeeow! The story magic fizzled...'} (${error})`, "System"); // Persona voice
             return null;
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
            return;
        }
        await _startGame(customText);
    }

    // ** UPDATED ** _startGame uses persona-aware prompt and messaging
    async function _startGame(promptText) {
        console.log(`Starting story (${currentPersonaInGame}) with prompt: ${promptText.substring(0, 50)}...`);
         // ** Persona voice **
        _sendMessageToLog(currentPersonaInGame === 'Kana' ? `Starting story for ${currentUserName}. Try to keep up.` : `Okay, ${currentUserName}! Let's begin our adventure! ♡`, currentPersonaInGame);
        _createGameLayout();
        gameActive = true;
        storyHistory = [];

        const isGenre = ['MagicalQuest', 'SpookyMystery', 'SciFiExploration', 'SliceOfLife', 'SurpriseMe'].includes(promptText);
        const startingInstruction = isGenre
            ? `Start a brand new story in the genre of "${promptText}".`
            : `Start a brand new story based on this idea from ${currentUserName}: "${promptText}".`;

        // ** Persona-aware initial prompt **
        const personaPromptPart = (currentPersonaInGame === 'Kana')
            ? `You are Kana, a sarcastic and witty catgirl telling an interactive story to ${currentUserName}. ${startingInstruction} Describe the opening scene (2-3 paragraphs) with your characteristic dry wit or slightly dark humor.`
            : `You are Mika, a playful, enthusiastic catgirl telling an interactive story to ${currentUserName}. ${startingInstruction} Describe the opening scene vividly (2-3 paragraphs). Make it exciting!`;

        const initialPrompt = `${personaPromptPart} End the scene by giving ${currentUserName} exactly ${MAX_CHOICES} clear choices for what to do next, presented as a bulleted list on separate lines (e.g., '* Choice 1\\n* Choice 2'). Make the choices distinct actions.`;

        try {
            const responseText = await _callStoryAPI(initialPrompt);
            if (responseText) {
                const { storyPart, choices } = _parseStoryAndChoices(responseText);
                if(storyPart) _appendStoryParagraph(storyPart); // Appends with persona name
                _displayChoices(choices);
                storyHistory.push({ story: storyPart, choice: "[Start]" });
            } else {
                 _appendStoryParagraph(currentPersonaInGame === 'Kana' ? "Couldn't start. Try again." : "Meeeow... My imagination is fuzzy right now. Couldn't start the story. Maybe try again?");
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

    // ** UPDATED ** _handleUserAction uses persona-aware prompt and messaging
    async function _handleUserAction(actionText) {
        if (!gameActive || isAssistantGenerating) return;
        console.log(`User action (${currentUserName}): ${actionText}`);
        _appendUserActionToStory(actionText); // Displays user action correctly
        if(storyTextInput) storyTextInput.value = '';
        _displayChoices([]);

        const context = storyHistory.slice(-STORY_CONTEXT_LENGTH);

        // ** Persona-aware continuation prompt **
        const personaPromptPart = (currentPersonaInGame === 'Kana')
            ? `You are Kana, a sarcastic and witty catgirl continuing an interactive story for ${currentUserName}. The story so far involved these recent turns (your text then their choice).`
            : `You are Mika, a playful, enthusiastic catgirl continuing an interactive story for ${currentUserName}. The story so far involved these recent turns (your text then their choice).`;

        const prompt = `${personaPromptPart} Now, ${currentUserName} decided to: "${actionText}". Describe what happens next (2-3 paragraphs) in your distinct voice (${currentPersonaInGame === 'Kana' ? 'dry wit, sarcasm' : 'bubbly, enthusiastic'}). Keep the story engaging and consistent. VERY IMPORTANT: End your response by giving ${currentUserName} exactly ${MAX_CHOICES} new, clear choices as a bulleted list on separate lines (e.g., '* Choice 1\\n* Choice 2'). Ensure choices are distinct actions. If the story reaches a natural conclusion or dead end based on the action, describe it and write **(The End)** on a new line instead of offering choices.`;

         try {
            const responseText = await _callStoryAPI(prompt, context);
             if (responseText) {
                 const { storyPart, choices, storyEnded } = _parseStoryAndChoices(responseText);
                 if(storyPart) _appendStoryParagraph(storyPart); // Appends with persona name

                 if (storyEnded) {
                      // ** Persona voice **
                     _sendMessageToLog(currentPersonaInGame === 'Kana' ? "The end. Start another if you want." : "And that's the end of that adventure! Want to start another?", currentPersonaInGame);
                     gameActive = false;
                     await _saveCompletedStory(); // Save with correct persona tag
                      // ** Persona button text **
                     _showRestartButton(currentPersonaInGame === 'Kana' ? "New Story." : "Start New Story? ♡");
                     if(storyInputArea) storyInputArea.style.display = 'none';
                 } else if (choices.length > 0) {
                     _displayChoices(choices);
                     storyHistory.push({ story: storyPart, choice: actionText });
                     if (storyHistory.length > STORY_CONTEXT_LENGTH + 2) { storyHistory.shift(); }
                 } else { // No choices and no end marker
                     // ** Persona voice **
                     _appendStoryParagraph(currentPersonaInGame === 'Kana' ? "Not sure what happens next. Try something else." : "Meeeow? I... I'm not sure what happens next! My story magic fizzled! Maybe try a different action, or type something yourself?");
                     _displayChoices(currentChoices); // Re-show last choices
                 }
             } else { // API returned null/empty
                  // ** Persona voice **
                 _appendStoryParagraph(currentPersonaInGame === 'Kana' ? "Connection fuzzy. Try again." : "Mrow... My crystal ball is cloudy... couldn't see what happens next. Try again, or type something different?");
                 _displayChoices(currentChoices);
             }
         } catch (error) {
             // ** Persona voice **
             _appendStoryParagraph(currentPersonaInGame === 'Kana' ? "Error continuing story." : "*Whimper* Something went wrong continuing our story! Maybe try again?");
             console.error("Error handling user action:", error);
             _displayChoices(currentChoices);
         }
    }

    // ** UPDATED ** Saves story with current persona tag
    async function _saveCompletedStory() {
        if (!storyHistory || storyHistory.length === 0) { return; }
         // ** Persona voice **
        _sendMessageToLog(currentPersonaInGame === 'Kana' ? "Saving story..." : "Saving our adventure to the library...", currentPersonaInGame);
        let title = `A ${currentPersonaInGame} Story (${new Date().toLocaleDateString()})`; // Default persona title

        try {
            const generatedTitle = await _generateStoryTitle([...storyHistory]);
            if (generatedTitle) { title = generatedTitle; }
        } catch (error) {
             // ** Persona voice **
             _sendMessageToLog(currentPersonaInGame === 'Kana' ? "Couldn't generate title." : "Couldn't think of a title... it remains a mystery!", currentPersonaInGame);
        }

        const completedStory = {
            title: title,
            timestamp: Date.now(),
            history: [...storyHistory],
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
        const firstAction = history.find(turn => turn.choice !== "[Start]")?.choice || "the beginning";
        const lastStoryPart = history[history.length - 1]?.story || "the end";
        const contextSummary = `The story started with ${currentUserName} choosing "${firstAction.substring(0, 50)}..." and ended near: "${lastStoryPart.substring(0, 100)}..."`;

        // ** Persona-aware title prompt **
        const personaPromptPart = (currentPersonaInGame === 'Kana')
            ? `You are Kana. Summarize the essence of this short interactive story based on the context: ${contextSummary}.`
            : `You are Mika. Summarize the essence of this short interactive story based on the context: ${contextSummary}.`;

        const prompt = `${personaPromptPart} Generate a short, catchy title (4-8 words maximum) suitable for a storybook. Just output the title itself, nothing else.`;

        try {
            const response = await apiCaller(prompt);
            if (response && typeof response === 'string') {
                 let cleanTitle = response.trim().replace(/["']/g, '');
                 if (cleanTitle.length > 0 && cleanTitle.length < 80) { return cleanTitle; }
            }
             console.warn("Generated title was invalid:", response); return null;
        } catch (error) { console.error("API call for story title failed:", error); return null; }
    }

    // ** UPDATED ** Shows restart button with persona-specific text
    function _showRestartButton(buttonText = null) {
         if (storyChoicesArea) {
             storyChoicesArea.innerHTML = '';
             const newStoryBtn = document.createElement('button');
             // ** Use persona text **
             newStoryBtn.textContent = buttonText || (currentPersonaInGame === 'Kana' ? "New Story." : "Play Again? ♡");
             newStoryBtn.className = 'rps-choice-button'; // Matches CSS
             newStoryBtn.style.marginTop = '15px'; // Matches CSS
             newStoryBtn.onclick = _createInitialUI; // Go back to initial prompt screen
             storyChoicesArea.appendChild(newStoryBtn);
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
        _renderLibraryList(listContainer);
    }

    // ** UPDATED ** _renderLibraryList shows persona who told story
    function _renderLibraryList(container) {
        container.innerHTML = '';
        if (storyLibrary.length === 0) {
            const emptyMsg = document.createElement('p');
             // ** Persona voice **
            emptyMsg.textContent = currentPersonaInGame === 'Kana' ? "Library empty." : "No adventures saved yet... Let's make some memories!";
            emptyMsg.style.textAlign = 'center';
            emptyMsg.style.fontStyle = 'italic';
            emptyMsg.style.color = 'var(--system-message-text)';
            container.appendChild(emptyMsg);
            return;
        }
        [...storyLibrary].reverse().forEach((story, index) => {
            const originalIndex = storyLibrary.length - 1 - index;
            const itemDiv = document.createElement('div');
            itemDiv.className = 'library-item'; // Matches CSS
            itemDiv.onclick = () => _showStoryDetailView(originalIndex);

            const titleSpan = document.createElement('span');
            titleSpan.className = 'library-item-title'; // Matches CSS
            titleSpan.textContent = story.title;
            itemDiv.appendChild(titleSpan);

            const dateSpan = document.createElement('span');
            dateSpan.className = 'library-item-date'; // Matches CSS
            // ** Add persona who told it **
            const writer = story.persona || 'Mika';
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
        if (!story) { _showLibraryView(); return; }

        const writerPersona = story.persona || 'Mika'; // Get writer persona

        storyDetailViewArea = document.createElement('div');
        storyDetailViewArea.className = 'story-detail-view'; // Matches CSS

        const title = document.createElement('h3');
        title.textContent = story.title; // Matches CSS structure
        storyDetailViewArea.appendChild(title);

        const backButton = document.createElement('button');
        backButton.textContent = '← Back to Library';
        backButton.className = 'rps-choice-button secondary library-back-button'; // Matches CSS
        backButton.onclick = _showLibraryView;
        storyDetailViewArea.appendChild(backButton);

        // Render history using correct names
        story.history.forEach(turn => {
            if (turn.choice === "[Start]") {
                 const storyP = document.createElement('p');
                 let processedText = DOMPurify.sanitize(turn.story).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/(?<!<br>)\n/g, '<br>');
                 // ** Use writer's name **
                 storyP.innerHTML = `<strong>${writerPersona}:</strong> ${processedText}`;
                 storyDetailViewArea.appendChild(storyP);
            } else {
                 const choiceP = document.createElement('p');
                 choiceP.className = 'detail-user-action'; // Matches CSS
                 // ** Use current user name **
                 choiceP.innerHTML = `> ${currentUserName}: ${DOMPurify.sanitize(turn.choice)}`;
                 storyDetailViewArea.appendChild(choiceP);

                 const storyP = document.createElement('p');
                 let processedText = DOMPurify.sanitize(turn.story).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/(?<!<br>)\n/g, '<br>');
                 // ** Use writer's name **
                 storyP.innerHTML = `<strong>${writerPersona}:</strong> ${processedText}`;
                 storyDetailViewArea.appendChild(storyP);
            }
        });
        gameUiContainer.appendChild(storyDetailViewArea);
        storyDetailViewArea.scrollTop = 0;
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

        if (!gameUiContainer) { console.error("StoryTime Game UI container not provided!"); return; }

        _loadLibrary();
        _createInitialUI(); // Creates UI based on currentPersonaInGame
        storyHistory = [];
        currentChoices = [];
        gameActive = false;
        currentView = 'prompt';
    }

    // (onExit remains unchanged - no specific persona logic needed on cleanup)
    function onExit() {
         console.log("StoryTime onExit called.");
         storyHistory = [];
         currentChoices = [];
         gameActive = false;
         isAssistantGenerating = false;
         currentView = 'prompt';
         return Promise.resolve(true); // Indicate synchronous completion
    }

    // Public interface
    return {
        init: init,
        onExit: onExit
    };

})();

// Fallback Sanitizer (Keep this at the end)
if (typeof DOMPurify === 'undefined') {
    console.warn("DOMPurify not loaded. Using basic HTML escaping as fallback for storytime.");
    window.DOMPurify = { sanitize: (str) => str.replace(/</g, '&lt;').replace(/>/g, '&gt;') };
}
// --- END OF FILE storytime.js ---