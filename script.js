const gameBoard = document.getElementById('game-board');
const scoreElement = document.getElementById('score');
const difficultySelect = document.getElementById('difficulty');
const newGameButton = document.getElementById('new-game');
const matchSound = document.getElementById('matchSound') || { play: () => {}, currentTime: 0, volume: 1 };
matchSound.volume = 0.3;
const wrongSound = document.getElementById('wrongSound');

const difficulties = {
    easy: { 
        size: 4, 
        symbols: [
            'images/card1.png',
            'images/card2.png',
            'images/card3.png',
            'images/card4.png',
            'images/card5.png',
            'images/card6.png',
            'images/card7.png',
            'images/card8.png'
        ]
    },
    medium: { 
        size: 6, 
        symbols: [
            'images/card1.png',
            'images/card2.png',
            'images/card3.png',
            'images/card4.png',
            'images/card5.png',
            'images/card6.png',
            'images/card7.png',
            'images/card8.png',
            'images/card9.png',
            'images/card10.png',
            'images/card11.png',
            'images/card12.png',
            'images/card13.png',
            'images/card14.png',
            'images/card15.png',
            'images/card16.png',
            'images/card17.png',
            'images/card18.png'
        ]
    },
    hard: { 
        size: 8, 
        symbols: [
            'images/card1.png',
            'images/card2.png',
            'images/card3.png',
            'images/card4.png',
            'images/card5.png',
            'images/card6.png',
            'images/card7.png',
            'images/card8.png',
            'images/card9.png',
            'images/card10.png',
            'images/card11.png',
            'images/card12.png',
            'images/card13.png',
            'images/card14.png',
            'images/card15.png',
            'images/card16.png',
            'images/card17.png',
            'images/card18.png',
            'images/card19.png',
            'images/card20.png',
            'images/card21.png',
            'images/card22.png',
            'images/card23.png',
            'images/card24.png',
            'images/card25.png',
            'images/card26.png',
            'images/card27.png',
            'images/card28.png',
            'images/card29.png',
            'images/card30.png',
            'images/card31.png',
            'images/card32.png'
        ]
    }
};

let cards, flippedCards, matchedPairs, flips;
let highScores = JSON.parse(localStorage.getItem('memoryGameHighScores')) || {
    easy: 999999,
    medium: 999999,
    hard: 999999
};
let isGameWon = false;
let gameMode = null; // 'single' or 'multi'
const gameMenu = document.getElementById('game-menu');
const gameContainer = document.getElementById('game-container');
const singleplayerBtn = document.getElementById('singleplayer-btn');
const multiplayerBtn = document.getElementById('multiplayer-btn');
let currentPlayer = 1;
let player1Matches = 0;
let player2Matches = 0;

// Hide game container initially
gameContainer.style.display = 'none';

// Menu button event listeners
singleplayerBtn.addEventListener('click', () => {
    gameMode = 'single';
    // Show high score when entering single player mode
    document.getElementById('highscore').style.display = 'block';
    startGame();
});

multiplayerBtn.addEventListener('click', () => {
    gameMode = 'multi';
    document.getElementById('highscore').style.display = 'none';
    initializeMultiplayerGame();
});

function startGame() {
    // Hide menu and show game
    gameMenu.style.display = 'none';
    gameContainer.style.display = 'flex';
    
    // Add exit button
    const exitBtn = document.createElement('button');
    exitBtn.className = 'exit-btn';
    exitBtn.textContent = 'Exit Game';
    gameContainer.prepend(exitBtn);
    
    exitBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to exit?')) {
            // Return to main menu
            gameContainer.style.display = 'none';
            gameMenu.style.display = 'flex';
            
            // Reset game state
            flippedCards = [];
            matchedPairs = 0;
            flips = 0;
            isGameWon = false;
            
            // Remove exit button
            exitBtn.remove();
            
            // Hide victory screen if it's showing
            document.querySelector('.victory-overlay').classList.remove('show');
        }
    });
    
    // Initialize game with selected mode
    if (gameMode === 'multi') {
        // Initialize multiplayer specific elements
        document.getElementById('score').innerHTML = 'You: 0 | Opponent: 0';
        // Hide high score in multiplayer mode
        document.getElementById('highscore').style.display = 'none';
    } else {
        // Show high score in single player mode
        document.getElementById('highscore').style.display = 'block';
        updateHighScoreDisplay();
    }
    
    initializeGame();
}

function initializeGame() {
    const difficulty = difficulties[difficultySelect.value];
    const size = difficulty.size;
    const symbols = difficulty.symbols;
    const pairs = (size * size) / 2;
    const selectedSymbols = symbols.slice(0, pairs);
    const cardSymbols = [...selectedSymbols, ...selectedSymbols];
    
    // Shuffle the cards
    const shuffledCards = cardSymbols.sort(() => Math.random() - 0.5);
    cards = shuffledCards;
    
    // Clear the board
    gameBoard.innerHTML = '';
    gameBoard.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    
    // Hide/Show high score based on game mode
    const highScoreElement = document.getElementById('highscore');
    if (gameMode === 'multi') {
        highScoreElement.style.display = 'none';
    } else {
        highScoreElement.style.display = 'block';
        updateHighScoreDisplay();
    }
    
    // Create cards
    shuffledCards.forEach((symbol, index) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.symbol = symbol;
        card.dataset.index = index;
        card.style.aspectRatio = '1';
        
        // Add the appropriate event listener based on game mode
        if (gameMode === 'multi') {
            card.addEventListener('click', () => handleCardClick(index));
        } else {
            card.addEventListener('click', function() {
                flipCard.call(this);
            });
        }
        
        gameBoard.appendChild(card);
    });
    
    // Reset game state
    flippedCards = [];
    matchedPairs = 0;
    flips = 0;
    currentPlayer = 1;
    player1Matches = 0;
    player2Matches = 0;
    updateScore();
    
    // Return the board data for multiplayer sync
    return {
        cards: shuffledCards,
        size: size
    };
}

function handleCardClick() {
    // Check if it's player's turn in multiplayer
    if (gameMode === 'multi') {
        const isMyTurn = (isHost && currentPlayer === 1) || (!isHost && currentPlayer === 2);
        if (!isMyTurn) return;
    }
    
    if (flippedCards.length < 2 && !this.classList.contains('flipped')) {
        this.classList.add('flipped');
        const img = document.createElement('img');
        img.src = this.dataset.symbol;
        img.alt = 'Card Image';
        this.innerHTML = '';
        this.appendChild(img);
        flippedCards.push(this);
        flips++;
        updateScore();

        if (flippedCards.length === 2) {
            setTimeout(checkMatch, 1000);
        }
    }
}

function checkMatch() {
    const [card1, card2] = flippedCards;
    const isMatch = card1.dataset.symbol === card2.dataset.symbol;
    
    if (isMatch) {
        matchSound.currentTime = 0;
        matchSound.play().catch(() => {});
        matchedPairs++;
        
        if (gameMode === 'multi') {
            handlePlayerTurn(true);
            syncGameState();
        }
        
        if (matchedPairs === cards.length / 2 && !isGameWon) {
            isGameWon = true;
            showVictoryScreen();
        }
    } else {
        setTimeout(() => {
            card1.classList.remove('flipped');
            card2.classList.remove('flipped');
        }, 1000);
        
        if (gameMode === 'multi') {
            handlePlayerTurn(false);
            syncGameState();
        }
    }
    
    flippedCards = [];
    updateScore();
}

function updateScore() {
    if (gameMode === 'single') {
        scoreElement.textContent = `Flips: ${Math.floor(flips/2)}`;
    } else {
        scoreElement.textContent = `Player 1: ${player1Matches} | Player 2: ${player2Matches} | Current Turn: Player ${currentPlayer}`;
    }
}

newGameButton.addEventListener('click', initializeGame);
difficultySelect.addEventListener('change', initializeGame);

// Initialize the game when the page loads
initializeGame();

// Update the high score display
function updateHighScoreDisplay() {
    const difficulty = difficultySelect.value;
    const highScore = highScores[difficulty];
    document.getElementById('highscore').textContent = 
        `High Score: ${highScore === 999999 ? '--' : Math.floor(highScore/2)} attempts`;
}

// Save high scores
function saveHighScores() {
    localStorage.setItem('memoryGameHighScores', JSON.stringify(highScores));
}

// Check and update high score
function checkHighScore(score, difficulty) {
    if (score < highScores[difficulty]) {
        highScores[difficulty] = score;
        saveHighScores();
        updateHighScoreDisplay();
        return true;
    }
    return false;
}

// Add event listeners
difficultySelect.addEventListener('change', updateHighScoreDisplay);
window.addEventListener('load', () => {
    loadHighScores();
    // Hide high score if in multiplayer mode
    if (gameMode === 'multi') {
        document.getElementById('highscore').style.display = 'none';
    }
}); 

function showVictoryScreen() {
    const overlay = document.querySelector('.victory-overlay');
    const statsDiv = document.querySelector('.victory-stats');
    const isHighScore = checkHighScore(flips, difficultySelect.value);
    
    statsDiv.textContent = `${isHighScore ? 'New High Score! ' : ''}You completed the game in ${Math.floor(flips/2)} attempts!`;
    
    overlay.classList.add('show');
    createConfetti();
    
    document.querySelector('.play-again-btn').addEventListener('click', () => {
        overlay.classList.remove('show');
        startNewGame();
    });
}

function createConfetti() {
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        
        const spread = 60;
        const leftPosition = 20 + (Math.random() * spread);
        confetti.style.left = leftPosition + 'vw';
        
        confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 80%, 50%)`;
        confetti.style.animationDelay = Math.random() * 2 + 's';
        
        document.body.appendChild(confetti);
        
        confetti.addEventListener('animationend', () => {
            confetti.remove();
        });
    }
}

function startNewGame() {
    isGameWon = false;
    initializeGame();
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
    
    // Update turn indicator
    updateTurnIndicator();
    updateScore();
}

function updateTurnIndicator() {
    // Remove previous indicator if it exists
    const oldIndicator = document.querySelector('.turn-indicator');
    if (oldIndicator) oldIndicator.remove();
    
    // Create new turn indicator
    const indicator = document.createElement('div');
    indicator.className = 'turn-indicator';
    indicator.textContent = `Player ${currentPlayer}'s Turn`;
    
    // Add pulsing effect if it's the local player's turn
    if ((isHost && currentPlayer === 1) || (!isHost && currentPlayer === 2)) {
        indicator.classList.add('your-turn');
    }
    
    // Insert indicator at the top of the game board
    gameBoard.parentNode.insertBefore(indicator, gameBoard);
}

function flipCard() {
    if (flippedCards.length < 2 && !this.classList.contains('flipped')) {
        this.classList.add('flipped');
        const img = document.createElement('img');
        img.src = this.dataset.symbol;
        img.alt = 'Card Image';
        this.innerHTML = '';
        this.appendChild(img);
        flippedCards.push(this);
        flips++;
        updateScore();

        if (flippedCards.length === 2) {
            setTimeout(() => {
                const [card1, card2] = flippedCards;
                const isMatch = card1.dataset.symbol === card2.dataset.symbol;
                
                if (isMatch) {
                    // Play match sound
                    matchSound.currentTime = 0;
                    matchSound.play().catch(() => {});
                    matchedPairs++;
                    
                    if (matchedPairs === cards.length / 2 && !isGameWon) {
                        isGameWon = true;
                        showVictoryScreen();
                    }
                } else {
                    // Play wrong match sound if it exists
                    if (wrongSound) {
                        wrongSound.currentTime = 0;
                        wrongSound.play().catch(() => {});
                    }
                    card1.classList.remove('flipped');
                    card2.classList.remove('flipped');
                    card1.innerHTML = '';
                    card2.innerHTML = '';
                }
                
                flippedCards = [];
                updateScore();
            }, 1000);
        }
    }
}

function loadHighScores() {
    // Load high scores from localStorage
    highScores = JSON.parse(localStorage.getItem('memoryGameHighScores')) || {
        easy: 999999,
        medium: 999999,
        hard: 999999
    };
    
    // Update the display
    updateHighScoreDisplay();
}

function initializeMultiplayerGame() {
    gameMode = 'multi';
    document.getElementById('game-menu').style.display = 'none';
    document.getElementById('multiplayer-menu').style.display = 'flex';
    // Hide high score when entering multiplayer mode
    document.getElementById('highscore').style.display = 'none';
    initializeMultiplayer();
} 