# Connect 4 Elite AI

An advanced, premium Connect 4 web application featuring a highly competitive client-side AI opponent, sleek glassmorphic UI themes, interactive guides, and a chess.com-inspired match replay system.

👉 **Play Live**: [https://manandewan.github.io/connect4-elite-ai/](https://manandewan.github.io/connect4-elite-ai/)

---

## 🚀 1990s vs. Today: A Computational Leap

In the **1990s**, an application like this would have been virtually unthought of on standard consumer hardware:
* **The AI Bottleneck**: Running a minimax search tree up to **8 plies (moves ahead)** requires analyzing thousands of board permutations per second. In the 90s, executing this complex recursion on single-core, low-frequency CPUs would freeze the computer, taking minutes per turn.
* **Asset-less Audio Synthesis**: Real-time frequency-modulated sound synthesis via code was restricted to low-level assembly or sound chip MIDI formats.
* **Fluid Layouts**: The concepts of flexible aspect-ratio scaling (to automatically fit desktops, tablets, and phones down to a few pixels) and heavy GPU-accelerated backdrop blur filters (Glassmorphism) were non-existent.

**Today**, thanks to:
1. **Web Workers**: Offloading deep recursion to secondary background threads, keeping the browser UI active at a locked 60 FPS.
2. **Web Audio API**: Dynamically generating vintage sine and sawtooth sound waves in real-time without fetching audio asset files.
3. **Modern CSS Layout engines**: Delivering responsive rendering and GPU-accelerated transitions.

What once required specialized workstation research can now be built, optimized, and deployed globally at will directly in the browser.

---

## 🛠️ Technology Stack

* **Core Structure & Logic**: Semantic HTML5 and Vanilla JavaScript (written as modular ES Modules).
* **Styling (Design System)**: Raw CSS3 utilizing CSS Custom Properties (variables), Backdrop Filters, Grid layouts, and custom cubic-bezier keyframes.
* **AI Minimax Algorithm**: Minimax decision tree with Alpha-Beta Pruning. Includes:
  * **Move Ordering**: Prioritizing center columns to speed up search pruning.
  * **Immediate Heuristic Checks**: Instant win checks and threat block overrides to secure lines.
* **Multi-threading (Concurrency)**: HTML5 Web Worker API running the AI calculations on a separate thread.
* **Real-time Synthesizer**: Web Audio API generating synthesised oscillator notes (sine and sawtooth waves) dynamically for clicks, piece drops, and game over states.
* **Confetti Engine**: Native canvas 2D animation tracking vector coordinates, friction, and bounce boundaries.

---

## 💎 Features

* **Advanced Config Lobby**: Set AI depth (Easy, Medium, Elite AI) and select who takes the first turn (You or the AI) before entering the game.
* **Chess.com Inspired Replay System**: Review completed matches step-by-step using interactive UI buttons (`<<`, `<`, `>`, `>>`) or your keyboard (**Left Arrow** and **Right Arrow** keys).
* **Interactive Spotlight Tour**: A minimalist 4-step guided tutorial that dims the screen and spotlights key features (Ghost previews, Themes, Undo buttons, Replay controls) for new players.
* **Visually Crafted Themes**: 
  1. *Retro Classic*: Flat royal blue board with solid red and yellow pieces (no gradients, matching the traditional physical game).
  2. *Cyber Neon*: High-contrast purple-glass board with neon magenta vs. lime green pieces and ambient glows.
  3. *Sunset Gold*: Mahogany warm background with copper board and orange-red vs. golden amber pieces.
* **Undo Move Support**: Undo your last moves at any time to revise your strategy.
* **Persistent Themes**: Switch between styles mid-game instantly without resetting active matches.
* **Scores & Streak Tracker**: Track your wins, draws, and current win streak.

---

## 📂 Project Architecture

```bash
├── index.html          # Main HTML structure, landing lobby, & overlay cards
├── style.css           # Custom stylesheets, animations, themes, and layouts
├── js/
│   ├── app.js          # App orchestrator (binds UI, AI thread, & keyboard events)
│   ├── game.js         # Core Connect 4 game state & win evaluation rules
│   ├── ui.js           # DOM manipulation, Canvas confetti, & Web Audio synth
│   ├── ai.js           # Minimax algorithm (fallback search logic)
│   └── worker.js       # High-performance background AI search thread
└── README.md           # Project documentation
```
