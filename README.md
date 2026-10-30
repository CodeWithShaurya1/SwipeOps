# SwipeOps — DevOps Arena: The Production Rescue Mission

An adrenaline-pumping, Tinder-style incident response game designed for TechVerse and DevOps Club events. React fast, think smart, and make high-stakes operational decisions to save production!

---

## ⚡ Overview

You're an on-call SRE thrust into a live production crisis. Critical alerts are firing across the cluster. You have **3 rounds**, **15 seconds per round**, and a global mission timer of **45 seconds** to triage and resolve infrastructure catastrophes before total system blackout.

- **Tactile Card Deck**: Tinder/Bumble-style physical card swipe mechanics with spring physics, directional stamps, and rotation dynamics.
- **Translucent Glassmorphism**: Frosted glass surfaces with subtle borders, cyan glowing focus states, and zero double-layer bleed.
- **DevOps Matrix Rain**: High-framerate 60 FPS HTML5 canvas background featuring real DevOps commands, tokens, and peripheral CI/CD telemetry packets.
- **Production Health Telemetry**: Live cluster vitals tracking Service Availability, Data Integrity, Security Posture, and Deployment Stability.
- **Competitive Leaderboard**: Real-time cloud sync with Supabase and automatic fallback to local high scores.

---

## 🎮 How to Play

Each round presents an incident card with a scenario description, category badge, and terminal clue.

- **Swipe Left (`←` / Left Arrow / Click)**: Commit the Left operational choice.
- **Swipe Right (`→` / Right Arrow / Click)**: Commit the Right operational choice.

### Scoring
- **Correct Decision**: `+100 Points`
- **Incorrect / Timeout**: `0 Points` (streak reset)
- **Flawless Run Bonus**: Get all 3 correct for `+50 Bonus` (`350 Points` max)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or pnpm

### Installation
```bash
git clone https://github.com/CodeWithShaurya1/SwipeOps.git
cd SwipeOps
npm install
```

### Local Development
```bash
npm run dev
```
Open your browser at `http://localhost:5173/` (or the indicated Vite port).

### Production Build
```bash
npm run build
npm run preview
```

### Run Tests
```bash
npm test
```

---

## 🛠️ Architecture & Tech Stack

- **Core**: Vanilla HTML5, CSS3, ES Modules (Modern JavaScript)
- **Bundler**: Vite
- **Database / Sync**: Supabase JS Client (`@supabase/supabase-js`)
- **Effects**: HTML5 2D Canvas (Matrix Rain), Canvas Confetti (`canvas-confetti`)
- **Audio**: Web Audio API Sound FX Synthesizer

---

## 📄 License

MIT License. Built with ❤️ for the DevOps Club TechVerse event.