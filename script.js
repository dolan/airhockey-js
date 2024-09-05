const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const touchControls = document.getElementById('touchControls');
const player1Touch = document.getElementById('player1Touch');
const player2Touch = document.getElementById('player2Touch');

let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Sound effects
const thudSound = new Audio('./snd/thud.wav');
thudSound.preload = 'auto';
const clackSound = new Audio('./snd/clack.wav');
clackSound.preload = 'auto';
const clickSound = new Audio('./snd/click.wav');
clickSound.preload = 'auto';
const clickShuffleSound = new Audio('./snd/click-shuffle.wav');
clickShuffleSound.preload = 'auto';
const goalSound = new Audio('./snd/goal.wav');
goalSound.preload = 'auto';

function playSound(sound) {
    // Stop all currently playing sounds
    [thudSound, clackSound, clickSound, clickShuffleSound, goalSound].forEach(s => {
        s.pause();
        s.currentTime = 0;
    });
    
    // Play the new sound
    sound.currentTime = 0;
    sound.play();
}

// Game variables
let gameWidth, gameHeight;
let paddleWidth, paddleHeight, puckSize;
let player1 = {}, player2 = {}, puck = {};
let score = {player1: 0, player2: 0};
let gameStarted = false;

// Puck physics constants
const MIN_SPEED = 2;
const MAX_SPEED = 8;
const BASE_ACCELERATION = 0.005;

// Input variables
let keys = {};
let touchData = {player1: {}, player2: {}};

function setupGame() {
    gameWidth = window.innerWidth;
    gameHeight = window.innerHeight;

    if (isMobile) {
        paddleWidth = gameWidth * 0.2;
        paddleHeight = gameHeight * 0.02;
        puckSize = gameWidth * 0.05;
        touchControls.style.display = 'block';
    } else {
        gameWidth = Math.min(window.innerWidth, 800);
        gameHeight = gameWidth * 0.6;
        paddleWidth = gameWidth * 0.15;
        paddleHeight = gameHeight * 0.02;
        puckSize = gameWidth * 0.03;
    }

    canvas.width = gameWidth;
    canvas.height = gameHeight;

    // Initialize game objects
    player1 = {
        x: gameWidth / 2 - paddleWidth / 2,
        y: gameHeight - paddleHeight * 2,
        width: paddleWidth,
        height: paddleHeight,
        speed: 0,
        charge: 0
    };

    player2 = {
        x: gameWidth / 2 - paddleWidth / 2,
        y: paddleHeight * 2,
        width: paddleWidth,
        height: paddleHeight,
        speed: 0,
        charge: 0
    };

    resetPuck();
}

function update() {
    if (isMobile) {
        updateMobilePaddles();
    } else {
        updateDesktopPaddles();
    }

    if (gameStarted) {
        updatePuck();
        handleWallCollisions();
        handlePaddleCollisions();
    }
}

function updatePuck() {
    const oldY = puck.y;
    puck.x += puck.speedX;
    puck.y += puck.speedY;

    let speed = Math.sqrt(puck.speedX * puck.speedX + puck.speedY * puck.speedY);

    let accelerationFactor = 1 - (speed / MAX_SPEED);
    let currentAcceleration = BASE_ACCELERATION * accelerationFactor;

    if (speed < MAX_SPEED) {
        let factor = 1 + currentAcceleration;
        puck.speedX *= factor;
        puck.speedY *= factor;
    }

    if (speed < MIN_SPEED) {
        let angle = Math.atan2(puck.speedY, puck.speedX);
        puck.speedX = MIN_SPEED * Math.cos(angle);
        puck.speedY = MIN_SPEED * Math.sin(angle);
    }

    if (speed > MAX_SPEED) {
        let factor = MAX_SPEED / speed;
        puck.speedX *= factor;
        puck.speedY *= factor;
    }

    // Check if puck changed direction without hitting a wall
    if ((oldY < gameHeight / 2 && puck.y >= gameHeight / 2) ||
        (oldY >= gameHeight / 2 && puck.y < gameHeight / 2)) {
        playSound(clickShuffleSound);
    }
}

function updateMobilePaddles() {
    if (touchData.player1.active) {
        const newX = Math.max(0, Math.min(gameWidth - paddleWidth, touchData.player1.x - paddleWidth / 2));
        player1.speed = newX - player1.x;
        player1.x = newX;
    }
    if (touchData.player2.active) {
        const newX = Math.max(0, Math.min(gameWidth - paddleWidth, touchData.player2.x - paddleWidth / 2));
        player2.speed = newX - player2.x;
        player2.x = newX;
    }
}

function updateDesktopPaddles() {
    const moveSpeed = 5;
    player1.speed = 0;
    player2.speed = 0;
    if (keys['z']) {
        player1.x = Math.max(0, player1.x - moveSpeed);
        player1.speed = -moveSpeed;
    }
    if (keys['x']) {
        player1.x = Math.min(gameWidth - paddleWidth, player1.x + moveSpeed);
        player1.speed = moveSpeed;
    }
    if (keys['ArrowLeft']) {
        player2.x = Math.max(0, player2.x - moveSpeed);
        player2.speed = -moveSpeed;
    }
    if (keys['ArrowRight']) {
        player2.x = Math.min(gameWidth - paddleWidth, player2.x + moveSpeed);
        player2.speed = moveSpeed;
    }
}

function handleWallCollisions() {
    if (puck.x - puck.radius < 0 || puck.x + puck.radius > gameWidth) {
        puck.speedX *= -1;
        playSound(thudSound);
    }
    if (puck.y - puck.radius < 0) {
        score.player1++;
        playSound(goalSound);
        resetPuck();
    } else if (puck.y + puck.radius > gameHeight) {
        score.player2++;
        playSound(goalSound);
        resetPuck();
    }
}

function handlePaddleCollisions() {
    if (circleRectCollision(puck, player1)) {
        puck.speedY = -Math.abs(puck.speedY) - 2;
        puck.speedX += (puck.x - (player1.x + paddleWidth / 2)) / 10;
        playPaddleHitSound(player1);
    }
    if (circleRectCollision(puck, player2)) {
        puck.speedY = Math.abs(puck.speedY) + 2;
        puck.speedX += (puck.x - (player2.x + paddleWidth / 2)) / 10;
        playPaddleHitSound(player2);
    }
}

function playPaddleHitSound(player) {
    const paddleSpeed = Math.abs(player.speed);
    if (paddleSpeed > 3) {
        playSound(clackSound);
    } else {
        playSound(clickSound);
    }
}

function circleRectCollision(circle, rect) {
    let testX = circle.x;
    let testY = circle.y;

    if (circle.x < rect.x) testX = rect.x;
    else if (circle.x > rect.x + rect.width) testX = rect.x + rect.width;
    if (circle.y < rect.y) testY = rect.y;
    else if (circle.y > rect.y + rect.height) testY = rect.y + rect.height;

    let distX = circle.x - testX;
    let distY = circle.y - testY;
    let distance = Math.sqrt((distX * distX) + (distY * distY));

    return distance <= circle.radius;
}

function resetPuck() {
    puck = {
        x: gameWidth / 2,
        y: gameHeight / 2,
        radius: puckSize / 2,
        speedX: 0,
        speedY: 0
    };
    gameStarted = false;
}

function startGame() {
    if (!gameStarted) {
        gameStarted = true;
        const currentTime = new Date().getTime();
        const random = Math.sin(currentTime) * 10000;
        const angle = random * Math.PI * 2;
        puck.speedX = MIN_SPEED * Math.cos(angle);
        puck.speedY = MIN_SPEED * Math.sin(angle);
    }
}

function draw() {
    ctx.clearRect(0, 0, gameWidth, gameHeight);

    // Draw court
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, gameWidth, gameHeight);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, gameHeight / 2);
    ctx.lineTo(gameWidth, gameHeight / 2);
    ctx.stroke();

    // Draw goal lines
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, paddleHeight * 2);
    ctx.lineTo(gameWidth, paddleHeight * 2);
    ctx.moveTo(0, gameHeight - paddleHeight * 2);
    ctx.lineTo(gameWidth, gameHeight - paddleHeight * 2);
    ctx.stroke();

    // Draw paddles
    ctx.fillStyle = 'red';
    ctx.fillRect(player1.x, player1.y, player1.width, player1.height);
    ctx.fillStyle = 'blue';
    ctx.fillRect(player2.x, player2.y, player2.width, player2.height);

    // Draw puck
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(puck.x, puck.y, puck.radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw score
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(score.player2 + ' - ' + score.player1, gameWidth / 2, gameHeight / 2);

    // Draw start message
    if (!gameStarted) {
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Click or touch to start', gameWidth / 2, gameHeight / 2 + 30);
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Event listeners
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    startGame();
});
window.addEventListener('keyup', (e) => keys[e.key] = false);

function handleTouch(e, player) {
    e.preventDefault();
    startGame();
    const touch = e.touches[0];
    const rect = e.target.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    touchData[player] = {
        active: true,
        x: x
    };
}

function handleTouchEnd(player) {
    touchData[player] = {active: false};
}

player1Touch.addEventListener('touchmove', (e) => handleTouch(e, 'player1'));
player2Touch.addEventListener('touchmove', (e) => handleTouch(e, 'player2'));
player1Touch.addEventListener('touchend', () => handleTouchEnd('player1'));
player2Touch.addEventListener('touchend', () => handleTouchEnd('player2'));

canvas.addEventListener('click', startGame);

window.addEventListener('resize', setupGame);

// Prevent default touch behavior
document.body.addEventListener('touchstart', function(e) {
    if (e.target == canvas) {
        e.preventDefault();
    }
}, {passive: false});
document.body.addEventListener('touchend', function(e) {
    if (e.target == canvas) {
        e.preventDefault();
    }
}, {passive: false});
document.body.addEventListener('touchmove', function(e) {
    if (e.target == canvas) {
        e.preventDefault();
    }
}, {passive: false});   
