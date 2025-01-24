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
    const roomId = peer.id;
    document.querySelector('#room-id span').textContent = roomId;
    document.getElementById('room-id').style.display = 'block';
    document.getElementById('connection-status').textContent = 'Waiting for player to join...';
}

function joinRoom(roomId) {
    connection = peer.connect(roomId);
    setupConnection();
}

function setupConnection() {
    connection.on('open', () => {
        document.getElementById('multiplayer-menu').style.display = 'none';
        document.getElementById('game-container').style.display = 'flex';
        
        if (isHost) {
            const boardData = initializeGame();
            gameState.cards = boardData.cards;
            gameState.boardSize = boardData.size;
            syncGameState();
        }
    });

    connection.on('data', (data) => {
        if (data.type === 'gameState') {
            if (!isHost && gameState.cards.length === 0) {
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
            
            // Apply currently flipped cards
            data.state.flippedCards?.forEach(cardData => {
                const card = document.querySelector(`[data-index="${cardData.index}"]`);
                if (card && !card.classList.contains('matched')) {
                    card.classList.add('flipped');
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
            
            updateScore();
            updateTurnIndicator();
        } else if (data.type === 'cardFlip') {
            handleRemoteCardFlip(data.cardIndex);
        }
    });
}

function updateGameState(newState) {
    gameState = newState;
    renderGameState();
}

function handleCardClick(index) {
    console.log("my turn", isMyTurn());
    if (!isMyTurn()) return;
    
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
                } else {
                    card1.classList.remove('flipped');
                    card2.classList.remove('flipped');
                    card1.innerHTML = '';
                    card2.innerHTML = '';
                    handlePlayerTurn(false);
                }
                gameState.flippedCards = [];
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
        
        if (matchedPairs === gameState.cards.length / 2 && !isGameWon) {
            isGameWon = true;
            showVictoryScreen();
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
    currentPlayer = 1;
    player1Matches = 0;
    player2Matches = 0;
    updateScore();
} 