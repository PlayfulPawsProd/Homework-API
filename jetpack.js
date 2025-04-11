// --- START OF FILE jetpack.js --- (MODIFIED AGAIN for iOS Touch Fix - Attempt 2)

// Nyaa~! Kitty Jet Pack! Fly high, User~! ♡ (Or... whatever. - Kana)

const JetpackGame = (() => {
    // --- Settings ---
    const GAME_URL = "https://playfulpawsprod.github.io/Kitty-Jet-Pack/"; // The URL of the game
    const COMMENTARY_INTERVAL_MS = 20000; // Show commentary every 20 seconds

    // --- State ---
    let gameUiContainer = null; // The App Area container
    let currentUserName = "Player";
    let currentPersonaInGame = 'Mika';
    let commentaryIntervalId = null; // To store the timer ID
    let commentaryElement = null; // The div for commentary
    let gameIframe = null; // <<< Keep a reference to the iframe

    // ♡ Pre-defined Commentary! ♡ (Persona-specific)
    const responses = { /* ... commentary remains the same ... */
        Mika: { encouragement: [ "Wow, you're flying so high, {user}! ☆", "Go, go, go! You can do it! Nyaa~!", "Wheee! Look at you go! *giggle*", "Be careful up there, {user}! ♡", "Amazing jetpack skills! *purrrr*", "Keep it up! You're doing great!", "Don't crash now, silly! 😉" ] },
        Kana: { grumbling: [ "Focus, {user}. Don't mess up.", "*Sigh*... Still playing this?", "Try not to hit anything obvious.", "Are you even trying, {user}?", "Just... fly straight, maybe?", "This looks tedious.", "Don't break the jetpack." ] }
    };


    // --- Helper Functions ---
    function _getRandomCommentary() { /* ... remains the same ... */
        const personaResponses = responses[currentPersonaInGame] || responses['Mika'];
        const messageType = (currentPersonaInGame === 'Kana') ? 'grumbling' : 'encouragement';
        const possibleMessages = personaResponses[messageType];
        if (!possibleMessages || possibleMessages.length === 0) { return "..."; }
        const randomIndex = Math.floor(Math.random() * possibleMessages.length);
        return possibleMessages[randomIndex].replace(/{user}/g, currentUserName || "Player");
    }

    function _showJetpackCommentary() { /* ... remains the same ... */
        if (!commentaryElement) return;
        const msg = _getRandomCommentary();
        if (commentaryElement.fadeTimeout) clearTimeout(commentaryElement.fadeTimeout);
        if (commentaryElement.clearTimeout) clearTimeout(commentaryElement.clearTimeout);
        commentaryElement.textContent = msg;
        commentaryElement.style.opacity = '1'; commentaryElement.style.transition = '';
        commentaryElement.fadeTimeout = setTimeout(() => { if (commentaryElement) { commentaryElement.style.transition = 'opacity 0.5s ease-out'; commentaryElement.style.opacity = '0'; commentaryElement.clearTimeout = setTimeout(() => { if (commentaryElement) { commentaryElement.textContent = ''; commentaryElement.style.opacity = '1'; commentaryElement.style.transition = ''; } }, 500); } }, 3500);
    }

    // --- Initialization and Exit ---
    function init(_gameUiContainer, _messageCallback, _apiCaller, userName, persona) {
        console.log("Initializing Jetpack Game Viewer (iOS Touch Fix Attempt 2 - Simplify Structure)..."); // Updated log
        gameUiContainer = _gameUiContainer;
        currentUserName = userName || "Player";
        currentPersonaInGame = persona || 'Mika';
        commentaryIntervalId = null;
        gameIframe = null; // Reset iframe reference

        if (!gameUiContainer) {
            console.error("Jetpack Game UI container not provided!");
            if(_messageCallback) _messageCallback('System', 'Error: Jetpack UI container missing!');
            return;
        }
        gameUiContainer.innerHTML = '';
        // Apply flex styles directly to the container
        gameUiContainer.style.display = 'flex';
        gameUiContainer.style.flexDirection = 'column';
        gameUiContainer.style.height = '100%';
        // REMOVED overflow: hidden from container, might interfere

        // Create the commentary area (stays the same)
        commentaryElement = document.createElement('div');
        commentaryElement.id = 'jetpack-commentary';
        commentaryElement.style.cssText = ` /* ... commentary styles remain the same ... */
            min-height: 1.4em; height: 2.8em; overflow: hidden;
            text-align: center; font-style: italic; font-size: 0.85em;
            color: var(--mika-message-name); padding: 3px 0; margin-bottom: 5px;
            opacity: 1; transition: opacity 0.5s ease-out; flex-shrink: 0;
            display: flex; align-items: center; justify-content: center; line-height: 1.4em;
        `;
        gameUiContainer.appendChild(commentaryElement);

        // *** MODIFICATION START: Remove Wrapper Div ***
        // Create the iframe for the game directly
        gameIframe = document.createElement('iframe'); // Assign to state variable
        gameIframe.id = 'jetpack-game-iframe';
        gameIframe.src = GAME_URL;
        gameIframe.style.cssText = `
            width: 100%;
            flex-grow: 1; /* Let the iframe take the remaining space */
            border: none;
            display: block;
            border-radius: 8px; /* Keep rounded corners */
            overflow: hidden; /* Keep content clipping */
            -webkit-overflow-scrolling: touch; /* Keep iOS scrolling hint */
        `;
        // *** MODIFICATION END ***

        // Append the iframe directly to the container
        gameUiContainer.appendChild(gameIframe);

        // Create the back button (stays the same)
        const backButton = document.createElement('button');
        backButton.id = 'back-to-chat-button';
        backButton.textContent = 'Back to Chat';
        backButton.className = 'rps-choice-button secondary';
        backButton.onclick = () => { if (typeof switchToChatView === 'function') { switchToChatView(); } else { console.error("Cannot find switchToChatView function!"); } };
        backButton.style.marginTop = '10px'; backButton.style.flexShrink = '0'; backButton.style.display = 'block'; backButton.style.marginLeft = 'auto'; backButton.style.marginRight = 'auto';
        gameUiContainer.appendChild(backButton);

        // Start the commentary timer (stays the same)
        if (commentaryIntervalId) clearInterval(commentaryIntervalId);
        commentaryIntervalId = setInterval(_showJetpackCommentary, COMMENTARY_INTERVAL_MS);

        console.log(`Jetpack Game viewer initialized for ${currentUserName} with ${currentPersonaInGame}. Removed iframe wrapper.`);
    }

    function onExit() { // Unchanged
        console.log("JetpackGame onExit called.");
        if (commentaryIntervalId) { clearInterval(commentaryIntervalId); commentaryIntervalId = null; }
        commentaryElement = null;
        gameIframe = null; // Clear iframe reference
        // The container's content is cleared by the main script, no need to remove iframe explicitly here
        return Promise.resolve(true);
    }

    // --- Public Interface ---
    return {
        init: init,
        onExit: onExit
    };

})();

// --- END OF FILE jetpack.js --- (iOS Touch Fix Attempt 2)