// js/worker.js - Connect 4 AI Web Worker
// Performs high-performance minimax calculations off the main thread.

self.onmessage = function(e) {
  const { board, depth, aiPlayer } = e.data;
  const bestMove = getBestMove(board, depth, aiPlayer);
  self.postMessage({ bestMove });
};

const COLS = 7;
const ROWS = 6;

// Get best move using Minimax with Alpha-Beta Pruning
function getBestMove(board, depth, aiPlayer) {
  const validMoves = getValidMoves(board);
  if (validMoves.length === 0) return -1;
  if (validMoves.length === 1) return validMoves[0];

  // Move ordering: prioritize center columns
  const moveOrder = [3, 2, 4, 1, 5, 0, 6];
  validMoves.sort((a, b) => moveOrder.indexOf(a) - moveOrder.indexOf(b));

  let bestMove = validMoves[0];
  let bestValue = -Infinity;
  let alpha = -Infinity;
  let beta = Infinity;

  // 1. Double check if there is an immediate winning move for the AI
  for (const col of validMoves) {
    const row = getLowestEmptyRow(board, col);
    board[row * COLS + col] = aiPlayer;
    if (checkWinAt(board, col, row, aiPlayer)) {
      board[row * COLS + col] = 0; // undo
      return col; // Win immediately
    }
    board[row * COLS + col] = 0; // undo
  }

  // 2. Double check if there is an immediate winning move for the Player (must block!)
  const humanPlayer = aiPlayer === 1 ? 2 : 1;
  for (const col of validMoves) {
    const row = getLowestEmptyRow(board, col);
    board[row * COLS + col] = humanPlayer;
    if (checkWinAt(board, col, row, humanPlayer)) {
      board[row * COLS + col] = 0; // undo
      return col; // Block immediate threat immediately
    }
    board[row * COLS + col] = 0; // undo
  }

  // 3. Perform minimax search
  for (const col of validMoves) {
    const row = getLowestEmptyRow(board, col);
    board[row * COLS + col] = aiPlayer; // Make move

    const value = minimaxSearch(board, depth - 1, alpha, beta, false, aiPlayer, col, row, aiPlayer);
    board[row * COLS + col] = 0; // Undo move

    if (value > bestValue) {
      bestValue = value;
      bestMove = col;
    }
    alpha = Math.max(alpha, value);
  }

  return bestMove;
}

// Minimax search with Alpha-Beta pruning
function minimaxSearch(board, depth, alpha, beta, isMaximizing, aiPlayer, lastCol, lastRow, lastPlayer) {
  const humanPlayer = aiPlayer === 1 ? 2 : 1;

  // Check terminal win condition from the last move
  if (lastCol !== undefined && lastCol !== -1) {
    if (checkWinAt(board, lastCol, lastRow, lastPlayer)) {
      return lastPlayer === aiPlayer ? (1000000 + depth) : (-1000000 - depth);
    }
  }

  const validMoves = getValidMoves(board);
  if (validMoves.length === 0) {
    return 0; // Draw
  }

  if (depth === 0) {
    return evaluateBoard(board, aiPlayer);
  }

  // Move ordering: prioritize center columns
  const moveOrder = [3, 2, 4, 1, 5, 0, 6];
  validMoves.sort((a, b) => moveOrder.indexOf(a) - moveOrder.indexOf(b));

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const col of validMoves) {
      const row = getLowestEmptyRow(board, col);
      board[row * COLS + col] = aiPlayer; // Make move
      
      const evaluation = minimaxSearch(board, depth - 1, alpha, beta, false, aiPlayer, col, row, aiPlayer);
      
      board[row * COLS + col] = 0; // Undo move
      maxEval = Math.max(maxEval, evaluation);
      alpha = Math.max(alpha, evaluation);
      if (beta <= alpha) {
        break; // Pruning
      }
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const col of validMoves) {
      const row = getLowestEmptyRow(board, col);
      board[row * COLS + col] = humanPlayer; // Make move
      
      const evaluation = minimaxSearch(board, depth - 1, alpha, beta, true, aiPlayer, col, row, humanPlayer);
      
      board[row * COLS + col] = 0; // Undo move
      minEval = Math.min(minEval, evaluation);
      beta = Math.min(beta, evaluation);
      if (beta <= alpha) {
        break; // Pruning
      }
    }
    return minEval;
  }
}

// Get lowest empty row index in column
function getLowestEmptyRow(board, col) {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r * COLS + col] === 0) {
      return r;
    }
  }
  return -1;
}

// Get valid columns to drop
function getValidMoves(board) {
  const moves = [];
  for (let c = 0; c < COLS; c++) {
    if (board[c] === 0) {
      moves.push(c);
    }
  }
  return moves;
}

// Check for win locally around col, row
function checkWinAt(board, col, row, player) {
  const directions = [
    { dx: 1, dy: 0 },  // Horizontal
    { dx: 0, dy: 1 },  // Vertical
    { dx: 1, dy: 1 },  // Diagonal \ (top-left to bottom-right)
    { dx: 1, dy: -1 }  // Diagonal / (bottom-left to top-right)
  ];

  for (const { dx, dy } of directions) {
    let count = 1;

    // Count positive direction
    let step = 1;
    while (true) {
      const c = col + dx * step;
      const r = row + dy * step;
      if (c < 0 || c >= COLS || r < 0 || r >= ROWS) break;
      if (board[r * COLS + c] !== player) break;
      count++;
      step++;
    }

    // Count negative direction
    step = 1;
    while (true) {
      const c = col - dx * step;
      const r = row - dy * step;
      if (c < 0 || c >= COLS || r < 0 || r >= ROWS) break;
      if (board[r * COLS + c] !== player) break;
      count++;
      step++;
    }

    if (count >= 4) return true;
  }
  return false;
}

// Board heuristic evaluator
function evaluateBoard(board, aiPlayer) {
  const humanPlayer = aiPlayer === 1 ? 2 : 1;
  let score = 0;

  // Center column bias (Column 3)
  for (let r = 0; r < ROWS; r++) {
    const val = board[r * COLS + 3];
    if (val === aiPlayer) score += 4;
    else if (val === humanPlayer) score -= 4;
  }

  // Horizontal evaluation
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      const idx = r * COLS + c;
      score += evaluateWindow4(
        board[idx],
        board[idx + 1],
        board[idx + 2],
        board[idx + 3],
        aiPlayer,
        humanPlayer
      );
    }
  }

  // Vertical evaluation
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS - 3; r++) {
      const idx = r * COLS + c;
      score += evaluateWindow4(
        board[idx],
        board[idx + COLS],
        board[idx + 2 * COLS],
        board[idx + 3 * COLS],
        aiPlayer,
        humanPlayer
      );
    }
  }

  // Diagonal / evaluation (bottom-left to top-right)
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      const idx = r * COLS + c;
      score += evaluateWindow4(
        board[idx],
        board[idx - COLS + 1],
        board[idx - 2 * COLS + 2],
        board[idx - 3 * COLS + 3],
        aiPlayer,
        humanPlayer
      );
    }
  }

  // Diagonal \ evaluation (top-left to bottom-right)
  for (let r = 0; r < ROWS - 3; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      const idx = r * COLS + c;
      score += evaluateWindow4(
        board[idx],
        board[idx + COLS + 1],
        board[idx + 2 * COLS + 2],
        board[idx + 3 * COLS + 3],
        aiPlayer,
        humanPlayer
      );
    }
  }

  return score;
}

// Scans 4-cell window and returns score
function evaluateWindow4(w0, w1, w2, w3, aiPlayer, humanPlayer) {
  let aiCount = 0;
  let humanCount = 0;
  let emptyCount = 0;

  if (w0 === aiPlayer) aiCount++;
  else if (w0 === humanPlayer) humanCount++;
  else emptyCount++;

  if (w1 === aiPlayer) aiCount++;
  else if (w1 === humanPlayer) humanCount++;
  else emptyCount++;

  if (w2 === aiPlayer) aiCount++;
  else if (w2 === humanPlayer) humanCount++;
  else emptyCount++;

  if (w3 === aiPlayer) aiCount++;
  else if (w3 === humanPlayer) humanCount++;
  else emptyCount++;

  // Scoring weights
  if (aiCount === 4) return 100000;
  if (aiCount === 3 && emptyCount === 1) return 100;
  if (aiCount === 2 && emptyCount === 2) return 10;

  if (humanCount === 4) return -100000;
  if (humanCount === 3 && emptyCount === 1) return -1000; // Force blocking
  if (humanCount === 2 && emptyCount === 2) return -10;

  return 0;
}
