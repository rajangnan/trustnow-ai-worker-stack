# UI-SPEC-001.md — TRUSTNOW Autonomous AI Stack
## Platform UI/UX Specification — All Screens, All Roles, All Flows
### Document ID: UI-SPEC-001 v1.0 | March 2026
### Reference: BRD-1 v1.1, Genesys Cloud CX (UI pattern reference)
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

### 6.3A — "+ New Agent" Creation Wizard (COMPLETE FLOW — observed live from ElevenLabs co-browsing)

**Trigger:** "+ New agent" button on Agent List page → opens full-screen modal/overlay with 5-step progress dots at bottom.

**CRITICAL design principle:** Every step auto-advances immediately on selection (no explicit "Next" button on steps 1–2). Steps 3–4 have explicit Back / Skip / Continue / Create Agent navigation. The wizard generates a complete agent config (system prompt, voice, LLM, first message) automatically from the selections — the user never writes a system prompt manually during creation.

---

#### STEP 1 — Agent Type Selection

**Title:** "New agent"
**Sub-title:** "What type of agent would you like to create?"
**Progress:** Dot 1 of 5

**Three options:**

| Option | Layout | Description |
|--------|--------|-------------|
| **Blank Agent** | Full-width button row with radio circle icon | Empty canvas — no pre-configuration |
| **Personal Assistant** | Card with chat preview bubble | Pre-configured for personal task assistance |
| **Business Agent** | Card with chat preview bubble + **"Improved"** green badge | AI-generated setup for business use cases — picks industry, use case, and auto-writes system prompt |

**Card preview bubbles** show sample conversation snippets so the user understands what each option does before selecting.

**TRUSTNOW equivalent:** Replace the 3 ElevenLabs options with TRUSTNOW's 3 agent types:

| TRUSTNOW Option | Description | Post-selection |
|-----------------|-------------|----------------|
| **Conversational AI Agent** | Voice/chat agent for customer interactions | → Wizard steps 2–5 |
| **Tools-Assisted Agent** | Agent with webhook/tool/CRM integration | → Wizard steps 2–5 + extra Tools step |
| **Autonomous AI Worker** | Multi-step orchestration with SME delegation | → Wizard steps 2–5 + Workflow step |

---

#### STEP 2 — Industry Selection

**Title:** "What industry is your business in?"
**Sub-title:** "Select the industry that best describes your business"
**Progress:** Dot 2 of 5
**Behaviour:** Auto-advances immediately on selection. Selected card shows dark rounded border.

**17 industries in a 3-column grid (each with a line icon):**

| # | Industry | Icon |
|---|----------|------|
| 1 | Retail & E-commerce | Shopping bag |
| 2 | Healthcare & Medical | Medical cross/stethoscope |
| 3 | Finance & Banking | Bank/columns building |
| 4 | Real Estate | House |
| 5 | Education & Training | Graduation cap |
| 6 | Hospitality & Travel | Suitcase |
| 7 | Automotive | Car |
| 8 | Professional Services | Briefcase |
| 9 | Technology & Software | Circuit/chip |
| 10 | Government & Public | Government building/pillar |
| 11 | Food & Beverage | Fork & knife |
| 12 | Manufacturing | Factory |
| 13 | Fitness & Wellness | Heart |
| 14 | Legal Services | Scales of justice |
| 15 | Non-Profit | People/community |
| 16 | Media & Entertainment | Play button/film |
| 17 | Other | Question mark circle |

**Backend requirement:** Store `industry` on the agent record. Used for: system prompt personalisation, default voice selection, default KB template, MIS industry-segment reporting.

---

#### STEP 3A — Use Case Selection

**Title:** "Use case"
**Sub-title:** "What will your agent help with?"
**Progress:** Dot 3 of 5 (part A)
**Behaviour:** Auto-advances immediately on selection.

**Use cases are dynamic per industry.** Full mapping observed live for Healthcare & Medical:

| Healthcare & Medical Use Cases | Icon |
|-------------------------------|------|
| Customer Support | Headset |
| Outbound Sales | Arrow trending up |
| Learning and Development | Book |
| Scheduling | Calendar |
| Lead Qualification | People group |
| Answering Service | Phone |
| Appointment Scheduling | Calendar with check |
| Patient Intake | Clipboard |
| Symptom Guidance | Heart/health |
| Insurance Verification | Shield |
| Prescription Reminders | Clock/pill |
| Telehealth Support | Phone with medical cross |
| Other | Question mark |

**TRUSTNOW use case catalogue per industry** — must be seeded in the database. Every industry × use case combination produces a unique system prompt template. Store as `agent_templates` table.

**Backend requirement:** `agent_templates` table:
```sql
CREATE TABLE agent_templates (
  template_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_type VARCHAR(30) NOT NULL,  -- conversational|tools_assisted|autonomous
  industry VARCHAR(50) NOT NULL,
  use_case VARCHAR(80) NOT NULL,
  system_prompt_template TEXT NOT NULL,  -- with {{placeholders}}
  first_message_template TEXT NOT NULL,
  suggested_voice_id UUID REFERENCES voices(voice_id),
  suggested_llm_model_id UUID REFERENCES llm_models(model_id),
  suggested_tools TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

#### STEP 3B — Ground Your Agent (KB Step)

**Title:** "Ground your agent"
**Sub-title:** "Add tools and knowledge base documents to ground your agent's responses"
**Progress:** Dot 4 of 5
**Navigation:** Back | **Skip** | **Continue**

**Layout:**
- Single row: 📖 "Knowledge Base" label + **"+ Add"** button (right-aligned)
- On **"+ Add"** click → dropdown expands inline:
  - Search bar: "Search documents..." (searches existing KB docs in tenant)
  - Filter chips: `+ Type` | `+ Creator`
  - Existing KB docs listed with icons (T = text, 📁 = folder, 🌐 = URL crawl)
  - Bottom action bar with 3 options:
    - **"+ Add URL"** — crawl a website URL
    - **"Add Files"** — upload PDF/DOCX/TXT/CSV
    - **"Create Text"** — write inline text document
- Selected docs appear as tags/chips below the row
- "Skip" proceeds without any KB attached (agent can still be created — KB attached later)

**Key ElevenLabs behaviour:** When "+ Add URL" is entered on the COMPLETE step (Step 4), ElevenLabs auto-crawls the website and adds the content to the KB and uses it to personalise the system prompt. TRUSTNOW should replicate this.

---

#### STEP 4 — Complete Your Agent (Final Step)

**Title:** "Complete your agent"
**Sub-title:** "Name your agent, describe its goal, and optionally add your website"
**Progress:** Dot 5 of 5
**Navigation:** Back | **Create Agent** (primary black button — disabled until required fields filled)

**Fields:**

| Field | Required | Type | Details |
|-------|----------|------|---------|
| **Agent Name** | ✅ Yes | Text input | Max 50 chars, shows live counter "X/50" |
| **Website** | Optional | URL input | Placeholder: "https://yourwebsite.com" · Helper: "We'll only access publicly available information from your website to personalise your agent." — **ElevenLabs auto-crawls this URL, adds to KB, and uses it to write a better system prompt** |
| **Main Goal** | ✅ Yes | Large textarea | Placeholder: "Describe what you want your agent to accomplish..." · Free text — the LLM uses this to generate the full system prompt |
| **Chat only** | Optional | Toggle (off default) | "Audio will not be processed and only text will be used" — activates text-only mode |

**"Create Agent" button states:**
- Disabled (greyed) — until Agent Name + Main Goal are both filled
- Enabled (primary black) — both required fields filled
- Loading spinner — during agent creation (~2–4 seconds while AI generates system prompt)

**What happens on "Create Agent":**
The platform calls an AI generation API with: `{industry, use_case, main_goal, website_content (if URL provided), template}` → generates:
- Complete system prompt (2000–5000 chars)
- First message
- Suggested voice (matched to industry/use case)
- Suggested LLM model
- Agent name

The user **lands directly on the full 10-tab Agent configuration page** with everything pre-populated. They can then review, adjust, and publish.

---

#### Post-Creation Screen

After "Create Agent" → lands on Agent configuration page (10-tab view):
- All fields pre-populated from wizard selections
- System prompt auto-generated and visible in Tab 1
- First message auto-generated
- Voice pre-selected (matched to industry/use case — e.g., Healthcare gets a warm, calm female voice)
- LLM pre-selected
- Tab bar shows: Agent | Workflow | Branches | Knowledge Base | Analysis | Tools | Tests | Widget | Security | Advanced
- Status: **Draft** (not yet Live)
- "Publish" button prominent — user's next action is to review and publish

---

#### TRUSTNOW "+New Agent" Wizard — Implementation Requirements

**Backend (Task 6 + Task 8):**

```typescript
// AgentsModule — new endpoint for wizard creation
POST /agents/wizard
Body: {
  agent_type: 'conversational' | 'tools_assisted' | 'autonomous',
  industry: string,
  use_case: string,
  agent_name: string,
  main_goal: string,
  website_url?: string,       // triggers async URL crawl → KB doc creation
  kb_doc_ids?: string[],      // docs selected in Step 3
  chat_only?: boolean
}
Response: {
  agent_id: string,
  config: AgentConfig,        // full pre-populated config
  redirect_url: string        // → /app/agents/{id}?tab=agent
}
```

**Agent generation service** — calls LLM (Claude Sonnet or GPT-4o) with the template + user inputs to generate system_prompt + first_message. This runs synchronously during creation (2–4 seconds). Template stored in `agent_templates` table.

**Website crawl** — when `website_url` provided: async job spawns post-creation to crawl URL, create KB doc, and attach to agent. Show "Personalising from your website..." progress indicator in Tab 4 (KB tab) after creation.

**`agent_templates` seed data** — for launch, seed templates for: Retail, Healthcare, Finance, Real Estate, Education, Hospitality, Technology (7 industries × top 3 use cases each = 21 templates minimum).

**Frontend (Task 8):**

- Wizard is a multi-step modal/overlay (full-screen on mobile, centred large modal on desktop)
- Progress: 5 dots at bottom — filled dots = completed, empty dots = remaining
- Step transitions: smooth slide animation left-to-right
- Steps 1 and 2: auto-advance on card click — no button needed
- Steps 3 and 4: explicit navigation buttons
- "Create Agent" button: shows loading spinner during API call, then navigates to agent config page
- On error: show inline error message, keep form data intact
- Back navigation: preserves all previous selections

**Agent Card (grid view):**
```
┌─────────────────────────────────────┐
│  [TYPE ICON]  Agent Name      [LIVE]│
│  Conversational · Cloud             │
│  ─────────────────────────────────  │
│  "System prompt preview text..."    │
│  ─────────────────────────────────  │
│  🤖 gpt-4o    🎙️ Sarah (EN)        │
│  ─────────────────────────────────  │
│  📞 1,234    ⏱ 3m 12s   💰 $0.08  │
│  ─────────────────────────────────  │
│  [Configure]  [Analytics]  [...]    │
└─────────────────────────────────────┘
```
- `[...]` opens: Duplicate | Pause | Archive
- Clicking card body → opens agent config

**Empty state:** Large illustration + "Create your first AI Agent" CTA + "Import agent" secondary link.

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

**Page header (above tabs, observed from live ElevenLabs platform):**
- Agent name (breadcrumb: `TRUSTNOW / Main`)
- Branch name badge + **"Live {N}%" badge** (green, shows live traffic percentage on this branch)
- **Public | Draft** toggle — Public = callable by anyone with widget, Draft = testing only
- **{} Variables** button — opens variable management panel
- **Preview** button — opens test call modal
- **Publish** button (primary, dark fill) + dropdown arrow (schedule publish, rollback)

**Left panel (60%):**

*System Prompt section (observed live):*
- Label: "System prompt" with external link icon (↗ expand to full-screen editor)
- Toolbar icon (✏️) on right of label — opens AI prompt improvement assistant
- Textarea: scrollable, large, monospace-friendly, auto-expand
- Bottom of textarea: `Type {{ to add variables` hint + **"Default personality" toggle** + **"Set timezone" button**
- "Default personality" toggle — enables ElevenLabs built-in fallback persona
- "Set timezone" button — auto-injects `{timezone}` variable with caller's detected timezone

*First Message section (observed live):*
- Label: "First message"
- Helper text: "The first message the agent will say. If empty, the agent will wait for the user to start. You can specify different presets for each language." + "Disclosure Requirements ↗" link
- Textarea: scrollable
- Bottom of textarea: `Type {{ to add variables` hint + **"Interruptible" toggle** + **"Translate to all" button** + language selector dropdown (Default English)
- "Interruptible" toggle — whether first message can be interrupted by caller speech before it finishes
- "Translate to all" button — auto-translates first message to all configured additional languages

**Right panel (40%):**

*Quality Preset:*
- 3-button segmented control: `⚡ Fast` | `⚖️ Balanced` (default) | `✨ High Quality`
- Auto-populates LLM, STT, TTS fields below — overridable individually after selection

| Preset | LLM | STT | TTS |
|--------|-----|-----|-----|
| Fast | GPT-4o Mini / Claude Haiku | Deepgram / Whisper base | ElevenLabs Flash / Piper |
| Balanced | GPT-4o / Gemini Flash | Deepgram / Whisper medium | ElevenLabs standard |
| High Quality | Claude Sonnet / GPT-4o | Deepgram / Whisper large-v3 | ElevenLabs multilingual v2 |

*Voices section (observed live — with gear icon for global voice settings):*
- Label: "Voices" + ⚙️ gear icon (opens global voice settings for this agent)
- Primary voice card: avatar circle + voice name + "Primary" badge + → chevron (click to change)
- `+ Add additional voice` — add fallback or language-specific voice
- **Expressive Mode feature card (NEW — observed live):**
  - 🎵 icon + "Expressive Mode" label + **"New"** badge
  - Description: "Enhance your agent with emotionally intelligent speech, natural intonation, and expressive audio tags."
  - **Enable** button (primary) | **Dismiss** button (ghost)
  - When enabled: audio tags like `[excited]`, `[calm]` in system prompt influence delivery

*Language section (observed live):*
- Label: "Language" + helper text
- Default language row: flag icon + language name + **"Default"** badge + → chevron
- Additional language rows: e.g., `🇮🇳 Hindi & Tamil` (languages can be grouped) + → chevron
- **Hinglish Mode toggle** — enables mixed Hindi+English conversation mode (critical for Indian BPO deployments)
- `+ Add language` link → multi-select popover with search

*LLM section (observed live):*
- Label: "LLM" + helper text "Select which provider and model to use"
- Current model shown as a row with → chevron
- Clicking opens LLM picker combobox **AND** LLM sub-panel with:
  - **Backup LLM configuration** — 3-way segmented: `Default` | `Custom` | `Disabled`
    - "Custom" → shows secondary LLM model selector
    - "Default" → uses platform default backup
    - "Disabled" → no fallback, fails hard if primary LLM is unavailable
  - **Temperature slider** — "More deterministic ↔ More expressive" with dot slider
  - **Thinking Budget toggle** — "Control how many internal reasoning tokens the model can use before responding"
  - **Limit token usage** — number input (-1 = no limit)
  - **"Detailed costs"** link at bottom → opens cost breakdown modal

*LLM Picker combobox (full provider list from live platform, March 2026):*
```
── ElevenLabs ──────────────────────────────
  GLM-4.5-Air          ~825ms  $0.0227/min  ← "Great for agentic use cases"
  Qwen3-30B-A3B        ~196ms  $0.0065/min  ← "Ultra low latency"
  GPT-OSS-120B [Exp]   ~360ms  $0.0051/min  ← "OS model from OpenAI"
── Google ─────────────────────────────────
  Gemini 3 Pro Preview ~3.89s  $0.0477/min  [New]
  Gemini 3 Flash Preview~1.31s $0.0119/min  [New]
  Gemini 3.1 Flash Lite~1.55s  $0.0060/min  [New]
  Gemini 2.5 Flash     ~1.09s  $0.0035/min
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

*STT Provider (shows when Partition A):*
- Select: Deepgram Nova-2 (Primary) | Google STT | Azure Speech | Amazon Transcribe | AssemblyAI

*TTS Provider (shows when Partition A):*
- Select: ElevenLabs Flash v2.5 (Primary) | OpenAI TTS | Google WaveNet | Azure Neural

*Partition selector:*
- Two large toggle cards:
  - `☁️ Cloud (Partition A)` — Deepgram + Cloud LLM + ElevenLabs
  - `🖥️ On-Prem (Partition B)` — FasterWhisper + Ollama + Piper
- When Partition B selected: LLM picker filters to Ollama only, Voice picker filters to Piper only

*Voice Selection:*
- "Selected voice" card: avatar + name + language flag + gender badge + ▶ play
- `Change voice` button → Voice Picker side sheet (see §6.5)

*Primary Language:*
- Searchable select with flag icons
- Language grouping supported (e.g., "Hindi & Tamil" as single combined entry)

---

#### TAB 2 — Workflow (Visual Node Canvas Builder — observed live)
**Included in full-scope build. Full visual canvas — not a list.**
- Canvas toolbar: Zoom In (+), Zoom Out (−), Fit screen (expand), Pan (hand), Select (cursor), **Templates** button
- Canvas area: dot-grid background, node-based editor, drag-and-drop
- Default: single "Start" node (flag icon) in centre
- Right panel: **Global settings** — "Prevent infinite loops" toggle
- Node types: Start, Conversation, Tool Call, Condition, Transfer, End
- Edges: connect nodes with directional arrows, label-able
- **Workflow Templates modal** (4 templates — observed live):
  1. **Qualification Flow** — Route users to specialised support based on needs
  2. **Authentication Flow** — Collect user details, authenticate, guide next steps
  3. **Enterprise Tier Escalation** — Route enterprise users to priority support
  4. **Business Hours Router** — Route to human agents during business hours only

---

#### TAB 3 — Branches (A/B Testing — observed live)
**Full A/B traffic split management.**
- Header: "Branches" + "+ Create branch" button (top right)
- Table columns: **Name | Traffic Split | Created by | Updated**
- Each row: branch name + status badge (Draft/Live) + traffic % + Live green badge if active + history icon + overflow menu
- **"Live 100%"** badge shown in page header breadcrumb on the active branch
- Every branch has independent Draft/Live state
- Traffic can be split: e.g., Main 80% Live + Variant A 20% Live
- Clicking a branch row switches the entire tab UI to that branch's configuration

---

#### TAB 4 — Knowledge Base (with RAG Configuration — observed live)

*Header:*
- "Agent Knowledge Base" title
- **"Configure RAG"** button (secondary) — opens RAG configuration right panel
- **"Add document"** button (primary black)

*Document table:*
- Search bar + Type + Creator filters
- Columns: Name (with type icon and sub-status "RAG indexing complete") | Created by | Last updated | overflow menu

*RAG Configuration right panel (opened via "Configure RAG"):*
- **Enable RAG toggle** (ON by default when KB has docs) — "RAG increases agent's max KB size. Agent will have access to relevant pieces during answer generation."
- **Embedding model** — 2-way toggle: `English optimized` | `Multilingual optimized`
- **Character limit** — number input (default: 50,000) — total chars retrieved per query
- **Chunk limit** — number input (default: 20) — document chunks per query
- **Vector distance limit** — slider "More similar ↔ Less similar" — chunks with higher vector distance excluded
- **Number of candidates** — toggle + number input (min 100 recommended) — candidates evaluated in ANN vector search
- **Query rewrite prompt override** — toggle — overrides default query rewriting prompt; conversation history auto-appended

Documents table:
| # | Name | Type | Size | Status | Last Indexed | Actions |
|---|------|------|------|--------|-------------|---------|
| 1 | Product Manual.pdf | PDF | 2.1 MB | ✅ Ready | 2h ago | Re-index | Remove |
| 2 | FAQ Sheet.docx | DOCX | 45 KB | ⏳ Indexing | — | — | Remove |

`+ Add Knowledge Source` button → dialog with 3 tabs:
- **File upload** — drag-and-drop zone (PDF, DOCX, TXT, CSV accepted, max 50MB each)
- **URL** — text input for web page URL, "Fetch & Index" button
- **Text** — paste raw text directly

Re-index all button (top-right of table).

---

#### TAB 5 — Analysis (observed live from TRUSTNOW ElevenLabs account)

**Conversation list (left panel ~65%):**
- Search bar: "Search conversations..."
- Filter chips row 1: **Branch** (active: shows branch name badge) | **Date After** | **Date Before** | **Call status** | **Criteria** | **Data** | **Duration** | **Rating** | **Comments**
- Filter chips row 2: **Tools** | **Language** | **User** | **Channel**
- Table columns: Date | Branch (branch icon + name) | Duration | Messages | Status (Successful green badge / Failed red badge)
- "Successful" = green badge, "Failed" = red badge

**Right panel — Analysis configuration (~35%):**
- **Evaluation criteria** section — "Define criteria to evaluate whether conversations were successful or not" — "+ Add criteria" button — shows count "0 criteria"
  - Each criterion: name + LLM evaluation prompt (e.g., "Did the agent fully resolve the caller's query?")
  - All criteria must pass → Successful; any fails → Failed
- **Data collection** section — "Define custom data specifications to extract from conversation transcripts" — "+ Add data point" button — "0 data points"
  - Each data point: name + extraction description (e.g., "Customer's stated reason for calling")
- **Analysis Language** dropdown — Auto (infer from conversation) | specific language

**Conversation detail (opens as full-width overlay on row click):**
- Header: "Conversation with {Agent Name}" + branch badge + conversation ID (monospace, copyable)
- **Audio waveform player**: full-width waveform, play button (▶), speed selector (1.0x), rewind/forward 10s buttons, timestamp, overflow menu
- Info banner: "You can now ensure your agent returns high quality responses to conversations like this one. Try Tests in the Transcription tab."
- **3 sub-tabs: Overview | Transcription | Client data**

*Overview sub-tab:*
- **Summary** — LLM-generated paragraph summary of the entire conversation
- **Call status** row: "Successful" / "Failed" badge + refresh button (🔄 re-evaluate)
- **How the call ended** row: "Client navigated away" / "Agent ended" / "Silence timeout" / "Max duration"
- **User ID** row: shown or "No user ID"

*Transcription sub-tab:*
- Full turn-by-turn chat bubble transcript:
  - Agent turns: agent avatar + name + branch badge on left, message bubble, timestamp, **TTS latency badge** (e.g., "TTS 256 ms")
  - User turns: user avatar on right, message bubble, timestamp, **ASR latency badge** (e.g., "ASR 194 ms")
  - 🔊 speaker icon per turn for audio playback at that timestamp
- Audio waveform syncs with transcript scroll

*Client data sub-tab:*
- Shows data_collection_results extracted from transcript
- Shows evaluation_results per criterion

**Right metadata panel (always visible alongside detail view):**
- Date | Text-only (Yes/No) | Environment badge (production/staging) | Connection duration | **Call cost** (in credits) | **Credits (LLM)** | **LLM cost** ($X.XXXXX/min, Total: $X.XXX)

---

#### TAB 6 — Tools (observed live)

**Sub-tabs: Tools | MCP** (MCP = Model Context Protocol server connections)

**Tools sub-tab:**
- Search: "Search tools..."
- Filters: + Type | + Creator
- Tool list (empty state: wrench icon + "No tools found — This agent has no attached tools yet." + "Add tool" CTA button)
- `Add tool` button (top right, primary black) → opens add tool dialog
  - Options on click: **Webhook** | **Client tool** | **System tool**

**System tools panel (right side — always visible):**
- Label: "System tools — Allow the agent to perform built-in actions"
- Count badge: "0 active tools"
- 7 toggle rows with 🔑 icon:
  - End conversation (off)
  - Detect language (off)
  - Skip turn (off)
  - Transfer to agent (off)
  - Transfer to number (off)
  - Play keypad touch tone (off) — note: ElevenLabs calls this "Play keypad touch tone" not "Play DTMF"
  - Voicemail detection (off)
- Each toggle: click to expand sub-config inline

**MCP sub-tab:**
- MCP server connections list
- "+ Add MCP server" button
- Each server: server name, URL, connection status badge

---

#### TAB 7 — Tests (observed live — full test management page exists in sidebar too)
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

**Inside agent Tests tab:**
- Quick test input panel
- Run existing tests against current agent config

---

#### TAB 8 — Widget (observed live — full structure)

**Setup section:**
- "Setup" label + "Attach the widget on your website" helper
- Tutorial card: avatar image + "Learn how to embed your voice agent anywhere" link
- **Embed code** — code block with copy button: `<elevenlabs-convai agent-id="agent_XXXXX"></elevenlabs-convai>`
- **Feedback collection** toggle (ON by default) — "Callers can rate their satisfaction from 1 to 5 and optionally leave a comment after the conversation."

**Interface section:**
- "Interface" label + "Configure the parts of the widget interface" helper
- Toggle rows (observed exact order from live platform):
  - **Chat (text-only) mode** (off)
  - **Send text while on call** (off)
  - **Realtime transcript of the call** (off)
  - **Language dropdown** (ON in TRUSTNOW agent)
  - **Mute button** (off)
- **Expanded behavior** dropdown: `Starts expanded` | `Starts collapsed`

**Markdown links section:**
- Allowed domains multi-value input (domains that can show clickable links in chat)
- "No domains specified. Links will be shown as blocked."
- **Include www. variants** toggle (ON) — "Automatically allow the www variant. Adding example.com also allows www.example.com."
- **Allow HTTP links** toggle (ON) — "Allow non-secure http:// links. By default, only https:// links are clickable."

**Avatar section:**
- "Avatar" label + "Configure the voice orb or provide your own avatar" helper
- **Type**: 3-way segmented control `Orb | Link | Image`
- Image upload: "Click or drag a file to upload. Recommended resolution: 172×172 pixels. Maximum size: 2MB."

**Terms & Conditions section:**
- "Terms & Conditions" label + "Require the caller to accept your terms and conditions before initiating a call" helper
- Enable toggle
- Markdown T&C editor
- Local storage key for remembering acceptance

**Live preview:**
- Full widget preview at bottom-right of screen (as real floating widget, not mockup)

---

#### TAB 9 — Security (observed live — full structure)

**Authentication section:**
- "Authentication" label + "Require users to authenticate before connecting to the agent" helper
- **Enable authentication** toggle
- Tutorial card: avatar + "Learn how to secure your agent" link

**Allowlist section:**
- "Allowlist" label + "Specify the hosts that will be allowed to connect to this agent" helper
- **Allowlist** table + "Add host" button
- Warning when empty: "No allowlist specified. Any host will be able to connect to this agent. We strongly recommend setting up an allowlist when using overrides."

**Guardrails section (Alpha — observed live):**
- "Guardrails" label + "Alpha" badge + "Define boundaries for your agent's behavior. Control what agents can say and do in production to reduce risk and keep interactions predictable."
- **Focus** row — "Not enabled" + enable link
- **Manipulation** row — "Not enabled" + enable link
- Each guardrail: configurable rules that prevent the agent from straying off-topic or being manipulated

**Overrides section (observed live — key enterprise feature):**
- "Overrides" label + "Choose which parts of the config can be overridden by the client at the start of the conversation" helper
- Individual toggles (all off by default except Text only which was ON in TRUSTNOW agent):
  - First message | System prompt | LLM | Voice | Voice speed | Voice stability | Voice similarity | **Text only**
- Use case: programmatic per-call customisation (e.g., pass different system prompts per customer segment via API)

**Conversation Initiation Client Data Webhook:**
- "Conversation Initiation Client Data Webhook" label
- "Configure how the conversation initiation client data is fetched when receiving Twilio or SIP trunk calls."
- **Fetch initiation client data from a webhook** toggle
- When enabled: URL input + auth config

**Post-call Webhook section (observed live — enables n8n/automation):**
- "Post-call Webhook" label
- "Override the post-call webhook for this agent. You can configure the default webhooks used by all agents in your workspace settings."
- Tutorial card: avatar + "Learn how to automate post-call workflows with ElevenLabs & n8n"
- **Post-call webhook** field + "Create Webhook" button
- Empty state: "No post-call webhook configured."

**Auth Policy Engine (TRUSTNOW custom extension beyond ElevenLabs):**
- All 7 auth methods with sub-config as previously specified
- Drag-and-drop sequencing
- Pass-any vs all-must-pass policy

---

#### TAB 10 — Advanced (observed live — full structure)

**Automatic Speech Recognition (ASR) section:**
- Label: "Automatic Speech Recognition" + helper "Configure how the incoming audio is processed and transcribed into text."
- **Enable chat mode** toggle — "Create text-only conversational agents that do not process audio."
- **ASR model** — "Select the speech recognition model for transcribing user audio." — dropdown: `Original ASR` (default) | other models when available
- **Filter background speech** toggle — "Alpha" badge — "Enable background voice detection to filter out far-field human speech." (useful for call centres with ambient noise)
- **User input audio format** — "Select the input format you want to use for automatic speech recognition." — dropdown with Recommended badge: `PCM 16000 Hz` (Recommended) | other formats

**Conversational behavior section:**
- Label: "Conversational behavior" + helper "Configure turn taking behavior and conversation limits."
- **Eagerness** — "Controls how eager the agent is to respond. High eagerness means the agent responds quickly, while low eagerness means the agent waits longer to ensure the user has finished speaking." — dropdown: `Normal` (default) | `High` | `Low`
- **Speculative turn** toggle — "When enabled, starts generating responses during silence before full turn confidence is reached, reducing perceived latency. May increase LLM costs."
- **Take turn after silence** — "The maximum number of seconds since the user last spoke. If exceeded, the agent will respond and force a turn. A value of -1 means the agent will wait indefinitely for user input." — number input (default: 7) + "Seconds" label
- **End conversation after silence** — "The maximum number of seconds since the user last spoke. If exceeded, the call will terminate. A value of -1 means there is no fixed cutoff." — number input (default: -1) + "Disabled" label
- **Max conversation duration** — "The maximum number of seconds that a conversation can last." — number input (default: 600) + "Seconds" label
- **Max conversation duration message** — "Message to send when max conversation duration is reached. Note: this only applies to text-only conversations." — textarea (default: "Conversation ended, goodbye!") + language selector dropdown (Default English)

**Soft timeout section:**
- Label: "Soft timeout" + helper "Provide immediate feedback during longer responses."
- **Soft timeout** — "How long to wait for the LLM response before returning a message." — number input (default: -1) + "Disabled" label

**Barge-In / Interrupt Policy (TRUSTNOW extension — not in ElevenLabs but critical for BPO):**
- Interrupt mode: 3-way toggle
  - `Allow` — any caller speech immediately stops TTS
  - `Smart` (default) — stops TTS only if caller speech exceeds 300ms
  - `None` — TTS plays to completion (for regulated compliance scripts)

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

### 6.4A — Agent Preview & Test (`/app/agents/[id]/preview`) — observed live

**Trigger:** "Preview" button in agent config top bar → opens full-screen preview page (not a modal).

**URL pattern:** `/app/agents/[id]/preview?branchId=[branchId]&include_draft=true`

**Layout — 3 zones:**

**Left panel (280px) — Conversation History:**
- "History" label + × close button
- Scrollable list of all previous preview conversations
- Each item: auto-generated descriptive name (LLM summarises the conversation, e.g., "TRUSTNOW welcome message", "Company Information Request", "Greeting")
- Active item highlighted
- Clicking item → opens conversation detail overlay (Overview / Transcription / Client data — same 3-sub-tab structure as Analysis tab)
- Conversation detail shows: pagination "2 / 5" with ▲ ▼ navigation, conversation ID, waveform player, Summary, Call status, How call ended, User ID, Metadata panel

**Centre panel — Voice Orb + Call interface:**
- Large animated metallic/silver orb (voice visualiser — responds to audio levels in real time)
- **Black circular phone button** (📞) below orb — click to initiate live voice call
- Bottom toolbar: ⚙️ settings gear (opens audio device selector) | 🎤 **Mute** button | 🇺🇸 **English** language selector dropdown

**Right panel — Text chat area:**
- Empty state: speech bubble icon + "Call or send a message to start a new conversation"
- During call: conversation bubbles appear showing transcript in real time
- Bottom: "Send a message to start a chat" text input + ▶ send button (text mode)

**Top bar:**
- ← **Back** button (returns to agent config)
- 🕐 **History** button (toggles left panel open/closed)
- Agent name + branch name + "Live 100%" badge + branch dropdown
- ⚙️ **Voice settings** button → opens Voice Settings panel
- **...** overflow menu

**Voice Settings panel (right drawer, opens on "Voice settings"):**
- **Voice** row — "Using default" label + current voice card (name) + → chevron (click to change voice for this preview only — does NOT save to agent config)
- **Stability** slider — "Using default" · "More expressive ↔ More consistent"
- **Speed** slider — "Using default" · "Slower ↔ Faster"
- **Similarity** slider — "Using default" · "Low ↔ High"

**Critical behaviour:** All voice settings in this panel show "Using default" and override for the preview session only. Changes here do NOT modify the saved agent config. This lets developers test different voice parameters without touching production settings.

**Metadata panel (shown when viewing a history conversation):**
- Date | Text-only (Yes/No) | **Environment** badge ("production" + "Manage environments" link + "Learn more")
- Connection duration | **Call cost** (in credits — **"Development discount applied"** note shown)
- **Credits (LLM)**

**Two key backend implications from preview observations:**
1. **Development discount** — preview/test calls use a discounted credit rate vs production calls. TRUSTNOW must implement a `is_preview` flag on conversations and apply a discounted cost calculation.
2. **Environment management** — "Manage environments" link confirms ElevenLabs supports production/staging environment switching per agent. TRUSTNOW `conversations.environment` field (already in schema) must be populated correctly — preview calls = `environment='staging'`, live calls = `environment='production'`.

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

### 6.10 Conversations (`/app/conversations`) — Global Monitor page (observed live)

**Purpose:** Global conversation history across all agents.

**Header (observed live):** "Conversation history"

**Empty state (observed for TRUSTNOW account when no recent activity):**
- Clean empty state — no conversations shown
- In practice: list with same structure as Analysis tab conversation list

**Filter bar:** Same filter chips as Analysis tab — Branch, Date After/Before, Call status, Criteria, Data, Duration, Rating, Comments, Tools, Language, User, Channel

**Table:** Same structure as Analysis tab conversations list — Date | Branch | Duration | Messages | Status

**Conversation detail:** Same 3-sub-tab panel as Analysis tab (Overview | Transcription | Client data)

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

### 6.13 Phone Numbers (`/app/phone-numbers`) — Deploy section (observed live)

**Purpose:** Manage inbound/outbound phone numbers.

**Header:** "Phone Numbers" + **"+ Import number"** button (primary black)

**Empty state (observed live):**
- Phone icon (🤙) + "No phone numbers" + "You don't have any phone numbers yet." + **"+ Import number"** secondary CTA button

**Import number flow:**
- Provider: Twilio | SIP trunk | other
- Number input
- Assign to agent

---

### 6.14 WhatsApp (`/app/whatsapp`) — Deploy section (observed live)

**Purpose:** Deploy agents to WhatsApp channel.
- WhatsApp Business API connection
- Assign agent to WhatsApp number

---

### 6.15 Outbound (`/app/outbound`) — Deploy section (observed live)

**Purpose:** Configure outbound calling campaigns.
- Agent selection
- Target list upload
- Schedule configuration
- Compliance settings (DNC, calling hours)

---

### 6.16 Settings (`/app/settings`)

**Purpose:** Workspace and account settings.

**Sections:**
- Workspace name and branding
- API keys (generate, revoke)
- Default webhooks (post-call webhook for all agents)
- Billing and usage
- Data retention policies
- Members management

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

### 6.19 Settings (`/app/settings`)

**Tabs:** General | Security | Integrations | Notifications | API Keys

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

**Integrations tab:**
- CRM connectors: Salesforce | HubSpot | Zendesk | Custom
- SIP trunk configuration: SIP server, port, credentials
- Webhook integrations list (for event callbacks)

**API Keys tab:**
- Table of API keys: name | created | last used | scope | Actions (Revoke)
- `+ Create API Key` → name + scope select + generate

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

*UI-SPEC-001.md v1.0 — Complete Platform UI/UX Specification*
*TRUSTNOW CONFIDENTIAL — March 2026*
*Cross-reference: FULL-SCOPE-BRD.md §8.3–8.6 + §10 | ARCH-001.md L5 module definitions | FULL-SCOPE-IMPL-001.md Tasks 8, 12, 13, 14, 15*
