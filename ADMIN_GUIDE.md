# SWIPEOPS — EVENT ORGANIZER & ADMINISTRATOR OPERATIONS GUIDE

**Event:** Club Battle: TechVerse  
**Organizing Club:** DevOps Club  
**Application:** SwipeOps — Complete Event Management, Leaderboard & Admin System  
**Production Deployment:** [https://swipe-opsgame.vercel.app](https://swipe-opsgame.vercel.app)  

---

## 1. Quick Start & Accessing the Administrator Console

### Launching Locally
```bash
npm install
npm run dev
```
Navigate to `http://localhost:5173`.

### Accessing the Private Administrator Dashboard
1. From either the **Main Menu** or the **Public Leaderboard**, click the **⚡ Admin** / **Admin Portal** button.
2. An authentication modal appears requesting:
   - **Admin Call-sign / Name** (e.g., `Lead SRE Admin`, `Organizer Alex`)
   - **Security Passphrase**: `devops2026` (or the custom value configured in `VITE_ADMIN_PASSPHRASE`).
3. Click **Authenticate**. Once cleared, the console unlocks with full access to the 6 administrative management tabs.

---

## 2. Event Architecture & Rules

### Rule 1: One Official Attempt Per Student
- Every participant must register with **Full Name** and **Enrollment Number**.
- Inputs are normalized: enrollment is converted to **UPPERCASE** and stripped of spaces.
- The normalized enrollment is the student's unique identifier. Even if a participant enters a different name with the same enrollment number, the system identifies them as the same student.
- Once an attempt completes, the official attempt is locked against reuse.
- Returning students are immediately blocked with:
  > **YOU HAVE ALREADY PLAYED!**  
  > *"Your official attempt has already been recorded. Please contact the event administrator if you require another attempt."*  
  > Provides direct buttons to return to the Menu or Public Leaderboard.

### Rule 2: Refresh, Abandoned Attempt & Concurrency Resilience
- Starting an attempt reserves the run atomically in the database/storage with status `started`.
- Refreshing the browser or switching tabs restores the active attempt without granting extra attempts.
- Concurrent registration requests are handled atomically via `swipeops_start_attempt`.

### Rule 3: Admin-Authorized Replays
- Students **cannot** self-authorize replays under any circumstances.
- If a participant experiences a verified technical failure (e.g., power interruption, hardware crash):
  1. Open the Admin Console -> **Replay Management** or **Registered Players** tab.
  2. Click **+ Replay** or **Authorize Student Replay**.
  3. Enter the student's enrollment number, the mandatory reason (e.g., `Verified Wi-Fi disruption`), and admin call-sign.
  4. Confirm authorization.
- The authorization is recorded in the immutable audit log and marked `pending`.
- When the student enters their enrollment on the registration screen, the system detects clearance, displays **⚡ Admin Replay Authorized**, and atomically consumes the authorization when the mission launches.
- Unused authorizations can be revoked with an audit-logged reason.
- One authorization can **never** create multiple attempts.

### Rule 4: Best Score Policy on Leaderboard
- A student appears **only ONCE** on the public leaderboard.
- When an authorized replay is completed:
  - If the replay score is **higher**, the student's leaderboard rank and score update automatically.
  - If the replay score is **lower**, the student's previous higher score is preserved!
- Previous attempts are never deleted; every attempt remains preserved in chronological order in the Admin Console.

### Rule 5: Privacy & Tie-Breaking
- Public leaderboard displays partially masked enrollment numbers (e.g. `0101****1045`) to protect student privacy on auditorium projectors.
- Rankings follow four strict tie-breakers:
  1. Highest Score (`final_score` DESC, Max 350 pts)
  2. Higher Accuracy (`accuracy` DESC)
  3. Faster Completion Time (`duration_seconds` ASC)
  4. Earlier Completion Time (`completed_at` ASC)

---

## 3. Administrator Console Tabs

| Tab | Capabilities |
|---|---|
| **📊 Overview** | Live database metrics: Total registered students, completed runs, active runs, unplayed students, locked students, authorized replays, used replays, total attempts, and tournament top score. |
| **👥 Registered Players** | Searchable by name/enrollment, filterable by status (`Completed`, `Active`, `Replay Authorized`), with one-click links to view a student's full chronological history or grant an authorized replay. |
| **📜 Attempt History** | Full chronological ledger of every single attempt: Player name, enrollment, attempt #, official vs replay designation, final score, accuracy, decisions, duration, and status. |
| **⚡ Replay Management** | Authorize 1 additional replay with required reason, view pending clearances, revoke unused clearances, and inspect consumed replay timestamps. |
| **🏆 Leaderboard Audit** | Live audit of the public leaderboard view applying the Best Score Policy and tie-breakers. Displays unmasked enrollments alongside public masked strings. |
| **🛡️ Admin Activity Log** | Immutable, append-only audit trail recording every administrative action (`REPLAY_AUTHORIZED`, `REPLAY_CONSUMED`, `REPLAY_REVOKED`, etc.) with timestamps, administrator name, target student, and reasons. |

---

## 4. Supabase Database Migration & RLS Security

To deploy the backend to your Supabase project:
1. Open the Supabase Dashboard -> **SQL Editor**.
2. Run the script in `supabase_schema.sql`.
3. It sets up:
   - `public.swipeops_students` (Enrollment PK, status, best scores, attempt counters)
   - `public.swipeops_attempts` (Historical run ledger, attempt #, status, duration)
   - `public.swipeops_replays` (Replay clearances, authorized by, reasons, status)
   - `public.swipeops_audit_log` (Append-only audit trail)
   - `public.swipeops_leaderboard_view` (Best score policy & masked enrollments)
   - Stored procedures / RPCs: `swipeops_start_attempt`, `swipeops_complete_attempt`, `swipeops_admin_authorize_replay`, `swipeops_admin_revoke_replay`, `swipeops_get_overview_stats`.
   - Strict Row Level Security (RLS) policies:
     - Public read for leaderboard view.
     - Direct client inserts/updates/deletes denied; mutations must flow through secure backend RPCs.
     - Append-only restrictions on the audit log.

### Standalone Local Fallback
If Supabase environment variables are not configured or if an internet outage occurs at the venue, SwipeOps seamlessly falls back to its local standalone storage engine which enforces the exact same rules, Best Score Policy, attempt locks, and audit trails without crashing.
