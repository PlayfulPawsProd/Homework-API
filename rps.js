// --- START OF FILE rps.js ---

// Nyaa~! Rock Paper Scissors! Get Ready to Lose! ♡ (Now with Kana & Role Instructions!)

const RockPaperScissors = (() => {
    let gameUiContainer = null; // Div where the game elements go
    let messageCallback = null; // Function to send messages back to index.html's log
    let apiCaller = null; // Function to call the API for special messages
    let currentUserName = "User"; // Default, updated via init
    let currentPersonaInGame = 'Mika'; // Store the persona for this game instance

    let roundCount = 0;
    const API_CALL_FREQUENCY = 5; // Call API every 5 rounds

    const choices = ['Rock', 'Paper', 'Scissors'];

    // ♡ Pre-defined Taunts! ♡ (Persona-specific) - Unchanged
    const responses = {
        Mika: {
            win: [
                "Nyaa~! I win again! You're just too easy to predict, {user}~ ♡",
                "Hehe! My {mikaChoice} crushes your {userChoice}! Better luck next time, slowpoke! *giggle*",
                "Victory! ☆ You thought you could beat me, {user}? How cute! Try harder~!",
                "Too easy! Is that all you've got, {user}? I expected more of a challenge! ♡",
                "Yes! Undefeated! You just can't handle Mika's brilliance, {user}! Nyaa~!"
            ],
            lose: [
                "*Hiss!* No fair! You got lucky, {user}! Rematch, NOW! >.<",
                "Grrr! Fine! You win this round... but don't get cocky, {user}! I'll get you next time!",
                "Meeeow?! How did you...? *pout* Must have been a fluke, {user}!",
                "You... beat me {user}? *whimper* O-Okay... Just this once... but I'm still cuter! Nyaa!",
                "IMPOSSIBLE! Did you cheat, {user}?! There's no way you beat me fair and square! Hmph! 💢"
            ],
            tie: [
                "A tie?! Booooring! Let's go again, {user}! I wanna WIN! Nyaa~!",
                "Mrrr? Same minds think alike... or maybe you're just copying me, {user}! Again!",
                "Huh? We tied, {user}? How unsatisfying! Come on, one of us has to win (and it should be ME!)",
                "Stalemate! This means nothing, {user}! Play again until I dominate you! Hehe~ ♡",
                "Grrr... a tie? That doesn't count! Let's settle this, {user}!"
            ]
        },
        Kana: {
            win: [
                "My {mikaChoice} beats your {userChoice}. Obviously. Next.",
                "I win. Shocking, I know. Try to provide some actual challenge, {user}.",
                "Predictable, {user}. My {mikaChoice} wins. Again.",
                "Victory. Was there ever any doubt? Certainly not for me.",
                "Heh. Too easy, {user}. My {mikaChoice} was the logical choice against your {userChoice}."
            ],
            lose: [
                "Whatever. You picked {userChoice}, I picked {mikaChoice}. Beginner's luck, {user}.",
                "*Scoffs* Fine, you won this round, {user}. Don't expect it to happen again.",
                "My {mikaChoice} lost to your {userChoice}? Ugh. Annoying.",
                "You won? Tch. Let's just go again, {user}.",
                "Okay, you got that one, {user}. Happy now? Let's move on."
            ],
            tie: [
                "A tie with {userChoice}? How tedious. Again.",
                "Boring. Both picked {userChoice}. Let's break this stalemate, {user}.",
                "We tied. Yawn. Play again, {user}.",
                "{userChoice} vs {userChoice}. Seriously? Let's get a real result.",
                "Stalemate. Are you copying me, {user}? Go again."
            ]
        }
    };

    // Send message using the callback, attributed to the correct persona
    function _sendMessage(text) {
        if (messageCallback) {
            messageCallback(currentPersonaInGame, text); // Use currentPersonaInGame
        } else {
            console.log(`RPS (${currentPersonaInGame}) Message (no callback):`, text);
        }
    }

     // Update the display area showing choices and result
    function _updateResultDisplay(userChoice, assistantChoice, result) {
        const resultDisplay = document.getElementById('rps-result-display');
        if (resultDisplay) {
             let assistantName = currentPersonaInGame; // Use the current persona's name
             let resultText = "";
             if (result === 'win') resultText = `☆ ${assistantName} Wins! ☆`; // Assistant won
             else if (result === 'lose') resultText = `*Hmph!* ${currentUserName} Wins...`; // User won
             else resultText = `It's a Tie!`;

             let message = `${currentUserName}: ${userChoice} | ${assistantName}: ${assistantChoice} | ${resultText}`;
             resultDisplay.textContent = message;
             resultDisplay.style.opacity = '1';
        }
     }

    // Assistant makes her choice (randomly)
    function _assistantChoice() { /* ... unchanged ... */ const randomIndex = Math.floor(Math.random() * choices.length); return choices[randomIndex]; }

    // Determine the winner (result is from USER's perspective: 'win' = assistant won, 'lose' = user won)
    function _determineWinner(userChoice, assistantChoice) { /* ... unchanged ... */ if (userChoice === assistantChoice) { return 'tie'; } if ( (userChoice === 'Rock' && assistantChoice === 'Scissors') || (userChoice === 'Scissors' && assistantChoice === 'Paper') || (userChoice === 'Paper' && assistantChoice === 'Rock') ) { return 'lose'; /* User wins */ } return 'win'; /* Assistant wins */ }

    // Get a random pre-defined response based on persona
    function _getPredefinedResponse(resultType, userChoice, assistantChoice) {
        const personaResponses = responses[currentPersonaInGame] || responses['Mika'];
        const possibleResponses = personaResponses[resultType];
        if (!possibleResponses || possibleResponses.length === 0) return "Uh oh, speechless!";
        const randomIndex = Math.floor(Math.random() * possibleResponses.length);
        let chosenResponse = possibleResponses[randomIndex];
        chosenResponse = chosenResponse.replace(/{user}/g, currentUserName);
        chosenResponse = chosenResponse.replace(/{userChoice}/g, userChoice);
        chosenResponse = chosenResponse.replace(/{mikaChoice}|{assistantChoice}/g, assistantChoice);
        return chosenResponse;
    }

    // ** UPDATED ** Handle the API call - prepends ROLE instruction
    async function _fetchApiResponse(resultType, userChoice, assistantChoice) {
        if (!apiCaller) {
            console.warn("API Caller function not provided to RPS game.");
            return null; // No API function, can't fetch
        }

        let resultText = "";
        let assistantName = currentPersonaInGame;
        if (resultType === 'win') resultText = `I (${assistantName}) won`; // Assistant won
        else if (resultType === 'lose') resultText = `${currentUserName} won`; // User won
        else resultText = "it was a tie";

        // --- ROLE INSTRUCTION for RPS Reaction ---
        let roleInstruction = "";
        if (currentPersonaInGame === 'Kana') {
            roleInstruction = `[ROLE: You are Kana, reacting to a Rock Paper Scissors game result against ${currentUserName}. Your personality is sly, sarcastic, and superior. React to the situation below with dry wit or sarcasm. Keep it short (1-2 sentences).]\n\n`;
        } else { // Mika
            roleInstruction = `[ROLE: You are Mika, reacting to a Rock Paper Scissors game result against your best friend ${currentUserName}. Your personality is bubbly, playful, and energetic. React to the situation below with enthusiasm, cute noises (nyaa, mrow, purr, giggle), or playful teasing. Keep it short (1-2 sentences).]\n\n`;
        }
        // --- ---

        // Construct the situation description
        const situation = `Game situation: You (${assistantName}) chose ${assistantChoice} and ${currentUserName} chose ${userChoice}. The result was: ${resultText}.`;

        // Prepend role instruction to the situation
        const prompt = `${roleInstruction}${situation}`;

        try {
            _sendMessage("*(Thinking of a special reaction...)*"); // Indicate API call
            // apiCaller uses the core personality + the game-specific prompt
            const response = await apiCaller(prompt);
            if (response && typeof response === 'string' && response.length < 150) {
                 return response; // Return the fresh response
            } else {
                console.warn("API response invalid or too long, using fallback.");
                return null;
            }
        } catch (error) {
            console.error("Error fetching API response for RPS:", error);
            return null; // Error occurred
        }
    }

    // Main function when user clicks Rock, Paper, or Scissors
    async function handleUserChoice(userChoice) {
        roundCount++;
        const assistantChosen = _assistantChoice();
        const result = _determineWinner(userChoice, assistantChosen); // Result from USER perspective (win = assistant won)

        _updateResultDisplay(userChoice, assistantChosen, result); // Show results visually

        let responseMessage = null;

        // Decide whether to call API or use predefined
        if (roundCount % API_CALL_FREQUENCY === 0 && apiCaller) {
            console.log(`RPS Round ${roundCount}: Attempting API call.`);
            responseMessage = await _fetchApiResponse(result, userChoice, assistantChosen);
        }

        // If API call wasn't attempted, failed, or returned null, use predefined
        if (!responseMessage) {
            console.log(`RPS Round ${roundCount}: Using predefined response.`);
            responseMessage = _getPredefinedResponse(result, userChoice, assistantChosen);
        }

        _sendMessage(responseMessage); // Send the chosen message to the log
    }

    // ** UPDATED ** Initialize the game UI, accepting persona (uses currentUserName)
    function init(_gameUiContainer, _messageCallback, _apiCaller, userName, persona) {
        gameUiContainer = _gameUiContainer; messageCallback = _messageCallback; apiCaller = _apiCaller;
        currentUserName = userName || "User"; // Use provided name
        currentPersonaInGame = persona || 'Mika'; // Store the active persona
        roundCount = 0; // Reset round count

        if (!gameUiContainer) { console.error("RPS Game UI container not provided!"); return; }
        gameUiContainer.innerHTML = ''; // Clear previous content

        // 1. Add instructions/title (persona-specific, uses currentUserName)
        const instructionText = document.createElement('p');
        instructionText.textContent = (currentPersonaInGame === 'Kana')
            ? `Rock, Paper, Scissors. Choose, ${currentUserName}. Let's get this over with.`
            : `Choose your weapon, ${currentUserName}! Rock, Paper, or Scissors?`;
        instructionText.style.marginBottom = '15px'; instructionText.style.textAlign = 'center';
        gameUiContainer.appendChild(instructionText);

        // 2. Create choice buttons
        const buttonContainer = document.createElement('div'); /* ... styles ... */ buttonContainer.style.display = 'flex'; buttonContainer.style.justifyContent = 'center'; buttonContainer.style.gap = '15px'; buttonContainer.style.marginBottom = '20px';
        choices.forEach(choice => { /* ... button creation ... */ const button = document.createElement('button'); button.textContent = choice; button.className = 'rps-choice-button'; button.addEventListener('click', () => handleUserChoice(choice)); buttonContainer.appendChild(button); });
        gameUiContainer.appendChild(buttonContainer);

         // 3. Create display area for results
         const resultDisplay = document.createElement('div'); resultDisplay.id = 'rps-result-display'; resultDisplay.textContent = 'Make your move!'; /* ... styles ... */ resultDisplay.style.marginTop = '10px'; resultDisplay.style.padding = '10px'; resultDisplay.style.minHeight = '30px'; resultDisplay.style.textAlign = 'center'; resultDisplay.style.fontWeight = 'bold'; resultDisplay.style.border = '1px dashed var(--game-cell-border, #f06292)'; resultDisplay.style.borderRadius = '5px'; resultDisplay.style.backgroundColor = 'rgba(0,0,0,0.1)'; resultDisplay.style.opacity = '0.6'; resultDisplay.style.transition = 'opacity 0.3s ease'; resultDisplay.style.color = 'var(--game-cell-text)'; gameUiContainer.appendChild(resultDisplay);

        // Initial message sent from index.html upon loading game (No, it's sent here now)
         const initialMessage = (currentPersonaInGame === 'Kana')
            ? `Rock paper scissors. Go.`
            : `Let's play Rock Paper Scissors, ${currentUserName}! Make your choice! ♡`;
         _sendMessage(initialMessage);

    }

    // Public interface
    return {
        init: init
    };

})();

// --- END OF FILE rps.js ---