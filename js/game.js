export class Connect4Game {
  constructor() {
    this.COLS = 7;
    this.ROWS = 6;
    this.reset();
  }

  reset() {
    // 1D board array: 0 = empty, 1 = Player 1 (Red), 2 = Player 2 (AI, Cyan)
    this.board = new Array(this.COLS * this.ROWS).fill(0);
    this.currentPlayer = 1; // 1 starts by default, can be customized in orchestrator
    this.history = [];      // Stack of column indices of moves made
    this.gameOver = false;
    this.winner = null;     // 1, 2, or 'draw'
    this.winningCells = null; // Array of [col, row] for highlighting
  }

  // Get cell value at (col, row)
  get(col, row) {
    return this.board[row * this.COLS + col];
  }

  // Set cell value at (col, row)
  set(col, row, val) {
    this.board[row * this.COLS + col] = val;
  }

  // Find the lowest empty row in a column (returns row 0-5, or -1 if full)
  // Row 5 is bottom, Row 0 is top
  getLowestEmptyRow(col) {
    for (let r = this.ROWS - 1; r >= 0; r--) {
      if (this.get(col, r) === 0) {
        return r;
      }
    }
    return -1;
  }

  // Place a piece at col. Returns row index, or -1 if full.
  makeMove(col, player) {
    if (this.gameOver) return -1;
    
    const row = this.getLowestEmptyRow(col);
    if (row === -1) return -1;

    this.set(col, row, player);
    this.history.push(col);

    const winCells = this.getWinningSequence(col, row, player);
    if (winCells) {
      this.gameOver = true;
      this.winner = player;
      this.winningCells = winCells;
    } else if (this.getValidMoves().length === 0) {
      this.gameOver = true;
      this.winner = 'draw';
    } else {
      // Toggle player
      this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
    }

    return row;
  }

  // Undo the last move. Returns the { col, row } of undone move, or null.
  undoMove() {
    if (this.history.length === 0) return null;

    const col = this.history.pop();
    
    // Find the highest occupied cell in the column to remove
    let row = -1;
    for (let r = 0; r < this.ROWS; r++) {
      if (this.get(col, r) !== 0) {
        row = r;
        break;
      }
    }

    if (row !== -1) {
      this.set(col, row, 0);
      this.gameOver = false;
      this.winner = null;
      this.winningCells = null;
      this.currentPlayer = this.getHistoryPlayerForNextTurn();
      return { col, row };
    }

    return null;
  }

  // Helper to determine whose turn it should be after an undo
  getHistoryPlayerForNextTurn() {
    // If starter starts, odd number of moves in history means current is Player 2
    // We can just count history size
    const turnCount = this.history.length;
    // Whoever started is determined by settings. But since we track history, 
    // we toggle starting player in app.js.
    // To be safe, the current player is the opposite of the player who made the last move in history.
    // If history is empty, the starting player gets the turn.
    if (this.history.length === 0) {
      // Handled by app.js initialization, let's keep track of starting player
      return this.startingPlayer || 1;
    }
    // We can infer whose turn it is by checking the length of history.
    // If startingPlayer starts, history length tells us:
    // even length => startingPlayer's turn
    // odd length => opponent's turn
    const start = this.startingPlayer || 1;
    const opponent = start === 1 ? 2 : 1;
    return this.history.length % 2 === 0 ? start : opponent;
  }

  // Set who starts the game (1 or 2)
  setStartingPlayer(player) {
    this.startingPlayer = player;
    this.currentPlayer = player;
  }

  // Get list of valid columns (0 to 6)
  getValidMoves() {
    const moves = [];
    for (let c = 0; c < this.COLS; c++) {
      if (this.get(c, 0) === 0) {
        moves.push(c);
      }
    }
    return moves;
  }

  // Checks for win centered around the last placed cell (col, row)
  getWinningSequence(col, row, player) {
    const directions = [
      { dx: 1, dy: 0 },  // Horizontal
      { dx: 0, dy: 1 },  // Vertical
      { dx: 1, dy: 1 },  // Diagonal \ (top-left to bottom-right)
      { dx: 1, dy: -1 }  // Diagonal / (bottom-left to top-right)
    ];

    for (const { dx, dy } of directions) {
      const cells = [[col, row]];

      // Count positive direction
      let step = 1;
      while (true) {
        const c = col + dx * step;
        const r = row + dy * step;
        if (c < 0 || c >= this.COLS || r < 0 || r >= this.ROWS) break;
        if (this.get(c, r) !== player) break;
        cells.push([c, r]);
        step++;
      }

      // Count negative direction
      step = 1;
      while (true) {
        const c = col - dx * step;
        const r = row - dy * step;
        if (c < 0 || c >= this.COLS || r < 0 || r >= this.ROWS) break;
        if (this.get(c, r) !== player) break;
        cells.push([c, r]);
        step++;
      }

      if (cells.length >= 4) {
        // Return first 4 cells in the winning sequence
        return cells.slice(0, 4);
      }
    }
    return null;
  }

  // Static check: Scans the entire board to see if there is any win for 'player'
  checkStaticWin(player) {
    for (let r = 0; r < this.ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        if (this.get(c, r) === player) {
          const seq = this.getWinningSequence(c, r, player);
          if (seq) return seq;
        }
      }
    }
    return null;
  }
}
