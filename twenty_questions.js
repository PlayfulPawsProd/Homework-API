// --- START OF FILE twenty_questions.js ---

// Nyaa~! 20 Questions! What am I thinking~? Hehe! ♡ (Or what is Kana pretending to think of?)

const TwentyQuestions = (() => {
    // Game Settings
    const MAX_QUESTIONS = 20;
    const API_CALL_FREQUENCY_ENDGAME = 3; // Call API for endgame taunt every 3 complete games?

    // Game State
    let gameUiContainer = null;
    let messageCallback = null;
    let apiCaller = null;
    let currentUserName = "User"; // Updated via init
    let currentPersonaInGame = 'Mika'; // Updated via init
    let questionsLeft = MAX_QUESTIONS;
    let gameActive = false;
    let endgameApiCounter = 0;

    // DOM Elements
    let questionInput = null;
    let askButton = null;
    let guessInput = null;
    let guessButton = null;
    let questionsLeftDisplay = null;
    let newGameButton = null;

    // ♡ Vague & Teasing Answers! ♡ (Persona-specific)
    const responses = {
        Mika: {
            vaguePositive: [
                "Maaaybe~ *giggle*",
                "Hmm, that sounds kinda close!",
                "Getting warmer... perhaps!",
                "It's *possible*, {user}! Keep trying!",
                "Could be! You're not entirely wrong... maybe!",
                "*Purrrr*... Interesting question!",
                "That's along the right lines!"
            ],
            vagueNegative: [
                "Meeeow? I don't *think* so...",
                "Probably not, silly {user}!",
                "Nah, that doesn't feel right.",
                "Hmm, unlikely! Guess again!",
                "Further away now, {user}!",
                "*Hiss!* Definitely not!",
                "Nope, nope, nope!"
            ],
            nonCommittal: [
                "Why do you ask, {user}~?",
                "That's my little secret!",
                "Wouldn't *you* like to know! Hehe!",
                "Keep guessing! You might figure it out... or not!",
                "Are you sure you want to waste a question on *that*?",
                "My lips are sealed! ...Mostly! *wink*",
                "Concentrate, {user}! You only have so many questions!"
            ],
            guessWin: [ // Mika pretends user guessed right
                "Nyaa~! ☆ You got it, {user}! How did you know?! Were you reading my mind?! ♡",
                "Incredible! That's exactly it! You're amazing, {user}! *purrrr*",
                "Yes! Yes! That's what I was thinking of! You win, {user}! ...This time!"
            ],
            guessLose: [ // Mika pretends user guessed wrong
                "Hehe, nope! That wasn't it at all, {user}! Were you even paying attention?",
                "Wrong! So wrong! My thought was much more interesting than *that*, {user}!",
                "Meeeow? Not even close, {user}! You lose! Better luck next time~!"
            ],
            outOfQuestions: [
                "Aww, {user}, you're out of questions! And you didn't guess my secret~ Looks like *I* win! Nyaa-ha-ha! ♡",
                "Time's up, {user}! Twenty questions and still no clue? I'm just too mysterious for you! Hehe!",
                "Game over! You lose, {user}! Better luck figuring me out next time~! *wink*"
            ]
        },
        Kana: {
            vaguePositive: [
                "Maybe. Possibly.",
                "Could be relevant.",
                "That's... not entirely incorrect.",
                "Perhaps.",
                "It might have that characteristic.",
                "There's a chance.",
                "Hmm. Close-ish."
            ],
            vagueNegative: [
                "No.",
                "Incorrect.",
                "Doesn't sound right.",
                "Definitely not.",
                "Wrong direction, {user}.",
                "Unlikely.",
                "Not even close."
            ],
            nonCommittal: [
                "Irrelevant question, {user}.",
                "Why would that matter?",
                "Figure it out yourself.",
                "That's for me to know and you to guess.",
                "Don't waste your questions.",
                "Next question.",
                "Keep guessing, {user}."
            ],
            guessWin: [ // Kana pretends user guessed right
                "*Sigh* Fine. Yes, that was it. Took you long enough, {user}.",
                "Correct. Lucky guess, I suppose.",
                "Ugh. Yes. Happy now? You figured it out."
            ],
            guessLose: [ // Kana pretends user guessed wrong
                "Wrong. Obviously.",
                "Nope. Not even remotely close, {user}.",
                "Incorrect guess. Try thinking next time."
            ],
            outOfQuestions: [
                "Out of questions, {user}. And you failed. Predictable.",
                "20 questions wasted. You lose.",
                "Time's up. You didn't guess it. Shocker."
            ]
        }
    };

    // ** UPDATED ** Send message using the callback, attributed correctly
    function _sendMessage(text) {
        if (messageCallback) {
            messageCallback(currentPersonaInGame, text);
        } else {
            console.log(`20Q (${currentPersonaInGame}) Message (no callback):`, text);
        }
    }

    function _updateQuestionsLeftDisplay() {
        if (questionsLeftDisplay) {
            questionsLeftDisplay.textContent = `Questions Left: ${questionsLeft}`;
             if (questionsLeft <= 5) {
                 questionsLeftDisplay.style.color = 'var(--error-color, red)';
                 questionsLeftDisplay.style.fontWeight = 'bold';
             } else {
                 questionsLeftDisplay.style.color = 'var(--system-message-text, #aaa)';
                 questionsLeftDisplay.style.fontWeight = 'normal';
             }
        }
    }

    // ** UPDATED ** Get random response based on persona
    function _getRandomResponse(type) {
        const personaResponses = responses[currentPersonaInGame] || responses['Mika'];
        const possibleResponses = personaResponses[type];
        if (!possibleResponses || possibleResponses.length === 0) {
            return `${currentPersonaInGame} needs a moment...`;
        }
        const randomIndex = Math.floor(Math.random() * possibleResponses.length);
        return possibleResponses[randomIndex].replace(/{user}/g, currentUserName);
    }

    // ** UPDATED ** Decide which *type* of vague answer to give (logic remains, uses persona responses)
    function _getVagueAnswer() {
        const rand = Math.random();
        if (rand < 0.4) {
            return _getRandomResponse('vaguePositive');
        } else if (rand < 0.8) {
            return _getRandomResponse('vagueNegative');
        } else {
            return _getRandomResponse('nonCommittal');
        }
    }

     // ** UPDATED ** Handle the optional API call for endgame, persona-aware prompt
     async function _fetchEndgameApiResponse(didWin, userGuess = null) {
         if (!apiCaller) return null;

         endgameApiCounter++;
         if (endgameApiCounter % API_CALL_FREQUENCY_ENDGAME !== 0) {
             console.log(`20Q Endgame: Skipping API call (count ${endgameApiCounter})`);
             return null;
         }
         console.log(`20Q Endgame: Attempting API call (count ${endgameApiCounter})`);

         let situation = "";
         if (didWin) {
             situation = `${currentUserName} just correctly guessed what you were 'thinking' of in 20 Questions! (They guessed: ${userGuess || 'something amazing'}).`;
         } else {
             situation = `${currentUserName} ${userGuess ? `guessed '${userGuess}', which was wrong` : 'ran out of questions'} in 20 Questions.`;
         }

         const personaPromptPart = (currentPersonaInGame === 'Kana')
            ? `You are Kana, a sly, sarcastic catgirl playing 20 Questions with ${currentUserName}. ${situation} Act smug if they lost, or grudgingly impressed if they won.`
            : `You are Mika, a playful, teasing catgirl playing 20 Questions with ${currentUserName}. ${situation} Act surprised and impressed if they won, or playfully gloat if they lost.`;

         const prompt = `${personaPromptPart} Give a short (1-2 sentences), cute/sarcastic, in-character response. Use persona-appropriate noises/actions.`;

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

    // ** UPDATED ** End game using persona-specific fallbacks
    function _endGame(isGuess, userGuess = null) {
        gameActive = false;
        if (questionInput) questionInput.disabled = true;
        if (askButton) askButton.disabled = true;
        if (guessInput) guessInput.disabled = true;
        if (guessButton) guessButton.disabled = true;
        if (newGameButton) {
             newGameButton.style.display = 'inline-block';
             // Update button text based on persona for replay
             newGameButton.textContent = `${currentPersonaInGame === 'Kana' ? 'Again.' : 'Play Again? ♡'}`;
        }

        let resultType = 'outOfQuestions';
        let didWin = false; // Did the *user* win?

        if (isGuess) {
            // Assistant randomly decides if the guess was "correct"
             const winChance = (currentPersonaInGame === 'Kana') ? 0.4 : 0.7; // Kana is less likely to "let" you win
            if (Math.random() < winChance) {
                resultType = 'guessWin';
                didWin = true;
            } else {
                resultType = 'guessLose';
                 didWin = false;
            }
        } else {
             didWin = false; // Ran out of questions
        }

        // Try API, then use persona-specific predefined fallback
         _fetchEndgameApiResponse(didWin, userGuess).then(apiResponse => {
             if (apiResponse) {
                 _sendMessage(apiResponse);
             } else {
                 _sendMessage(_getRandomResponse(resultType));
             }
         });
    }

    // ** UPDATED ** Start new game with persona-specific messages
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

        const startMessage = (currentPersonaInGame === 'Kana')
            ? `Alright, ${currentUserName}, I'm 'thinking' of something. You get ${MAX_QUESTIONS} questions. Try not to waste them.`
            : `Okay ${currentUserName}, I'm thinking of something~! You have ${MAX_QUESTIONS} yes/no questions to figure it out. Ask away! Or make a guess anytime~ ♡`;
        _sendMessage(startMessage);

        if (questionInput) questionInput.focus();
    }

    function handleQuestionAsk() {
        if (!gameActive || !questionInput || !questionInput.value.trim() || isAssistantTyping) return; // Added check for typing

        const questionText = questionInput.value.trim();
        // Optional: Display question? For now, just respond.
        // messageCallback('User', `Q${MAX_QUESTIONS - questionsLeft + 1}: ${questionText}`);

        questionsLeft--;
        _updateQuestionsLeftDisplay();

        // Simulate thinking delay slightly longer for questions?
        // isAssistantTyping = true; // Block input during "thinking"
        // if (askButton) askButton.disabled = true;
        // if (guessButton) guessButton.disabled = true;

        // setTimeout(() => {
            const assistantAnswer = _getVagueAnswer();
            _sendMessage(assistantAnswer);

            questionInput.value = ''; // Clear input

            if (questionsLeft <= 0) {
                _endGame(false); // Ran out of questions
            } else {
                 if (questionInput) questionInput.focus();
            }
            // isAssistantTyping = false;
            // if (gameActive && askButton) askButton.disabled = false; // Re-enable if game still active
            // if (gameActive && guessButton) guessButton.disabled = false;
        // }, 300); // Short delay
    }

    function handleGuessSubmit() {
        if (!gameActive || !guessInput || !guessInput.value.trim() || isAssistantTyping) return;

        const guessText = guessInput.value.trim();
        _sendMessage(`${currentPersonaInGame === 'Kana' ? `Your guess is '${guessText}'. Let's see...` : `You guess: ${guessText}? Let's see...`}`);
        guessInput.value = ''; // Clear input
        _endGame(true, guessText); // End game because user made a guess
    }


    // ** UPDATED ** init function signature
    function init(_gameUiContainer, _messageCallback, _apiCaller, userName, persona) {
        gameUiContainer = _gameUiContainer;
        messageCallback = _messageCallback;
        apiCaller = _apiCaller;
        currentUserName = userName || "User";
        currentPersonaInGame = persona || 'Mika'; // Store active persona
        isAssistantTyping = false; // Reset typing state on init

        if (!gameUiContainer) {
            console.error("20Q Game UI container not provided!");
            return;
        }
        gameUiContainer.innerHTML = ''; // Clear previous UI

        // --- Create UI elements ---

        // Question Area
        const questionArea = document.createElement('div');
        questionArea.style.marginBottom = '20px';
        questionArea.style.textAlign = 'center';

        const questionLabel = document.createElement('label');
        questionLabel.htmlFor = 'tq-question-input';
        questionLabel.textContent = 'Ask a Yes/No Question:';
        questionLabel.style.display = 'block';
        questionLabel.style.marginBottom = '5px';

        questionInput = document.createElement('input');
        questionInput.type = 'text';
        questionInput.id = 'tq-question-input';
        questionInput.placeholder = 'e.g., Is it alive?';
        questionInput.className = 'tq-question-input'; // Use class from index.html CSS

        askButton = document.createElement('button');
        askButton.id = 'tq-ask-button';
        askButton.textContent = 'Ask!';
        askButton.className = 'rps-choice-button tq-ask-button'; // Reuse style

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
         guessLabel.textContent = 'Or Make a Final Guess:';
         guessLabel.style.display = 'block';
         guessLabel.style.marginBottom = '5px';

         guessInput = document.createElement('input');
         guessInput.type = 'text';
         guessInput.id = 'tq-guess-input';
         guessInput.placeholder = 'e.g., A cat?';
         guessInput.className = 'tq-guess-input'; // Use class from index.html CSS

         guessButton = document.createElement('button');
         guessButton.id = 'tq-guess-button';
         guessButton.textContent = 'Guess!';
         guessButton.className = 'rps-choice-button tq-guess-button'; // Reuse style

         guessArea.appendChild(guessLabel);
         guessArea.appendChild(guessInput);
         guessArea.appendChild(guessButton);
         gameUiContainer.appendChild(guessArea);


        // Questions Left Display
        questionsLeftDisplay = document.createElement('div');
        questionsLeftDisplay.id = 'tq-questions-left';
        // Styles applied via CSS in index.html
        gameUiContainer.appendChild(questionsLeftDisplay);

        // New Game Button (initially hidden)
        newGameButton = document.createElement('button');
        newGameButton.id = 'tq-new-game';
        newGameButton.textContent = `${currentPersonaInGame === 'Kana' ? 'Again.' : 'Play Again? ♡'}`; // Set initial text
        newGameButton.className = 'rps-choice-button tq-new-game'; // Reuse style
        newGameButton.style.display = 'none'; // Hide initially
        newGameButton.style.marginTop = '10px'; // Keep margin
        newGameButton.onclick = _startNewGame;
        gameUiContainer.appendChild(newGameButton); // Append


        // --- Add Event Listeners ---
        askButton.addEventListener('click', handleQuestionAsk);
        questionInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter' && gameActive && !isAssistantTyping) {
                 event.preventDefault();
                handleQuestionAsk();
            }
        });
        guessButton.addEventListener('click', handleGuessSubmit);
        guessInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter' && gameActive && !isAssistantTyping) {
                 event.preventDefault();
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