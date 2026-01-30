/**
 * GravityFlip - Core Game Logic
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game Constants
const GRAVITY_Force = 0.6;
const FLIP_FORCE = 10;
const OBSTACLE_SPEED = 5;
const SPAWN_RATE = 90;

// Game State
let gameActive = false;
let score = 0;
let frames = 0;
let gravityDirection = 1;
let obstacles = [];
let gameLoopId;

// Player Object
const player = {
    x: 100,
    y: 200,
    width: 30,
    height: 30,
    vy: 0,
    color: '#0ff',
    onGround: false
};

// UI Elements
const scoreEl = document.getElementById('score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreEl = document.getElementById('final-score');
const aiCommentEl = document.getElementById('ai-comment');
const apiKeyInput = document.getElementById('api-key-input');
const playerNameInput = document.getElementById('player-name-input');
const settingsModal = document.getElementById('settings-modal');

// --- Core Mechanics ---

function initGame() {
    canvas.width = 800;
    canvas.height = 450;

    // Event Listeners
    document.addEventListener('keydown', handleInput);
    canvas.addEventListener('mousedown', handleInput);

    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('restart-btn').addEventListener('click', resetGame);
    document.getElementById('test-btn').addEventListener('click', () => {
        if (window.runTests) window.runTests();
    });

    // Settings & Cloud
    document.getElementById('settings-btn').addEventListener('click', openSettings);
    document.getElementById('close-settings-btn').addEventListener('click', closeSettings);

    document.getElementById('google-login-btn').addEventListener('click', () => {
        const clientId = document.getElementById('client-id-input').value.trim();
        const projectApiKey = document.getElementById('project-api-key-input').value.trim();
        // Fallback to "Connected" if not provided for pure visual demo if they don't have keys
        if (!clientId) {
            alert("No Client ID provided. Please enter a Client ID to use real Google Services.");
            // connectGoogleDrive('MOCK', 'MOCK'); // Uncomment to mock
            return;
        }
        connectGoogleDrive(clientId, projectApiKey);
    });

    // Initial High Score display (if local storage was implemented or just default)
    updateHighScoreUI();

    draw();
}

function openSettings() {
    settingsModal.classList.remove('hidden');
}

function closeSettings() {
    settingsModal.classList.add('hidden');
}

function startGame() {
    // Update player name from input
    window.driveState.playerName = playerNameInput.value || "Player 1";
    updateHighScoreUI();

    resetGame();
    gameActive = true;
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    gameLoop();
}

function resetGame() {
    gameActive = false;
    cancelAnimationFrame(gameLoopId);

    score = 0;
    frames = 0;
    scoreEl.textContent = `Score: ${score}`;

    player.y = canvas.height / 2;
    player.vy = 0;
    gravityDirection = 1;

    obstacles = [];

    draw();
}

function handleInput(e) {
    if (!gameActive) return;

    if ((e.type === 'keydown' && e.code === 'Space') || e.type === 'mousedown') {
        flipGravity();
        e.preventDefault();
    }
}

function flipGravity() {
    gravityDirection *= -1;
}

function update() {
    if (!gameActive) return;

    frames++;

    if (frames % 10 === 0) {
        score++;
        scoreEl.textContent = `Score: ${score}`;
    }

    player.vy += GRAVITY_Force * gravityDirection;
    player.y += player.vy;

    if (player.y < 0) {
        player.y = 0;
        player.vy = 0;
    } else if (player.y + player.height > canvas.height) {
        player.y = canvas.height - player.height;
        player.vy = 0;
    }

    if (frames % SPAWN_RATE === 0) {
        spawnObstacle();
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        obs.x -= OBSTACLE_SPEED;

        if (checkCollision(player, obs)) {
            gameOver();
        }

        if (obs.x + obs.width < 0) {
            obstacles.splice(i, 1);
        }
    }
}

function spawnObstacle() {
    const isTop = Math.random() > 0.5;
    const height = 40 + Math.random() * 60;

    obstacles.push({
        x: canvas.width,
        y: isTop ? 0 : canvas.height - height,
        width: 30,
        height: height,
        type: 'spike'
    });
}

function checkCollision(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
}

function draw() {
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.shadowBlur = 15;
    ctx.shadowColor = player.color;
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#000';
    if (gravityDirection === 1) {
        ctx.fillRect(player.x + 5, player.y + 20, 5, 5);
        ctx.fillRect(player.x + 20, player.y + 20, 5, 5);
    } else {
        ctx.fillRect(player.x + 5, player.y + 5, 5, 5);
        ctx.fillRect(player.x + 20, player.y + 5, 5, 5);
    }

    ctx.shadowBlur = 10;
    ctx.shadowColor = '#f0f';
    ctx.fillStyle = '#f0f';

    obstacles.forEach(obs => {
        ctx.beginPath();
        if (obs.y === 0) {
            ctx.moveTo(obs.x, 0);
            ctx.lineTo(obs.x + obs.width / 2, obs.height);
            ctx.lineTo(obs.x + obs.width, 0);
        } else {
            ctx.moveTo(obs.x, canvas.height);
            ctx.lineTo(obs.x + obs.width / 2, obs.y);
            ctx.lineTo(obs.x + obs.width, canvas.height);
        }
        ctx.fill();
    });

    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, canvas.width, 2);
    ctx.fillRect(0, canvas.height - 2, canvas.width, 2);
}

function gameLoop() {
    if (!gameActive) return;
    update();
    draw();
    gameLoopId = requestAnimationFrame(gameLoop);
}

function gameOver() {
    gameActive = false;
    cancelAnimationFrame(gameLoopId);

    finalScoreEl.textContent = score;
    gameOverScreen.classList.remove('hidden');

    // Save High Score via Drive Service
    const currentPlayer = window.driveState ? window.driveState.playerName : "Player";
    if (window.saveHighScoreToDrive) {
        window.saveHighScoreToDrive(score, currentPlayer);
    }

    fetchDeathMessage(score);
}

// --- Phase 3: Google Services (Gemini API) ---

async function fetchDeathMessage(finalScore) {
    aiCommentEl.textContent = "Loading AI sarcastic comment...";
    aiCommentEl.style.color = '#888';

    // Try to get key from input (which is in modal now)
    // Or fallback to the old simple input if still present? 
    // We moved it to the modal.
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
        const fallbacks = [
            "Gravity is a harsh mistress.",
            "My grandmother jumps better.",
            "Sir Isaac Newton would be disappointed.",
            "Up is down, down is up, and you are game over."
        ];
        setTimeout(() => {
            aiCommentEl.textContent = fallbacks[Math.floor(Math.random() * fallbacks.length)];
            aiCommentEl.style.color = '#f0f';
        }, 500);
        return;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const prompt = `I just died in a gravity flip game with a score of ${finalScore}. Give me a sarcastic, short (1 sentence) roast about my performance.`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();

        if (data.candidates && data.candidates[0].content) {
            aiCommentEl.textContent = data.candidates[0].content.parts[0].text;
            aiCommentEl.style.color = '#0ff';
        } else {
            console.error('API Error:', data);
            aiCommentEl.textContent = "Even the AI is speechless (Error).";
        }
    } catch (error) {
        console.error('Fetch Error:', error);
        aiCommentEl.textContent = "Failed to reach the AI overlords.";
    }
}

// Initialize
initGame();

// Expose for Testing (Phase 2)
window.gameExport = {
    player,
    obstacles,
    getScore: () => score,
    flipGravity,
    checkCollision,
    resetGame,
    getGravityDirection: () => gravityDirection
};
