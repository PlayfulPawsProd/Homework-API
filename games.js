// --- START OF FILE games.js ---

// Nyaa~! Fun Time Game Logic! ♡ (TicTacToe Module)

const TicTacToe = (() => {
    let board = ['', '', '', '', '', '', '', '', ''];
    let userPlayer = 'X';
    let mikaPlayer = 'O'; // Assistant's symbol remains 'O'
    let currentPlayer = userPlayer; // User starts!
    let gameActive = true;
    let boardElement = null;
    let messageCallback = null; // Function to send messages back to chat!
    let currentUserName = "User"; // Will be updated
    let currentPersonaInGame = 'Mika'; // Store the persona for this game instance

    const winningConditions = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
        [0, 4, 8], [2, 4, 6]  // Diagonals
    ];

    // Function to send messages back to the main UI
    function _sendMessage(text) {
        if (messageCallback) {
             // Send message with the current persona's name
            setTimeout(() => messageCallback(currentPersonaInGame, `*(${currentPlayer === userPlayer ? 'Your turn!' : 'My turn!'})* ${text}`), 300);
        } else {
            console.log(`TTT (${currentPersonaInGame}) Message (no callback):`, text);
        }
    }

    function _checkWin(player) {
        for (let i = 0; i < winningConditions.length; i++) {
            const [a, b, c] = winningConditions[i];
            if (board[a] === player && board[b] === player && board[c] === player) {
                return true;
            }
        }
        return false;
    }

    function _checkDraw() {
        return !board.includes('');
    }

    function _mikaSimpleMove() {
        let availableCells = [];
        board.forEach((cell, index) => {
            if (cell === '') {
                availableCells.push(index);
            }
        });

        if (availableCells.length > 0) {
            // Basic AI: Try to win, then try to block, otherwise random
            // 1. Check if Assistant can win
            for (let i = 0; i < availableCells.length; i++) {
                let index = availableCells[i];
                board[index] = mikaPlayer; // Try the move
                if (_checkWin(mikaPlayer)) {
                    _sendMessage(currentPersonaInGame === 'Kana' ? "Found it. Obviously." : "Hehe~ Found my spot! ♡");
                    return index; // Winning move!
                }
                board[index] = ''; // Undo test move
            }

            // 2. Check if User is about to win and block
            for (let i = 0; i < availableCells.length; i++) {
                let index = availableCells[i];
                board[index] = userPlayer; // Pretend user moved here
                if (_checkWin(userPlayer)) {
                    board[index] = ''; // Undo test move
                    _sendMessage(currentPersonaInGame === 'Kana' ? "Nice try. Blocked." : "Nuh-uh-uh! Not so fast! My spot now! *giggle*");
                    return index; // Blocking move!
                }
                board[index] = ''; // Undo test move
            }

            // 3. Otherwise, random move
            const randomIndex = Math.floor(Math.random() * availableCells.length);
             _sendMessage(currentPersonaInGame === 'Kana' ? "Whatever. Here." : "Hmm... how about... *here*? Let's see what you do~");
            return availableCells[randomIndex];

        }
        return -1; // Should not happen if game isn't over
    }

    function handleResultValidation() {
         let winMessage = "";
         let loseMessage = "";
         let drawMessage = "";

         if (currentPersonaInGame === 'Kana') {
            winMessage = "Tch. I win. Expected.";
            loseMessage = "*Scoffs* You won? Beginner's luck, I guess. Don't get used to it.";
            drawMessage = "A draw? How utterly mediocre. Play again and try to actually win... or lose properly.";
         } else { // Mika's messages
            winMessage = "Nyaa~! ☆ I win! I'm just too good! Better luck next time! ♡";
            loseMessage = "*Hmph!* You... you won?! You must have cheated! Or... maybe you're just lucky this time! Rematch! >.<";
            drawMessage = "Meeeow? A draw?! How boring! I guess you're not *totally* hopeless... Let's go again! ";
         }

        if (_checkWin(mikaPlayer)) {
            _sendMessage(winMessage);
            gameActive = false;
            return;
        }
        if (_checkWin(userPlayer)) {
            // This shouldn't happen if called after Assistant's move, but good for user turn check
            _sendMessage(loseMessage);
            gameActive = false;
            return;
        }
        if (_checkDraw()) {
            _sendMessage(drawMessage);
            gameActive = false;
            return;
        }
    }

    function handleCellClick(clickedCellIndex) {
        if (!gameActive || board[clickedCellIndex] !== '' || currentPlayer !== userPlayer) {
            return; // Ignore click if game over, cell taken, or not user's turn
        }

        board[clickedCellIndex] = userPlayer;
        document.getElementById(`ttt-cell-${clickedCellIndex}`).textContent = userPlayer;
        document.getElementById(`ttt-cell-${clickedCellIndex}`).classList.add('taken');


        if (_checkWin(userPlayer)) {
            handleResultValidation();
            return;
        }
        if (_checkDraw()) {
            handleResultValidation();
            return;
        }

        // Switch to Assistant's turn
        currentPlayer = mikaPlayer;
        _sendMessage(currentPersonaInGame === 'Kana' ? "My turn. Try to keep up." : "Okay, my turn now! Let me think... *purrrr*"); // Announce turn change

        // Assistant makes her move after a short delay
        setTimeout(() => {
            if (!gameActive) return; // Check again in case user won instantly

            const assistantMoveIndex = _mikaSimpleMove();
            if (assistantMoveIndex !== -1) {
                board[assistantMoveIndex] = mikaPlayer;
                 const cellElement = document.getElementById(`ttt-cell-${assistantMoveIndex}`);
                 if (cellElement) {
                    cellElement.textContent = mikaPlayer;
                    cellElement.classList.add('taken');
                 }

                handleResultValidation(); // Check if Assistant won or caused a draw

                if (gameActive) {
                    currentPlayer = userPlayer; // Switch back to user's turn
                     // Optional: Add persona-specific "Your turn again!" message
                     // _sendMessage(currentPersonaInGame === 'Kana' ? "Your move." : "Your turn again!");
                }
            }
        }, 700); // Slightly faster delay maybe?
    }

    function resetGame() {
        board = ['', '', '', '', '', '', '', '', ''];
        gameActive = true;
        currentPlayer = userPlayer; // User always starts
        if (boardElement) {
            boardElement.querySelectorAll('.ttt-cell').forEach(cell => {
                cell.textContent = '';
                cell.classList.remove('taken');
            });
        }
         _sendMessage(currentPersonaInGame === 'Kana' ? "New game. Let's get this over with." : "Okay, new game! Ready to lose again? Hehe~ ♡");
    }

    // ** UPDATED init function signature **
    function init(_boardElement, _messageCallback, userName, persona) {
        boardElement = _boardElement;
        messageCallback = _messageCallback;
        currentUserName = userName || "User"; // Use provided name
        currentPersonaInGame = persona || 'Mika'; // Store the active persona

        boardElement.innerHTML = ''; // Clear previous board if any

        // Create the 3x3 grid
        for (let i = 0; i < 9; i++) {
            const cell = document.createElement('div');
            cell.classList.add('ttt-cell');
            cell.id = `ttt-cell-${i}`;
            cell.addEventListener('click', () => handleCellClick(i));
            boardElement.appendChild(cell);
        }

        // Add a reset button (ensure it's only added once)
        let resetButton = document.getElementById('ttt-reset-button');
        if (!resetButton) {
            resetButton = document.createElement('button');
            resetButton.textContent = "New Game!";
            resetButton.id = 'ttt-reset-button'; // Use ID for potential styling/selection
            resetButton.onclick = resetGame;
            // Append it after the board, within the game UI area
            if (boardElement.parentNode) {
                 // Use insertBefore with nextSibling to place it after the board
                 boardElement.parentNode.insertBefore(resetButton, boardElement.nextSibling);
            } else {
                console.warn("Could not find parent node to append TTT reset button.");
            }
        }

        resetGame(); // Initialize the board state

        // Send initial message based on persona
        const initialMessage = (currentPersonaInGame === 'Kana')
            ? `Tic-Tac-Toe, huh? Fine. You're X. Don't waste my time, ${currentUserName}.`
            : `Tic-Tac-Toe time! Let's see if you can keep up, ${currentUserName}! Nyaa~! You're X, I'm O. Go first!`;
        // Use the messageCallback directly for the initial message
        if (messageCallback) {
             messageCallback(currentPersonaInGame, initialMessage);
        } else {
             console.log(initialMessage);
        }
    }

    // Public interface
    return {
        init: init
    };

})();

// --- END OF FILE games.js ---