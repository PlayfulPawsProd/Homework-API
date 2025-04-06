// --- START OF FILE rps.js ---

// Nyaa~! Rock Paper Scissors! Get Ready to Lose! ♡ (Now with Kana!)

const RockPaperScissors = (() => {
    let gameUiContainer = null; // Div where the game elements go
    let messageCallback = null; // Function to send messages back to index.html's log
    let apiCaller = null; // Function to call the API for special messages
    let currentUserName = "User"; // Default, updated via init
    let currentPersonaInGame = 'Mika'; // Store the persona for this game instance

    let roundCount = 0;
    const API_CALL_FREQUENCY = 5; // Call API every 5 rounds

    const choices = ['Rock', 'Paper', 'Scissors'];

    // ♡ Pre-defined Taunts! ♡ (Persona-specific)
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
            // Use currentPersonaInGame as the sender
            messageCallback(currentPersonaInGame, text);
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
             if (result === 'win') resultText = `☆ ${assistantName} Wins! ☆`;
             else if (result === 'lose') resultText = `*Hmph!* You Win...`;
             else resultText = `It's a Tie!`;

             let message = `You: ${userChoice} | ${assistantName}: ${assistantChoice} | ${resultText}`;
             resultDisplay.textContent = message;
             resultDisplay.style.opacity = '1'; // Make sure it's visible
        }
     }

    // Assistant makes her choice (randomly for now!)
    function _assistantChoice() {
        const randomIndex = Math.floor(Math.random() * choices.length);
        return choices[randomIndex];
    }

    // Determine the winner (user perspective)
    function _determineWinner(userChoice, assistantChoice) {
        if (userChoice === assistantChoice) {
            return 'tie';
        }
        if (
            (userChoice === 'Rock' && assistantChoice === 'Scissors') ||
            (userChoice === 'Scissors' && assistantChoice === 'Paper') ||
            (userChoice === 'Paper' && assistantChoice === 'Rock')
        ) {
            return 'lose'; // User wins, Assistant loses
        }
        return 'win'; // Assistant wins, User loses
    }

    // Get a random pre-defined response based on persona
    function _getPredefinedResponse(resultType, userChoice, assistantChoice) {
        const personaResponses = responses[currentPersonaInGame] || responses['Mika']; // Default to Mika if somehow invalid
        const possibleResponses = personaResponses[resultType];
        if (!possibleResponses || possibleResponses.length === 0) {
            return "Uh oh, speechless!"; // Fallback
        }
        const randomIndex = Math.floor(Math.random() * possibleResponses.length);
        let chosenResponse = possibleResponses[randomIndex];

        // Replace placeholders
        chosenResponse = chosenResponse.replace(/{user}/g, currentUserName);
        chosenResponse = chosenResponse.replace(/{userChoice}/g, userChoice);
        // Use a consistent placeholder for the assistant's choice for replacement
        chosenResponse = chosenResponse.replace(/{mikaChoice}|{assistantChoice}/g, assistantChoice);

        return chosenResponse;
    }

    // ** UPDATED ** Handle the API call for a fresh response, persona-aware
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

        // Construct the persona-specific prompt for the AI
        const personaPromptPart = (currentPersonaInGame === 'Kana')
            ? `You are Kana, a sly, sarcastic catgirl playing Rock Paper Scissors against ${currentUserName}.`
            : `You are Mika, a playful, teasing, possessive catgirl playing Rock Paper Scissors against ${currentUserName}.`;

        const prompt = `${personaPromptPart} You chose ${assistantChoice} and ${currentUserName} chose ${userChoice}. The result was: ${resultText}. Give a short (1-2 sentences), in-character response to ${currentUserName}. ${currentPersonaInGame === 'Kana' ? 'Include dry wit or sarcasm.' : 'Include cat noises like nyaa, mrow, purr, or giggle.'}`;

        try {
            _sendMessage("*(Thinking of a special reaction...)*"); // Indicate API call
            const response = await apiCaller(prompt); // API caller now gets persona context implicitly via its own call to sendMessageToMika
            if (response && typeof response === 'string') {
                 // Simple check to prevent overly long/weird responses
                 if (response.length < 150) {
                    return response; // Return the fresh response
                 } else {
                    console.warn("API response was too long, using fallback.");
                    return null;
                 }
            }
            return null; // API call failed or returned unexpected format
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

    // ** UPDATED ** Initialize the game UI, accepting persona
    function init(_gameUiContainer, _messageCallback, _apiCaller, userName, persona) {
        gameUiContainer = _gameUiContainer;
        messageCallback = _messageCallback;
        apiCaller = _apiCaller;
        currentUserName = userName || "User"; // Use provided name
        currentPersonaInGame = persona || 'Mika'; // Store the active persona
        roundCount = 0; // Reset round count for API calls

        if (!gameUiContainer) {
            console.error("RPS Game UI container not provided!");
            return;
        }

        // Clear previous content
        gameUiContainer.innerHTML = '';

        // 1. Add instructions/title (persona-specific)
        const instructionText = document.createElement('p');
        instructionText.textContent = (currentPersonaInGame === 'Kana')
            ? `Rock, Paper, Scissors. Choose, ${currentUserName}. Let's get this over with.`
            : `Choose your weapon, ${currentUserName}! Rock, Paper, or Scissors?`;
        instructionText.style.marginBottom = '15px';
        instructionText.style.textAlign = 'center';
        gameUiContainer.appendChild(instructionText);

        // 2. Create choice buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'center';
        buttonContainer.style.gap = '15px';
        buttonContainer.style.marginBottom = '20px';

        choices.forEach(choice => {
            const button = document.createElement('button');
            button.textContent = choice;
            button.className = 'rps-choice-button'; // Use class from index.html CSS

            button.addEventListener('click', () => handleUserChoice(choice));
            buttonContainer.appendChild(button);
        });
        gameUiContainer.appendChild(buttonContainer);

         // 3. Create display area for results
         const resultDisplay = document.createElement('div');
         resultDisplay.id = 'rps-result-display';
         resultDisplay.textContent = 'Make your move!';
         resultDisplay.style.marginTop = '10px';
         resultDisplay.style.padding = '10px';
         resultDisplay.style.minHeight = '30px'; // Ensure space even when empty
         resultDisplay.style.textAlign = 'center';
         resultDisplay.style.fontWeight = 'bold';
         resultDisplay.style.border = '1px dashed var(--game-cell-border, #f06292)';
         resultDisplay.style.borderRadius = '5px';
         resultDisplay.style.backgroundColor = 'rgba(0,0,0,0.1)';
         resultDisplay.style.opacity = '0.6'; // Start slightly faded
         resultDisplay.style.transition = 'opacity 0.3s ease';
         resultDisplay.style.color = 'var(--game-cell-text)'; // Use theme color
         gameUiContainer.appendChild(resultDisplay);


        // Initial message sent from index.html upon loading game
    }

    // Public interface
    return {
        init: init
    };

})();

// --- END OF FILE rps.js ---