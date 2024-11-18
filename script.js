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
let highScores = {};

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
        if (matchedPairs === cards.length / 2) {
            setTimeout(async () => {
                const isNewHighScore = await checkHighScore(flips, difficultySelect.value);
                if (isNewHighScore) {
                    alert(`New High Score! You won in ${Math.floor(flips/2)} attempts!`);
                } else {
                    alert(`Congratulations! You won in ${Math.floor(flips/2)} attempts!`);
                }
            }, 500);
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

// Load high scores from file
async function loadHighScores() {
    try {
        const response = await fetch('highscores.json');
        highScores = await response.json();
        updateHighScoreDisplay();
    } catch (err) {
        console.error('Error loading high scores:', err);
        // Fallback to default values if file can't be read
        highScores = {
            easy: 999999,
            medium: 999999,
            hard: 999999
        };
    }
}

// Save high scores to file
async function saveHighScores() {
    try {
        const response = await fetch('highscores.json', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(highScores)
        });
        if (!response.ok) {
            throw new Error('Failed to save high score');
        }
    } catch (err) {
        console.error('Error saving high score:', err);
    }
}

// Update the high score display
function updateHighScoreDisplay() {
    const difficulty = difficultySelect.value;
    const highScore = highScores[difficulty];
    document.getElementById('highscore').textContent = 
        `High Score: ${highScore === 999999 ? '--' : Math.floor(highScore/2)} attempts`;
}

// Check and update high score
async function checkHighScore(score, difficulty) {
    if (score < (highScores[difficulty] || 999999)) {
        highScores[difficulty] = score;
        await saveHighScores();
        updateHighScoreDisplay();
        return true;
    }
    return false;
}

// Add event listeners
difficultySelect.addEventListener('change', updateHighScoreDisplay);
window.addEventListener('load', loadHighScores); 