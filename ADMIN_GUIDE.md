# DEVOPS ARENA — EVENT ORGANIZER & ADMIN GUIDE
**Event:** Club Battle: TechVerse  
**Organizing Club:** DevOps Club  
**Game Title:** DEVOPS ARENA — The Production Rescue Mission  

---

## 1. Quick Start (Local Run)

To run the game locally on your laptop:

```bash
cd devops-arena
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 2. Supabase Cloud Leaderboard Setup

DevOps Arena automatically detects whether Supabase environment variables are present. If absent, the game runs seamlessly in **Local Standalone Mode** using browser storage.

To synchronize scores across multiple competition laptops in real-time:

### Step 1: Create a Supabase Project
1. Log in to [https://supabase.com](https://supabase.com) and click **New Project**.
2. Name the project `devops-arena-techverse` and set a secure database password.

### Step 2: Run the Database Migration
1. In the Supabase Dashboard, go to the **SQL Editor**.
2. Copy the entire contents of `supabase_schema.sql` from this repository.
3. Paste into the SQL editor and click **Run**.
4. This creates the `devops_arena_scores` table, performance ranking indexes, and Row Level Security (RLS) policies.

### Step 3: Configure Environment Variables
Create a `.env` file in the `devops-arena/` project root (or `.env.local`):

```ini
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

> **Security Note:** Only use the **anon/public** key in client-side code and `.env`. Never use the `service_role` key in frontend code.

---

## 3. Deployment on Vercel

To host the game online for tournament participants:

1. Push this repository to GitHub or GitLab.
2. In [Vercel](https://vercel.com), click **Add New Project** and import the repository.
3. In **Build and Output Settings**:
   - Framework Preset: **Vite**
   - Root Directory: `devops-arena` (if in a subfolder, otherwise `./`)
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. In **Environment Variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Click **Deploy**.

---

## 4. Question Bank Customization

The question bank is located in `src/data/incidents.js`.

Each incident includes:
- `id`: Unique identifier (e.g. `GIT-001`, `LNX-005`, `DOC-003`)
- `category`: Discipline tag (`Git & Version Control`, `Linux & Command Line`, `Docker & Containers`, `CI/CD`, `Networking & DNS`, `Cloud & Infrastructure`, `Monitoring & Incident Response`, `Security & Reliability`)
- `difficulty`: `'Beginner'` | `'Intermediate'`
- `severity`: `'LOW'` | `'MEDIUM'` | `'HIGH'` | `'CRITICAL'`
- `title`: Problem title
- `description`: Plain-language explanation of what went wrong
- `logSnippet`: Terminal output, error stacktrace, or metric log
- `leftAction`: `{ title, description, icon }`
- `rightAction`: `{ title, description, icon }`
- `correctAction`: `'left'` | `'right'`
- `explanation`: Educational takeaway explaining why the choice is correct
- `impact`: `{ availability, integrity, security, stability }`

You can add, edit, or remove incidents directly without modifying any game engine code.

---

## 5. Event Operations & Multiple Laptop Testing

### Multi-Laptop Testing Procedure
1. Deploy the app to Vercel or run a shared local IP network (`npm run dev -- --host`).
2. Have Organizer A submit a mission on Laptop 1 with enrollment `TEST-001`.
3. Have Organizer B open the Leaderboard on Laptop 2 and click **Refresh**.
4. Verify that `TEST-001` appears in both leaderboards identically.

### Distinguishing Test Data from Event Data
- During testing before the event, prefix test enrollments with `TEST-` (e.g. `TEST-01`, `TEST-02`).
- To clear test entries prior to official competition start, run this in the Supabase SQL Editor:

```sql
-- Remove test records prior to tournament launch:
DELETE FROM public.devops_arena_scores 
WHERE enrollment_number LIKE 'TEST-%';
```

### One-Attempt Rule Enforcement
- The registration system queries Supabase to check if an enrollment number has already completed a mission.
- If a student had an accidental power cut or verified technical issue, an organizer can allow a replay by removing their earlier attempt from the database:

```sql
DELETE FROM public.devops_arena_scores 
WHERE enrollment_number = '0101CS221045';
```

---

## 6. Scoring Rules Reference (3-Round / 45-Second Format)

- **Total Mission Limit:** 45 seconds total
- **Round Duration:** Exactly 3 rounds of 15 seconds each
- **Base Correct Decision:** `+100 points`
- **Incorrect Decision:** `0 points` (resets streak)
- **Round Timeout (15s expired):** `0 points` (resets streak)
- **Perfect Streak Bonus:** Getting all 3 rounds correct awards a `+50 bonus` (350 points maximum possible score!)
- **Ranking Priority:**
  1. Highest Final Score (Max: 350)
  2. Highest Accuracy % (`Correct / Total Answered * 100`)
  3. Highest number of Correct Decisions (`3/3`, `2/3`, etc.)
  4. Earliest completion timestamp
