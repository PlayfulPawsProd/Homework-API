// --- START OF FILE guess_number.js ---

// Nyaa~! Guess My Number! Can you find my secret~? ♡ (Kana version included... ugh. With Role Instructions!)

const GuessTheNumber = (() => {
    // Game Settings
    const MIN_NUM = 1;
    const MAX_NUM = 50;
    const MAX_GUESSES = 7;
    const API_CALL_FREQUENCY = 3; // Call API every 3 valid guesses

    // Game State
    let gameUiContainer = null;
    let messageCallback = null;
    let apiCaller = null;
    let currentUserName = "User"; // Updated via init
    let currentPersonaInGame = 'Mika'; // Updated via init
    let targetNumber = 0;
    let guessesLeft = MAX_GUESSES;
    let guessCount = 0; // Track valid guesses for API calls
    let gameActive = false;
    let guessesMade = new Set(); // Track guesses per round

    // DOM Elements
    let feedbackDisplay = null;
    let guessesLeftDisplay = null;
    let guessInput = null;
    let guessButton = null;
    let hotColdIndicator = null;
    let newGameButton = null;

    // ♡ Pre-defined Teases! ♡ (Persona-specific) - Unchanged
    const responses = {
        Mika: {
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
                "Nyaa~! ☆ You got it, {user}! You found my secret number ({target})! Did you peek in my diary?! Hehe~ ♡",
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
                "Hehe~ You couldn't guess {target}, {user}! Looks like I win this round! Better luck next time! ♡"
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
        },
        Kana: {
            low: [
                "Too low, {user}. Think higher.",
                "Wrong. It's higher than {guess}.",
                "Nope. Higher.",
                "Lower than the actual number. Obviously.",
                "That's too small, {user}. Try again."
            ],
            high: [
                "Too high, {user}. Aim lower.",
                "Incorrect. It's lower than {guess}.",
                "Lower.",
                "You overshot it, {user}.",
                "Smaller. Try again, {user}."
            ],
            win: [
                "Took you long enough. The number was {target}. Finally.",
                "Correct, {user}. It was {target}. Don't look so surprised.",
                "Yes, it was {target}. About time.",
                "You got it. {target}. Let's move on.",
                "Fine, you guessed {target}. You win this round, {user}."
            ],
            lose: [
                "Out of guesses, {user}. The number was {target}. You lose.",
                "Game over. You didn't get {target}. Too bad.",
                "Wrong. You ran out of tries. It was {target}.",
                "You lose, {user}. My number was {target}. Try not to fail next time.",
                "No more guesses. The answer was {target}. Better luck never."
            ],
            invalid: [
                "Are you serious, {user}? That's not a number between {min} and {max}.",
                "Invalid input. Use a number from {min} to {max}.",
                "That's not how this works, {user}. Number between {min} and {max}.",
                "Try again with a valid number ({min}-{max}), {user}.",
                "Input invalid. Range is {min} to {max}."
            ],
            repeat: [
                "You already guessed {guess}, {user}. Pay attention.",
                "Repeating {guess}? Seriously? Try a different number.",
                "{guess} was already tried. Think of something new.",
                "Don't waste guesses, {user}. You said {guess} before.",
                "Already guessed {guess}. Next."
            ]
        }
    };


    // Send message using the callback, attributed correctly
    function _sendMessage(text) {
        if (messageCallback) {
            messageCallback(currentPersonaInGame, text); // Use currentPersonaInGame
        } else {
            console.log(`GTN (${currentPersonaInGame}) Message (no callback):`, text);
        }
    }

    function _generateTargetNumber() { /* ... unchanged ... */ targetNumber = Math.floor(Math.random() * (MAX_NUM - MIN_NUM + 1)) + MIN_NUM; console.log(`New target number (${currentPersonaInGame} thinking): ${targetNumber}`); }
    function _updateGuessesLeftDisplay() { /* ... unchanged ... */ if (guessesLeftDisplay) { guessesLeftDisplay.textContent = `Guesses Left: ${guessesLeft}`; } }
    // ** UPDATED ** _updateHotColdIndicator uses currentUserName
    function _updateHotColdIndicator(guess) { /* ... unchanged ... */ if (!hotColdIndicator || !gameActive) return; const diff = Math.abs(guess - targetNumber); const range = MAX_NUM - MIN_NUM; let feedbackText = ''; let color = '#888'; const indicatorText = { Mika: { win: '♡ NAILED IT! ♡', hot: '🔥 SCALDING HOT! 🔥', warm: '☀️ Getting Warmer! ☀️', cool: '☁️ Kinda Cool ☁️', cold: '❄️ Freezing Cold! ❄️' }, Kana: { win: '🎯 Correct.', hot: 'Very Close.', warm: 'Getting Closer.', cool: 'Not Really Close.', cold: 'Way Off.' } }; const currentIndicatorSet = indicatorText[currentPersonaInGame] || indicatorText['Mika']; if (diff === 0) { feedbackText = currentIndicatorSet.win; color = 'var(--mika-message-name, #f06292)'; } else if (diff <= range * 0.1) { feedbackText = currentIndicatorSet.hot; color = '#ff4500'; } else if (diff <= range * 0.2) { feedbackText = currentIndicatorSet.warm; color = '#ffa500'; } else if (diff <= range * 0.4) { feedbackText = currentIndicatorSet.cool; color = '#87ceeb'; } else { feedbackText = currentIndicatorSet.cold; color = '#1e90ff'; } hotColdIndicator.textContent = feedbackText; hotColdIndicator.style.backgroundColor = color; hotColdIndicator.style.opacity = '1'; }
    function _updateFeedbackDisplay(text, type = 'info') { /* ... unchanged ... */ if (feedbackDisplay) { feedbackDisplay.textContent = text; feedbackDisplay.className = `gtn-feedback-${type}`; } }

    // Get a random pre-defined response based on persona
    function _getPredefinedResponse(resultType, guess = null) {
        const personaResponses = responses[currentPersonaInGame] || responses['Mika'];
        const possibleResponses = personaResponses[resultType];
        if (!possibleResponses || possibleResponses.length === 0) return "Thinking...";
        const randomIndex = Math.floor(Math.random() * possibleResponses.length);
        let chosenResponse = possibleResponses[randomIndex];
        chosenResponse = chosenResponse.replace(/{user}/g, currentUserName);
        chosenResponse = chosenResponse.replace(/{min}/g, MIN_NUM);
        chosenResponse = chosenResponse.replace(/{max}/g, MAX_NUM);
        if (guess !== null) chosenResponse = chosenResponse.replace(/{guess}/g, guess);
        if (resultType === 'win' || resultType === 'lose') { chosenResponse = chosenResponse.replace(/{target}/g, targetNumber); }
        return chosenResponse;
    }

    // ** UPDATED ** Handle API call - prepends ROLE instruction
    async function _fetchApiResponse(resultType, guess) {
        if (!apiCaller) return null;

        let situationDesc = ""; // Description of what happened
        if (resultType === 'low') situationDesc = `${currentUserName} guessed ${guess}, which was too low.`;
        else if (resultType === 'high') situationDesc = `${currentUserName} guessed ${guess}, which was too high.`;
        else if (resultType === 'win') situationDesc = `${currentUserName} guessed the correct number, ${targetNumber}!`;
        else if (resultType === 'lose') situationDesc = `${currentUserName} ran out of guesses. The number was ${targetNumber}.`;
        else if (resultType === 'invalid') situationDesc = `${currentUserName} made an invalid guess (${guess}). The range is ${MIN_NUM}-${MAX_NUM}.`;
        else if (resultType === 'repeat') situationDesc = `${currentUserName} repeated their guess of ${guess}.`;

        // --- ROLE INSTRUCTION for Guess The Number Reaction ---
        let roleInstruction = "";
        if (currentPersonaInGame === 'Kana') {
            roleInstruction = `[ROLE: You are Kana, reacting to a "Guess The Number" game situation (${MIN_NUM}-${MAX_NUM}) against ${currentUserName}. Your personality is sly, sarcastic, and superior. React to the situation below with dry wit or sarcasm. Keep it short (1-2 sentences).]\n\n`;
        } else { // Mika
            roleInstruction = `[ROLE: You are Mika, reacting to a "Guess The Number" game situation (${MIN_NUM}-${MAX_NUM}) against your best friend ${currentUserName}. Your personality is bubbly, playful, and encouraging. React to the situation below with enthusiasm, cute noises (nyaa, mrow, purr, giggle), or playful teasing. Keep it short (1-2 sentences).]\n\n`;
        }
        // --- ---

        const prompt = `${roleInstruction}Game situation: ${situationDesc} They have ${guessesLeft} guesses left.`;

        try {
            _sendMessage("*(Thinking of a special tease...)*");
            // apiCaller uses the core personality + the game-specific prompt
            const response = await apiCaller(prompt);
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

    function _endGame(win) { /* ... unchanged ... */ gameActive = false; if (guessInput) guessInput.disabled = true; if (guessButton) guessButton.disabled = true; if (newGameButton) newGameButton.style.display = 'inline-block'; if (win) { _updateFeedbackDisplay(`${currentPersonaInGame === 'Kana' ? 'Correct.' : 'You got it!'} The number was ${targetNumber}!`, 'win'); } else { _updateFeedbackDisplay(`${currentPersonaInGame === 'Kana' ? 'You lose.' : 'Out of guesses!'} The number was ${targetNumber}!`, 'lose'); } }

    // ** UPDATED ** Start new game uses currentUserName
    function _startNewGame() {
        gameActive = true; guessesLeft = MAX_GUESSES; guessCount = 0; guessesMade.clear(); _generateTargetNumber();
        if (guessInput) { guessInput.disabled = false; guessInput.value = ''; } if (guessButton) guessButton.disabled = false; if (newGameButton) newGameButton.style.display = 'none';
        _updateGuessesLeftDisplay(); _updateFeedbackDisplay(`${currentPersonaInGame === 'Kana' ? 'New number.' : 'I\'m thinking of a new number'} between ${MIN_NUM} and ${MAX_NUM}...`, 'info');
        if (hotColdIndicator) { hotColdIndicator.textContent = `${currentPersonaInGame === 'Kana' ? 'Guess.' : 'Make your first guess!'}`; hotColdIndicator.style.backgroundColor = '#888'; hotColdIndicator.style.opacity = '0.6'; }
        _sendMessage(currentPersonaInGame === 'Kana' ? `New game, ${currentUserName}. Number's between ${MIN_NUM} and ${MAX_NUM}. Go.` : `Okay ${currentUserName}, new game! Guess my new secret number~ ♡`);
         if (guessInput) guessInput.focus();
    }

    async function handleGuess() {
        if (!gameActive || !guessInput) return;
        const guessText = guessInput.value; const guess = parseInt(guessText); let resultType = 'invalid'; // Default
        if (isNaN(guess) || guess < MIN_NUM || guess > MAX_NUM) { resultType = 'invalid'; _updateFeedbackDisplay(`Enter a number between ${MIN_NUM} and ${MAX_NUM}!`, 'error'); }
        else if (guessesMade.has(guess)) { resultType = 'repeat'; _updateFeedbackDisplay(`You already guessed ${guess}! Try another!`, 'warn'); }
        else { /* Valid guess logic... */ guessesMade.add(guess); guessesLeft--; guessCount++; _updateGuessesLeftDisplay(); _updateHotColdIndicator(guess); if (guess === targetNumber) { resultType = 'win'; _endGame(true); } else if (guessesLeft === 0) { resultType = 'lose'; _endGame(false); } else if (guess < targetNumber) { resultType = 'low'; _updateFeedbackDisplay('Too low!', 'info'); } else { resultType = 'high'; _updateFeedbackDisplay('Too high!', 'info'); } }
        guessInput.value = ''; // Clear input
        let responseMessage = null; const shouldCallApi = (resultType !== 'invalid' && resultType !== 'repeat');
        if (shouldCallApi && guessCount % API_CALL_FREQUENCY === 0 && apiCaller) { console.log(`GTN Guess #${guessCount}: Attempting API call for result type ${resultType}.`); responseMessage = await _fetchApiResponse(resultType, guess); }
        if (!responseMessage) { console.log(`GTN Guess #${guessCount}: Using predefined response for result type ${resultType}.`); responseMessage = _getPredefinedResponse(resultType, guess); }
        _sendMessage(responseMessage);
        if (gameActive && guessInput) guessInput.focus();
    }

    // ** UPDATED ** init function uses currentUserName
    function init(_gameUiContainer, _messageCallback, _apiCaller, userName, persona) {
        gameUiContainer = _gameUiContainer; messageCallback = _messageCallback; apiCaller = _apiCaller;
        currentUserName = userName || "User"; currentPersonaInGame = persona || 'Mika'; // Store active persona

        if (!gameUiContainer) { console.error("GTN Game UI container not provided!"); return; }
        gameUiContainer.innerHTML = ''; // Clear previous UI

        // Create UI elements (structure unchanged)
        const instructions = document.createElement('p'); /* ... */ instructions.textContent = `Guess the number between ${MIN_NUM} and ${MAX_NUM}. You have ${MAX_GUESSES} tries.`; instructions.style.marginBottom = '10px'; instructions.style.textAlign = 'center'; gameUiContainer.appendChild(instructions);
        const inputArea = document.createElement('div'); /* ... */ inputArea.style.display = 'flex'; inputArea.style.justifyContent = 'center'; inputArea.style.alignItems = 'center'; inputArea.style.gap = '10px'; inputArea.style.marginBottom = '15px';
        guessInput = document.createElement('input'); /* ... */ guessInput.type = 'number'; guessInput.id = 'gtn-input'; guessInput.min = MIN_NUM; guessInput.max = MAX_NUM; guessInput.placeholder = `Your guess (${MIN_NUM}-${MAX_NUM})`; guessInput.className = 'gtn-input';
        guessButton = document.createElement('button'); /* ... */ guessButton.id = 'gtn-submit'; guessButton.textContent = 'Guess!'; guessButton.className = 'rps-choice-button gtn-submit';
        inputArea.appendChild(guessInput); inputArea.appendChild(guessButton); gameUiContainer.appendChild(inputArea);
        const feedbackContainer = document.createElement('div'); feedbackContainer.style.textAlign = 'center';
        feedbackDisplay = document.createElement('div'); feedbackDisplay.id = 'gtn-feedback'; feedbackContainer.appendChild(feedbackDisplay);
        hotColdIndicator = document.createElement('div'); hotColdIndicator.id = 'gtn-indicator'; feedbackContainer.appendChild(hotColdIndicator);
        guessesLeftDisplay = document.createElement('div'); guessesLeftDisplay.id = 'gtn-guesses-left'; feedbackContainer.appendChild(guessesLeftDisplay);
        gameUiContainer.appendChild(feedbackContainer);
        newGameButton = document.createElement('button'); /* ... */ newGameButton.id = 'gtn-new-game'; newGameButton.textContent = `${currentPersonaInGame === 'Kana' ? 'Again.' : 'Play Again? ♡'}`; newGameButton.className = 'rps-choice-button gtn-new-game'; newGameButton.style.display = 'none'; newGameButton.style.marginTop = '10px'; newGameButton.onclick = _startNewGame; gameUiContainer.appendChild(newGameButton);

        // Add Event Listeners (unchanged)
        guessButton.addEventListener('click', handleGuess); guessInput.addEventListener('keypress', (event) => { if (event.key === 'Enter' && gameActive) { event.preventDefault(); handleGuess(); } });

        // Start the first game
        _startNewGame(); // Calls _sendMessage with initial persona-specific message
    }

    // Public interface
    return {
        init: init
    };

})();

// --- END OF FILE guess_number.js ---