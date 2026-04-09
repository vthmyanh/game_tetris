// --- Constants & Config ---
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;

// Colors mapping matching the standard guideline
const COLORS = [
    null,
    '#00ffff', // 1: I (Cyan)
    '#0000ff', // 2: J (Blue)
    '#ffa500', // 3: L (Orange)
    '#ffff00', // 4: O (Yellow)
    '#00ff00', // 5: S (Green)
    '#800080', // 6: T (Purple)
    '#ff0000'  // 7: Z (Red)
];

const TETROMINOES = {
    I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    J: [[2, 0, 0], [2, 2, 2], [0, 0, 0]],
    L: [[0, 0, 3], [3, 3, 3], [0, 0, 0]],
    O: [[4, 4], [4, 4]],
    S: [[0, 5, 5], [5, 5, 0], [0, 0, 0]],
    T: [[0, 6, 0], [6, 6, 6], [0, 0, 0]],
    Z: [[7, 7, 0], [0, 7, 7], [0, 0, 0]]
};

const TETROMINO_KEYS = Object.keys(TETROMINOES);

// --- Game Variables ---
let board = [];
let piece = null;
let nextPiece = null;
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let animationId = null;

let score = 0;
let level = 1;
let lines = 0;

let isGameOver = false;
let isPaused = false;
let isGameStarted = false;

// --- DOM Elements ---
const canvas = document.getElementById('tetris');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-tetromino');
const nextCtx = nextCanvas.getContext('2d');

const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const linesElement = document.getElementById('lines');

const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const restartBtn = document.getElementById('restart-btn');
const playAgainBtn = document.getElementById('play-again-btn');
const resumePopupBtn = document.getElementById('resume-popup-btn');

const gameOverScreen = document.getElementById('game-over-screen');
const pauseScreen = document.getElementById('pause-screen');

// Login Elements
const loginScreen = document.getElementById('login-screen');
const mainGame = document.getElementById('main-game');
const nicknameInput = document.getElementById('nickname');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');
const playerNameEl = document.getElementById('player-name');

// Settings Elements
const bgColorPicker = document.getElementById('bg-color-picker');

// Initial Setup Mode
const savedBg = localStorage.getItem('tetrisBg') || 'black';
bgColorPicker.value = savedBg;
document.body.className = `bg-${savedBg}`;

ctx.scale(BLOCK_SIZE, BLOCK_SIZE);
const NEXT_PREVIEW_SCALE = 20;

// --- Event Listeners for Login & Settings ---
loginBtn.addEventListener('click', () => {
    const nick = nicknameInput.value.trim();
    const pass = passwordInput.value.trim();
    if (!nick || !pass) {
        loginError.classList.remove('hidden');
    } else {
        loginError.classList.add('hidden');
        playerNameEl.innerText = nick;
        loginScreen.classList.add('hidden');
        mainGame.classList.remove('hidden');
    }
});

bgColorPicker.addEventListener('change', (e) => {
    const selected = e.target.value;
    document.body.className = `bg-${selected}`;
    localStorage.setItem('tetrisBg', selected);
});


// --- Helper Functions ---
function randomPiece() {
    const key = TETROMINO_KEYS[Math.floor(Math.random() * TETROMINO_KEYS.length)];
    const matrix = TETROMINOES[key];
    return {
        matrix: matrix,
        pos: { x: Math.floor(COLS / 2) - Math.floor(matrix[0].length / 2), y: 0 }
    };
}

function drawMatrix(matrix, offset, context) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                context.fillStyle = COLORS[value];
                context.fillRect(x + offset.x, y + offset.y, 1, 1);
                
                context.fillStyle = 'rgba(255, 255, 255, 0.3)';
                context.fillRect(x + offset.x, y + offset.y, 1, 0.1); 
                context.fillRect(x + offset.x, y + offset.y, 0.1, 1); 
                
                context.fillStyle = 'rgba(0, 0, 0, 0.3)';
                context.fillRect(x + offset.x, y + offset.y + 0.9, 1, 0.1); 
                context.fillRect(x + offset.x + 0.9, y + offset.y, 0.1, 1); 
            }
        });
    });
}

function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(BLOCK_SIZE, BLOCK_SIZE);

    drawMatrix(board, { x: 0, y: 0 }, ctx);
    if (piece) {
        drawGhostPiece();
        drawMatrix(piece.matrix, piece.pos, ctx);
    }
}

function drawGhostPiece() {
    let ghost = {
        matrix: piece.matrix,
        pos: { x: piece.pos.x, y: piece.pos.y }
    };
    
    while (!collide(board, ghost)) {
        ghost.pos.y++;
    }
    ghost.pos.y--; 
    
    ghost.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.fillRect(x + ghost.pos.x, y + ghost.pos.y, 1, 1);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 0.05;
                ctx.strokeRect(x + ghost.pos.x, y + ghost.pos.y, 1, 1);
            }
        });
    });
}

function drawNextPiece() {
    nextCtx.setTransform(1, 0, 0, 1, 0, 0);
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    if (nextPiece) {
        let offsetX = (nextCanvas.width / NEXT_PREVIEW_SCALE - nextPiece.matrix[0].length) / 2;
        let offsetY = (nextCanvas.height / NEXT_PREVIEW_SCALE - nextPiece.matrix.length) / 2;
        
        nextCtx.scale(NEXT_PREVIEW_SCALE, NEXT_PREVIEW_SCALE);
        drawMatrix(nextPiece.matrix, { x: offsetX, y: offsetY }, nextCtx);
    }
}

function merge(board, piece) {
    piece.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                board[y + piece.pos.y][x + piece.pos.x] = value;
            }
        });
    });
}

function createMatrix(w, h) {
    const matrix = [];
    while (h--) {
        matrix.push(new Array(w).fill(0));
    }
    return matrix;
}

function collide(board, piece) {
    const m = piece.matrix;
    const o = piece.pos;
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 &&
               (board[y + o.y] && board[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
        }
    }
    if (dir > 0) {
        matrix.forEach(row => row.reverse());
    } else {
        matrix.reverse();
    }
}

function playerRotate(dir) {
    const pos = piece.pos.x;
    let offset = 1;
    rotate(piece.matrix, dir);
    while (collide(board, piece)) {
        piece.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > piece.matrix[0].length) {
            rotate(piece.matrix, -dir);
            piece.pos.x = pos;
            return;
        }
    }
}

function playerMove(offset) {
    piece.pos.x += offset;
    if (collide(board, piece)) {
        piece.pos.x -= offset;
    }
}

function playerDrop() {
    piece.pos.y++;
    if (collide(board, piece)) {
        piece.pos.y--;
        merge(board, piece);
        resetPiece();
        clearLines();
    }
    dropCounter = 0;
}

function playerHardDrop() {
    while (!collide(board, piece)) {
        piece.pos.y++;
    }
    piece.pos.y--;
    merge(board, piece);
    resetPiece();
    clearLines();
    dropCounter = 0;
}

function clearLines() {
    let linesCleared = 0;
    outer: for (let y = board.length - 1; y >= 0; --y) {
        for (let x = 0; x < board[y].length; ++x) {
            if (board[y][x] === 0) {
                continue outer;
            }
        }
        const row = board.splice(y, 1)[0].fill(0);
        board.unshift(row);
        ++y;
        linesCleared++;
    }

    if (linesCleared > 0) {
        const points = [0, 40, 100, 300, 1200];
        score += points[linesCleared] * level;
        lines += linesCleared;
        
        // Thêm cơ chế level mới: Mỗi 1000 điểm tăng 1 level
        level = Math.floor(score / 1000) + 1;
        dropInterval = Math.max(100, 1000 - (level - 1) * 100);
        
        updateScore();
    }
}

function updateScore() {
    scoreElement.innerText = score;
    levelElement.innerText = level;
    linesElement.innerText = lines;
}

function resetPiece() {
    piece = nextPiece;
    nextPiece = randomPiece();
    drawNextPiece();
    
    if (piece && collide(board, piece)) {
        gameOver();
    }
}

function gameOver() {
    isGameOver = true;
    cancelAnimationFrame(animationId);
    gameOverScreen.classList.remove('hidden');
    pauseBtn.disabled = true;
}

function update(time = 0) {
    if (isPaused || isGameOver) return;
    
    const deltaTime = time - lastTime;
    lastTime = time;
    
    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        playerDrop();
    }
    
    draw();
    animationId = requestAnimationFrame(update);
}

// --- Game Controls ---
function startGame() {
    if (isGameStarted) return;
    
    board = createMatrix(COLS, ROWS);
    score = 0;
    level = 1;
    lines = 0;
    dropInterval = 1000;
    updateScore();
    
    isGameOver = false;
    isPaused = false;
    isGameStarted = true;
    gameOverScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    restartBtn.disabled = false;
    pauseBtn.innerText = 'Tạm dừng';
    
    nextPiece = randomPiece();
    resetPiece();
    drawNextPiece();
    
    lastTime = performance.now();
    update();
}

function pauseGame() {
    if (!isGameStarted || isGameOver) return;
    
    isPaused = !isPaused;
    if (isPaused) {
        cancelAnimationFrame(animationId);
        pauseScreen.classList.remove('hidden');
        pauseBtn.innerText = 'Tiếp tục';
    } else {
        pauseScreen.classList.add('hidden');
        pauseBtn.innerText = 'Tạm dừng';
        lastTime = performance.now();
        update();
    }
}

function restartGame() {
    cancelAnimationFrame(animationId);
    isGameStarted = false;
    startGame();
}

// --- Event Listeners ---
document.addEventListener('keydown', event => {
    // Only capture keyboard events if game is active to not interfere with login typing
    if (mainGame.classList.contains('hidden')) return;

    if (isGameOver || isPaused || !isGameStarted) return;
    
    switch(event.keyCode) {
        case 37: // Left
            playerMove(-1);
            event.preventDefault();
            break;
        case 39: // Right
            playerMove(1);
            event.preventDefault();
            break;
        case 40: // Down
            playerDrop();
            event.preventDefault();
            break;
        case 38: // Up
            playerRotate(1);
            event.preventDefault();
            break;
        case 32: // Space
            playerHardDrop();
            event.preventDefault();
            break;
    }
    draw();
});

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', restartGame);
playAgainBtn.addEventListener('click', restartGame);

pauseBtn.addEventListener('click', pauseGame);
resumePopupBtn.addEventListener('click', pauseGame);

board = createMatrix(COLS, ROWS);
draw();
