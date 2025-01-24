let peer = null;
let connection = null;
let isHost = false;
let gameState = {
    cards: [],
    flippedCards: [],
    currentPlayer: 1,
    player1Matches: 0,
    player2Matches: 0,
    boardSize: 0
};

// Add these at the top of the file with other state variables
let localPlayerReady = false;
let remotePlayerReady = false;
let currentTurnFlips = 0;

function initializeMultiplayer() {
    peer = new Peer(generateRandomId());
    
    peer.on('open', (id) => {
        console.log('My peer ID is: ' + id);
    });

    peer.on('connection', (conn) => {
        connection = conn;
        setupConnection();
        isHost = true;
    });

    peer.on('error', (err) => {
        document.getElementById('connection-status').textContent = 'Connection error: ' + err;
    });
}

function createRoom() {
    // Hide join room section and create room button
    document.querySelector('.join-room').style.display = 'none';
    document.getElementById('create-room-btn').style.display = 'none';
    
    // Show difficulty selection
    const container = document.querySelector('.create-room');
    const difficultySelection = document.createElement('div');
    difficultySelection.className = 'difficulty-selection';
    difficultySelection.innerHTML = `
        <h3>Select Difficulty</h3>
        <select id="multiplayer-difficulty">
            <option value="easy">Easy (4x4)</option>
            <option value="medium">Medium (6x6)</option>
            <option value="hard">Hard (8x8)</option>
        </select>
        <button id="confirm-difficulty" class="menu-btn">Start Game</button>
    `;
    
    container.appendChild(difficultySelection);
    
    // Update the back button's click handler
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) {
        // Remove old event listeners by creating a new button
        const newBackBtn = backBtn.cloneNode(true);
        backBtn.parentNode.replaceChild(newBackBtn, backBtn);
        
        newBackBtn.addEventListener('click', () => {
            // Reset to initial multiplayer menu state
            document.querySelector('.join-room').style.display = 'block';
            document.getElementById('create-room-btn').style.display = 'block';
            difficultySelection.remove();
            document.getElementById('room-id').style.display = 'none';
            document.getElementById('connection-status').textContent = '';
            
            // Restore original back button functionality
            const restoreBackBtn = newBackBtn.cloneNode(true);
            newBackBtn.parentNode.replaceChild(restoreBackBtn, newBackBtn);
            restoreBackBtn.addEventListener('click', () => {
                // Clean up any existing peer connections
                if (connection) {
                    connection.close();
                }
                if (peer) {
                    peer.destroy();
                }
                
                // Reset states
                connection = null;
                peer = null;
                isHost = false;
                
                // Return to main menu
                document.getElementById('multiplayer-menu').style.display = 'none';
                document.getElementById('game-menu').style.display = 'flex';
                
                // Remove the back button
                restoreBackBtn.remove();
                
                // Reset any displayed room info
                document.getElementById('room-id').style.display = 'none';
                document.getElementById('connection-status').textContent = '';
                document.querySelector('.join-room').style.display = 'block';
                document.getElementById('create-room-btn').style.display = 'block';
                document.getElementById('room-code-input').value = '';
            });
        });
    }
    
    // Add event listener for difficulty confirmation
    document.getElementById('confirm-difficulty').addEventListener('click', () => {
        const selectedDifficulty = document.getElementById('multiplayer-difficulty').value;
        difficultySelect.value = selectedDifficulty;
        
        // Hide difficulty selection
        difficultySelection.style.display = 'none';
        
        // Show room code
        const roomId = peer.id;
        document.querySelector('#room-id span').textContent = roomId;
        document.getElementById('room-id').style.display = 'block';
        document.getElementById('connection-status').textContent = 'Waiting for player to join...';
    });
}

function joinRoom(roomId) {
    connection = peer.connect(roomId);
    // Hide difficulty selector for joining player
    document.getElementById('difficulty-selector').style.display = 'none';
    setupConnection();
}

function setupConnection() {
    connection.on('open', () => {
        document.getElementById('multiplayer-menu').style.display = 'none';
        document.getElementById('game-container').style.display = 'flex';
        
        // Add exit button to game container
        const exitBtn = document.createElement('button');
        exitBtn.className = 'exit-btn';
        exitBtn.textContent = 'Exit Game';
        document.getElementById('game-container').prepend(exitBtn);
        
        exitBtn.addEventListener('click', () => {
            // For the player who clicks exit, just return to menu immediately
            if (connection) {
                connection.send({
                    type: 'playerExit'
                });
                connection.close();
            }
            if (peer) {
                peer.destroy();
            }
            
            // Reset all states
            resetAllGameStates();
            
            // Return to main menu
            document.getElementById('game-container').style.display = 'none';
            document.getElementById('game-menu').style.display = 'flex';
        });
        
        // Hide difficulty selector during gameplay
        document.getElementById('difficulty-selector').style.display = 'none';
        
        if (isHost) {
            const boardData = initializeGame();
            gameState.cards = boardData.cards;
            gameState.boardSize = boardData.size;
            syncGameState();
        }
        
        updateTurnIndicator();
    });

    connection.on('close', () => {
        // Don't show disconnect overlay here - we'll handle it in the playerExit message
    });

    connection.on('data', (data) => {
        if (data.type === 'gameState') {
            // Create or reset the board for non-host player
            if (!isHost) {
                createBoard(data.state.cards, data.state.boardSize);
            }
            
            // Reset all non-matched cards
            document.querySelectorAll('.card:not(.matched)').forEach(card => {
                card.classList.remove('flipped');
                card.innerHTML = '';
            });
            
            // Apply matched cards state
            data.state.matchedCards?.forEach(cardData => {
                const card = document.querySelector(`[data-index="${cardData.index}"]`);
                if (card) {
                    card.classList.add('flipped', 'matched');
                    const img = document.createElement('img');
                    img.src = cardData.symbol;
                    img.alt = 'Card Image';
                    card.innerHTML = '';
                    card.appendChild(img);
                }
            });
            
            currentPlayer = data.state.currentPlayer;
            player1Matches = data.state.player1Matches;
            player2Matches = data.state.player2Matches;
            matchedPairs = data.state.matchedPairs;
            gameState.flippedCards = Array.from(document.querySelectorAll('.card.flipped:not(.matched)'));
            gameState.cards = data.state.cards;
            gameState.boardSize = data.state.boardSize;
            
            // Only check for game end if we actually have matched pairs
            if (matchedPairs > 0) {
                const totalPairs = gameState.cards.length / 2;
                if (matchedPairs >= totalPairs) {
                    showMultiplayerVictoryScreen();
                    return;
                }
            }
            
            updateScore();
            updateTurnIndicator();
        } else if (data.type === 'cardFlip') {
            handleRemoteCardFlip(data.cardIndex);
        } else if (data.type === 'playAgainReady') {
            remotePlayerReady = true;
            checkBothPlayersReady();
        } else if (data.type === 'startNewGame') {
            startNewMultiplayerGame();
        } else if (data.type === 'playerExit') {
            // Show notification when other player exits
            const overlay = document.createElement('div');
            overlay.className = 'disconnect-overlay';
            overlay.innerHTML = `
                <div class="disconnect-message">
                    Player has left the game
                    <button class="menu-btn">Return to Menu</button>
                </div>
            `;
            document.body.appendChild(overlay);

            overlay.querySelector('button').addEventListener('click', () => {
                // Clean up and return to menu
                if (connection) {
                    connection.close();
                }
                if (peer) {
                    peer.destroy();
                }
                
                // Reset all states
                resetAllGameStates();
                
                // Return to main menu
                document.getElementById('game-container').style.display = 'none';
                document.getElementById('game-menu').style.display = 'flex';
                
                // Remove overlay
                overlay.remove();
            });

            // Don't clean up connection until they click the button
            // This ensures the overlay stays visible
        }
    });
}

function checkBothPlayersReady() {
    if (localPlayerReady && remotePlayerReady) {
        // Both players are ready, start new game
        connection.send({
            type: 'startNewGame'
        });
        
        startNewMultiplayerGame();
    }
}

function updateGameState(newState) {
    gameState = newState;
    renderGameState();
}

function handleCardClick(index) {
    if (!isMyTurn()) return;
    if (currentTurnFlips >= 2) return; // Prevent more than 2 flips per turn
    
    // Handle the flip locally
    handleLocalCardFlip(index);
    
    // Send the card flip to the other player
    connection.send({
        type: 'cardFlip',
        cardIndex: index
    });
}

function handleLocalCardFlip(index) {
    const card = document.querySelector(`[data-index="${index}"]`);
    if (card && !card.classList.contains('flipped') && !card.classList.contains('matched')) {
        currentTurnFlips++; // Increment flip counter
        card.classList.add('flipped');
        const img = document.createElement('img');
        img.src = card.dataset.symbol;
        img.alt = 'Card Image';
        card.innerHTML = '';
        card.appendChild(img);
        gameState.flippedCards.push(card);
        
        if (gameState.flippedCards.length === 2 && isMyTurn()) {
            const [card1, card2] = gameState.flippedCards;
            const isMatch = card1.dataset.symbol === card2.dataset.symbol;
            
            setTimeout(() => {
                if (isMatch) {
                    card1.classList.add('matched');
                    card2.classList.add('matched');
                    matchedPairs++;
                    handlePlayerTurn(true);
                    
                    // Play match sound
                    matchSound.currentTime = 0;
                    matchSound.play().catch(() => {});
                    
                    // Check if game is over
                    const totalPairs = gameState.cards.length / 2;
                    if (matchedPairs >= totalPairs) {
                        showMultiplayerVictoryScreen();
                    }
                } else {
                    card1.classList.remove('flipped');
                    card2.classList.remove('flipped');
                    card1.innerHTML = '';
                    card2.innerHTML = '';
                    handlePlayerTurn(false);
                    
                    // Play wrong match sound if it exists
                    if (wrongSound) {
                        wrongSound.currentTime = 0;
                        wrongSound.play().catch(() => {});
                    }
                }
                gameState.flippedCards = [];
                currentTurnFlips = 0; // Reset flip counter after turn
                updateScore();
                syncGameState();
            }, 1000);
        } else {
            syncGameState();
        }
    }
}

function handleRemoteCardFlip(index) {
    const card = document.querySelector(`[data-index="${index}"]`);
    if (card && !card.classList.contains('flipped') && !card.classList.contains('matched')) {
        card.classList.add('flipped');
        const img = document.createElement('img');
        img.src = card.dataset.symbol;
        img.alt = 'Card Image';
        card.innerHTML = '';
        card.appendChild(img);
        gameState.flippedCards.push(card);
    }
}

function checkMatch() {
    const [card1, card2] = gameState.flippedCards;
    const isMatch = card1.dataset.symbol === card2.dataset.symbol;
    
    if (isMatch) {
        matchSound.currentTime = 0;
        matchSound.play().catch(() => {});
        matchedPairs++;
        
        // Add matched class to keep cards flipped
        card1.classList.add('matched');
        card2.classList.add('matched');
        
        if (gameMode === 'multi') {
            handlePlayerTurn(true);
        }
        
        // Check if game is over for multiplayer
        if (matchedPairs === gameState.cards.length / 2) {
            if (gameMode === 'multi') {
                showMultiplayerVictoryScreen();
            } else {
                showVictoryScreen();
            }
        }
    } else {
        setTimeout(() => {
            if (!card1.classList.contains('matched')) {
                card1.classList.remove('flipped');
                card1.innerHTML = '';
            }
            if (!card2.classList.contains('matched')) {
                card2.classList.remove('flipped');
                card2.innerHTML = '';
            }
        }, 1000);
        
        if (gameMode === 'multi') {
            handlePlayerTurn(false);
        }
    }
    
    gameState.flippedCards = [];
    updateScore();
}

function isMyTurn() {
    if (gameMode !== 'multi') return true;
    return (isHost && currentPlayer === 1) || (!isHost && currentPlayer === 2);
}

function generateRandomId() {
    return Math.random().toString(36).substr(2, 9);
}

// Modify the existing game initialization to work with multiplayer
function initializeMultiplayerGame() {
    document.getElementById('game-menu').style.display = 'none';
    document.getElementById('multiplayer-menu').style.display = 'flex';
    
    // Add back button to multiplayer menu
    const backBtn = document.createElement('button');
    backBtn.className = 'back-btn';
    backBtn.textContent = '← Back';
    document.getElementById('multiplayer-menu').appendChild(backBtn);
    
    backBtn.addEventListener('click', () => {
        // Clean up any existing peer connections
        if (connection) {
            connection.close();
        }
        if (peer) {
            peer.destroy();
        }
        
        // Reset states
        connection = null;
        peer = null;
        isHost = false;
        
        // Return to main menu
        document.getElementById('multiplayer-menu').style.display = 'none';
        document.getElementById('game-menu').style.display = 'flex';
        
        // Remove the back button
        backBtn.remove();
        
        // Reset any displayed room info
        document.getElementById('room-id').style.display = 'none';
        document.getElementById('connection-status').textContent = '';
        document.querySelector('.join-room').style.display = 'block';
        document.getElementById('create-room-btn').style.display = 'block';
        document.getElementById('room-code-input').value = '';
    });
    
    initializeMultiplayer();
}

// Event Listeners
document.getElementById('create-room-btn').addEventListener('click', createRoom);
document.getElementById('join-room-btn').addEventListener('click', () => {
    const roomId = document.getElementById('room-code-input').value;
    joinRoom(roomId);
}); 

function syncGameState() {
    if (!connection) return;
    
    const state = {
        currentPlayer,
        player1Matches,
        player2Matches,
        matchedPairs,
        cards: gameState.cards,
        boardSize: gameState.boardSize,
        matchedCards: Array.from(document.querySelectorAll('.card.matched')).map(card => ({
            index: card.dataset.index,
            symbol: card.dataset.symbol
        })),
        flippedCards: Array.from(document.querySelectorAll('.card.flipped:not(.matched)')).map(card => ({
            index: card.dataset.index,
            symbol: card.dataset.symbol
        }))
    };
    
    connection.send({
        type: 'gameState',
        state: state
    });
}

function createBoard(cards, size) {
    // Clear the board
    gameBoard.innerHTML = '';
    gameBoard.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    
    // Create cards
    cards.forEach((symbol, index) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.symbol = symbol;
        card.dataset.index = index;
        card.addEventListener('click', () => handleCardClick(index));
        gameBoard.appendChild(card);
    });
    
    // Reset game state
    gameState.flippedCards = [];
    matchedPairs = 0;
    currentPlayer = 1;  // Always start with player 1
    player1Matches = 0;
    player2Matches = 0;
    currentTurnFlips = 0; // Reset flip counter
    gameState.cards = cards;
    updateScore();
    updateTurnIndicator();
}

function updateTurnIndicator() {
    // Remove previous indicator if it exists
    const oldIndicator = document.querySelector('.turn-indicator');
    if (oldIndicator) oldIndicator.remove();
    
    // Create new turn indicator
    const indicator = document.createElement('div');
    indicator.className = 'turn-indicator';
    
    // Set message based on whose turn it is
    if ((isHost && currentPlayer === 1) || (!isHost && currentPlayer === 2)) {
        indicator.textContent = 'Your Turn';
        indicator.classList.add('your-turn');
    } else {
        indicator.textContent = 'Waiting for other player...';
    }
    
    // Insert indicator at the top of the game board
    gameBoard.parentNode.insertBefore(indicator, gameBoard);
}

function updateScore() {
    if (gameMode === 'single') {
        scoreElement.textContent = `Flips: ${Math.floor(flips/2)}`;
    } else {
        const myScore = isHost ? player1Matches : player2Matches;
        const opponentScore = isHost ? player2Matches : player1Matches;
        scoreElement.textContent = `You: ${myScore} | Opponent: ${opponentScore}`;
    }
}

function showMultiplayerVictoryScreen() {
    const overlay = document.querySelector('.victory-overlay');
    const messageDiv = document.querySelector('.victory-message');
    const statsDiv = document.querySelector('.victory-stats');
    const playAgainBtn = document.querySelector('.play-again-btn');
    
    let victoryMessage;
    if (player1Matches > player2Matches) {
        victoryMessage = isHost ? 'You Won!' : 'You Lost!';
    } else if (player2Matches > player1Matches) {
        victoryMessage = isHost ? 'You Lost!' : 'You Won!';
    } else {
        victoryMessage = "It's a Tie!";
    }
    
    messageDiv.textContent = victoryMessage;
    
    // Update final score display to use You/Opponent format
    const myFinalScore = isHost ? player1Matches : player2Matches;
    const opponentFinalScore = isHost ? player2Matches : player1Matches;
    statsDiv.textContent = `Final Score - You: ${myFinalScore} | Opponent: ${opponentFinalScore}`;
    
    overlay.classList.add('show');
    
    // Only show confetti for the winner
    if ((player1Matches > player2Matches && isHost) || 
        (player2Matches > player1Matches && !isHost)) {
        createConfetti();
    }
    
    // Reset play again state
    localPlayerReady = false;
    remotePlayerReady = false;
    playAgainBtn.textContent = 'Play Again';
    
    // Remove any existing event listeners
    const newPlayAgainBtn = playAgainBtn.cloneNode(true);
    playAgainBtn.parentNode.replaceChild(newPlayAgainBtn, playAgainBtn);
    
    newPlayAgainBtn.addEventListener('click', () => {
        if (!localPlayerReady) {
            localPlayerReady = true;
            newPlayAgainBtn.textContent = 'Waiting for other player...';
            
            // Send ready state to other player
            connection.send({
                type: 'playAgainReady'
            });
        }
    });
}

function handlePlayerTurn(isMatch) {
    if (gameMode !== 'multi') return;
    
    if (isMatch) {
        // Add point to current player
        if (currentPlayer === 1) {
            player1Matches++;
        } else {
            player2Matches++;
        }
        // Player keeps their turn on match
    } else {
        // Switch players only on wrong match
        currentPlayer = currentPlayer === 1 ? 2 : 1;
    }
    
    // Reset flip counter when turn changes
    currentTurnFlips = 0;
    
    // Only update indicators if game isn't over
    const totalPairs = gameState.cards.length / 2;
    if (matchedPairs < totalPairs) {
        updateTurnIndicator();
        updateScore();
    }
}

// Add this new function to handle new game creation
function startNewMultiplayerGame() {
    // Hide victory screen
    document.querySelector('.victory-overlay').classList.remove('show');
    
    // Reset ready states
    localPlayerReady = false;
    remotePlayerReady = false;
    
    // Start new game if you're the host
    if (isHost) {
        const boardData = initializeGame();
        gameState.cards = boardData.cards;
        gameState.boardSize = boardData.size;
        syncGameState();
    }
}

// Add this helper function to reset all states
function resetAllGameStates() {
    // Reset connection states
    connection = null;
    peer = null;
    isHost = false;

    // Reset game state object
    gameState = {
        cards: [],
        flippedCards: [],
        currentPlayer: 1,
        player1Matches: 0,
        player2Matches: 0,
        boardSize: 0
    };

    // Reset all game variables
    matchedPairs = 0;
    currentTurnFlips = 0;
    localPlayerReady = false;
    remotePlayerReady = false;
    player1Matches = 0;
    player2Matches = 0;
    currentPlayer = 1;
    gameMode = null; // Reset game mode

    // Reset UI
    gameBoard.innerHTML = '';
    document.getElementById('room-id').style.display = 'none';
    document.getElementById('connection-status').textContent = '';
    document.querySelector('.join-room').style.display = 'block';
    document.getElementById('create-room-btn').style.display = 'block';
    document.getElementById('room-code-input').value = '';
    document.querySelector('.victory-overlay')?.classList.remove('show');
    document.querySelector('.exit-btn')?.remove();
    
    // Remove turn indicator
    const turnIndicator = document.querySelector('.turn-indicator');
    if (turnIndicator) {
        turnIndicator.remove();
    }
    
    // Show difficulty selector
    const difficultySelector = document.getElementById('difficulty-selector');
    if (difficultySelector) {
        difficultySelector.style.display = 'block';
    }
    
    // Clean up multiplayer menu
    const difficultySelection = document.querySelector('.difficulty-selection');
    if (difficultySelection) {
        difficultySelection.remove();
    }
    
    // Reset any overlays
    const disconnectOverlay = document.querySelector('.disconnect-overlay');
    if (disconnectOverlay) {
        disconnectOverlay.remove();
    }
    
    // Reset multiplayer menu to initial state
    const multiplayerMenu = document.getElementById('multiplayer-menu');
    if (multiplayerMenu) {
        multiplayerMenu.style.display = 'none';
        document.querySelector('.join-room').style.display = 'block';
        document.getElementById('create-room-btn').style.display = 'block';
    }
} 