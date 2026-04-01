// ==========================================
// Advanced Snake Game Engine
// ==========================================

// --- DOM Elements ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const currentScoreEl = document.getElementById('currentScore');
const highScoreEl = document.getElementById('highScore');
const overlay = document.getElementById('gameOverlay');
const overlayTitle = document.getElementById('overlayTitle');
const finalScoreEl = document.getElementById('finalScore');
const modalBtn = document.getElementById('modalBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const soundBtn = document.getElementById('soundBtn');
const speedBtns = document.querySelectorAll('.toggle-btn');
const modalStats = document.getElementById('modalStats');
const gameContainer = document.querySelector('.game-container');

// Mobile D-Pad
const btnUp = document.getElementById('dpadUp');
const btnDown = document.getElementById('dpadDown');
const btnLeft = document.getElementById('dpadLeft');
const btnRight = document.getElementById('dpadRight');

// --- Game Settings ---
const GRID_SIZE = 20;
let TILE_SIZE = canvas.width / GRID_SIZE; // 600 / 20 = 30
let GAME_SPEED = 120; // ms per tick

const SPEEDS = {
  slow: 160,
  normal: 120,
  fast: 70
};

// --- Game State ---
let snake = [];
let food = null;
let direction = { x: 0, y: -1 };
let nextDirection = { x: 0, y: -1 }; // Prevent rapid reverse-suicide
let score = 0;
let highScore = 0;
try {
  highScore = localStorage.getItem('snakeHighScore') || 0;
} catch(e) {
  console.log("localStorage blocked - running without saves");
}
highScoreEl.innerText = highScore;

const COLORS = {
  head: '#00f3ff',
  body: '#00b8ff',
  food: '#ff0055'
};

let lastTime = 0;
let renderDelta = 0;
let isPaused = false;
let isGameOver = false;
let reqFrameId = null;
let glowPhase = 0; // For pulsing animations

let soundEnabled = true;
let effectPhase = 0; // for background grid scroll

// --- Audio Synthesizer ---
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playSound(type) {
  if (!soundEnabled) return;
  initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  const now = audioCtx.currentTime;
  
  if (type === 'eat') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);
  } else if (type === 'die') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc.start(now);
    osc.stop(now + 0.3);
  } else if (type === 'click') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(600, now);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    osc.start(now);
    osc.stop(now + 0.05);
  }
}

// --- Input Handling ---
window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
    e.preventDefault(); // Prevent scrolling
  }
  
  if (e.key === ' ' && !isGameOver) {
    togglePause();
    return;
  }
  
  handleDirection(e.key);
});

function handleDirection(key) {
  if (isPaused || isGameOver) return;
  
  const rules = {
    'ArrowUp': {x: 0, y: -1}, 'w': {x: 0, y: -1}, 'W': {x: 0, y: -1},
    'ArrowDown': {x: 0, y: 1}, 's': {x: 0, y: 1}, 'S': {x: 0, y: 1},
    'ArrowLeft': {x: -1, y: 0}, 'a': {x: -1, y: 0}, 'A': {x: -1, y: 0},
    'ArrowRight': {x: 1, y: 0}, 'd': {x: 1, y: 0}, 'D': {x: 1, y: 0}
  };
  
  const newDir = rules[key];
  if (!newDir) return;
  
  // Prevent 180 degree turns
  if (direction.x !== 0 && newDir.x !== 0 && direction.x !== newDir.x) return;
  if (direction.y !== 0 && newDir.y !== 0 && direction.y !== newDir.y) return;
  
  nextDirection = newDir;
}

// Map D-pad
btnUp.addEventListener('click', () => handleDirection('w'));
btnDown.addEventListener('click', () => handleDirection('s'));
btnLeft.addEventListener('click', () => handleDirection('a'));
btnRight.addEventListener('click', () => handleDirection('d'));

// Touch Swipe Handling
let touchStartX = 0;
let touchStartY = 0;

window.addEventListener('touchstart', (e) => {
  touchStartX = e.changedTouches[0].screenX;
  touchStartY = e.changedTouches[0].screenY;
}, {passive: true});

window.addEventListener('touchend', (e) => {
  const touchEndX = e.changedTouches[0].screenX;
  const touchEndY = e.changedTouches[0].screenY;
  handleSwipe(touchStartX, touchStartY, touchEndX, touchEndY);
}, {passive: true});

function handleSwipe(startX, startY, endX, endY) {
  const diffX = endX - startX;
  const diffY = endY - startY;
  const absX = Math.abs(diffX);
  const absY = Math.abs(diffY);

  if (Math.max(absX, absY) < 30) return; // Ignore small swipes

  if (absX > absY) {
    // Horizontal swipe
    handleDirection(diffX > 0 ? 'd' : 'a');
  } else {
    // Vertical swipe
    handleDirection(diffY > 0 ? 's' : 'w');
  }
}

// --- UI Buttons ---
pauseBtn.addEventListener('click', togglePause);
resetBtn.addEventListener('click', initGame);
modalBtn.addEventListener('click', initGame);

soundBtn.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  playSound('click');
  if (soundEnabled) {
    soundBtn.classList.remove('off');
  } else {
    soundBtn.classList.add('off');
  }
});

speedBtns.forEach(btn => {
  btn.addEventListener('click', (e) => {
    playSound('click');
    speedBtns.forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    GAME_SPEED = SPEEDS[e.target.dataset.speed];
  });
});

function togglePause() {
  if (isGameOver) return;
  playSound('click');
  isPaused = !isPaused;
  
  if (isPaused) {
    overlayTitle.innerText = 'PAUSED';
    overlayTitle.style.color = 'var(--text-primary)';
    modalStats.style.display = 'none';
    modalBtn.innerText = 'RESUME';
    overlay.classList.remove('hidden');
    cancelAnimationFrame(reqFrameId);
  } else {
    overlay.classList.add('hidden');
    lastTime = performance.now();
    reqFrameId = requestAnimationFrame(gameLoop);
  }
}

// --- Game Logic ---

function initGame() {
  playSound('click');
  gameContainer.classList.remove('shake');
  
  // Create snake: 3 blocks long, starting near middle
  const startX = Math.floor(GRID_SIZE / 2);
  const startY = Math.floor(GRID_SIZE / 2);
  snake = [
    {x: startX, y: startY},
    {x: startX, y: startY + 1},
    {x: startX, y: startY + 2}
  ];
  
  direction = {x: 0, y: -1};
  nextDirection = {x: 0, y: -1};
  score = 0;
  updateScore(0);
  
  isGameOver = false;
  isPaused = false;
  overlay.classList.add('hidden');
  
  spawnFood();
  
  if (reqFrameId) {
    cancelAnimationFrame(reqFrameId);
  }
  
  lastTime = performance.now();
  reqFrameId = requestAnimationFrame(gameLoop);
}

function spawnFood() {
  let emptyCells = [];
  for(let x=0; x<GRID_SIZE; x++){
    for(let y=0; y<GRID_SIZE; y++){
      // check if inside snake
      if (!snake.some(segment => segment.x === x && segment.y === y)) {
        emptyCells.push({x, y});
      }
    }
  }
  
  if (emptyCells.length === 0) {
    // You won the game technically, but let's just trigger over
    triggerGameOver();
    return;
  }
  
  const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  food = randomCell;
}

function updateScore(add) {
  score += add;
  currentScoreEl.innerText = score;
  
  if (add > 0) {
    currentScoreEl.classList.add('score-pulse');
    setTimeout(() => currentScoreEl.classList.remove('score-pulse'), 150);
  }
  
  if (score > highScore) {
    highScore = score;
    highScoreEl.innerText = highScore;
    try {
      localStorage.setItem('snakeHighScore', highScore);
    } catch(e) {}
  }
  
  // Auto-increase speed slightly based on score for dynamic difficulty
  if (add > 0 && score % 50 === 0 && GAME_SPEED > 50) {
    GAME_SPEED -= 5; 
  }
}

function triggerGameOver() {
  playSound('die');
  isGameOver = true;
  cancelAnimationFrame(reqFrameId);
  
  gameContainer.classList.add('shake');
  setTimeout(() => gameContainer.classList.remove('shake'), 400);
  
  overlayTitle.innerText = 'GAME OVER';
  overlayTitle.style.color = ''; // reset to css default
  modalStats.style.display = 'block';
  finalScoreEl.innerText = score;
  modalBtn.innerText = 'RESTART';
  
  overlay.classList.remove('hidden');
}

function update() {
  direction = nextDirection;
  
  const head = snake[0];
  const nextHead = {
    x: head.x + direction.x,
    y: head.y + direction.y
  };
  
  // Check Wall Collision
  if (
    nextHead.x < 0 || nextHead.x >= GRID_SIZE || 
    nextHead.y < 0 || nextHead.y >= GRID_SIZE
  ) {
    triggerGameOver();
    return;
  }
  
  // Check Self Collision
  if (snake.some(segment => segment.x === nextHead.x && segment.y === nextHead.y)) {
    triggerGameOver();
    return;
  }
  
  // Move logic
  snake.unshift(nextHead); // Add new head
  
  // Check Eat
  if (nextHead.x === food.x && nextHead.y === food.y) {
    playSound('eat');
    updateScore(10);
    spawnFood();
  } else {
    snake.pop(); // Remove tail if not eating
  }
}

// --- Render Loop ---

function drawGrid() {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  for(let i=0; i<=GRID_SIZE; i++){
    ctx.beginPath();
    ctx.moveTo(i * TILE_SIZE, 0);
    ctx.lineTo(i * TILE_SIZE, canvas.height);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(0, i * TILE_SIZE);
    ctx.lineTo(canvas.width, i * TILE_SIZE);
    ctx.stroke();
  }
}

function drawSnake() {
  snake.forEach((segment, index) => {
    const x = segment.x * TILE_SIZE;
    const y = segment.y * TILE_SIZE;
    
    // Head vs Body coloring
    const isHead = index === 0;
    
    ctx.fillStyle = isHead ? COLORS.head : COLORS.body;
    
    // Add glow to head
    if (isHead) {
      ctx.shadowBlur = 15;
      ctx.shadowColor = COLORS.head;
    } else {
      ctx.shadowBlur = 5;
      ctx.shadowColor = COLORS.body;
      // Tail fade
      ctx.globalAlpha = 1 - (index / (snake.length + 5));
    }
    
    // Draw rounded rect equivalent
    const padding = 2; // leave gap between segments
    ctx.fillRect(x + padding, y + padding, TILE_SIZE - padding*2, TILE_SIZE - padding*2);
    
    // Reset effects
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1.0;
    
    // Eyes on head
    if (isHead) {
      ctx.fillStyle = '#020617';
      const eyeOffset = 6;
      const eyeSize = 3;
      
      let e1x, e1y, e2x, e2y;
      
      // Determine eye positions based on direction
      if (direction.x === 1) { // Right
        e1x = x + TILE_SIZE - eyeOffset; e1y = y + eyeOffset;
        e2x = x + TILE_SIZE - eyeOffset; e2y = y + TILE_SIZE - eyeOffset;
      } else if (direction.x === -1) { // Left
        e1x = x + eyeOffset; e1y = y + eyeOffset;
        e2x = x + eyeOffset; e2y = y + TILE_SIZE - eyeOffset;
      } else if (direction.y === 1) { // Down
        e1x = x + eyeOffset; e1y = y + TILE_SIZE - eyeOffset;
        e2x = x + TILE_SIZE - eyeOffset; e2y = y + TILE_SIZE - eyeOffset;
      } else { // Up
        e1x = x + eyeOffset; e1y = y + eyeOffset;
        e2x = x + TILE_SIZE - eyeOffset; e2y = y + eyeOffset;
      }
      
      ctx.fillRect(e1x - eyeSize/2, e1y - eyeSize/2, eyeSize, eyeSize);
      ctx.fillRect(e2x - eyeSize/2, e2y - eyeSize/2, eyeSize, eyeSize);
    }
  });
}

function drawFood(time) {
  if (!food) return;
  
  const x = food.x * TILE_SIZE;
  const y = food.y * TILE_SIZE;
  const center = TILE_SIZE / 2;
  
  // Calculate pulse based on time
  const pulse = Math.sin(time / 150) * 0.15 + 1; // scale between 0.85 and 1.15
  
  ctx.save();
  ctx.translate(x + center, y + center);
  ctx.scale(pulse, pulse);
  
  // Glow effect
  ctx.shadowBlur = 20;
  ctx.shadowColor = COLORS.food;
  
  // Draw diamond apple
  ctx.fillStyle = COLORS.food;
  ctx.beginPath();
  let size = (TILE_SIZE / 2) - 4;
  ctx.moveTo(0, -size);
  ctx.lineTo(size, 0);
  ctx.lineTo(0, size);
  ctx.lineTo(-size, 0);
  ctx.fill();
  
  ctx.restore();
}

function render(time) {
  // Clear canvas completely
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw base
  ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  drawGrid();
  drawFood(time);
  drawSnake();
}

function gameLoop(timestamp) {
  if (isPaused || isGameOver) return;
  
  reqFrameId = requestAnimationFrame(gameLoop);
  
  const deltaTime = timestamp - lastTime;
  
  // Logic Update interval (Fixed game speed tick)
  if (deltaTime >= GAME_SPEED) {
    update();
    lastTime = timestamp;
  }
  
  // Visual render at 60 FPS
  render(timestamp);
}

// Start sequence
window.onload = () => {
  // Wait a moment before starting to let styles load
  setTimeout(() => initGame(), 100);
};
