// =========================================
// Glamour Minesweeper  - Логика (TypeScript)
// =========================================

const MODES = {
    basic: { rows: 16, cols: 16, mines: 40, name: 'Базовый гламур' },
    luxury: { rows: 16, cols: 30, mines: 99, name: 'Люксовый гламур' }
};

const ACHIEVEMENTS: AchievementDef[] = [
    { id: 'first_win', name: 'Первая победа', desc: 'Выиграй первую игру', icon: '🎉' },
    { id: 'win_60', name: 'Быстрый гламур', desc: 'Победа за 60 секунд', icon: '⚡' },
    { id: 'win_45', name: 'Молниеносный', desc: 'Победа за 45 секунд', icon: '🌩️' },
    { id: 'win_30', name: 'Скоростной', desc: 'Победа за 30 секунд', icon: '💨' },
    { id: 'streak_5', name: 'Серия побед', desc: '5 побед подряд', icon: '' },
    { id: 'streak_10', name: 'Неудержимая', desc: '10 побед подряд', icon: '💎' },
    { id: 'basic_complete', name: 'Базовый гламур', desc: 'Первая победа на базовом режиме', icon: '🍓' },
    { id: 'luxury_complete', name: 'Люксовый гламур', desc: 'Первая победа на люксовом режиме', icon: '💎' }
];

interface AchievementDef {
    id: string;
    name: string;
    desc: string;
    icon: string;
}

let currentMode: keyof typeof MODES = 'basic';
let ROWS = MODES[currentMode].rows;
let COLS = MODES[currentMode].cols;
let MINES_COUNT = MODES[currentMode].mines;

type AutoOpenMode = 'double' | 'single';
type Theme = 'light' | 'dark';
type ShakeMode = 'on' | 'off';
type AutosaveMode = 'on' | 'off';
let autoOpenMode: AutoOpenMode = loadAutoOpenSetting();
let currentTheme: Theme = loadThemeSetting();
let shakeMode: ShakeMode = loadShakeSetting();
let autosaveMode: AutosaveMode = loadAutosaveSetting();

interface GameStats {
    totalGames: number;
    wins: number;
    currentStreak: number;
    bestStreak: number;
    bestTimes: { basic: number | null; luxury: number | null };
    achievements: string[];
}
let stats: GameStats = loadStats();

let board: Cell[][] = [];
let gameOver = false;
let firstClick = true;
let flagsPlaced = 0;
let timer = 0;
let timerInterval: number | null = null;
let gameStarted = false;

const gridElement = document.getElementById('grid') as HTMLDivElement;
const mineCounterElement = document.getElementById('mine-counter') as HTMLDivElement;
const timerElement = document.getElementById('timer') as HTMLDivElement;
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
const resetIcon = resetBtn.querySelector('.reset-icon') as HTMLSpanElement;
const diffButtons = document.querySelectorAll('.diff-btn') as NodeListOf<HTMLButtonElement>;
const settingsBtn = document.getElementById('settings-btn') as HTMLButtonElement;
const statsBtn = document.getElementById('stats-btn') as HTMLButtonElement;
const settingsModal = document.getElementById('settings-modal') as HTMLDivElement;
const statsModal = document.getElementById('stats-modal') as HTMLDivElement;
const settingsClose = document.getElementById('settings-close') as HTMLButtonElement;
const statsClose = document.getElementById('stats-close') as HTMLButtonElement;
const autoOpenRadios = document.querySelectorAll('input[name="auto-open"]') as NodeListOf<HTMLInputElement>;
const themeRadios = document.querySelectorAll('input[name="theme"]') as NodeListOf<HTMLInputElement>;
const shakeRadios = document.querySelectorAll('input[name="shake"]') as NodeListOf<HTMLInputElement>;
const autosaveRadios = document.querySelectorAll('input[name="autosave"]') as NodeListOf<HTMLInputElement>;
const clearStatsBtn = document.getElementById('clear-stats-btn') as HTMLButtonElement;
const continueBtn = document.getElementById('continue-btn') as HTMLButtonElement;
const recordTime = document.getElementById('record-time') as HTMLSpanElement;
const achievementToast = document.getElementById('achievement-toast') as HTMLDivElement;
const toastAchievementName = document.getElementById('toast-achievement-name') as HTMLDivElement;

const confettiCanvas = document.getElementById('confetti-canvas') as HTMLCanvasElement;
const confettiCtx = confettiCanvas.getContext('2d')!;
let confettiAnimationId: number | null = null;
let confettiPieces: ConfettiPiece[] = [];

const CONFETTI_COLORS = ['#ff69b4', '#ffb6c1', '#ff1493', '#ffc0cb', '#ffe4ec', '#fff'];

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

// =========================================
// localStorage функции
// =========================================

function loadAutoOpenSetting(): AutoOpenMode {
    const saved = localStorage.getItem('glamour-minesweeper-auto-open');
    return (saved as AutoOpenMode) || 'double';
}

function saveAutoOpenSetting(mode: AutoOpenMode): void {
    localStorage.setItem('glamour-minesweeper-auto-open', mode);
}

function loadThemeSetting(): Theme {
    const saved = localStorage.getItem('glamour-minesweeper-theme');
    return (saved as Theme) || 'light';
}

function saveThemeSetting(theme: Theme): void {
    localStorage.setItem('glamour-minesweeper-theme', theme);
}

function loadShakeSetting(): ShakeMode {
    const saved = localStorage.getItem('glamour-minesweeper-shake');
    return (saved as ShakeMode) || 'off';
}

function saveShakeSetting(mode: ShakeMode): void {
    localStorage.setItem('glamour-minesweeper-shake', mode);
}

function loadAutosaveSetting(): AutosaveMode {
    const saved = localStorage.getItem('glamour-minesweeper-autosave');
    return (saved as AutosaveMode) || 'on';
}

function saveAutosaveSetting(mode: AutosaveMode): void {
    localStorage.setItem('glamour-minesweeper-autosave', mode);
}

function applyTheme(theme: Theme): void {
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
}

function triggerShake(): void {
    if (shakeMode !== 'on') return;
    const container = document.querySelector('.game-container') as HTMLElement;
    if (!container) return;
    container.classList.remove('shake');
    void container.offsetWidth;
    container.classList.add('shake');
    setTimeout(() => container.classList.remove('shake'), 500);
}

// =========================================
// Статистика
// =========================================

function loadStats(): GameStats {
    const saved = localStorage.getItem('glamour-minesweeper-stats');
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch {
            // ignore
        }
    }
    return {
        totalGames: 0,
        wins: 0,
        currentStreak: 0,
        bestStreak: 0,
        bestTimes: { basic: null, luxury: null },
        achievements: []
    };
}

function saveStats(): void {
    localStorage.setItem('glamour-minesweeper-stats', JSON.stringify(stats));
}

function loadRecord(): number | null {
    return stats.bestTimes[currentMode];
}

function saveRecord(time: number): void {
    if (stats.bestTimes[currentMode] === null || time < stats.bestTimes[currentMode]!) {
        stats.bestTimes[currentMode] = time;
        saveStats();
    }
}

function updateRecordDisplay(): void {
    const record = loadRecord();
    if (record !== null) {
        recordTime.textContent = formatTime(record);
    } else {
        recordTime.textContent = '---';
    }
}

function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatNumber(num: number): string {
    return num.toString().padStart(3, '0');
}

// =========================================
// Достижения
// =========================================

function checkAchievements(): string[] {
    const newAchievements: string[] = [];

    const checks: Array<[string, boolean]> = [
        ['first_win', stats.wins >= 1],
        ['win_60', stats.wins > 0 && stats.bestTimes[currentMode] !== null && stats.bestTimes[currentMode]! <= 60],
        ['win_45', stats.wins > 0 && stats.bestTimes[currentMode] !== null && stats.bestTimes[currentMode]! <= 45],
        ['win_30', stats.wins > 0 && stats.bestTimes[currentMode] !== null && stats.bestTimes[currentMode]! <= 30],
        ['streak_5', stats.bestStreak >= 5],
        ['streak_10', stats.bestStreak >= 10],
        ['basic_complete', stats.bestTimes.basic !== null],
        ['luxury_complete', stats.bestTimes.luxury !== null]
    ];

    for (const [id, condition] of checks) {
        if (condition && !stats.achievements.includes(id)) {
            stats.achievements.push(id);
            newAchievements.push(id);
        }
    }

    if (newAchievements.length > 0) {
        saveStats();
    }

    return newAchievements;
}

function showAchievementToast(achievementId: string): void {
    const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!achievement) return;

    toastAchievementName.textContent = `${achievement.icon} ${achievement.name}`;
    achievementToast.classList.add('show');

    setTimeout(() => {
        achievementToast.classList.remove('show');
    }, 3000);
}

function renderAchievements(): void {
    const grid = document.getElementById('achievements-grid');
    if (!grid) return;
    grid.innerHTML = '';

    ACHIEVEMENTS.forEach(achievement => {
        const unlocked = stats.achievements.includes(achievement.id);
        const item = document.createElement('div');
        item.className = `achievement-item ${unlocked ? 'unlocked' : 'locked'}`;
        item.innerHTML = `
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-info">
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-desc">${achievement.desc}</div>
            </div>
        `;
        grid.appendChild(item);
    });

    const countEl = document.getElementById('achievements-count');
    if (countEl) countEl.textContent = stats.achievements.length.toString();
}

function updateStatsDisplay(): void {
    document.getElementById('stat-total')!.textContent = stats.totalGames.toString();
    document.getElementById('stat-wins')!.textContent = stats.wins.toString();
    const percent = stats.totalGames > 0 ? Math.round((stats.wins / stats.totalGames) * 100) : 0;
    document.getElementById('stat-percent')!.textContent = `${percent}%`;
    document.getElementById('stat-streak')!.textContent = stats.currentStreak.toString();
    document.getElementById('stat-best-streak')!.textContent = stats.bestStreak.toString();
    document.getElementById('stat-best-basic')!.textContent = stats.bestTimes.basic !== null ? formatTime(stats.bestTimes.basic!) : '---';
    document.getElementById('stat-best-luxury')!.textContent = stats.bestTimes.luxury !== null ? formatTime(stats.bestTimes.luxury!) : '---';
    renderAchievements();
}

// =========================================
// Автосохранение
// =========================================

interface SaveState {
    mode: keyof typeof MODES;
    timer: number;
    gameOver: boolean;
    gameStarted: boolean;
    firstClick: boolean;
    flagsPlaced: number;
    board: Array<{
        isMine: boolean;
        isRevealed: boolean;
        isFlagged: boolean;
        neighborMines: number;
    }>;
}

const SAVE_KEY = 'glamour-minesweeper-save';

function saveGameState(): void {
    if (autosaveMode !== 'on' || !gameStarted) return;
    const state: SaveState = {
        mode: currentMode,
        timer,
        gameOver,
        gameStarted,
        firstClick,
        flagsPlaced,
        board: board.flat().map(cell => ({
            isMine: cell.isMine,
            isRevealed: cell.isRevealed,
            isFlagged: cell.isFlagged,
            neighborMines: cell.neighborMines
        }))
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

function loadGameState(): SaveState | null {
    const saved = localStorage.getItem(SAVE_KEY);
    if (!saved) return null;
    try {
        return JSON.parse(saved) as SaveState;
    } catch {
        return null;
    }
}

function clearSave(): void {
    localStorage.removeItem(SAVE_KEY);
    continueBtn.style.display = 'none';
}

function restoreGameState(state: SaveState): void {
    currentMode = state.mode;
    ROWS = MODES[currentMode].rows;
    COLS = MODES[currentMode].cols;
    MINES_COUNT = MODES[currentMode].mines;
    timer = state.timer;
    gameOver = state.gameOver;
    gameStarted = state.gameStarted;
    firstClick = state.firstClick;
    flagsPlaced = state.flagsPlaced;

    diffButtons.forEach(b => b.classList.remove('active'));
    const activeBtn = document.querySelector(`.diff-btn[data-mode="${currentMode}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    gridElement.style.gridTemplateColumns = `repeat(${COLS}, 32px)`;
    gridElement.style.gridTemplateRows = `repeat(${ROWS}, 32px)`;
    gridElement.innerHTML = '';
    board = [];

    for (let r = 0; r < ROWS; r++) {
        const row: Cell[] = [];
        for (let c = 0; c < COLS; c++) {
            const idx = r * COLS + c;
            const cellData = state.board[idx];
            const cell: Cell = {
                row: r,
                col: c,
                isMine: cellData.isMine,
                isRevealed: cellData.isRevealed,
                isFlagged: cellData.isFlagged,
                neighborMines: cellData.neighborMines,
                element: document.createElement('div')
            };

            cell.element.classList.add('cell');
            if (cell.isRevealed) {
                cell.element.classList.add('revealed');
                if (cell.neighborMines > 0) {
                    cell.element.textContent = cell.neighborMines.toString();
                    cell.element.dataset.number = cell.neighborMines.toString();
                }
            }
            if (cell.isFlagged) {
                cell.element.classList.add('flagged');
            }

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
                if (!gameOver) resetIcon.textContent = '🙂';
            });

            gridElement.appendChild(cell.element);
            row.push(cell);
        }
        board.push(row);
    }

    mineCounterElement.textContent = formatNumber(MINES_COUNT - flagsPlaced);
    timerElement.textContent = formatNumber(timer);
    updateRecordDisplay();
    applyTheme(currentTheme);

    if (gameOver) {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = null;
    } else if (gameStarted && !firstClick) {
        startTimer();
    }

    continueBtn.style.display = 'none';
}

function checkContinueButton(): void {
    const save = loadGameState();
    if (save && save.gameStarted && !save.gameOver) {
        continueBtn.style.display = 'block';
    } else {
        continueBtn.style.display = 'none';
    }
}

// =========================================
// Инициализация игры
// =========================================

function initGame(clearSaveFlag = true): void {
    board = [];
    gameOver = false;
    firstClick = true;
    flagsPlaced = 0;
    timer = 0;
    gameStarted = false;
    if (timerInterval) clearInterval(timerInterval);
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
    document.querySelector('.game-container')?.classList.remove('game-over', 'game-won', 'shake');

    updateRecordDisplay();
    applyTheme(currentTheme);

    if (clearSaveFlag) {
        clearSave();
    }

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
                if (!gameOver) resetIcon.textContent = '🙂';
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

function handleLeftClick(cell: Cell): void {
    if (autoOpenMode === 'single' && cell.isRevealed && cell.neighborMines > 0) {
        autoOpenNeighbors(cell);
        return;
    }

    if (gameOver || cell.isRevealed || cell.isFlagged) return;

    if (firstClick) {
        firstClick = false;
        placeMines(cell.row, cell.col);
        startTimer();
    }

    gameStarted = true;

    if (cell.isMine) {
        stats.totalGames++;
        stats.currentStreak = 0;
        saveStats();
        triggerGameOver(false);
        return;
    }

    revealCell(cell);
    saveGameState();
    checkWin();
}

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

function handleRightClick(cell: Cell): void {
    if (gameOver || cell.isRevealed) return;

    if (!gameStarted) {
        gameStarted = true;
    }

    cell.isFlagged = !cell.isFlagged;
    cell.element.classList.toggle('flagged', cell.isFlagged);

    flagsPlaced += cell.isFlagged ? 1 : -1;
    mineCounterElement.textContent = formatNumber(MINES_COUNT - flagsPlaced);
    saveGameState();
}

function handleDoubleClick(cell: Cell): void {
    if (gameOver || !cell.isRevealed || cell.neighborMines === 0) return;
    autoOpenNeighbors(cell);
}

function autoOpenNeighbors(cell: Cell): void {
    if (!cell.isRevealed || cell.neighborMines === 0) return;

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
                            stats.totalGames++;
                            stats.currentStreak = 0;
                            saveStats();
                            triggerGameOver(false);
                            return;
                        }
                        revealCell(neighbor);
                    }
                }
            }
        }
        saveGameState();
        checkWin();
    }
}

function startTimer(): void {
    if (timerInterval) return;
    timerInterval = window.setInterval(() => {
        timer++;
        if (timer > 999) timer = 999;
        timerElement.textContent = formatNumber(timer);
    }, 1000);
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

function triggerGameOver(isWin: boolean): void {
    gameOver = true;
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;

    const container = document.querySelector('.game-container');

    if (isWin) {
        stats.wins++;
        stats.currentStreak++;
        if (stats.currentStreak > stats.bestStreak) {
            stats.bestStreak = stats.currentStreak;
        }
        saveRecord(timer);
        saveStats();

        resetIcon.textContent = '😎';
        container?.classList.add('game-won');
        board.flat().forEach(cell => {
            if (cell.isMine && !cell.isFlagged) {
                cell.element.classList.add('flagged');
            }
        });

        const newAchievements = checkAchievements();
        newAchievements.forEach(id => showAchievementToast(id));

        showOverlay('win');
    } else {
        resetIcon.textContent = '😵';
        container?.classList.add('game-over');
        triggerShake();
        board.flat().forEach(cell => {
            if (cell.isMine) {
                cell.element.classList.add('revealed', 'mine');
            } else if (cell.isFlagged) {
                cell.element.style.color = 'red';
            }
        });
        showOverlay('lose');
    }

    clearSave();
    updateRecordDisplay();
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

settingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('show');
    const currentRadio = document.querySelector(`input[name="auto-open"][value="${autoOpenMode}"]`) as HTMLInputElement;
    if (currentRadio) currentRadio.checked = true;
    const currentThemeRadio = document.querySelector(`input[name="theme"][value="${currentTheme}"]`) as HTMLInputElement;
    if (currentThemeRadio) currentThemeRadio.checked = true;
    const currentShakeRadio = document.querySelector(`input[name="shake"][value="${shakeMode}"]`) as HTMLInputElement;
    if (currentShakeRadio) currentShakeRadio.checked = true;
    const currentAutosaveRadio = document.querySelector(`input[name="autosave"][value="${autosaveMode}"]`) as HTMLInputElement;
    if (currentAutosaveRadio) currentAutosaveRadio.checked = true;
});

settingsClose.addEventListener('click', () => {
    settingsModal.classList.remove('show');
});

settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) settingsModal.classList.remove('show');
});

statsBtn.addEventListener('click', () => {
    updateStatsDisplay();
    statsModal.classList.add('show');
});

statsClose.addEventListener('click', () => {
    statsModal.classList.remove('show');
});

statsModal.addEventListener('click', (e) => {
    if (e.target === statsModal) statsModal.classList.remove('show');
});

autoOpenRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        autoOpenMode = target.value as AutoOpenMode;
        saveAutoOpenSetting(autoOpenMode);
        initGame();
    });
});

themeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        currentTheme = target.value as Theme;
        saveThemeSetting(currentTheme);
        applyTheme(currentTheme);
    });
});

shakeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        shakeMode = target.value as ShakeMode;
        saveShakeSetting(shakeMode);
    });
});

autosaveRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        autosaveMode = target.value as AutosaveMode;
        saveAutosaveSetting(autosaveMode);
        if (autosaveMode === 'off') {
            clearSave();
        }
    });
});

clearStatsBtn.addEventListener('click', () => {
    if (confirm('Точно очистить всю статистику и достижения? Это действие нельзя отменить.')) {
        stats = {
            totalGames: 0,
            wins: 0,
            currentStreak: 0,
            bestStreak: 0,
            bestTimes: { basic: null, luxury: null },
            achievements: []
        };
        saveStats();
        updateRecordDisplay();
        settingsModal.classList.remove('show');
    }
});

continueBtn.addEventListener('click', () => {
    const save = loadGameState();
    if (save) {
        restoreGameState(save);
    }
});

resetBtn.addEventListener('click', () => initGame(true));

window.addEventListener('resize', () => {
    if (confettiAnimationId) setupConfettiCanvas();
});

// =========================================
// Запуск
// =========================================

applyTheme(currentTheme);
checkContinueButton();

const savedState = loadGameState();
if (savedState && savedState.gameStarted && !savedState.gameOver) {
    continueBtn.style.display = 'block';
    initGame(false);
} else {
    initGame(false);
}
