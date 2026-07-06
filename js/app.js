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
    this.replayStep = 0;
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
      (action) => this.handleReplayAction(action),
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
      this.isReplaying = false;
      this.ui.setReplayMode(false); // Restores normal turn UI indicators
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
      // Fallback
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

    const move1 = this.game.undoMove();
    if (move1) {
      this.ui.removePiece(move1.col, move1.row);
    }

    if (this.game.currentPlayer === 2 && this.game.history.length > 0) {
      const move2 = this.game.undoMove();
      if (move2) {
        this.ui.removePiece(move2.col, move2.row);
      }
    }

    this.ui.setTurn(this.game.currentPlayer, this.game.currentPlayer === 2);
    this.ui.setUndoDisabled(this.game.history.length === 0);
    this.ui.setHintDisabled(false);

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
        this.streak = 0;
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
      this.ui.setTurn(this.game.currentPlayer, this.game.currentPlayer === 2);
      
      if (this.game.currentPlayer === 2) {
        this.triggerAIMove();
      }
    }
  }

  // Chess.com Inspired Replay System logic
  handleReplayAction(action) {
    if (!this.lastGameHistory || this.lastGameHistory.length === 0) return;

    // Toggle replay mode active state
    if (!this.isReplaying) {
      this.isReplaying = true;
      this.replayStep = 0;
      this.ui.hideGameOver();
      this.ui.setUndoDisabled(true);
      this.ui.setHintDisabled(true);
      this.game.reset();
      this.game.setStartingPlayer(this.lastGameStarter);
      this.ui.clearBoard();
      this.ui.setReplayMode(true, this.replayStep, this.lastGameHistory.length);
    }

    switch (action) {
      case 'start':
        // Reset everything back to move 0
        this.game.reset();
        this.game.setStartingPlayer(this.lastGameStarter);
        this.ui.clearBoard();
        this.ui.clearWinningHighlights();
        this.replayStep = 0;
        this.ui.setReplayMode(true, this.replayStep, this.lastGameHistory.length);
        break;

      case 'back':
        // Go back 1 move
        if (this.replayStep > 0) {
          this.ui.clearWinningHighlights();
          this.ui.hideGameOver();
          
          this.replayStep--;
          const undone = this.game.undoMove();
          if (undone) {
            this.ui.removePiece(undone.col, undone.row);
          }
          this.ui.setReplayMode(true, this.replayStep, this.lastGameHistory.length);
        }
        break;

      case 'forward':
        // Go forward 1 move
        if (this.replayStep < this.lastGameHistory.length) {
          this.ui.clearWinningHighlights();
          this.ui.hideGameOver();

          const col = this.lastGameHistory[this.replayStep];
          const currentPlayer = this.game.currentPlayer;
          const row = this.game.makeMove(col, currentPlayer);

          if (row !== -1) {
            this.ui.addPiece(col, row, currentPlayer);
          }
          
          this.replayStep++;
          this.ui.setReplayMode(true, this.replayStep, this.lastGameHistory.length);

          // Check if we just reached the end of the history
          if (this.replayStep === this.lastGameHistory.length) {
            this.triggerReplayEndState();
          }
        }
        break;

      case 'end':
        // Jump directly to the end of the game
        this.ui.clearWinningHighlights();
        this.ui.hideGameOver();

        while (this.replayStep < this.lastGameHistory.length) {
          const col = this.lastGameHistory[this.replayStep];
          const currentPlayer = this.game.currentPlayer;
          const row = this.game.makeMove(col, currentPlayer);

          if (row !== -1) {
            this.ui.addPiece(col, row, currentPlayer);
          }
          this.replayStep++;
        }

        this.ui.setReplayMode(true, this.replayStep, this.lastGameHistory.length);
        this.triggerReplayEndState();
        break;
    }
  }

  triggerReplayEndState() {
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

    // Delay displaying the results overlay so the winning highlight is visible
    setTimeout(() => {
      if (this.isReplaying) {
        this.ui.showGameOver(this.lastGameWinner, this.lastGameWinningDirection);
      }
    }, 1500);
  }
}

// Instantiate the application
document.addEventListener('DOMContentLoaded', () => {
  new Connect4App();
});
