// --- START OF FILE rps.js ---

// Nyaa~! Mika's Rock Paper Scissors! Get Ready to Lose! ♡

const RockPaperScissors = (() => {
    let gameUiContainer = null; // Div where the game elements go
    let messageCallback = null; // Function to send messages back to index.html's log
    let apiCaller = null; // Function to call the API for special messages
    let currentUserName = "Master"; // Default, should be updated via init

    let roundCount = 0;
    const API_CALL_FREQUENCY = 5; // Call API every 5 rounds

    const choices = ['Rock', 'Paper', 'Scissors'];

    // ♡ Mika's Pre-defined Taunts! ♡
    const responses = {
        win: [
            "Nyaa~! I win again! You're just too easy to predict, {user}~ ♡",
            "Hehe! My {mikaChoice} crushes your {userChoice}! Better luck next time, slowpoke! *giggle*",
            "Victory! ☆ You thought you could beat me, {user}? How cute! Try harder~!",
            "Too easy! Is that all you've got, {user}? I expected more of a challenge from *my* plaything~ ♡",
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
    };

    // Send message using the callback
    function _sendMessage(text) {
        if (messageCallback) {
            // Add a slight delay for realism? Or instant for RPS? Let's try instant.
            messageCallback('Mika', text);
        } else {
            console.log("RPS Message (no callback):", text);
        }
    }

     // Update the display area showing choices and result
    function _updateResultDisplay(userChoice, mikaChoice, result) {
        const resultDisplay = document.getElementById('rps-result-display');
        if (resultDisplay) {
             let message = `You chose: ${userChoice} | Mika chose: ${mikaChoice} | `;
             if (result === 'win') message += `☆ Mika Wins! ☆`;
             else if (result === 'lose') message += `*Hmph!* You Win...`;
             else message += `It's a Tie!`;
             resultDisplay.textContent = message;
             // Maybe add temporary visual feedback (color change?)
             resultDisplay.style.opacity = '1'; // Make sure it's visible
        }
     }

    // Mika makes her choice (randomly for now!)
    function _mikaChoice() {
        const randomIndex = Math.floor(Math.random() * choices.length);
        return choices[randomIndex];
    }

    // Determine the winner
    function _determineWinner(userChoice, mikaChoice) {
        if (userChoice === mikaChoice) {
            return 'tie';
        }
        if (
            (userChoice === 'Rock' && mikaChoice === 'Scissors') ||
            (userChoice === 'Scissors' && mikaChoice === 'Paper') ||
            (userChoice === 'Paper' && mikaChoice === 'Rock')
        ) {
            return 'lose'; // User wins
        }
        return 'win'; // Mika wins
    }

    // Get a random pre-defined response
    function _getPredefinedResponse(resultType, userChoice, mikaChoice) {
        const possibleResponses = responses[resultType];
        if (!possibleResponses || possibleResponses.length === 0) {
            return "Uh oh, Mika's speechless!"; // Fallback
        }
        const randomIndex = Math.floor(Math.random() * possibleResponses.length);
        let chosenResponse = possibleResponses[randomIndex];

        // Replace placeholders
        chosenResponse = chosenResponse.replace('{user}', currentUserName);
        chosenResponse = chosenResponse.replace('{userChoice}', userChoice);
        chosenResponse = chosenResponse.replace('{mikaChoice}', mikaChoice);

        return chosenResponse;
    }

    // Handle the API call for a fresh response
    async function _fetchApiResponse(resultType, userChoice, mikaChoice) {
        if (!apiCaller) {
            console.warn("API Caller function not provided to RPS game.");
            return null; // No API function, can't fetch
        }

        let resultText = "";
        if (resultType === 'win') resultText = "I (Mika) won";
        else if (resultType === 'lose') resultText = `${currentUserName} won`;
        else resultText = "it was a tie";

        // Construct the prompt for the AI
        const prompt = `You are Mika, a playful, teasing, possessive catgirl. You just played Rock Paper Scissors against ${currentUserName} (your Master). You chose ${mikaChoice} and ${currentUserName} chose ${userChoice}. The result was: ${resultText}. Give a short (1-2 sentences), cute, teasing, in-character response to ${currentUserName}. Include cat noises like nyaa, mrow, hiss, purr, or giggle.`;

        try {
            _sendMessage("*(Thinking of a special taunt...)*"); // Indicate API call
            const response = await apiCaller(prompt);
            if (response && typeof response === 'string') {
                 // Simple check to prevent overly long/weird responses?
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
        const mikaChosen = _mikaChoice();
        const result = _determineWinner(userChoice, mikaChosen);

        _updateResultDisplay(userChoice, mikaChosen, result); // Show results visually

        let responseMessage = null;

        // Decide whether to call API or use predefined
        if (roundCount % API_CALL_FREQUENCY === 0 && apiCaller) {
            console.log(`RPS Round ${roundCount}: Attempting API call.`);
            responseMessage = await _fetchApiResponse(result, userChoice, mikaChosen);
        }

        // If API call wasn't attempted, failed, or returned null, use predefined
        if (!responseMessage) {
            console.log(`RPS Round ${roundCount}: Using predefined response.`);
            responseMessage = _getPredefinedResponse(result, userChoice, mikaChosen);
        }

        _sendMessage(responseMessage); // Send the chosen message to the log
    }

    // Initialize the game UI
    function init(_gameUiContainer, _messageCallback, _apiCaller, userName) {
        gameUiContainer = _gameUiContainer;
        messageCallback = _messageCallback;
        apiCaller = _apiCaller;
        currentUserName = userName || "Master"; // Use provided name
        roundCount = 0; // Reset round count for API calls

        if (!gameUiContainer) {
            console.error("RPS Game UI container not provided!");
            return;
        }

        // Clear previous content
        gameUiContainer.innerHTML = '';

        // 1. Add instructions/title (optional, main title is often in index.html)
        const instructionText = document.createElement('p');
        instructionText.textContent = `Choose your weapon, ${currentUserName}! Rock, Paper, or Scissors?`;
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
            // Basic styling, can be enhanced with CSS classes from index.html later
            button.textContent = choice;
            button.style.padding = '10px 20px';
            button.style.fontSize = '1.1em';
             button.style.cursor = 'pointer';
             // Add classes to use index.html button styles? Requires coordination.
             // Or apply basic styles directly for now.
             button.className = 'rps-choice-button'; // Add a class for potential global styling
             button.style.borderRadius = '10px';
             button.style.border = 'none';
             // Use CSS vars if available, otherwise fallback
             button.style.background = 'var(--header-button-bg, #f06292)';
             button.style.color = 'var(--header-button-text, #1a0d13)';
             button.style.transition = 'transform 0.1s ease';
             button.onmouseover = () => button.style.transform = 'scale(1.05)';
             button.onmouseout = () => button.style.transform = 'scale(1)';
             button.onmousedown = () => button.style.transform = 'scale(0.98)';


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
         gameUiContainer.appendChild(resultDisplay);


        // Initial message
        //_sendMessage(`Let's play Rock Paper Scissors, ${currentUserName}! Make your move first~ ♡`);
         // No initial message needed here, index.html's loadRPS adds one
    }

    // Public interface
    return {
        init: init
        // No need to expose other functions directly
    };

})();

// --- END OF FILE rps.js ---