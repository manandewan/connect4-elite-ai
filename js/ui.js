// js/ui.js - UI Rendering and Synthesized Audio Module
// Controls all interactions, DOM rendering, transitions, hover highlights, and Web Audio SFX.

class AudioSynth {
  constructor() {
    this.ctx = null;
  }

  // Initialized on first user interaction to bypass browser autoplay constraints safely
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume context if suspended
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playDrop() {
    this.init();
    if (!this.ctx) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.type = 'sine';
    // Frequency ramp down to simulate drop impact
    osc.frequency.setValueAtTime(280, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.18);
    
    // Smooth volume decay
    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  playWin() {
    this.init();
    if (!this.ctx) return;

    const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5 (Triumphant major arpeggio)
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + i * 0.1);
      
      gain.gain.setValueAtTime(0.01, this.ctx.currentTime + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.15, this.ctx.currentTime + i * 0.1 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + i * 0.1 + 0.25);
      
      osc.start(this.ctx.currentTime + i * 0.1);
      osc.stop(this.ctx.currentTime + i * 0.1 + 0.3);
    });
  }

  playLose() {
    this.init();
    if (!this.ctx) return;

    const notes = [311.13, 293.66, 261.63, 196.00]; // Eb4, D4, C4, G3 (Sad descending minor chord)
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + i * 0.12);
      
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + i * 0.12 + 0.3);
      
      osc.start(this.ctx.currentTime + i * 0.12);
      osc.stop(this.ctx.currentTime + i * 0.12 + 0.35);
    });
  }

  playClick() {
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.05);
    
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.06);
  }
}

export class Connect4UI {
  constructor() {
    this.synth = new AudioSynth();
    this.cacheElements();
  }

  cacheElements() {
    this.piecesLayer = document.getElementById('pieces-layer');
    this.boardOuter = document.getElementById('game-board');
    
    this.turnDot = document.getElementById('turn-dot');
    this.turnText = document.getElementById('turn-text');
    this.aiThinking = document.getElementById('ai-thinking');
    
    this.gameOverScreen = document.getElementById('game-over-screen');
    this.overlayContent = this.gameOverScreen.querySelector('.overlay-content');
    this.winnerTitle = document.getElementById('winner-title');
    this.winnerSubtitle = document.getElementById('winner-subtitle');
    
    this.playerWinsEl = document.getElementById('player-wins');
    this.drawCountEl = document.getElementById('draw-count');
    this.aiWinsEl = document.getElementById('ai-wins');
    
    this.undoBtn = document.getElementById('undo-btn');
    this.resetBtn = document.getElementById('reset-btn');
    this.playAgainBtn = document.getElementById('play-again-btn');
    this.watchReplayBtn = document.getElementById('watch-replay-btn');
    
    this.difficultySelect = document.getElementById('difficulty-select');
    this.starterSelect = document.getElementById('starter-select');
    
    this.headerCols = document.querySelectorAll('.header-col');
    this.glowCols = document.querySelectorAll('.glow-col');
  }

  setupEventListeners(onColumnClick, onReset, onUndo, onConfigChange, onReplay) {
    // 1. Column drops
    const handleColumnSelect = (colIndex) => {
      this.synth.init(); // Initialize audio context on first click
      onColumnClick(colIndex);
    };

    // Listen to column clicks (both interactive headers and inner glow cols)
    this.headerCols.forEach(col => {
      col.addEventListener('click', () => {
        const colIndex = parseInt(col.dataset.col);
        handleColumnSelect(colIndex);
      });
    });

    this.glowCols.forEach(col => {
      col.addEventListener('click', () => {
        const colIndex = parseInt(col.dataset.col);
        handleColumnSelect(colIndex);
      });
    });

    // 2. Control Panel
    this.resetBtn.addEventListener('click', () => {
      this.synth.playClick();
      onReset();
    });

    this.playAgainBtn.addEventListener('click', () => {
      this.synth.playClick();
      onReset();
    });

    this.watchReplayBtn.addEventListener('click', () => {
      this.synth.playClick();
      onReplay();
    });

    this.undoBtn.addEventListener('click', () => {
      this.synth.playClick();
      onUndo();
    });

    // Config changes
    const handleConfigChange = () => {
      this.synth.playClick();
      onConfigChange({
        difficulty: this.difficultySelect.value,
        starter: this.starterSelect.value
      });
    };

    this.difficultySelect.addEventListener('change', handleConfigChange);
    this.starterSelect.addEventListener('change', handleConfigChange);
  }

  // Draw a piece dynamically with standard drop animation
  addPiece(col, row, player) {
    const piece = document.createElement('div');
    piece.className = `piece ${player === 1 ? 'player' : 'ai'} piece-drop-${row}`;
    
    // Position pieces absolute within the board container using percentages
    piece.style.left = `calc(${col} * 14.2857% + 7.1428%)`;
    
    // Keep reference details for potential undo removals
    piece.dataset.col = col;
    piece.dataset.row = row;
    
    this.piecesLayer.appendChild(piece);
    this.synth.playDrop();
  }

  // Remove a piece (for Undo functionality)
  removePiece(col, row) {
    const piece = this.piecesLayer.querySelector(`.piece[data-col="${col}"][data-row="${row}"]`);
    if (piece) {
      piece.classList.add('removing');
      // Slide back up offscreen quickly
      piece.style.transition = 'top 0.2s cubic-bezier(0.6, -0.28, 0.735, 0.045), opacity 0.2s';
      piece.style.top = '-15%';
      piece.style.opacity = '0';
      
      setTimeout(() => {
        piece.remove();
      }, 200);
    }
  }

  clearBoard() {
    this.piecesLayer.innerHTML = '';
  }

  highlightWinningSequence(cells, winner) {
    const color = winner === 1 ? 'var(--color-player)' : 'var(--color-ai)';
    
    cells.forEach(([col, row]) => {
      const piece = this.piecesLayer.querySelector(`.piece[data-col="${col}"][data-row="${row}"]`);
      if (piece) {
        piece.classList.add('winning');
        piece.style.color = color;
      }
    });

    // Play final win/loss audio feedback
    setTimeout(() => {
      if (winner === 1) {
        this.synth.playWin();
      } else if (winner === 2) {
        this.synth.playLose();
      }
    }, 450);
  }

  updateScores(playerWins, aiWins, draws) {
    this.playerWinsEl.textContent = playerWins;
    this.aiWinsEl.textContent = aiWins;
    this.drawCountEl.textContent = draws;
  }

  setTurn(player, isAITurn) {
    this.updateInteractiveHoverPlayer(player);
    
    if (player === 1) {
      this.turnDot.className = 'dot red-turn';
      this.turnText.textContent = 'YOUR TURN';
    } else {
      this.turnDot.className = 'dot cyan-turn';
      this.turnText.textContent = 'ELITE AI TURN';
    }

    if (isAITurn) {
      this.setThinking(true);
    } else {
      this.setThinking(false);
    }
  }

  setReplayMode(moveIndex, totalMoves) {
    const parentContainer = this.boardOuter.parentElement;
    parentContainer.classList.remove('red-active', 'cyan-active');

    this.turnDot.className = 'dot orange-turn';
    if (moveIndex !== undefined) {
      this.turnText.textContent = `REPLAYING MOVE ${moveIndex}/${totalMoves}`;
    } else {
      this.turnText.textContent = `REPLAY ACTIVE`;
    }
    this.setThinking(false);
  }

  setThinking(isThinking) {
    if (isThinking) {
      this.aiThinking.classList.remove('hidden');
    } else {
      this.aiThinking.classList.add('hidden');
    }
  }

  // Updates active hover column indicator colors
  updateInteractiveHoverPlayer(player) {
    const parentContainer = this.boardOuter.parentElement;
    if (player === 1) {
      parentContainer.classList.add('red-active');
      parentContainer.classList.remove('cyan-active');
    } else {
      parentContainer.classList.add('cyan-active');
      parentContainer.classList.remove('red-active');
    }
  }

  showGameOver(winner) {
    // Reset hover active states
    const parentContainer = this.boardOuter.parentElement;
    parentContainer.classList.remove('red-active', 'cyan-active');
    
    // Clear previous results CSS
    this.overlayContent.classList.remove('player-win', 'ai-win', 'draw-win');

    if (winner === 1) {
      this.overlayContent.classList.add('player-win');
      this.winnerTitle.textContent = 'VICTORY!';
      this.winnerSubtitle.textContent = 'Outstanding moves! You defeated the elite AI.';
    } else if (winner === 2) {
      this.overlayContent.classList.add('ai-win');
      this.winnerTitle.textContent = 'DEFEAT!';
      this.winnerSubtitle.textContent = 'The elite minimax AI outplayed you. Try again to adapt your strategy.';
    } else {
      this.overlayContent.classList.add('draw-win');
      this.winnerTitle.textContent = "IT'S A DRAW";
      this.winnerSubtitle.textContent = 'Both sides played flawlessly. An unbreakable grid!';
    }

    this.gameOverScreen.classList.remove('hidden');
  }

  hideGameOver() {
    this.gameOverScreen.classList.add('hidden');
  }

  setUndoDisabled(disabled) {
    this.undoBtn.disabled = disabled;
  }
}
