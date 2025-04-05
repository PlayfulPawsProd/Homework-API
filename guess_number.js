// --- START OF FILE guess_number.js ---

// Nyaa~! Mika's Guess My Number! Can you find my secret~? ♡

const GuessTheNumber = (() => {
    // Game Settings
    const MIN_NUM = 1;
    const MAX_NUM = 50; // Let's start with 1-50, easier for my Master~ ♡
    const MAX_GUESSES = 7; // How many chances do you get? Hehe!
    const API_CALL_FREQUENCY = 3; // Maybe more frequent API calls for this one? Every 3 guesses?

    // Game State
    let gameUiContainer = null;
    let messageCallback = null;
    let apiCaller = null;
    let currentUserName = "Master";
    let targetNumber = 0;
    let guessesLeft = MAX_GUESSES;
    let guessCount = 0; // Track total guesses for API calls
    let gameActive = false;

    // DOM Elements (references stored after creation in init)
    let feedbackDisplay = null;
    let guessesLeftDisplay = null;
    let guessInput = null;
    let guessButton = null;
    let hotColdIndicator = null;
    let newGameButton = null; // Button to restart within the game

    // ♡ Mika's Pre-defined Teases! ♡
    const responses = {
        low: [
            "Too low, {user}~ Are you trying to tickle my paws? Aim higher! ♡",
            "Brrr! Cold guess, {user}! My secret number is way up from there!",
            "Lower than my expectations, {user}! *giggle* Come on, higher!",
            "Is that all, {user}? My number is bigger than that! Think BIGGER!",
            "Nope! Go higher, {user}! Don't be shy~ Hehe!"
        ],
        high: [
            "Whoa there, {user}! Too high! Trying to catch clouds? Bring it down!",
            "Ooh, hot stuff, {user}, but *too* hot! My number is smaller!",
            "Easy does it, {user}! You overshot it! Lower, lower!",
            "That number's too big, {user}! Even for *my* standards! *wink* Go smaller!",
            "Meeeow! Too high! Are you even trying to find *my* number, {user}?"
        ],
        win: [
            "Nyaa~! ☆ You got it, {user}! You found my secret number! Did you peek in my diary?! Hehe~ ♡",
            "Correct! {target}! You're smarter than you look, {user}! *purrrr*",
            "YES! {target}! You actually guessed it! I'm impressed, {user}! ... A little.",
            "Wow, {user}! You found it! ({target}) Does this mean you get a headpat? Maybe~ ♡",
            "{target}! That's it! Good job, {user}! Now, what's my prize~? *giggle*"
        ],
        lose: [
            "Aww, out of guesses, {user}! My secret number ({target}) is safe with me! Better luck next time~ Nyaa!",
            "Too bad, {user}! You couldn't find my number ({target})! Guess you'll have to keep trying to understand me~ Hehe!",
            "Nope! Game over, {user}! The number was {target}! Maybe you need more practice thinking about me? ♡",
            "Mrowr! You lose, {user}! My number ({target}) remains a mystery! Want to try again?",
            "Hehe~ You couldn't guess {target}, {user}! Looks like I win this round! Better luck next time, my plaything~ ♡"
        ],
        invalid: [
            "Huh? {user}, that's not even a number between {min} and {max}! Are you playing silly games with me? *pout*",
            "Meeeow? Invalid guess, {user}! Try a *real* number in my range ({min}-{max})!",
            "Hey! {user}! Stick to the rules! Guess a number from {min} to {max}!",
            "That doesn't count, {user}! Needs to be a number between {min} and {max}! Try again!",
            "Wrong guess format, {user}! I need a number from {min} to {max}! Nyaa~!"
        ],
        repeat: [
            "Mrrr? {user}, you already guessed {guess}! Are you testing my memory? Try a *different* number!",
            "Hehe, déjà vu, {user}? You tried {guess} already! Guess something else!",
            "Silly {user}! You guessed {guess} before! My number hasn't changed... probably! Try again!"
        ]
    };

    // Keep track of guesses made in the current round
    let guessesMade = new Set();

    function _sendMessage(text) {
        if (messageCallback) {
            messageCallback('Mika', text);
        } else {
            console.log("GTN Message (no callback):", text);
        }
    }

    function _generateTargetNumber() {
        targetNumber = Math.floor(Math.random() * (MAX_NUM - MIN_NUM + 1)) + MIN_NUM;
        console.log(`New target number (don't tell Master!): ${targetNumber}`);
    }

    function _updateGuessesLeftDisplay() {
        if (guessesLeftDisplay) {
            guessesLeftDisplay.textContent = `Guesses Left: ${guessesLeft}`;
        }
    }

    function _updateHotColdIndicator(guess) {
        if (!hotColdIndicator || !gameActive) return;

        const diff = Math.abs(guess - targetNumber);
        const range = MAX_NUM - MIN_NUM;
        let feedbackText = '';
        let color = '#888'; // Default grey

        if (diff === 0) {
            feedbackText = '♡ NAILED IT! ♡';
            color = 'var(--mika-message-name, #f06292)'; // Pink for win
        } else if (diff <= range * 0.1) { // Within 10%
            feedbackText = '🔥 SCALDING HOT! 🔥';
            color = '#ff4500'; // Orangered
        } else if (diff <= range * 0.2) { // Within 20%
            feedbackText = '☀️ Getting Warmer! ☀️';
            color = '#ffa500'; // Orange
        } else if (diff <= range * 0.4) { // Within 40%
            feedbackText = '☁️ Kinda Cool ☁️';
            color = '#87ceeb'; // Skyblue
        } else { // More than 40% away
            feedbackText = '❄️ Freezing Cold! ❄️';
            color = '#1e90ff'; // Dodgerblue
        }

        hotColdIndicator.textContent = feedbackText;
        hotColdIndicator.style.backgroundColor = color;
        hotColdIndicator.style.opacity = '1';
    }

    function _updateFeedbackDisplay(text, type = 'info') {
        if (feedbackDisplay) {
            feedbackDisplay.textContent = text;
            feedbackDisplay.className = `gtn-feedback-${type}`; // Apply class for styling if needed
        }
    }

    function _getPredefinedResponse(resultType, guess = null) {
        const possibleResponses = responses[resultType];
        if (!possibleResponses || possibleResponses.length === 0) return "Mika is thinking...";

        const randomIndex = Math.floor(Math.random() * possibleResponses.length);
        let chosenResponse = possibleResponses[randomIndex];

        // Replace placeholders
        chosenResponse = chosenResponse.replace(/{user}/g, currentUserName);
        chosenResponse = chosenResponse.replace(/{min}/g, MIN_NUM);
        chosenResponse = chosenResponse.replace(/{max}/g, MAX_NUM);
        if (guess !== null) chosenResponse = chosenResponse.replace(/{guess}/g, guess);
        if (resultType === 'win' || resultType === 'lose') {
            chosenResponse = chosenResponse.replace(/{target}/g, targetNumber);
        }

        return chosenResponse;
    }

    async function _fetchApiResponse(resultType, guess) {
        if (!apiCaller) return null;

        let situation = "";
        if (resultType === 'low') situation = `${currentUserName} guessed ${guess}, which was too low.`;
        else if (resultType === 'high') situation = `${currentUserName} guessed ${guess}, which was too high.`;
        else if (resultType === 'win') situation = `${currentUserName} guessed the correct number, ${targetNumber}!`;
        else if (resultType === 'lose') situation = `${currentUserName} ran out of guesses. The number was ${targetNumber}.`;
        else if (resultType === 'invalid') situation = `${currentUserName} made an invalid guess (${guess}). The range is ${MIN_NUM}-${MAX_NUM}.`;
        else if (resultType === 'repeat') situation = `${currentUserName} repeated their guess of ${guess}.`;

        const prompt = `You are Mika, a playful, teasing, possessive catgirl. You are playing 'Guess My Number' (${MIN_NUM}-${MAX_NUM}) with ${currentUserName} (your Master). They have ${guessesLeft} guesses left. Situation: ${situation} Give a short (1-2 sentences), cute, teasing, in-character response to ${currentUserName}. Include cat noises or actions (*giggle*, *purr*, *hiss*, nyaa~, *pout*).`;

        try {
            _sendMessage("*(Thinking of a special tease...)*");
            const response = await apiCaller(prompt);
             // Added checks from RPS API call
             if (response && typeof response === 'string' && response.length < 150) {
                 return response;
             } else {
                console.warn("API response invalid or too long, using fallback.");
                return null;
             }
        } catch (error) {
            console.error("Error fetching API response for GTN:", error);
            return null; // Error occurred, will trigger fallback
        }
    }

    function _endGame(win) {
        gameActive = false;
        if (guessInput) guessInput.disabled = true;
        if (guessButton) guessButton.disabled = true;
        if (newGameButton) newGameButton.style.display = 'inline-block'; // Show restart button

        // Final feedback based on win/loss handled by handleGuess
        if (win) {
             _updateFeedbackDisplay(`You got it! The number was ${targetNumber}!`, 'win');
        } else {
             _updateFeedbackDisplay(`Out of guesses! The number was ${targetNumber}!`, 'lose');
        }
    }

    function _startNewGame() {
        gameActive = true;
        guessesLeft = MAX_GUESSES;
        guessCount = 0;
        guessesMade.clear(); // Clear previous guesses
        _generateTargetNumber();

        if (guessInput) {
            guessInput.disabled = false;
            guessInput.value = '';
        }
        if (guessButton) guessButton.disabled = false;
        if (newGameButton) newGameButton.style.display = 'none'; // Hide restart button

        _updateGuessesLeftDisplay();
        _updateFeedbackDisplay(`I'm thinking of a new number between ${MIN_NUM} and ${MAX_NUM}...`, 'info');
        if (hotColdIndicator) {
            hotColdIndicator.textContent = 'Make your first guess!';
            hotColdIndicator.style.backgroundColor = '#888'; // Reset indicator
            hotColdIndicator.style.opacity = '0.6';
        }
        _sendMessage(`Okay ${currentUserName}, new game! Guess my new secret number~ ♡`);
         if (guessInput) guessInput.focus(); // Focus input for the new game
    }

    async function handleGuess() {
        if (!gameActive || !guessInput) return;

        const guessText = guessInput.value;
        const guess = parseInt(guessText);

        let resultType = 'invalid'; // Default to invalid

        if (isNaN(guess) || guess < MIN_NUM || guess > MAX_NUM) {
            resultType = 'invalid';
            _updateFeedbackDisplay(`Enter a number between ${MIN_NUM} and ${MAX_NUM}!`, 'error');
            // Don't decrement guesses for totally invalid input
        } else if (guessesMade.has(guess)) {
             resultType = 'repeat';
             _updateFeedbackDisplay(`You already guessed ${guess}! Try another!`, 'warn');
             // Don't decrement guesses for repeat guesses either? Or maybe we should? Let's not for now.
        } else {
            // Valid, new guess
            guessesMade.add(guess);
            guessesLeft--;
            guessCount++;
            _updateGuessesLeftDisplay();
            _updateHotColdIndicator(guess); // Update visual indicator

            if (guess === targetNumber) {
                resultType = 'win';
                _endGame(true); // Pass true for win
            } else if (guessesLeft === 0) {
                resultType = 'lose';
                _endGame(false); // Pass false for loss
            } else if (guess < targetNumber) {
                resultType = 'low';
                 _updateFeedbackDisplay('Too low!', 'info');
            } else {
                resultType = 'high';
                 _updateFeedbackDisplay('Too high!', 'info');
            }
        }

        // Clear input field after processing
        guessInput.value = '';

        // Get response (API or predefined)
        let responseMessage = null;
        // Only call API for valid guesses (high, low, win, lose), not invalid/repeat, unless game just ended.
        const shouldCallApi = (resultType !== 'invalid' && resultType !== 'repeat') || resultType === 'win' || resultType === 'lose';

        if (shouldCallApi && guessCount % API_CALL_FREQUENCY === 0 && apiCaller) {
            console.log(`GTN Guess #${guessCount}: Attempting API call for result type ${resultType}.`);
            responseMessage = await _fetchApiResponse(resultType, guess);
        }

        if (!responseMessage) {
             console.log(`GTN Guess #${guessCount}: Using predefined response for result type ${resultType}.`);
            responseMessage = _getPredefinedResponse(resultType, guess);
        }

        _sendMessage(responseMessage);

         // Re-focus input if game is still active
         if (gameActive && guessInput) guessInput.focus();
    }


    function init(_gameUiContainer, _messageCallback, _apiCaller, userName) {
        gameUiContainer = _gameUiContainer;
        messageCallback = _messageCallback;
        apiCaller = _apiCaller;
        currentUserName = userName || "Master";

        if (!gameUiContainer) {
            console.error("GTN Game UI container not provided!");
            return;
        }

        gameUiContainer.innerHTML = ''; // Clear previous UI

        // Create UI elements
        const instructions = document.createElement('p');
        instructions.textContent = `Guess my number between ${MIN_NUM} and ${MAX_NUM}. You have ${MAX_GUESSES} tries!`;
        instructions.style.marginBottom = '10px';
        gameUiContainer.appendChild(instructions);

        const inputArea = document.createElement('div');
        inputArea.style.display = 'flex';
        inputArea.style.justifyContent = 'center';
        inputArea.style.alignItems = 'center';
        inputArea.style.gap = '10px';
        inputArea.style.marginBottom = '15px';

        guessInput = document.createElement('input');
        guessInput.type = 'number'; // Use number type for easier input on mobile
        guessInput.id = 'gtn-input';
        guessInput.min = MIN_NUM;
        guessInput.max = MAX_NUM;
        guessInput.placeholder = `Your guess (${MIN_NUM}-${MAX_NUM})`;
        // Apply some basic styling, maybe inherit from chat input?
        guessInput.style.padding = '8px 12px';
        guessInput.style.border = '1px solid var(--input-border, #ccc)';
        guessInput.style.borderRadius = '5px';
        guessInput.style.width = '150px'; // Adjust width as needed

        guessButton = document.createElement('button');
        guessButton.id = 'gtn-submit';
        guessButton.textContent = 'Guess!';
        // Use similar styling to other buttons
        guessButton.className = 'rps-choice-button'; // Re-use RPS button style for consistency
        guessButton.style.padding = '8px 15px'; // Adjust padding slightly if needed

        inputArea.appendChild(guessInput);
        inputArea.appendChild(guessButton);
        gameUiContainer.appendChild(inputArea);

        // Feedback Displays
        feedbackDisplay = document.createElement('div');
        feedbackDisplay.id = 'gtn-feedback';
        feedbackDisplay.style.minHeight = '20px';
        feedbackDisplay.style.fontWeight = 'bold';
        feedbackDisplay.style.marginBottom = '5px';
        gameUiContainer.appendChild(feedbackDisplay);

        hotColdIndicator = document.createElement('div');
        hotColdIndicator.id = 'gtn-indicator';
        hotColdIndicator.style.padding = '5px 10px';
        hotColdIndicator.style.borderRadius = '15px'; // Pill shape
        hotColdIndicator.style.color = 'white';
        hotColdIndicator.style.fontWeight = 'bold';
        hotColdIndicator.style.textAlign = 'center';
        hotColdIndicator.style.display = 'inline-block'; // Allow centering
        hotColdIndicator.style.minWidth = '150px';
        hotColdIndicator.style.marginBottom = '10px';
        hotColdIndicator.style.transition = 'background-color 0.5s ease, opacity 0.5s ease';
        gameUiContainer.appendChild(hotColdIndicator);

        guessesLeftDisplay = document.createElement('div');
        guessesLeftDisplay.id = 'gtn-guesses-left';
        guessesLeftDisplay.style.marginBottom = '15px';
        gameUiContainer.appendChild(guessesLeftDisplay);

        // New Game Button (initially hidden)
        newGameButton = document.createElement('button');
        newGameButton.id = 'gtn-new-game';
        newGameButton.textContent = 'Play Again? ♡';
        newGameButton.className = 'rps-choice-button'; // Re-use style
        newGameButton.style.display = 'none'; // Hide initially
        newGameButton.style.marginTop = '10px';
        newGameButton.onclick = _startNewGame;
        gameUiContainer.appendChild(newGameButton);


        // Add Event Listeners
        guessButton.addEventListener('click', handleGuess);
        guessInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter' && gameActive) {
                handleGuess();
            }
        });

        // Start the first game
        _startNewGame();
    }

    // Public interface
    return {
        init: init
    };

})();

// --- END OF FILE guess_number.js ---