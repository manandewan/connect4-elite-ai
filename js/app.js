// js/app.js - Application Orchestrator Module
// Coordinates the core game state (game.js), UI/Audio rendering (ui.js), and the AI Web Worker.

import { Connect4Game } from './game.js';
import { Connect4UI } from './ui.js';

class Connect4App {
  constructor() {
    this.game = new Connect4Game();
    this.ui = new Connect4UI();
    
    // Read initial selections from lobby UI
    this.difficulty = this.ui.selectedDifficulty;
    this.starter = this.ui.selectedStarter;
    this.theme = this.ui.selectedTheme;
    
    // Match wins/losses counters and win streak
    this.scores = {
      player: 0,
      ai: 0,
      draws: 0
    };
    this.streak = 0;
    
    this.isThinking = false;
    this.isHinting = false;
    this.isReplaying = false;
    this.worker = null;
    
    this.initWorker();
    this.initGame();
  }

  // Set up the AI background worker thread
  initWorker() {
    try {
      this.worker = new Worker(new URL('./worker.js', import.meta.url));
      
      this.worker.onmessage = (e) => {
        const { bestMove, type } = e.data;
        
        if (type === 'hint') {
          this.isHinting = false;
          this.ui.setHintDisabled(false);
          this.ui.showHint(bestMove);
        } else {
          this.isThinking = false;
          this.executeAIMove(bestMove);
        }
      };
      
      this.worker.onerror = (err) => {
        console.error('AI Web Worker Error:', err);
        this.isThinking = false;
        this.isHinting = false;
        this.ui.setThinking(false);
        this.ui.setHintDisabled(false);
      };
    } catch (e) {
      console.warn('Failed to initialize Web Worker. Falling back to main-thread AI execution.', e);
    }
  }

  initGame() {
    // Bind UI actions to local handler callbacks
    this.ui.setupEventListeners(
      (col) => this.handlePlayerClick(col),
      () => this.resetGame(),
      () => this.undoMove(),
      (config) => this.handleConfigChange(config),
      () => this.startReplay(),
      () => this.handleHintRequest(),
      (col, isHovering) => this.handleColumnHover(col, isHovering)
    );

    // Apply default starting theme & display
    this.ui.applyTheme(this.theme);
    this.ui.updateDifficultyDisplay(this.difficulty);
    this.resetGame();
  }

  handleConfigChange(config) {
    this.difficulty = config.difficulty;
    this.starter = config.starter;
    this.theme = config.theme;
    
    this.ui.applyTheme(this.theme);
    this.ui.updateDifficultyDisplay(this.difficulty);
    this.resetGame();
  }

  resetGame() {
    if (this.isThinking) return; // Do not interrupt running AI calculations

    if (this.isReplaying) {
      clearInterval(this.replayInterval);
      this.isReplaying = false;
    }

    this.game.reset();
    this.ui.clearBoard();
    this.ui.hideGameOver();
    
    const startingPlayerVal = this.starter === 'player' ? 1 : 2;
    this.game.setStartingPlayer(startingPlayerVal);
    
    this.ui.setTurn(this.game.currentPlayer, this.game.currentPlayer === 2);
    this.ui.setUndoDisabled(true);
    this.ui.setHintDisabled(false);
    this.ui.updateScores(this.scores.player, this.scores.ai, this.scores.draws, this.streak);
    
    if (this.game.currentPlayer === 2) {
      this.triggerAIMove();
    }
  }

  handlePlayerClick(col) {
    // Prevent moves if game over, AI's turn, AI is computing, or replaying
    if (this.game.gameOver || this.game.currentPlayer !== 1 || this.isThinking || this.isReplaying || this.isHinting) {
      return;
    }

    const row = this.game.getLowestEmptyRow(col);
    if (row === -1) {
      // Column is full, ignore click
      return;
    }

    // Hide preview ghost piece on click
    this.ui.hideGhostPiece();

    // Place player piece (Player 1)
    this.game.makeMove(col, 1);
    this.ui.addPiece(col, row, 1);
    this.ui.setUndoDisabled(false);

    this.checkGameState();
  }

  handleColumnHover(col, isHovering) {
    // Hide ghost piece if not hovering or if actions are locked
    if (!isHovering || this.game.gameOver || this.game.currentPlayer !== 1 || this.isThinking || this.isReplaying || this.isHinting) {
      this.ui.hideGhostPiece();
      return;
    }

    const row = this.game.getLowestEmptyRow(col);
    this.ui.showGhostPiece(col, row, 1);
  }

  handleHintRequest() {
    // Prevent if game over, not player's turn, or AI is computing
    if (this.game.gameOver || this.game.currentPlayer !== 1 || this.isThinking || this.isReplaying || this.isHinting) {
      return;
    }

    this.isHinting = true;
    this.ui.setHintDisabled(true);

    const depthMap = {
      easy: 2,
      medium: 4,
      elite: 8
    };
    const depth = depthMap[this.difficulty] || 8;

    // Send board state to Web Worker to find the best player move (aiPlayer: 1)
    if (this.worker) {
      this.worker.postMessage({
        board: [...this.game.board],
        depth: depth,
        aiPlayer: 1,
        type: 'hint'
      });
    } else {
      // Fallback
      setTimeout(async () => {
        const { getBestMove } = await import('./ai.js');
        const bestMove = getBestMove([...this.game.board], depth, 1);
        this.isHinting = false;
        this.ui.setHintDisabled(false);
        this.ui.showHint(bestMove);
      }, 50);
    }
  }

  triggerAIMove() {
    if (this.game.gameOver || this.isReplaying) return;

    this.isThinking = true;
    this.ui.setTurn(2, true); // Update turn label to AI and show thinking indicator

    const depthMap = {
      easy: 2,
      medium: 4,
      elite: 8
    };
    const depth = depthMap[this.difficulty] || 8;

    // Send board state to Web Worker to find the optimal column
    if (this.worker) {
      this.worker.postMessage({
        board: [...this.game.board],
        depth: depth,
        aiPlayer: 2,
        type: 'aiMove'
      });
    } else {
      // Fallback in case Web Workers are not supported
      setTimeout(async () => {
        const { getBestMove } = await import('./ai.js');
        const bestMove = getBestMove([...this.game.board], depth, 2);
        this.isThinking = false;
        this.executeAIMove(bestMove);
      }, 50);
    }
  }

  executeAIMove(col) {
    if (this.game.gameOver || this.game.currentPlayer !== 2) return;

    const row = this.game.getLowestEmptyRow(col);
    if (row === -1) {
      const validMoves = this.game.getValidMoves();
      if (validMoves.length > 0) {
        this.executeAIMove(validMoves[0]);
      }
      return;
    }

    this.game.makeMove(col, 2);
    this.ui.addPiece(col, row, 2);
    this.ui.setUndoDisabled(false);

    this.checkGameState();
  }

  undoMove() {
    if (this.isThinking || this.isReplaying) return;

    this.ui.hideGameOver();

    // 1. Undo the last move (could be AI's move or Player's move if game was over)
    const move1 = this.game.undoMove();
    if (move1) {
      this.ui.removePiece(move1.col, move1.row);
    }

    // 2. Since this is Player vs AI, if it's now the AI's turn, we undo another move 
    // to return the game state back to the Player's turn.
    if (this.game.currentPlayer === 2 && this.game.history.length > 0) {
      const move2 = this.game.undoMove();
      if (move2) {
        this.ui.removePiece(move2.col, move2.row);
      }
    }

    // Update UI states
    this.ui.setTurn(this.game.currentPlayer, this.game.currentPlayer === 2);
    this.ui.setUndoDisabled(this.game.history.length === 0);
    this.ui.setHintDisabled(false);

    // If game state reverted back to AI turn (e.g. if player undid initial turn of AI-starts)
    if (this.game.currentPlayer === 2 && !this.game.gameOver) {
      this.triggerAIMove();
    }
  }

  checkGameState() {
    if (this.game.gameOver) {
      this.isThinking = false;
      this.ui.setThinking(false);
      this.ui.setTurn(this.game.currentPlayer, false);

      // Cache game details for playback replay support
      this.lastGameHistory = [...this.game.history];
      this.lastGameStarter = this.game.startingPlayer;
      this.lastGameWinner = this.game.winner;
      this.lastGameWinningCells = this.game.winningCells;
      this.lastGameWinningDirection = this.game.winningDirection;

      const winner = this.game.winner;
      const history = this.game.history;
      
      // Determine the coordinates of the very last move made to highlight it uniquely
      const lastCol = history[history.length - 1];
      let lastRow = -1;
      for (let r = 0; r < 6; r++) {
        if (this.game.get(lastCol, r) !== 0) {
          lastRow = r;
          break;
        }
      }

      if (winner === 1) {
        this.scores.player++;
        this.streak++;
        this.ui.highlightWinningSequence(this.game.winningCells, 1, lastCol, lastRow);
      } else if (winner === 2) {
        this.scores.ai++;
        this.streak = 0; // Reset win streak
        this.ui.highlightWinningSequence(this.game.winningCells, 2, lastCol, lastRow);
      } else {
        this.scores.draws++;
      }

      this.ui.updateScores(this.scores.player, this.scores.ai, this.scores.draws, this.streak);
      this.ui.setHintDisabled(true);
      
      // Delay game-over overlay presentation to let the highlights and confetti breathe
      setTimeout(() => {
        this.ui.showGameOver(winner, this.game.winningDirection);
      }, 1500);
    } else {
      // Move turn forward
      this.ui.setTurn(this.game.currentPlayer, this.game.currentPlayer === 2);
      
      if (this.game.currentPlayer === 2) {
        this.triggerAIMove();
      }
    }
  }

  startReplay() {
    if (this.isReplaying || !this.lastGameHistory || this.lastGameHistory.length === 0) {
      return;
    }

    this.isReplaying = true;
    this.ui.hideGameOver();
    this.ui.setUndoDisabled(true);
    this.ui.setHintDisabled(true);

    // Reset game state board array for playback
    this.game.reset();
    this.game.setStartingPlayer(this.lastGameStarter);
    this.ui.clearBoard();

    let step = 0;
    this.ui.setReplayMode(step, this.lastGameHistory.length);

    const playNextStep = () => {
      if (step >= this.lastGameHistory.length) {
        // Replay completed!
        clearInterval(this.replayInterval);
        this.isReplaying = false;

        // Highlight winner if not a draw
        if (this.lastGameWinner && this.lastGameWinner !== 'draw') {
          const lastCol = this.lastGameHistory[this.lastGameHistory.length - 1];
          let lastRow = -1;
          for (let r = 0; r < 6; r++) {
            if (this.game.get(lastCol, r) !== 0) {
              lastRow = r;
              break;
            }
          }
          this.ui.highlightWinningSequence(this.lastGameWinningCells, this.lastGameWinner, lastCol, lastRow);
        }

        // Re-set standard indicators
        this.ui.setTurn(this.game.currentPlayer, this.game.currentPlayer === 2);
        this.ui.setUndoDisabled(this.game.history.length === 0);
        this.ui.setHintDisabled(false);

        // Display results overlay after brief delay
        setTimeout(() => {
          this.ui.showGameOver(this.lastGameWinner, this.lastGameWinningDirection);
        }, 1500);
        return;
      }

      const col = this.lastGameHistory[step];
      const currentPlayer = this.game.currentPlayer;
      const row = this.game.makeMove(col, currentPlayer);

      if (row !== -1) {
        this.ui.addPiece(col, row, currentPlayer);
      }

      step++;
      this.ui.setReplayMode(step, this.lastGameHistory.length);
    };

    // Run first step immediately, then interval
    playNextStep();
    this.replayInterval = setInterval(playNextStep, 800);
  }
}

// Instantiate the application
document.addEventListener('DOMContentLoaded', () => {
  new Connect4App();
});
