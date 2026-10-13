# Lab 4 Sprint Engineering Specification

**Document ID**: SPEC-LAB-04  
**Version**: 1.0  
**Status**: Specified / Ready for Staged TDD Implementation  
**Method**: Spec-Driven Development (SDD) & Test-Driven Development (TDD)  
**Parent Specification**: `docs/TokTickIT-System-Level-SDS-v1.0.pdf` (`SDS-SYS-001`)  
**Assignment Handout**: `docs/lab-04/Labsheet_4.pdf` (CPE 334 Lab 4: TokTickIT Actions Taken, Dashboards, and Final Regression)  
**Target Branch**: `lab4-staging`  

---

## 1. Sprint Goal

Deliver the final product increment for the TokTickIT service desk application by introducing parent-child Actions Taken tracking for IT Staff, enforcing strict ticket lifecycle and resolution business rules (preventing ticket resolution while open actions remain), providing role-tailored operational dashboards for Requesters and IT Staff with interactive drill-down navigation, and hardening the entire full-stack system across security, accessibility, responsiveness, and regression suites under the Zen Green design system (`Labsheet_4.pdf`, Section 1, p. 1).

---

## 2. Stakeholder Request Interpretation

The stakeholder requires completing the service-desk operational workflow and delivering executive/operational visibility (`Labsheet_4.pdf`, Section 3, pp. 1–2):
1. **Actions Taken Tracking**: While communication with Requesters is established, IT Staff require a structured mechanism to plan, execute, and record discrete units of technical work on each Ticket. Each action line must capture: Action Date/Time, Description, Result, Performed By (auto-populated with authenticated actor), Follow-Up Required flag, Follow-Up Note (mandatory when follow-up is required), and Attachment Notes.
2. **Accountability Separation**: The primary Ticket Owner coordinates overall ticket resolution, but individual Actions Taken may be performed by different IT Staff members.
3. **Formal Resolution Gate**: Requesters may continue to mark "Problem Appears Resolved" as an advisory signal, but IT Staff must formally review work. Crucially, a ticket cannot be marked Resolved or Closed while any Action Taken remains incomplete (`Planned` or `In Progress`).
4. **Role-Tailored Dashboards**: Requesters and IT Staff require concise, authoritative dashboard views providing real-time operational metrics and recent tickets, seamlessly connected to detailed screens via drill-down navigation without replacing underlying list/queue views.
5. **System Hardening & Zen Green Continuity**: The final application must maintain full backward compatibility with Labs 1 to 3, enforce server-side authorization on every write operation, prevent duplicate submissions, ensure WCAG 2.2 AA accessibility, and preserve the custom Zen Green design language.

---

## 3. Scope

### 3.1. Included Scope (Feature-13 through Feature-16)

* **Feature-13: Actions Taken Foundation & Domain Model** (`Labsheet_4.pdf`, Section 1, 3, 4.1, 4.3, 4.4, 5.1, 5.2, 5.3, 6, 11; `SDS-SYS-001`, Section 6, 7, 8):
  * Evolve Prisma schema with a relational `ActionTaken` model linked to `Ticket`.
  * Support fields: Action Date/Time, Description, Result, Status (`PLANNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`), Performed By (auto-recorded), Assignee (optional active IT Staff), Follow-Up Required flag, Follow-Up Note, and Attachment Notes.
  * Non-destructive migration preserving existing Users, Tickets, Attachments, Comments, Notes, and Sessions.
  * Idempotent database seeding covering tickets with zero, one, and multiple Actions Taken.
  * REST API endpoints: list actions (`GET /api/v1/tickets/:id/actions`), create action (`POST /api/v1/tickets/:id/actions`), and update action (`PATCH /api/v1/tickets/:id/actions/:actionId`).
  * Strict server-side RBAC: IT Staff and Admins may create/update actions; Requesters are restricted to read-only access for owned tickets (`403 Forbidden` on write attempts).
  * Assignee validation ensuring inactive staff accounts cannot be assigned.

* **Feature-14: Actions Taken User Interface & Operations** (`Labsheet_4.pdf`, Section 7, 8.3, 11, 14 Part 6; `SDS-SYS-001`, Section 10):
  * Integrated Actions Taken area embedded within Ticket Detail views for both IT Staff and Requesters.
  * Responsive list/table on desktop (≥992px) collapsing to stacked cards on mobile (<768px).
  * Create mode and Edit mode for permitted IT Staff and Admins.
  * Auto-populated read-only `Performed By` display showing the authenticated user.
  * Dynamic validation: requiring Follow-Up Note if and only if Follow-Up Required is checked.
  * Distinct status badges, empty state when zero actions exist, busy states, and safe error feedback.
  * Complete suppression of create/edit controls for Requesters.

* **Feature-15: Enforced Ticket Lifecycle & Resolution Gate Workflow** (`Labsheet_4.pdf`, Section 1, 3, 4.1, 4.5, 6.1, 8.4, 11, 14 Part 7; `SDS-SYS-001`, Section 8, 9, 18):
  * Backend enforcement of the resolution gate: attempting to transition a Ticket to `RESOLVED` or `CLOSED` while any associated Action Taken is `PLANNED` or `IN_PROGRESS` is rejected with `HTTP 409 Conflict` (`TICKET_STATE_CONFLICT`).
  * Formal status changes restricted to IT Staff and Administrator (`403 Forbidden` for Requesters).
  * Advisory Requester confirmation (*"Problem Appears Resolved"*) recorded as audit flag/note without bypassing open action resolution rules.
  * Atomic cancellation: cancelling a ticket cascades cancellation to any open actions with the same cancellation reason.
  * Authorized reopening from `RESOLVED`, `CLOSED`, or `CANCELLED` transitioning to `IN_PROGRESS` (if owner assigned) or `NEW` (if unassigned).
  * Client Ticket Detail controls dynamically exposing only permitted transitions.

* **Feature-16: Role-Based Operational Dashboards** (`Labsheet_4.pdf`, Section 1, 3, 4.1, 4.6, 6.2, 7, 8.1, 8.2, 11, 14 Part 5, 8; `SDS-SYS-001`, Section 5, 9, 10):
  * Backend metrics aggregation endpoints: `GET /api/v1/dashboard/requester` and `GET /api/v1/dashboard/staff`.
  * Requester Dashboard: Displays authenticated user's metrics (`My Open Tickets`, `In Progress`, `Resolved`, `Closed`), recent tickets table, and quick actions (`+ Create Ticket`, `View My Tickets`).
  * IT Staff / Admin Dashboard: Displays operational queue metrics (`New`, `Open` / `Assigned`, `In Progress`, `Waiting for Requester` / `Pending Requester`, `My Assigned`), recent triage tickets table, and quick actions (`+ Create Ticket`, `Search Tickets`, `My Queue`).
  * Accessible metric cards with direct drill-down links to filtered lists.
  * Top-level "Dashboard" navigation item added to the application header with active-page state.
  * Authoritative backend calculations, bounded queries, empty states, and safe failure handling.

* **Final System Hardening & Regression** (`Labsheet_4.pdf`, Section 1, 7, 8.5, 8.6, 12, 14 Part 1, 9; `SDS-SYS-001`, Section 13, 16, 18):
  * Full regression pass over Labs 1–3: authentication, password change, My Tickets, Ticket Queue, Comments, Notes, Attachments, and User Management.
  * Double-submit prevention on buttons, responsive verification (mobile, tablet, desktop), and WCAG 2.2 AA accessibility audit.

### 3.2. Explicitly Excluded Scope

Per `Labsheet_4.pdf` Section 4.2 (p. 2) and `SDS-SYS-001` Section *Purpose and Scope* (pp. 3–4):
1. Automatic SLA clocks, countdown timers, escalation engines, on-call scheduling, and breach notifications;
2. Outbound email, SMS, LINE, mobile push, or webhook notification services;
3. Inventory consumption, spare-parts management, purchasing, or cost accounting for services;
4. Time-sheet billing, payroll integrations, or detailed hourly labor-cost calculations;
5. Multi-level approval chains and electronic signature captures;
6. Advanced business-intelligence (BI) tools, custom visual report builders, or external data export warehouses;
7. Multi-tenant database partitioning and production-scale cloud deployments (AWS/GCP/Azure);
8. Unapproved new product features not specified in this engineering contract.

---

## 4. GitHub Issues, Branches, Merge Order & Traceability

Sprint 4 is decomposed into four sequential feature issues followed by final hardening, executing strictly on feature branches merged into `lab4-staging`:

| Sequence | Issue Title | Branch Name | Scope & Deliverables | Target PR |
| :---: | :--- | :--- | :--- | :--- |
| **0** | `[Sprint-4] Engineering Contract & Specification` | `lab4-staging` | `specification.md`, `tests.md`, `ui-spec.md`, `api-spec.md` | Baseline |
| **1** | `[Feature-13] Actions Taken Foundation & Domain Model` | `feature/13-actions-taken-foundation` | Prisma schema migration, seed data, domain service, REST API endpoints, API integration tests | PR #34 &rarr; `lab4-staging` |
| **2** | `[Feature-14] Actions Taken UI on Ticket Detail` | `feature/14-actions-taken-ui` | Ticket Detail integration, list/card views, create/edit modal/form, client tests | PR #35 &rarr; `lab4-staging` |
| **3** | `[Feature-15] Enforced Ticket Workflow & Resolution Gate` | `feature/15-ticket-workflow-resolution-gate` | Backend resolution gate (409 conflict), atomic cancel/reopen, UI status controls, workflow tests | PR #36 &rarr; `lab4-staging` |
| **4** | `[Feature-16] Role-Based Operational Dashboards` | `feature/16-role-dashboards` | Requester & Staff dashboard APIs, dashboard pages, drill-down routing, UI & E2E tests | PR #37 &rarr; `lab4-staging` |
| **5** | `[Sprint-4] Final Hardening, Accessibility & Full Regression` | `lab4-staging` | Comprehensive regression suite, responsive polish, WCAG AA compliance, reviewer audit | PR #38 &rarr; `main` |

---

## 5. Functional Requirements (FR)

| FR ID | Feature Area | Description | Source Citation |
| :--- | :--- | :--- | :--- |
| **FR-29** | Feature-13 (Foundation) | The system shall persist Actions Taken records linked to a parent Ticket with relational integrity in PostgreSQL via Prisma. | `Labsheet_4.pdf`, Sec 1, 4.4 (`BR-01`), 5.1; `SDS-SYS-001`, p. 7 |
| **FR-30** | Feature-13 (Foundation) | Each Action Taken record shall support Action Date/Time, Description, Result, Status (`PLANNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`), Performed By (user reference), Assignee (optional user reference), Follow-Up Required (boolean), Follow-Up Note (string), and Attachment Notes (string). | `Labsheet_4.pdf`, Sec 3, 4.1, 8.3; `SDS-SYS-001`, p. 7 |
| **FR-31** | Feature-13 (Foundation) | The system shall automatically populate `performedBy` with the authenticated IT Staff or Administrator account creating the action. | `Labsheet_4.pdf`, Sec 3, 8.3 (`auto`), 9.1 (`AC-01`) |
| **FR-32** | Feature-13 (Foundation) | The system shall reject assigning an Action Taken to any inactive user account (`isActive: false`) with HTTP 422. | `Labsheet_4.pdf`, Sec 14 Part 6, p. 11 |
| **FR-33** | Feature-13 (Foundation) | The system shall provide `GET /api/v1/tickets/:id/actions` returning chronological actions for authorized ticket viewers. | `Labsheet_4.pdf`, Sec 4.3, 6, 8.3 |
| **FR-34** | Feature-13 (Foundation) | The system shall provide `POST /api/v1/tickets/:id/actions` allowing IT Staff and Admins to append actions. Requesters shall be rejected with HTTP 403 Forbidden. | `Labsheet_4.pdf`, Sec 4.3, 6, 9.1 (`AC-01`) |
| **FR-35** | Feature-13 (Foundation) | The system shall provide `PATCH /api/v1/tickets/:id/actions/:actionId` allowing IT Staff and Admins to update action details, status, or assignee. | `Labsheet_4.pdf`, Sec 4.3, 6, 8.3, 14 Part 6 |
| **FR-36** | Feature-13 (Foundation) | The database seed script shall be idempotent and seed tickets with zero, one, and multiple Actions Taken across diverse statuses. | `Labsheet_4.pdf`, Sec 5.3, p. 4 |
| **FR-37** | Feature-14 (Action UI) | The Ticket Detail screen shall display an Actions Taken section below core ticket metadata, rendering actions in stable chronological order. | `Labsheet_4.pdf`, Sec 8.3, 14 Part 6 |
| **FR-38** | Feature-14 (Action UI) | The Actions Taken section shall render a data table on desktop screens (≥992px) and collapse to stacked cards on mobile screens (<768px). | `Labsheet_4.pdf`, Sec 7, 8.3, 8.6 |
| **FR-39** | Feature-14 (Action UI) | The Actions Taken UI shall allow permitted IT Staff and Admins to create new actions via an inline or modal form with full client validation. | `Labsheet_4.pdf`, Sec 8.3, 14 Part 6 |
| **FR-40** | Feature-14 (Action UI) | The Actions Taken UI shall allow permitted IT Staff and Admins to edit existing actions, update status, and transition to completed/cancelled. | `Labsheet_4.pdf`, Sec 8.3, 14 Part 6 |
| **FR-41** | Feature-14 (Action UI) | The UI shall require a non-empty Follow-Up Note when Follow-Up Required is checked, and disable or clear it when unchecked. | `Labsheet_4.pdf`, Sec 3, 4.1, 8.3 |
| **FR-42** | Feature-14 (Action UI) | The UI shall render Actions Taken as strictly read-only for Requesters, completely suppressing create, edit, and status controls. | `Labsheet_4.pdf`, Sec 4.3, 8.3 |
| **FR-43** | Feature-15 (Workflow) | The backend shall prevent transitioning a Ticket to `RESOLVED` or `CLOSED` if any associated Action Taken is in `PLANNED` or `IN_PROGRESS` status, returning HTTP 409 Conflict (`TICKET_STATE_CONFLICT`). | `Labsheet_4.pdf`, Sec 4.5, 6.1; `SDS-SYS-001`, Sec 8, p. 11, Sec 9, p. 12 |
| **FR-44** | Feature-15 (Workflow) | Only IT Staff and Administrator shall be authorized to transition a Ticket to `RESOLVED` or `CLOSED`. | `Labsheet_4.pdf`, Sec 4.5; `SDS-SYS-001`, Sec 8, p. 11 |
| **FR-45** | Feature-15 (Workflow) | The Requester *"Problem Appears Resolved"* action shall record an advisory confirmation flag and audit note, but shall not directly update formal ticket status to `RESOLVED`. | `Labsheet_4.pdf`, Sec 3, 4.5; `SDS-SYS-001`, Sec 8, p. 11 |
| **FR-46** | Feature-15 (Workflow) | If Requester resolution confirmation is submitted while open Actions Taken remain, the system shall record the confirmation, warn the Ticket Owner, and leave ticket status unchanged. | `SDS-SYS-001`, Sec 8, p. 11 |
| **FR-47** | Feature-15 (Workflow) | Cancelling a ticket shall require a cancellation reason and atomically cancel all associated `PLANNED` and `IN_PROGRESS` actions. | `SDS-SYS-001`, Sec 8, p. 11 |
| **FR-48** | Feature-15 (Workflow) | Reopening a ticket from `RESOLVED`, `CLOSED`, or `CANCELLED` shall transition status to `IN_PROGRESS` if a Ticket Owner exists, or `NEW` if unassigned. | `SDS-SYS-001`, Sec 8, p. 11 |
| **FR-49** | Feature-16 (Dashboards) | The system shall provide `GET /api/v1/dashboard/staff` returning authoritative metric counts (`New`, `Open`/`Assigned`, `In Progress`, `Waiting for Requester`, `My Assigned`) and 5 recent triage tickets. | `Labsheet_4.pdf`, Sec 4.6, 6.2, 8.1 |
| **FR-50** | Feature-16 (Dashboards) | The system shall provide `GET /api/v1/dashboard/requester` returning metrics scoped strictly to the authenticated Requester (`My Open Tickets`, `In Progress`, `Resolved`, `Closed`) and 5 recent tickets. | `Labsheet_4.pdf`, Sec 4.6, 6.2, 8.2, 9.1 (`AC-02`) |
| **FR-51** | Feature-16 (Dashboards) | The frontend shall deliver dedicated Requester and IT Staff Dashboard screens matching `Labsheet_4.pdf` Section 8.1 and 8.2 with accessible metric cards and drill-down links. | `Labsheet_4.pdf`, Sec 8.1, 8.2 |
| **FR-52** | Feature-16 (Dashboards) | The application navigation header shall provide a top-level "Dashboard" link directing users to their role-appropriate dashboard view. | `Labsheet_4.pdf`, Sec 7, p. 5 |

---

## 6. Business Rules (BR)

| BR ID | Rule Name | Business Rule Statement | Enforcement Layer | Source Citation |
| :--- | :--- | :--- | :--- | :--- |
| **BR-01** | Ticket Association | An Action Taken record belongs to exactly one Ticket and cannot be transferred to another ticket. | Database (`ticketId` FK) & Service | `Labsheet_4.pdf`, Sec 4.4 (`BR-01`), p. 3 |
| **BR-02** | Independent Assignee | The Ticket Owner coordinates the Ticket, but an Action Taken may be performed by or assigned to any active IT Staff or Administrator member. | Backend Domain Service | `Labsheet_4.pdf`, Sec 4.4 (`BR-02`), p. 3; `SDS-SYS-001`, p. 8 |
| **BR-03** | Performed By Immutability | `performedById` is automatically set to the authenticated user on creation and cannot be modified or forged by client payloads. | Backend Controller / Service | `Labsheet_4.pdf`, Sec 3, 8.3 (`auto`), 9.1 (`AC-01`) |
| **BR-04** | Active Assignee Gate | An Action Taken assignee must be an active user (`isActive: true`) having role `IT_STAFF` or `ADMINISTRATOR`. Assignments to inactive accounts must be rejected with HTTP 422. | Backend Domain Service | `Labsheet_4.pdf`, Sec 14 Part 6, p. 11 |
| **BR-05** | Conditional Follow-Up Note | When `isFollowUpRequired` is `true`, `followUpNote` is mandatory (non-empty string, min 3 chars). When `isFollowUpRequired` is `false`, `followUpNote` is cleared/empty. | Client Form & Backend Validator | `Labsheet_4.pdf`, Sec 3, 4.1, 8.3 |
| **BR-06** | Resolution Gate | A Ticket cannot transition to status `RESOLVED` or `CLOSED` while any associated Action Taken is in `PLANNED` or `IN_PROGRESS` status. The backend must reject such transitions with HTTP 409 Conflict (`TICKET_STATE_CONFLICT`). | Backend Ticket Domain Service | `Labsheet_4.pdf`, Sec 4.5, 6.1; `SDS-SYS-001`, p. 11, 12 |
| **BR-07** | Resolution Prerequisite | Before a ticket can be resolved, every Action Taken associated with it must have reached a terminal state (`COMPLETED` or `CANCELLED`). | Backend Ticket Domain Service | `SDS-SYS-001`, Sec 8, p. 11 |
| **BR-08** | Advisory Requester Indication | A Requester's indication that the problem appears resolved is strictly advisory and records a confirmation timestamp and note without directly modifying formal ticket status. | Backend Controller | `Labsheet_4.pdf`, Sec 3, 4.5; `SDS-SYS-001`, p. 11 |
| **BR-09** | Open Actions Warning | If a Requester confirms resolution while open actions remain, the confirmation is recorded, the Ticket Owner is flagged/warned, and formal status remains unchanged. | Backend Ticket Service | `SDS-SYS-001`, Sec 8, p. 11 |
| **BR-10** | Cascade Cancellation | Cancelling a ticket requires a non-empty cancellation reason (min 5 chars) and atomically transitions all open (`PLANNED`, `IN_PROGRESS`) Actions Taken to `CANCELLED` using that reason. | Backend Transaction (Prisma) | `SDS-SYS-001`, Sec 8, p. 11 |
| **BR-11** | Reopening Logic | Any authenticated user with read access may reopen a ticket from `RESOLVED`, `CLOSED`, or `CANCELLED`. Reopening sets status to `IN_PROGRESS` if `ownerId` is present, or `NEW` if unassigned. Previously cancelled actions remain cancelled. | Backend Domain Service | `SDS-SYS-001`, Sec 8, p. 11 |
| **BR-12** | Optimistic Concurrency | Ticket and action modifications require an integer `version` field. A stale update returns HTTP 409 Conflict rather than overwriting newer concurrent work. | Backend Service | `SDS-SYS-001`, Sec 6, p. 9; `Labsheet_4.pdf`, Sec 6.1 |
| **BR-13** | Requester Action Write Ban | Requesters are strictly forbidden from creating, updating, or deleting Actions Taken (`HTTP 403 Forbidden`). Hiding controls in the UI is supplemented by strict backend enforcement. | Backend RBAC Middleware | `Labsheet_4.pdf`, Sec 4.3, p. 2 |
| **BR-14** | Requester Dashboard Isolation | The Requester Dashboard must calculate metrics and list recent tickets strictly scoped to `requesterId == req.user.id`. Data from other requesters must never be included. | Backend Query Scope | `Labsheet_4.pdf`, Sec 8.2, 9.1 (`AC-02`) |
| **BR-15** | Authoritative Calculations | Dashboard metrics must be computed dynamically by PostgreSQL queries on authoritative database records rather than calculated client-side from paginated slices. | Backend Query / Controller | `Labsheet_4.pdf`, Sec 4.6, 6.2 |
| **BR-16** | Stable Chronological Ordering | Actions Taken on Ticket Detail must be ordered deterministically by `actionDateTime` ascending (or `createdAt` ascending) to preserve an accurate chronological audit trail. | Backend Query / Client UI | `Labsheet_4.pdf`, Sec 14 Part 7, p. 11 |
| **BR-17** | Terminal Action States | An Action Taken that is `COMPLETED` or `CANCELLED` is in a terminal state; it cannot be reverted to `PLANNED` or `IN_PROGRESS`. | Backend Action Service | `SDS-SYS-001`, Sec 8, p. 12 |
| **BR-18** | Action Status Vocabulary | The Action Taken status vocabulary consists strictly of `PLANNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`. | Backend Schema & Enum | `SDS-SYS-001`, Sec 6, p. 7, Sec 8, p. 12 |

---

## 7. UI Specification Summary

The complete UI specification is documented in [`docs/lab-04/ui-spec.md`](file:///c:/Users/Maimoona%20Aziz/OneDrive/Desktop/toktickit/docs/lab-04/ui-spec.md). Core principles include:
1. **Design System Continuity**: Preserves the custom **Zen Green Design System** ([theme.css](file:///c:/Users/Maimoona%20Aziz/OneDrive/Desktop/toktickit/client/src/theme.css)) using primary green (`#006B3C`), secondary green (`#0B7A46`), background (`#F5F7F6`), card borders (`#DDE5E1`), and accessible semantic badges.
2. **Global Navigation**: Header shell updated with a "Dashboard" link for all authenticated users, routing dynamically based on role (`RequesterDashboard` vs. `StaffDashboard`).
3. **IT Staff Dashboard Screen**:
   - Welcome banner: "Welcome back, [Name]!", subtitle "Here's what's happening with your queue today", Refresh button.
   - Five metric cards: `New`, `Open` (`Assigned`), `In Progress`, `Waiting for Requester` (`Pending Requester`), and `My Assigned` with delta indicators (`+X from yesterday`).
   - Interactive drill-down: Clicking any card navigates to `/queue` with appropriate status/assignment filters pre-applied.
   - Quick Actions: `+ Create Ticket`, `Search Tickets`, `My Queue`.
   - My Recent Tickets: Table/card list displaying the 5 most recent tickets with direct links.
4. **Requester Dashboard Screen**:
   - Welcome banner: "Welcome, [Name]!", subtitle "Here's the latest on your requests".
   - Four metric cards: `My Open Tickets`, `In Progress`, `Resolved`, `Closed` with "View all" drill-down links to `/tickets`.
   - Quick Actions: `+ Create Ticket`, `View My Tickets`.
   - My Recent Tickets: Table/card list of the 5 most recent requester tickets.
5. **Actions Taken on Ticket Detail**:
   - Clean container added below ticket metadata on Ticket Detail.
   - Responsive presentation: desktop table collapsing to stacked cards on mobile devices.
   - Permitted IT Staff see "+ Add Action Taken" button, opening an accessible create form.
   - Inline/modal edit capabilities for existing actions.
   - Requesters see all actions in a clean, read-only layout with create/edit controls suppressed.
6. **Ticket Workflow Feedback**:
   - Resolution attempt when open actions exist triggers a clear modal/banner: *"Cannot resolve ticket: [N] action(s) remain open. Complete or cancel all actions taken before resolving."*
   - Status transitions dynamically filtered to allowed paths based on current ticket state.
7. **Accessibility (WCAG 2.2 AA)**:
   - Visible keyboard focus rings (`:focus-visible`).
   - Programmatic `<label>` elements for every input.
   - Semantic text and icons on all status and priority badges (never color alone).
   - Touch targets ≥ 44x44px; zero horizontal page scroll across all devices.

---

## 8. Data Changes & Migration Design

### 8.1. Relational Model: `ActionTaken`
The PostgreSQL schema evolves via Prisma migration adding the `ActionTaken` model:

```prisma
enum ActionStatus {
  PLANNED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

model ActionTaken {
  id                 Int          @id @default(autoincrement())
  ticketId           Int
  actionDateTime     DateTime     @default(now())
  description        String
  result             String?
  status             ActionStatus @default(PLANNED)
  performedById      Int
  assigneeId         Int?
  isFollowUpRequired Boolean      @default(false)
  followUpNote       String?
  attachmentNotes    String?
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt

  ticket             Ticket       @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  performedBy        User         @relation("ActionsPerformed", fields: [performedById], references: [id])
  assignee           User?        @relation("ActionsAssigned", fields: [assigneeId], references: [id])

  @@index([ticketId])
  @@index([performedById])
  @@index([assigneeId])
  @@index([status])
  @@index([actionDateTime])
  @@map("actions_taken")
}
```

### 8.2. Relation Extensions on Existing Models
- `Ticket`: Add `actions ActionTaken[]` relation.
- `User`: Add `actionsPerformed ActionTaken[] @relation("ActionsPerformed")` and `actionsAssigned ActionTaken[] @relation("ActionsAssigned")`.

### 8.3. Migration & Backfill Strategy
- **Non-destructive migration**: Schema migration adds the `actions_taken` table and `ActionStatus` enum without altering existing tables or discarding legacy data (`Labsheet_4.pdf`, Section 5.1, 5.2).
- **Legacy ticket handling**: Existing tickets from Labs 1–3 have 0 associated Actions Taken. Under resolution rules, tickets with 0 actions are eligible for resolution (since no actions remain `PLANNED` or `IN_PROGRESS`).
- **Seed data expansion**: Update [seed.ts](file:///c:/Users/Maimoona%20Aziz/OneDrive/Desktop/toktickit/server/prisma/seed.ts) to seed realistic tickets with 0, 1, and multiple Actions Taken across diverse states (`PLANNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`) to validate both zero and non-zero dashboard metrics.

---

## 9. API Contract Summary

The full REST API contract is specified in [`docs/lab-04/api-spec.md`](file:///c:/Users/Maimoona%20Aziz/OneDrive/Desktop/toktickit/docs/lab-04/api-spec.md). Key endpoints include:

| Method | Endpoint | Allowed Roles | Description | Status Codes |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/tickets/:id/actions` | Requester (owned), Staff, Admin | List all Actions Taken for a ticket in chronological order | 200, 401, 403, 404 |
| `POST` | `/api/v1/tickets/:id/actions` | IT Staff, Admin | Create a new Action Taken line under the ticket | 201, 400, 401, 403, 404, 422 |
| `PATCH` | `/api/v1/tickets/:id/actions/:actionId` | IT Staff, Admin | Update an existing Action Taken record (status, result, note) | 200, 400, 401, 403, 404, 409, 422 |
| `PATCH` | `/api/v1/tickets/:id` | IT Staff, Admin | Update ticket operational fields / status (Enforces resolution gate) | 200, 400, 401, 403, 404, 409, 422 |
| `GET` | `/api/v1/dashboard/requester` | Requester | Retrieve authenticated Requester's metrics & recent tickets | 200, 401, 403 |
| `GET` | `/api/v1/dashboard/staff` | IT Staff, Admin | Retrieve operational queue metrics & recent triage tickets | 200, 401, 403 |

### Resolution Gate Conflict Response (HTTP 409):
```json
{
  "error": {
    "code": "TICKET_STATE_CONFLICT",
    "message": "Ticket cannot be resolved while actions taken remain open. Please complete or cancel all actions taken before resolving.",
    "fieldErrors": [
      {
        "field": "status",
        "message": "There are 2 open action(s) taken on this ticket."
      }
    ],
    "correlationId": "req-1728470000-conflict1"
  }
}
```

---

## 10. Acceptance Criteria (AC)

| AC ID | Target Feature | Acceptance Criterion | Source Citation |
| :--- | :--- | :--- | :--- |
| **AC-01** | Feature-13 (Actions Taken) | Given an authenticated IT Staff or Admin user and valid action payload, when an Action Taken is created, then it is saved under the specified Ticket with the authenticated creator as `performedBy` and the approved assignee. | `Labsheet_4.pdf`, Sec 9.1 (`AC-01`), p. 8 |
| **AC-02** | Feature-16 (Dashboards) | Given an authenticated Requester, when dashboard data is retrieved via `GET /api/v1/dashboard/requester`, then only metrics and recent Tickets owned strictly by that Requester are returned. | `Labsheet_4.pdf`, Sec 9.1 (`AC-02`), p. 8 |
| **AC-03** | Feature-14 (Action UI) | Given an authenticated IT Staff user viewing Ticket Detail, when they submit the Add Action Taken form with valid data, then the new action appears immediately in the Actions Taken table without full page reload. | `Labsheet_4.pdf`, Sec 8.3, 9.1, 10 (`AC-03`), p. 8 |
| **AC-04** | Feature-13 (Actions Taken) | Given an authenticated Requester user, when they attempt to create or modify an Action Taken via API or UI, then the request is rejected with HTTP 403 Forbidden and no data is altered. | `Labsheet_4.pdf`, Sec 4.3, p. 2 |
| **AC-05** | Feature-13 (Actions Taken) | Given an IT Staff user creating an Action Taken, when they assign it to an inactive user account, then the request is rejected with HTTP 422 Unprocessable Entity. | `Labsheet_4.pdf`, Sec 14 Part 6, p. 11 |
| **AC-06** | Feature-14 (Action UI) | Given an IT Staff user in the Action Taken form, when Follow-Up Required is checked and Follow-Up Note is empty, then submission is blocked with an accessible inline validation error. | `Labsheet_4.pdf`, Sec 3, 4.1, 8.3 |
| **AC-07** | Feature-15 (Workflow) | Given a Ticket with at least one Action Taken in `PLANNED` or `IN_PROGRESS` status, when an IT Staff user attempts to transition status to `RESOLVED` or `CLOSED`, then the API rejects the transition with HTTP 409 Conflict (`TICKET_STATE_CONFLICT`) and ticket status remains unchanged. | `Labsheet_4.pdf`, Sec 4.5, 6.1; `SDS-SYS-001`, p. 11, 12 |
| **AC-08** | Feature-15 (Workflow) | Given a Ticket with all Actions Taken in `COMPLETED` or `CANCELLED` status, when an IT Staff user transitions status to `RESOLVED` with a resolution summary, then the transition succeeds with HTTP 200 and status updates to `RESOLVED`. | `Labsheet_4.pdf`, Sec 4.5; `SDS-SYS-001`, p. 11 |
| **AC-09** | Feature-15 (Workflow) | Given a Ticket in any non-Cancelled status with open Actions Taken, when an authorized user cancels the ticket with a reason, then the ticket status updates to `CANCELLED` and all open actions atomically transition to `CANCELLED`. | `SDS-SYS-001`, Sec 8, p. 11 |
| **AC-10** | Feature-15 (Workflow) | Given a Ticket in `RESOLVED`, `CLOSED`, or `CANCELLED` status, when an authorized user reopens it, then the ticket transitions to `IN_PROGRESS` (if owner exists) or `NEW` (if unassigned). | `SDS-SYS-001`, Sec 8, p. 11 |
| **AC-11** | Feature-16 (Dashboards) | Given an authenticated IT Staff user, when they access `/dashboard`, then the IT Staff Dashboard renders accurate metric counts (`New`, `Open`, `In Progress`, `Waiting for Requester`, `My Assigned`), recent tickets, and functional drill-down navigation to `/queue`. | `Labsheet_4.pdf`, Sec 8.1, p. 5 |
| **AC-12** | Feature-16 (Dashboards) | Given an authenticated IT Staff user, when they click on a dashboard metric card (e.g. `New`), then they are redirected to the Ticket Queue filtered by status `New`. | `Labsheet_4.pdf`, Sec 4.6, 8.1, p. 5 |

---

## 11. Assumptions and Decisions

In accordance with Spec-Driven Development, all decisions below are strictly categorized as either **Source Requirement** (mandated by SDS or Labsheet) or **Proposed Decision** (student/team engineering choice resolving unspecified details):

| Item ID | Topic | Category | Choice / Formulation | Rationale & Source Reference |
| :--- | :--- | :--- | :--- | :--- |
| **DEC-01** | Design System & Palette | **Source Requirement** | Zen Green Design System (`#006B3C`, `#0B7A46`, `#F5F7F6`) | `Labsheet_4.pdf` Section 3, 7, 14 explicitly overrides `SDS-SYS-001` KMUTT palette (`D-09`) in favor of Zen Green continuity. |
| **DEC-02** | Status Vocabulary Mapping | **Proposed Decision** | Prisma enum: `NEW`, `ASSIGNED`, `IN_PROGRESS`, `PENDING_REQUESTER`, `RESOLVED`, `CLOSED`, `CANCELLED`. UI displays "Open" for `ASSIGNED` and "Waiting for Requester" for `PENDING_REQUESTER`. | Preserves existing database enum without breaking migrations, while matching Labsheet 4 UI mockup card labels (`Labsheet_4.pdf`, Sec 8.1). |
| **DEC-03** | Reopen Target Status | **Source Requirement** | Transition to `IN_PROGRESS` if `ownerId` exists; transition to `NEW` if unassigned. | Explicit invariant in `SDS-SYS-001` Section 8, p. 11. |
| **DEC-04** | Action Taken Entity Name | **Proposed Decision** | Model name `ActionTaken` mapped to database table `actions_taken`. | Merges `SDS-SYS-001` `ServiceAction` concept with Labsheet 4 `Actions Taken` terminology. |
| **DEC-05** | Primary Key Type | **Proposed Decision** | Integer autoincrement `id Int @id @default(autoincrement())` for `ActionTaken`. | Maintains consistency with existing integer IDs in `Ticket`, `User`, `Attachment`, avoiding breaking changes. |
| **DEC-06** | Dashboard Yesterday Deltas | **Proposed Decision** | Delta counters on dashboard cards (`+X from yesterday`) are calculated from tickets created or updated in the prior 24-hour window, defaulting to `0` if no historical changes exist. | Resolves visual indicator in mockup without requiring external time-series infrastructure. |
| **DEC-07** | Dashboard Recent Tickets Count | **Proposed Decision** | Fixed limit of 5 most recent tickets returned in dashboard payloads. | Balances summary conciseness with operational utility (`Labsheet_4.pdf`, Sec 6.2). |
| **DEC-08** | Storage Engine Continuity | **Proposed Decision** | Local Multer filesystem storage in `server/uploads/` retained from Lab 2/3. | Conforms to single-server local deployment and Lab 4 exclusion of cloud infrastructure (`Labsheet_4.pdf`, Sec 4.2). |

---

## 12. Product Definition of Done (DoD)

Sprint 4 is complete when all of the following verifiable conditions are met:
1. **Contract Integrity**: All four specification documents (`specification.md`, `tests.md`, `ui-spec.md`, `api-spec.md`) are approved and committed before implementation merges.
2. **Schema & Migration**: Prisma migration executes cleanly on a fresh database and applies non-destructively to the existing Lab 3 database.
3. **Seed Data**: `npm run prisma:seed` executes idempotently and populates tickets with 0, 1, and multiple Actions Taken.
4. **Automated Test Coverage**: 100% of planned tests in `tests.md` pass across unit, API integration, client component, and Playwright E2E tiers.
5. **Full Regression**: All Lab 1, 2, and 3 automated tests pass with zero regressions.
6. **Backend RBAC Authority**: All write operations for Actions Taken, status changes, and dashboard scopes are strictly verified on the backend.
7. **Zen Green UI Consistency**: All screens adhere to the Zen Green design tokens; no clipped controls, horizontal overflow, or raw error stack traces.
8. **Accessibility**: Form controls have programmatic labels; status/priority badges use text and icons; modal dialogs trap focus.
9. **Git Workflow**: Features developed on isolated branches (`feature/13-*` through `feature/16-*`), peer-reviewed, merged into `lab4-staging`, and finally merged into `main`.
10. **Evidence & Documentation**: Screenshot artifacts cataloged under `artifacts/lab-04/screenshots/`, and `docs/lab-04/reviewer.md` and `ai-use.md` completed.
