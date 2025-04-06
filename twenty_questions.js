// --- START OF FILE twenty_questions.js ---

// Nyaa~! Mika's 20 Questions! What am I thinking~? Hehe! ♡

const TwentyQuestions = (() => {
    // Game Settings
    const MAX_QUESTIONS = 20;
    const API_CALL_FREQUENCY_ENDGAME = 3; // Call API for endgame taunt every 3 complete games?

    // Game State
    let gameUiContainer = null;
    let messageCallback = null;
    let apiCaller = null;
    let currentUserName = "Master";
    let questionsLeft = MAX_QUESTIONS;
    let gameActive = false;
    let endgameApiCounter = 0; // Track completed games for API call frequency

    // DOM Elements
    let questionInput = null;
    let askButton = null;
    let guessInput = null;
    let guessButton = null;
    let questionsLeftDisplay = null;
    let newGameButton = null;

    // ♡ Mika's Vague & Teasing Answers! ♡
    // No need for specific object logic, just playful responses!
    const responses = {
        vaguePositive: [
            "Maaaybe~ *giggle*",
            "Hmm, that sounds kinda close!",
            "Getting warmer... perhaps!",
            "It's *possible*, Master~ Keep trying!",
            "Could be! You're not entirely wrong... maybe!",
            "*Purrrr*... Interesting question!",
            "That's along the right lines!"
        ],
        vagueNegative: [
            "Meeeow? I don't *think* so...",
            "Probably not, silly Master!",
            "Nah, that doesn't feel right.",
            "Hmm, unlikely! Guess again!",
            "Further away now, Master!",
            "*Hiss!* Definitely not!",
            "Nope, nope, nope!"
        ],
        nonCommittal: [
            "Why do you ask, Master~?",
            "That's my little secret!",
            "Wouldn't *you* like to know! Hehe!",
            "Keep guessing! You might figure it out... or not!",
            "Are you sure you want to waste a question on *that*?",
            "My lips are sealed! ...Mostly! *wink*",
            "Concentrate, Master! You only have so many questions!"
        ],
        // Final Guess Responses (Predefined)
        guessWin: [ // User makes a guess - Mika pretends they got it
            "Nyaa~! ☆ You got it, {user}! How did you know?! Were you reading my mind?! ♡",
            "Incredible! That's exactly it! You're amazing, {user}! *purrrr*",
            "Yes! Yes! That's what I was thinking of! You win, {user}! ...This time!"
        ],
        guessLose: [ // User makes a guess - Mika pretends they're wrong
            "Hehe, nope! That wasn't it at all, {user}! Were you even paying attention?",
            "Wrong! So wrong! My thought was much more interesting than *that*, {user}!",
            "Meeeow? Not even close, {user}! You lose! Better luck next time~!"
        ],
        outOfQuestions: [
            "Aww, {user}, you're out of questions! And you didn't guess my secret~ Looks like *I* win! Nyaa-ha-ha! ♡",
            "Time's up, {user}! Twenty questions and still no clue? I'm just too mysterious for you! Hehe!",
            "Game over! You lose, {user}! Better luck figuring me out next time~! *wink*"
        ]
    };

    function _sendMessage(text) {
        if (messageCallback) {
            messageCallback('Mika', text);
        } else {
            console.log("20Q Message (no callback):", text);
        }
    }

    function _updateQuestionsLeftDisplay() {
        if (questionsLeftDisplay) {
            questionsLeftDisplay.textContent = `Questions Left: ${questionsLeft}`;
             // Maybe add visual feedback when low?
             if (questionsLeft <= 5) {
                 questionsLeftDisplay.style.color = 'var(--error-color, red)';
                 questionsLeftDisplay.style.fontWeight = 'bold';
             } else {
                 questionsLeftDisplay.style.color = 'var(--system-message-text, #aaa)';
                 questionsLeftDisplay.style.fontWeight = 'normal';
             }
        }
    }

    function _getRandomResponse(type) {
        const possibleResponses = responses[type];
        if (!possibleResponses || possibleResponses.length === 0) {
            return "Mika needs a moment...";
        }
        const randomIndex = Math.floor(Math.random() * possibleResponses.length);
        return possibleResponses[randomIndex].replace(/{user}/g, currentUserName);
    }

    // Decide which *type* of vague answer to give
    function _getVagueAnswer() {
        const rand = Math.random();
        if (rand < 0.4) { // 40% chance positive-ish
            return _getRandomResponse('vaguePositive');
        } else if (rand < 0.8) { // 40% chance negative-ish
            return _getRandomResponse('vagueNegative');
        } else { // 20% chance non-committal
            return _getRandomResponse('nonCommittal');
        }
    }

     // Handle the optional API call for a unique endgame taunt
     async function _fetchEndgameApiResponse(didWin, userGuess = null) {
         if (!apiCaller) return null; // No API function

         endgameApiCounter++; // Increment counter regardless of call attempt
         if (endgameApiCounter % API_CALL_FREQUENCY_ENDGAME !== 0) {
             console.log(`20Q Endgame: Skipping API call (count ${endgameApiCounter})`);
             return null; // Don't call API this time
         }

         console.log(`20Q Endgame: Attempting API call (count ${endgameApiCounter})`);

         let situation = "";
         if (didWin) {
             situation = `${currentUserName} just correctly guessed what you were 'thinking' of in 20 Questions! (They guessed: ${userGuess || 'something amazing'}). Act surprised and impressed, maybe a little flustered they read your mind.`;
         } else { // Ran out of questions or guessed wrong
             situation = `${currentUserName} ${userGuess ? `guessed '${userGuess}', which was wrong` : 'ran out of questions'} in 20 Questions. Gloat playfully about how you win and how mysterious you are.`;
         }

         const prompt = `You are Mika, a playful, teasing, possessive catgirl playing 20 Questions with ${currentUserName} (your Master). Situation: ${situation} Give a short (1-2 sentences), cute, teasing, in-character response. Use cat noises/actions (*purr*, *giggle*, nyaa~, *wink*).`;

         try {
             _sendMessage("*(Thinking of a special reaction...)*");
             const response = await apiCaller(prompt);
             if (response && typeof response === 'string' && response.length < 150) {
                 return response;
             } else {
                 console.warn("API response invalid or too long for 20Q endgame, using fallback.");
                 return null;
             }
         } catch (error) {
             console.error("Error fetching API response for 20Q endgame:", error);
             return null;
         }
     }


    function _endGame(isGuess, userGuess = null) {
        gameActive = false;
        if (questionInput) questionInput.disabled = true;
        if (askButton) askButton.disabled = true;
        if (guessInput) guessInput.disabled = true;
        if (guessButton) guessButton.disabled = true;
        if (newGameButton) newGameButton.style.display = 'inline-block';

        let resultType = 'outOfQuestions'; // Default if questions ran out
        let didWin = false; // Did the *user* win? (Mika always pretends *something*)

        if (isGuess) {
            // Mika randomly decides if the guess was "correct" since she wasn't thinking of anything
            if (Math.random() > 0.3) { // 70% chance Mika pretends user wins on a guess
                resultType = 'guessWin';
                didWin = true;
            } else {
                resultType = 'guessLose';
                 didWin = false;
            }
        } else {
             didWin = false; // Ran out of questions, user loses
        }

        // Try to get API response, otherwise use predefined
         _fetchEndgameApiResponse(didWin, userGuess).then(apiResponse => {
             if (apiResponse) {
                 _sendMessage(apiResponse);
             } else {
                 // Use predefined based on the randomly decided outcome
                 _sendMessage(_getRandomResponse(resultType));
             }
         });

    }

    function _startNewGame() {
        gameActive = true;
        questionsLeft = MAX_QUESTIONS;

        if (questionInput) {
             questionInput.disabled = false;
             questionInput.value = '';
        }
        if (askButton) askButton.disabled = false;
        if (guessInput) {
            guessInput.disabled = false;
            guessInput.value = '';
        }
        if (guessButton) guessButton.disabled = false;
        if (newGameButton) newGameButton.style.display = 'none';

        _updateQuestionsLeftDisplay();
        _sendMessage(`Okay ${currentUserName}, I'm thinking of something~! You have ${MAX_QUESTIONS} yes/no questions to figure it out. Ask away! Or make a guess anytime~ ♡`);
        if (questionInput) questionInput.focus();
    }

    function handleQuestionAsk() {
        if (!gameActive || !questionInput || !questionInput.value.trim()) return;

        const questionText = questionInput.value.trim();
        // Display the user's question in the main log? Or just respond? Let's just respond.
        // Optional: messageCallback('User', `Q${MAX_QUESTIONS - questionsLeft + 1}: ${questionText}`);

        questionsLeft--;
        _updateQuestionsLeftDisplay();

        const mikaAnswer = _getVagueAnswer();
        _sendMessage(mikaAnswer);

        questionInput.value = ''; // Clear input

        if (questionsLeft <= 0) {
            _endGame(false); // Ran out of questions
        } else {
             questionInput.focus(); // Keep focus on question input
        }
    }

    function handleGuessSubmit() {
        if (!gameActive || !guessInput || !guessInput.value.trim()) return;

        const guessText = guessInput.value.trim();
        _sendMessage(`You guess: ${guessText}? Let's see...`); // Announce the guess
        _endGame(true, guessText); // End game because user made a guess
    }


    function init(_gameUiContainer, _messageCallback, _apiCaller, userName) {
        gameUiContainer = _gameUiContainer;
        messageCallback = _messageCallback;
        apiCaller = _apiCaller;
        currentUserName = userName || "Master";

        if (!gameUiContainer) {
            console.error("20Q Game UI container not provided!");
            return;
        }
        gameUiContainer.innerHTML = ''; // Clear previous UI

        // Create UI elements

        // Question Area
        const questionArea = document.createElement('div');
        questionArea.style.marginBottom = '20px';
        questionArea.style.textAlign = 'center';

        const questionLabel = document.createElement('label');
        questionLabel.htmlFor = 'tq-question-input';
        questionLabel.textContent = 'Ask Mika a Yes/No Question:';
        questionLabel.style.display = 'block';
        questionLabel.style.marginBottom = '5px';

        questionInput = document.createElement('input');
        questionInput.type = 'text';
        questionInput.id = 'tq-question-input';
        questionInput.placeholder = 'e.g., Is it bigger than a breadbox?';
        questionInput.style.padding = '8px 12px';
        questionInput.style.border = '1px solid var(--input-border, #ccc)';
        questionInput.style.borderRadius = '5px';
        questionInput.style.width = '80%'; // Wider input
        questionInput.style.maxWidth = '350px';
        questionInput.style.marginRight = '5px';
        questionInput.style.backgroundColor = 'var(--input-bg)'; // Theme aware
        questionInput.style.color = 'var(--text-color)'; // Theme aware

        askButton = document.createElement('button');
        askButton.id = 'tq-ask-button';
        askButton.textContent = 'Ask!';
        askButton.className = 'rps-choice-button'; // Reuse style

        questionArea.appendChild(questionLabel);
        questionArea.appendChild(questionInput);
        questionArea.appendChild(askButton);
        gameUiContainer.appendChild(questionArea);

         // Guess Area
         const guessArea = document.createElement('div');
         guessArea.style.marginBottom = '15px';
         guessArea.style.textAlign = 'center';

         const guessLabel = document.createElement('label');
         guessLabel.htmlFor = 'tq-guess-input';
         guessLabel.textContent = 'Or Make a Guess:';
         guessLabel.style.display = 'block';
         guessLabel.style.marginBottom = '5px';

         guessInput = document.createElement('input');
         guessInput.type = 'text';
         guessInput.id = 'tq-guess-input';
         guessInput.placeholder = 'e.g., A kitten?';
         guessInput.style.padding = '8px 12px';
         guessInput.style.border = '1px solid var(--input-border, #ccc)';
         guessInput.style.borderRadius = '5px';
         guessInput.style.width = '80%'; // Wider input
         guessInput.style.maxWidth = '350px';
         guessInput.style.marginRight = '5px';
         guessInput.style.backgroundColor = 'var(--input-bg)'; // Theme aware
         guessInput.style.color = 'var(--text-color)'; // Theme aware

         guessButton = document.createElement('button');
         guessButton.id = 'tq-guess-button';
         guessButton.textContent = 'Guess!';
         guessButton.className = 'rps-choice-button'; // Reuse style

         guessArea.appendChild(guessLabel);
         guessArea.appendChild(guessInput);
         guessArea.appendChild(guessButton);
         gameUiContainer.appendChild(guessArea);


        // Questions Left Display
        questionsLeftDisplay = document.createElement('div');
        questionsLeftDisplay.id = 'tq-questions-left';
        questionsLeftDisplay.style.marginBottom = '20px';
        questionsLeftDisplay.style.textAlign = 'center';
        questionsLeftDisplay.style.fontSize = '1.1em';
        gameUiContainer.appendChild(questionsLeftDisplay);

        // New Game Button (initially hidden)
        newGameButton = document.createElement('button');
        newGameButton.id = 'tq-new-game';
        newGameButton.textContent = 'Play Again? ♡';
        newGameButton.className = 'rps-choice-button'; // Reuse style
        newGameButton.style.display = 'none'; // Hide initially
        newGameButton.style.marginTop = '10px';
        newGameButton.onclick = _startNewGame;
        gameUiContainer.appendChild(newGameButton);


        // Add Event Listeners
        askButton.addEventListener('click', handleQuestionAsk);
        questionInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter' && gameActive) {
                handleQuestionAsk();
            }
        });
        guessButton.addEventListener('click', handleGuessSubmit);
        guessInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter' && gameActive) {
                handleGuessSubmit();
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

// --- END OF FILE twenty_questions.js ---