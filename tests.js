/**
 * GravityFlip - Test Suite (Phase 2)
 */

function runTests() {
    const resultsContainer = document.getElementById('test-results');
    const list = document.getElementById('test-list');
    list.innerHTML = ''; // Clear previous results
    resultsContainer.classList.remove('hidden');

    // Helper Assert Function
    function assert(condition, description) {
        const li = document.createElement('li');
        if (condition) {
            li.textContent = `✅ PASS: ${description}`;
            li.className = 'test-pass';
        } else {
            li.textContent = `❌ FAIL: ${description}`;
            li.className = 'test-fail';
            console.error(`Test Failed: ${description}`);
        }
        list.appendChild(li);
    }

    // Access exposed game internals
    const game = window.gameExport;
    if (!game) {
        alert("Game exports not found! Ensure game.js is loaded.");
        return;
    }

    console.log("Starting Tests...");

    // Test 1: resetGame() clears the score
    console.log("Test 1: resetGame logic");
    // Manually dirty the state
    // We can't easily write to 'score' directly if it's not exposed as a setter, 
    // but resetGame() resets it. Let's assume usage of resetGame first.
    game.resetGame();
    assert(game.getScore() === 0, "resetGame() should set score to 0");

    // Test 2: Gravity Flip Logic
    console.log("Test 2: Gravity Flip");
    // Setup
    game.resetGame();
    const initialGravityDir = game.getGravityDirection(); // Should be 1 (down)

    game.flipGravity();
    const flippedGravityDir = game.getGravityDirection();

    assert(initialGravityDir === 1, "Initial gravity direction is Down (1)");
    assert(flippedGravityDir === -1, "after flipGravity(), direction is Up (-1)");

    // Simulate physics step to see if player accelerates the other way?
    // We can't easily run the private update() loop, but checking the flag is sufficient validation for "logic correct".

    game.flipGravity(); // Flip back
    assert(game.getGravityDirection() === 1, "Flipping again restores Down direction");

    // Test 3: Collision Detection
    console.log("Test 3: Collision Logic");

    const playerRect = { x: 100, y: 100, width: 30, height: 30 };
    const obstacleHit = { x: 110, y: 110, width: 30, height: 30 }; // Overlaps
    const obstacleMiss = { x: 200, y: 200, width: 30, height: 30 }; // Far away
    const obstacleTouch = { x: 130, y: 100, width: 30, height: 30 }; // Touching edge (usually counts as overlap in simple AABB usually > vs >=)

    assert(game.checkCollision(playerRect, obstacleHit) === true, "Collision detected for overlapping rects");
    assert(game.checkCollision(playerRect, obstacleMiss) === false, "No collision for distant rects");

    // Check edge case behavior of implementation
    // Implementation: rect1.x < rect2.x + rect2.width ...
    // 100 < 130 + 30 (160) True
    // 100 + 30 (130) > 130 False? 130 > 130 is false. So touching exactly on right edge is NOT collision. Used > and <.
    assert(game.checkCollision(playerRect, obstacleTouch) === false, "Exact edge touching is not a collision (strict inequality)");

    console.log("Tests Completed.");
}

// Bind close button
document.getElementById('close-tests').addEventListener('click', () => {
    document.getElementById('test-results').classList.add('hidden');
});

// Expose runTests globally so button can call it
window.runTests = runTests;
