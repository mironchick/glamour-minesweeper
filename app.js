"use strict";
// =========================================
// Glamour Minesweeper 🍓 - Логика (TypeScript)
// =========================================
// Режимы игры
const MODES = {
    basic: { rows: 16, cols: 16, mines: 40, name: 'Базовый гламур' },
    luxury: { rows: 16, cols: 30, mines: 99, name: 'Люксовый гламур' }
};
let currentMode = 'basic';
let ROWS = MODES[currentMode].rows;
let COLS = MODES[currentMode].cols;
let MINES_COUNT = MODES[currentMode].mines;
let autoOpenMode = loadAutoOpenSetting();
let currentTheme = loadThemeSetting();
// Состояние игры
let board = [];
let gameOver = false;
let firstClick = true;
let flagsPlaced = 0;
let timer = 0;
let timerInterval = null;
// DOM элементы
const gridElement = document.getElementById('grid');
const mineCounterElement = document.getElementById('mine-counter');
const timerElement = document.getElementById('timer');
const resetBtn = document.getElementById('reset-btn');
const resetIcon = resetBtn.querySelector('.reset-icon');
const diffButtons = document.querySelectorAll('.diff-btn');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const modalClose = document.getElementById('modal-close');
const autoOpenRadios = document.querySelectorAll('input[name="auto-open"]');
const themeRadios = document.querySelectorAll('input[name="theme"]');
const recordDisplay = document.getElementById('record-display');
const recordTime = document.getElementById('record-time');
// Canvas для конфетти
const confettiCanvas = document.getElementById('confetti-canvas');
const confettiCtx = confettiCanvas.getContext('2d');
let confettiAnimationId = null;
let confettiPieces = [];
const CONFETTI_COLORS = ['#ff69b4', '#ffb6c1', '#ff1493', '#ffc0cb', '#ffe4ec', '#fff'];
// =========================================
// localStorage функции
// =========================================
function loadAutoOpenSetting() {
    const saved = localStorage.getItem('glamour-minesweeper-auto-open');
    return saved || 'double';
}
function saveAutoOpenSetting(mode) {
    localStorage.setItem('glamour-minesweeper-auto-open', mode);
}
function loadThemeSetting() {
    const saved = localStorage.getItem('glamour-minesweeper-theme');
    return saved || 'light';
}
function saveThemeSetting(theme) {
    localStorage.setItem('glamour-minesweeper-theme', theme);
}
function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
    }
    else {
        document.body.classList.remove('dark-theme');
    }
}
function getRecordKey() {
    return `glamour-minesweeper-record-${currentMode}`;
}
function loadRecord() {
    const saved = localStorage.getItem(getRecordKey());
    return saved ? parseInt(saved, 10) : null;
}
function saveRecord(time) {
    localStorage.setItem(getRecordKey(), time.toString());
}
function updateRecordDisplay() {
    const record = loadRecord();
    if (record !== null) {
        recordTime.textContent = formatTime(record);
    }
    else {
        recordTime.textContent = '---';
    }
}
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
function checkAndUpdateRecord() {
    const currentRecord = loadRecord();
    if (currentRecord === null || timer < currentRecord) {
        saveRecord(timer);
        updateRecordDisplay();
    }
}
// =========================================
// Инициализация игры
// =========================================
function initGame() {
    board = [];
    gameOver = false;
    firstClick = true;
    flagsPlaced = 0;
    timer = 0;
    if (timerInterval)
        clearInterval(timerInterval);
    timerInterval = null;
    stopConfetti();
    document.getElementById('win-overlay')?.classList.remove('show');
    document.getElementById('lose-overlay')?.classList.remove('show');
    gridElement.style.gridTemplateColumns = `repeat(${COLS}, 32px)`;
    gridElement.style.gridTemplateRows = `repeat(${ROWS}, 32px)`;
    gridElement.innerHTML = '';
    mineCounterElement.textContent = formatNumber(MINES_COUNT);
    timerElement.textContent = '000';
    resetIcon.textContent = '🙂';
    document.querySelector('.game-container')?.classList.remove('game-over', 'game-won');
    updateRecordDisplay();
    applyTheme(currentTheme);
    for (let r = 0; r < ROWS; r++) {
        const row = [];
        for (let c = 0; c < COLS; c++) {
            const cell = {
                row: r,
                col: c,
                isMine: false,
                isRevealed: false,
                isFlagged: false,
                neighborMines: 0,
                element: document.createElement('div')
            };
            cell.element.classList.add('cell');
            cell.element.dataset.row = r.toString();
            cell.element.dataset.col = c.toString();
            cell.element.addEventListener('click', () => handleLeftClick(cell));
            cell.element.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                handleRightClick(cell);
            });
            if (autoOpenMode === 'double') {
                cell.element.addEventListener('dblclick', () => handleDoubleClick(cell));
            }
            cell.element.addEventListener('mousedown', () => {
                if (!gameOver && !cell.isRevealed && !cell.isFlagged) {
                    resetIcon.textContent = '😮';
                }
            });
            cell.element.addEventListener('mouseup', () => {
                if (!gameOver)
                    resetIcon.textContent = '🙂';
            });
            gridElement.appendChild(cell.element);
            row.push(cell);
        }
        board.push(row);
    }
}
// =========================================
// Логика игры
// =========================================
function placeMines(safeRow, safeCol) {
    let minesPlaced = 0;
    while (minesPlaced < MINES_COUNT) {
        const r = Math.floor(Math.random() * ROWS);
        const c = Math.floor(Math.random() * COLS);
        if (!board[r][c].isMine && (Math.abs(r - safeRow) > 1 || Math.abs(c - safeCol) > 1)) {
            board[r][c].isMine = true;
            minesPlaced++;
        }
    }
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (!board[r][c].isMine) {
                board[r][c].neighborMines = countNeighborMines(r, c);
            }
        }
    }
}
function countNeighborMines(r, c) {
    let count = 0;
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            const nr = r + i;
            const nc = c + j;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc].isMine) {
                count++;
            }
        }
    }
    return count;
}
function handleLeftClick(cell) {
    // В режиме одинарного клика разрешаем клики по открытым клеткам с цифрами
    if (autoOpenMode === 'single' && cell.isRevealed && cell.neighborMines > 0) {
        autoOpenNeighbors(cell);
        return;
    }
    if (gameOver || cell.isRevealed || cell.isFlagged)
        return;
    if (firstClick) {
        firstClick = false;
        placeMines(cell.row, cell.col);
        startTimer();
    }
    if (cell.isMine) {
        triggerGameOver(false);
        return;
    }
    revealCell(cell);
    checkWin();
}
function revealCell(cell) {
    if (cell.isRevealed || cell.isFlagged)
        return;
    cell.isRevealed = true;
    cell.element.classList.add('revealed');
    if (cell.neighborMines > 0) {
        cell.element.textContent = cell.neighborMines.toString();
        cell.element.dataset.number = cell.neighborMines.toString();
    }
    else {
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                const nr = cell.row + i;
                const nc = cell.col + j;
                if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
                    revealCell(board[nr][nc]);
                }
            }
        }
    }
}
function handleRightClick(cell) {
    if (gameOver || cell.isRevealed)
        return;
    cell.isFlagged = !cell.isFlagged;
    cell.element.classList.toggle('flagged', cell.isFlagged);
    flagsPlaced += cell.isFlagged ? 1 : -1;
    mineCounterElement.textContent = formatNumber(MINES_COUNT - flagsPlaced);
}
function handleDoubleClick(cell) {
    if (gameOver || !cell.isRevealed || cell.neighborMines === 0)
        return;
    autoOpenNeighbors(cell);
}
function autoOpenNeighbors(cell) {
    if (!cell.isRevealed || cell.neighborMines === 0)
        return;
    let flagCount = 0;
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            const nr = cell.row + i;
            const nc = cell.col + j;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc].isFlagged) {
                flagCount++;
            }
        }
    }
    if (flagCount === cell.neighborMines) {
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                const nr = cell.row + i;
                const nc = cell.col + j;
                if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
                    const neighbor = board[nr][nc];
                    if (!neighbor.isRevealed && !neighbor.isFlagged) {
                        if (neighbor.isMine) {
                            triggerGameOver(false);
                            return;
                        }
                        revealCell(neighbor);
                    }
                }
            }
        }
        checkWin();
    }
}
function startTimer() {
    if (timerInterval)
        return;
    timerInterval = window.setInterval(() => {
        timer++;
        if (timer > 999)
            timer = 999;
        timerElement.textContent = formatNumber(timer);
    }, 1000);
}
function formatNumber(num) {
    return num.toString().padStart(3, '0');
}
// =========================================
// Конфетти и оверлеи
// =========================================
function setupConfettiCanvas() {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
}
function createConfetti() {
    confettiPieces = [];
    for (let i = 0; i < 150; i++) {
        confettiPieces.push({
            x: Math.random() * confettiCanvas.width,
            y: Math.random() * confettiCanvas.height - confettiCanvas.height,
            width: Math.random() * 10 + 5,
            height: Math.random() * 6 + 3,
            color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
            speedY: Math.random() * 3 + 2,
            speedX: Math.random() * 2 - 1,
            rotation: Math.random() * 360,
            rotationSpeed: Math.random() * 10 - 5
        });
    }
}
function animateConfetti() {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    confettiPieces.forEach(piece => {
        confettiCtx.save();
        confettiCtx.translate(piece.x, piece.y);
        confettiCtx.rotate((piece.rotation * Math.PI) / 180);
        confettiCtx.fillStyle = piece.color;
        confettiCtx.fillRect(-piece.width / 2, -piece.height / 2, piece.width, piece.height);
        confettiCtx.restore();
        piece.y += piece.speedY;
        piece.x += piece.speedX;
        piece.rotation += piece.rotationSpeed;
        if (piece.y > confettiCanvas.height) {
            piece.y = -10;
            piece.x = Math.random() * confettiCanvas.width;
        }
    });
    confettiAnimationId = requestAnimationFrame(animateConfetti);
}
function startConfetti() {
    setupConfettiCanvas();
    createConfetti();
    animateConfetti();
}
function stopConfetti() {
    if (confettiAnimationId) {
        cancelAnimationFrame(confettiAnimationId);
        confettiAnimationId = null;
    }
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    confettiPieces = [];
}
function showOverlay(type) {
    const overlay = document.getElementById(`${type}-overlay`);
    overlay.classList.add('show');
    if (type === 'win') {
        startConfetti();
    }
    setTimeout(() => {
        overlay.classList.remove('show');
        if (type === 'win') {
            setTimeout(stopConfetti, 150);
        }
    }, 2000);
}
// =========================================
// Конец игры
// =========================================
function triggerGameOver(isWin) {
    gameOver = true;
    if (timerInterval)
        clearInterval(timerInterval);
    const container = document.querySelector('.game-container');
    if (isWin) {
        resetIcon.textContent = '😎';
        container?.classList.add('game-won');
        board.flat().forEach(cell => {
            if (cell.isMine && !cell.isFlagged) {
                cell.element.classList.add('flagged');
            }
        });
        checkAndUpdateRecord();
        showOverlay('win');
    }
    else {
        resetIcon.textContent = '😵';
        container?.classList.add('game-over');
        board.flat().forEach(cell => {
            if (cell.isMine) {
                cell.element.classList.add('revealed', 'mine');
            }
            else if (cell.isFlagged) {
                cell.element.style.color = 'red';
            }
        });
        showOverlay('lose');
    }
}
function checkWin() {
    let revealedCount = 0;
    board.flat().forEach(cell => {
        if (cell.isRevealed)
            revealedCount++;
    });
    if (revealedCount === (ROWS * COLS) - MINES_COUNT) {
        triggerGameOver(true);
    }
}
// =========================================
// Обработчики событий
// =========================================
// Переключение сложности
diffButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        if (mode === currentMode)
            return;
        diffButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMode = mode;
        ROWS = MODES[mode].rows;
        COLS = MODES[mode].cols;
        MINES_COUNT = MODES[mode].mines;
        initGame();
    });
});
// Настройки
settingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('show');
    const currentRadio = document.querySelector(`input[name="auto-open"][value="${autoOpenMode}"]`);
    if (currentRadio)
        currentRadio.checked = true;
    const currentThemeRadio = document.querySelector(`input[name="theme"][value="${currentTheme}"]`);
    if (currentThemeRadio)
        currentThemeRadio.checked = true;
});
modalClose.addEventListener('click', () => {
    settingsModal.classList.remove('show');
});
settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
        settingsModal.classList.remove('show');
    }
});
autoOpenRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        const target = e.target;
        autoOpenMode = target.value;
        saveAutoOpenSetting(autoOpenMode);
        initGame();
    });
});
themeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        const target = e.target;
        currentTheme = target.value;
        saveThemeSetting(currentTheme);
        applyTheme(currentTheme);
    });
});
// Кнопка рестарта
resetBtn.addEventListener('click', initGame);
// Обработчик ресайза для canvas
window.addEventListener('resize', () => {
    if (confettiAnimationId) {
        setupConfettiCanvas();
    }
});
// Запуск при загрузке
initGame();
