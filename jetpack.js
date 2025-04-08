// --- START OF FILE jetpack.js --- (MODIFIED AGAIN for iOS Touch Fix)

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

    // ♡ Pre-defined Commentary! ♡ (Persona-specific)
    const responses = {
        Mika: {
            encouragement: [
                "Wow, you're flying so high, {user}! ☆",
                "Go, go, go! You can do it! Nyaa~!",
                "Wheee! Look at you go! *giggle*",
                "Be careful up there, {user}! ♡",
                "Amazing jetpack skills! *purrrr*",
                "Keep it up! You're doing great!",
                "Don't crash now, silly! 😉"
            ]
        },
        Kana: {
            grumbling: [
                "Focus, {user}. Don't mess up.",
                "*Sigh*... Still playing this?",
                "Try not to hit anything obvious.",
                "Are you even trying, {user}?",
                "Just... fly straight, maybe?",
                "This looks tedious.",
                "Don't break the jetpack."
            ]
        }
    };

    // --- Helper Functions ---
    function _getRandomCommentary() {
        const personaResponses = responses[currentPersonaInGame] || responses['Mika'];
        const messageType = (currentPersonaInGame === 'Kana') ? 'grumbling' : 'encouragement';
        const possibleMessages = personaResponses[messageType];
        if (!possibleMessages || possibleMessages.length === 0) {
            return "..."; // Fallback
        }
        const randomIndex = Math.floor(Math.random() * possibleMessages.length);
        // Ensure {user} replacement happens correctly
        return possibleMessages[randomIndex].replace(/{user}/g, currentUserName || "Player");
    }

    // Function to display commentary (similar to chores app)
    function _showJetpackCommentary() {
        if (!commentaryElement) return;

        const msg = _getRandomCommentary();

        // Clear existing timeouts if any
        if (commentaryElement.fadeTimeout) clearTimeout(commentaryElement.fadeTimeout);
        if (commentaryElement.clearTimeout) clearTimeout(commentaryElement.clearTimeout);

        commentaryElement.textContent = msg;
        commentaryElement.style.opacity = '1';
        commentaryElement.style.transition = ''; // Reset transition

        // Set timeout to fade out
        commentaryElement.fadeTimeout = setTimeout(() => {
            if (commentaryElement) {
                commentaryElement.style.transition = 'opacity 0.5s ease-out';
                commentaryElement.style.opacity = '0';
                // Set timeout to clear text *after* fade out
                commentaryElement.clearTimeout = setTimeout(() => {
                    if (commentaryElement) {
                        commentaryElement.textContent = '';
                        commentaryElement.style.opacity = '1'; // Ready for next message
                        commentaryElement.style.transition = '';
                    }
                }, 500); // Match transition duration
            }
        }, 3500); // Show message for 3.5 seconds
    }

    // --- Initialization and Exit ---
    function init(_gameUiContainer, _messageCallback, _apiCaller, userName, persona) {
        console.log("Initializing Jetpack Game Viewer (iOS Touch Fix Attempt)..."); // Updated log
        gameUiContainer = _gameUiContainer;
        currentUserName = userName || "Player";
        currentPersonaInGame = persona || 'Mika';
        commentaryIntervalId = null;

        if (!gameUiContainer) {
            console.error("Jetpack Game UI container not provided!");
            if(_messageCallback) _messageCallback('System', 'Error: Jetpack UI container missing!');
            return;
        }
        gameUiContainer.innerHTML = '';
        gameUiContainer.style.display = 'flex';
        gameUiContainer.style.flexDirection = 'column';
        gameUiContainer.style.height = '100%';

        // Create the commentary area (Unchanged)
        commentaryElement = document.createElement('div');
        commentaryElement.id = 'jetpack-commentary';
        commentaryElement.style.cssText = `
            min-height: 1.4em; height: 2.8em; overflow: hidden;
            text-align: center; font-style: italic; font-size: 0.85em;
            color: var(--mika-message-name); padding: 3px 0; margin-bottom: 5px;
            opacity: 1; transition: opacity 0.5s ease-out; flex-shrink: 0;
            display: flex; align-items: center; justify-content: center; line-height: 1.4em;
        `;
        gameUiContainer.appendChild(commentaryElement);

        // *** MODIFICATION START ***
        // Create a SIMPLE wrapper (mostly for structure/flex grow)
        const iframeWrapper = document.createElement('div');
        iframeWrapper.id = 'jetpack-iframe-container';
        iframeWrapper.style.cssText = `
            width: 100%;
            flex-grow: 1; /* Takes up remaining vertical space */
            /* REMOVED overflow: hidden; */
            /* REMOVED position: relative; */
            /* REMOVED border-radius: 8px; */
            /* We might need position relative IF we add pseudo-elements later for border */
            position: relative; /* Keep for potential overlay effects if needed */
        `;

        // Create the iframe for the game
        const iframe = document.createElement('iframe');
        iframe.id = 'jetpack-game-iframe';
        iframe.src = GAME_URL;
        iframe.style.cssText = `
            width: 100%;
            height: 100%; /* Fill the wrapper */
            border: none;
            display: block;
            /* --- APPLY VISUALS AND FIXES DIRECTLY HERE --- */
            border-radius: 8px; /* Apply rounded corners to the iframe */
            overflow: hidden; /* Make the iframe clip its content to the rounded corners */
            -webkit-overflow-scrolling: touch; /* Keep the iOS touch scrolling helper */
            /* --- --- */
        `;
        // *** MODIFICATION END ***

        iframeWrapper.appendChild(iframe);
        gameUiContainer.appendChild(iframeWrapper);

        // Create the back button (Unchanged)
        const backButton = document.createElement('button');
        backButton.id = 'back-to-chat-button';
        backButton.textContent = 'Back to Chat';
        backButton.className = 'rps-choice-button secondary';
        backButton.onclick = () => {
            if (typeof switchToChatView === 'function') {
                switchToChatView();
            } else {
                console.error("Cannot find switchToChatView function!");
            }
        };
        backButton.style.marginTop = '10px';
        backButton.style.flexShrink = '0';
        backButton.style.display = 'block';
        backButton.style.marginLeft = 'auto';
        backButton.style.marginRight = 'auto';
        gameUiContainer.appendChild(backButton);

        // Start the commentary timer (Unchanged)
        if (commentaryIntervalId) clearInterval(commentaryIntervalId);
        commentaryIntervalId = setInterval(_showJetpackCommentary, COMMENTARY_INTERVAL_MS);

        console.log(`Jetpack Game viewer initialized for ${currentUserName} with ${currentPersonaInGame}. Applied direct iframe styles for iOS touch.`);
    }

    function onExit() { // Unchanged
        console.log("JetpackGame onExit called.");
        if (commentaryIntervalId) {
            clearInterval(commentaryIntervalId);
            commentaryIntervalId = null;
            console.log("Commentary interval cleared.");
        }
        commentaryElement = null;
        return Promise.resolve(true);
    }

    // --- Public Interface ---
    return {
        init: init,
        onExit: onExit
    };

})();

// --- END OF FILE jetpack.js --- (MODIFIED AGAIN for iOS Touch Fix)