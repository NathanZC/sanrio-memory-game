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

function initializeGame() {
    const difficulty = difficultySelect.value;
    const { size, symbols } = difficulties[difficulty];

    gameBoard.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    gameBoard.innerHTML = '';

    cards = [...symbols, ...symbols].slice(0, size * size);
    cards.sort(() => Math.random() - 0.5);

    flippedCards = [];
    matchedPairs = 0;
    flips = 0;
    updateScore();

    cards.forEach((symbol, index) => {
        const card = document.createElement('div');
        card.classList.add('card');
        card.dataset.symbol = symbol;
        card.dataset.index = index;
        card.addEventListener('click', flipCard);
        gameBoard.appendChild(card);
    });

    // Adjust card size based on difficulty
    const cardSize = 320 / size;
    document.querySelectorAll('.card').forEach(card => {
        card.style.width = `${cardSize}px`;
        card.style.height = `${cardSize}px`;
        card.style.fontSize = `${cardSize * 0.5}px`;
    });
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
            setTimeout(checkMatch, 1000);
        }
    }
}

function checkMatch() {
    const [card1, card2] = flippedCards;
    if (card1.dataset.symbol === card2.dataset.symbol) {
        matchSound.currentTime = 0;
        matchSound.play().catch(() => {});
        matchedPairs++;
        if (matchedPairs === cards.length / 2 && !isGameWon) {
            isGameWon = true;
            showVictoryScreen(flips);
        }
    } else {
        wrongSound.currentTime = 0;
        wrongSound.play().catch(err => console.log('Audio play failed:', err));
        
        card1.classList.remove('flipped');
        card2.classList.remove('flipped');
        card1.innerHTML = '';
        card2.innerHTML = '';
    }
    flippedCards = [];
}

function updateScore() {
    scoreElement.textContent = `Attempts: ${Math.floor(flips/2)}`;
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
window.addEventListener('load', loadHighScores); 

function showVictoryScreen(flips) {
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