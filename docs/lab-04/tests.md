# Lab 4 Test Plan and Traceability

**Document ID**: TEST-LAB-04  
**Version**: 1.0  
**Status**: Completed / 100% Passing Baseline  
**Handout Reference**: `docs/lab-04/Labsheet_4.pdf` (Section 10 & 12, pp. 8–10)  
**Parent Specification**: `docs/TokTickIT-System-Level-SDS-v1.0.pdf` (Section 18, pp. 17–18)  
**Target Branch**: `lab4-staging`  

---

## 1. Test Strategy & Quality Gates

TokTickIT enforces a disciplined Test-Driven Development (TDD) and Spec-Driven Development (SDD) engineering standard. Test suites are planned and implemented alongside feature development before merging to `lab4-staging`. Every Acceptance Criterion (`AC-01` through `AC-12`), Functional Requirement (`FR-29` through `FR-52`), and Business Rule (`BR-01` through `BR-18`) is backed by traceable automated tests across eight verification boundaries:

1. **Unit Tests (Vitest)**:
   * Pure domain logic: Action Taken field validators (e.g., conditional follow-up note requirement), status transition matrix checks (including reopen rules and terminal action states), and DTO mapping without database or network dependencies.
2. **API Integration Tests (Vitest + Supertest)**:
   * Direct execution against an isolated PostgreSQL test database verifying:
     - Actions Taken CRUD, auto-population of `performedBy`, and inactive-assignee rejection.
     - Ticket workflow resolution gate: ensuring tickets with open actions cannot transition to `RESOLVED` or `CLOSED` (`HTTP 409 Conflict`).
     - Requester advisory resolution confirmation without bypassing open actions.
     - Cascade cancellation of open actions when ticket is cancelled.
     - Authoritative calculation of Requester and IT Staff dashboard metrics and isolation of requester data.
3. **UI Component Tests (Vitest + React Testing Library + jsdom)**:
   * Verification of React presentation components:
     - Actions Taken section embedded within Ticket Detail: list/table rendering, form input validation, conditional follow-up note visibility, and suppression of edit/create controls for Requesters.
     - Requester and IT Staff Dashboards: metric card rendering, delta indicators, recent tickets table, and quick actions.
     - Ticket workflow status controls and resolution-blocking user feedback.
4. **End-to-End Browser Tests (Playwright)**:
   * Real browser execution verifying complete multi-role workflows:
     - Actions Taken lifecycle (create, view, edit status to Completed/Cancelled).
     - Ticket resolution blocked by open actions, followed by successful resolution once all actions are completed.
     - Dashboard operational workflows, card clicks, and drill-down navigation to filtered queue/ticket lists.
5. **Authorization & Security Tests**:
   * Verification that Requesters attempting to create/update Actions Taken receive `HTTP 403 Forbidden`.
   * Requesters attempting to access `/api/v1/dashboard/staff` receive `HTTP 403 Forbidden`.
   * Cross-requester isolation: Requesters cannot retrieve dashboard metrics or actions for tickets owned by other users.
6. **Concurrency & Conflict Handling**:
   * Optimistic concurrency validation: updating Actions Taken or Tickets with stale version returns `HTTP 409 Conflict`.
7. **Migration & Seed Verification**:
   * Verification that Prisma migrations apply cleanly from the Lab 3 baseline without dropping existing data, and `prisma/seed.ts` runs idempotently.
8. **Full Regression Verification**:
   * Continuous verification that all existing test suites from Lab 1, Lab 2, and Lab 3 pass with 100% pass rates.

---

## 2. Planned Test Inventory

> **Note on Test Execution Tracking**: In accordance with TDD principles, all tests began with status **Planned / Not Passed** prior to implementation. All feature branches have been implemented and verified, and all automated test suites across unit, API, UI, E2E, and regression tiers have achieved 100% passing status.

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **UT-04** | Unit | BR-05, FR-41 | Action Taken conditional follow-up note validator | Validates that `followUpNote` is mandatory when `isFollowUpRequired` is `true`; valid when `isFollowUpRequired` is `false` | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| **UT-05** | Unit | BR-06, BR-07, FR-43 | Ticket resolution gate rule function | Returns false if any action status is `PLANNED` or `IN_PROGRESS`; returns true only when all actions are `COMPLETED` or `CANCELLED` | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| **UT-06** | Unit | BR-11, FR-48 | Reopen status calculation rule | Returns `IN_PROGRESS` if `ownerId` exists; returns `NEW` if unassigned | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| **UT-07** | Unit | BR-17, BR-18 | Action status transition validation | Rejects transitions from terminal states (`COMPLETED`, `CANCELLED`); allows `PLANNED` &rarr; `IN_PROGRESS` / `CANCELLED` | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| **API-03** | API | AC-01, FR-30, FR-31 | Create valid Action Taken by IT Staff | Action saved under target ticket; `performedBy` auto-set to calling actor; returns HTTP 201 | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| **API-22** | API | FR-33 | List Actions Taken for ticket (`GET /api/v1/tickets/:id/actions`) | Returns HTTP 200 with chronological list of actions; includes performer and assignee details | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| **API-22b**| API | FR-33, BR-13 | Cross-Requester BOLA isolation on `GET /actions` | Requester A attempting to read Requester B ticket actions receives 403 Forbidden | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| **API-23** | API | FR-35, AC-03 | Update Action Taken status and result (`PATCH /actions/:id`) | Updates action status (e.g. to `COMPLETED`), sets result notes, supports unassign, returns 200 | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| **API-23b**| API | FR-35 | Cross-ticket action ID mismatch on `PATCH` | Mismatched `:id` and `:actionId` returns HTTP 404 Not Found | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| **API-24** | API | AC-04, FR-34, BR-13 | Requester attempts to create Action Taken | Request rejected with HTTP 403 Forbidden; zero records inserted | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| **API-25** | API | AC-04, FR-35, BR-13 | Requester attempts to modify Action Taken | Request rejected with HTTP 403 Forbidden; action unchanged | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| **API-26** | API | AC-05, FR-32, BR-04 | Assign Action Taken to inactive user | Rejected with HTTP 422 `INACTIVE_ASSIGNEE_ERROR` | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| **API-27** | API | BR-02 | Assign Action Taken to IT Staff member different from Ticket Owner | Succeeds with HTTP 201; preserves distinct owner and action assignee | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| **API-28** | API | AC-07, FR-43, BR-06 | Attempt ticket resolution with open Actions Taken | Rejected with HTTP 409 Conflict (`TICKET_STATE_CONFLICT`); status remains unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| **API-29** | API | AC-08, FR-43, BR-07 | Resolve ticket after all Actions Taken completed or cancelled | Succeeds with HTTP 200; ticket status updates to `RESOLVED` | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| **API-30** | API | FR-44 | Requester attempts to directly set ticket to Resolved or Closed | Rejected with HTTP 403 Forbidden | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| **API-31** | API | FR-45, BR-08, BR-09 | Requester submits "Problem Appears Resolved" with open actions | Succeeds with HTTP 200; records confirmation flag/note; formal status unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| **API-32** | API | AC-09, FR-47, BR-10 | Ticket cancellation cascades to open actions | Ticket status becomes `CANCELLED`; all open actions atomically transition to `CANCELLED` | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| **API-33** | API | AC-10, FR-48, BR-11 | Authorized user reopens assigned ticket | Reopens ticket to `IN_PROGRESS`; previously cancelled actions remain cancelled | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| **API-34** | API | AC-10, FR-48, BR-11 | Authorized user reopens unassigned ticket | Reopens ticket to `NEW` | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| **API-35** | API | BR-12 | Stale update detection on Action Taken | Submitting outdated version returns HTTP 409 Conflict | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| **API-36** | API | AC-02, FR-50, BR-14 | Retrieve Requester Dashboard data (`GET /dashboard/requester`) | Returns HTTP 200; metrics and recent tickets strictly scoped to calling requester | `server/tests/lab-04/requester-dashboard.api.test.ts` | Pass |
| **API-37** | API | FR-50, BR-14 | Cross-requester data isolation in dashboard | Requester B dashboard returns 0 tickets and 0 counts when only Requester A has tickets | `server/tests/lab-04/requester-dashboard.api.test.ts` | Pass |
| **API-38** | API | FR-49, AC-11 | Retrieve IT Staff Dashboard data (`GET /dashboard/staff`) | Returns HTTP 200 with queue metrics (`New`, `Open`, `In Progress`, etc.) and recent triage tickets | `server/tests/lab-04/staff-dashboard.api.test.ts` | Pass |
| **API-39** | API | FR-49 | Requester attempts to access IT Staff Dashboard API | Rejected with HTTP 403 Forbidden | `server/tests/lab-04/staff-dashboard.api.test.ts` | Pass |
| **API-40** | API | FR-49, AC-11 | Administrator accesses IT Staff Dashboard API | Administrator successfully retrieves IT Staff dashboard data (HTTP 200) | `server/tests/lab-04/staff-dashboard.api.test.ts` | Pass |
| **UI-11** | UI | FR-37, FR-38 | Actions Taken section rendering on Ticket Detail | Renders actions table/cards, headers, status badges, and empty state when 0 actions | `client/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| **UI-12** | UI | FR-39, AC-03 | Add Action Taken form submission | Calls API, handles loading spinner, displays newly added action upon success | `client/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| **UI-13** | UI | FR-41, AC-06, BR-05 | Follow-Up Note conditional validation in UI | Shows validation error when Follow-Up Required is checked and note is empty | `client/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| **UI-14** | UI | FR-42, AC-04 | Actions Taken view in Requester Ticket Detail | Renders actions as read-only; "+ Add Action Taken" button is completely absent | `client/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| **UI-15** | UI | FR-43, AC-07 | Ticket Detail resolution blocked feedback | Displays accessible error alert when attempting to resolve with open actions | `client/tests/lab-04/TicketWorkflow.test.tsx` | Pass |
| **UI-16** | UI | FR-45 | Permitted status transitions dropdown | Only exposes valid next status choices based on current ticket state | `client/tests/lab-04/TicketWorkflow.test.tsx` | Pass |
| **UI-17** | UI | FR-51, AC-11 | Staff Dashboard UI rendering | Renders 5 metric cards, deltas, recent tickets table, and quick action buttons | `client/tests/lab-04/StaffDashboard.test.tsx` | Pass |
| **UI-18** | UI | FR-51, AC-12 | Staff Dashboard metric card drill-down navigation | Clicking a card triggers navigation with appropriate query filters (e.g. `/queue?status=NEW`) | `client/tests/lab-04/StaffDashboard.test.tsx` | Pass |
| **UI-19** | UI | FR-50, FR-51 | Requester Dashboard UI rendering | Renders 4 metric cards, recent tickets list, and quick actions; verifies empty states | `client/tests/lab-04/RequesterDashboard.test.tsx` | Pass |
| **UI-20** | UI | FR-52 | Header Navigation bar Dashboard link | Renders active "Dashboard" nav link directing Requesters and Staff to appropriate views | `client/tests/lab-04/StaffDashboard.test.tsx` | Pass |
| **E2E-02** | E2E | AC-01, AC-03 | Actions Taken full lifecycle flow | IT Staff logs in, opens ticket, adds action, edits action to Completed; verifies persistence | `e2e/lab-04/actions-taken-flow.spec.ts` | Pass |
| **E2E-03** | E2E | AC-07, AC-08 | Ticket resolution gate enforcement flow | IT Staff attempts resolution with open action (blocked), completes action, then successfully resolves ticket | `e2e/lab-04/ticket-resolution.spec.ts` | Pass |
| **E2E-04** | E2E | AC-11, AC-12 | Operational dashboards and drill-down flow | IT Staff visits dashboard, inspects metrics, clicks "New" card, arrives at filtered queue | `e2e/lab-04/dashboards.spec.ts` | Pass |
| **MIG-01** | Migration | FR-29, FR-36 | Clean database install & migration from Lab 3 baseline | Migrates database cleanly without schema drift or error; seeds data idempotently | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| **REG-01** | Regression | - | Lab 1 API health check & category listing | All Lab 1 health and category endpoints remain 100% operational | `server/tests/lab-01/` | Pass |
| **REG-02** | Regression | - | Lab 2 Requester ticket creation, listing, attachments | Full Lab 2 Requester test suite passes with zero failures | `server/tests/lab-02/`, `client/tests/lab-02/` | Pass |
| **REG-03** | Regression | - | Lab 3 Authentication, staff queue, comments/notes, admin | Full Lab 3 test suite passes with zero failures | `server/tests/lab-03/`, `client/tests/lab-03/` | Pass |

---

## 3. Traceability Matrix

| Acceptance Criterion | Functional Requirement | Business Rule | Unit / Integration Test | UI Component Test | E2E Browser Test |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **AC-01** | FR-30, FR-31, FR-34 | BR-01, BR-02, BR-03 | `API-03`, `API-27` | `UI-12` | `E2E-02` |
| **AC-02** | FR-50 | BR-14, BR-15 | `API-36`, `API-37` | `UI-19` | `E2E-04` |
| **AC-03** | FR-35, FR-37, FR-39 | BR-16 | `API-23` | `UI-11`, `UI-12` | `E2E-02` |
| **AC-04** | FR-34, FR-35, FR-42 | BR-13 | `API-24`, `API-25` | `UI-14` | `actions-taken-flow.spec.ts` |
| **AC-05** | FR-32 | BR-04 | `API-26` | `UI-12` | - |
| **AC-06** | FR-41 | BR-05 | `UT-04` | `UI-13` | - |
| **AC-07** | FR-43 | BR-06, BR-07 | `UT-05`, `API-28` | `UI-15` | `E2E-03` |
| **AC-08** | FR-43 | BR-06, BR-07 | `API-29` | `UI-15` | `E2E-03` |
| **AC-09** | FR-47 | BR-10 | `API-32` | `UI-16` | `ticket-resolution.spec.ts` |
| **AC-10** | FR-48 | BR-11 | `UT-06`, `API-33`, `API-34` | `UI-16` | `ticket-resolution.spec.ts` |
| **AC-11** | FR-49 | BR-15 | `API-38`, `API-40` | `UI-17` | `E2E-04` |
| **AC-12** | FR-49, FR-51 | - | `API-38` | `UI-18` | `E2E-04` |

---

## 4. Test Execution & Verification Commands

All test tiers are executed using standard package scripts:

```bash
# 1. Run all unit and integration tests (Server + Client)
npm test

# 2. Run server API tests only
npm run test:server

# 3. Run client component tests only
npm run test:client

# 4. Run targeted Lab 4 server tests
npm --prefix server test -- tests/lab-04/

# 5. Run targeted Lab 4 client tests
npm --prefix client test -- tests/lab-04/

# 6. Run Playwright End-to-End tests
npm run test:e2e
```
