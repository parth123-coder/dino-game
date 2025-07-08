// Game state variables
let gameState = {
    isRunning: false,
    isPaused: false,
    score: 0,
    level: 1,
    obstacleCount: 0,
    difficulty: 'Easy',
    currentMathProblem: null,
    mathTimer: null,
    mathTimeLeft: 5
};

// Game elements
const dino = document.getElementById('dino');
const gameContainer = document.getElementById('gameContainer');
const obstaclesContainer = document.getElementById('obstaclesContainer');
const mathContainer = document.getElementById('mathContainer');
const mathProblem = document.getElementById('mathProblem');
const mathInput = document.getElementById('mathInput');
const submitButton = document.getElementById('submitAnswer');
const mathTimerDisplay = document.getElementById('mathTimer');
const scoreDisplay = document.getElementById('score');
const levelDisplay = document.getElementById('level');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreDisplay = document.getElementById('finalScore');
const restartButton = document.getElementById('restartButton');
const startScreen = document.getElementById('startScreen');
const startButton = document.getElementById('startButton');
const asteroid = document.getElementById('asteroid');

// Game mechanics
let isJumping = false;
let jumpCooldown = false;
let clickCooldown = false;
let obstacles = [];
let gameLoop;
let obstacleSpawnTimer;

// Difficulty levels and math problem types
const difficulties = {
    'Easy': { range: 10, operations: ['+', '-'] },
    'Medium': { range: 20, operations: ['+', '-', '*'] },
    'Hard': { range: 50, operations: ['+', '-', '*'] },
    'Max': { range: 100, operations: ['+', '-', '*', '/'] }
};

// Event listeners
document.addEventListener('keydown', handleKeyPress);
document.addEventListener('click', handleClick);
submitButton.addEventListener('click', submitMathAnswer);
mathInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        submitMathAnswer();
    }
});
restartButton.addEventListener('click', restartGame);
startButton.addEventListener('click', startGame);

/**
 * Handle keyboard input
 */
function handleKeyPress(event) {
    if (event.code === 'Space' && gameState.isRunning && !gameState.isPaused) {
        event.preventDefault();
        if (!clickCooldown) {
            clickCooldown = true;
            jump();
            
            // Set 0.5 second cooldown
            setTimeout(() => {
                clickCooldown = false;
            }, 500);
        }
    }
}

/**
 * Handle mouse/touch input
 */
function handleClick(event) {
    if (gameState.isRunning && !gameState.isPaused && !mathContainer.contains(event.target) && !gameOverScreen.contains(event.target) && !startScreen.contains(event.target)) {
        if (!clickCooldown) {
            clickCooldown = true;
            jump();
            
            // Set 0.5 second cooldown
            setTimeout(() => {
                clickCooldown = false;
            }, 500);
        }
    }
}

/**
 * Make the dinosaur jump
 */
function jump() {
    if (!isJumping && !jumpCooldown) {
        isJumping = true;
        jumpCooldown = true;
        dino.classList.add('jumping');
        dino.classList.remove('running');
        
        setTimeout(() => {
            dino.classList.remove('jumping');
            dino.classList.add('running');
            isJumping = false;
            
            // Add a small cooldown after landing before allowing another jump
            setTimeout(() => {
                jumpCooldown = false;
            }, 50);
        }, 500);
    }
}

/**
 * Start the game
 */
function startGame() {
    // Reset game state
    gameState = {
        isRunning: true,
        isPaused: false,
        score: 0,
        level: 1,
        obstacleCount: 0,
        difficulty: 'Easy',
        currentMathProblem: null,
        mathTimer: null,
        mathTimeLeft: 5
    };
    
    // Reset cooldowns
    isJumping = false;
    jumpCooldown = false;
    clickCooldown = false;
    
    // Reset UI
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    mathContainer.classList.add('hidden');
    scoreDisplay.textContent = 'Score: 0';
    levelDisplay.textContent = 'Level: Easy';
    
    // Clear existing obstacles
    obstacles = [];
    obstaclesContainer.innerHTML = '';
    
    // Start dinosaur animation
    dino.classList.add('running');
    
    // Start game loops
    gameLoop = setInterval(updateGame, 16); // ~60 FPS
    obstacleSpawnTimer = setInterval(spawnObstacle, 2000);
}

/**
 * Main game update loop
 */
function updateGame() {
    if (!gameState.isRunning || gameState.isPaused) return;
    
    // Update obstacles
    updateObstacles();
    
    // Check collisions
    checkCollisions();
    
    // Update score
    gameState.score += 1;
    scoreDisplay.textContent = `Score: ${gameState.score}`;
}

/**
 * Spawn obstacles (regular cactus or math cactus)
 */
function spawnObstacle() {
    if (!gameState.isRunning || gameState.isPaused) return;
    
    gameState.obstacleCount++;
    
    // Every 3rd obstacle is a math cactus (after 2 regular ones)
    if (gameState.obstacleCount % 3 === 0) {
        spawnMathCactus();
    } else {
        spawnRegularCactus();
    }
}

/**
 * Spawn a regular cactus
 */
function spawnRegularCactus() {
    const cactus = document.createElement('div');
    cactus.className = 'cactus';
    cactus.style.right = '-50px';
    
    obstaclesContainer.appendChild(cactus);
    obstacles.push({
        element: cactus,
        type: 'regular',
        x: window.innerWidth + 50
    });
}

/**
 * Spawn a math cactus and trigger math challenge
 */
function spawnMathCactus() {
    const mathCactus = document.createElement('div');
    mathCactus.className = 'math-cactus';
    mathCactus.style.right = '50%';
    mathCactus.style.transform = 'translateX(50%)';
    
    obstaclesContainer.appendChild(mathCactus);
    obstacles.push({
        element: mathCactus,
        type: 'math',
        x: window.innerWidth / 2
    });
    
    // Immediately pause game and show math problem
    gameState.isPaused = true;
    
    // Stop all animations by pausing obstacle movement
    obstacles.forEach(obstacle => {
        if (obstacle.type === 'regular') {
            obstacle.element.style.animationPlayState = 'paused';
        }
    });
    
    // Pause background animations
    document.querySelectorAll('.bg-layer').forEach(layer => {
        layer.style.animationPlayState = 'paused';
    });
    
    showMathProblem();
}

/**
 * Update obstacle positions and remove off-screen obstacles
 */
function updateObstacles() {
    obstacles = obstacles.filter(obstacle => {
        if (obstacle.type === 'math') {
            return true; // Math cactuses don't move
        }
        
        obstacle.x -= 5; // Move obstacle left
        obstacle.element.style.right = `${window.innerWidth - obstacle.x}px`;
        
        // Remove obstacle if it's off-screen
        if (obstacle.x < -100) {
            obstacle.element.remove();
            return false;
        }
        
        return true;
    });
}

/**
 * Check for collisions between dinosaur and obstacles
 */
function checkCollisions() {
    const dinoRect = dino.getBoundingClientRect();
    
    obstacles.forEach(obstacle => {
        if (obstacle.type === 'regular') {
            const obstacleRect = obstacle.element.getBoundingClientRect();
            
            // Simple collision detection
            if (dinoRect.right > obstacleRect.left &&
                dinoRect.left < obstacleRect.right &&
                dinoRect.bottom > obstacleRect.top &&
                dinoRect.top < obstacleRect.bottom) {
                gameOver();
            }
        }
    });
}

/**
 * Generate and display a math problem
 */
function showMathProblem() {
    gameState.currentMathProblem = generateMathProblem();
    mathProblem.textContent = `${gameState.currentMathProblem.question} = ?`;
    mathInput.value = '';
    mathContainer.classList.remove('hidden');
    mathInput.focus();
    
    // Start exactly 5 second timer
    gameState.mathTimeLeft = 5;
    updateMathTimer();
    gameState.mathTimer = setInterval(() => {
        gameState.mathTimeLeft--;
        updateMathTimer();
        
        if (gameState.mathTimeLeft <= 0) {
            clearInterval(gameState.mathTimer);
            // Time's up - game over
            mathContainer.classList.add('hidden');
            gameOver();
        }
    }, 1000);
}

/**
 * Update the math timer display
 */
function updateMathTimer() {
    mathTimerDisplay.textContent = `Time: ${gameState.mathTimeLeft}s`;
    mathTimerDisplay.style.color = gameState.mathTimeLeft <= 2 ? '#ff4444' : '#666';
}

/**
 * Generate a math problem based on current difficulty
 */
function generateMathProblem() {
    const diffSettings = difficulties[gameState.difficulty];
    const operations = diffSettings.operations;
    const range = diffSettings.range;
    
    let question, answer;
    
    switch (gameState.difficulty) {
        case 'Easy':
            // Simple arithmetic
            const op1 = operations[Math.floor(Math.random() * operations.length)];
            const a = Math.floor(Math.random() * range) + 1;
            const b = Math.floor(Math.random() * range) + 1;
            
            if (op1 === '+') {
                question = `${a} + ${b}`;
                answer = a + b;
            } else {
                // Ensure positive result for subtraction
                const larger = Math.max(a, b);
                const smaller = Math.min(a, b);
                question = `${larger} - ${smaller}`;
                answer = larger - smaller;
            }
            break;
            
        case 'Medium':
            // Two operations
            const op2a = operations[Math.floor(Math.random() * operations.length)];
            const op2b = operations[Math.floor(Math.random() * operations.length)];
            const x = Math.floor(Math.random() * 15) + 1;
            const y = Math.floor(Math.random() * 10) + 1;
            const z = Math.floor(Math.random() * 10) + 1;
            
            question = `${x} ${op2a} ${y} ${op2b} ${z}`;
            answer = evaluateExpression(x, op2a, y, op2b, z);
            break;
            
        case 'Hard':
            // Three numbers with mixed operations
            const ops = [
                operations[Math.floor(Math.random() * operations.length)],
                operations[Math.floor(Math.random() * operations.length)]
            ];
            const nums = [
                Math.floor(Math.random() * 20) + 1,
                Math.floor(Math.random() * 15) + 1,
                Math.floor(Math.random() * 10) + 1
            ];
            
            question = `${nums[0]} ${ops[0]} ${nums[1]} ${ops[1]} ${nums[2]}`;
            answer = evaluateExpression(nums[0], ops[0], nums[1], ops[1], nums[2]);
            break;
            
        case 'Max':
            // Four numbers with various operators
            const maxOps = [
                operations[Math.floor(Math.random() * operations.length)],
                operations[Math.floor(Math.random() * operations.length)],
                operations[Math.floor(Math.random() * operations.length)]
            ];
            const maxNums = [
                Math.floor(Math.random() * 20) + 1,
                Math.floor(Math.random() * 10) + 1,
                Math.floor(Math.random() * 10) + 1,
                Math.floor(Math.random() * 5) + 1
            ];
            
            question = `${maxNums[0]} ${maxOps[0]} ${maxNums[1]} ${maxOps[1]} ${maxNums[2]} ${maxOps[2]} ${maxNums[3]}`;
            answer = evaluateComplexExpression(maxNums, maxOps);
            break;
    }
    
    return { question, answer };
}

/**
 * Evaluate mathematical expressions with proper operator precedence
 */
function evaluateExpression(a, op1, b, op2, c) {
    // Handle operator precedence (* and / before + and -)
    if (op1 === '*' || op1 === '/') {
        const firstResult = op1 === '*' ? a * b : Math.floor(a / b);
        return op2 === '+' ? firstResult + c :
               op2 === '-' ? firstResult - c :
               op2 === '*' ? firstResult * c :
               Math.floor(firstResult / c);
    } else if (op2 === '*' || op2 === '/') {
        const secondResult = op2 === '*' ? b * c : Math.floor(b / c);
        return op1 === '+' ? a + secondResult : a - secondResult;
    } else {
        // Only + and - operations
        const firstResult = op1 === '+' ? a + b : a - b;
        return op2 === '+' ? firstResult + c : firstResult - c;
    }
}

/**
 * Evaluate complex expressions with multiple operators
 */
function evaluateComplexExpression(nums, ops) {
    let result = nums[0];
    
    for (let i = 0; i < ops.length; i++) {
        const nextNum = nums[i + 1];
        switch (ops[i]) {
            case '+': result += nextNum; break;
            case '-': result -= nextNum; break;
            case '*': result *= nextNum; break;
            case '/': result = Math.floor(result / nextNum); break;
        }
    }
    
    return Math.floor(result);
}

/**
 * Submit math answer
 */
function submitMathAnswer() {
    const userAnswer = parseInt(mathInput.value);
    
    if (userAnswer === gameState.currentMathProblem.answer) {
        correctAnswer();
    } else {
        // Wrong answer - game over immediately
        clearInterval(gameState.mathTimer);
        mathContainer.classList.add('hidden');
        gameOver();
    }
}

/**
 * Handle correct math answer
 */
function correctAnswer() {
    clearInterval(gameState.mathTimer);
    mathContainer.classList.add('hidden');
    
    // Remove math cactus
    const mathCactusIndex = obstacles.findIndex(obs => obs.type === 'math');
    if (mathCactusIndex !== -1) {
        obstacles[mathCactusIndex].element.remove();
        obstacles.splice(mathCactusIndex, 1);
    }
    
    // Resume all animations
    obstacles.forEach(obstacle => {
        if (obstacle.type === 'regular') {
            obstacle.element.style.animationPlayState = 'running';
        }
    });
    
    // Resume background animations
    document.querySelectorAll('.bg-layer').forEach(layer => {
        layer.style.animationPlayState = 'running';
    });
    
    // Increase difficulty every 2 math problems
    if (gameState.obstacleCount % 6 === 0) {
        increaseDifficulty();
    }
    
    // Resume game after correct answer
    gameState.isPaused = false;
    gameState.score += 100; // Bonus points for correct answer
}

/**
 * Increase game difficulty
 */
function increaseDifficulty() {
    const difficulties_order = ['Easy', 'Medium', 'Hard', 'Max'];
    const currentIndex = difficulties_order.indexOf(gameState.difficulty);
    
    if (currentIndex < difficulties_order.length - 1) {
        gameState.difficulty = difficulties_order[currentIndex + 1];
        gameState.level++;
        levelDisplay.textContent = `Level: ${gameState.difficulty}`;
    }
}

/**
 * End the game
 */
function gameOver() {
    gameState.isRunning = false;
    clearInterval(gameLoop);
    clearInterval(obstacleSpawnTimer);
    if (gameState.mathTimer) {
        clearInterval(gameState.mathTimer);
    }
    
    // Stop dinosaur animation and freeze in place
    dino.classList.remove('running');
    dino.classList.add('frozen');
    
    // Freeze all obstacles in place
    obstacles.forEach(obstacle => {
        if (obstacle.element) {
            obstacle.element.style.animationPlayState = 'paused';
        }
    });
    
    // Pause background animations
    document.querySelectorAll('.bg-layer').forEach(layer => {
        layer.style.animationPlayState = 'paused';
    });
    
    // Show game over screen
    finalScoreDisplay.textContent = `Final Score: ${gameState.score}`;
    gameOverScreen.classList.remove('hidden');
    
    // Reset asteroid
    setTimeout(() => {
        asteroid.classList.remove('asteroid-falling');
        asteroid.classList.add('hidden');
        asteroid.style.top = '-100px';
    }, 1000);
}

/**
 * Restart the game
 */
function restartGame() {
    // Clear all intervals
    clearInterval(gameLoop);
    clearInterval(obstacleSpawnTimer);
    if (gameState.mathTimer) {
        clearInterval(gameState.mathTimer);
    }
    
    // Reset dinosaur
    dino.classList.remove('jumping', 'running', 'frozen');
    isJumping = false;
    jumpCooldown = false;
    clickCooldown = false;
    
    // Reset background and obstacle animations
    document.querySelectorAll('.bg-layer').forEach(layer => {
        layer.style.animationPlayState = 'running';
    });
    
    // Clear obstacles
    obstacles.forEach(obstacle => obstacle.element.remove());
    obstacles = [];
    
    // Hide all screens except start screen
    gameOverScreen.classList.add('hidden');
    mathContainer.classList.add('hidden');
    startScreen.classList.remove('hidden');
}

// Initialize the game
window.addEventListener('load', () => {
    // Game starts with start screen visible
    console.log('Math Dino Runner loaded!');
});
