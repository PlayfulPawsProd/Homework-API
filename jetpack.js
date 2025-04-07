// --- START OF FILE jetpack.js --- (MODIFIED)

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
        console.log("Initializing Jetpack Game Viewer...");
        gameUiContainer = _gameUiContainer;
        // messageCallback not really used here, maybe for errors?
        // apiCaller not used here
        currentUserName = userName || "Player"; // Make sure username is set
        currentPersonaInGame = persona || 'Mika';
        commentaryIntervalId = null; // Reset interval ID on init

        if (!gameUiContainer) {
            console.error("Jetpack Game UI container not provided!");
            if(_messageCallback) _messageCallback('System', 'Error: Jetpack UI container missing!');
            // Potentially call switchToChatView() here if possible?
            return;
        }
        gameUiContainer.innerHTML = ''; // Clear previous content
        // Ensure the container itself is using flexbox column layout
        gameUiContainer.style.display = 'flex';
        gameUiContainer.style.flexDirection = 'column';
        gameUiContainer.style.height = '100%'; // Make sure container takes height

        // Create the commentary area
        commentaryElement = document.createElement('div');
        commentaryElement.id = 'jetpack-commentary';
        // ** Adjusted CSS for fixed height **
        commentaryElement.style.cssText = `
            min-height: 1.4em; /* Ensure minimum space */
            height: 2.8em; /* Reserve space for ~2 lines to prevent shifting */
            overflow: hidden; /* Hide overflow if message is longer */
            text-align: center;
            font-style: italic;
            font-size: 0.85em;
            color: var(--mika-message-name);
            padding: 3px 0;
            margin-bottom: 5px;
            opacity: 1;
            transition: opacity 0.5s ease-out;
            flex-shrink: 0; /* Don't shrink this element */
            display: flex; /* Use flex to center vertically */
            align-items: center; /* Center text vertically */
            justify-content: center; /* Center text horizontally */
            line-height: 1.4em; /* Match min-height for single line centering */
        `;
        gameUiContainer.appendChild(commentaryElement);

        // ** NEW: Create a wrapper for the iframe for faded border effect **
        const iframeWrapper = document.createElement('div');
        iframeWrapper.id = 'jetpack-iframe-container'; // ID for CSS styling
        iframeWrapper.style.cssText = `
            width: 100%;
            flex-grow: 1; /* Takes up remaining vertical space */
            overflow: hidden; /* Needed for pseudo-element positioning */
            position: relative; /* Needed for pseudo-element positioning */
            border-radius: 8px; /* Optional: Rounded corners for the fade effect */
        `;

        // Create the iframe for the game
        const iframe = document.createElement('iframe');
        iframe.id = 'jetpack-game-iframe';
        iframe.src = GAME_URL;
        iframe.style.cssText = `
            width: 100%;
            height: 100%; /* Fill the wrapper */
            border: none;
            display: block; /* Prevent extra space below iframe */
        `;
        iframeWrapper.appendChild(iframe); // Add iframe to the wrapper
        gameUiContainer.appendChild(iframeWrapper); // Add wrapper to the main container

        // Create the back button
        const backButton = document.createElement('button');
        backButton.id = 'back-to-chat-button'; // Consistent ID
        backButton.textContent = 'Back to Chat';
        // Ensure button class is applied for consistent styling
        backButton.className = 'rps-choice-button secondary'; // Or your preferred button class
        backButton.onclick = () => {
            // Assumes switchToChatView is globally available from index.html
            if (typeof switchToChatView === 'function') {
                switchToChatView();
            } else {
                console.error("Cannot find switchToChatView function!");
            }
        };
        backButton.style.marginTop = '10px'; // Space above button
        backButton.style.flexShrink = '0'; // Prevent button from shrinking
        // Center the button if desired
        backButton.style.display = 'block';
        backButton.style.marginLeft = 'auto';
        backButton.style.marginRight = 'auto';
        gameUiContainer.appendChild(backButton);

        // Start the commentary timer
        if (commentaryIntervalId) clearInterval(commentaryIntervalId);
        // Show first commentary immediately? Optional.
        // _showJetpackCommentary();
        commentaryIntervalId = setInterval(_showJetpackCommentary, COMMENTARY_INTERVAL_MS);

        console.log(`Jetpack Game viewer initialized for ${currentUserName} with ${currentPersonaInGame}.`);
    }

    function onExit() {
        console.log("JetpackGame onExit called.");
        // IMPORTANT: Clear the commentary timer when leaving the game!
        if (commentaryIntervalId) {
            clearInterval(commentaryIntervalId);
            commentaryIntervalId = null;
            console.log("Commentary interval cleared.");
        }
        commentaryElement = null; // Clear reference
        return Promise.resolve(true); // Indicate synchronous completion
    }

    // --- Public Interface ---
    return {
        init: init,
        onExit: onExit // Make sure onExit is exposed
    };

})();

// --- END OF FILE jetpack.js --- (MODIFIED)