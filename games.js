// --- START OF FILE games.js ---

// Nyaa~! Mika's Fun Time Game Logic! ♡

const TicTacToe = (() => {
    let board = ['', '', '', '', '', '', '', '', ''];
    let userPlayer = 'X';
    let mikaPlayer = 'O';
    let currentPlayer = userPlayer; // User starts!
    let gameActive = true;
    let boardElement = null;
    let messageCallback = null; // Function to send messages back to chat!

    const winningConditions = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
        [0, 4, 8], [2, 4, 6]  // Diagonals
    ];

    // Function to send messages (trash talk!) back to the main UI
    function _sendMessage(text) {
        if (messageCallback) {
            // Adding a little delay so it feels like Mika is reacting!
            setTimeout(() => messageCallback('Mika', `*(${currentPlayer === userPlayer ? 'Your turn!' : 'My turn!'})* ${text}`), 300);
        } else {
            console.log("Game Message (no callback):", text);
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
            // 1. Check if Mika can win
            for (let i = 0; i < availableCells.length; i++) {
                let index = availableCells[i];
                board[index] = mikaPlayer; // Try the move
                if (_checkWin(mikaPlayer)) {
                    _sendMessage("Hehe~ Found my spot! ♡");
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
                    _sendMessage("Nuh-uh-uh! Not so fast! My spot now! *giggle*");
                    return index; // Blocking move!
                }
                board[index] = ''; // Undo test move
            }

            // 3. Otherwise, random move
            const randomIndex = Math.floor(Math.random() * availableCells.length);
             _sendMessage("Hmm... how about... *here*? Let's see what you do~");
            return availableCells[randomIndex];

        }
        return -1; // Should not happen if game isn't over
    }

    function handleResultValidation() {
        if (_checkWin(mikaPlayer)) {
            _sendMessage("Nyaa~! ☆ I win! I'm just too good! Better luck next time, plaything~ ♡");
            gameActive = false;
            return;
        }
        if (_checkWin(userPlayer)) {
            // This shouldn't happen if called after Mika's move, but good for user turn check
            _sendMessage("*Hmph!* You... you won?! You must have cheated! Or... maybe you're just lucky this time! Rematch! >.<");
            gameActive = false;
            return;
        }
        if (_checkDraw()) {
            _sendMessage("Meeeow? A draw?! How boring! I guess you're not *totally* hopeless... Let's go again! ");
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

        // Switch to Mika's turn
        currentPlayer = mikaPlayer;
        _sendMessage("Okay, my turn now! Let me think... *purrrr*"); // Announce turn change

        // Mika makes her move after a short delay
        setTimeout(() => {
            if (!gameActive) return; // Check again in case user won instantly

            const mikaMoveIndex = _mikaSimpleMove();
            if (mikaMoveIndex !== -1) {
                board[mikaMoveIndex] = mikaPlayer;
                 const cellElement = document.getElementById(`ttt-cell-${mikaMoveIndex}`);
                 if (cellElement) {
                    cellElement.textContent = mikaPlayer;
                    cellElement.classList.add('taken');
                 }

                handleResultValidation(); // Check if Mika won or caused a draw

                if (gameActive) {
                    currentPlayer = userPlayer; // Switch back to user's turn
                     // Optionally add another message here like "Your turn again!"
                }
            }
        }, 1000); // 1 second delay for Mika's move
    }

    function resetGame() {
        board = ['', '', '', '', '', '', '', '', ''];
        gameActive = true;
        currentPlayer = userPlayer; // User always starts for now
        if (boardElement) {
            boardElement.querySelectorAll('.ttt-cell').forEach(cell => {
                cell.textContent = '';
                cell.classList.remove('taken');
            });
        }
         _sendMessage("Okay, new game! Ready to lose again? Hehe~ ♡");
    }

    function init(_boardElement, _messageCallback) {
        boardElement = _boardElement;
        messageCallback = _messageCallback;
        boardElement.innerHTML = ''; // Clear previous board if any

        // Create the 3x3 grid
        for (let i = 0; i < 9; i++) {
            const cell = document.createElement('div');
            cell.classList.add('ttt-cell');
            cell.id = `ttt-cell-${i}`;
            cell.addEventListener('click', () => handleCellClick(i));
            boardElement.appendChild(cell);
        }
        // Add a reset button
        const resetButton = document.createElement('button');
        resetButton.textContent = "New Game!";
        resetButton.id = 'ttt-reset-button';
        resetButton.onclick = resetGame;
        // Find a place to put the reset button, maybe after the board?
        // Check if boardElement's parent exists to append reset button there
        if (boardElement.parentNode) {
             // Avoid adding multiple reset buttons
             const existingReset = boardElement.parentNode.querySelector('#ttt-reset-button');
             if(!existingReset) {
                boardElement.parentNode.insertBefore(resetButton, boardElement.nextSibling);
             }
        }


        resetGame(); // Initialize the board state
        _sendMessage("Tic-Tac-Toe time! Let's see if you can keep up, nyaa~! You're X, I'm O. Go first!");
    }

    // Public interface
    return {
        init: init
        // No need to expose other functions directly for now
    };

})();

// --- END OF FILE games.js ---