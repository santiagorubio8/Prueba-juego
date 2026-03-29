const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = {
  I: '#00f0f0',
  O: '#f0f000',
  T: '#a000f0',
  S: '#00f000',
  Z: '#f00000',
  J: '#0000f0',
  L: '#f0a000',
};

const PIECES = {
  I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  O: [[1,1],[1,1]],
  T: [[0,1,0],[1,1,1],[0,0,0]],
  S: [[0,1,1],[1,1,0],[0,0,0]],
  Z: [[1,1,0],[0,1,1],[0,0,0]],
  J: [[1,0,0],[1,1,1],[0,0,0]],
  L: [[0,0,1],[1,1,1],[0,0,0]],
};

const SCORES = [0, 100, 300, 500, 800];

const boardCanvas = document.getElementById('board');
const boardCtx = boardCanvas.getContext('2d');
const nextCanvas = document.getElementById('next-piece');
const nextCtx = nextCanvas.getContext('2d');

const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const linesEl = document.getElementById('lines');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const overlayBtn = document.getElementById('overlay-btn');

let board, currentPiece, nextPiece, score, level, lines, gameLoop, paused, gameOver;

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function randomPiece() {
  const keys = Object.keys(PIECES);
  const key = keys[Math.floor(Math.random() * keys.length)];
  return {
    type: key,
    color: COLORS[key],
    matrix: PIECES[key].map(row => [...row]),
    x: Math.floor(COLS / 2) - Math.floor(PIECES[key][0].length / 2),
    y: 0,
  };
}

function rotate(matrix) {
  const N = matrix.length;
  const result = Array.from({ length: N }, () => Array(N).fill(0));
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++)
      result[c][N - 1 - r] = matrix[r][c];
  return result;
}

function isValid(piece, board, dx = 0, dy = 0, matrix = null) {
  const m = matrix || piece.matrix;
  for (let r = 0; r < m.length; r++) {
    for (let c = 0; c < m[r].length; c++) {
      if (!m[r][c]) continue;
      const nx = piece.x + c + dx;
      const ny = piece.y + r + dy;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return false;
      if (ny >= 0 && board[ny][nx]) return false;
    }
  }
  return true;
}

function merge(piece, board) {
  piece.matrix.forEach((row, r) => {
    row.forEach((val, c) => {
      if (val) {
        const ny = piece.y + r;
        const nx = piece.x + c;
        if (ny >= 0) board[ny][nx] = piece.color;
      }
    });
  });
}

function clearLines(board) {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(cell => cell !== null)) {
      board.splice(r, 1);
      board.unshift(Array(COLS).fill(null));
      cleared++;
      r++;
    }
  }
  return cleared;
}

function drawBlock(ctx, x, y, color, size = BLOCK) {
  ctx.fillStyle = color;
  ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  ctx.fillRect(x * size + 1, y * size + 1, 4, size - 2);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(x * size + 1, y * size + size - 5, size - 2, 4);
  ctx.fillRect(x * size + size - 5, y * size + 1, 4, size - 2);
}

function drawGhost(piece, board) {
  let ghostY = piece.y;
  while (isValid(piece, board, 0, ghostY - piece.y + 1)) ghostY++;
  if (ghostY === piece.y) return;
  piece.matrix.forEach((row, r) => {
    row.forEach((val, c) => {
      if (val) {
        const x = piece.x + c;
        const y = ghostY + r;
        if (y >= 0 && y < ROWS) {
          boardCtx.strokeStyle = piece.color + '60';
          boardCtx.lineWidth = 2;
          boardCtx.strokeRect(x * BLOCK + 2, y * BLOCK + 2, BLOCK - 4, BLOCK - 4);
        }
      }
    });
  });
}

function drawBoard() {
  boardCtx.clearRect(0, 0, boardCanvas.width, boardCanvas.height);

  // Grid
  boardCtx.strokeStyle = '#1a1a3a';
  boardCtx.lineWidth = 0.5;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      boardCtx.strokeRect(c * BLOCK, r * BLOCK, BLOCK, BLOCK);
    }
  }

  // Placed blocks
  board.forEach((row, r) => {
    row.forEach((color, c) => {
      if (color) drawBlock(boardCtx, c, r, color);
    });
  });

  // Ghost piece
  if (currentPiece && !gameOver) drawGhost(currentPiece, board);

  // Current piece
  if (currentPiece && !gameOver) {
    currentPiece.matrix.forEach((row, r) => {
      row.forEach((val, c) => {
        if (val) {
          const x = currentPiece.x + c;
          const y = currentPiece.y + r;
          if (y >= 0) drawBlock(boardCtx, x, y, currentPiece.color);
        }
      });
    });
  }
}

function drawNext() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  if (!nextPiece) return;
  const size = 24;
  const m = nextPiece.matrix;
  const offsetX = Math.floor((nextCanvas.width / size - m[0].length) / 2);
  const offsetY = Math.floor((nextCanvas.height / size - m.length) / 2);
  m.forEach((row, r) => {
    row.forEach((val, c) => {
      if (val) {
        nextCtx.fillStyle = nextPiece.color;
        nextCtx.fillRect((offsetX + c) * size + 1, (offsetY + r) * size + 1, size - 2, size - 2);
        nextCtx.fillStyle = 'rgba(255,255,255,0.2)';
        nextCtx.fillRect((offsetX + c) * size + 1, (offsetY + r) * size + 1, size - 2, 4);
      }
    });
  });
}

function getSpeed() {
  return Math.max(100, 800 - (level - 1) * 70);
}

function spawnPiece() {
  currentPiece = nextPiece || randomPiece();
  nextPiece = randomPiece();
  drawNext();
  if (!isValid(currentPiece, board)) {
    endGame();
  }
}

function drop() {
  if (paused || gameOver) return;
  if (isValid(currentPiece, board, 0, 1)) {
    currentPiece.y++;
  } else {
    merge(currentPiece, board);
    const cleared = clearLines(board);
    if (cleared > 0) {
      score += SCORES[cleared] * level;
      lines += cleared;
      level = Math.floor(lines / 10) + 1;
      scoreEl.textContent = score;
      levelEl.textContent = level;
      linesEl.textContent = lines;
      clearTimeout(gameLoop);
      gameLoop = setTimeout(tick, getSpeed());
    }
    spawnPiece();
  }
  drawBoard();
}

function tick() {
  drop();
  if (!gameOver) gameLoop = setTimeout(tick, getSpeed());
}

function hardDrop() {
  while (isValid(currentPiece, board, 0, 1)) {
    currentPiece.y++;
    score += 2;
  }
  scoreEl.textContent = score;
  drop();
}

function startGame() {
  board = createBoard();
  score = 0;
  level = 1;
  lines = 0;
  paused = false;
  gameOver = false;
  scoreEl.textContent = '0';
  levelEl.textContent = '1';
  linesEl.textContent = '0';
  overlay.classList.add('hidden');
  nextPiece = randomPiece();
  spawnPiece();
  clearTimeout(gameLoop);
  gameLoop = setTimeout(tick, getSpeed());
  startBtn.textContent = 'REINICIAR';
  pauseBtn.disabled = false;
  pauseBtn.textContent = 'PAUSA';
}

function endGame() {
  gameOver = true;
  clearTimeout(gameLoop);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score}`;
  overlay.classList.remove('hidden');
  pauseBtn.disabled = true;
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  pauseBtn.textContent = paused ? 'CONTINUAR' : 'PAUSA';
  if (!paused) {
    gameLoop = setTimeout(tick, getSpeed());
  } else {
    clearTimeout(gameLoop);
  }
}

document.addEventListener('keydown', e => {
  if (!currentPiece || gameOver) return;
  if (paused && e.key !== 'p' && e.key !== 'P') return;

  switch (e.key) {
    case 'ArrowLeft':
      if (isValid(currentPiece, board, -1, 0)) { currentPiece.x--; drawBoard(); }
      e.preventDefault();
      break;
    case 'ArrowRight':
      if (isValid(currentPiece, board, 1, 0)) { currentPiece.x++; drawBoard(); }
      e.preventDefault();
      break;
    case 'ArrowDown':
      drop();
      score += 1;
      scoreEl.textContent = score;
      e.preventDefault();
      break;
    case 'ArrowUp':
      const rotated = rotate(currentPiece.matrix);
      if (isValid(currentPiece, board, 0, 0, rotated)) {
        currentPiece.matrix = rotated;
        drawBoard();
      } else if (isValid(currentPiece, board, 1, 0, rotated)) {
        currentPiece.matrix = rotated;
        currentPiece.x++;
        drawBoard();
      } else if (isValid(currentPiece, board, -1, 0, rotated)) {
        currentPiece.matrix = rotated;
        currentPiece.x--;
        drawBoard();
      }
      e.preventDefault();
      break;
    case ' ':
      hardDrop();
      e.preventDefault();
      break;
    case 'p':
    case 'P':
      togglePause();
      break;
  }
});

startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', togglePause);
overlayBtn.addEventListener('click', startGame);

// Initial draw
board = createBoard();
drawBoard();
