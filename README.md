# What We Are Building Across Labs 1 to 4
TokTickIT is an IT service desk application for Account and Access, Hardware, Software, and Network
requests. Across seven individual sprints, each student will incrementally build the same product from
a full-stack foundation into a polished local web application.

The instructor acts as the stakeholder and product owner, releasing a new engineering contract for
each sprint. Every contract defines the required behavior, UI, business rules, acceptance criteria, and
tests. Students use AI coding agents to assist with implementation, but remain responsible for the
specifications, code, tests, reviews, and final product quality.

Specification: defines the product behavior and design.
Engineering contract: defines the specification plus the evidence required to prove it is complete.

The final application will support three roles: Requester, IT Staff, and Administrator. A Ticket stores
the current state of the request and contains related Public Comments, Internal Notes, Actions Taken,
and Attachments. Requesters and IT Staff share some functions, such as public comments and
attachments, while role-based rules control sensitive actions such as assignment, IT priority, status
changes, internal notes, and user management.

By the end of Lab 4, every student should have a professional application running locally with
responsive screens, consistent UI styling, clear validation and warnings, safe error handling,
automated tests, GitHub Issues, feature branches, peer-reviewed Pull Requests, and complete
documentation. CI/CD and cloud deployment will be introduced later during the team-project phase.

---

## Lab 2 Implementation Summary: Requester Ticketing MVP & UI Foundation

In Lab 2, TokTickIT delivered its first functional vertical slice: a responsive, end-to-end Requester-facing IT support ticketing MVP built on PostgreSQL, Prisma, Express, and React (Vite + TypeScript), fully styled with the custom **Zen Green UI design system**.

### 1. Key Features Delivered

* **Feature-5: Development Requester Context & Simulation**
  * Modal selection gate pre-populating simulated requester personas (e.g., Jennifer Anderson, Michael Brown) prior to real authentication in Lab 3.
  * Requester context persisted in browser `localStorage` and displayed via persistent navbar badge.
  * Dynamic requester switching with instant UI context updates and strict cross-requester data isolation.

* **Feature-6: Ticket Creation (Create Mode)**
  * Structured intake form with category and related system reference dropdowns, requested priority levels (`Low`, `Medium`, `High`, `Urgent`), summary, and description.
  * Transactional, year-scoped sequential ticket number generation (`TKT-YYYY-NNNNN`).
  * Real-time client-side validation, accessible red error messages (`.zen-field-error`), and input preservation upon API failure.
  * Prominent Zen Green success banner displaying the generated ticket number and direct navigation actions.

* **Feature-7: My Tickets (List View, Search, Filter, Sort, Pagination)**
  * Full desktop data table and mobile stacked card view (`.zen-ticket-card`) ensuring responsiveness across Desktop (&ge;992px), Tablet (768–991px), and Mobile (<768px).
  * Debounced live search querying across ticket number and summary text.
  * Multi-dimensional filtering by Category, Priority, and Status with server-side pagination and sorting.
  * Dedicated empty states (*"No tickets submitted yet"*) and no-results states (*"No matching tickets found"* with a *Clear Filters* action).

* **Feature-8: Ticket Detail (View Mode) & Attachment Lifecycle**
  * Read-only inspection screen showing ticket metadata grid, formatted description, status/priority badges, and inert Lab 3 placeholders.
  * Strict Broken Object Level Authorization (BOLA) enforcement returning `403 Forbidden` on unauthorized ticket access.
  * Multi-file attachment uploads (JPG, PNG, WEBP, PDF &le; 5 MB) up to an active limit of 5 files per ticket.
  * Secure binary file downloads and soft-removal modal requiring a mandatory audit reason (3–255 characters).
  * Soft-removed files rendered as non-downloadable audit tombstones (`410 Gone` on download attempts), releasing active slots.

---

### 2. Design System: Zen Green Theme

* **Color Palette**: Forest Green (`#006B3C`), Secondary Emerald (`#0B7A46`), Page Background (`#F7FAF8`), and Neutral Card Borders (`#DCE5DF`).
* **Accessible Badges**: Status and Priority tags incorporate distinct semantic colors, icons, and text labels for color-blind accessibility.
* **Responsive Architecture**: Fluid layouts, touch-friendly targets (&ge;44px), and zero horizontal overflow on mobile devices.

---

### 3. Testing & Verification Summary

All deliverables are verified across four automated testing tiers with 100% pass rates:

| Test Layer | Scope | Framework | Total | Result |
| :--- | :--- | :--- | :--- | :--- |
| **Server Unit Tests** | Ticket number formatting, validation schemas, file validators | Vitest | 13 | **Pass (13/13)** |
| **Server API Integration Tests** | Express routes, Prisma queries, BOLA isolation, error envelopes | Vitest + Supertest | 45 | **Pass (45/45)** |
| **Client UI Component Tests** | Form validation, requester switching, table/card rendering, modals | Vitest + React Testing Library | 29 | **Pass (29/29)** |
| **Playwright E2E Tests** | Full browser flows: Ticket creation, isolation, attachment lifecycle | Playwright / Chromium | 2 | **Pass (2/2)** |
| **Total Automated Tests** | | | **89** | **100% Pass** |

---

### 4. Running the Application Locally

#### Prerequisites
* Node.js &ge; 18.x
* PostgreSQL instance configured with credentials in `server/.env`

#### Quick Start
1. **Install Dependencies**:
   ```bash
   # Root / E2E dependencies
   npm install

   # Server dependencies
   npm --prefix server install

   # Client dependencies
   npm --prefix client install
   ```

2. **Database Setup & Seed**:
   ```bash
   cd server
   npx prisma migrate dev
   npx prisma db seed
   cd ..
   ```

3. **Start Development Servers**:
   * **Terminal 1 (Backend API on `http://localhost:3000`)**:
     ```bash
     cd server
     npm run dev
     ```
   * **Terminal 2 (Frontend Client on `http://localhost:5173`)**:
     ```bash
     cd client
     npm run dev
     ```

4. **Running Tests**:
   * **Run Unit & Integration Tests (Server + Client)**:
     ```bash
     npm run test
     ```
   * **Run Playwright End-to-End Tests**:
     ```bash
     npx playwright test
     # Or:
     npm run test:e2e
     ```

---

### 5. Lab 2 Documentation Directory

Detailed sprint specifications and artifacts are maintained under [`docs/lab-02/`](docs/lab-02/):
* [`specification.md`](docs/lab-02/specification.md): Complete engineering specification, user stories, and acceptance criteria.
* [`api-spec.md`](docs/lab-02/api-spec.md): REST API contracts, endpoints, request/response DTOs, and error envelopes.
* [`ui-spec.md`](docs/lab-02/ui-spec.md): UI layout rules, Zen Green design tokens, and screenshot deliverable inventory.
* [`tests.md`](docs/lab-02/tests.md): Test strategy, traceability matrix, and execution commands.
* [`reviewer.md`](docs/lab-02/reviewer.md): Peer review records and PR audit history.

---

## Lab 3 Implementation Summary: Users, Roles, IT Staff Operations & Administrator Management

In Lab 3, TokTickIT progressed from the initial Requester MVP into a multi-role, production-ready operational platform. Real Argon2id authentication replaced developer simulation, operational IT Staff workflows (central queue, ticket ownership, IT priority, workflow status transitions, public comments, and internal notes) were delivered, and a minimalist Administrator user management interface was established—all backed by strict server-side authorization and the consistent **Zen Green UI design system**.

### 1. Key Features Delivered

* **Feature-9: Authentication Foundation & Mandatory Password Change**
  * **Argon2id Password Security**: Production password hashing using Argon2id with constant-time verification against timing attacks (`POST /api/v1/auth/login`).
  * **Session-Based Authentication**: Secure `HttpOnly` cookie-based sessions with server-side session invalidation upon logout (`POST /api/v1/auth/logout`) and session restoration via `GET /api/v1/auth/me`.
  * **Inactive Account Protection**: Immediate rejection of deactivated accounts (`isActive: false`) with generic, safe failure messages.
  * **Mandatory Initial Password Change**: Enforces first-login password updates (`mustChangePassword: true`) blocking entry to the app until a complex password (min 8 chars, uppercase, lowercase, number, special char) is established (`POST /api/v1/auth/change-password`).
  * **Decommissioned Dev Simulation**: Removed the Lab 2 requester selection gate; authenticated user identity and role badge (`Requester`, `IT Staff`, `Administrator`) are rendered dynamically in the persistent Zen Green navigation header.

* **Feature-10: IT Staff Ticket Queue (Shared Operational Triage)**
  * **Shared Operational Queue**: Central triage table (`GET /api/v1/tickets`) for IT Staff and Administrators to manage tickets across the organization.
  * **Real-Time Live Search**: Debounced querying across ticket numbers (`TKT-YYYY-NNNNN`) and summary text.
  * **Multi-Criteria Filtering & Sorting**: Instant filtering by Category, Status, Requested Priority, IT Priority, and Assignment (`All`, `Unassigned`, `Assigned to Me`). Multi-column sorting by Ticket Date, Status, Priority, and Last Updated with server-side pagination.
  * **Role-Based Access Control**: Requesters are strictly forbidden from accessing the IT Staff queue (`403 Forbidden`).

* **Feature-11: IT Staff Ticket Operations, Comments & Notes**
  * **Ownership Claiming & Assignment**: IT Staff and Administrators can claim unassigned tickets or reassign ownership among active staff members.
  * **IT Priority Setting**: Independent IT Priority assignment (`Low`, `Medium`, `High`, `Urgent`), preserving the requester's original Requested Priority for SLA traceability.
  * **Lifecycle Status Transitions**: Enforced state machine preventing illegal jumps (`New` → `In Progress` → `Pending Requester` → `Resolved` → `Closed` / `Cancelled`).
  * **Optimistic Concurrency Control**: Ticket versioning protects against mid-air collisions (`409 Conflict`) during concurrent staff edits.
  * **Dual-Channel Discussion Threads**:
    * **Public Comments**: Append-only thread visible to Requesters, IT Staff, and Administrators for open communication.
    * **Internal Notes**: Role-restricted thread rendered in a distinct amber alert style, strictly hidden from Requesters (`403 Forbidden`).
  * **Requester Resolution Indication**: Allows requesters to mark *"Problem Appears Resolved"* to confirm fixes without directly altering formal ticket workflow status.
  * **Full Attachment Lifecycle Continuity**: Retains all Lab 2 attachment capabilities (upload, streaming download, soft-removal with audit reason, tombstones).

* **Feature-12: Minimalist Administrator User Management**
  * **Administrator Management Console**: Dedicated management interface (`/admin/users`) guarded by role checks (`403 Forbidden` for non-administrators).
  * **Directory Search & Role Filter**: Instant search by Name or Email and single-role filtering (`Requester`, `IT Staff`, `Administrator`).
  * **User Provisioning Modal**: Secure drawer/modal to create accounts with email, display name, single role, activation status, and an initial password flagged for mandatory reset.
  * **Account Lifecycle & Edits**: Edit profile information and toggle activation states (`Active` / `Inactive`).
  * **Critical Admin Safety Protections**:
    * Hard prevention of duplicate email registration.
    * Strict block against self-deactivation (`SELF_DEACTIVATION_PROHIBITED`).
    * Protection preventing deactivation or re-rolling of the system's last active Administrator (`LAST_ADMIN_PROTECTION`).
    * Soft deactivation policy with zero hard deletion of user accounts.
  * **Password Reset Gate**: Admin-initiated password resets automatically set `mustChangePassword = true`, forcing the user to change their password upon their next login.

---

### 2. Design System & UX Enhancements

* **Role Badges**: Prominent, accessible Zen Green pill badges distinguish `Requester` (neutral/green), `IT Staff` (blue/teal), and `Administrator` (purple/indigo) users.
* **Dual Discussion Visual Styling**: Public Comments feature clean green/neutral card borders, while Internal Notes feature high-contrast amber styling with padlock icons for immediate visual identification.
* **Password Policy Checklist**: Real-time visual feedback checklist dynamically validates password length, uppercase, numbers, and special characters.
* **Responsive Layouts**: Operational queue tables and user management lists gracefully collapse into stacked card layouts on mobile screens (<768px).

---

### 3. Testing & Verification Summary

All Lab 3 deliverables were implemented using Test-Driven Development (TDD) and verified across four automated testing tiers:

| Test Layer | Scope | Framework | Total Tests | Result |
| :--- | :--- | :--- | :--- | :--- |
| **Server Unit Tests** | Password complexity policy, ticket state machine, comment/note validation | Vitest | 3 | **Pass (3/3)** |
| **Server API Integration Tests** | Argon2id auth, sessions, RBAC guards, IT queue queries, ownership, comments/notes, admin safety | Vitest + Supertest | 34 | **Pass (34/34)** |
| **Client UI Component Tests** | Login, forced password change, shell header, staff queue, staff detail, user admin | Vitest + RTL | 10 | **Pass (10/10)** |
| **Playwright E2E Tests** | Multi-role workflows: auth, triage, note segregation, admin lifecycle | Playwright / Chromium | 5 | **Pass (5/5)** |
| **Total Lab 3 Automated Tests** | | | **52** | **100% Pass** |

* **Full Traceability**: 100% coverage across all 14 Acceptance Criteria (`AC-01` to `AC-14`), 28 Functional Requirements (`FR-01` to `FR-28`), and 16 Business Rules (`BR-01` to `BR-16`).
* **Visual Verification**: 34 unique screenshot deliverables generated and cataloged under `artifacts/lab-03/screenshots/`.

---

### 4. Lab 3 Documentation Directory

Detailed sprint specifications and review records are maintained under [`docs/lab-03/`](docs/lab-03/):
* [`specification.md`](docs/lab-03/specification.md): Comprehensive sprint requirements, domain model, business rules, and acceptance criteria.
* [`api-spec.md`](docs/lab-03/api-spec.md): REST API contracts, auth endpoints, queue query params, and error schemas.
* [`ui-spec.md`](docs/lab-03/ui-spec.md): UI screen definitions, responsive behaviors, and screenshot deliverable inventory.
* [`tests.md`](docs/lab-03/tests.md): Test plan, traceability matrix, and automation commands.
* [`reviewer.md`](docs/lab-03/reviewer.md): Specification review logs and contract compliance audits.
* [`ai_use.md`](docs/lab-03/ai_use.md): AI tool attribution, prompt logs, and development reflections.

---

## Lab 4 Implementation Summary: Actions Taken, Ticket Lifecycle & Role Dashboards

In Lab 4, TokTickIT reached full operational maturity by completing the service desk lifecycle. It introduces structured technical work tracking via parent-child **Actions Taken**, strict **Ticket Lifecycle & Resolution Gates** preventing unresolved or unverified ticket closure, and role-tailored **Operational Dashboards** for both Requesters and IT Staff with live metrics and interactive drill-down navigation—all built on PostgreSQL, Prisma, Express, and React under the **Zen Green UI design system**.

### 1. Key Features Delivered

* **Feature-13 & Feature-14: Actions Taken (Investigation & Resolution Logging)**
  * **Relational Domain Model**: Evolved Prisma schema with an `ActionTaken` model linked to parent `Ticket` records, capturing Action Date/Time, Description, Result, Status (`PLANNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`), Performed By, Assignee, Follow-Up Required flag, Follow-Up Note, and Attachment Notes.
  * **Integrated Ticket Detail UI**: Embedded Actions Taken section in Ticket Detail with responsive desktop data tables (&ge;992px) collapsing into touch-friendly stacked cards on mobile (<768px).
  * **Accountability Separation**: Individual actions can be assigned to different active IT Staff members while preserving primary Ticket Owner oversight.
  * **Auto-Populated Context**: Create and Edit modals automatically record and display the authenticated actor as `Performed By`.
  * **Conditional Validation**: Dynamically enforces mandatory `followUpNote` if and only if `isFollowUpRequired` is checked (`BR-05`).
  * **Strict Role-Based Access Control**: IT Staff and Administrators create and modify actions; Requesters are restricted to a clean, read-only view (`403 Forbidden` on unauthorized mutation attempts).

* **Feature-15: Enforced Ticket Lifecycle & Resolution Gate Workflow**
  * **Strict Workflow State Machine**: Governs permitted status transitions (`NEW` &rarr; `IN_PROGRESS` &rarr; `PENDING_REQUESTER` &rarr; `RESOLVED` &rarr; `CLOSED` / `CANCELLED`), preventing illegal state jumps.
  * **Resolution Gate Enforcement**: Backend rejects transitions to `RESOLVED` or `CLOSED` with `409 Conflict` (`TICKET_STATE_CONFLICT`) whenever any Action Taken remains incomplete (`PLANNED` or `IN_PROGRESS`) or when required resolution details are missing.
  * **Advisory Requester Confirmation**: Requesters can submit *"Problem Appears Resolved"* as an audit confirmation note without bypassing IT staff verification gates.
  * **Atomic Cascading Cancellation**: Cancelling a ticket automatically cascades cancellation to all open actions under the ticket with consistent audit traceability.
  * **Reopening Rules**: Reopening resolved/closed tickets automatically transitions to `IN_PROGRESS` (if an owner is assigned) or `NEW` (if unassigned).

* **Feature-16: Role-Based Operational Dashboards**
  * **Persistent Top-Level Navigation**: Integrated "Dashboard" nav item in the persistent Zen Green navigation header, dynamically routing users based on role.
  * **IT Staff Dashboard (`#/dashboard`)**:
    * **5 Operational Metric Cards**: Real-time counters for `New`, `Open` (Assigned), `In Progress`, `Waiting for Requester` (Pending Requester), and `My Assigned` with 24-hour delta trend indicators and accessible icons.
    * **Interactive Drill-Down Navigation**: Clicking any metric card directly navigates to the central queue pre-filtered by status or assignment (e.g. `status=NEW`, `assigned=mine`).
    * **Recent Triage Tickets Table**: Highlights high-priority and recently updated tickets requiring staff attention.
    * **Quick Actions**: Instant access to `+ Create Ticket` and manual queue data refresh.
    * **Security Boundary**: Requesters attempting to access the IT Staff dashboard API or view are strictly blocked and redirected (`403 Forbidden`).
  * **Requester Dashboard (`#/dashboard`)**:
    * **4 Personal Metric Cards**: Real-time counts for `Total Requests`, `In Progress`, `Resolved`, and `Closed` with `[View all]` drill-down links to filtered ticket views.
    * **Strict Data Isolation**: Displays only tickets submitted by the authenticated requester. Requesters with zero requests see zeroed counters and an encouraging empty state with `+ Create Your First Ticket`.
    * **Recent Requests List**: Chronological display of recent requests with accessible status and priority badges.

* **UI Hardening & Pagination Overflow Prevention**
  * **Capped Pagination Bar**: Fixed array expansion across all ticket views (`MyTickets` and `StaffTicketQueue`) by capping visible page buttons to 20 numbers.
  * **Dynamic Sliding Window with Ellipsis (`...`)**: Displays a centered sliding window as users navigate through higher page numbers (e.g. `... [11..30] ...`), with accessible jump-range ellipsis buttons.
  * **Responsive Wrap**: Enforced `flex-wrap` layout on pagination controls, eliminating horizontal overflow across desktop, tablet, and mobile viewports.

---

### 2. Design System & Accessibility Hardening

* **Zen Green Aesthetic**: Maintained harmonious forest green tones (`#006B3C`), sage cards, and consistent badge tokens across all new dashboard and action components.
* **WCAG 2.2 AA Accessibility**: Full contrast compliance, unique element test IDs, accessible aria labels on all interactive buttons and ellipsis controls, and screen-reader-friendly status indicators.
* **Responsive Breakpoints**: Seamless responsiveness tested across Desktop (&ge;1280px), Tablet (768–1024px), and Mobile (375–812px) viewports with zero horizontal overflow.

---

### 3. Testing & Verification Summary

All Lab 4 deliverables were engineered following Test-Driven Development (TDD) and verified across four automated testing tiers with a 100% pass rate:

| Test Layer | Scope | Framework | Total Tests | Result |
| :--- | :--- | :--- | :--- | :--- |
| **Server Unit & Domain Tests** | Action validators, follow-up rules, state transition matrices | Vitest | 46 | **Pass (46/46)** |
| **Server API Integration Tests** | Actions Taken CRUD, resolution gates, RBAC, staff & requester dashboards, BOLA isolation | Vitest + Supertest | 111 | **Pass (111/111)** |
| **Client UI Component Tests** | Actions Taken table/modal, staff dashboard, requester dashboard, queue pagination, auth | Vitest + React Testing Library | 115 | **Pass (115/115)** |
| **Playwright E2E Tests** | Multi-role workflows: Actions lifecycle, resolution gate enforcement, dashboard drill-down | Playwright / Chromium | 2 | **Pass (2/2)** |
| **Total Automated Tests** | Across all four lab tiers (Labs 1–4 complete regression) | | **274** | **100% Pass** |

* **Visual Artifacts**: 33 high-resolution screenshots generated and organized under [`artifacts/lab-04/screenshots/`](artifacts/lab-04/screenshots/) across five categories:
  * `staff-dashboard/`: 7 screenshots (overview, metrics, drill-down, triage, RBAC).
  * `requester-dashboard/`: 5 screenshots (overview, metrics, drill-down, recent tickets, empty state).
  * `actions-taken/`: 9 screenshots (table, modals, conditional validation, completion, read-only mode).
  * `ticket-workflow/`: 4 screenshots (permitted transitions, resolution gate block, resolved state, audit timeline).
  * `responsive/`: 8 screenshots (Desktop, Tablet, and Mobile views across dashboards and actions).

---

### 4. Lab 4 Documentation Directory

Detailed sprint specifications, API schemas, UI definitions, and review records are maintained under [`docs/lab-04/`](docs/lab-04/):
* [`specification.md`](docs/lab-04/specification.md): Complete sprint specification, business rules, and acceptance criteria.
* [`api-spec.md`](docs/lab-04/api-spec.md): REST API contracts, dashboard metrics endpoints, Actions Taken DTOs, and error envelopes.
* [`ui-spec.md`](docs/lab-04/ui-spec.md): UI screen layouts, responsive specifications, and deliverable screenshot inventory.
* [`tests.md`](docs/lab-04/tests.md): Test strategy, full test inventory, and traceability matrix.
* [`reviewer.md`](docs/lab-04/reviewer.md): Quality audit log and contract compliance checklist.
* [`ai_use.md`](docs/lab-04/ai_use.md): AI usage attribution, prompts, and development reflection.

