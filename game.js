/**
 * GravityFlip - Core Game Logic
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game Constants
const GRAVITY_Force = 0.6;
const FLIP_FORCE = 10; // Not used directly, we just flip gravity sign usually
const OBSTACLE_SPEED = 5;
const SPAWN_RATE = 90; // Frames between obstacles

// Game State
let gameActive = false;
let score = 0;
let frames = 0;
let gravityDirection = 1; // 1 = Down, -1 = Up
let obstacles = [];
let gameLoopId;

// Player Object
const player = {
    x: 100, // Fixed X position
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
        // Exposed via global scope or simple callback
        if (window.runTests) window.runTests();
    });
    
    draw(); // Initial draw
}

function startGame() {
    resetGame();
    gameActive = true;
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    gameLoop();
}

function resetGame() {
    gameActive = false;
    cancelAnimationFrame(gameLoopId);
    
    // Phase 2 Req: Reset Score
    score = 0;
    frames = 0;
    scoreEl.textContent = `Score: ${score}`;
    
    // Reset Player
    player.y = canvas.height / 2;
    player.vy = 0;
    gravityDirection = 1; // Reset to normal gravity
    
    // Clear Obstacles
    obstacles = [];
    
    draw(); // Show reset state
}

function handleInput(e) {
    if (!gameActive) return;
    
    if ((e.type === 'keydown' && e.code === 'Space') || e.type === 'mousedown') {
        flipGravity();
        e.preventDefault(); // Prevent scrolling
    }
}

function flipGravity() {
    // Phase 1 Mechanic: Flip Gravity
    gravityDirection *= -1;
    // Optional: Add a small boost or just let gravity take over? 
    // Usually in Gravity Guy, you just flip acceleration direction. 
    // Resetting vy helps it feel snappy.
    // player.vy = 0; 
}

function update() {
    if (!gameActive) return;

    frames++;
    
    // Update Score
    if (frames % 10 === 0) {
        score++;
        scoreEl.textContent = `Score: ${score}`;
    }

    // Player Physics
    player.vy += GRAVITY_Force * gravityDirection;
    player.y += player.vy;

    // Boundary Checks (Floor/Ceiling)
    if (player.y < 0) {
        player.y = 0;
        player.vy = 0; // Stop
        // In some versions touching top/bottom is death? 
        // User says "Obstacles are spikes on the floor and ceiling". 
        // Implicitly, floor/ceiling themselves might be safe unless spikes are there.
        // Or maybe just land on them. Let's treat them as safe walls.
    } else if (player.y + player.height > canvas.height) {
        player.y = canvas.height - player.height;
        player.vy = 0;
    }

    // Spawn Obstacles
    if (frames % SPAWN_RATE === 0) {
        spawnObstacle();
    }

    // Update Obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        obs.x -= OBSTACLE_SPEED;

        // Collision Check
        if (checkCollision(player, obs)) {
            gameOver();
        }

        // Remove off-screen
        if (obs.x + obs.width < 0) {
            obstacles.splice(i, 1);
        }
    }
}

function spawnObstacle() {
    // Simple obstacle generation: top or bottom spikes
    const isTop = Math.random() > 0.5;
    const height = 40 + Math.random() * 60; // Random height
    
    obstacles.push({
        x: canvas.width,
        y: isTop ? 0 : canvas.height - height,
        width: 30, // Spike width
        height: height,
        type: 'spike' // Visual type
    });
}

function checkCollision(rect1, rect2) {
    // Phase 2 Req: Collision Detection
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
}

function draw() {
    // Clear
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Player
    ctx.shadowBlur = 15;
    ctx.shadowColor = player.color;
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    // Draw "Eyes" or direction indicator (optional visual polish)
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#000';
    if (gravityDirection === 1) {
        ctx.fillRect(player.x + 5, player.y + 20, 5, 5); // Eyes looking down
        ctx.fillRect(player.x + 20, player.y + 20, 5, 5);
    } else {
        ctx.fillRect(player.x + 5, player.y + 5, 5, 5); // Eyes looking up
        ctx.fillRect(player.x + 20, player.y + 5, 5, 5);
    }

    // Draw Obstacles
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#f0f';
    ctx.fillStyle = '#f0f';
    
    obstacles.forEach(obs => {
        // Draw triangular spikes
        ctx.beginPath();
        if (obs.y === 0) {
            // Top spike facing down
            ctx.moveTo(obs.x, 0);
            ctx.lineTo(obs.x + obs.width / 2, obs.height);
            ctx.lineTo(obs.x + obs.width, 0);
        } else {
            // Bottom spike facing up
            ctx.moveTo(obs.x, canvas.height);
            ctx.lineTo(obs.x + obs.width / 2, obs.y);
            ctx.lineTo(obs.x + obs.width, canvas.height);
        }
        ctx.fill();
        
        // Debug Hitbox (optional, usually invisible)
        // ctx.strokeStyle = 'white';
        // ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
    });
    
    // Draw Floor/Ceiling lines
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
    
    fetchDeathMessage(score);
}

// --- Phase 3: Google Services (Gemini API) ---

async function fetchDeathMessage(finalScore) {
    aiCommentEl.textContent = "Loading AI sarcastic comment...";
    aiCommentEl.style.color = '#888';
    
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
        // Fallback if no API key provided
        const fallbacks = [
            "Gravity is a harsh mistress.",
            "That was... gravity assisted.",
            "Sir Isaac Newton would be disappointed.",
            "Up is down, down is up, and you are game over."
        ];
        setTimeout(() => {
            aiCommentEl.textContent = fallbacks[Math.floor(Math.random() * fallbacks.length)];
            aiCommentEl.style.color = '#f0f';
        }, 500);
        return;
    }

    // Call Gemini API
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    
    const prompt = `I just died in a gravity flip game with a score of ${finalScore}. Give me a sarcastic, short (1 sentence) roast about my performance.`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });

        const data = await response.json();
        
        if (data.candidates && data.candidates[0].content) {
            const text = data.candidates[0].content.parts[0].text;
            aiCommentEl.textContent = text;
            aiCommentEl.style.color = '#0ff'; // Neon success color
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
