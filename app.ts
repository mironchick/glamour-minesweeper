// =========================================
// Glamour Minesweeper 🍓 - Логика (TypeScript)
// =========================================

// Режимы игры
const MODES = {
    basic: { rows: 16, cols: 16, mines: 40, name: 'Базовый гламур' },
    luxury: { rows: 16, cols: 30, mines: 99, name: 'Люксовый гламур' }
};

let currentMode: keyof typeof MODES = 'basic';
let ROWS = MODES[currentMode].rows;
let COLS = MODES[currentMode].cols;
let MINES_COUNT = MODES[currentMode].mines;

// Состояние игры
let board: Cell[][] = [];
let gameOver = false;
let firstClick = true;
let flagsPlaced = 0;
let timer = 0;
let timerInterval: number | null = null;

// DOM элементы
const gridElement = document.getElementById('grid') as HTMLDivElement;
const mineCounterElement = document.getElementById('mine-counter') as HTMLDivElement;
const timerElement = document.getElementById('timer') as HTMLDivElement;
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
const resetIcon = resetBtn.querySelector('.reset-icon') as HTMLSpanElement;
const diffButtons = document.querySelectorAll('.diff-btn') as NodeListOf<HTMLButtonElement>;

// Canvas для конфетти
const confettiCanvas = document.getElementById('confetti-canvas') as HTMLCanvasElement;
const confettiCtx = confettiCanvas.getContext('2d');
let confettiAnimationId: number | null = null;
let confettiPieces: ConfettiPiece[] = [];

const CONFETTI_COLORS = ['#ff69b4', '#ffb6c1', '#ff1493', '#ffc0cb', '#ffe4ec', '#fff'];

// Интерфейсы
interface Cell {
    row: number;
    col: number;
    isMine: boolean;
    isRevealed: boolean;
    isFlagged: boolean;
    neighborMines: number;
    element: HTMLDivElement;
}

interface ConfettiPiece {
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    speedY: number;
    speedX: number;
    rotation: number;
    rotationSpeed: number;
}

// Инициализация игры
function initGame(): void {
    // Сброс состояния
    board = [];
    gameOver = false;
    firstClick = true;
    flagsPlaced = 0;
    timer = 0;
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;

    // Остановка конфетти и скрытие оверлеев
    stopConfetti();
    document.getElementById('win-overlay')?.classList.remove('show');
    document.getElementById('lose-overlay')?.classList.remove('show');

    // Динамическая установка размеров сетки
    gridElement.style.gridTemplateColumns = `repeat(${COLS}, 32px)`;
    gridElement.style.gridTemplateRows = `repeat(${ROWS}, 32px)`;

    // Сброс UI
    gridElement.innerHTML = '';
    mineCounterElement.textContent = formatNumber(MINES_COUNT);
    timerElement.textContent = '000';
    resetIcon.textContent = '🙂';
    document.querySelector('.game-container')?.classList.remove('game-over', 'game-won');

    // Создание пустой сетки
    for (let r = 0; r < ROWS; r++) {
        const row: Cell[] = [];
        for (let c = 0; c < COLS; c++) {
            const cell: Cell = {
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

            // Обработчики событий
            cell.element.addEventListener('click', () => handleLeftClick(cell));
            cell.element.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                handleRightClick(cell);
            });
            cell.element.addEventListener('dblclick', () => handleDoubleClick(cell));

            // Эффект нажатия для смайлика
            cell.element.addEventListener('mousedown', () => {
                if (!gameOver && !cell.isRevealed && !cell.isFlagged) {
                    resetIcon.textContent = '😮';
                }
            });
            cell.element.addEventListener('mouseup', () => {
                if (!gameOver) resetIcon.textContent = '🙂';
            });

            gridElement.appendChild(cell.element);
            row.push(cell);
        }
        board.push(row);
    }
}

// Расстановка мин (после первого клика)
function placeMines(safeRow: number, safeCol: number): void {
    let minesPlaced = 0;
    while (minesPlaced < MINES_COUNT) {
        const r = Math.floor(Math.random() * ROWS);
        const c = Math.floor(Math.random() * COLS);

        if (!board[r][c].isMine && (Math.abs(r - safeRow) > 1 || Math.abs(c - safeCol) > 1)) {
            board[r][c].isMine = true;
            minesPlaced++;
        }
    }

    // Подсчет цифр вокруг мин
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (!board[r][c].isMine) {
                board[r][c].neighborMines = countNeighborMines(r, c);
            }
        }
    }
}

function countNeighborMines(r: number, c: number): number {
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

// Обработка левого клика (открытие)
function handleLeftClick(cell: Cell): void {
    if (gameOver || cell.isRevealed || cell.isFlagged) return;

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

// Рекурсивное открытие ячеек (Flood Fill)
function revealCell(cell: Cell): void {
    if (cell.isRevealed || cell.isFlagged) return;

    cell.isRevealed = true;
    cell.element.classList.add('revealed');

    if (cell.neighborMines > 0) {
        cell.element.textContent = cell.neighborMines.toString();
        cell.element.dataset.number = cell.neighborMines.toString();
    } else {
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

// Обработка правого клика (флажок)
function handleRightClick(cell: Cell): void {
    if (gameOver || cell.isRevealed) return;

    cell.isFlagged = !cell.isFlagged;
    cell.element.classList.toggle('flagged', cell.isFlagged);

    flagsPlaced += cell.isFlagged ? 1 : -1;
    mineCounterElement.textContent = formatNumber(MINES_COUNT - flagsPlaced);
}

// Обработка двойного клика (chord — автооткрытие соседей)
function handleDoubleClick(cell: Cell): void {
    if (gameOver || !cell.isRevealed || cell.neighborMines === 0) return;

    // Считаем флажки вокруг
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

    // Если флажков ровно столько, сколько мин вокруг — открываем соседей
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

// Запуск таймера
function startTimer(): void {
    if (timerInterval) return;
    timerInterval = window.setInterval(() => {
        timer++;
        if (timer > 999) timer = 999;
        timerElement.textContent = formatNumber(timer);
    }, 1000);
}

// Форматирование чисел для табло
function formatNumber(num: number): string {
    return num.toString().padStart(3, '0');
}

// =========================================
// Конфетти и оверлеи
// =========================================

function setupConfettiCanvas(): void {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
}

function createConfetti(): void {
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

function animateConfetti(): void {
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

function startConfetti(): void {
    setupConfettiCanvas();
    createConfetti();
    animateConfetti();
}

function stopConfetti(): void {
    if (confettiAnimationId) {
        cancelAnimationFrame(confettiAnimationId);
        confettiAnimationId = null;
    }
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    confettiPieces = [];
}

function showOverlay(type: 'win' | 'lose'): void {
    const overlay = document.getElementById(`${type}-overlay`) as HTMLDivElement;
    overlay.classList.add('show');

    if (type === 'win') {
        startConfetti();
    }

    // Автоматическое скрытие через 3 секунды
    setTimeout(() => {
        overlay.classList.remove('show');
        if (type === 'win') {
            setTimeout(stopConfetti, 200);
        }
    }, 2000);
}

// =========================================
// Конец игры и проверка победы
// =========================================

function triggerGameOver(isWin: boolean): void {
    gameOver = true;
    if (timerInterval) clearInterval(timerInterval);

    const container = document.querySelector('.game-container');

    if (isWin) {
        resetIcon.textContent = '😎';
        container?.classList.add('game-won');
        board.flat().forEach(cell => {
            if (cell.isMine && !cell.isFlagged) {
                cell.element.classList.add('flagged');
            }
        });
        showOverlay('win');
    } else {
        resetIcon.textContent = '😵';
        container?.classList.add('game-over');
        board.flat().forEach(cell => {
            if (cell.isMine) {
                cell.element.classList.add('revealed', 'mine');
            } else if (cell.isFlagged) {
                cell.element.style.color = 'red';
            }
        });
        showOverlay('lose');
    }
}

function checkWin(): void {
    let revealedCount = 0;
    board.flat().forEach(cell => {
        if (cell.isRevealed) revealedCount++;
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
        const mode = btn.dataset.mode as keyof typeof MODES;
        if (mode === currentMode) return;

        diffButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        currentMode = mode;
        ROWS = MODES[mode].rows;
        COLS = MODES[mode].cols;
        MINES_COUNT = MODES[mode].mines;

        initGame();
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