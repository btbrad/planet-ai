/* =========================================================
 * 贪吃蛇小游戏 - game.js
 * 依赖 index.html 中的元素：
 *   #gameCanvas  游戏画布
 *   #score       当前分数
 *   #highScore   最高分
 *   #startBtn    开始按钮
 *   #pauseBtn    暂停按钮
 *   #restartBtn  重新开始按钮
 * ========================================================= */

(function () {
    'use strict';

    /* ---------------- 1. 画布与基础配置 ---------------- */
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    const GRID_SIZE = 20;                              // 单个格子像素
    const COLS = canvas.width / GRID_SIZE;             // 横向格数
    const ROWS = canvas.height / GRID_SIZE;            // 纵向格数

    const BASE_SPEED = 150;                            // 基础速度（毫秒/步）

    /* ---------------- 2. DOM 元素引用 ---------------- */
    const scoreEl     = document.getElementById('score');
    const highScoreEl = document.getElementById('highScore');
    const startBtn    = document.getElementById('startBtn');
    const pauseBtn    = document.getElementById('pauseBtn');
    const restartBtn  = document.getElementById('restartBtn');

    /* ---------------- 3. 游戏状态数据 ---------------- */
    let snake = [];               // 蛇身数组，index 0 为蛇头
    let direction = { x: 1, y: 0 };   // 当前移动方向
    let nextDirection = { x: 1, y: 0 }; // 下一步方向（缓冲，防止一帧内多次转向）
    let food = { x: 0, y: 0 };
    let score = 0;
    let highScore = Number(localStorage.getItem('snake_high_score')) || 0;

    let timerId = null;           // 游戏循环定时器
    let isRunning = false;        // 是否正在游戏
    let isPaused = false;         // 是否暂停

    /* ---------------- 4. 初始化 / 重置游戏 ---------------- */
    function initGame() {
        // 蛇初始位置：位于中间，长度 3，朝右
        snake = [
            { x: 5, y: Math.floor(ROWS / 2) },
            { x: 4, y: Math.floor(ROWS / 2) },
            { x: 3, y: Math.floor(ROWS / 2) }
        ];
        direction = { x: 1, y: 0 };
        nextDirection = { x: 1, y: 0 };
        score = 0;
        updateScoreUI();
        generateFood();
        draw();
    }

    /* ---------------- 5. 分数与最高分 ---------------- */
    function updateScoreUI() {
        scoreEl.textContent = score;
        highScoreEl.textContent = highScore;
    }

    function addScore() {
        score += 10;
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('snake_high_score', String(highScore));
        }
        updateScoreUI();
    }

    /* ---------------- 6. 食物随机生成 ---------------- */
    function generateFood() {
        const emptyCells = [];
        for (let x = 0; x < COLS; x++) {
            for (let y = 0; y < ROWS; y++) {
                if (!snake.some(seg => seg.x === x && seg.y === y)) {
                    emptyCells.push({ x, y });
                }
            }
        }
        if (emptyCells.length === 0) {
            // 无空位即通关
            gameOver(true);
            return;
        }
        const idx = Math.floor(Math.random() * emptyCells.length);
        food = emptyCells[idx];
    }

    /* ---------------- 7. 游戏主循环 ---------------- */
    function gameLoop() {
        update();
        draw();
    }

    function update() {
        // 应用缓冲方向
        direction = nextDirection;

        // 计算新蛇头
        const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

        // 边界碰撞检测
        if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
            gameOver();
            return;
        }

        // 自身碰撞检测（尾巴即将移动，若不吃食物则尾部会腾出，这里做严格判定）
        const willEat = (head.x === food.x && head.y === food.y);
        const bodyToCheck = willEat ? snake : snake.slice(0, snake.length - 1);
        if (bodyToCheck.some(seg => seg.x === head.x && seg.y === head.y)) {
            gameOver();
            return;
        }

        // 移动：头部前插
        snake.unshift(head);

        if (willEat) {
            // 吃到食物：蛇增长（不删尾部）
            addScore();
            generateFood();
            // 难度递增：每得 50 分加速一次（有下限）
            adjustSpeed();
        } else {
            // 未吃到：删除尾部
            snake.pop();
        }
    }

    /* ---------------- 8. 速度递增 ---------------- */
    let currentSpeed = BASE_SPEED;

    function adjustSpeed() {
        const newSpeed = Math.max(60, BASE_SPEED - Math.floor(score / 50) * 10);
        if (newSpeed !== currentSpeed) {
            currentSpeed = newSpeed;
            if (isRunning && !isPaused) {
                clearInterval(timerId);
                timerId = setInterval(gameLoop, currentSpeed);
            }
        }
    }

    /* ---------------- 9. 绘制 ---------------- */
    function draw() {
        // 背景
        ctx.fillStyle = '#1e2a38';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 网格线（辅助视觉）
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let x = 0; x <= COLS; x++) {
            ctx.beginPath();
            ctx.moveTo(x * GRID_SIZE + 0.5, 0);
            ctx.lineTo(x * GRID_SIZE + 0.5, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y <= ROWS; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * GRID_SIZE + 0.5);
            ctx.lineTo(canvas.width, y * GRID_SIZE + 0.5);
            ctx.stroke();
        }

        // 食物
        drawCell(food.x, food.y, '#ff5d5d', 4);

        // 蛇身
        snake.forEach((seg, i) => {
            const color = i === 0 ? '#7cffb2' : '#3ddc84';
            drawCell(seg.x, seg.y, color, 3);
        });

        // 暂停提示
        if (isPaused) {
            drawOverlay('已暂停', '按空格 / 点击暂停继续');
        }
    }

    function drawCell(gx, gy, color, radius) {
        const px = gx * GRID_SIZE;
        const py = gy * GRID_SIZE;
        ctx.fillStyle = color;
        roundRect(ctx, px + 2, py + 2, GRID_SIZE - 4, GRID_SIZE - 4, radius || 4);
        ctx.fill();
    }

    function roundRect(c, x, y, w, h, r) {
        c.beginPath();
        c.moveTo(x + r, y);
        c.arcTo(x + w, y, x + w, y + h, r);
        c.arcTo(x + w, y + h, x, y + h, r);
        c.arcTo(x, y + h, x, y, r);
        c.arcTo(x, y, x + w, y, r);
        c.closePath();
    }

    function drawOverlay(title, subtitle) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 32px "Segoe UI", Arial, sans-serif';
        ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 20);
        if (subtitle) {
            ctx.font = '16px "Segoe UI", Arial, sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 20);
        }
    }

    /* ---------------- 10. 游戏流程控制 ---------------- */
    function startGame() {
        if (isRunning && !isPaused) return; // 已在运行

        if (isPaused) {
            // 从暂停恢复
            resumeGame();
            return;
        }

        // 全新开始
        initGame();
        isRunning = true;
        isPaused = false;
        currentSpeed = BASE_SPEED;
        clearInterval(timerId);
        timerId = setInterval(gameLoop, currentSpeed);
        updateButtons();
    }

    function pauseGame() {
        if (!isRunning || isPaused) return;
        isPaused = true;
        clearInterval(timerId);
        timerId = null;
        draw();
        updateButtons();
    }

    function resumeGame() {
        if (!isRunning || !isPaused) return;
        isPaused = false;
        clearInterval(timerId);
        timerId = setInterval(gameLoop, currentSpeed);
        updateButtons();
    }

    function togglePause() {
        if (!isRunning) return;
        isPaused ? resumeGame() : pauseGame();
    }

    function restartGame() {
        clearInterval(timerId);
        timerId = null;
        isRunning = false;
        isPaused = false;
        startGame();
    }

    function gameOver(win) {
        clearInterval(timerId);
        timerId = null;
        isRunning = false;
        isPaused = false;

        draw();
        drawOverlay(
            win ? '恭喜通关！' : '游戏结束',
            '得分：' + score + '  |  按空格或点击“重新开始”再来一局'
        );
        updateButtons();
    }

    function updateButtons() {
        if (startBtn) {
            startBtn.textContent = (!isRunning || isPaused) ? '开始' : '进行中';
            startBtn.disabled = (isRunning && !isPaused);
        }
        if (pauseBtn) {
            pauseBtn.textContent = isPaused ? '继续' : '暂停';
            pauseBtn.disabled = !isRunning;
        }
    }

    /* ---------------- 11. 键盘控制 ---------------- */
    const KEY_MAP = {
        ArrowUp:    { x: 0,  y: -1 },
        ArrowDown:  { x: 0,  y: 1 },
        ArrowLeft:  { x: -1, y: 0 },
        ArrowRight: { x: 1,  y: 0 },
        w: { x: 0,  y: -1 },
        s: { x: 0,  y: 1 },
        a: { x: -1, y: 0 },
        d: { x: 1,  y: 0 }
    };

    function handleKeyDown(e) {
        const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

        // 空格：开始 / 暂停切换
        if (key === ' ') {
            e.preventDefault();
            if (!isRunning) {
                startGame();
            } else {
                togglePause();
            }
            return;
        }

        const dir = KEY_MAP[key];
        if (!dir) return;
        e.preventDefault();

        // 禁止反向移动（不能与当前方向相反）
        if (dir.x === -direction.x && dir.y === -direction.y) return;
        // 禁止同一方向重复覆盖（允许同向，无影响）
        if (dir.x === direction.x && dir.y === direction.y) {
            nextDirection = dir;
            return;
        }
        nextDirection = dir;
    }

    /* ---------------- 12. 事件绑定 ---------------- */
    function bindEvents() {
        document.addEventListener('keydown', handleKeyDown);
        if (startBtn)   startBtn.addEventListener('click', startGame);
        if (pauseBtn)   pauseBtn.addEventListener('click', togglePause);
        if (restartBtn) restartBtn.addEventListener('click', restartGame);

        // 失焦时自动暂停，避免回来时“秒死”
        window.addEventListener('blur', function () {
            if (isRunning && !isPaused) pauseGame();
        });
    }

    /* ---------------- 13. 启动初始化 ---------------- */
    function boot() {
        initGame();          // 画出初始画面
        bindEvents();
        updateButtons();
    }

    // 若脚本在 DOM 加载后执行则直接启动，否则等待 DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

})();