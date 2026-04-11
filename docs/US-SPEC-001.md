# UI-SPEC-001.md — TRUSTNOW Autonomous AI Stack
## Platform UI/UX Specification — All Screens, All Roles, All Flows
### Document ID: UI-SPEC-001 v2.3 | March 2026
### Reference: BRD-1 v1.1, Genesys Cloud CX (UI pattern reference)

## CHANGELOG

| Version | Date | Change |
|---------|------|--------|
| v2.3 | March 2026 | Targeted top bar clarification: Preview button spec updated — explicitly available for both Draft and Live agents (button never disabled). No other changes. |
| v2.2 | March 2026 | Co-browse live call findings incorporated (28 Mar 2026). §6.4A Preview Screen: full Orb state machine (3 states), complete transcript bubble visual spec (agent left white bordered, user right gray no-avatar), ASR latency badge on user turns confirmed, LLM latency badge on agent turns confirmed (Xms / X.X s format), turn timestamp M:SS, bell icon per turn (QM flagging), streaming `...` tail, History panel live state label, phone button state machine (black idle → red X active). TAB 5 Analysis Transcription sub-tab: LLM + TTS badges on agent turns, ASR badge on user turns, bell icon per turn all confirmed. New §6.4B Orb State Machine added. §6.4 top bar: Preview button behaviour (URL + include_draft=true, required pre-publish testing step) and Publish button soft gate (zero-preview-conversations warning tooltip, advisory only) added. |
| v2.1 | March 2026 | Full co-browsing rewrite — all 10 tabs from live ElevenLabs platform. Agent Wizard §6.3A. Preview Screen §6.4A. Voice Picker §6.5 3-tab structure. 22-model LLM picker. Workflow visual canvas 4 templates. RAG config panel. |
| v1.0 | March 2026 | Initial baseline |
### CONFIDENTIAL — FOR INTERNAL USE ONLY

---

## DOCUMENT PURPOSE

This specification defines every screen, every user role, every navigation element, every user flow, and every UI component in the TRUSTNOW platform. It is the authoritative reference for frontend development (Tasks 8, 12, 13, 14, 15 in FULL-SCOPE-IMPL-001.md). No UI work begins without this document being read first.

**Reference model:** Genesys Cloud CX is the benchmark for enterprise contact centre platform UI/UX. TRUSTNOW adopts the same professional, information-dense, role-aware design philosophy — but with the TRUSTNOW dark-purple brand system and AI-first positioning.

---

## 1. DESIGN SYSTEM

### 1.1 Colour Palette (BRD §10 — LOCKED base colours)

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-bg-base` | `#1A0A4C` | Primary background — deep dark purple (BRD §10 LOCKED) |
| `--color-bg-surface` | `#120838` | Sidebar, top nav, elevated panels |
| `--color-bg-card` | `#1E1060` | Cards, modals, data panels |
| `--color-bg-hover` | `#2A1570` | Hover states on nav items, rows, cards |
| `--color-bg-selected` | `#2D1A7A` | Active/selected nav items, table rows |
| `--color-accent-cyan` | `#00D4FF` | Primary accent — headings, active indicators, links |
| `--color-accent-teal` | `#00B4CC` | Secondary accent — icons, badges, borders |
| `--color-accent-red` | `#E03E3E` | Primary CTA buttons (Login, Signup, Publish, Danger) |
| `--color-accent-orange` | `#E07B39` | Warnings, pending states, draft badges |
| `--color-accent-green` | `#22C55E` | Success, live/active states, online indicators |
| `--color-accent-amber` | `#F59E0B` | Caution, SLA warnings |
| `--color-text-primary` | `#FFFFFF` | Primary body text |
| `--color-text-secondary` | `#A0AEC0` | Labels, captions, helper text |
| `--color-text-muted` | `#6B7280` | Placeholders, disabled, timestamps |
| `--color-border` | `#2D1B8A` | Default borders |
| `--color-border-subtle` | `#1E1060` | Subtle dividers inside cards |

### 1.2 Typography

| Role | Font | Weight | Size |
|------|------|--------|------|
| Display | Inter | 800 | 48–72px |
| H1 | Inter | 700 | 32px |
| H2 | Inter | 600 | 24px |
| H3 | Inter | 600 | 18px |
| H4 | Inter | 600 | 14px |
| Body | Inter | 400 | 14px |
| Small | Inter | 400 | 12px |
| Mono | JetBrains Mono | 400 | 13px — CIDs, codes, technical IDs |
| Button | Inter | 600 | 14px |

### 1.3 Component Library
Built on **shadcn/ui + Radix UI** with TRUSTNOW dark-purple theme tokens.

**Standard variants:**
- `Button` — primary (red fill), secondary (teal outline), ghost (transparent), destructive (dark red)
- `Badge` — live (green pulse), draft (orange), paused (grey), error (red), cloud (cyan), onprem (purple)
- `Card` — standard surface container
- `Table` — sortable, filterable, with row actions
- `Tabs` — horizontal tab navigation
- `Dialog` + `Sheet` — modal dialogs and side drawers
- `Select` + `Combobox` — searchable dropdowns
- `Toast` — non-blocking notifications (bottom-right, 4s auto-dismiss)
- `Skeleton` — loading placeholder on all data-dependent components
- `Tooltip` — hover hints on all icon-only buttons

### 1.4 Layout

| Property | Value |
|----------|-------|
| Sidebar width | 240px (collapsed: 64px icon-only) |
| Top nav height | 56px |
| Content max-width | 1440px centred |
| Base spacing unit | 4px |
| Grid | 12-column Tailwind CSS |

### 1.5 Live State Indicators
All real-time indicators use a pulsing green dot animation:
- Active call counter in top nav (pulses while > 0)
- Agent status dot in Human Agent Desktop
- Live session badge on active conversations

---

## 2. USER ROLES & ACCESS MATRIX

### 2.1 Role Hierarchy

```
Platform Super Admin  (TRUSTNOW Operations — God mode, all tenants)
    └── Tenant Admin  (Client's platform manager — full control, own tenant)
            ├── Agent Admin     (Create/publish agents, manage KB and tools)
            ├── Supervisor      (Monitor, barge-in, QM scoring, recordings)
            ├── Operator        (Limited config, view reports — no publishing)
            ├── Auditor         (Read-only — compliance, audit logs, recordings)
            └── Human Agent     (Agent Desktop only — no platform admin access)
```

### 2.2 Permission Matrix

| Feature | Super Admin | Tenant Admin | Agent Admin | Supervisor | Operator | Auditor | Human Agent |
|---------|:-----------:|:------------:|:-----------:|:----------:|:--------:|:-------:|:-----------:|
| View all tenants | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Create / manage tenants | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage users & roles | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Create / publish agents | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Edit agent config | ✅ | ✅ | ✅ | ❌ | ✅ (limited) | ❌ | ❌ |
| View agents | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Manage Voice Library | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage Knowledge Base | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Manage Tools Registry | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| View live dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Monitor live calls | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Barge-in / Whisper | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| View MIS / Analytics | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Export reports | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| View recordings | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Score / annotate QM | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| View audit logs | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Manage billing | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View billing | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Platform settings | ✅ | ✅ (own tenant) | ❌ | ❌ | ❌ | ❌ | ❌ |
| Human Agent Desktop | ❌ | ❌ | ❌ | ✅ (monitor) | ❌ | ❌ | ✅ |

---

## 3. APPLICATION STRUCTURE

Three distinct web applications, one deployment:

| App | Base Path | Primary Users |
|-----|-----------|--------------|
| **Public Landing Page** | `/` | Unauthenticated visitors |
| **Platform Admin Console** | `/app/` | All admin roles (Super Admin → Auditor) |
| **Human Agent Desktop** | `/agent-desktop/` | Human Agents + Supervisors |

---

## 4. PUBLIC LANDING PAGE (`/`)

### 4.1 Layout (BRD §10 — LOCKED SPECIFICATION)

**Background:** Deep dark purple `#1A0A4C` with animated mesh/wave effect

**Header (fixed, full-width):**
- Left: TRUSTNOW logo (white wordmark + icon)
- Center nav: `AI Agents` | `Enterprise Integration` | `Resources` | `Contact us`
- Right: `Login` button (red fill) | `Signup` button (red fill)

**Hero Section (full viewport height):**
- Main heading: `TRUSTNOW AI WORKER STACK` — white, 72px, bold, centered
- Sub-heading: `Multi-tenant. Enterprise Grade. AI Agents aligned to client organisation structure. Policy driven. Audited. Governed. Fully Autonomous and handoff to human when required.` — secondary text, centered
- Three pillars (horizontal layout, connected by horizontal teal line):
  - Pillar 1: Teal circle icon + `Conversational AI Agents` (cyan bold)
  - Pillar 2: Teal circle icon + `Tools Enabled AI Agent Orchestration` (cyan bold)
  - Pillar 3: Teal circle icon + `Fully Autonomous AI Workers` (cyan bold)
- CTAs: `Get Started Free` (red fill) | `Watch Demo` (teal outline)
- Bottom: Red/purple animated wave/mesh decoration

**Features Section:**
- 3-column grid of capability cards
- Each card: Icon + Title + 2-line description
- Cards: Vendor Neutral | Enterprise Multi-Tenancy | Partition Flexible | Voice Library | Real-time MIS | NICE/VERINT-comparable QM

**How It Works Section:**
- 3-step visual: Configure Agent → Deploy → Monitor & Optimise
- Simple illustrated flow with numbered steps

**Social Proof Section:**
- Stat counters: "10+ LLM Providers" | "3 Agent Types" | "100% Audit Trail" | "N Concurrent Sessions"

**Footer:**
- Logo + tagline
- Links: Product | Company | Resources | Privacy Policy | Terms of Service
- Copyright

---

## 5. AUTHENTICATION FLOWS

### 5.1 Login Page (`/auth/login`)

**Layout:** Centered auth card (480px wide) on dark purple background with animated mesh.

**Card contents:**
- TRUSTNOW logo (centered, top of card)
- Heading: "Sign in to your workspace"
- Email field (label: "Work email")
- Password field (label: "Password", show/hide toggle)
- Row: `Remember me` checkbox (left) | `Forgot password?` link (right)
- **Sign In** button (red fill, full width, 48px height)
- Divider: "OR"
- **Continue with SSO** button (teal outline, full width) — for enterprise tenants
- Footer: "Don't have an account? `Sign up`"

**States:**
- Default | Loading (spinner in button) | Error (red border + inline error message below field) | Success (redirect)

**Error messages:**
- "Invalid email or password. Please try again."
- "Your account has been deactivated. Contact your administrator."
- "Too many login attempts. Please wait 15 minutes."

---

### 5.2 Sign Up Page (`/auth/signup`)

**Layout:** Centered card (520px), same background as login.

**Card contents:**
- TRUSTNOW logo
- Heading: "Create your workspace"
- Full name field
- Work email field
- Organisation name field
- Industry dropdown: Telco | Banking | Insurance | Healthcare | Retail | E-commerce | BPO | Other
- Password field (with live strength meter: Weak / Fair / Strong / Very Strong)
- Confirm password field
- `I agree to the Terms of Service and Privacy Policy` checkbox (required)
- **Create Account** button (red fill, full width)
- Footer: "Already have an account? `Sign in`"

**Post-signup:** Redirect to `/auth/verify-email`

---

### 5.3 Email Verification (`/auth/verify-email`)

**Layout:** Centered card, email icon illustration.

- Heading: "Check your inbox"
- Body: "We sent a verification link to `{email}`. Click the link to activate your account."
- `Resend email` link (with 60s cooldown)
- Helper: "Didn't receive it? Check your spam folder."
- "Wrong email? `Go back`" link

---

### 5.4 First Login Onboarding Wizard (`/app/onboarding`)

4-step wizard with progress bar at top.

**Step 1 — Your Organisation**
- Organisation name (pre-filled)
- Industry (pre-filled)
- Country / Timezone select
- Headcount range: 1–10 | 11–50 | 51–200 | 200+
- Primary use case: Inbound customer service | Outbound campaigns | Both

**Step 2 — Secure Your Account**
- MFA setup (optional but recommended — amber callout)
- Option A: Authenticator app (QR code shown)
- Option B: SMS (phone number input)
- Option C: Skip for now

**Step 3 — Quick Start**
- "You're all set! Here's what to do first:"
- Action card 1: `Create your first AI Agent` → `/app/agents/new`
- Action card 2: `Explore the Voice Library` → `/app/voices`
- Action card 3: `Invite your team` → `/app/settings/users`

**Step 4 — Done**
- Animated success state
- Single CTA: `Go to Dashboard`

---

### 5.5 Forgot Password (`/auth/forgot-password`)

- Email input
- **Send reset link** button
- Link sent state → "Check your email for a reset link"
- Reset form (`/auth/reset-password?token=xxx`): New password + confirm + **Reset Password** button
- On success: redirect to login with toast "Password updated successfully"

---

### 5.6 MFA Verification (`/auth/mfa`)

Shown after password validation for MFA-enabled accounts.
- TOTP: 6-digit code input (auto-submits when 6 digits entered)
- SMS: 6-digit code input + resend link
- "Use a recovery code" link (emergency access)

---

## 6. PLATFORM ADMIN CONSOLE

### 6.1 Global Navigation Shell

**Top Navigation Bar (56px, fixed, all pages):**

Left zone:
- Hamburger/chevron to collapse/expand sidebar
- TRUSTNOW logo (links to `/app/dashboard`)
- Breadcrumb: `Dashboard > Agents > {Agent Name} > Knowledge Base`

Centre zone:
- Global search bar (Cmd+K shortcut) — searches agents, conversations, voices, KB docs
- Placeholder: "Search agents, conversations, voices..."

Right zone:
- 🔴 Live calls counter: `● 24 active` (pulsing green dot + number, real-time WebSocket) — click to go to Live Dashboard
- 🔔 Notifications bell (badge for unread)
- Avatar dropdown:
  - User name + role badge
  - `My Profile`
  - `Account Settings`
  - `Switch Tenant` (Super Admin only)
  - Divider
  - `Sign out`

---

**Left Sidebar (240px, collapsible):**

Role-aware — items visible depend on role. Full view (Tenant Admin).

**Sidebar structure mirrors live ElevenLabs platform groupings, extended for TRUSTNOW:**

```
[TRUSTNOW logo / ElevenAgents workspace switcher ▾]

  🏠  Home

━━━━━ Configure ━━━━━━━━━━━━━━━━━
  🤖  Agents                    [+]
  📚  Knowledge Base
  🔧  Tools
  🔌  Integrations              [Alpha]
  🎙️  Voices                   [+]

━━━━━ Monitor ━━━━━━━━━━━━━━━━━━
  💬  Conversations
  👥  Users
  🧪  Tests

━━━━━ Deploy ━━━━━━━━━━━━━━━━━━━
  📞  Phone Numbers
  💬  WhatsApp
  📤  Outbound

━━━━━ (TRUSTNOW extensions) ━━━
  📡  Live Dashboard
  📈  MIS & Analytics
  ⭐  Quality Management
  🎵  Recordings
  👥  Users & Roles
  🏢  Tenants               [SA only]
  🔐  Audit Log

━━━━━ ━━━━━━━━━━━━━━━━━━━━━━━━━
  ⚙️  Settings

  📨  Invite team members        [bottom]
  👩‍💻  Developers                  [bottom]
```

**Notes on sidebar behaviour (observed live):**
- Workspace switcher at top (ElevenAgents branding) — in TRUSTNOW this is the Tenant switcher for Super Admin
- "Configure" group: primary agent management tools
- "Monitor" group: analytics, user monitoring, test management
- "Deploy" group: channel deployment (telephony, messaging)
- Agents item has `+` inline button for quick create
- Voices item has `+` inline button to add voice
- Integrations has "Alpha" badge — indicates beta feature
- "Invite team members" is a persistent card at bottom of sidebar (not just a link)
- Active item: highlighted with left accent border

Collapsed sidebar shows icons only + tooltips on hover.

---

### 6.2 Home / Dashboard (`/app/dashboard`)

**Purpose:** Real-time command centre. First screen after login. Matches live ElevenLabs "Home" page pattern extended with TRUSTNOW operations.

**Top bar (observed live from TRUSTNOW ElevenLabs account):**
- Right side: "What's new" button | "Feedback" button | "Docs" link | "Ask" button | notification bell | user avatar

**Active calls indicator (observed live):**
- `● Active calls: 0` pill (green dot + count) — real-time WebSocket
- "View old dashboard" link (for legacy users)

**Workspace greeting:**
- "My Workspace" label
- "Good morning/afternoon/evening, {Tenant Name}" — H1 greeting

**Analytics sub-tab navigation (observed live — 8 tabs):**
`General` | `Evaluation` | `Data Collection` | `Audio` | `Tools` | `LLMs` | `Knowledge Base` | `Advanced`

**Analytics controls:**
- "+ Create view" button — save custom filtered views
- "Date Range" selector | "Granularity" (Day/Week/Month) | "Agent" filter dropdown

**KPI metric cards row (observed live):**
| Metric | Description |
|--------|-------------|
| Number of calls | Total calls in period |
| Average duration | Mean call duration |
| Total cost | Combined LLM + STT + TTS |
| Average cost | Cost per call |
| Total LLM cost | LLM spend only |
| Average LLM cost | LLM cost per call |

Empty state: chart icon + "No data has been collected"

**TRUSTNOW extensions (below ElevenLabs-parity section):**

Live Calls panel:
- `● {N} active` (pulsing) — WebSocket-updated every 5s
- Columns: Agent | CID | Duration (live timer) | Caller (masked) | Status | Actions
- Actions: 👁 Monitor | 🎧 Whisper | 📞 Barge-in | ⤴ Handoff

Recent Alerts panel:
- SLA breach (red) | AI Error (orange) | Handoff triggered (cyan)

Charts:
- Call volume (7-day line chart)
- Agent type breakdown (donut)
- Top 5 agents by calls (horizontal bar)

**Super Admin extra:** Tenant selector dropdown to switch context.

---

### 6.3 Agent List (`/app/agents`)

**Header (matching live ElevenLabs "Agents" page):**
- Page title: "Agents"
- Right: "Browse templates" button (secondary) + **"+ New agent"** button (primary black)

**Filter & Search bar (observed live):**
- Search input: "Search agents..."
- Filter chips: `+ Creator` | `+ Archived`

**Table columns (observed live — list layout default):**
- Name | Created by | Created at ↓ (sortable) | `...` overflow menu

**Agent row (observed live):**
```
Testing                contact@trustnow.ai    Mar 19, 2026, 7:23 PM    [...]
Agents v3 Demo         ElevenLabs             Feb 16, 2026, 5:06 PM    [...]
TRUSTNOW               contact@trustnow.ai    Jan 30, 2026, 7:01 PM    [...]
```

**Overflow menu per row:** Edit | Duplicate | Archive | Delete

**TRUSTNOW extensions (grid view option):**
Agent Card (grid view):
```
┌─────────────────────────────────────┐
│  [TYPE ICON]  Agent Name      [LIVE]│
│  Conversational · Cloud · EN        │
│  ─────────────────────────────────  │
│  🎙️ Sarah  🤖 GPT-4o  📚 2 docs    │
│  ─────────────────────────────────  │
│  Calls today: 24  Cost: $0.18       │
│  Last active: 2 mins ago            │
│  [Configure]              [Monitor] │
└─────────────────────────────────────┘
```
- Status badge: Live (green) | Draft (amber) | Paused (grey) | Archived (dark)
- Type badges: Conversational | Tools-Assisted | Autonomous
- Quick actions: Configure → opens agent config | Monitor → opens live view

---

### 6.3A — "+ New Agent" Creation Wizard (COMPLETE FLOW — §1 + §7 co-browsing)

**Trigger:** `+ New agent` button (top-right of Agent List page) → opens full-screen overlay (not a new page). `×` close button top-right. URL stays at `/app/agents/new` throughout — SPA, no URL changes between steps.

**CRITICAL: Two completely distinct paths exist. Path A is 2 steps. Path B is 5 steps. They diverge immediately at Step 1.**

---

#### STEP 1 — Agent Type Selection (SHARED by both paths)

**Title:** "New agent"  
**Sub-title:** "What type of agent would you like to create?"  
**Progress dots:** Shown at bottom — dot count depends on path selected (2 for Blank, 5 for Guided)

**TRUSTNOW: 4 options displayed** (ElevenLabs has 3 — TRUSTNOW adds Autonomous AI Worker as a 4th):

| # | Option | Layout | Preview bubble | Badge | Post-selection |
|---|--------|--------|---------------|-------|----------------|
| 1 | **Blank Agent** | Full-width button row, radio circle icon ○ on left | None — plain text only | — | → Path A (2-step) |
| 2 | **Conversational AI Agent** | Left card of 3-column grid | Chat preview: customer service dialogue | `Recommended` (green) | → Path B (5-step) |
| 3 | **Tools-Assisted Agent** | Centre card | Chat preview: CRM lookup + response dialogue | — | → Path B (5-step + extra Tools config) |
| 4 | **Autonomous AI Worker** | Right card | Chat preview: multi-step orchestration dialogue | `TRUSTNOW Exclusive` (cyan badge) | → Path B (5-step + Workflow config) |

**Selection interaction (confirmed live from §7.2 co-browsing):**
- Click card once → card highlights with dark rounded border (selected state)
- Click card again → auto-advances to next step
- **Blank Agent row:** Single click advances immediately (no highlight-then-advance — row acts as direct action)
- No explicit "Next" button on this step

**Progress dots after Step 1:**
- Blank Agent selected → 2 dots shown (dot 1 filled, dot 2 empty)
- Any other option selected → 5 dots shown (dot 1 filled, dots 2–5 empty)

---

### PATH A — Blank Agent (2 Steps Total)

> **This is the "start from scratch" path. No AI generation. No industry/use case selection. Fastest path to the 10-tab config screen.**

---

#### PATH A — STEP 2: "Complete your agent"

**Title:** "Complete your agent"  
**Sub-title:** "Choose a name that reflects your agent's purpose"  
**Progress:** Dot 2 of 2 (both dots filled — final step)  
**Navigation:** `< Back` (ghost, left) | `Create Agent` (primary red fill, right — disabled until Agent Name filled)

**Fields — EXACTLY these two, NOTHING ELSE:**

| Field | Required | Component | Constraint | Default | Helper text |
|-------|----------|-----------|------------|---------|-------------|
| **Agent Name** | ✅ Yes (red `*`) | Text input | Max 50 chars · live counter `X/50` | Empty | No helper text |
| **Chat only** | No | Toggle (pill) | — | **OFF** | "Audio will not be processed and only text will be used" (inline, right of toggle) |

**⚠ CRITICAL — What is NOT on this screen for Blank path:**
- No `Main Goal` field
- No `Website URL` field
- No `Industry` field
- No `Use Case` field

**"Create Agent" button states:**
- Greyed/disabled → until Agent Name has ≥ 1 character
- Primary red fill / active → once Name field has content
- On click: `POST /agents` with `{agent_name, text_only}` → immediate response (< 200ms, no LLM call) → redirect to `/app/agents/{id}?tab=agent`

**Post-creation landing — Blank path:**
- 10-tab Agent config page opens
- System prompt: empty textarea (placeholder visible)
- First message: empty
- Voice: platform default
- LLM: platform default
- Status badge: `Draft`
- All 10 tabs are immediately accessible and configurable

---

### PATH B — Guided Wizard (5 Steps Total)

> **This path applies to Conversational AI Agent, Tools-Assisted Agent, and Autonomous AI Worker selections. Steps 2–5 are identical regardless of which of the three agent types was chosen in Step 1.**

---

#### PATH B — STEP 2: Industry Selection

**Title:** "What industry is your business in?"  
**Sub-title:** "Select the industry that best describes your business"  
**Progress:** Dot 2 of 5  
**Navigation:** `< Back` (left) — no explicit Next button (auto-advances on selection)  
**Behaviour:** Click card once → highlights. Click again → auto-advances to Step 3.

**TRUSTNOW: 22 industry cards in a 3-column grid** (17 ElevenLabs baseline + 5 BPO-specific — grouped separately):

**Group 1 — Standard industries (17 cards):**

| # | Label | Slug | Icon |
|---|-------|------|------|
| 1 | Retail & E-commerce | retail_ecommerce | Shopping bag |
| 2 | Healthcare & Medical | healthcare_medical | Medical cross |
| 3 | Finance & Banking | finance_banking | Bank columns |
| 4 | Real Estate | real_estate | House |
| 5 | Education & Training | education_training | Graduation cap |
| 6 | Hospitality & Travel | hospitality_travel | Suitcase |
| 7 | Automotive | automotive | Car |
| 8 | Professional Services | professional_services | Briefcase |
| 9 | Technology & Software | technology_software | Chip/circuit |
| 10 | Government & Public | government_public | Government building |
| 11 | Food & Beverage | food_beverage | Fork & knife |
| 12 | Manufacturing | manufacturing | Factory/gear |
| 13 | Fitness & Wellness | fitness_wellness | Heart |
| 14 | Legal Services | legal_services | Scales of justice |
| 15 | Non-Profit | nonprofit | People/community |
| 16 | Media & Entertainment | media_entertainment | Play button |
| 17 | Other | other | Question mark circle |

**Group 2 — BPO Specialist verticals (5 cards, visually separated with a divider and label "BPO Specialist"):**

| # | Label | Slug | Icon | Tooltip |
|---|-------|------|------|---------|
| 18 | Debt Collections | bpo_debt_collections | Dollar sign/document | "Outbound collections, payment arrangements, dispute handling" |
| 19 | Utilities Services | bpo_utilities | Lightning bolt | "Billing, outages, meter reading, service connections" |
| 20 | Insurance Claims | bpo_insurance_claims | Shield/checkmark | "FNOL intake, claims status, document collection" |
| 21 | Telecoms & Broadband | bpo_telecoms | Signal/tower | "Billing queries, fault logging, upgrades, retention" |
| 22 | Government Services | bpo_government_services | Star/building | "Benefits, applications, service eligibility, signposting" |

**BPO cards visual treatment:** Same card size as standard industries but with a `BPO` badge (cyan) in the top-right corner of each card, confirming these are TRUSTNOW-specialist templates.

---

#### PATH B — STEP 3: Use Case Selection

**Title:** "Use case"  
**Sub-title:** "What will your agent help with?"  
**Progress:** Dot 3 of 5  
**Navigation:** `< Back` — auto-advances on selection  
**Behaviour:** Use cases shown are dynamically filtered by the industry selected in Step 2.

**Use case cards layout:** 3-column grid, 12–13 cards per industry. Each card shows icon + label.

**Universal use cases (always first 6 in every industry):**

| # | Use Case | Slug |
|---|---------|------|
| 1 | Customer Support | customer_support |
| 2 | Outbound Sales | outbound_sales |
| 3 | Learning and Development | learning_development |
| 4 | Scheduling | scheduling |
| 5 | Lead Qualification | lead_qualification |
| 6 | Answering Service | answering_service |

**Industry-specific additions (rows 7–13 vary per industry) — see `IMPL-001 §6.2D-C` for complete mapping.**

**Key BPO-specific use cases (not in ElevenLabs — TRUSTNOW differentiator):**

| BPO Industry | Specialist Use Cases |
|-------------|---------------------|
| Debt Collections | Debt Collection Outreach, Payment Arrangement, Dispute Resolution, Skip Tracing Support, Regulatory Compliance Scripting, Payment Confirmation |
| Utilities | Billing Enquiries, Outage Reporting, Meter Reading Capture, Service Connection/Disconnection, Tariff Switching, Payment Plan Setup |
| Insurance Claims | FNOL (First Notice of Loss), Claims Status Update, Claims Document Collection, Claims Triage, Settlement Explanation, Fraud Referral |
| Telecoms | Bill Shock Resolution, Contract Upgrade, Technical Fault Logging, Network Outage Support, Roaming Queries, Churn Prevention |
| Government Services | Benefits Eligibility Check, Application Status, Document Submission Guidance, Appointment Booking, Complaint Escalation, Service Signposting |

---

#### PATH B — STEP 4: Ground Your Agent (KB Step — OPTIONAL)

**Title:** "Ground your agent"  
**Sub-title:** "Add tools and knowledge base documents to ground your agent's responses"  
**Progress:** Dot 4 of 5  
**Navigation:** `< Back` | `Skip` (ghost, centre) | `Continue ▶` (primary red, right)

**Layout (single-row expandable):**
```
┌────────────────────────────────────────────────────────────┐
│  📄  Knowledge Base                                [+ Add] │
└────────────────────────────────────────────────────────────┘
```

**On `+ Add` click** → inline dropdown expands below the row:
- Search bar: "Search documents..."
- Filter chips: `+ Type` | `+ Creator`
- Existing KB docs listed: T icon (text) | 📁 (folder) | 🌐 (URL crawl)
- Bottom action bar — 3 options:
  - `+ Add URL` — enter a URL to crawl
  - `Add Files` — upload PDF / DOCX / TXT / CSV (max 50MB per file)
  - `Create Text` — write inline text document

**Selected docs** appear as dismissible chips below the row.

**Skip behaviour:** Proceeds to Step 5 with no KB attached. KB can be added later from Tab 4 (Knowledge Base).

**EXCEED ELEVENLABS:** Show a "Recommended" section at top of the KB dropdown that suggests industry-relevant public KB sources based on the industry selected in Step 2. (e.g., for Healthcare: "Add NHS guidelines URL", for Finance: "Add FCA consumer guide URL"). This accelerates KB grounding for new users.

---

#### PATH B — STEP 5: "Complete your agent" (Final Step)

**Title:** "Complete your agent"  
**Sub-title:** "Choose a name that reflects your agent's purpose"  
**Progress:** Dot 5 of 5  
**Navigation:** `< Back` (ghost, left) | `Create Agent` (primary red fill, right — disabled until Agent Name + Main Goal both filled)

**Fields — all 4 present on guided path only:**

| Field | Required | Component | Constraint | Default | Helper text |
|-------|----------|-----------|------------|---------|-------------|
| **Agent Name** | ✅ Yes (red `*`) | Text input | Max 50 chars · live counter `X/50` | Empty | None |
| **Main Goal** | ✅ Yes (red `*`) | Large textarea (4 rows) | Max 1000 chars | Empty | Placeholder: "Describe what you want your agent to accomplish..." |
| **Website** | Optional | URL input | Must be valid https:// URL · helper shown | Empty | "We'll only access publicly available information from your website to personalise your agent." |
| **Chat only** | Optional | Toggle | — | **OFF** | "Audio will not be processed and only text will be used" |

**"Create Agent" button states:**
- Greyed/disabled → until BOTH Agent Name AND Main Goal are filled
- Primary red fill / active → both required fields have content
- Loading spinner → during agent creation (~2–4s while LLM generates system_prompt + first_message)
- On click: `POST /agents/wizard` with all wizard inputs → on response navigate to `/app/agents/{id}?tab=agent`

**Post-creation landing — Guided path:**
- 10-tab Agent config page opens
- System prompt: AI-generated (editable — it is the starting point, not locked)
- First message: AI-generated
- Voice: pre-selected (matched to industry/use case template)
- LLM: pre-selected
- If website URL was provided: Tab 4 (KB) shows spinner "Personalising from your website..." until async crawl completes
- Status badge: `Draft`

---

#### Complete Path Comparison — Quick Reference

| Attribute | Path A — Blank | Path B — Guided |
|-----------|---------------|-----------------|
| Steps | 2 | 5 |
| Agent types available | Blank Agent | Conversational / Tools-Assisted / Autonomous |
| Industry selection | ❌ | ✅ (22 options inc. 5 BPO) |
| Use case selection | ❌ | ✅ (12–13 per industry) |
| KB grounding step | ❌ | ✅ optional |
| Main Goal field | ❌ | ✅ required |
| Website URL field | ❌ | ✅ optional |
| System prompt | Empty | AI-generated |
| First message | Empty | AI-generated |
| Voice | Platform default | Pre-selected for industry |
| LLM | Platform default | Pre-selected |
| Creation time | < 200ms | 2–4s (LLM call) |
| Progress dots | 2 | 5 |
| Backend endpoint | `POST /agents` | `POST /agents/wizard` |
| `creation_path` value | `'blank'` | `'guided'` |

---

#### Implementation Notes

**Frontend (Task 8):**
- Wizard is a full-screen overlay, centred large modal on desktop, full-screen on mobile
- Step transitions: smooth slide animation left-to-right
- Progress dots at bottom: filled (past/current) = `--color-accent-cyan`, empty (future) = `--color-border`
- Steps 1, 2, 3: auto-advance on selection — no button
- Steps 4, 5 (Path B): explicit navigation buttons
- Back navigation preserves all previous selections (use React state, not URL params)
- On API error: inline error message below the form, keep all form data intact
- Loading state during `POST /agents/wizard`: show spinner inside "Create Agent" button, disable all fields

**Agent Card in the Agents List (empty state and populated state):**
```
Empty state:
┌──────────────────────────────────────────┐
│                                          │
│    🤖  (illustration)                   │
│    No agents yet                         │
│    Create your first AI Agent to start  │
│    automating customer interactions.     │
│                                          │
│    [+ Create Agent]  [Browse Templates]  │
└──────────────────────────────────────────┘

Populated card:
┌─────────────────────────────────────────┐
│  [ICON]  Agent Name             [LIVE]  │
│  Conversational · Cloud · Healthcare    │
│  ─────────────────────────────────────  │
│  "System prompt preview text (first     │
│   80 chars)..."                         │
│  ─────────────────────────────────────  │
│  🤖 claude-sonnet   🎙️ Sarah (EN)       │
│  ─────────────────────────────────────  │
│  📞 1,234  ⏱ 3m 12s  💰 $0.08/call    │
│  ─────────────────────────────────────  │
│  [Configure]  [Analytics]  [•••]        │
└─────────────────────────────────────────┘
```
`[•••]` opens overflow: Duplicate | Pause | Archive | Delete  
Status badge colours: `Draft` = amber (`--color-accent-orange`) | `Live` = green (`--color-accent-green`) | `Paused` = muted grey

---

### 6.4 Agent Configuration (`/app/agents/[id]`)

**Page header:**
- `← Agents` breadcrumb
- Agent name (H1, click to edit inline with pencil icon)
- Status badge + Partition badge
- Last saved: "2 minutes ago" (auto-save indicator)
- Button row: `Save Draft` (ghost) | `Preview & Test` (teal outline) | `Publish` (red fill)

**10-tab interface:**

---

#### TAB 1 — Agent

**Page header (above tabs — confirmed live from §2 co-browsing):**
- Breadcrumb: `{Agent Name} / {Branch Name}` (e.g. `TRUSTNOW / Main`)
- Branch name badge + **"Live {N}%"** badge (green) — shows traffic percentage on this branch
- **Public | Draft** toggle — Public = callable externally, Draft = testing only (amber badge)
- **`{} Variables`** button — opens variable management panel
- **`Preview`** button — navigates to preview screen. Available for **both Draft and Live agents** — never disabled.
- **`Publish`** button (primary dark fill) + dropdown chevron `▾` — soft gate: if zero preview conversations exist, hovering shows advisory tooltip "We recommend testing your agent before publishing."

**Agent page header — "View new features" modal (confirmed live §2.3):**
- Header row: **`Agent`** H1 label + **`New`** black pill badge + **`View new features >`** link button
- On `View new features >` click → opens **"What's new in Agent Configuration"** modal overlay
- Modal structure: scrollable, preview image at top, then feature list
- Each item: icon + title + optional badge + description + `>` navigation chevron
- Modal dismiss: `×` top-right or Escape key
- **TRUSTNOW equivalent:** "What's new" modal showing recent TRUSTNOW platform updates
- Items in the modal are platform-changelog entries — feed from a `platform_changelogs` table (title, description, badge, created_at, link_url)

**10-tab bar:** `Agent` | `Workflow` | `Branches` | `Knowledge Base` | `Analysis` | `Tools` | `Tests` | `Widget` | `Security` | `Advanced`  
Active tab: underline indicator.

**Left panel (60%):**

*System Prompt section (confirmed live §2.4–§2.7):*
- Label: **`System prompt`** + `↗` external link icon → opens TRUSTNOW Prompting Guide docs in new tab
- Tooltip on hover over `↗`: "The system prompt determines the persona and context of the agent. Click to learn more."
- **Top-right of textarea:** Two icon buttons side-by-side:
  - `⤢` Expand icon → opens **full-screen system prompt editor overlay** (fills viewport, same textarea, same variable injection, × to close)
  - `✏️` AI improvement icon → opens **AI prompt assistant panel** (send current prompt to LLM, get improvement suggestion, accept/reject)
- **Textarea:** scrollable, large, monospace-friendly, resizable (drag handle bottom-right corner)
- **Bottom toolbar of system prompt textarea — 4 elements (confirmed live — NOT 2):**
  1. `Type {{ to add variables` — hint text only (not a button). Typing `{{` in the textarea triggers an inline variable picker dropdown showing all configured `{}` variables.
  2. **`Default personality`** toggle — pill switch. **Default: ON (blue)**. ON = platform applies a built-in professional/friendly persona base layer that supplements (not replaces) the system prompt. OFF = 100% custom — system prompt is used exactly as written.
  3. **`Set timezone`** button — 🌐 globe icon + label. Ghost/text button. On click: inserts `{timezone}` at cursor position in system prompt. At runtime, `{timezone}` resolves to the caller's detected timezone (from WebRTC browser locale or SIP metadata).
  4. **`⚙️`** gear/settings icon — opens AI prompt improvement settings (prompt refinement options)

*First Message section (confirmed live §2.8–§2.11):*
- Label: **`First message`** — section heading
- Helper text: "The first message the agent will say. If empty, the agent will wait for the user to start. You can specify different presets for each language." + `Disclosure Requirements ↗` link (opens compliance/disclosure docs)
- **Top-right of textarea:** `⤢` expand icon → full-screen first message editor (same pattern as system prompt)
- **Textarea:** scrollable, current content = agent's first_message value
- **Bottom toolbar — 4 elements (confirmed live):**
  1. `Type {{ to add variables` — hint text (same behaviour as system prompt — `{{` triggers variable picker)
  2. **`Interruptible`** toggle — **Default: ON (blue)**. ON = first message can be barged-in by caller speech. OFF = first message plays to completion regardless of caller speech (required for legal disclaimers and mandatory compliance disclosures).
  3. **`Translate to all`** button — **Default: disabled (greyed)**. Enabled only when additional languages are configured in the Language section. On click → calls `POST /agents/:id/translate-first-message` → translates first_message to all additional languages. Shows loading state during translation (2–5s). Results appear as per-language collapsible rows below textarea for review before saving.
  4. **Language selector dropdown** — Shows current language being edited: 🇺🇸 `Default (English)` by default. Dropdown options = all configured languages (e.g. `🇮🇳 Hindi & Tamil`). Switching language shows that language's `first_message_localized[lang]` value in the textarea for editing.

**Right panel (40%):**

*Quality Preset:*
- 3-button segmented control: `⚡ Fast` | `⚖️ Balanced` (default) | `✨ High Quality`
- Auto-populates LLM, STT, TTS fields below — overridable individually after selection

| Preset | LLM | STT | TTS |
|--------|-----|-----|-----|
| Fast | GPT-4o Mini / Claude Haiku | Deepgram / Whisper base | ElevenLabs Flash / Piper |
| Balanced | GPT-4o / Gemini Flash | Deepgram / Whisper medium | ElevenLabs standard |
| High Quality | Claude Sonnet / GPT-4o | Deepgram / Whisper large-v3 | ElevenLabs multilingual v2 |

*Voices section (confirmed live §2.12):*
- Label: **`Voices`** + helper text "Select the voices you want to use for the agent."
- **`⚙️` gear icon** (top-right of section) → opens **global voice settings panel** for this agent: default stability, similarity, speed — applies to all voices unless overridden per-voice
- **Primary voice card:** avatar circle + voice name (truncated) + `Primary` green badge + `>` chevron (click to change via Voice Picker)
- **`+ Add additional voice`** button — ⊕ icon + text, full-width ghost button. Click → opens Voice Picker side sheet. Use cases: different voice per language, A/B voice testing across branches, empathy-mode voice switch
- **Expressive Mode feature card (confirmed live §2.12 — dismissible promo card):**
  - 🎵 icon + **`Expressive Mode`** label + `New` badge
  - Description: "Enhance your agent with emotionally intelligent speech, natural intonation, and expressive audio tags."
  - **`Enable`** button (primary) → activates Expressive Mode (`expressive_mode_enabled = true`). Card transforms to enabled state showing toggle to disable.
  - **`Dismiss`** button (ghost) → hides card permanently for this agent (`expressive_mode_dismissed = true`). Does NOT toggle the feature — purely dismisses the announcement.
  - Card not shown if `expressive_mode_dismissed = true` OR `expressive_mode_enabled = true`

*Language section (confirmed live §2.13):*
- Label: **`Language`** + helper text "Choose the default and additional languages the agent will communicate in."
- Language rows: each shows 🏳️ flag + language name + `Default` grey badge (primary only) + `>` chevron → opens language-specific settings (first message for that language, voice, STT model)
- Example observed: `🇺🇸 English` (Default) + `🇮🇳 Hindi & Tamil` (grouped languages)
- **`Hinglish Mode`** toggle — Default: OFF. ON = agent blends Hindi and English in responses (code-switching). Appears only when both English and Hindi/Tamil are configured.
- `+ Add language` link → multi-select popover with search

*LLM section (confirmed live §2.14):*
- Label: **`LLM`** + helper text "Select which provider and model to use for the LLM."
- **Current default (confirmed live):** `Gemini 2.5 Flash` (updated from `Gemini Flash`)
- Model row: current model name + `>` chevron → opens full LLM picker (22-model list — see below)
- LLM sub-panel (below model row):
  - **Backup LLM** — 3-way segmented: `Default` | `Custom` | `Disabled`
  - **Temperature** slider — "More deterministic ↔ More expressive"
  - **Thinking Budget** toggle — controls internal reasoning tokens
  - **Limit token usage** — number input (-1 = no limit)
  - **`Detailed costs`** link → opens cost breakdown modal

*LLM Picker (full 22-model list — confirmed live, March 2026):*
```
── ElevenLabs ──────────────────────────────
  GLM-4.5-Air          ~825ms  $0.0227/min
  Qwen3-30B-A3B        ~196ms  $0.0065/min  [Ultra low latency]
  GPT-OSS-120B [Exp]   ~360ms  $0.0051/min
── Google ─────────────────────────────────
  Gemini 3 Pro Preview ~3.89s  $0.0477/min  [New]
  Gemini 3 Flash Preview~1.31s $0.0119/min  [New]
  Gemini 3.1 Flash Lite~1.55s  $0.0060/min  [New]
  Gemini 2.5 Flash     ~1.09s  $0.0035/min  ← CURRENT DEFAULT
  Gemini 2.5 Flash Lite~544ms  $0.0023/min
── OpenAI ──────────────────────────────────
  GPT-5                ~1.22s  $0.0304/min
  GPT-5.1              ~887ms  $0.0304/min
  GPT-4o               ~816ms  $0.0585/min
  GPT-4o Mini          ~798ms  $0.0035/min
  GPT-4 Turbo          ~1.39s  $0.2320/min
  GPT-3.5 Turbo        ~528ms  $0.0116/min
── Anthropic ───────────────────────────────
  Claude Sonnet 4.6    ~986ms  $0.0709/min  [New]
  Claude Sonnet 4.5    ~1.39s  $0.0709/min
  Claude Sonnet 4      ~1.24s  $0.0709/min
  Claude Haiku 4.5     ~660ms  $0.0236/min
  Claude 3.7 Sonnet    ~1.2s   $0.0709/min
  Claude 3 Haiku       ~637ms  $0.0059/min
── Custom ──────────────────────────────────
  Custom LLM           (user-defined endpoint)
── On-Premise (Ollama) ─────────────────────
  Llama 3.1 8B         ~380ms  $0/min  [On-Prem]
  Mistral 7B           ~350ms  $0/min  [On-Prem]
  Qwen2 7B             ~360ms  $0/min  [On-Prem]
```

**TRUSTNOW EXCEED ELEVENLABS — Tab 1 additions:**
- Show per-model cost not just in $/min but also estimated $/conversation (based on average conversation duration from tenant's history). This gives agent_admins a cost impact estimate they can act on immediately.
- Add "Cost impact" chip next to the selected model in the LLM section: e.g. `~$0.04/conv` (amber) or `~$0.12/conv` (red if high). Calculated as: `cost_per_min × tenant_avg_conversation_duration_min`.
- Language section: show a "Translation coverage" indicator (e.g. `3 of 4 languages have first message`) so the agent_admin immediately sees which languages still need translation.

---

#### TAB 2 — Workflow (Visual Node Canvas Builder — confirmed live §12)

**Full visual canvas — not a form or table.** React Flow-based drag-and-drop node editor.

**Agent header note:** When workflow has validation issues, a red `Errors` badge appears in the agent page header (next to the agent name). Clicking it opens a validation errors panel with jump-to-node links.

---

**Canvas toolbar (top-left — confirmed §12.2):**

| Control | Icon | Function |
|---------|------|----------|
| Zoom in | `+` magnifier | |
| Zoom out | `−` magnifier | |
| Fit view | `⤢` arrows | Fit entire workflow in viewport |
| Selection | `☐` box | Multi-select nodes |
| Copy | `⎘` | Copy selected nodes |
| **Templates** | `⊞` grid | Opens Workflow Templates modal |

**Note:** No Pan/Hand tool in toolbar. The `⎘` Copy button was confirmed — Pan is handled by middle-click drag on canvas.

**Canvas area:** Dot-grid background, drag-and-drop nodes, directional arrows (edges) between nodes.

**Default state:** Single "Start" node centred on canvas.

---

**Workflow Templates modal (confirmed §12.3):**

Title: "Workflow Templates"  
Sub-title: "Get started with a common pattern"  
Footer: "Or add nodes inside the editor"

| # | Template | Icon | Description |
|---|----------|------|-------------|
| 1 | **Qualification Flow** | 👥 people | "Route users to specialized support based on their needs" |
| 2 | **Authentication Flow** | 🔒 lock | "Collect user details, authenticate, and guide through next steps" |
| 3 | **Enterprise Tier Escalation** | 👑 crown | "Route enterprise users to priority support and standard users to..." |
| 4 | **Business Hours Router** | 🕐 clock | "Route to human agents during business hours only" |

Clicking a template loads it immediately into the canvas (replacing current workflow with confirmation prompt if workflow has existing nodes).

---

**Node types (confirmed §12.4 — exact names):**

| Type | Icon | Purpose | Notes |
|------|------|---------|-------|
| **Subagent** | 👤 | Conversational sub-agent — own goal/voice/LLM/KB/tools | Main building block |
| **Say** | 💬 | **(Alpha)** TTS-only: speaks a message, then moves on | Non-conversational |
| **Agent transfer** | 👥 | Transfers call to another workspace agent | |
| **Phone number transfer** | 📞 | Transfers call to a phone number (human agent) | |
| **Tool** | 🔑 | Executes a webhook/client/integration tool | |
| **End** | ✖ | Terminates the conversation | Terminal node — no config |

**⚠ Previous spec was wrong.** Node types are NOT "Conversation, Tool Call, Condition, Transfer, End" — they are the 6 confirmed above.

---

**Global settings panel (right panel when no node selected — §12.5):**

- ℹ️ Info banner: "To disable a workflow, disconnect the start node."
- **Prevent infinite loops** toggle (OFF default) — "Prevents the workflow from continuously transiting in a loop when all conditions are true."

---

**Node detail panels (right panel when node is selected):**

**Start node:**
- Title: "Start"
- Info: "This node determines the entry point of the workflow."
- **Edges sub-tab:** Ordered list of outgoing edges. "Configure the order in which outgoing edges are evaluated. Edges higher in the list will be evaluated first." Each edge: condition label + → destination + 🗑 delete + ⠿ drag to reorder.

**Subagent node (5 sub-tabs — confirmed §12.7):**

*General sub-tab:*

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| **Conversation goal** | Textarea | — | Sub-goal for this step. `{{` triggers variable picker. |
| **Override prompt** | Toggle | OFF | When ON: ignores global system prompt, uses this goal only |
| **Voice** | Dropdown | "Using default" | Per-node voice override — overrides agent-level voice |
| **LLM** | Dropdown | "Using default" (Gemini 2.5 Flash) | Per-node LLM override |
| **Eagerness** | Dropdown | "Using default" (Normal) | Per-node eagerness |
| **Spelling patience** | Dropdown | "Using default" (Auto) | Per-node spelling patience |
| **Speculative turn** | Toggle | Using default / OFF | Per-node + Reset button |

*Knowledge Base sub-tab:* Attach workspace KB docs to this specific node only.

*Tools sub-tab:* Assign tools available to this specific node.

*Tests sub-tab:* Node-specific test cases.

*Edges sub-tab:* Ordered outgoing edge conditions (same pattern as Start node).

**Tool node (2 sub-tabs):**
- *Tools:* `Add tool` button — tools whose output determines edge routing
- *Edges:* Ordered condition list

**Agent transfer node:**

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| **Transfer to** | Dropdown | "Select an agent" | Pick destination agent from workspace |
| **Delay before transfer (ms)** | Number | 0 | Milliseconds before handoff |
| **Transfer Message** | Textarea | Empty | Optional TTS played during handoff |
| **Enable First Message** | Toggle | OFF | Whether destination agent speaks first on receipt |

Validation: "Agent ID cannot be empty" shown in red when field is empty — live validation.

**End node:**
- Info: "The conversation will end when this node is reached."
- No configurable fields.

---

**Edge conditions (§12.8):**

Edges (arrows) carry condition labels. Evaluated top-to-bottom per node's Edges sub-tab; first match wins.

| Condition type | Example label | Evaluation |
|---------------|--------------|------------|
| `unconditional` | "Unconditional" | Always transitions — no LLM check |
| `llm_evaluated` | "User info collected" | LLM judges from conversation state |
| `tool_output` | "Transfer to human for Enterprise" | Based on tool return value |

Edge priority is set by drag-reordering in the Edges sub-tab. Edge `0` is evaluated first.

---

**EXCEED ELEVENLABS — Workflow tab additions:**

1. **BPO workflow template library:** 10+ additional BPO-specific templates beyond the 4 base ones: Debt Collection Flow (identify → verify → arrange payment), Insurance FNOL Flow (capture → triage → assign → confirm), Appointment Reminder (confirm → reschedule → cancel). Available from the Templates modal in a "BPO Specialist" section. ElevenLabs has only 4 generic templates.

2. **Workflow validation errors panel:** The `Errors` badge in the agent header opens a structured errors panel: lists all issues (disconnected nodes, empty agent transfer IDs, loops) with jump-to-node links. Clicking a link centres the canvas on the problem node and highlights it. ElevenLabs shows the badge but has no structured error navigation.

3. **Per-node performance overlay:** On hover over any Subagent node: mini-stats badge showing "Avg Xs here | N% reach this node | drops off: edge Y (N%)". Sourced from conversation analytics. Lets BPO designers instantly see bottlenecks. ElevenLabs has no per-node analytics.

4. **Workflow version history:** "Last saved by {user} Xm ago" shown above canvas. Overflow menu: "View history" → list of saved versions with timestamps. "Restore" button on each version. Keeps 30 days of history. ElevenLabs has no workflow versioning.

---

#### TAB 3 — Branches (A/B Testing — confirmed live §13)

**Full A/B traffic split and version management.**

**Header:** H1 "Branches" + `+ Create branch` button (primary black, top-right)

**Table columns (confirmed §13.2):**

| Column | Description |
|--------|-------------|
| **Name** | Branch name + status badges (`Draft` amber / `Live` green) |
| **Traffic Split** | % traffic + `Live` green badge when active |
| **Created by** | User email |
| **Updated** | Last modified datetime |
| 🕐 | Version history icon — opens publish changelog for this branch |
| `...` | Overflow menu |

**TRUSTNOW agent — observed state (§13.2):**
```
Main   [Draft] [Live]   100%   contact@trustnow.ai   Mar 10, 10:41 AM   🕐  ...
```

**Badge semantics:**
- `Draft` — unsaved/unpublished changes exist on this branch
- `Live` (green) — currently serving live traffic
- Traffic % — fraction of inbound calls routed to this branch

**Clicking a branch row** → switches the entire Agent configuration page (all 10 tabs) to that branch's configuration. The `?branchId=` URL param updates. All edits after switching apply to the selected branch only.

---

**Overflow menu `...` — 3 actions (confirmed §13.3):**

| Action | Icon | Purpose |
|--------|------|---------|
| **Copy branch ID** | 📋 | Copies branch UUID to clipboard (for API calls) |
| **Enable branch protection** | 🔒 | Locks branch — prevents edits until explicitly unlocked |
| **Edit Deployment** | ↑ | Opens traffic split + deployment settings editor |

---

**Version history panel (🕐 icon — §13.4):**
- Opens a side panel listing all published versions for this branch
- Columns: Version # | Published by | Published at | Notes
- Each row: `Restore` button — rolls back branch config to that snapshot
- Confirmation required before restore: "This will replace the current config. Continue?"

---

**Create Branch modal (§13.5):**

Title: "New branch" + ↑ icon

| Field | Required | Placeholder |
|-------|----------|-------------|
| **Branch name** | ✅ Yes | "Enter branch name" |
| **Branch description** | Optional | "Enter branch description" |

Buttons: `Cancel` | `Create branch` (greyed until name filled)

**On create:**
- New branch cloned from current active branch (inherits all config)
- Starts with 0% traffic, status = `Draft`
- Traffic set later via "Edit Deployment" in overflow menu

---

**Edit Deployment panel (from overflow menu):**
- **Traffic split** — numeric input (0–100%) + validation: all live branches must sum to 100%
- **Status** — `Live` / `Paused` toggle
- Warning shown if setting to Live would exceed 100%: "Traffic split would exceed 100%. Reduce another branch first."

---

**Branch URL pattern (§13.6):**
```
/app/agents/{agent_id}?branchId={branch_id}&tab={tab_name}
```
All 10 config tabs are branch-scoped. Switching tabs preserves the active `branchId`.

---

**Traffic routing logic (§13.7):**
```
Random number 0–100 → assigned to branch based on cumulative split ranges
e.g. Main 70% + Variant A 30%:
  0–69  → Main
  70–99 → Variant A
```

---

**EXCEED ELEVENLABS — Branches additions:**

1. **Language variant branches:** When creating a branch, tag it as a language variant with a language code (e.g. `hi` = Hindi). Traffic router preferentially sends callers whose detected language matches the tag. E.g. Main = English (70%), Hindi branch = Hindi (30%) for bilingual deployments. Shows language flag badge on the branch row.

2. **Canary deployment guide:** When a branch is set to ≤ 10% traffic, a guided canary panel appears: "Canary mode — monitor for 24h → auto-promote to 50% if success rate ≥ current Main → promote to 100% after 24h more." Agent admins set the success threshold and auto-promotion rules once; the platform handles the incremental rollout.

3. **Branch comparison panel:** Horizontal side-by-side view of two selected branches: calls / avg duration / success rate / cost per call / evaluation criteria pass rate. `Declare winner` button → sets winner to 100%, archives loser, with a confirmation step.

4. **Change diff before publish:** Branch row shows a `3 changes` chip (unsaved). Clicking opens a diff view: exactly what changed in system prompt, voice, LLM, tools since last published version. Colour-coded additions/removals (green/red). BPO compliance teams must review diffs before any live deployment.

---

#### TAB 4 — Knowledge Base (confirmed live §8 co-browsing)

**Page title (H1):** "Agent Knowledge Base"

**Top-right buttons:**
- `Configure RAG` — ghost/secondary button → opens RAG Configuration right-side panel
- `Add document` — primary black button → opens inline dropdown (see below)

**Below buttons:**
- Search bar: "Search Knowledge Base..."
- Filter chips: `+ Type` | `+ Creator`

**Document table columns (confirmed §8.1):**
- **Name** — with type icon (T = text, 🌐 = URL crawl, 📁 = folder, 📄 = file) + status sub-text ("RAG indexing complete" / "Indexing..." / "Failed")
- **Created by** — user email/name
- **Last updated** — relative timestamp
- `...` overflow menu — actions: Re-index | Remove

**Example row (from TRUSTNOW live account):**
```
📁 www.trustnow.ai Crawl Job (2026-01-31)    contact@trustnow.ai    Jan 31, 2026  [...]
   RAG indexing complete
```

---

**"Add document" dropdown (confirmed §8.3 — NOT a modal dialog):**

The dropdown opens inline below the button. Layout:
1. **Search field** at top: "Search documents..." — searches existing workspace KB docs
2. **Existing workspace KB documents** listed (reuse pattern — agents share KB docs without re-uploading):
   - Each row: type icon + doc name + doc ID (truncated)
   - Clicking a listed doc → attaches it to this agent immediately
3. **Three creation actions** at the bottom of the dropdown:

| Action | Icon | What it does |
|--------|------|-------------|
| **Add URL** | 🌐 globe | Enter a URL → triggers async web crawl job |
| **Add Files** | 📄 document | Upload files (PDF, DOCX, TXT, CSV, max 50MB each) |
| **Create Text** | T text | Opens inline text editor to write content directly |

**Confirmed labels (§8.3):** "Add URL" / "Add Files" / "Create Text" — NOT "URL" / "File upload" / "Text".

---

**KB Item Detail Panel (click any document row — §8.2):**

Clicking a KB item row opens a **right-side detail panel** with two columns:

*Left — Metadata:*

| Field | Example | Notes |
|-------|---------|-------|
| **Sharing** | "Default restricted, sharing with no one" | ⚙️ gear → sharing settings |
| **Folder ID** | `ydKuRvNzz1Ta4w897Lwu` | 📋 copy icon |
| **Last updated** | Jan 31 | |
| **Dependent agents** | TRUSTNOW | Which agents use this KB doc |
| **Dependent main branches** | ⊙ TRUSTNOW / 🌿 Main | Agent + branch |

*Right — Folder Content:*
- Lists the document(s) inside the KB folder

**Critical design rule (§8.2):** KB docs are workspace-level — shared across agents. The "Dependent agents" and "Dependent main branches" panels show exactly who is affected if this KB is modified or deleted. If `dependent_agent_count > 0`, show amber warning before deletion: "This KB document is used by N agents. Deleting it will remove it from all of them."

---

**RAG Configuration right panel (opened via "Configure RAG" — §8.4):**

Panel title: "RAG configuration" — persistent right-side panel (not a modal).

| Control | Type | Default | Full helper text |
|---------|------|---------|-----------------|
| **Enable RAG** | Toggle | **ON 🔵** (default ON — confirmed §8.4) | "Retrieval-Augmented Generation (RAG) increases the agent's maximum Knowledge Base size. The agent will have access to relevant pieces of attached Knowledge Base during answer generation." |
| **Embedding model** | 2-way segmented | `English optimized` ✓ | `English optimized` \| `Multilingual optimized` |
| **Character limit** | Number input | 50000 | "Limit the total number of characters retrieved per query." |
| **Chunk limit** | Number input | 20 | "Limit the number of document chunks retrieved per query." |
| **Vector distance limit** | Slider | mid-point | "Document chunks with a vector distance higher than this value (i.e., less similar) will not be retrieved." Labels: "More similar ←→ Less similar" |
| **Number of candidates** | Toggle (OFF) + number input | OFF / 100 | "Number of candidates evaluated in ANN vector search. Higher number means better results, but higher latency. Minimum recommended value is 100." |
| **Query rewrite prompt override** | Toggle (OFF) + textarea | OFF / empty | "Override the default prompt used for rewriting user queries before retrieving documents. The conversation history will be automatically appended at the end." |

**When Query rewrite prompt override is ON:** Textarea appears for custom prompt input. Conversation history auto-appended at runtime.

---

**EXCEED ELEVENLABS — KB tab additions:**

1. **Dependent agents warning on delete/modify:** Before deleting or re-indexing a shared KB doc, show: "⚠️ This KB document is used by {N} agent(s): [{agent names}]. This action will affect all of them." Deletion blocked unless user types "CONFIRM". ElevenLabs shows the list but has no action guard.

2. **KB version history:** Each KB doc has a "Version history" option in the overflow menu. Shows previous indexed versions with date + chunk count + who triggered the re-index. "Restore this version" button. Critical for BPO compliance: auditors need to know what information the agent had access to on the date of a specific conversation.

3. **KB analytics chip:** Next to each KB doc in the table: "Used in 34% of recent conversations" — sourced from conversation metadata where KB retrieval was triggered. Docs with 0% usage flagged as "Never retrieved" (amber chip) — candidates for cleanup.

4. **Scheduled re-crawl for URL docs:** URL-type KB docs show a "Schedule re-crawl" option in overflow: Daily / Weekly / Monthly / Manual only. ElevenLabs requires manual re-indexing. For BPO clients whose product/policy pages change frequently, auto re-crawl keeps the agent grounded in current information.

5. **RAG quality score:** After each conversation, TRUSTNOW computes a "RAG relevance score" — was the retrieved KB content actually relevant to what the agent said? Show per-agent average RAG score in Tab 4 header (e.g., `RAG quality: 87%`). Below 70% → amber warning "Consider adjusting your RAG parameters."

---

#### TAB 5 — Analysis (confirmed live §9 co-browsing)

**Two-column layout:** Left (~70%) conversation list | Right (~30%) persistent config panel.

**Conversation list (left panel):**
- Search bar: "Search conversations..." (full-width) + 🔧 wrench icon (right — opens column settings)
- **Filter chips (13 total — confirmed §9.2):**
  - Active filters show with `×` prefix and are removable: e.g. `× Branch [Main]`
  - Available filters (add by clicking `+`): `+ Date After` | `+ Date Before` | `+ Call status` | `+ Criteria` | `+ Data` | `+ Duration` | `+ Rating` | `+ Comments` | `+ Tools` | `+ Language` | `+ User` | `+ Channel`
  - Active filters render inline with the `+` chips — no separate "active filters" row

**Table columns (5 — confirmed §9.2):**

| Column | Format | Notes |
|--------|--------|-------|
| **Date** | "Mar 28, 2026, 6:51 PM" | Full datetime |
| **Branch** | 🌿 Main | Branch icon + name |
| **Duration** | 4:12 | MM:SS |
| **Messages** | 47 | Total turn count |
| **Status** | `Successful` (green) / `Failed` (red) | Outcome badge |

**Row expand (▶ chevron — NEW — confirmed §9.2):**
- Each row has a `▶` chevron on the far left
- Click chevron → expands an inline row panel **below** the conversation row (does not open full detail panel)
- Expanded row shows: data collection results for that conversation (`data_collection_results` JSONB)
- Empty state: "No data collection results available for this conversation."
- This is the "quick preview" mode — click the row text to open the full detail panel

**Right panel — Analysis configuration (~35%):**
- **Evaluation criteria** section — "Define criteria to evaluate whether conversations were successful or not." — `+ Add criteria` button — count: "0 criteria"
  - Each criterion: Name + LLM evaluation prompt
  - All criteria must pass → `Successful`; any fails → `Failed`
- **Data collection** section — "Define custom data specifications to extract from conversation transcripts." — `+ Add data point` button — count: "0 data points"
  - Each data point: field name + extraction prompt
  - Extracted values appear in row expand + Client data sub-tab
- **Analysis Language** dropdown — `Auto (infer from conversation) ▾` — other options: specific language codes
  - Helper: "Language will be inferred from the conversation content."

**Conversation detail (click row text — full-width overlay panel):**

*Panel header:*
- Title: "Conversation with {Agent Name} 🌿 {Branch Name} ⓘ"
- Conversation ID (monospace, copyable): e.g. `conv_4801kmt9py3pfncv6xcxw4htmb5m`
- Close button (×) top-right

*Audio waveform player:*
- Full-width waveform visualisation
- Controls: `▶` Play | `1.0x` speed selector | `⟲` Rewind 10s | `⟳` Forward 10s | `...` overflow
- Timestamp: `0:00 / 4:10` (current / total)

*Info banner:*
"You can now ensure your agent returns high quality responses to conversations like this one. Try Tests in the Transcription tab."

*3 sub-tabs: `Overview` | `Transcription` | `Client data`*

**Overview sub-tab (§9.3.1):**
- **Summary** — LLM-generated paragraph summary (from `conversations.ai_summary`) — generated asynchronously post-call
- **Call status** row: `Successful` / `Failed` badge + 🔄 refresh button (triggers re-evaluation)
- **How the call ended** row: **confirmed label "Client ended call"** (NOT "Client navigated away" — previous spec was wrong)
  - Other values: "Agent ended call" | "Silence timeout" | "Max duration reached" | "Error"
- **User ID** row: user ID string or "No user ID"

*Right metadata panel (always visible):*

| Field | Example | Notes |
|-------|---------|-------|
| **Date** | Yesterday, 6:51 PM | Relative |
| **Text-only** | No | |
| **Environment** | `production` badge | + "Manage environments" + "Learn more" links |
| **Connection duration** | 4:12 | MM:SS |
| **Call cost** | 839 credits | + **"Development discount applied"** sub-text (shown for development environment) |
| **Credits (LLM)** | 14 | LLM-specific credits |
| **LLM cost** | $0.00075 / min — Total: $0.00316 | Per-minute rate + total |

**Transcription sub-tab (confirmed live):**
- Turn-by-turn chat bubble transcript, synced to waveform player
- **Agent turns:** grey avatar + "{Agent Name} 🌿 {Branch}" label | white bordered bubble | timestamp `M:SS` | TTS latency badge `TTS 270 ms` | bell icon 🔔 (QM annotation)
- **User turns:** white avatar | grey bubble (right-aligned) | `...` placeholder when transcript pending | timestamp | silence gap indicators
- Waveform at top syncs with scroll — clicking a turn timestamp seeks the player

**Client data sub-tab:**
- `data_collection_results` key-value pairs extracted from transcript
- `evaluation_results` per-criterion pass/fail
- Empty state: "No client data for this conversation."

---

**EXCEED ELEVENLABS — Analysis tab additions:**

1. **QM Supervisor Review Workflow:** ElevenLabs has no supervisor review layer. TRUSTNOW adds: when `call_successful = false`, the conversation gets a `Needs Review` amber badge in the list. Supervisor clicks to open the conversation, uses the bell icon 🔔 to annotate specific turns, adds a manual QM score (1–5 stars), and marks "Reviewed". Maps to `qm_reviews` table. Bell icon annotations create `qm_annotations` rows: `(annotation_id, conversation_id, turn_id, supervisor_id, note, created_at)`.

2. **Agent coaching flags:** When a conversation fails criteria evaluation, an auto-generated coaching card appears below the Summary on the Overview tab: "🔔 Coaching note: [Criterion X] was not met in this conversation. [Specific recommendation]." Supervisors can share coaching notes with agents. ElevenLabs has no coaching workflow.

3. **Cost trending sparkline:** Next to the Call cost in the metadata panel, show a 7-day sparkline of average call cost for this agent. "Avg this week: X credits (+N% vs last week)." Helps BPO operations managers spot cost drift before it becomes a budget overrun.

4. **Batch re-evaluation:** "Re-evaluate past conversations" button in the right config panel (below Evaluation criteria section). Allows retroactive re-scoring of up to the last 500 conversations when criteria change. Shows a progress indicator: "Re-evaluating 87 / 500 conversations..." ElevenLabs only evaluates going forward.

---

#### TAB 6 — Tools (observed live — updated v1.5)

**Page title (H1):** "Agent Tools"
**Sub-tabs: Tools | MCP**
**Top-right button:** `Add tool` (Tools sub-tab) | `Add server` (MCP sub-tab)

**Tools sub-tab — two-column layout:**
- Left (~70%): Tool list panel
- Right (~30%): System tools panel (always visible)

**Tool list panel:**
- Search: "Search tools..."
- Filters: `+ Type` | `+ Creator`
- Empty state: wrench icon + "No tools found" + "This agent has no attached tools yet." + `Add tool` inline button

**`Add tool` button → dropdown with 3 types (NOT "System tool" — confirmed live):**
| Type | What it creates |
|------|----------------|
| **Webhook** | HTTP call to external API endpoint |
| **Client** | JavaScript CustomEvent dispatched to widget client-side code |
| **Integration** | Pre-built connector to a connected integration service |

**System tools panel (right side — always visible on Tools sub-tab):**
- Label: "System tools" + helper "Allow the agent perform built-in actions."
- Count badge: "0 active tools" (live count, updates on toggle)
- 7 toggle rows with 🔑 key icon (all OFF by default):
  1. End conversation
  2. Detect language
  3. Skip turn
  4. Transfer to agent
  5. Transfer to number
  6. **Play keypad touch tone** (confirmed exact name — not "Play DTMF")
  7. Voicemail detection

---

**Webhook tool creation form (right-side drawer):**
- Drawer title: "Add webhook tool"
- Section header: "Configuration" + 🔗 copy config icon
- Helper: "Describe to the LLM how and when to use the tool."
- Fields (top to bottom):
  - **Name** — text input (required)
  - **Description** — textarea (required)
  - **Method** — dropdown: `GET` ✓ | `POST` | `PUT` | `PATCH` | `DELETE`
  - **URL** — text input, placeholder `https://api.example.com/v1` + `Type {{ to use an environment variable` hint + `Manage environment variables` + `Docs ↗` links
  - **Response timeout** — slider (default: 20 seconds) + helper: "How long to wait for the client tool to respond before timing out. Default is 20 seconds."
  - **Disable interruptions** — checkbox (NOT toggle) + helper: "Select this box to disable interruptions while the tool is running."
  - **Pre-tool speech** — dropdown: `Auto` ✓ | `Force` + helper: "Force agent speech before tool execution or let it decide automatically based on recent execution times."
  - **Execution mode** — dropdown: `Immediate` ✓ + helper: "Determines when and how the tool executes relative to agent speech."
  - **Tool call sound** — dropdown: `None` ✓ + helper: "Optional sound effect that plays during tool execution."
  - **Authentication** — dropdown: "Workspace has no auth connections" + `Manage environment aware auth connections` + `Learn more` links
  - **Headers** section — `Add header` button
- Bottom bar: `</> Edit as JSON` | `Cancel` | `Add tool`

**Shared sections (all tool types):**
- **Parameters** section — `Add param` button → parameter form:
  - **Data type** dropdown: `Boolean` | `Integer` | `Number` | `String` ✓ | `Object` | `Array`
  - **Identifier** — text input (parameter key name)
  - **Required** — checkbox (checked by default)
  - **Value Type** — dropdown: `LLM Prompt` ✓ (LLM extracts value from conversation)
  - **Description** — textarea + helper: "This field will be passed to the LLM and should describe in detail how to extract the data from the transcript."
  - **Enum Values (optional)** — multi-value input + `+` button
- **Dynamic Variables** section — info text + `Learn more` link + "Variables in tool parameters will be replaced with actual values when the conversation starts."
- **Dynamic Variable Assignments** section — `Add assignment` button + `Learn more` + "Configure which dynamic variables can be updated when this tool returns a response."
- **Response Mocks** section — `Add mock` button + "Use mock responses to evaluate agent behavior in test simulations without connecting to production systems. Conditions are evaluated top-to-bottom and the first match is returned."

---

**Client tool creation form (differences from Webhook):**
- Drawer title: "Add client tool"
- **Removes:** Method, URL, Authentication, Headers fields
- **Adds: `Wait for response` checkbox** — "Select this box to make the agent wait for the tool to finish executing before resuming the conversation."
- Otherwise identical to Webhook (Name, Description, Disable interruptions, Pre-tool speech, Execution mode, Parameters, Dynamic Variables, Dynamic Variable Assignments, Response Mocks)
- Fires a JavaScript CustomEvent in the widget's client-side code — widget JS listens and executes custom logic

---

**Integration tool creation:**
- Opens centre modal: "Select Integration Tool — Choose an integration and the specific tool you want to add."
- Empty state: "You haven't connected any integration yet. **Integrations →**" link
- `Cancel` | `Create` (greyed until integration selected)

---

**MCP sub-tab:**
- Full-width panel (no system tools column)
- Empty state: MCP grid icon + "No MCP servers found" + "This agent has no connected MCP servers yet." + `Add server` inline button
- `Add server` button (top-right) → dropdown:
  - "No MCP Servers found" (workspace-level pre-configured)
  - `+ New Custom MCP Server`

**First-time MCP use — Terms modal (shown once per workspace):**
- Title: "Model Context Protocol Server Terms"
- Body: "By enabling MCP server integrations, you acknowledge that doing so may involve the sharing of data with third-party services and could introduce additional security considerations. Please ensure that you understand these implications before proceeding."
- Checkbox: "By checking this box, I confirm that I have read, understood, and agree to the terms above." (must be checked to enable Accept)
- `Close` | `Accept` (greyed until checkbox checked)
- On acceptance: toast "Terms acknowledged for MCP integrations."
- Terms acceptance persisted per workspace — modal never appears again

**New Custom MCP Server form (right-side drawer):**
- Drawer title: "New Custom MCP Server"
- **Basic Information** section: Name (required), Description (optional)
- **Server Configuration** section:
  - **Server type** — 2-option segmented control: `SSE` ✓ | `Streamable HTTP`
  - **Server URL** — Type dropdown (`Value`) + URL input (placeholder `https://example.com/sse`) + `Type {{ to use environment variable` + `Manage environment variables`
  - **Authentication** — dropdown: "Workspace has no auth connections" + `Manage environment aware auth connections` + `Learn more`
- **HTTP Headers** section — `Add header` button
- **Trust checkbox:** "**I trust this server**" — "Custom MCP servers are not verified by ElevenLabs" — must be checked to enable Add Server
- `Cancel` | `Add Server` (disabled until required fields + trust checkbox)

---

**EXCEED ELEVENLABS — Tab 6 (Tools) additions:**

1. **Workspace tool library:** A `Browse workspace tools` link appears in the tool list empty state and at the top of the tool list when tools exist. Click → opens a modal showing all tools across all agents in this tenant (read-only view). Each tool has a `Use in this agent` button — clones the tool config to the current agent. ElevenLabs tools are agent-scoped only. TRUSTNOW allows reuse.

2. **In-drawer test runner:** A `Test` button appears in the Webhook tool drawer after the URL field is filled. Click → sends a test HTTP request to the URL with a synthetic payload, shows response status + body + latency inline in the drawer without saving. Label: "Test connection" with a spinner state. Errors shown inline: "404 Not Found (245ms)" in red, "200 OK (189ms)" in green.

3. **Tool version history:** Each tool in the list shows "Modified {date}" sub-text. Overflow menu (`...`) has a "View history" option showing a changelog: who changed what field and when. Maps to `GET /tools/:id/history`.

4. **Partition B URL validation:** When the agent is on Partition B (on-prem), the URL field in the webhook tool drawer shows a live validation badge: `🟢 Private endpoint` (URL resolves to RFC 1918 private IP) or `🔴 Public endpoint — not allowed on Partition B` (URL resolves to a public IP). The `Add tool` button is disabled when `🔴` is shown on a Partition B agent.
**Included in full-scope build.**

**Global Tests page (sidebar Tests link) — full test management:**
- Header: "Tests" + "Create Folder" button + **"+ Create a test"** button (primary)
- Info banner: "Agent testing is now live. Create tests based on existing or hypothetical conversations and run them anytime to ensure quality of agent actions."
- Search: "Search tests..."
- Table columns: Name (with ✏️ icon) | **Type** | Created by | Last updated | ▶ Run button | ... overflow
- **Test types: Next Reply** (most common — test what agent says given a conversation) and **Tool Invocation** (test that correct tool fires given input)
- 5 default ElevenLabs template tests (shown in "Testing" agent):
  1. Can read knowledge base — Next Reply
  2. Empathy for Delayed Flight Test — Next Reply
  3. Greeting Response Test — Next Reply
  4. Workflow Node Transition Test — Tool Invocation
  5. Multi-Turn Lost Baggage Conversation Test — Next Reply

#### TAB 7 — Tests (confirmed live §14)

**Two-panel layout:** Left (test list) | Right (Past runs)

**Header:** "Tests" + `Add test` (primary black, top-right)

**Left panel — test list:**
- Empty state: 🔑 icon + "No tests attached" + "This agent doesn't have any tests attached to it." + `Add test` button + `Learn how` ▶ (opens tutorial video)
- When populated: list of attached tests, each with name + type badge + ▶ Run + `...` overflow

**Right panel — Past runs:**
- Header: "Past runs"
- Empty state: "No test runs found"
- When populated: each run shows timestamp / `Passed` (green) or `Failed` (red) / duration. Click into a run → full result detail.

---

**"Add test" dropdown (§14.3):**
- Search bar: "Search tests..."
- **5 template tests** (always shown — workspace-level):
  1. Can read knowledge base — `Next Reply`
  2. Empathy for Delayed Flight Test — `Next Reply`
  3. Greeting Response Test — `Next Reply`
  4. Workflow Node Transition Test — `Tool Invocation`
  5. Multi-Turn Lost Baggage Conversation Test — `Next Reply`
- Bottom actions: `+ Create new test` | `📁 Create folder`

---

**Test creation / editing panel (§14.5 — sliding right-side panel, 3 sub-tabs):**

```
[ Next reply test ]  [ Tool invocation test ]  [ Simulation test Alpha ]
```

**Next Reply test (§14.5.1):**

| Field | Type | Notes |
|-------|------|-------|
| **Test name** | Text input | e.g. "Can read knowledge base" |
| **Conversation builder** | Chat UI (right of form) | Build conversation context — dark bubbles (user), delete 🗑 + add `+` per turn |
| **Describe expected next message** | Textarea | Natural language: what the ideal agent response achieves |
| **Success Examples** | Multi-entry + `+ Add Example` | Example responses that should PASS |
| **Failure Examples** | Multi-entry + `+ Add Example` | Example responses that should FAIL |
| **Dynamic variables** | Key-value pairs + `Add New` | Substituted at test run time |

Info banner (right panel): "The agent's response to the last user message will be evaluated against the success criteria using examples provided."

**Tool Invocation test (§14.5.2):**

| Field | Type | Notes |
|-------|------|-------|
| **Test name** | Text input | |
| **Tool to test** | Tool picker card + `Change tool` | Picks a tool OR "Workflow node transition" |
| **Should / Should not transition** | 2-way toggle | Pass condition |
| **Select agent with workflow** | Dropdown | Which agent's workflow to test against |
| **Target workflow node** | Dropdown | Specific node to test transition to |
| **Dynamic variables** | Key-value pairs | |

**Simulation test — Alpha (§14.5.3):**

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| **Test name** | Text input | — | |
| **Describe simulated user scenario** | Textarea | — | System generates a realistic user persona from this description |
| **Describe success criteria** | Textarea | — | What constitutes a passing simulation outcome |
| **Maximum conversation turns** | Numeric | **5** | |
| **Mock all tools** | Toggle | OFF | When ON: tools return mocks — no real API calls |

---

**Test creation bottom bar (§14.6):**

*Creating NEW test:*
```
[Back]  [Edit as JSON]  [Move to: 📁 All tests ▾]  ☑ Attach to the agent automatically  [Create]  [▶ Create & Run]
```
- **"Attach to the agent automatically"** checkbox — checked by default when creating from inside agent Tests tab

*Editing EXISTING test:*
```
[Back]  [Edit as JSON]  [Save as New]  [Save]
```

---

**EXCEED ELEVENLABS — Tests tab additions:**

1. **Automated regression gate on Publish:** All attached tests run automatically when the agent's Publish button is clicked. If any fail → publish is blocked with a summary: "3 tests failed — fix issues or override to force publish." Override requires agent_admin role. ElevenLabs tests are entirely manual.

2. **"Create test from this conversation" shortcut:** In Analysis tab → Transcription sub-tab, a `Create test` button appears below each conversation. Pre-fills the Next Reply test form with the actual conversation as context and expected output. BPO QA teams can instantly convert any real failing conversation into a permanent regression test.

3. **Test suites (run all in folder):** Each test folder has a `▶ Run all` button — executes all tests in the folder against the agent in parallel. Shows aggregate: "9 / 10 passed (1 failed)". BPO clients with 50+ tests per agent need this.

4. **Scheduled test runs:** Configure a test suite to run on a schedule (e.g. daily 09:00). Failed run → Slack/email notification. BPO clients with 24/7 agents need automated overnight quality monitoring that doesn't require a human to click Run.

---

#### TAB 8 — Widget (observed live — updated v1.5)

**Setup section:**
- "Setup" label + "Attach the widget on your website." helper
- Tutorial card: thumbnail image + "Learn how to embed your voice agent anywhere" link → opens **inline video modal** (YouTube player, NOT new tab)
- **Embed code** section:
  - Label: "Embed code"
  - Helper: "Add the following snippet to the pages where you want the conversation widget to be."
  - Single-line code block (line 1) with 📋 copy button (hover shows "Copy" tooltip)
  - **Full confirmed embed code (2 lines, copy copies both):**
    ```html
    <elevenlabs-convai agent-id="agent_XXXXX"></elevenlabs-convai>
    <script src="https://unpkg.com/@elevenlabs/convai-widget-embed" async type="text/javascript"></script>
    ```
  - **TRUSTNOW equivalent:**
    ```html
    <trustnow-agent agent-id="[AGENT_ID]"></trustnow-agent>
    <script src="https://cdn.trustnow.ai/widget/embed.js" async type="text/javascript"></script>
    ```
  - No API key in snippet — auth handled server-side via domain allowlist
- **Feedback collection** toggle (ON 🔵 by default) — "Callers can rate their satisfaction from 1 to 5 and optionally leave a comment after the conversation." (CSAT 1–5 stars + optional text)

**Interface section:**
- "Interface" label + "Configure the parts of the widget interface." helper
- **8 toggle rows** (confirmed exact order and defaults — 3 more than previously spec'd):
  1. **Chat (text-only) mode** (OFF ⚫)
  2. **Send text while on call** (OFF ⚫)
  3. **Realtime transcript of the call** (OFF ⚫)
  4. **Language dropdown** (ON 🔵 — enabled on TRUSTNOW agent)
  5. **Mute button** (OFF ⚫)
  6. **Action indicator** (OFF ⚫) ← NEW
  7. **Show conversation ID after call** (ON 🔵) ← NEW
  8. **Hide audio tags in transcript** (ON 🔵) ← NEW
- **Expanded behavior** dropdown — 3 options (confirmed live):
  - `Starts collapsed`
  - `Starts expanded` ✓ (current on TRUSTNOW)
  - `Always expanded`

**Markdown links section:**
- "Markdown links" label + "Control which links are clickable in agent responses. Only links matching your allowlist are enabled. For security, `javascript:` links are always blocked."
- **Allow all domains** toggle (OFF ⚫) — when ON: all links clickable regardless of domain
- **Allowed domains** table + `Add domain` button + empty state: "No domains specified. Links will be shown as blocked."
- **Include www. variants** toggle (ON 🔵) — "Automatically allow the www variant of your domains. For example, adding `example.com` also allows `www.example.com`."
- **Allow HTTP links** toggle (ON 🔵) — "Allow non-secure http:// links. By default, only https:// links are clickable."

**Avatar section:**
- "Avatar" label + "Configure the voice orb or provide your own avatar." helper
- **Type**: 3-way segmented control `Orb | Link | Image`
- **Orb** state: 2 color pickers:
  - **First color** hex input (default: `#2792dc`) + color swatch
  - **Second color** hex input (default: `#9ce6e6`) + color swatch
  - Orb renders as a gradient between the two colors
- **Link** state: **Image URL** text input (placeholder: `https://example.com/avatar.png`) — external hosted image
- **Image** state: drag-and-drop upload zone — "Click or drag a file to upload. Recommended resolution: **172 × 172 pixels**. Maximum size: **2MB**."

**Style section (NEW — not in previous spec):**
- **Collapsible** toggle (OFF ⚫) — when ON: widget can be collapsed/minimised by user
- **Placement** section:
  - Helper: "The preview widget on this page is always placed in the bottom right corner of the screen. The placement you select here will only be used when the widget is embedded on your website."
  - Dropdown: `Bottom-right` ✓ (default) | other positions
- **Color/radius design tokens** (all editable hex inputs with color swatches):

  | Token | Default |
  |-------|---------|
  | Base | #000000 |
  | Base Hover | #ffffff |
  | Base Active | #ffffff |
  | Base Border | #ffffff |
  | Base Subtle | #ffffff |
  | Base Primary | #000000 |
  | Accent Border | #ffffff |
  | Accent Subtle | #ffffff |
  | Accent Primary | #ffffff |
  | Overlay Padding | 32px |
  | Button Radius | 18px |
  | Input Radius | 18px |
  | Bubble Radius | 15px |
  | Sheet Radius | 24px |
  | Compact Sheet Radius | 30px |

- **Code block theme** — 3-way segmented control: `Auto` | `Light` ✓ | `Dark`
  - Helper: "Color theme for code blocks in markdown responses. Auto adjusts based on the widget's base color."

**Text contents section (NEW — full white-labelling — not in previous spec):**
- "Text contents" label + "Modify the text contents shown in the widget interface." helper
- 24 editable i18n string tokens (key = token name, value = editable text field):

  | Token | Default value |
  |-------|--------------|
  | `main_label` | Need help? |
  | `start_call` | Start a call |
  | `start_chat` | Start a chat |
  | `new_call` | New call |
  | `end_call` | End |
  | `mute_microphone` | Mute microphone |
  | `change_language` | Change language |
  | `collapse` | Collapse |
  | `expand` | Expand |
  | `copied` | Copied! |
  | `accept_terms` | Accept |
  | `dismiss_terms` | Cancel |
  | `connecting_status` | Connecting |
  | `chatting_status` | Chatting with AI Agent |
  | `input_label` | Text message input |
  | `input_placeholder` | Send a message |
  | `input_placeholder_text_only` | Send a message |
  | `input_placeholder_new_conversation` | Start a new conversation |
  | `user_ended_conversation` | You ended the conversation |
  | `agent_ended_conversation` | The agent ended the conversation |
  | `conversation_id` | Conversation ID |
  | `agent_working` | Working... |
  | `agent_done` | Completed |
  | `agent_error` | Error occurred |

- `start_call` is the primary CTA button text visible on the floating widget — most important branding token
- TRUSTNOW agent has `start_call` set to "talk to trustnow ai" (custom, all lowercase)

**Shareable page section (NEW — not in previous spec):**
- "Shareable page" label + "Configure the page shown when people visit your shareable link." helper
- **Description** — large textarea (default placeholder: "Chat with AI") — description shown on the public agent page
- **Require visitors to accept our terms** toggle (OFF ⚫) — when ON: T&C acceptance required before starting a conversation on the shareable page

**Live preview:**
- Full live widget renders in bottom-right corner of browser throughout Widget tab session
- Updates in real-time as config changes are made — no save required to preview
- Shows avatar, `start_call` label text, language selector flag, "Powered by ElevenLabs" attribution

---

#### TAB 9 — Security (observed live — updated CO-BROWSING §5)

**Authentication section:**
- "Authentication" label + "Require users to authenticate before connecting to the agent." helper
- **Enable authentication** toggle (ON 🔵 on TRUSTNOW agent) — maps to `auth_policies.authentication_enabled`
- Tutorial card: thumbnail + "Learn how to secure your agent" → opens embedded **YouTube video** player inline (NOT a docs page) — "Secure Your Agents: Allowlists" (8:47)
- **When ON:** callers must present a signed JWT before WebSocket connection is accepted. Session token flow:
  ```
  Widget JS → Client backend → POST /api/auth/session-token (TRUSTNOW)
      ↓ returns { token, expires_at }
  Widget JS presents: Authorization: Bearer <token> in WebSocket handshake
  TRUSTNOW validates token → accepts or rejects connection
  ```
- Widget JS automatically detects `authentication_enabled = true` from the agent config and enters gated mode (shows a loading state while client backend fetches token, then connects).

**Guardrails section (REDESIGNED — card-based, confirmed §5.2):**
- "Guardrails" label + **Alpha badge** + "Define boundaries for your agent's behavior. Control what agents can say and do in production to reduce risk and keep interactions predictable."
- **4 clickable card rows** — each card shows: Icon | Name | Status badge. Entire row is clickable.

**Card states:**
- `Active` — green filled pill badge. Focus card is Active on TRUSTNOW agent.
- `Not enabled` — grey text, no badge background. All others Not enabled on TRUSTNOW agent.

**Card and drawer specifications (confirmed live §5.2):**

| Card | Icon | Maps to | Drawer title | Drawer contents |
|------|------|---------|--------------|----------------|
| **Focus** | ⊙ target circle | `guardrails_focus_enabled` | "Focus guardrail" | Single toggle: **Focus** (ON 🔵). Description: "Keeps the agent focused on its defined goal and system instructions, preventing it from drifting into unintended behavior or off-topic discussions." Buttons: `Cancel` \| `Done` |
| **Manipulation** | ⚙️⚠️ gear+warning | `guardrails_manipulation_enabled` + sub-toggle | "Manipulation" | Single toggle: **Prompt Injection** (OFF ⚫). Maps to `guardrails_prompt_injection`. Description: "Blocks attempts to bypass or override system instructions." Buttons: `Cancel` \| `Done` |
| **Content** | 👁 eye | `guardrails_content_enabled` | "Content" | Sub-toggles for content filtering categories (full list TBC — drawer not fully explored in co-browsing session). Buttons: `Cancel` \| `Done` |
| **Custom** | 🛡 shield | `guardrails_custom_prompt` | "Custom" | Textarea for custom guardrail instructions (free text). Description: "Write custom guardrail rules as plain text instructions." Buttons: `Cancel` \| `Done` |

**Drawer interaction pattern (all 4 cards):**
- Click card → right-side drawer slides in from right edge, overlays ~35% of screen
- Drawer background: `--color-bg-card` with shadow
- `Cancel` → close drawer, discard changes
- `Done` → save changes, close drawer, update card's status badge immediately
- Hover on closed card → tooltip appears with guardrail description

**TRUSTNOW EXCEED ELEVENLABS — Guardrail enhancements:**
- Each guardrail card shows a **trigger count badge**: "Triggered 12× (7d)" — sourced from `guardrail_triggered` client events in the conversations table. Clicking the badge → navigates to a pre-filtered Conversations list showing only conversations where this guardrail fired.
- Add a **5th TRUSTNOW-exclusive guardrail card: Regulatory Compliance** (🏛 building icon) — contains toggles for: FDCPA mode (debt collection compliance), HIPAA-safe mode (healthcare), FCA consumer credit mode. These enforce sector-specific language rules in the system prompt at runtime.

**Allowlist section:**
- "Allowlist" label + "Specify the hosts that will be allowed to connect to this agent." helper
- Allowlist table (empty state: "No hosts added") + `Add host` button (right-aligned)
- Each row: domain string + `×` delete icon
- Warning banner (shown when empty): "No allowlist specified. Any host will be able to connect to this agent. We strongly recommend setting up an allowlist when using overrides."
- Maps to: `auth_policies.allowed_hosts TEXT[]`
- **Naming note:** Allowlist in Security tab (WebSocket connection control) is `auth_policies.allowed_hosts`. The Markdown links section in Widget tab is `widget_configs.allowed_domains`. These are distinct — one controls who can connect, the other controls which URLs are clickable in responses.

**Overrides section:**
- "Overrides" label + "Choose which parts of the config can be overridden by the client at the start of the conversation." helper
- **8 individual toggle rows** (confirmed live §5.4):

| Override | Default | Behaviour when ON |
|---------|---------|-------------------|
| **First message** | OFF | Client can pass `first-message` attribute on `<trustnow-agent>` |
| **System prompt** | OFF | Client can inject additional system prompt context |
| **LLM** | OFF | Client can specify a different LLM for this session |
| **Voice** | OFF | Client can specify a different voice ID |
| **Voice speed** | OFF | Client can adjust TTS speaking speed |
| **Voice stability** | OFF | Client can adjust voice stability |
| **Voice similarity** | OFF | Client can adjust voice similarity |
| **Text only** | **ON 🔵** | Client can force text-only mode via `text-only="true"` attribute |

- Maps to: `auth_policies.allowed_overrides TEXT[]` — array of enabled override keys

**Conversation Initiation Client Data Webhook:**
- "Conversation Initiation Client Data Webhook" label
- "Configure how the conversation initiation client data is fetched when receiving Twilio or SIP trunk calls."
- **Fetch initiation client data from a webhook** toggle (OFF default) — maps to `auth_policies.conversation_initiation_webhook_enabled`
- **When ON:** URL text input appears + auth config appears
- Purpose: at call start (before first message), TRUSTNOW POSTs to this URL with caller metadata (caller ID, called number), receives back JSON data injected as dynamic variables into the agent's context

**Post-call Webhook section:**
- "Post-call Webhook" label
- "Override the post-call webhook for this agent. You can configure the default webhooks used by all agents in your workspace settings."
- Tutorial card: avatar thumbnail + "Learn how to automate post-call workflows with ElevenLabs & n8n" → opens inline video
- **URL text input** (placeholder: "https://...") — `auth_policies.post_call_webhook_url`
- **`Create Webhook` button** (right of URL field) — opens **Create Webhook dialog**:
  ```
  ┌─────────────────────────────────────────────────────┐
  │ Configure post-call webhook                    [×]  │
  │                                                     │
  │ Webhook URL                                         │
  │ [https://...                                    ]   │
  │                                                     │
  │ Signing secret (optional)                           │
  │ [________________________________________________]  │
  │ Helper: "Payloads are signed with HMAC-SHA256.      │
  │ Use X-TRUSTNOW-Signature header to verify."         │
  │                                                     │
  │ [Test connection]    [Cancel]    [Save webhook]     │
  └─────────────────────────────────────────────────────┘
  ```
  - `Test connection` → calls `POST /agents/:id/webhooks/post-call` with `test=true` → shows HTTP status + response time
  - `Save webhook` → calls `POST /agents/:id/webhooks/post-call` with `test=false`
- Empty state when no webhook configured: "No post-call webhook configured."
- When configured: shows masked URL + `Edit` + `Delete` actions

**TRUSTNOW EXCEED ELEVENLABS — Security tab additions:**

1. **Webhook signature snippet:** When `post_call_webhook_secret` is set, display an inline code snippet showing how to verify `X-TRUSTNOW-Signature` in Node.js, Python, and PHP. Copy-paste ready. ElevenLabs only documents this in external docs — TRUSTNOW surfaces it inline in the UI at the point of configuration.

2. **Allowlist reachability indicator:** Each allowlist entry shows a status dot: 🟢 (TRUSTNOW can reach this host) or 🔴 (unreachable / DNS resolution failed). Checked lazily on page load. Helps diagnose CSP or firewall misconfigurations before they affect callers.

3. **Override audit trail:** Overrides actually used in conversations are logged in `conversations.applied_overrides JSONB`. The Metadata panel in conversation detail shows "Overrides applied: text_only" so supervisors can see when client embed code modified the agent's behaviour for a specific caller.

4. **Regulatory Compliance guardrail (TRUSTNOW-exclusive):** 5th guardrail card as described above — enforces BPO-sector compliance language rules at runtime without requiring manual system prompt editing.

---

#### TAB 10 — Advanced (observed live — updated v1.5)

**Multimodal input section (NEW — top of tab, not in previous spec):**
- "Multimodal input" label + "Configure how user input is sent and which input types are enabled for this agent." helper
- **Enable chat mode** toggle (OFF ⚫) — "Create text-only conversational agents that do not process audio."
- **Allow file attachments** toggle (OFF ⚫) — "Let users attach images and PDFs in chat when the selected model supports multimodal input."

**Automatic Speech Recognition (ASR) section:**
- "Automatic Speech Recognition" label + "Configure how the incoming audio is processed and transcribed into text." helper
- **ASR model** dropdown — exactly 2 options (confirmed live):
  - `Original ASR` ✓ (default) — "Default, supports language detection"
  - `Scribe Realtime v2.1` — "Fast and accurate, no language detection support yet"
  - ⚠️ Critical: Scribe Realtime v2.1 CANNOT be used with multi-language agents (no language detection)
- **Filter background speech** toggle (OFF ⚫) + **Alpha badge** — "Enable background voice detection to filter out far field human speech."
- **User input audio format** dropdown — 7 options (confirmed live):
  - `PCM 8000 Hz`
  - `PCM 16000 Hz` `Recommended` badge ✓ (default)
  - `PCM 22050 Hz`
  - `PCM 24000 Hz`
  - `PCM 44100 Hz`
  - `PCM 48000 Hz`
  - `μ-law 8000 Hz` `Telephony` badge — auto-select for SIP/PSTN channel agents

**Conversational behavior section:**
- "Conversational behavior" label + "Configure turn taking behavior and conversation limits." helper
- **Eagerness** dropdown — 3 options (confirmed — NOT a slider, NOT High/Low labels):
  - `Eager`
  - `Normal` ✓ (default)
  - `Patient`
  - Helper: "Controls how eager the agent is to respond. High eagerness means the agent responds quickly, while low eagerness means the agent waits longer to ensure the user has finished speaking."
- **Spelling patience** dropdown — 2 options (NEW — not in previous spec):
  - `Auto` ✓ (default)
  - `Off`
  - Helper: "Controls if the agent should be more patient when user is spelling numbers and named entities."
- **Speculative turn** toggle (OFF ⚫) — "When enabled, starts generating responses during silence before full turn confidence is reached, reducing perceived latency. May increase LLM costs."
- **Take turn after silence** — number input (default: **7**) + "Seconds" static label — "The maximum number of seconds since the user last spoke. If exceeded, the agent will respond and force a turn. A value of -1 means the agent will wait indefinitely for user input."
- **End conversation after silence** — number input (default: **-1**) + "Disabled" label (shown when -1) — "The maximum number of seconds since the user last spoke. If exceeded, the call will terminate. A value of -1 means there is no fixed cutoff."
- **Max conversation duration** — number input (default: **600**) + "Seconds" label — "The maximum number of seconds that a conversation can last."
- **Max conversation duration message** — textarea (placeholder: "Conversation ended, goodbye!") + **language selector dropdown** bottom-right (`🇺🇸 Default (English) ▾`) — per-language message support — "Note: this only applies to text-only conversations."

**Soft timeout section:**
- "Soft timeout" label + "Provide immediate feedback during longer responses." helper
- **Soft timeout** — number input (default: **-1**) + "Disabled" label — "How long to wait for the LLM response before returning a message."

**LLM cascade timeout section (NEW — not in previous spec):**
- "LLM cascade timeout" label + "Configure the timeout for LLM cascade fallback behavior." helper
- **LLM cascade timeout** — number input (default: **8**) + "Seconds" label — "Maximum time to wait for an LLM response before trying the next backup LLM in the cascade. Only modify this if you understand the implications for your LLM cascade configuration — excessively short timeouts may lead to failures."

**Client events section (NEW — not in previous spec):**
- "Client events" label + "Select the events that should be sent to the client." helper
- **Events** label + `Add event` button (top-right of events area)
- Currently enabled events shown as dismissible tags: `audio ×` | `interruption ×` | `user_transcript ×` | `agent_response ×` | `agent_response_correction ×`
- `Add event` opens dropdown with all 11 configurable event types:

  | Event | Default state |
  |-------|--------------|
  | `audio` | ✓ enabled |
  | `interruption` | ✓ enabled |
  | `user_transcript` | ✓ enabled |
  | `agent_response` | ✓ enabled |
  | `agent_response_correction` | ✓ enabled |
  | `agent_response_metadata` | — disabled |
  | `agent_chat_response_part` | — disabled |
  | `agent_tool_request` | — disabled |
  | `agent_tool_response` | — disabled |
  | `vad_score` | — disabled |
  | `guardrail_triggered` | — disabled |

**Privacy section (NEW — not in previous spec):**
- "Privacy" label + "Configure settings related to data retention and Personally Identifiable Information (PII)." helper
- **Zero Retention Mode** toggle (OFF ⚫) — "The contents of the conversation, including all input and output, will not be logged or stored by ElevenLabs. Use post-call webhooks to retrieve information about the call. May impact our ability to debug calls." + `Learn more` link
- **Store Call Audio** toggle (ON 🔵 default)
- **Conversations Retention Period** — number input (default: **-1**) + "Unlimited" label (shown when -1) — "Set the number of days to keep the conversations (-1 for unlimited)."
- **PII Redaction** toggle (OFF ⚫) — `TRUSTNOW` badge — "Automatically redact personally identifiable information (phone numbers, account numbers, card numbers, dates of birth, email addresses, postcodes) from conversation transcripts before storage. Recommended for all BPO deployments." — **TRUSTNOW EXCEED ELEVENLABS: ElevenLabs has no PII redaction. This is a mandatory compliance feature for GDPR/FCA/FDCPA-regulated BPO deployments.**

**Soft timeout message (TRUSTNOW extension — below Soft timeout numeric field):**
- Appears when `soft_timeout_s > 0` (i.e., soft timeout is enabled — not -1)
- Label: **"Soft timeout message"**
- Component: textarea (1–2 rows)
- Default value: "Let me check that for you..."
- Helper: "Message spoken while waiting for the LLM to respond. Keep it short — under 10 words."
- **Language selector** bottom-right: `🇺🇸 Default (English) ▾` — same per-language pattern as First message and Max duration message
- Maps to: `agent_configs.soft_timeout_message` + `agent_configs.soft_timeout_message_localized`

**EXCEED ELEVENLABS — Tab 10 (Advanced) additions:**

1. **Auto audio format for SIP agents:** When a SIP trunk is assigned to this agent (via Phone Numbers), the User input audio format automatically sets to `μ-law 8000 Hz` and shows an `Auto-configured for SIP` badge next to the dropdown. The field becomes read-only with a tooltip: "μ-law 8000 Hz is required for SIP/PSTN telephony. Remove the SIP trunk assignment to change this." ElevenLabs requires manual selection — TRUSTNOW handles it automatically.

2. **PII Redaction (Privacy section):** As specified above — no ElevenLabs equivalent. GDPR/FDCPA/FCA compliance differentiator for BPO clients. Show a compliance badge on agents with PII redaction enabled: `🛡 PII Protected` chip in agent card in the Agents list.

3. **Soft timeout custom message:** ElevenLabs only plays a TTS filler during soft timeout. TRUSTNOW specifies the exact message text, with per-language overrides, so BPO clients control exactly what their callers hear during processing pauses.

4. **Retention period validation:** When `conversations_retention_days` is set to a positive value, show an amber warning: "Conversations older than N days will be permanently deleted, including recordings. This action cannot be undone." Require the agent_admin to type "CONFIRM" before accepting the value. ElevenLabs has no such safeguard.

5. **Data residency indicator (Phase 2):** Show which geographic region conversation data is stored in, next to the Privacy section header. Example: `🌍 EU (Frankfurt)` or `🌐 US (Virginia)`. Critical for GDPR compliance documentation.

**Barge-In / Interrupt Policy (TRUSTNOW extension — beyond ElevenLabs):**
- Interrupt mode: 3-way toggle — `Allow` | `Smart` (default) | `None`
- `None` = TTS plays to completion (for regulated compliance scripts)

**Voice Activity Detection (VAD) Parameters (TRUSTNOW extension):**
- End-of-speech silence threshold: ms input (default 800)
- Minimum speech duration: ms input (default 100)
- Max utterance duration: seconds input (default 60)
- STT start timeout: seconds input (default 10)

**On-Prem Model Config** (shows when Partition B selected):
- Ollama model select
- FasterWhisper model: base | medium | large-v3
- Piper voice file path (auto-populated from /data/piper-voices)

---

### 6.4A — Agent Preview & Test (`/app/agents/[id]/preview`) — fully confirmed live co-browse 28 Mar 2026

**Trigger:** "Preview" button in agent config top bar → opens full-screen preview page (not a modal).

**URL pattern:** `/app/agents/[id]/preview?branchId=[branchId]&include_draft=true`

---

#### Layout — 3 zones

**Left panel (280px) — Conversation History:**
- "History" label + × close button (panel is toggleable — History button in top bar)
- Scrollable list of all previous preview conversations
- Each item: auto-generated descriptive name (LLM summarises the conversation, e.g., "TRUSTNOW welcome message", "Company Information Request", "Greeting", "About TrustNow")
- **During active call:** topmost item shows `"Conversation in progress..."` + `Ongoing` label right-aligned — updates live
- Clicking any history item → opens conversation detail overlay (Overview / Transcription / Client data)
- Conversation detail: pagination `"2 / 20+"` with ▲ ▼ navigation, conversation ID (monospace), waveform player, sub-tabs

**Centre panel — Voice Orb:**
- Large animated metallic/silver 3D orb — central visual of the Preview screen
- Orb animation responds to the current call state (see §6.4B Orb State Machine below)
- **Phone button** below orb — circular, changes state with call (see §6.4B)
- Bottom toolbar: ⚙️ gear icon (audio device selector) | 🎤 **Mute** toggle | 🌐 language selector dropdown

**Right panel — Live Transcript + Chat:**
- **Pre-call empty state:** speech bubble icon + "Call or send a message to start a new conversation"
- **During call — transcript area:**
  - `Call started` centred grey label at top
  - Agent and user turns appear in real time as they are generated (see §6.4C Transcript Bubble Design)
  - Scrollable; auto-scrolls to latest turn
- **Bottom input:** "Send a message" text field + ▶ send button — active during BOTH text-only and live voice call
- **Post-call:** `You ended the call` centred grey label + `+ New conversation` button + `View details` button

**Top bar:**
- ← **Back** button (returns to agent config)
- 🕐 **History** button (toggles left History panel)
- Agent name + branch name (`Main`) + `Live 100%` green badge + branch dropdown chevron
- ⚙️ **Voice settings** button → opens Voice Settings right drawer
- **...** overflow menu

**Voice Settings panel (right drawer):**
- **Voice** row — "Using default" + current voice name + → chevron (preview-only override, does NOT save to agent config)
- **Stability** slider — "Using default" · "More expressive ↔ More consistent"
- **Speed** slider — "Using default" · "Slower ↔ Faster"
- **Similarity** slider — "Using default" · "Low ↔ High"
- All values show "Using default" initially. Changes apply to this preview session only.

---

#### §6.4B — Orb State Machine (confirmed live)

The orb has 3 distinct visual states corresponding to the call lifecycle:

| State | Visual description | Phone button | When |
|-------|-------------------|-------------|------|
| **Idle** | Silver metallic blades in symmetrical open position, very slow ambient drift | ⚫ Black circle with white phone icon (📞) | Before call starts; after call ends |
| **Speaking** (agent TTS playing) | Blades in active rotation, fuller animation, faster motion responding to audio amplitude | 🔴 Red circle with white X icon (✕) | Agent first_message playing; each agent TTS turn |
| **Listening** (awaiting user speech) | Blades slightly collapsed, asymmetric lean, slower than Speaking | 🔴 Red circle with white X icon (✕) | After agent TTS completes; during VAD silence detection |

**Phone button state machine:**
- `Idle state` → user clicks black phone button → call connects → button turns **red X**
- `Active call` → user clicks red X button → call terminates → button returns to **black phone**
- There is no "connecting/ringing" intermediate state — the transition is immediate
- The red X button is the ONLY way to end the call from the UI during an active session

**Implementation requirements:**
- Orb animation must be driven by a real-time audio level signal from the WebRTC/LiveKit stream
- Three CSS animation classes: `.orb-idle`, `.orb-speaking`, `.orb-listening` — switch on WebSocket transcript events
- `streaming: true` event → apply `.orb-speaking`
- `streaming: false` event (TTS complete) → apply `.orb-listening`
- Call connect → `.orb-listening` (not speaking — agent hasn't started first_message yet at the moment of connect; transitions to speaking within ~261ms)
- Call end → `.orb-idle`

---

#### §6.4C — Transcript Bubble Design (confirmed live — pixel-precise)

The transcript panel renders turn-by-turn in real time. Bubble layout is a hybrid of iMessage-style (alternating sides) and contact centre transcript conventions.

**Agent turn bubble:**
```
[🟢] TRUSTNOW  ↕ Main                          ← teal avatar circle + agent name + branch badge (git-branch icon + branch name)
┌─────────────────────────────────────────┐
│  "Hi — I'm TrustNow's AI Agent. Tell   │  ← white/light background, full-width, left-aligned text
│  me what you're trying to achieve..."  │
│                                         │
│  0:00                                   │  ← timestamp M:SS, small grey, bottom-left of bubble
│  └─ TTS 261 ms                          │  ← TTS latency pill, grey/muted, bottom-left
└─────────────────────────────────────────┘  [🔔]  ← bell icon right of bubble (QM flagging)

For subsequent agent turns (after first user turn), LLM latency badge also appears:
│  0:34
│  └─ LLM 453 ms   TTS 106 ms             │  ← both LLM and TTS badges shown; LLM first
```

**User turn bubble:**
```
                                    [🔔]     ← bell icon LEFT of bubble (right side of screen)
              ┌────────────────────────────┐
              │  "Okay, wait, wait, wait.  │  ← gray background, right-aligned, narrower width
              │  Let me interrupt you.     │  ← no avatar
              │  Where are the offices?"  │
              │                      0:47  │  ← timestamp right-aligned
              │            ASR 234 ms      │  ← ASR latency pill, bottom-right
              └────────────────────────────┘
```

**Between-turn gap (silence / agent processing):**
```
                   ...              ← three dots centred, appears while LLM is generating response
                  0:20              ← timestamp when the silence/processing gap started
```

**Streaming agent turn (TTS playing, text not yet complete):**
```
[🟢] TRUSTNOW  ↕ Main
┌─────────────────────────────────────────┐
│  "Hello Rajan. TrustNow delivers an    │
│  AI-first, enterprise-grade Digital    │
│  Experience and governed Autonomous    │
│  AI Worker stack. We focus on safely   │
│  automating complex business pro..."   │  ← text ends mid-sentence with "..." while TTS playing
└─────────────────────────────────────────┘
```
When TTS completes: `...` tail is removed, full text shown, latency badges appear.

**Latency badge display rules (confirmed live):**
- LLM latency < 1000ms → `LLM 453 ms`
- LLM latency ≥ 1000ms → `LLM 2.0 s` (decimal seconds, one decimal place)
- TTS latency → always `TTS Xms` format
- ASR latency → always `ASR Xms` format
- First agent turn (first_message): only `TTS Xms` shown — no LLM badge (no LLM was called)

**Bell icon (🔔) — QM flagging:**
- Present on every turn (both agent and user)
- Clicking opens a QM annotation/flag panel for that turn
- On agent turns: bell appears to the right of the bubble
- On user turns: bell appears to the left of the bubble (which is the right side of the viewport)

---

#### §6.4D — Conversation Detail (History item / View details)

Opened by clicking a history conversation OR clicking "View details" post-call.

**Header:**
- Pagination: `▲ ▼  2 / 20+  Conversation with {Agent Name}  ↕ Main ⓘ`
- Conversation ID: `conv_0701kmskqmbkemxbhcabv65j3f4m` (monospace, copyable)

**Audio player:**
- Full-width waveform visualisation
- ▶ Play | `1.0x` speed | ↺ rewind 10s | ↻ forward 10s | timestamp `0:00 / 4:20` | `...` overflow

**Info banner:** "You can now ensure your agent returns high quality responses to conversations like this one. Try Tests in the Transcription tab."

**3 sub-tabs: Overview | Transcription | Client data**

*Overview sub-tab:*
- **Summary** — LLM-generated paragraph summary of entire conversation
- **Call status**: `Successful` green badge + 🔄 re-evaluate button
- **How the call ended**: `Client ended call` / `Silence timeout` / `Max duration` / `Agent ended`
- **User ID**: user identifier or "No user ID"

*Transcription sub-tab:*
- Same bubble design as live Preview panel (§6.4C) but with full waveform sync
- Audio waveform at top — clicking a timestamp in transcript seeks the waveform player
- Every turn shows: text + timestamp + latency badges + bell icon
- Agent turns: `LLM Xms  TTS Xms` (LLM badge absent on first_message turn)
- User turns: `ASR Xms`

*Client data sub-tab:*
- Evaluation criteria results per criterion (pass/fail)
- Data collection results per field extracted

**Metadata panel (right sidebar, always visible):**
- **Date**: `Today, 12:27 PM`
- **Text-only**: `No`
- **Environment**: `production` badge + `Manage environments` link + `Learn more` link
- **Connection duration**: `4:22`
- **Call cost**: `873 credits` + `Development discount applied` note
- **Credits (LLM)**: `28`
- **LLM cost**: `$0.0014 / min` + `Total: $0.0061`

---

#### §6.4E — Backend Implications (confirmed live)

1. **Development discount on preview calls** — TRUSTNOW must implement `is_preview = true` on conversations initiated from the preview screen and apply a discounted credit calculation. Confirmed: 873 credits for a 4:22 voice call with development discount.

2. **Environment field** — `conversations.environment` (already in schema) must be populated: preview = `'staging'`, live widget/SIP = `'production'`.

3. **`how_call_ended` confirmed values:** `client_ended_call` (user clicked red X), `silence_timeout` (3-tier watchdog exhausted), `max_duration`, `agent_decision` (system tool `end_call`), `handoff_complete`.

4. **Credits (LLM) is a separate field** from Call cost — both must be stored separately in `conversations` table. LLM cost is also shown in $/min with a running total.

5. **Agent cannot self-terminate** — confirmed live: agent's LLM response told caller "I am an AI agent, so there isn't a traditional call to disconnect." Call termination is always platform-initiated via FreeSWITCH ESL (§IMPL-001 §9.3 `platform_end_call()`). The UI red X button sends a `DELETE /api/sessions/{cid}` to Platform API which issues the ESL hangup command.

---

### 6.5 Voice Picker Side Sheet

Triggered from Tab 1 "Change voice" button. Opens as a right-side sheet (520px wide).

**Header:**
- "Select Voice" title + Close button (×)

**3 Tabs (matching live ElevenLabs platform): `Explore` | `My Voices` | `Default Voices`**

**Explore tab (global library):**

Filter bar:
- **Language** dropdown (with flag icons + search) — cascades to **Accent** dropdown
- Category chips row (horizontal scroll): `Conversational` | `Narration` | `Characters` | `Social Media` | `Educational` | `Advertisement` + more
- **Filters** button (aggregate: gender, age, tone, use case, emotion range, partition)
- Sort icon (sort by: Trending, Newest, Most Used)

Sections (matching live platform layout):
1. **Trending voices** section header with "›" see all link — 6-voice grid
2. **Handpicked for your use case** — horizontal scroll of use case cards:
   - `Customer Support` | `Sales` | `Coach` | `Personal Assistant` — click filters list
3. **Full voice list** — rows or cards with:
   - Avatar circle + voice name + tag (e.g., "Polished, Soft and Clear")
   - Language flag + language name + accent (e.g., `🇮🇳 Hindi` or `🇮🇳 Hindi & Tamil +9`)
   - Category tag (Conversational / Narration)
   - Age indicator
   - Usage count (e.g., 180.3K)
   - **"Watchout for notice period"** info banner — "Voices with higher notice period will remain in the library even if removed by the owner."
   - Row actions: `+` (add to agent) | link icon (copy voice link) | `...` overflow menu

**Voice card layout (list view):**
```
[🔵 Avatar]  Sarah — Mature, Reassuring, Confident    🇺🇸 English  American  Conversational  2y  180.3K  [+] [🔗] [...]
```

**My Voices tab:**
- Same list format showing only tenant-private voices
- `+ Create Voice` button → drawer with two options:
  - **Upload & Clone (IVC)** — drag-and-drop WAV/MP3 (min 1 min), voice name, language, gender, tags
  - **Design Voice (AI Generation)** — text description prompt → 3 preview options → name and save

**Default Voices tab:**
- Platform pre-configured default voices per language
- Read-only for tenant users

**Voice Preview:**
- `▶` button → calls `/voices/{id}/preview` with agent's first message text → inline audio player
- Real synthesis, not a sample clip

**Voice Settings (expandable below selection in Tab 1):**
- Stability slider (0.3–0.9, default 0.65)
- Similarity slider (0.5–1.0, default 0.75)
- Speed slider (0.7–1.2x, default 1.0x)
- "Reset to defaults" link

---

### 6.6 Voice Library (`/app/voices`)

**Purpose:** Full voice catalogue management. Browse global library, manage tenant voices.

**Page header:** "Voices" breadcrumb + "Explore" sub-page

**3 Tabs: `Explore` | `My Voices` | `Default Voices`** + `+ Create Voice` button (top right)

**Explore tab (matching live platform):**

Filter bar:
- **Language** dropdown + **Accent** (cascades)
- Category chips: `Conversational` | `Narration` | `Characters` | `Social Media` | `Educational` | `Advertisement` + scroll for more
- **Filters** button + sort icon

Sections:
1. **Trending voices** — 6-card grid, section header with → arrow
2. **Handpicked for your use case** — horizontal carousel of use case category cards with arrow navigation (← →): Customer Support | Sales | Coach | Personal Assistant
3. **Themed sections** (e.g., "Conversational — Young & Relaxed") — voice rows with full metadata

**Voice row (list layout — observed live):**
```
[Avatar] Voice Name — Description tag    🌐 Language [+N more]  Accent   Category   Age  Usage   [+] [🔗] [...]
```

**My Voices tab:**
- All tenant-private voices (IVC clones, designed voices, Piper on-prem)
- Source type badge: `ElevenLabs` | `Piper On-Prem` | `IVC Clone` | `Designed`
- Grid: Edit | Delete | Preview | Attach to agent
- `+ Create Voice` button → same two-option flow

**Default Voices tab:**
- Platform defaults per language/use-case
- Read-only

**Notice period banner** (important UX pattern observed live):
- Light background card with calendar icon: "Watchout for notice period — Voices with a higher notice period will remain in the library for some duration, even if it's removed by the owner. You can still use it to finish your project!"

---

### 6.7 Knowledge Base (`/app/knowledge-base`) — Global KB page (observed live)

**Purpose:** Platform-level KB management for the entire workspace/tenant.

**Header:** "Knowledge Base"

**Top action buttons row (observed live — matching ElevenLabs pattern):**
`Add URL` | `Add Files` | `Create Text` | `Create Folder`

**RAG Storage quota (observed live):** `● RAG Storage: 0 B / 21.0 MB` — green dot + usage/quota

**Filter bar:** Search "Search Knowledge Base..." + `+ Type` + `+ Creator` filter chips

**Documents table (observed live):**
| Name (with type icon + sub-status) | Created by | Last updated | `...` overflow |
- Folder icon for folders, URL globe icon for web crawls, T icon for text docs
- Sub-status shown under name: "RAG indexing complete" | "Indexing..." | "Error"
- Overflow menu: Re-index | Edit | Move | Delete

**Your actual KB docs visible:**
- www.trustnow.ai Crawl Job (2026-01-31) — 0 documents (folder)
- ElevenAirlines Info — 87 B (text)
- TrustNow — Digital Experiences Built for Clarity and Confidence (URL)

---

### 6.8 Tools (`/app/tools`) — Global Tools page (observed live)

**Purpose:** Manage reusable tools that can be attached to any agent.

**Header:** "Tools" (matching sidebar label, not "Tools Registry")

**Sub-tabs: `Tools` | `MCP`** — matching agent-level Tools tab

**Tools table:** Name | Type | Description | Used by agents | Last used | Actions
- Search + Type + Creator filters

**MCP sub-tab:** Global MCP server connections management

---

### 6.9 Integrations (`/app/integrations`) — Alpha (observed live)

**Purpose:** Third-party integration marketplace. "Alpha" badge in sidebar.

**Integration catalogue** — cards for available integrations
**My Integrations** — configured integrations with status

---

### 6.10 Conversations (`/app/agents/history`) — Monitor → Conversations (CO-BROWSING §15)

**Sidebar location:** Monitor → Conversations  
**URL:** `/app/agents/history` (NOT `/app/conversations` — confirmed §15.2)  
**Page title:** "Conversation history"  
**Purpose:** Workspace-level global conversation log — ALL conversations across ALL agents in one view. This is the supervisory/QM view. Distinct from Tab 5 (Analysis) which is agent-scoped.

---

**Key differences vs Tab 5 (Analysis) — confirmed §15.5:**

| Feature | Monitor → Conversations (global) | Tab 5 — Analysis (agent-scoped) |
|---------|----------------------------------|--------------------------------|
| Scope | All agents | One agent |
| Agent column | ✅ Yes | ❌ (already scoped) |
| Branch filter pre-applied | ❌ None | ✅ Main branch |
| `+ Agent` filter chip | ✅ Yes | ❌ |
| Evaluation criteria panel | ❌ | ✅ |
| Data collection panel | ❌ | ✅ |
| Analysis Language setting | ❌ | ✅ |
| Conversation navigation arrows | ✅ `1 / 20+` | ❌ |
| Share icon | ✅ `↗` | ❌ |
| URL | `/app/agents/history` | `?tab=analysis` on agent page |

---

**Page layout:**

- Search bar: "Search conversations..." (full-width) + 🔤 `TT` column settings icon (top-right) → toggles column visibility

**Filter chips (12 total — no pre-applied filters, §15.2):**

| Chip | Notes |
|------|-------|
| `+ Date After` | |
| `+ Date Before` | |
| `+ Call status` | Successful / Failed |
| `+ Criteria` | |
| `+ Data` | |
| `+ Duration` | |
| `+ Rating` | CSAT 1–5 |
| `+ Comments` | Has/hasn't annotations |
| **`+ Agent`** | **KEY DIFFERENTIATOR — filter by specific agent. Not present on Analysis tab.** |
| `+ Tools` | |
| `+ Language` | |
| `+ User` | |
| `+ Channel` | widget / phone / WhatsApp |

**Table columns (5 — confirmed §15.2):**

| Column | Format | Notes |
|--------|--------|-------|
| **Date** ↓ | "Mar 28, 2026, 6:51 PM" | Default sorted newest first |
| **Agent** | "TRUSTNOW 🌿 Main" | Agent name + Branch badge — **absent in Analysis tab** |
| **Duration** | 4:12 | MM:SS |
| **Messages** | 47 | Turn count |
| **Call status** | `Successful` (green) | |

**Pagination:** Infinite scroll — "Loading..." appears at bottom as more conversations load. No page numbers.

---

**Conversation detail view (click row — §15.4):**

**URL pattern:** `/app/agents/history/{conversation_id}`

**Navigation header (unique to global view — absent in Analysis tab):**
```
↑  ↓  │  1 / 20+  │  Conversation with TRUSTNOW 🌿 Main ⓘ  │  conv_4801kmt9...  │  ↗
```
- `↑ ↓` arrows — navigate to previous/next conversation in the filtered list
- `1 / 20+` — position indicator
- `↗` share icon — generates shareable link to this specific conversation (for sharing with clients or QA teams)

**Content:** Identical to Tab 5 Analysis conversation detail:
- Audio waveform player
- Info banner: "You can now ensure your agent returns high quality responses to conversations like this one. Try Tests in the Transcription tab."
- 3 sub-tabs: Overview | Transcription | Client data
- Right metadata panel: Date / Text-only / Environment / Duration / Call cost / Credits / LLM cost

---

**EXCEED ELEVENLABS — Monitor → Conversations additions:**

ElevenLabs provides a read-only global conversation log. TRUSTNOW adds:

1. **Channel column and icon badges:** Each row shows a channel badge: 📞 Phone | 🌐 Widget | 💬 WhatsApp. BPO supervisors manage calls across multiple channels simultaneously — channel identification at-a-glance is essential.

2. **Live conversations row highlight:** Conversations currently in-progress (no `ended_at`) appear at the top of the list with a pulsing `🔴 Live` badge. Clicking opens the live call monitoring view (see Live Dashboard). ElevenLabs shows only completed conversations in history.

3. **Bulk export:** Multi-select rows → `Export selected (N)` button → downloads CSV of selected conversations with all metadata. BPO clients export conversations for weekly QM reports, compliance audits, and client billing. ElevenLabs has no bulk export.

4. **Saved filter sets:** BPO supervisors use the same filter combinations repeatedly (e.g. "Failed calls today from Agent X on WhatsApp"). A "Save this filter" button stores the current filter combination with a name. Saved filters appear as quick-access chips above the filter bar. ElevenLabs has no saved filters.

---

### 6.11 Users (`/app/users`) — Monitor section

**Purpose:** User management for the workspace.

**Header:** "Users"
**Table:** User name | Email | Role | Last active | Actions
**Invite user** button
**Role management** — assign/change roles

---

### 6.12 Tests (`/app/tests`) — Global Tests page (observed live)

**Purpose:** Global test management across all agents.

**Header:** "Tests" + "Create Folder" button + **"+ Create a test"** button (primary black)

**Info banner (observed live):** "Agent testing is now live. Create tests based on existing or hypothetical conversations and run them anytime to ensure quality of agent actions."

**Search:** "Search tests..."

**Table columns:** Name (✏️ edit icon) | **Type** | Created by | Last updated | ▶ Run | `...` overflow

**Test types (2 types only — observed live):**
- **Next Reply** — given a conversation context, verify what the agent says next
- **Tool Invocation** — given an input, verify the correct tool is called

**5 default template tests (observed live, created by ElevenLabs):**
1. Can read knowledge base — Next Reply
2. Empathy for Delayed Flight Test — Next Reply
3. Greeting Response Test — Next Reply
4. Workflow Node Transition Test — Tool Invocation
5. Multi-Turn Lost Baggage Conversation Test — Next Reply

---

### 6.13 Phone Numbers (`/app/phone-numbers`) — Deploy section (CO-BROWSING §10)

**Sidebar location:** Deploy → Phone Numbers  
**URL:** `/app/phone-numbers`  
**Purpose:** Import and manage SIP trunk phone numbers — the bridge between PSTN and TRUSTNOW AI agents.

---

**Page header:** H1 "Phone Numbers" + `Import a phone number from SIP trunk` button (primary black)

**Empty state (confirmed §10.2):**
```
📞  Phone Numbers

    Import a phone number from SIP trunk

    [Import a phone number from SIP trunk]   ← secondary CTA
```

**Populated table (confirmed §10.2 — 5 columns):**

| Column | Format | Notes |
|--------|--------|-------|
| **Phone number** | +15551234567 | E.164 format |
| **Label** | "UK Support Line" | Descriptive name |
| **Agent assigned** | Agent name or "Unassigned" | |
| **Status** | `Active` (green) / `Paused` (amber) | |
| **Actions** | `...` overflow | Edit / Pause / Unassign / Delete |

---

**Import a phone number from SIP trunk — 8-Step Wizard (confirmed §10.3)**

Opened by clicking `Import a phone number from SIP trunk`. Modal dialog.

**Step 1 — Navigate** (informational — the wizard is now open)

**Step 2 — Basic Configuration:**
- **Label** — text input (required) — e.g. "UK Sales Line"
- **Phone Number** — text input (required) — E.164 format e.g. `+15551234567`
- Helper: "Phone number must match the identifier used in the SIP URI exactly (with the `+`)."

**Step 3 — Inbound Transport & Encryption:**

| Setting | Options | Default | Notes |
|---------|---------|---------|-------|
| **Transport Type** | `TCP` / `TLS` | TLS | TLS = encrypted SIP signalling |
| **Media Encryption** | `Disabled` / `Allowed` / `Required` | Required | Controls RTP/SRTP for audio |

Media encryption meanings:
- `Disabled` — plain RTP (no audio encryption)
- `Allowed` — SRTP supported but not enforced
- `Required` — SRTP enforced on all calls (**recommended for BPO/enterprise**)

**Step 4 — Outbound Settings:**

| Field | Notes |
|-------|-------|
| **Address** | SIP provider hostname e.g. `sip.telnyx.com` — **NO `sip:` prefix** |
| **Transport Type** | TCP / TLS |
| **Media Encryption** | Disabled / Allowed / Required |

**Step 5 — Custom SIP Headers (optional):**
- `Add header` button → key/value rows
- Use for: billing codes, provider routing, caller identification

**Step 6 — Authentication (optional):**

| Method | Fields | Notes |
|--------|--------|-------|
| **Digest Auth** | SIP username + password | Recommended — provider-independent |
| **ACL (IP allowlist)** | *(leave fields blank)* | Requires TRUSTNOW IPs whitelisted at provider |

- Digest auth strongly recommended — no IP allowlist management required

**Step 7 — Review:** Summary of all settings before import.

**Step 8 — Complete:** Click `Import` → number appears in table, FreeSWITCH dialplan reloaded.

---

**TRUSTNOW SIP Endpoint Details** (shown in wizard and in Phone Numbers page sidebar):

```
Standard:   sip:sip.rtc.trustnow.ai:5060;transport=tcp
Encrypted:  sip:sip.rtc.trustnow.ai:5061;transport=tls

Full call URI:  sip:+19991234567@sip.rtc.trustnow.ai:5060

Enterprise static IP endpoints:
  US/International:  sip-static.rtc.trustnow.ai
  EU (GDPR isolated): sip-static.rtc.eu.trustnow.ai
  India isolated:    sip-static.rtc.in.trustnow.ai
```

**Supported codecs:** G711 8kHz (μ-law PCMU) | G722 16kHz  
**Transport:** TCP and TLS only — **UDP not supported**  
**RTP ports:** 10000–60000 (must be open in firewall)

---

**Assigning agents to phone numbers (§10.7):**
- After import: click number row → `Assign agent` action → agent picker
- One number → one agent (for multi-agent routing: use PBX → route to separate DIDs)
- When agent is assigned: platform auto-sets agent's audio format to μ-law 8000 Hz with `Auto-configured for SIP` badge (see Tab 10 Advanced)

---

**Troubleshooting quick reference (shown as collapsible in UI — §10.8):**

| Issue | Fix |
|-------|-----|
| Connection failure | Open port 5060 TCP or 5061 TLS in firewall |
| No audio / one-way | Open UDP ports 10000–60000 for RTP |
| Authentication failure | Verify SIP username/password |
| 481 on BYE | Send BYE to `Contact` URI from 200 OK, not to load balancer |
| TLS failure | Test with TCP first; verify TLS 1.2+ at provider |

---

**EXCEED ELEVENLABS — Phone Numbers additions:**

1. **Geographic SIP endpoints:** TRUSTNOW provides three regional SIP endpoints (US, EU, India) for data residency compliance. The Phone Numbers page shows a region selector when importing — EU/India clients route to the appropriate endpoint. ElevenLabs has one global endpoint with enterprise-only regional isolation.

2. **SIP trunk test button:** During setup wizard (Step 4) and on the phone number detail page, a `Test connection` button sends a synthetic SIP INVITE to the outbound address and shows: `200 OK (189ms)` in green or `503 Service Unavailable` / timeout in red. ElevenLabs requires a real call to verify — TRUSTNOW tests without placing a live call.

3. **Call routing rules per DID:** Each phone number has a `Routing rules` panel: time-of-day (business hours → Agent A, after-hours → Agent B), DNIS routing, and caller ID routing (VIP numbers → priority agent). Standard BPO IVR capability. ElevenLabs supports only simple one-to-one assignment.

4. **Concurrent call capacity meter:** Each table row shows a live capacity bar: `3 / 10 concurrent calls` with colour coding. Approaching limit → amber. At limit → red, new calls receive busy signal. BPO operations managers need this for real-time capacity management.

---

### 6.14 WhatsApp (`/app/whatsapp`) — Deploy section (CO-BROWSING §16)

**Sidebar location:** Deploy → WhatsApp  
**URL:** `/app/whatsapp`  
**Purpose:** Connect WhatsApp Business Accounts and deploy AI agents to handle WhatsApp messages and voice calls.

---

**Page header:** H1 "WhatsApp accounts" + `+ Import account` (primary black, top-right)

**Empty state:**
```
📱  WhatsApp accounts

    No WhatsApp accounts
    You don't have any WhatsApp accounts yet.

    [+ Import account]
```

**Connected accounts table:**

| Column | Notes |
|--------|-------|
| Account name / phone | E.164 + display name |
| Assigned agent | Agent name or "No agent assigned" |
| Status | `Active` (green) / `Paused` / `Disconnected` |
| Actions | `Outbound → Message` \| `Outbound → Call` \| `Settings` |

---

**4-Step Setup Flow (confirmed §16.3):**

**Step 1:** Navigate to WhatsApp accounts page → click `+ Import account`

**Step 2 — Facebook/Meta OAuth (confirmed live — Raj):**
- Clicking `+ Import account` → redirects to **Facebook login page**
- User authenticates with Meta credentials
- Selects their Meta Business Account + WhatsApp Business Account
- Grants TRUSTNOW permission to manage the WhatsApp Business Account
- Redirects back to TRUSTNOW with OAuth code → TRUSTNOW exchanges for access token

**Step 3 — Assign Agent:**
- After import → account settings panel opens
- `Assign agent` dropdown — select which AI agent handles conversations
- **If no agent assigned:** inbound messages ignored, inbound calls rejected, outbound still possible

**Step 4 — Configure in WhatsApp Manager (external — at business.facebook.com):**
- Profile picture + display name → Phone numbers → Profile tab
- Enable voice calls → Phone numbers → Call settings tab (**required for calling**)
- Add payment method → Overview (**required for outbound calls**)

---

**Message Conversations (§16.4):**

*Inbound:* User messages the WhatsApp Business number → agent responds.

*Outbound:* Requires a pre-approved Meta message template.
- `Outbound → Message` button → dialog: Select agent + Recipient WhatsApp ID + Template + Parameters
- Max conversation duration timer starts after user's first response (not on send)

---

**Message Types Supported (§16.5):**

| Type | Inbound | Outbound |
|------|---------|----------|
| Text | Passed to agent | Agent responds with text |
| Audio | STT → text → agent | Agent responds with audio (if `respond_with_audio = true`) |
| Image | Passed to agent (multimodal) | — |
| Document | Passed to agent | — |
| Location | Passed to agent | — |
| Contact | Passed to agent | — |

Audio billing: STT transcription rates + TTS synthesis rates apply.

---

**Voice Calls (§16.6):**

*Inbound:* User calls → agent answers. During call, user can also send text messages.

*Outbound:* Requires user call permission first (Meta policy).
1. `Outbound → Call` button → dialog: Agent + Recipient + Call permission template
2. TRUSTNOW sends permission request template to user's WhatsApp
3. User approves → TRUSTNOW initiates call immediately

Batch outbound WhatsApp calls → same Batch Calling UI as phone numbers.

---

**Account Settings panel:**

| Setting | Notes |
|---------|-------|
| **Assigned agent** | Dropdown — all workspace agents |
| **Audio responses** | Toggle — ON = TTS audio replies; OFF = text-only |
| **Status** | Active / Paused |
| **Phone number** | Display only (E.164) |
| **WABA ID** | Display only — copyable |

---

**EXCEED ELEVENLABS — WhatsApp additions:**

1. **Multi-brand account labelling:** Each WhatsApp account has a **Brand** field (free text). BPO clients managing WhatsApp for multiple end clients label each account: "Brand: Acme Insurance" / "Brand: Atlas Telecoms". Accounts table shows the brand column. ElevenLabs has no brand labelling.

2. **Template library viewer:** A `View templates` button in account settings fetches all approved Meta message templates for this account and displays them: template name / category / approval status / parameter slots. Saves agent admins from switching to Meta Business Manager to look up template names.

3. **Conversation continuity window:** Settings toggle: "Resume conversation within [X hours]" (default 24h). If the same WhatsApp number messages again within X hours, the conversation continues the existing thread. After X hours, a new conversation starts. ElevenLabs starts a new conversation on every message.

4. **Handover to human via WhatsApp:** When AI triggers human handoff, TRUSTNOW can transfer the WhatsApp thread to a human agent's WhatsApp Business Manager inbox using Meta's Agent Handover Protocol — rather than just ending the conversation. Shows as "Transfer to human" in the agent's handoff policy settings when WhatsApp is the active channel.

---

### 6.15 Outbound / Batch Calling (`/app/batch-calling`) — Deploy section (CO-BROWSING §11)

**Sidebar location:** Deploy → Outbound  
**URL:** `/app/batch-calling`  
**Purpose:** Create and manage outbound AI agent call campaigns — the AI calls recipients, not vice versa.

---

**Batch Calling List page:**

**Header:** "Batch Calling" + 📋 copy icon (copies page link) + `+ Create a batch call` button (primary black)

**Search bar:** "Search Batch Calls..."

**Empty state:**
```
📞  Batch Calling

    No batch calls found.
    You have not created any batch calls yet.
```

**Populated table columns (§11.4):**

| Column | Format |
|--------|--------|
| **Name** | Batch name |
| **Status** | `Pending` (grey) / `Running` (blue) / `Completed` (green) / `Failed` (red) / `Cancelled` |
| **Recipients** | Total count |
| **Progress** | "87 / 500 calls" + progress bar |
| **Created** | Datetime |
| **Actions** | `...` — View / Pause / Cancel |

---

**Create a Batch Call page (`/app/batch-calling/create`):**

**Layout:** Two columns — left (form) | right (recipient preview panel)  
**Back:** `<` returns to list

**Left panel — all 7 form fields (top to bottom, confirmed §11.3):**

**1. Batch name**
- Text input, default "Untitled Batch"
- Examples: "Delivery notice", "Appointment Reminders April"

**2. Phone Number**
- Dropdown — lists imported SIP trunk numbers
- Default / empty state: "Please add a phone number to start batch calling" (disabled)
- Dependency: requires at least one number in Phone Numbers section

**3. Ringing timeout (seconds)**
- Numeric input, default **60**
- "How long to ring before marking call as unanswered"

**4. Concurrency limit**
- Numeric input, default **Auto**
- Auto formula: `MIN(workspace_concurrency × 50%, agent_concurrency × 70%)`
- Purpose: reserves capacity for inbound calls alongside the batch

**5. Select Agent**
- Dropdown — all agents in workspace listed
- Default: "Select an agent"

**6. Recipients (file upload)**
- Upload zone — drag & drop or click `Upload`
- Accepted: **CSV** and **XLS** only
- Max size: **25.0 MB**
- `⬇ Template` button — downloads pre-formatted CSV template

**CSV formatting rules (shown inline below upload):**

| Rule | Detail |
|------|--------|
| Required column | `phone_number` — E.164 format |
| Dynamic variables | Any other column (name, account_balance, etc.) → injected into agent context |
| Override columns | `language`, `first_message`, `system_prompt`, `voice_id` → override agent settings per row |
| Override prerequisite | Override columns only work if enabled in agent's Security tab → Overrides section |

**CSV sample preview shown in UI (§11.3):**
```
name    | phone_number  | language
Nav     | +3838310429   | en
Antoni  | +3838310429   | pl
Thor    | +3838310429   | de
```

**7. Timing**
- **`Send immediately`** — black pill, default selected — batch starts on submit
- **`Schedule for later`** — reveals:
  - 📅 Date/time picker (pre-filled with current time)
  - 🌐 Timezone picker (auto-detected: e.g. "Asia/Calcutta")

**Compliance notice (§11.6 — shown above submit button):**
> "When conducting outbound call campaigns, ensure compliance with all relevant regulations, including TRAI/DND (India), TCPA (US), and GDPR (EU)."
- **Compliance acknowledgement checkbox:** "I confirm this campaign complies with all applicable regulations." — must be checked to enable Submit.

**Bottom action bar:**
- `Test call` (ghost) — initiates single test call to verify setup before full batch
- `Submit a Batch Call` (primary black — disabled until required fields + compliance checkbox filled)

**Right panel — Recipient preview:**
- Empty: grid icon + "No recipients yet. Upload a CSV to start adding recipients."
- After upload: table preview of CSV rows (first 10 rows shown, "and N more...")

---

**Batch Call Detail page (click any batch in list):**

**Summary section:**
- Status badge | Total recipients | Started | Progress bar (N / total)

**Recipient list table:**

| Column | Notes |
|--------|-------|
| Phone number | E.164 |
| Dynamic variables | Key-value preview |
| Status | Pending / In progress / Completed / Failed / Cancelled |
| Conversation | Link to full conversation detail (same as Analysis tab) |

**Individual call status definitions:**
- `Pending` — queued, not yet called
- `In progress` — currently ringing or in conversation
- `Completed` — conversation finished (any outcome)
- `Failed` — no answer / error
- `Cancelled` — batch was cancelled before this call was attempted

---

**EXCEED ELEVENLABS — Batch Calling additions:**

1. **DNC (Do Not Call) enforcement:** Before queuing any recipient, numbers are checked against the tenant's DNC list. Excluded numbers show `dnc_excluded` status in the recipient table. DNC list managed via Settings → DNC List (bulk import CSV, add individual numbers, auto-expire after N days). ElevenLabs has no DNC capability — BPO clients using TRUSTNOW for debt collection are legally required to have this.

2. **Calling hours enforcement:** Per-batch time-window configuration: "Only call between 09:00–20:00 in recipient's local timezone, Monday–Friday." Recipients outside calling hours are queued to the next valid window. TRAI (India) and TCPA (US) mandate calling hours restrictions. ElevenLabs ignores timezone compliance.

3. **Retry configuration:** For no-answer recipients, configure retry: "Retry up to 3 times, minimum 2 hours between attempts." Shows in recipient row: "Attempt 2 of 3 — Next retry: 4:30 PM." ElevenLabs marks no-answer as permanently failed.

4. **Pre-submission cost estimate:** Before clicking Submit, show: "Estimated cost: ~£X.XX based on N recipients × avg Xm call duration at £X.XX/min." Helps BPO managers budget campaigns.

5. **Pause / Resume:** `Pause` button on running batches — stops sending new calls while in-progress finish. `Resume` continues. Useful when a compliance issue is discovered mid-campaign. `POST /batch-calls/:id/pause` + `POST /batch-calls/:id/resume`.

---

### 6.16 Settings (`/app/agents/settings`) — CO-BROWSING §17

**Sidebar location:** Below Outbound (bottom of Deploy section)  
**URL:** `/app/agents/settings`  
**Page title (H1):** "ElevenAgents Settings ✓" (with ✓ indicating settings are saved)  
**Sub-title:** "Configure workspace-wide settings for ElevenAgents"  
**Auto-save:** Changes save automatically — "Loading... Saved" indicator top-right (no manual Save button)

**Purpose:** Workspace-level defaults that apply across ALL agents. Agent-level settings (Tab 9 Security, Tab 10 Advanced) override these defaults for individual agents.

---

**4 sections (top to bottom — confirmed §17.2):**

---

**Section 1 — Conversation Initiation Client Data Webhook**

- Helper: "Configure the webhook that will be called when a new **Twilio phone call** or **SIP trunk call** conversation begins."
- `Add webhook` button → opens webhook configuration form (URL + auth method + headers)
- **Purpose:** Workspace-wide default. When a SIP/Twilio call arrives, TRUSTNOW fires this webhook *before* the agent speaks — fetches caller CRM data, injects as dynamic variables
- **Override hierarchy:** Agent-level initiation webhook (Tab 9) takes priority → workspace default fires as fallback if none set
- Empty state: "No webhook configured. Add a webhook to fetch caller context data for all SIP/Twilio calls."

---

**Section 2 — Workspace Secrets**

- Helper: "Create and manage secure secrets that can be accessed across your workspace."
- `Add secret` button → opens modal

**"Add secret" modal (confirmed live §17.4):**
```
🔒  Add secret

    Securely store a value that can be used by the tools.
    Once added the value cannot be retrieved.

    Name    [________________________]
    Value   [________________________]
            [________________________]

    [Cancel]                [Add secret]
```

- **Name field:** Reference key — e.g. `CRM_TOKEN`, `OPENAI_API_KEY`. Uppercase + underscores convention.
- **Value field:** Actual secret value. Encrypted immediately. **Never shown again after save.**
- After creation: appears in list as `CRM_TOKEN — Created by user@email.com — Jan 15` (no value shown)
- **Usage in tools:** Referenced as `{{secret.SECRET_NAME}}` in webhook tool URL/header fields — resolved at runtime, never exposed in API responses

**List columns:** Name | Created by | Created at | `...` (Delete only — no edit, since write-once)

---

**Section 3 — Workspace Auth Connections**

- Helper: "Create and manage authentication connections that can be used across your workspace tools."
- `Add Auth` button → opens auth connection creation form
- **Types:** OAuth 2.0 | API Key | Bearer token | Basic auth
- **Relationship to Tools (Tab 6):** When creating a webhook tool, the "Authentication" dropdown shows all connections from this section. "Workspace has no auth connections" appears when this section is empty.
- List columns: Name | Auth type | Created at | `Test` | `...` (Delete)

---

**Section 4 — Post-Call Webhook**

- Helper: "Select the webhook that will be called when a conversation ends. Webhooks can be managed in the settings page."
- `Create Webhook` button → opens webhook configuration form
- **Purpose:** Workspace-wide default fired at the end of *every* conversation (CRM update, ticket creation, n8n automation, etc.)
- **Override hierarchy:** Agent-level post-call webhook (Tab 9) takes priority → workspace default fires as fallback
- Empty state: "No post-call webhook configured."
- When configured: shows masked URL + last delivery status + `Edit` + `Delete`

---

**Workspace vs Agent settings map (§17.7):**

| Setting | Workspace default (Settings) | Per-agent override (Tab) |
|---------|------------------------------|--------------------------|
| Initiation webhook | ✅ Section 1 | Tab 9 → Conversation Initiation Webhook |
| Post-call webhook | ✅ Section 4 | Tab 9 → Post-Call Webhook |
| Secrets | ✅ Section 2 | N/A — workspace-level only |
| Auth connections | ✅ Section 3 | N/A — workspace-level only |

---

**EXCEED ELEVENLABS — Settings additions:**

1. **Workspace-level PII redaction default:** Toggle: "Enable PII redaction for all new agents by default." When ON, every newly created agent starts with `pii_redaction_enabled = true`. BPO clients creating 50+ agents configure this once rather than per-agent. Stored in `tenants.settings_json.default_pii_redaction`.

2. **Secret usage indicator:** Each secret in Section 2 shows "Used by N tools" chip. Clicking opens a panel listing the tools by name. Prevents accidental deletion of secrets that are actively in use.

3. **Auth connection health check:** Each auth connection in Section 3 shows a `Test` button. On click → fires a test request with stored credentials → shows `✅ Valid` or `❌ Expired/Invalid`. OAuth2 connections show token expiry date. Surfaces expired tokens before they break live calls.

4. **Webhook delivery log:** Both webhook sections (1 and 4) show a "Recent deliveries" collapsible: last 10 deliveries with timestamp / HTTP status / response time. `Retry` button on failed deliveries. BPO clients can diagnose webhook failures without external tooling.

---

### 6.17 Live Dashboard (`/app/live`)

**Purpose:** Real-time contact centre operations view. Genesys-comparable wallboard.

**Header:**
- "Live Dashboard" title
- Auto-refresh indicator: `⟳ Live` (pulsing)
- Timestamp: "Last updated: 14:32:07"

**Top metrics strip:**

| Metric | Value | Trend |
|--------|-------|-------|
| Active Calls | 47 | ▲ +3 vs 1h ago |
| In Queue | 3 | ▼ -1 |
| Avg Wait Time | 12s | — |
| SLA Compliance | 94.2% | ▼ -1.4% |
| Abandonment Rate | 2.1% | ▲ |
| Avg Handle Time | 3m 42s | — |

**Agent Status Grid:**
Cards for every deployed agent showing:
- Agent name + type icon
- Status: 🟢 Live | 🟡 Paused | ⚫ Offline
- Active calls: `3 calls now`
- Partition: Cloud/On-Prem badge
- Today: calls count + avg duration + avg cost

**Live Calls Table (real-time, WebSocket):**
| CID | Agent | Duration | Caller | Channel | Status | Actions |
|-----|-------|----------|--------|---------|--------|---------|
- Actions: 👁 Monitor | 🎧 Whisper | 📞 Barge-in | ⤴ Transfer

**Queue Panel (right side):**
- Queue name
- Waiting count + avg wait time
- Oldest waiting: "3m 12s"
- SLA threshold indicator (turns red when breached)

**Purpose:** Search, filter, and review all conversations. CID-centric view (BRD-CC-007).

**Header:** "Conversations" + count badge + Export button

**Advanced filter bar:**
- CID search (exact or partial)
- Agent filter (multi-select)
- Date range picker
- Status: All | Completed | Abandoned | Transferred | Error
- Channel: Voice | Chat | Both
- Duration: Any | < 1min | 1–5min | 5–15min | > 15min
- Had handoff: Yes | No
- Cost range: sliders

**Conversations table:**
| CID | Agent | Started | Duration | Caller | Status | Cost | Handoff | Actions |
|-----|-------|---------|----------|--------|--------|------|---------|---------|
- CID in mono font, click to open conversation detail
- Actions: 🎧 Playback | ⭐ QM Review | 📋 Transcript

**Conversation Detail side sheet:**
Opens on row click — shows:
- CID (prominent, mono, copy button)
- Timeline: call_started → turns → tool_calls → handoff? → call_ended
- Transcript (message bubbles: AI left, Caller right)
- Metadata panel: agent name, partition, LLM model, STT/TTS providers, duration, cost breakdown
- Recording player (if recording exists)
- QM score (if scored)

---

### 6.12 MIS & Analytics (`/app/analytics`)

**Purpose:** Historical reporting and cost analysis. BRD §8.5.

**Header:** "Analytics & Reporting"
**Date filter:** Last 7 days | Last 30 days | Last 3 months | Custom

**Tab navigation:** Overview | Conversations | Cost Analysis | Agent Performance | Export

**Overview tab:**
- KPI cards: Total calls | Avg duration | Total cost | Resolution rate | Escalation rate | Avg CSAT
- Call volume over time (line chart, togglable granularity)
- Channel breakdown (pie: Voice vs Chat)
- Top agents by volume (bar chart)

**Cost Analysis tab:**
Table per day/week with columns: Date | Calls | LLM Cost | STT Cost | TTS Cost | Total Cost | Avg Cost/Call
Line chart: cost trend over selected period
Breakdown by LLM model (which models cost the most)
Breakdown by agent (which agents cost the most)

**Agent Performance tab:**
Table: Agent Name | Calls | Avg Duration | Resolution Rate | Escalation Rate | Avg Cost | QM Score Avg
Sortable by any column. Click row → agent-level analytics drill-down.

**Export tab:**
- Select: date range + metrics + format (CSV | PDF)
- Download button
- Scheduled exports: set up weekly/monthly email reports

---

### 6.13 Quality Management (`/app/qm`)

**Purpose:** QM scoring, review workflows, performance dashboards. BRD §8.6.

**Header:** "Quality Management"
**Tabs:** My Reviews | Assigned to Me | All Scores | Scorecards | Settings

**My Reviews tab:**
- Pending reviews table: Agent | CID | Duration | Date | Assigned to | Priority
- `Start Review` button per row → opens QM Review side sheet

**QM Review side sheet:**
- Recording player (with waveform, timeline markers for hold/transfer events)
- Transcript alongside recording (auto-scrolls)
- Scorecard (custom per tenant):
  - Section: Opening (0–20 pts)
  - Section: Product Knowledge (0–25 pts)
  - Section: Problem Resolution (0–25 pts)
  - Section: Communication (0–20 pts)
  - Section: Closing (0–10 pts)
  - Total: /100
- Annotation tools: add timestamped note | highlight transcript section
- Internal notes field
- Submit Review button

**All Scores tab:**
Table: Agent | Date | Score | Reviewer | Category scores | View

**Scorecards tab:**
Manage QM scorecard templates — create/edit scoring criteria.

---

### 6.14 Recordings (`/app/recordings`)

**Purpose:** Access, search, and manage call recordings. BRD §8.6.

**Header:** "Recordings" + storage usage bar (`2.3 GB of 50 GB used`)

**Filter bar:**
- Agent filter | Date range | Duration filter | Status: All | Reviewed | Pending | Flagged
- CID search

**Recordings table:**
| CID | Agent | Date | Duration | Status | Score | Actions |
|-----|-------|------|----------|--------|-------|---------|
- Actions: ▶ Play | ⭐ Review | 📋 Transcript | Download

**Recording Player modal:**
- Full-featured audio player
- Waveform visualisation
- Event markers on timeline: 🔇 Mute | ⏸ Hold | ⤴ Transfer | 🔧 Tool call
- Split view: player (left) + transcript (right, auto-scrolls with audio)
- QM score badge (if reviewed)

---

### 6.15 Users & Roles (`/app/settings/users`)

**Header:** "Users & Roles"
**Tabs:** Users | Roles | Invitations

**Users tab:**
Table: Name | Email | Role | Status | Last login | MFA | Actions (Edit | Deactivate | Reset password)
`+ Invite User` button (top-right) → invite dialog: email + role select + send invitation

**Roles tab:**
Table: Role name | Users count | Permissions summary | Actions (View | Duplicate | Edit — for custom roles)
System roles (cannot be deleted): Super Admin, Tenant Admin, Agent Admin, Supervisor, Operator, Auditor, Human Agent
`+ Create Custom Role` button → permissions matrix editor

**Invitations tab:**
Table: Email | Role | Invited by | Sent date | Status (Pending/Accepted/Expired) | Actions (Resend | Revoke)

---

### 6.16 Tenants (`/app/tenants`) — SUPER ADMIN ONLY

**Header:** "Tenants" + total count

**Tenants table:**
| Tenant Name | Plan | Agents | Users | Monthly Cost | Created | Status | Actions |
|------------|------|--------|-------|-------------|---------|--------|---------|
- Actions: View | Impersonate | Suspend | Settings

**Create Tenant button:** Opens tenant creation form:
- Org name, industry, country/timezone
- Plan tier (select)
- Admin user email (sends invitation)
- Initial resource limits

**Tenant Detail page:** Drill-down into specific tenant — shows all agents, users, usage, cost breakdown.

---

### 6.17 Audit Log (`/app/audit`)

**Header:** "Audit Log" — immutable, read-only notice banner

**Filter bar:**
- User filter | Action type | Resource type | Date range
- CID search (for conversation-level audit events)

**Log table:**
| Timestamp | User | Action | Resource | Before | After | IP Address |
|-----------|------|--------|----------|--------|-------|------------|
- Before/After columns: click to view JSON diff modal
- Export: CSV download

---

### 6.18 Billing & Usage (`/app/billing`)

**Tabs:** Current Usage | Invoices | Plans | Payment Methods

**Current Usage tab:**
- Current billing period with progress bar
- Usage breakdown: LLM calls + cost | STT minutes + cost | TTS characters + cost | Storage used
- Chart: daily spend over billing period

**Plans tab:**
Plan comparison table (Starter | Professional | Enterprise)

---

### 6.19 API Keys (`/app/api/api-keys`) — CO-BROWSING §18

**Platform context:** ElevenAPI section (accessed via platform switcher or sidebar Configure → API Keys)  
**URL:** `/app/api/api-keys`  
**Page title (H1):** "API Keys"  
**Top-right links:** `API Pricing ↗` | `Documentation ↗`  
**Purpose:** Create and manage API keys for programmatic access to the TRUSTNOW Platform API.

---

**Empty state:**
- 3 capability icons (TTS / STT / AI Agents)
- Helper: "An API key lets you connect to our API and use its features. You can create multiple keys with different access levels."
- `+ Create Key` (primary black)

**Populated table:**

| Column | Notes |
|--------|-------|
| **Name** | Key name (e.g. "CRM Connector") |
| **Key** | Masked: `sk-tn_ab••••••••••` (prefix shown, rest hidden) |
| **Created** | Date |
| **Last used** | Relative timestamp or "Never" |
| **Actions** | `...` → Edit / Revoke |

---

**"Create API Key" modal (confirmed §18.3):**

```
🔑  Create API Key

    Name    [Venerated Persian Leopard    ]   ← auto-generated, editable

    Restrict Key  [ON 🔵]   ← default ON — enables granular permissions below

    Credit Limit → Monthly   [Unlimited ▾]

    ─── Permissions (shown when Restrict Key = ON) ─────────────

    Core API
    Text to Speech          [No Access] [Access]
    Speech to Speech        [No Access] [Access]
    Speech to Text          [No Access] [Access]

    TRUSTNOW Platform
    Agents                  [No Access] [Read] [Write]
    Conversations           [No Access] [Read] [Write]
    Phone Numbers           [No Access] [Read] [Write]
    Batch Calls             [No Access] [Read] [Write]
    WhatsApp                [No Access] [Read] [Write]
    Knowledge Base          [No Access] [Read] [Write]
    Tools                   [No Access] [Read] [Write]
    Tests                   [No Access] [Read] [Write]
    Voices                  [No Access] [Read] [Write]

    Administration
    Workspace               [No Access] [Read] [Write]
    Analytics               [No Access] [Access]
    ────────────────────────────────────────────────────────────

    [Cancel]                                     [Create Key]
```

**"Restrict Key" toggle — default ON:**
- ON → permissions matrix shown — granular per-endpoint control
- OFF → full unrestricted access to all endpoints (not recommended for production integrations)

**Credit Limit dropdown:** Unlimited (default) | Custom amount (in credits per month)

**On "Create Key" → key reveal modal:**
```
🔑  Your API Key

    sk-tn_abcd1234efgh5678ijkl9012mnop3456

    ⚠ Save this key now. It will not be shown again.

    [📋 Copy]                              [Done]
```

---

**EXCEED ELEVENLABS — API Keys additions:**

1. **Key usage dashboard:** Each key row shows "N calls this month" chip. Clicking opens a usage detail panel: calls per day sparkline / top endpoints / avg latency. BPO clients monitor API key usage to detect unexpected calls (e.g. a key being used beyond its intended CRM integration).

2. **Key rotation wizard:** "Rotate key" action in overflow → generates new key, shows it once, old key continues working for a configurable grace period (default 24h). Grace period countdown shown: "Old key expires in 23h 45m." After expiry: old key auto-revokes. Zero-downtime key rotation.

3. **IP restriction per key:** Optional "Restrict to IPs" field in Create/Edit modal — accepts one or more CIDR ranges. Key requests from outside these ranges return HTTP 403. BPO clients with on-premise CRM systems restrict keys to corporate IP ranges.

---

### 6.20 Account & Organisation Settings (`/app/settings`)

**Purpose:** Organisation-level account settings (distinct from the ElevenAgents workspace settings in §6.16).

**Tabs:** General | Security | Notifications | API Keys (legacy — use §6.19 dedicated page)

**General tab:**
- Organisation name
- Timezone
- Date/time format
- Default language
- Logo upload (tenant branding)

**Security tab:**
- MFA policy: Optional | Required for all users | Required for admins only
- Session timeout (minutes)
- Password policy settings
- IP allowlist

---

### 6.21 Webhooks (`/app/api/webhooks`) — CO-BROWSING §19

**Platform context:** ElevenAPI → Configure → Webhooks  
**URL:** `/app/api/webhooks`  
**Page title (H1):** "Webhooks"  
**Top-right links:** `API Pricing ↗` | `Documentation ↗`  
**Purpose:** Subscribe TRUSTNOW to fire outbound callbacks to your systems when platform-level events occur.

**Distinction from conversation webhooks:** This is NOT the post-call or initiation webhook (those are configured in §6.16 Settings and Tab 9 Security). These are platform infrastructure events.

---

**Empty state:**
- 3 event-flow icons (event → webhook → delivery)
- Helper: "Create and manage webhooks to receive real-time callbacks from TRUSTNOW to your external systems. **Learn more**"
- `+ Add endpoint` (primary black)

**Populated table:**

| Column | Notes |
|--------|-------|
| **Endpoint URL** | Masked to domain: `https://api.yourcrm.com/...` |
| **Events** | Subscribed events as chips: `voice.removal` `batch_call.completed` |
| **Last delivery** | Status + time: `200 OK — 2m ago` or `❌ 503 — 4h ago` |
| **Status** | `Active` (green) / `Inactive` |
| **Actions** | `...` → Edit / Rotate secret / Delete |

---

**"Add endpoint" modal (confirmed §19.3):**

```
  Add endpoint

  Endpoint URL     [https://...                           ]   ← required

  Description      [An optional description...            ]
                   [                                      ]

  Select events to listen to:

  ☐  Voice removal notice
     Occurs when a voice in use is scheduled for removal.

  ☐  Transcription completed
     Occurs when a speech-to-text transcription finishes and
     the request includes the webhook parameter.

  ─── TRUSTNOW extensions ──────────────────────────────────
  ☐  Agent published
  ☐  Agent error
  ☐  Batch call completed
  ☐  Batch call failed
  ☐  Knowledge base indexed

  ─── Security ────────────────────────────────────────────
  All webhook payloads are signed using HMAC with your shared
  secret. Use it to verify the X-TRUSTNOW-Signature header
  in incoming requests. Learn more

  [Cancel]                              [Add endpoint]
```

`Add endpoint` button greyed until URL filled + at least one event checked.

---

**Secret reveal on creation (one-time):**
```
  Endpoint added

  Your HMAC signing secret:
  a1b2c3d4e5f6...

  ⚠ Save this secret now. It will not be shown again.

  [📋 Copy]                             [Done]
```

---

**EXCEED ELEVENLABS — Webhooks additions:**

1. **Delivery log:** Each endpoint row shows last delivery status. Clicking opens a delivery log panel: last 20 deliveries with timestamp / event type / HTTP status / response time / `▶ Retry` button on failed deliveries. ElevenLabs has no delivery visibility.

2. **7 TRUSTNOW-specific events** (agent.published, agent.error, batch_call.completed, batch_call.failed, knowledge_base.indexed) beyond ElevenLabs' 2 basic events. BPO clients connect TRUSTNOW to CI/CD pipelines, alerting systems, and CRM platforms that need rich event coverage.

3. **Event filter expressions:** Optional `Filter` field per subscription: JSONPath expression to filter which specific occurrences fire. Example: `$.data.agent_id == "agent_xxx"` — only fires `agent.error` events for one specific agent. Prevents webhook flood when many agents are deployed across a large BPO operation.

---

### 6.22 Environment Variables (`/app/api/environment-variables`) — CO-BROWSING §20

**Platform context:** ElevenAPI → Configure → Environment Variables  
**URL:** `/app/api/environment-variables`  
**Page title (H1):** "Environment Variables"  
**Top-right links:** `API Pricing ↗` | `Documentation ↗`  
**Purpose:** Define configuration values once by name, assign different values per environment (production/staging/development). Agents reference them as `{{env.VARIABLE_NAME}}` — automatically get the correct value for their environment.

---

**Empty state:**
- 3 flow icons (same pattern as API Keys and Webhooks pages)
- Helper: "Create and manage environment variables to configure your agents across different environments."
- `+ Add variable` (primary black)

**Populated table:**

| Column | Notes |
|--------|-------|
| **Name** | `MY_API_URL` |
| **Type** | `String` / `Number` / `Boolean` |
| **Environments** | "3 configured" (count of env-specific values set) |
| **Last updated** | Relative timestamp |
| **Actions** | `...` → Edit / Delete |

---

**"New variable" modal (confirmed §20.3):**

```
  New variable

  Name     [e.g. my_api_url                ]   ← snake_case convention

  Type     [String ▾]

  Values
  ─────────────────────────────────────────────
  Other environments will fall back to the
  production value when no override is set.

  [ production   ] [ Value                 ]   ← always shown, canonical default
  [ staging      ] [ Value                 ]   ← added via + Add
  [ development  ] [ Value                 ]   ← added via + Add
                    + Add

  [Close]                              [Save]
```

- `Save` greyed until Name + at least one value filled
- `+ Add` adds a new environment row with a custom environment name input on the left
- Production row is always present (cannot be removed — it is the fallback)

---

**Edit variable (same modal — pre-populated):**
- Existing values shown per environment
- Add new environments, change values
- Cannot rename a variable that is in use (shows warning)
- `Save` button updates values

---

**Variable reference syntax (§20.7 — displayed as a help banner on the page):**

| Syntax | Resolved from | When |
|--------|--------------|------|
| `{{env.NAME}}` | Environment Variables (this page) | Conversation start |
| `{{variable_name}}` | Call initiation params | Call start |
| `{{secret.NAME}}` | Workspace Secrets (§6.16) | Tool execution |
| `{{system__caller_id}}` | Platform auto-inject | Call start |

**Usage contexts:** System prompt → Tool webhook URLs → Tool headers → MCP server URL → First message

---

**EXCEED ELEVENLABS — Environment Variables additions:**

1. **Custom environment names:** Beyond production/staging/development, BPO clients create named environments per client deployment: `client_a_prod`, `client_b_uat`. Free-form environment name input in the `+ Add` row. ElevenLabs only supports 3 fixed environment names.

2. **`Where used` scanner:** Each variable row has a `Where used` button → scans all agents, tools, and MCP servers for `{{env.VAR_NAME}}` and returns a list: "Used in Agent X (system prompt), Tool Y (URL), Agent Z (first message)." Prevents accidental deletion.

3. **Bulk export/import:** `⬇ Export all` button → downloads all variables + values as JSON. `⬆ Import` → upload JSON to replicate variable set across workspaces. BPO clients maintaining prod/staging TRUSTNOW instances need to sync variable sets without manual re-entry.

---

### 6.23 Text to Speech (`/app/speech-synthesis/text-to-speech`) — CO-BROWSING §21

**Platform context:** ElevenCreative (orange dot 🟠) → Pinned → Text to Speech  
**URL:** `/app/speech-synthesis/text-to-speech`  
**Purpose:** Standalone async TTS generation tool — for IVR prompts, on-hold messages, bulk voice-overs. **Not** the realtime agent TTS pipeline.

---

**Page layout:** Two columns — left text canvas (~65%) + right settings panel (~35%)

**Bottom bar (always visible):**
- 🔄 `296,637 credits remaining` (left — live credit counter)
- `56 / 5,000` characters (current / max per generation)
- `Generate speech` button (primary black, right) — shortcut: **Ctrl+Enter**

---

**Left panel — Text canvas:**
- Placeholder: "Start typing here or paste any text you want to turn into lifelike speech..."
- **8 starter prompt chips (§21.3):**

| # | Chip |
|---|------|
| 1 | 📖 Narrate a story |
| 2 | 😄 Tell a silly joke |
| 3 | 🎙️ Record an advertisement |
| 4 | 🌐 Speak in different languages |
| 5 | 🎬 Direct a dramatic movie scene |
| 6 | 🎮 Hear from a video game character |
| 7 | 🎧 Introduce your podcast |
| 8 | 🧘 Guide a meditation class |

Clicking a chip inserts a sample text into the canvas.

---

**Right panel — Settings tab (confirmed §21.4):**

Sub-tabs: `Settings` (active) | `History`

| Control | Type | Default | Notes |
|---------|------|---------|-------|
| **Voice** | Button + `>` chevron | Roger - Laid-Back, Casual, Resonant | Opens Voice Library selector |
| **Model** | Button + `>` chevron | Eleven Multilingual v2 | Gradient border. `Try Eleven v3` upsell CTA |
| **Speed** | Slider | 1.0x | Slower ←→ Faster |
| **Stability** | Slider | ~0.5 | More variable ←→ More stable |
| **Similarity** | Slider | ~0.75 | Low ←→ High |
| **Style Exaggeration** | Slider | 0 (None) | None ←→ Exaggerated |
| **Language Override** | Toggle | OFF | When ON: forces specific language |
| **Output Format** | Dropdown | MP3 (128kbps) | MP3 / PCM / FLAC / OGG variants |
| **Speaker boost** | Toggle | **ON 🔵** | Enhances voice similarity (extra credits) |
| **Reset values** | Ghost button + 🔄 | — | Resets all sliders to defaults |

---

**Right panel — History tab (§21.5):**
- List of previously generated audio for this workspace
- Each entry: text snippet | voice name | date | ▶ Play | ⬇ Download

---

**EXCEED ELEVENLABS — TTS additions:**

1. **IVR prompt builder:** A structured mode (toggle: "IVR Mode") converts the text canvas into a prompt builder: menu items (key + description), greeting, on-hold message, error message. Output format is automatically set to G711 μ-law 8kHz (SIP-ready) or WAV (IP PBX). ElevenLabs generates generic MP3 only.

2. **Bulk generation:** `+ Add row` button adds multiple text rows. Each row has its own filename. `Generate all` → generates every row and delivers as a ZIP. BPO clients generating hundreds of IVR prompt variations need this — one at a time is impractical.

3. **Bulk generation:** `+ Add row` button adds multiple text rows. Each row has its own filename. `Generate all` → generates every row and delivers as a ZIP. BPO clients generating hundreds of IVR prompt variations need this — one at a time is impractical.

3. **Agent voice preview shortcut:** From agent Tab 1 (Voices panel), a `▶ Preview voice` button appears. Generates a 5-second TTS sample using the current voice + first 200 chars of system prompt. Saves one click to the standalone TTS tool for voice quality checking before publish.

---

### 6.24 Speech to Text (`/app/speech-to-text`) — CO-BROWSING §22

**Platform context:** ElevenCreative → Pinned → Speech to Text  
**URL:** `/app/speech-to-text`  
**Page title (H1):** "Speech to text"  
**Sub-title:** "Transcribe audio and video files with our **industry-leading ASR model**." (linked)  
**Purpose:** Standalone async transcription tool — for meeting recordings, uploaded call files, bulk audio processing. **Not** the realtime conversation STT pipeline.

---

**Promo banner (Scribe Realtime v2):**
- Dark video thumbnail + "Try Scribe Realtime v2" + "Experience lightning fast transcription with unmatched accuracy, across 92 languages."
- `Try the demo` CTA (ghost button, right-aligned)

**Search bar:** "Search transcripts..."

**Transcripts table:**

| Column | Notes |
|--------|-------|
| **Title** | Transcript name (editable via rename) |
| **Created at** | Relative timestamp |
| `...` | Overflow → Rename / Export / Delete |

---

**"Transcribe files" modal — 3 source tabs (confirmed §22.4):**

```
[ Upload ]  [ YouTube ]  [ URL ]
```

**Tab 1 — Upload (default):**
- Drop zone: "Click or drag files here to upload — Audio & video files, up to **1000MB**"
- `↑ Upload files` button (greyed until file added)

**Tab 2 — YouTube:**
- URL input: `https://www.youtube.com/watch?v=...`
- `↑ Transcribe` button

**Tab 3 — URL:**
- URL input: `Audio/video file URL` (any publicly accessible media)
- `↑ Transcribe` button

**All 3 tabs share the same 5 options (confirmed §22.5):**

| Option | Type | Default | Notes |
|--------|------|---------|-------|
| **Primary language** | Dropdown | **Detect** | Auto-detect; override for better accuracy |
| **Tag audio events** | Toggle | **ON 🔵** | Labels `[applause]` `[music]` `[laughter]` inline |
| **Include subtitles** | Toggle | OFF | Generates SRT timestamps alongside text |
| **No verbatim** | Toggle | OFF | When ON: removes "um", "uh", false starts |
| **Keyterms** | Multi-value input | Empty | Vocabulary hints for domain terms e.g. `TRUSTNOW`, `BPO` |

---

**Transcript detail view (click row):**
- Full text transcript with speaker labels (diarised: Speaker 1 / Speaker 2)
- Timestamp markers per segment (word-level timestamps)
- Audio waveform player synced to transcript (if source was audio/video file)
- Export options: TXT / PDF / DOCX / SRT / JSON
- Editing: click any text to correct transcription errors inline

---

**EXCEED ELEVENLABS — Speech to Text additions:**

1. **Speaker diarization always ON:** TRUSTNOW always labels who said what (Speaker 1: "..." / Speaker 2: "..."). Essential for call recording QA where agent speech must be separated from caller speech. ElevenLabs makes diarisation an optional extra.

2. **Auto-transcribe call recordings:** Toggle in Tab 10 Advanced → Privacy: "Auto-transcribe completed call recordings." When ON, every recording is automatically submitted for transcription and linked to its conversation record (searchable from the Analysis tab). ElevenLabs has no auto-transcribe pipeline.

3. **PII redaction on transcripts:** When enabled on the agent, the same PII patterns apply to transcripts before storage. Shown as `[PHONE_NUMBER]`, `[CARD_NUMBER]` in the transcript view. Download the redacted version for compliance sharing.

4. **Full-text search across transcripts:** The search bar on the main page searches transcript content (not just titles). `Search transcripts...` with real phrase matching: "find all transcripts mentioning 'payment arrangement'" — BPO compliance teams use this for audit evidence and quality review.

---

## 7. HUMAN AGENT DESKTOP (`/agent-desktop/`)

The Human Agent Desktop is a standalone full-screen application separate from the Platform Admin Console. Human agents use this all day on the production floor. Supervisors access it with additional monitoring privileges.

### 7.1 Layout

**Full-screen, 3-panel layout:**

```
┌─────────────────────────────────────────────────────────┐
│  TOP BAR: Status | Queue | Stats | Clock | Profile      │
├──────────┬──────────────────────────────┬───────────────┤
│          │                              │               │
│  QUEUE   │    CONVERSATION WORKSPACE    │   CONTEXT     │
│  PANEL   │                              │   PANEL       │
│  (240px) │        (flexible)            │   (320px)     │
│          │                              │               │
└──────────┴──────────────────────────────┴───────────────┘
```

---

### 7.2 Top Bar

Left zone:
- TRUSTNOW logo (small)
- Agent name
- Status selector: `🟢 Available` | `🟡 Busy` | `☕ Break` | `📝 Wrap-up` | `⚫ Offline`
  - Changes reflect immediately in live dashboard

Centre zone:
- Current call info (when on call): `● 04:32 | CID: a3f9b2c1 | Acme Corp | Billing`
- Idle state: "No active call"

Right zone:
- Queue count: `↓ 3 waiting`
- Today's stats: `24 handled | 3m 42s avg | 94% CSAT`
- Clock: `14:32:07 IST`
- Notifications bell
- Avatar dropdown: Profile | Settings | Sign out

---

### 7.3 Queue Panel (Left, 240px)

**My Queues section:**
Each queue shows: queue name, waiting count, oldest wait time, SLA indicator

**Interaction list:**
- Waiting interactions listed with:
  - Channel icon (voice/chat)
  - Caller/customer name (if known) or masked ANI
  - Queue name
  - Wait time (live counter, turns red at SLA threshold)
  - Priority indicator
- Click to accept → moves to Conversation Workspace

**Hold/parked calls:**
- Separate section for calls on hold
- Each shows: caller, hold duration, return button

---

### 7.4 Conversation Workspace (Centre)

**When idle:**
- "Ready for the next interaction" illustration
- Current status indicator
- Quick actions: Start outbound call | Review last interaction

**When call connected:**

*Call controls bar (top of workspace):*
```
[● 04:32]  [🔇 Mute]  [⏸ Hold]  [🔀 Transfer]  [📞 Conference]  [📋 Wrap-up]  [🔴 End Call]
```

*Transcript panel (scrollable, real-time):*
```
[AI Handoff — 14:28:32] Context: Billing dispute, authenticated via PIN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Caller                          14:28:32
  "I've been overcharged on my last bill..."

  AI Agent                        14:28:35
  "I understand your concern about the billing
  discrepancy. Let me transfer you to a billing
  specialist who can resolve this immediately."

  ── HANDOFF TO HUMAN AGENT ──────────────

  You                             14:28:41
  "Hi, I'm Sarah from the billing team..."
```

*Quick responses panel (below transcript):*
- Canned responses library (searchable)
- Custom typing area
- Emoji + attachment icons (for chat channel)

**Transfer dialog:**
- Transfer to: Queue select | Specific agent | External number
- Transfer type: Blind | Supervised (warm)
- Notes to transferee (pre-filled with AI summary)
- CID auto-included in transfer

---

### 7.5 Context Panel (Right, 320px)

**Tabs: Caller Info | Interaction History | Notes | KB Search**

**Caller Info tab:**
```
Name: John Smith (verified)
ANI: +61 4•• ••• 321
Account: ACM-001234
Status: Premium Customer
Auth: ✅ PIN verified
CID: a3f9b2c1...

── AI SUMMARY ────────────────────
Billing dispute: Invoice #INV-2847
Overcharge: $42.00 on data add-on
Prior contacts: 2 (last: 7 days ago)
Sentiment: Frustrated → Neutral
```

**Interaction History tab:**
Last 10 interactions for this caller:
- Date | Channel | Agent | Duration | Summary (1 line) | View button

**Notes tab:**
- Rich text notes editor
- Auto-saved
- Visible to next agent who handles this caller
- Disposition code selector (post-call wrap-up)

**KB Search tab:**
- Search box (searches current agent's KB)
- Results shown as expandable snippets
- Useful for real-time knowledge lookup during call

---

### 7.6 Supervisor View (Additional features for Supervisor role)

**Top bar additions:**
- `Team Monitoring` button → opens Team Monitor side panel

**Team Monitor panel (replaces Queue panel for Supervisors):**
- Grid of all agents in team showing real-time:
  - Name + avatar
  - Status badge
  - Current call CID (if active)
  - Call duration
  - Today's stats
  - Action buttons: 👁 Listen | 🎧 Whisper | 📞 Barge-in

**Barge-in / Whisper:**
- Whisper: Supervisor speaks; only agent hears (not caller)
- Barge-in: Supervisor joins conference; all three parties hear

**Wallboard view:** Full-screen mode showing team metrics for large displays

---

## 8. NAVIGATION FLOWS — KEY JOURNEYS

### 8.1 Create and Publish an AI Agent (Agent Admin)

1. `/app/agents` → `+ Create Agent`
2. Select agent type: Conversational | Tools-Assisted | Autonomous
3. Redirected to `/app/agents/new` — Tab 1 auto-focused
4. Configure: system prompt → partition → LLM → voice → language
5. Tab 4: Add KB documents (optional)
6. Tab 6: Add tools (if Tools-Assisted or Autonomous)
7. Tab 9: Configure auth policy (if Autonomous)
8. Tab 8: Configure widget (if web deployment)
9. Tab 7: Run quick test
10. Click `Publish` → confirmation dialog: "This will make the agent live. Continue?" → Confirm
11. Agent status changes to `Live` → toast: "Agent published successfully"
12. Widget embed code available on Tab 8

---

### 8.2 Monitor a Live Call and Barge-In (Supervisor)

1. `/app/live` — Live Dashboard
2. Spot call with high duration or SLA warning
3. Click `👁 Monitor` → opens listen-only mode (no barge-in, caller unaware)
4. Decide to intervene → click `📞 Barge-in`
5. Confirmation dialog: "You will join this call as a conference participant. The caller will hear you."
6. Confirm → joined to call
7. After intervention → `Leave call` (caller and agent continue)

---

### 8.3 Review a Recording and Submit QM Score (Supervisor/Auditor)

1. `/app/recordings` → filter by agent/date
2. Click recording row → Recording Player modal opens
3. Play recording + read transcript
4. Click `⭐ Submit QM Review`
5. QM scorecard opens alongside player
6. Score each section, add timestamped annotations
7. Add internal notes
8. Click `Submit Review` → score saved, appears in QM dashboard

---

### 8.4 Invite a New User (Tenant Admin)

1. `/app/settings/users` → `+ Invite User`
2. Enter email + select role
3. (Optional) Select specific agents this user can manage
4. Click `Send Invitation`
5. Invitee receives email with link → signs up → lands in onboarding wizard
6. On completion → access granted as configured role

---

### 8.5 Human Agent — Receive and Handle a Transferred Call

1. Agent logged in at `/agent-desktop/` — status: Available
2. Incoming call notification (banner + audio ring)
3. Queue panel highlights incoming call with caller info
4. Agent clicks `Accept` (or auto-accepts based on settings)
5. Conversation Workspace activates: call timer starts, AI handoff summary appears instantly
6. Agent reviews context panel (caller info + AI conversation summary)
7. Handles interaction using transcript, canned responses, KB search
8. Transfers or ends call
9. Enters wrap-up code → status returns to Available

---

## 9. RESPONSIVE & ACCESSIBILITY

### 9.1 Responsive Behaviour

| Screen | Platform Admin | Human Agent Desktop |
|--------|---------------|-------------------|
| Desktop (1280px+) | Full sidebar + content | Full 3-panel layout |
| Laptop (1024px) | Collapsed sidebar default | Panels adjustable |
| Tablet (768px) | Not supported (show "use desktop" message) | Not supported |
| Mobile | Not supported | Not supported |

**Widget** (`<trustnow-agent>`) — fully responsive:
- Mobile (< 640px): Full-screen modal mode
- Tablet/Desktop: Floating widget, configurable size

### 9.2 Accessibility Targets
- WCAG 2.1 AA compliance minimum
- All interactive elements keyboard-navigable
- ARIA labels on all icon-only buttons
- Screen reader support for transcript updates (live region)
- Minimum contrast ratio: 4.5:1 for all text
- Focus indicator visible on all interactive elements (cyan outline)
- No information conveyed by colour alone (always use icon + colour together)

---

## 10. EMPTY STATES

Every list page must have a designed empty state:

| Page | Empty state content |
|------|-------------------|
| Agent List | Illustration (robot) + "Create your first AI Agent" CTA |
| Voice Library — My Voices | Illustration (microphone) + "Upload your first custom voice" CTA |
| Knowledge Base | Illustration (book) + "Add your first document" CTA |
| Recordings | Illustration (waveform) + "No recordings yet — they'll appear here after your first call" |
| Conversations | Illustration (chat) + "No conversations yet" + date filter hint |
| Live Calls | Illustration (phone) + "No active calls right now" + pulse animation |
| Queue | Illustration + "Queue is empty — all caught up!" |

---

## 11. ERROR STATES

| Error | Display |
|-------|---------|
| API error (500) | Full-page error card + "Try again" button + support link |
| Network lost | Top banner: "Connection lost — reconnecting..." (orange, auto-dismisses on reconnect) |
| Session expired | Modal: "Your session has expired. Please sign in again." → redirect to login |
| Access denied (403) | Inline: "You don't have permission to view this. Contact your admin." |
| Not found (404) | Full-page: "This page doesn't exist" + Back to Dashboard button |
| Vault/config missing | Yellow banner on affected feature: "Configuration required — see Settings" |

---

## 12. NOTIFICATIONS SYSTEM

### Types
| Type | Trigger | Display |
|------|---------|---------|
| SLA breach | Call exceeds SLA threshold | Red toast + bell badge |
| Agent error | AI pipeline error on active call | Orange toast |
| Handoff triggered | AI transferred call to queue | Cyan toast |
| New user joined | Invitation accepted | Green toast |
| Agent published | Successful publish | Green toast |
| Recording ready | Post-call recording processed | Silent bell badge |
| KB indexed | Document indexing complete | Silent bell badge |

### Notification Bell panel:
- Max 50 unread notifications shown
- Mark all read button
- Click notification → navigates to relevant page

---

## 13. ONWARD REFERENCE FOR TASK 15 (LANDING PAGE)

The landing page implementation (Task 15) must use this exact copy and layout per BRD §10:

**Hero heading:** `TRUSTNOW AI WORKER STACK`
**Sub-heading:** `Multi-tenant. Enterprise Grade. AI Agents aligned to client organisation structure. Policy driven. Audited. Governed. Fully Autonomous and handoff to human when required.`

**Three pillars (exact text):**
1. Conversational AI Agents
2. Tools Enabled AI Agent Orchestration
3. Fully Autonomous AI Workers

**Nav items (exact):** `AI Agents` · `Enterprise Integration` · `Resources` · `Contact us`

**CTA buttons:** `Login` (red fill) | `Signup` (red fill) — top right header

**Colour:** Background `#1A0A4C`

---

*UI-SPEC-001.md v2.2 — Complete Platform UI/UX Specification — Co-Browse Confirmed 28 Mar 2026*
*TRUSTNOW CONFIDENTIAL — March 2026*
*Cross-reference: FULL-SCOPE-BRD.md §8.3–8.6 + §10 | ARCH-001.md L5 module definitions | FULL-SCOPE-IMPL-001.md Tasks 8, 12, 13, 14, 15*
