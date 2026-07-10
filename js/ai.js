// js/ai.js - AI Decision Engine Module
// Exposes the core AI heuristic evaluations and minimax algorithm.
// For browser runtime performance and non-blocking threads, this logic is also duplicated inside worker.js.

const COLS = 7;
const ROWS = 6;

export function getBestMove(board, depth, aiPlayer, difficulty) {
  const totalPieces = board.filter(cell => cell !== 0).length;
  
  // Decide randomness threshold based on game progress (first 15 moves)
  let randChance = 0;
  if (difficulty === 'easy') {
    // 30% chance of randomness for the first 15 moves, 65% afterwards
    randChance = totalPieces < 15 ? 0.30 : 0.65;
  } else if (difficulty === 'medium') {
    // 5% chance of randomness for the first 15 moves, 15% afterwards
    randChance = totalPieces < 15 ? 0.05 : 0.15;
  }

  if (randChance > 0 && Math.random() < randChance) {
    return getDecentRandomMove(board, aiPlayer);
  }

  const validMoves = getValidMoves(board);
  if (validMoves.length === 0) return -1;
  if (validMoves.length === 1) return validMoves[0];

  const moveOrder = [3, 2, 4, 1, 5, 0, 6];
  validMoves.sort((a, b) => moveOrder.indexOf(a) - moveOrder.indexOf(b));

  let bestMove = validMoves[0];
  let bestValue = -Infinity;
  let alpha = -Infinity;
  let beta = Infinity;

  // Immediate AI win check
  for (const col of validMoves) {
    const row = getLowestEmptyRow(board, col);
    board[row * COLS + col] = aiPlayer;
    if (checkWinAt(board, col, row, aiPlayer)) {
      board[row * COLS + col] = 0;
      return col;
    }
    board[row * COLS + col] = 0;
  }

  // Immediate Player win check (block)
  const humanPlayer = aiPlayer === 1 ? 2 : 1;
  for (const col of validMoves) {
    const row = getLowestEmptyRow(board, col);
    board[row * COLS + col] = humanPlayer;
    if (checkWinAt(board, col, row, humanPlayer)) {
      board[row * COLS + col] = 0;
      return col;
    }
    board[row * COLS + col] = 0;
  }

  for (const col of validMoves) {
    const row = getLowestEmptyRow(board, col);
    board[row * COLS + col] = aiPlayer;

    const value = minimaxSearch(board, depth - 1, alpha, beta, false, aiPlayer, col, row, aiPlayer);
    board[row * COLS + col] = 0;

    if (value > bestValue) {
      bestValue = value;
      bestMove = col;
    }
    alpha = Math.max(alpha, value);
  }

  return bestMove;
}

export function minimaxSearch(board, depth, alpha, beta, isMaximizing, aiPlayer, lastCol, lastRow, lastPlayer) {
  const humanPlayer = aiPlayer === 1 ? 2 : 1;

  if (lastCol !== undefined && lastCol !== -1) {
    if (checkWinAt(board, lastCol, lastRow, lastPlayer)) {
      return lastPlayer === aiPlayer ? (1000000 + depth) : (-1000000 - depth);
    }
  }

  const validMoves = getValidMoves(board);
  if (validMoves.length === 0) {
    return 0;
  }

  if (depth === 0) {
    return evaluateBoard(board, aiPlayer);
  }

  const moveOrder = [3, 2, 4, 1, 5, 0, 6];
  validMoves.sort((a, b) => moveOrder.indexOf(a) - moveOrder.indexOf(b));

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const col of validMoves) {
      const row = getLowestEmptyRow(board, col);
      board[row * COLS + col] = aiPlayer;
      const evaluation = minimaxSearch(board, depth - 1, alpha, beta, false, aiPlayer, col, row, aiPlayer);
      board[row * COLS + col] = 0;
      maxEval = Math.max(maxEval, evaluation);
      alpha = Math.max(alpha, evaluation);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const col of validMoves) {
      const row = getLowestEmptyRow(board, col);
      board[row * COLS + col] = humanPlayer;
      const evaluation = minimaxSearch(board, depth - 1, alpha, beta, true, aiPlayer, col, row, humanPlayer);
      board[row * COLS + col] = 0;
      minEval = Math.min(minEval, evaluation);
      beta = Math.min(beta, evaluation);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

export function getLowestEmptyRow(board, col) {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r * COLS + col] === 0) {
      return r;
    }
  }
  return -1;
}

export function getValidMoves(board) {
  const moves = [];
  for (let c = 0; c < COLS; c++) {
    if (board[c] === 0) {
      moves.push(c);
    }
  }
  return moves;
}

export function checkWinAt(board, col, row, player) {
  const directions = [
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 1, dy: 1 },
    { dx: 1, dy: -1 }
  ];

  for (const { dx, dy } of directions) {
    let count = 1;
    let step = 1;
    while (true) {
      const c = col + dx * step;
      const r = row + dy * step;
      if (c < 0 || c >= COLS || r < 0 || r >= ROWS) break;
      if (board[r * COLS + c] !== player) break;
      count++;
      step++;
    }

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

export function evaluateBoard(board, aiPlayer) {
  const humanPlayer = aiPlayer === 1 ? 2 : 1;
  let score = 0;

  for (let r = 0; r < ROWS; r++) {
    const val = board[r * COLS + 3];
    if (val === aiPlayer) score += 4;
    else if (val === humanPlayer) score -= 4;
  }

  // Horizontal
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      const idx = r * COLS + c;
      score += evaluateWindow4(board[idx], board[idx + 1], board[idx + 2], board[idx + 3], aiPlayer, humanPlayer);
    }
  }

  // Vertical
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS - 3; r++) {
      const idx = r * COLS + c;
      score += evaluateWindow4(board[idx], board[idx + COLS], board[idx + 2 * COLS], board[idx + 3 * COLS], aiPlayer, humanPlayer);
    }
  }

  // Diagonal /
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      const idx = r * COLS + c;
      score += evaluateWindow4(board[idx], board[idx - COLS + 1], board[idx - 2 * COLS + 2], board[idx - 3 * COLS + 3], aiPlayer, humanPlayer);
    }
  }

  // Diagonal \
  for (let r = 0; r < ROWS - 3; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      const idx = r * COLS + c;
      score += evaluateWindow4(board[idx], board[idx + COLS + 1], board[idx + 2 * COLS + 2], board[idx + 3 * COLS + 3], aiPlayer, humanPlayer);
    }
  }

  return score;
}

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

  if (aiCount === 4) return 100000;
  if (aiCount === 3 && emptyCount === 1) return 100;
  if (aiCount === 2 && emptyCount === 2) return 10;

  if (humanCount === 4) return -100000;
  if (humanCount === 3 && emptyCount === 1) return -1000;
  if (humanCount === 2 && emptyCount === 2) return -10;

  return 0;
}

// Generate a decent random move that prevents immediate losses and blunders
function getDecentRandomMove(board, aiPlayer) {
  const validMoves = getValidMoves(board);
  if (validMoves.length === 0) return -1;
  if (validMoves.length === 1) return validMoves[0];

  // 1. Immediate win check for AI
  for (const col of validMoves) {
    const row = getLowestEmptyRow(board, col);
    board[row * COLS + col] = aiPlayer;
    if (checkWinAt(board, col, row, aiPlayer)) {
      board[row * COLS + col] = 0; // undo
      return col;
    }
    board[row * COLS + col] = 0; // undo
  }

  // 2. Immediate block check for player win
  const humanPlayer = aiPlayer === 1 ? 2 : 1;
  for (const col of validMoves) {
    const row = getLowestEmptyRow(board, col);
    board[row * COLS + col] = humanPlayer;
    if (checkWinAt(board, col, row, humanPlayer)) {
      board[row * COLS + col] = 0; // undo
      return col;
    }
    board[row * COLS + col] = 0; // undo
  }

  // 3. Filter out moves that would immediately let the opponent win on their next turn
  const safeMoves = [];
  for (const col of validMoves) {
    const row = getLowestEmptyRow(board, col);
    board[row * COLS + col] = aiPlayer;
    
    const nextRow = row - 1;
    let leadsToWin = false;
    if (nextRow >= 0) {
      board[nextRow * COLS + col] = humanPlayer;
      if (checkWinAt(board, col, nextRow, humanPlayer)) {
        leadsToWin = true;
      }
      board[nextRow * COLS + col] = 0; // undo
    }
    
    board[row * COLS + col] = 0; // undo
    
    if (!leadsToWin) {
      safeMoves.push(col);
    }
  }

  if (safeMoves.length > 0) {
    return safeMoves[Math.floor(Math.random() * safeMoves.length)];
  }

  // Fallback if no safe moves are available
  return validMoves[Math.floor(Math.random() * validMoves.length)];
}
