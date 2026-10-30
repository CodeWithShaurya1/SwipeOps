<div align="center">

# ⚡ SwipeOps
### DEVOPS ARENA — The Production Rescue Mission

An adrenaline-pumping, Tinder-style incident response game built for **Club Battle: TechVerse** organized by the **DevOps Club**.

[![Event](https://img.shields.io/badge/Event-TechVerse-8B5CF6?style=for-the-badge&logo=google-cloud&logoColor=white)](https://github.com/CodeWithShaurya1/SwipeOps)
[![Club](https://img.shields.io/badge/Club-DevOps%20Club-38BDF8?style=for-the-badge&logo=docker&logoColor=white)](https://github.com/CodeWithShaurya1/SwipeOps)
[![Vite](https://img.shields.io/badge/Built%20With-Vite%208-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Database](https://img.shields.io/badge/Cloud%20Sync-Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Tests](https://img.shields.io/badge/Test%20Suite-100%25%20Passing-34D399?style=for-the-badge&logo=node.js&logoColor=white)](https://github.com/CodeWithShaurya1/SwipeOps)
[![License: MIT](https://img.shields.io/badge/License-MIT-F59E0B?style=for-the-badge)](LICENSE)

<br/>

**React fast. Think smart. Save production.**  
*3 critical incidents. 15 seconds per round. 45 seconds total. Can you keep the cluster online?*

[Play Locally](#-quickstart) • [Game Mechanics](#-game-mechanics) • [Scoring Rules](#-scoring--streak-system) • [Architecture](#-architecture--tech-stack)

</div>

---

## 📌 Repository Description & Topics (For GitHub About)

> **Repository Description**:  
> ⚡ High-stakes, Tinder-style incident triage game for SREs & DevOps engineers. Built with vanilla JS, frosted glassmorphism, 60fps DevOps Matrix Rain, and live Supabase leaderboards for TechVerse.

> **Suggested GitHub Topics**:  
> `devops` • `game` • `tinder-swipe` • `glassmorphism` • `sre` • `docker` • `kubernetes` • `supabase` • `vite` • `javascript` • `matrix-rain` • `techverse` • `incident-response`

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Game Mechanics](#-game-mechanics)
- [Scoring & Streak System](#-scoring--streak-system)
- [Production Health Telemetry](#-production-health-telemetry)
- [Incident Question Bank](#-incident-question-bank)
- [Design System & Glassmorphism](#-design-system--glassmorphism)
- [Quickstart](#-quickstart)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Testing](#-testing)
- [License](#-license)

---

## ⚡ Overview

**SwipeOps** thrusts players into the high-pressure shoes of an on-call Site Reliability Engineer (SRE). Production alerts are blaring, web traffic is dropping, and services are degrading.

Players face a dynamic deck of real-world infrastructure failures. Using fluid **Tinder/Bumble-inspired card swipe gestures**, keyboard shortcuts, or mouse clicks, players must choose the correct engineering remedy before the countdown runs out.

```
       ┌────────────────────────────────────────────────────────┐
       │                  DEVOPS ARENA : HUD                    │
       │  Round 01 of 03  │  ⏱️ 15s Round  │  🔥 0 STREAK  │ 0 pts │
       └────────────────────────────────────────────────────────┘
                                   │
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │   🌐 Availability: 100%   │   🛡️ Integrity: 100%       │
       │   🔐 Security:     100%   │   🚀 Stability: 100%       │
       └────────────────────────────────────────────────────────┘
                                   │
                                   ▼
        👈 SWIPE LEFT                              SWIPE RIGHT 👉
    ┌──────────────────────┐                    ┌──────────────────────┐
    │  RESTART CONTAINER   │    [ CARD STACK ]  │   INSPECT LOGS       │
    │  docker restart ...  │ ◄─ [  INCIDENT  ] ─►  docker logs -f ...  │
    └──────────────────────┘    [   DECK     ]  └──────────────────────┘
```

---

## 🌟 Key Features

### 1. Tactile Dating-App-Style Card Deck
- **Physical Feel**: Real spring drag resistance, proportional rotation (`deg = deltaX * 0.08`), and exit velocity physics.
- **Directional Stamps**: Dynamic `👈 COMMIT LEFT` and `COMMIT RIGHT 👉` visual badges that scale, rotate, and illuminate as the card is dragged past decision thresholds.
- **Queue Layering**: True 3-layer card stack with subtle circuit conduits and zero double-layer text ghosting.

### 2. Dark Frosted Glassmorphism
- **Layered Transparency**: Specially calibrated translucent dark slate/navy surfaces (`rgba(15, 23, 42, 0.40–0.68)`) with `backdrop-filter: blur(16px)`.
- **Crystal Clear Text**: Content clarity preservation ensures all telemetry, terminal clues, and code snippets remain ultra-crisp.
- **Glass Inputs**: Form fields featuring cyan focus halos, inner highlights, and seamless validation.

### 3. Living 60 FPS DevOps Matrix Background
- **Technical Streams**: Real DevOps tokens raining down the canvas (`docker`, `kubectl`, `helm`, `git push`, `k8s pod`, `CI/CD`, `200 OK`, `YAML`).
- **Peripheral Conduits**: Edge pipeline conduits with traveling telemetry packets along screen borders.
- **Interactive Shockwaves**: Emerald pulse rings on successful resolutions and coral alert waves on incident failures.

### 4. Real-Time Cloud Leaderboard
- **Supabase Integration**: Instant synchronization of player scores, streaks, and accuracy metrics.
- **Offline Resilient**: Automatic fallback to local storage mode if offline, with seamless sync status indicators.

---

## 🎮 Game Mechanics

Each mission consists of **3 randomly selected production outages**:

| Input Method | Left Action | Right Action |
| :--- | :--- | :--- |
| **Touch / Trackpad** | Swipe card to the **Left** | Swipe card to the **Right** |
| **Keyboard** | `[←]` Left Arrow Key | `[→]` Right Arrow Key |
| **Mouse / Click** | Click Left Action Card | Click Right Action Card |

---

## 🎯 Scoring & Streak System

Speed and accuracy dictate your rank on the TechVerse leaderboard:

- **Correct Decision**: `+100 Points`
- **Incorrect Decision**: `0 Points` (Streak resets to 0)
- **Round Timeout (15s expired)**: `0 Points` (Infrastructure penalties applied)
- **Flawless Mission Bonus**: Answer all 3 incidents correctly for a **`+50 Bonus`**
- **Maximum Possible Score**: **`350 Points`** 🏆

### Performance Tiers
- **350 Points / 3-0**: ⭐ Perfect Run · Lead SRE Architect
- **200–349 Points / 2-1**: 🛡️ Production Rescue Specialist
- **100–199 Points / 1-2**: 💻 Junior On-Call Operator
- **0–99 Points / 0-3**: 🌱 DevOps Apprentice

---

## 🛡️ Production Health Telemetry

Every decision impacts the 4 fictional production metrics:

1. **🌐 Service Availability**: Overall uptime and user HTTP success rate.
2. **🛡️ Data Integrity**: Database consistency, replication lag, and persistence.
3. **🔐 Security Posture**: CVE vulnerability status and access control boundaries.
4. **🚀 Deployment Stability**: CI/CD pipeline health and container cluster state.

> ⚠️ **Warning**: Dangerous choices (e.g., dropping production tables, skipping security scans, or granting root access) severely penalize cluster metrics!

---

## 📚 Incident Question Bank

The engine includes 15 hand-crafted incident scenarios covering core engineering competencies:

- **Git & GitHub**: Detached HEAD during hotfix release, accidental master commit.
- **Linux Fundamentals**: Zombie processes exhausting PID table, root disk 100% full.
- **Docker Basics**: Container exits 1 second after startup, missing port forwarding.
- **Kubernetes**: Pod stuck in `CrashLoopBackOff`, service endpoints missing.
- **CI/CD Pipelines**: Broken linting step blocking hotfix, secret exposed in build logs.
- **HTTP & Networking**: 502 Bad Gateway behind Nginx, SSL certificate expiration.
- **Cloud & Database**: Unverified database backups, database connection pool exhaustion.
- **Security**: Default admin credentials exposed on production gateway.

---

## 🎨 Design System & Glassmorphism

Built with modern CSS variables and glass tokens:

```css
:root {
  --glass-base: rgba(15, 23, 42, 0.40);
  --glass-panel: rgba(15, 23, 42, 0.48);
  --glass-panel-elevated: rgba(14, 22, 38, 0.62);
  --glass-card-active: rgba(14, 22, 38, 0.68);
  --glass-blur-base: blur(16px) saturate(135%);
  --glass-border: 1px solid rgba(255, 255, 255, 0.08);
  --glass-shadow: 0 12px 40px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.04);
}
```

Includes automatic fallback styles for browsers that do not support CSS `backdrop-filter`.

---

## 🚀 Quickstart

### Prerequisites
- Node.js (v18.0 or higher)
- npm or pnpm

### 1. Clone the repository
```bash
git clone https://github.com/CodeWithShaurya1/SwipeOps.git
cd SwipeOps
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start development server
```bash
npm run dev
```
Open **`http://localhost:5173/`** in your browser to launch the arena.

### 4. Build for production
```bash
npm run build
npm run preview
```

---

## 🧪 Testing

SwipeOps features an automated regression test suite covering scoring, game progression, timer countdowns, and swipe deck physics:

```bash
npm test
```

### Test Coverage:
- `test/multi_round_progression.test.js`: Verifies 3-round sequential progression and debriefing transition.
- `test/game_engine.test.js`: Validates 15-question bank and exact 350-point scoring model.
- `test/timer_countdown.test.js`: Tests 15-second per-round countdown and automatic timeout handling.
- `test/tinder_swipe_deck.test.js`: Validates drag thresholds, directional stamps, and keyboard triggers.

---

## 🏗️ Architecture & Tech Stack

```
devops-arena/
├── index.html                  # Shell & Google Typography
├── package.json                # Scripts & dependencies
├── supabase_schema.sql         # Leaderboard database schema
├── src/
│   ├── main.js                 # App coordinator & screen router
│   ├── styles/main.css         # Complete Glassmorphism & Cyberpunk Design System
│   ├── data/incidents.js       # 15 curated DevOps scenarios
│   ├── systems/
│   │   ├── DevOpsBackground.js # High-framerate Matrix rain & peripheral conduits
│   │   ├── IncidentEngine.js   # 3-round incident selection & answer evaluation
│   │   ├── MissionTimer.js     # 15s round & 45s mission timer
│   │   ├── ProductionState.js  # 4-metric infrastructure health model
│   │   ├── ScoringEngine.js    # Points, streaks, and accuracy calculations
│   │   ├── SoundFX.js          # Web Audio API sound synthesizer
│   │   └── StorageManager.js   # Supabase cloud sync + localStorage fallback
│   └── ui/
│       ├── MainMenu.js         # Landing hero with animated CI/CD pipeline rail
│       ├── Registration.js     # Operator credentials & telemetry readiness
│       ├── MissionScreen.js    # Gameplay HUD & round orchestrator
│       ├── IncidentCard.js     # Tinder-style 3-layer card swipe deck
│       ├── ProductionHealth.js # Real-time telemetry pills
│       ├── HowToPlayModal.js   # Briefing dialog
│       ├── GameOver.js         # Debriefing scorecard & celebration confetti
│       └── Leaderboard.js      # Global rankings table
└── test/                       # Node.js automated test suites
```

---

## 👥 Credits & Event Info

- **Created for**: DevOps Club TechVerse Event
- **Visual Direction**: Dark Cyberpunk Glassmorphism & SRE Simulation
- **License**: [MIT](LICENSE) © [Shaurya Bansal](https://github.com/CodeWithShaurya1)