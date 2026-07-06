// js/ui.js - UI Rendering and Synthesized Audio Module
// Controls all interactions, DOM rendering, transitions, hover highlights, and Web Audio SFX.

class AudioSynth {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
  }

  init() {
    try {
      if (!this.ctx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          this.ctx = new AudioContextClass();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    } catch (err) {
      console.warn('Web Audio API not supported or blocked in this browser:', err);
      this.ctx = null;
    }
  }

  playDrop() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.18);
    
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  playWin() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5 (Rising arpeggio)
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + i * 0.1);
      
      gain.gain.setValueAtTime(0.01, this.ctx.currentTime + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + i * 0.1 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + i * 0.1 + 0.25);
      
      osc.start(this.ctx.currentTime + i * 0.1);
      osc.stop(this.ctx.currentTime + i * 0.1 + 0.3);
    });
  }

  playLose() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [311.13, 293.66, 261.63, 196.00]; // Eb4, D4, C4, G3 (Descending minor chord)
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + i * 0.12);
      
      gain.gain.setValueAtTime(0.06, this.ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + i * 0.12 + 0.3);
      
      osc.start(this.ctx.currentTime + i * 0.12);
      osc.stop(this.ctx.currentTime + i * 0.12 + 0.35);
    });
  }

  playClick() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.05);
    
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.06);
  }
}

class ConfettiParticle {
  constructor(x, y, colors) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 8 + 5;
    this.color = colors[Math.floor(Math.random() * colors.length)];
    this.vx = Math.random() * 8 - 4;
    this.vy = Math.random() * -8 - 4; // Shoot upwards
    this.gravity = 0.18;
    this.rotation = Math.random() * 360;
    this.rotationSpeed = Math.random() * 6 - 3;
    this.bounceCount = 0;
  }

  update(width, height) {
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    this.rotation += this.rotationSpeed;

    if (this.y + this.size / 2 >= height && this.vy > 0) {
      if (this.bounceCount < 2) {
        this.vy = -this.vy * 0.4;
        this.y = height - this.size / 2;
        this.bounceCount++;
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    ctx.restore();
  }
}

export class Connect4UI {
  constructor() {
    this.synth = new AudioSynth();
    this.cacheElements();
    this.initConfetti();
    
    // Ghost preview piece pointer
    this.ghostPiece = null;
    
    // Active configuration selectors inside lobby
    this.selectedDifficulty = 'ultimate';
    this.selectedStarter = 'player';
    this.selectedTheme = 'neon';
  }

  cacheElements() {
    this.piecesLayer = document.getElementById('pieces-layer');
    this.boardOuter = document.getElementById('game-board');
    this.winLineSvg = document.getElementById('win-line-svg');
    this.confettiCanvas = document.getElementById('confetti-canvas');
    
    this.turnDot = document.getElementById('turn-dot');
    this.turnText = document.getElementById('turn-text');
    this.aiThinking = document.getElementById('ai-thinking');
    this.soundToggleBtn = document.getElementById('sound-toggle-btn');
    this.soundOnIcon = document.getElementById('sound-on-icon');
    this.soundOffIcon = document.getElementById('sound-off-icon');
    
    // Theme Dot Panel Elements
    this.floatingThemeSelector = document.getElementById('floating-theme-selector');
    this.themeDotBtns = document.querySelectorAll('.theme-dot-btn');
    
    // Interactive Replay Controls
    this.defaultTurnIndicator = document.getElementById('default-turn-indicator');
    this.replayControls = document.getElementById('replay-controls');
    this.repStartBtn = document.getElementById('rep-start-btn');
    this.repBackBtn = document.getElementById('rep-back-btn');
    this.repForwardBtn = document.getElementById('rep-forward-btn');
    this.repEndBtn = document.getElementById('rep-end-btn');
    this.replayStatusText = document.getElementById('replay-status-text');
    
    this.homeScreen = document.getElementById('home-screen');
    this.startMatchBtn = document.getElementById('start-match-btn');
    
    this.gameOverScreen = document.getElementById('game-over-screen');
    this.overlayContent = this.gameOverScreen.querySelector('.overlay-content');
    this.winnerTitle = document.getElementById('winner-title');
    this.winnerSubtitle = document.getElementById('winner-subtitle');
    
    this.playerWinsEl = document.getElementById('player-wins');
    this.streakCounterEl = document.getElementById('streak-counter');
    this.drawCountEl = document.getElementById('draw-count');
    this.aiWinsEl = document.getElementById('ai-wins');
    
    this.currentDifficultyDisplay = document.getElementById('current-difficulty-display');
    this.currentThemeDisplay = document.getElementById('current-theme-display');
    
    this.undoBtn = document.getElementById('undo-btn');
    this.resetBtn = document.getElementById('reset-btn');
    this.playAgainBtn = document.getElementById('play-again-btn');
    this.watchReplayBtn = document.getElementById('watch-replay-btn');
    
    this.headerCols = document.querySelectorAll('.header-col');
    this.glowCols = document.querySelectorAll('.glow-col');

    // Tutorial Elements
    this.tutOverlay = document.getElementById('tutorial-overlay');
    this.tutOptinModal = document.getElementById('tutorial-optin-modal');
    this.tutBubble = document.getElementById('tutorial-bubble');
    this.tutYesBtn = document.getElementById('tut-yes-btn');
    this.tutSkipBtn = document.getElementById('tut-skip-btn');
    this.tutPrevBtn = document.getElementById('tut-prev-btn');
    this.tutNextBtn = document.getElementById('tut-next-btn');
    this.tutCloseBtn = document.getElementById('tut-close-btn');
    this.tutStepTitle = document.getElementById('tut-step-title');
    this.tutStepText = document.getElementById('tut-step-text');
    this.lobbyTutorialBtn = document.getElementById('lobby-tutorial-btn');
    this.sidebarTutorialBtn = document.getElementById('sidebar-tutorial-btn');
  }

  initConfetti() {
    this.confettiCtx = this.confettiCanvas.getContext('2d');
    this.confettiActive = false;
    this.particles = [];
    
    window.addEventListener('resize', () => {
      if (this.confettiActive) {
        this.confettiCanvas.width = window.innerWidth;
        this.confettiCanvas.height = window.innerHeight;
      }
    });
  }

  setupEventListeners(onColumnClick, onReset, onUndo, onConfigChange, onReplayAction, onColumnHover, onTutorialAction, onExitToLobby) {
    const handleColumnSelect = (colIndex) => {
      this.synth.init();
      onColumnClick(colIndex);
    };

    // Columns click & hover listeners
    this.glowCols.forEach(col => {
      const colIndex = parseInt(col.dataset.col);
      col.addEventListener('click', () => handleColumnSelect(colIndex));
      col.addEventListener('mouseenter', () => onColumnHover(colIndex, true));
      col.addEventListener('mousemove', () => onColumnHover(colIndex, true));
      col.addEventListener('mouseleave', () => onColumnHover(colIndex, false));
    });

    this.headerCols.forEach(col => {
      const colIndex = parseInt(col.dataset.col);
      col.addEventListener('click', () => handleColumnSelect(colIndex));
      col.addEventListener('mouseenter', () => onColumnHover(colIndex, true));
      col.addEventListener('mousemove', () => onColumnHover(colIndex, true));
      col.addEventListener('mouseleave', () => onColumnHover(colIndex, false));
    });

    // Control buttons
    this.resetBtn.addEventListener('click', () => {
      this.synth.playClick();
      onExitToLobby();
    });

    this.playAgainBtn.addEventListener('click', () => {
      this.synth.playClick();
      onReset();
    });

    this.undoBtn.addEventListener('click', () => {
      this.synth.playClick();
      onUndo();
    });

    // Audio Mute Toggle
    this.soundToggleBtn.addEventListener('click', () => {
      this.synth.init();
      this.synth.isMuted = !this.synth.isMuted;
      this.synth.playClick();
      
      if (this.synth.isMuted) {
        this.soundOnIcon.classList.add('hidden');
        this.soundOffIcon.classList.remove('hidden');
      } else {
        this.soundOnIcon.classList.remove('hidden');
        this.soundOffIcon.classList.add('hidden');
      }
    });

    // Chess.com Interactive Replay Button Action triggers
    this.watchReplayBtn.addEventListener('click', () => {
      this.synth.playClick();
      onReplayAction('start'); // Enters Replay mode starting at step 0
    });

    this.repStartBtn.addEventListener('click', () => {
      this.synth.playClick();
      onReplayAction('start');
    });

    this.repBackBtn.addEventListener('click', () => {
      this.synth.playClick();
      onReplayAction('back');
    });

    this.repForwardBtn.addEventListener('click', () => {
      this.synth.playClick();
      onReplayAction('forward');
    });

    this.repEndBtn.addEventListener('click', () => {
      this.synth.playClick();
      onReplayAction('end');
    });

    // Tutorial overlay prompts event listeners
    this.tutYesBtn.addEventListener('click', () => {
      this.synth.playClick();
      onTutorialAction('start');
    });

    this.tutSkipBtn.addEventListener('click', () => {
      this.synth.playClick();
      onTutorialAction('skip');
    });

    this.tutPrevBtn.addEventListener('click', () => {
      this.synth.playClick();
      onTutorialAction('back');
    });

    this.tutNextBtn.addEventListener('click', () => {
      this.synth.playClick();
      onTutorialAction('next');
    });

    this.tutCloseBtn.addEventListener('click', () => {
      this.synth.playClick();
      onTutorialAction('skip');
    });

    // Lobby config card selectors (Only Difficulty & Starter now)
    const setupLobbySelectors = (selectorClass, activeProp, updateCallback) => {
      const options = document.querySelectorAll(`${selectorClass} .select-option`);
      options.forEach(opt => {
        opt.addEventListener('click', () => {
          this.synth.init();
          this.synth.playClick();
          
          options.forEach(o => o.classList.remove('active'));
          opt.classList.add('active');
          
          this[activeProp] = opt.dataset.value;
          updateCallback();
        });
      });
    };

    setupLobbySelectors('.difficulty-selector', 'selectedDifficulty', () => {
      this.updateStartButtonText(this.selectedDifficulty);
    });
    setupLobbySelectors('.starter-selector', 'selectedStarter', () => {});

    // Set initial start button text matching default selection
    this.updateStartButtonText(this.selectedDifficulty);

    // Floating Theme Selector click listeners (Bottom-Left)
    this.themeDotBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.synth.init();
        this.synth.playClick();
        
        this.themeDotBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        this.selectedTheme = btn.dataset.value;
        this.applyTheme(this.selectedTheme);
        
        onConfigChange({
          difficulty: this.selectedDifficulty,
          starter: this.selectedStarter,
          theme: this.selectedTheme
        });
      });
    });

    // Start match action
    this.startMatchBtn.addEventListener('click', () => {
      this.synth.init();
      this.synth.playClick();
      
      this.hideHomeScreen();
      
      onConfigChange({
        difficulty: this.selectedDifficulty,
        starter: this.selectedStarter,
        theme: this.selectedTheme
      });
    });

    // Return to Lobby from header logo
    document.getElementById('header-logo').addEventListener('click', () => {
      this.synth.playClick();
      this.showHomeScreen();
    });

    // Launch tutorial on demand from lobby or sidebar
    this.lobbyTutorialBtn.addEventListener('click', () => {
      this.synth.init();
      this.synth.playClick();
      this.hideHomeScreen();
      
      onConfigChange({
        difficulty: this.selectedDifficulty,
        starter: this.selectedStarter,
        theme: this.selectedTheme
      });
      onTutorialAction('start');
    });

    this.sidebarTutorialBtn.addEventListener('click', () => {
      this.synth.init();
      this.synth.playClick();
      onTutorialAction('start');
    });
  }

  showHomeScreen() {
    this.homeScreen.classList.remove('hidden');
    this.floatingThemeSelector.classList.add('hidden'); // Hide theme selection in lobby
  }

  hideHomeScreen() {
    this.homeScreen.classList.add('hidden');
    this.floatingThemeSelector.classList.remove('hidden'); // Show theme selection during game
  }

  applyTheme(theme) {
    document.body.className = `theme-${theme}`;
    
    // Set matching dot active in bottom left
    this.themeDotBtns.forEach(btn => {
      if (btn.dataset.value === theme) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const themeNames = {
      neon: 'Cyberpunk',
      classic: 'Classic',
      mint: 'Sunset Gold'
    };
    this.currentThemeDisplay.textContent = themeNames[theme] || theme;
  }

  updateDifficultyDisplay(difficulty) {
    const difficulties = {
      easy: 'Easy AI',
      medium: 'Medium AI',
      elite: 'Hard AI',
      ultimate: 'Elite AI'
    };
    this.currentDifficultyDisplay.textContent = difficulties[difficulty] || difficulty;
  }

  updateStartButtonText(difficulty) {
    const titles = {
      easy: 'CHALLENGE EASY AI',
      medium: 'CHALLENGE MEDIUM AI',
      elite: 'CHALLENGE HARD AI',
      ultimate: 'CHALLENGE ELITE AI'
    };
    this.startMatchBtn.textContent = titles[difficulty] || 'CHALLENGE AI';
  }

  showGhostPiece(col, row, player) {
    if (row === -1) {
      this.hideGhostPiece();
      return;
    }

    if (!this.ghostPiece) {
      this.ghostPiece = document.createElement('div');
      this.piecesLayer.appendChild(this.ghostPiece);
    }

    this.ghostPiece.className = `piece ghost ${player === 1 ? 'player' : 'ai'}`;
    this.ghostPiece.style.left = `calc(${col} * 14.2857% + 7.1428%)`;
    
    // Set data-row for absolute fallbacks, and also update top directly
    this.ghostPiece.dataset.row = row;
    this.ghostPiece.style.top = `calc(${row} * 16.6667% + 8.3333%)`;
    this.ghostPiece.style.display = 'block';
  }

  hideGhostPiece() {
    if (this.ghostPiece) {
      this.ghostPiece.style.display = 'none';
    }
  }

  addPiece(col, row, player) {
    const piece = document.createElement('div');
    piece.className = `piece ${player === 1 ? 'player' : 'ai'} piece-drop-${row}`;
    
    piece.style.left = `calc(${col} * 14.2857% + 7.1428%)`;
    
    // Important: Assign data attributes immediately!
    piece.dataset.col = col;
    piece.dataset.row = row;
    
    // Set static top position inline to prevent CSS jump override issues
    piece.style.top = `calc(${row} * 16.6667% + 8.3333%)`;
    
    this.piecesLayer.appendChild(piece);
    this.synth.playDrop();
  }

  removePiece(col, row) {
    const piece = this.piecesLayer.querySelector(`.piece[data-col="${col}"][data-row="${row}"]`);
    if (piece) {
      piece.classList.add('removing');
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
    this.winLineSvg.innerHTML = '';
    this.stopConfetti();
    this.hideGhostPiece();
  }

  highlightWinningSequence(cells, winner, lastCol, lastRow) {
    const color = winner === 1 ? 'var(--color-player)' : 'var(--color-ai)';
    
    cells.forEach(([col, row]) => {
      const piece = this.piecesLayer.querySelector(`.piece[data-col="${col}"][data-row="${row}"]`);
      if (piece) {
        piece.classList.add('winning');
        piece.style.color = color;
        
        // Highlight the winning move specifically
        if (col === lastCol && row === lastRow) {
          piece.classList.add('winning-move');
        }
      }
    });

    setTimeout(() => {
      if (winner === 1) {
        this.synth.playWin();
        this.startConfetti();
      } else if (winner === 2) {
        this.synth.playLose();
      }
    }, 400);
  }

  clearWinningHighlights() {
    // Remove winning class animations and remove SVG win line
    const pieces = this.piecesLayer.querySelectorAll('.piece');
    pieces.forEach(p => {
      p.classList.remove('winning', 'winning-move');
    });
    this.winLineSvg.innerHTML = '';
    this.stopConfetti();
  }

  // Confetti Particle Engine
  startConfetti() {
    this.confettiCanvas.width = window.innerWidth;
    this.confettiCanvas.height = window.innerHeight;
    this.confettiActive = true;
    this.particles = [];

    const colors = [
      '#ff3366', '#00f0ff', '#ffb703', '#52b788', '#ffffff', '#e0aaff'
    ];

    const particleCount = 120;
    for (let i = 0; i < particleCount; i++) {
      const x = window.innerWidth / 2 + (Math.random() * 120 - 60);
      const y = window.innerHeight * 0.7;
      this.particles.push(new ConfettiParticle(x, y, colors));
    }

    this.animateConfetti();
  }

  stopConfetti() {
    this.confettiActive = false;
    this.particles = [];
    this.confettiCtx.clearRect(0, 0, this.confettiCanvas.width, this.confettiCanvas.height);
  }

  animateConfetti() {
    if (!this.confettiActive) return;

    this.confettiCtx.clearRect(0, 0, this.confettiCanvas.width, this.confettiCanvas.height);

    let activeParticles = 0;
    this.particles.forEach(p => {
      p.update(this.confettiCanvas.width, this.confettiCanvas.height);
      p.draw(this.confettiCtx);
      
      if (p.y < this.confettiCanvas.height + p.size && p.x > -p.size && p.x < this.confettiCanvas.width + p.size) {
        activeParticles++;
      }
    });

    if (activeParticles > 0 && this.confettiActive) {
      requestAnimationFrame(() => this.animateConfetti());
    } else {
      this.stopConfetti();
    }
  }

  updateScores(playerWins, aiWins, draws, streak = 0) {
    this.playerWinsEl.textContent = playerWins;
    this.aiWinsEl.textContent = aiWins;
    this.drawCountEl.textContent = draws;
    
    this.streakCounterEl.textContent = `STREAK: ${streak}`;
    if (streak > 0) {
      this.streakCounterEl.style.display = 'block';
    } else {
      this.streakCounterEl.style.display = 'none';
    }
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

  setThinking(isThinking) {
    if (isThinking) {
      this.aiThinking.classList.remove('hidden');
    } else {
      this.aiThinking.classList.add('hidden');
    }
  }

  // Show/Hide Chess.com Replay Panel
  setReplayMode(isActive, stepIndex, totalMoves) {
    if (isActive) {
      this.defaultTurnIndicator.classList.add('hidden');
      this.replayControls.classList.remove('hidden');
      
      // Update step index text
      if (stepIndex === 0) {
        this.replayStatusText.textContent = `START (0/${totalMoves})`;
      } else {
        this.replayStatusText.textContent = `MOVE ${stepIndex}/${totalMoves}`;
      }

      // Configure button enabled/disabled states based on step index
      this.repStartBtn.disabled = (stepIndex === 0);
      this.repBackBtn.disabled = (stepIndex === 0);
      this.repForwardBtn.disabled = (stepIndex === totalMoves);
      this.repEndBtn.disabled = (stepIndex === totalMoves);
      
      this.setThinking(false);
      this.updateInteractiveHoverPlayer(0); // Disable board highlights during replay
    } else {
      this.defaultTurnIndicator.classList.remove('hidden');
      this.replayControls.classList.add('hidden');
    }
  }

  updateInteractiveHoverPlayer(player) {
    const parentContainer = this.boardOuter.parentElement;
    parentContainer.classList.remove('red-active', 'cyan-active');
    
    if (player === 1) {
      parentContainer.classList.add('red-active');
    } else if (player === 2) {
      parentContainer.classList.add('cyan-active');
    }
  }

  showGameOver(winner, direction) {
    const parentContainer = this.boardOuter.parentElement;
    parentContainer.classList.remove('red-active', 'cyan-active');
    
    this.overlayContent.classList.remove('player-win', 'ai-win', 'draw-win');

    const descNames = {
      'horizontal': 'horizontal',
      'vertical': 'vertical',
      'diagonal-up': 'diagonal',
      'diagonal-down': 'diagonal'
    };
    const lineType = descNames[direction] ? ` with a ${descNames[direction]} line` : '';

    if (winner === 1) {
      this.overlayContent.classList.add('player-win');
      this.winnerTitle.textContent = 'VICTORY!';
      this.winnerSubtitle.textContent = `Outstanding moves! You defeated the elite AI${lineType}. Click "Watch Replay" below to review your moves.`;
    } else if (winner === 2) {
      this.overlayContent.classList.add('ai-win');
      this.winnerTitle.textContent = 'DEFEAT!';
      this.winnerSubtitle.textContent = `The elite minimax AI outplayed you${lineType}. Click "Watch Replay" below to analyze the game and see where it was lost.`;
    } else {
      this.overlayContent.classList.add('draw-win');
      this.winnerTitle.textContent = "IT'S A DRAW";
      this.winnerSubtitle.textContent = 'Both sides played flawlessly. An unbreakable grid! Click "Watch Replay" below to review the match.';
    }

    this.gameOverScreen.classList.remove('hidden');
  }

  hideGameOver() {
    this.gameOverScreen.classList.add('hidden');
  }

  setUndoDisabled(disabled) {
    this.undoBtn.disabled = disabled;
  }

  // Tutorial Dialog Helper Methods
  showTutorialOptin() {
    this.tutOptinModal.classList.remove('hidden');
  }

  hideTutorialOptin() {
    this.tutOptinModal.classList.add('hidden');
  }

  async showTutorialBubble(stepIndex) {
    this.hideTutorialBubble();
    
    const steps = [
      {
        target: this.boardOuter,
        title: 'CONNECT 4 RULES',
        text: 'Players take turns dropping red/yellow pieces. Connect 4 of your pieces in a row (horizontal, vertical, or diagonal) to win!',
        pos: 'right'
      },
      {
        target: this.boardOuter,
        title: 'GHOST PREVIEW',
        text: 'Tap or click the column you want to drop your piece in.',
        pos: 'right'
      },
      {
        target: this.floatingThemeSelector,
        title: 'THEME SELECTOR',
        text: 'Swap visual themes instantly mid-game using these bottom-left circles.',
        pos: 'top-left'
      },
      {
        target: this.undoBtn,
        title: 'UNDO MOVE',
        text: 'Undo any misplays at any time to revise your strategy.',
        pos: 'right'
      },
      {
        target: this.defaultTurnIndicator.parentElement,
        title: 'STATUS BAR & REPLAYS',
        text: 'Toggle sound effects, or watch step-by-step interactive game replays here.',
        pos: 'bottom'
      }
    ];

    const step = steps[stepIndex];
    if (!step) return;

    this.tutStepTitle.textContent = step.title;
    this.tutStepText.textContent = step.text;

    // Spotlight highlight target
    step.target.classList.add('tutorial-highlight');

    // Scroll the highlighted element into view so mobile users can see it,
    // then recalculate the bounding box after the scroll settles.
    step.target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });

    // Wait briefly for the smooth scroll to settle before positioning the bubble
    await new Promise(resolve => setTimeout(resolve, 350));

    // Position bubble relative to target bounding box
    const rect = step.target.getBoundingClientRect();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    this.tutOverlay.classList.remove('hidden');
    this.tutBubble.classList.remove('hidden');
    this.tutBubble.className = 'tutorial-bubble'; // Reset positions

    if (step.pos === 'right') {
      this.tutBubble.style.top = `${rect.top + scrollY + rect.height / 2 - 80}px`;
      this.tutBubble.style.left = `${rect.right + scrollX + 20}px`;
      this.tutBubble.classList.add('pos-right');
    } else if (step.pos === 'top-left') {
      this.tutBubble.style.top = `${rect.top + scrollY - 170}px`;
      this.tutBubble.style.left = `${rect.left + scrollX}px`;
      this.tutBubble.classList.add('pos-bottom');
    } else if (step.pos === 'right-sidebar') {
      this.tutBubble.style.top = `${rect.top + scrollY}px`;
      this.tutBubble.style.left = `${rect.right + scrollX + 20}px`;
      this.tutBubble.classList.add('pos-right');
    } else if (step.pos === 'bottom') {
      this.tutBubble.style.top = `${rect.bottom + scrollY + 20}px`;
      this.tutBubble.style.left = `${rect.left + scrollX + rect.width / 2 - 145}px`;
      this.tutBubble.classList.add('pos-bottom');
    }

    this.tutPrevBtn.style.display = stepIndex === 0 ? 'none' : 'inline-block';
    this.tutNextBtn.textContent = stepIndex === steps.length - 1 ? 'FINISH' : 'NEXT';
  }

  hideTutorialBubble() {
    this.tutBubble.classList.add('hidden');
    this.tutOverlay.classList.add('hidden');
    document.querySelectorAll('.tutorial-highlight').forEach(el => {
      el.classList.remove('tutorial-highlight');
    });
  }
}
