# Lab 3 Test Plan and Traceability

**Document ID**: TEST-LAB-03  
**Version**: 1.0  
**Status**: Planned / Test-Driven Development (TDD) Baseline  
**Handout Reference**: `docs/lab-03/Lab_3_sheet.pdf` (Section 10 & 12, pp. 14–16)  
**Parent Specification**: `docs/TokTickIT-System-Level-SDS-v1.0.pdf` (Section *Testing Architecture*, p. 17–18)  
**Target Branch**: `lab3-staging`  

---

## 1. Test Strategy

TokTickIT enforces a disciplined Test-Driven Development (TDD) methodology. Test specifications and automated test suites are authored prior to or alongside implementation. Every Acceptance Criterion (AC), Functional Requirement (FR), and Business Rule (BR) is backed by traceable automated verification across multiple boundaries:

1. **Unit Tests (Vitest)**:
   * Verification of pure domain logic, input validators, password policy checks, ticket status transition state machines, and DTO mappers without network or database dependencies.
2. **API Integration Tests (Vitest + Supertest)**:
   * Direct route execution against an isolated PostgreSQL database to verify Argon2id authentication, session cookies, server-side RBAC, queue filtering/sorting/pagination queries, ticket ownership mutations, comment/note segregation, and Administrator safety rules.
3. **UI Component Tests (Vitest + React Testing Library + jsdom)**:
   * Testing React presentation components, form submission states, busy spinners, password requirement indicators, role-restricted navigation, comments/notes rendering, and admin modal dialogs.
4. **End-to-End (E2E) Browser Tests (Playwright)**:
   * Real browser execution covering complete multi-user workflows: login with initial password and forced password change, IT Staff queue triage and ticket ownership claiming, public commenting vs. internal notes, requester resolution indication, and administrator user lifecycle management.
5. **Security & Authorization Verification**:
   * Direct HTTP requests to verify that unauthenticated calls receive HTTP 401, unauthorized role access receives HTTP 403, and client-supplied spoofing parameters (e.g. `requesterId`) are completely ignored.
6. **Regression Verification**:
   * Continuous verification that all existing Lab 1 health checks and Lab 2 Requester ticketing features (creation, listing, detail, attachment soft-removal) remain fully functional.

---

## 2. Planned Tests

> **Note on Test Execution Tracking**: All planned tests initially start as **Not Passed**. During each feature implementation, the corresponding test suites are executed, and their status in this matrix is updated to **Pass** (or **Fail**) based on actual verification results.

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **UT-01** | Unit | BR-15 | Password complexity validator | Rejects <8 chars, missing uppercase, missing number, or missing special char; accepts valid passwords | `server/tests/lab-03/validation.test.ts` | Pass |
| **UT-02** | Unit | BR-08 | Ticket status transition state machine | Allows valid transitions (`New` &rarr; `In Progress`); rejects invalid jumps (`New` &rarr; `Closed`) | `server/tests/lab-03/status-transition.test.ts` | Not Passed |
| **UT-03** | Unit | BR-10 | Comment and note content validator | Rejects empty strings and whitespace-only text; accepts 1–2000 chars; rejects >2000 chars | `server/tests/lab-03/validation.test.ts` | Not Passed |
| **API-01** | API | FR-01, BR-01, AC-01 | Valid user login | Returns HTTP 200, sets `HttpOnly` session cookie, returns user profile DTO | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-02** | API | FR-01, BR-01 | Login with invalid email or password | Returns HTTP 401 `INVALID_CREDENTIALS` with generic message | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-03** | API | FR-02, BR-01, AC-05 | Login with inactive user account | Returns HTTP 403 `ACCOUNT_INACTIVE` without leaking internal account details | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-04** | API | FR-03, AC-01 | Current authenticated user retrieval (`GET /me`) | Returns HTTP 200 with authenticated user identity, display name, and role | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-05** | API | FR-05, BR-02, AC-02 | Mandatory password change (`POST /change-password`) | Accepts valid new password, updates hash, clears `mustChangePassword` flag, returns 200 | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-06** | API | FR-06, AC-14 | User logout (`POST /logout`) | Invalidates session in database, clears session cookie, returns HTTP 200 | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-07** | API | FR-03, BR-03, AC-03 | Requester ticket scoping & spoof rejection | API binds ticket operations to session user; client-supplied `requesterId` is ignored | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| **API-08** | API | FR-12, AC-06 | Requester attempts to access IT Staff queue | Returns HTTP 403 Forbidden | `server/tests/lab-03/authorization.api.test.ts` | Not Passed |
| **API-09** | API | FR-19, BR-04, AC-04 | Requester attempts to read or post Internal Notes | Returns HTTP 403 Forbidden; zero note content exposed | `server/tests/lab-03/authorization.api.test.ts` | Not Passed |
| **API-10** | API | FR-28, AC-13 | Non-Administrator attempts to access Admin API | Returns HTTP 403 Forbidden | `server/tests/lab-03/authorization.api.test.ts` | Not Passed |
| **API-11** | API | FR-15 | Requester attempts to modify IT Priority | Returns HTTP 403 Forbidden | `server/tests/lab-03/authorization.api.test.ts` | Not Passed |
| **API-12** | API | FR-16, BR-05 | Requester attempts to transition status to Resolved/Closed | Returns HTTP 403 Forbidden | `server/tests/lab-03/authorization.api.test.ts` | Not Passed |
| **API-13** | API | FR-08, FR-09, AC-06 | IT Staff Queue search across Ticket No and Summary | Returns HTTP 200 with matching tickets and pagination counts | `server/tests/lab-03/staff-queue.api.test.ts` | Not Passed |
| **API-14** | API | FR-10 | IT Staff Queue filtering by Category, Status, Priority | Returns HTTP 200 with tickets satisfying all active query filters | `server/tests/lab-03/staff-queue.api.test.ts` | Not Passed |
| **API-15** | API | FR-10 | IT Staff Queue filtering by Assignment (Unassigned/Mine) | Correctly isolates unassigned tickets or tickets owned by calling IT Staff | `server/tests/lab-03/staff-queue.api.test.ts` | Not Passed |
| **API-16** | API | FR-11 | IT Staff Queue sorting and pagination bounds | Correctly applies `sortBy`, `sortOrder`, `page`, and `pageSize` | `server/tests/lab-03/staff-queue.api.test.ts` | Not Passed |
| **API-17** | API | FR-08 | Administrator access to IT Staff Queue | Administrator successfully retrieves queue data (HTTP 200) | `server/tests/lab-03/staff-queue.api.test.ts` | Not Passed |
| **API-18** | API | FR-13 | Retrieve IT Staff Ticket Detail (`GET /tickets/:id`) | Returns full ticket metadata, assigned owner, attachments, comments, and notes | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Not Passed |
| **API-19** | API | FR-14, BR-06, AC-07 | IT Staff claims unassigned ticket or reassigns owner | Updates `ownerId` in database, increments version, returns updated ticket DTO | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Not Passed |
| **API-20** | API | FR-15, BR-07, AC-08 | IT Staff updates IT Priority (`PATCH /tickets/:id`) | Updates `itPriority`; `requestedPriority` remains strictly unchanged | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Not Passed |
| **API-21** | API | FR-16, BR-08 | IT Staff updates status through permitted transitions | Succeeds for valid next status; rejects invalid transitions with HTTP 422 | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Not Passed |
| **API-22** | API | BR-16 | Concurrency conflict detection on ticket update | Update with stale `version` returns HTTP 409 Conflict | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Not Passed |
| **API-23** | API | FR-17, BR-04, AC-10 | Post and retrieve Public Comments | Appends comment, tracks author and timestamp, returns in chronological order | `server/tests/lab-03/comments-notes.api.test.ts` | Not Passed |
| **API-24** | API | FR-18, BR-04 | IT Staff posts and retrieves Internal Notes | Appends note, tracks author and timestamp, visible to IT Staff and Admin | `server/tests/lab-03/comments-notes.api.test.ts` | Not Passed |
| **API-25** | API | BR-10 | Reject empty/whitespace-only comments and notes | Submitting whitespace-only body returns HTTP 422 Unprocessable Entity | `server/tests/lab-03/comments-notes.api.test.ts` | Not Passed |
| **API-26** | API | FR-20, BR-05, AC-09 | Requester submits "Problem Appears Resolved" | Records confirmation timestamp/flag; ticket formal status is unchanged | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Not Passed |
| **API-27** | API | FR-21 | Attachment upload and soft-removal continuity | Lab 2 attachment upload, streaming, and soft-removal with reason continue to pass | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Not Passed |
| **API-28** | API | FR-22, FR-23 | Administrator retrieves user list with search/filter | Returns HTTP 200 with user list filtered by name/email or role | `server/tests/lab-03/users-admin.api.test.ts` | Not Passed |
| **API-29** | API | FR-24, BR-11, AC-11 | Administrator creates user with initial password | Persists user with Argon2id hash, flags `mustChangePassword = true`, returns 201 | `server/tests/lab-03/users-admin.api.test.ts` | Not Passed |
| **API-30** | API | FR-28 | Reject user creation with duplicate email address | Returns HTTP 422 / 409 with duplicate email error | `server/tests/lab-03/users-admin.api.test.ts` | Not Passed |
| **API-31** | API | FR-25 | Administrator updates user basic info and role | Updates displayName, email, and role, returns HTTP 200 | `server/tests/lab-03/users-admin.api.test.ts` | Not Passed |
| **API-32** | API | FR-26 | Administrator resets initial password for a user | Updates password hash and sets `mustChangePassword = true`, returns HTTP 200 | `server/tests/lab-03/users-admin.api.test.ts` | Not Passed |
| **API-33** | API | FR-27, BR-12, AC-12 | Administrator attempts self-deactivation | Returns HTTP 422 `SELF_DEACTIVATION_PROHIBITED` | `server/tests/lab-03/users-admin.api.test.ts` | Not Passed |
| **API-34** | API | FR-27, BR-13, AC-12 | Deactivate or re-role last active Administrator | Returns HTTP 422 `LAST_ADMIN_PROTECTION` | `server/tests/lab-03/users-admin.api.test.ts` | Not Passed |
| **UI-01** | UI | FR-01, FR-02, AC-01 | Login screen rendering, inputs, and validation | Validates required email/password format; shows busy state and safe failure alert | `client/tests/lab-03/Login.test.tsx` | Pass |
| **UI-02** | UI | FR-04, FR-05, AC-02 | Change Password screen and validation indicators | Renders rule checklist; enables submission only when password rules are satisfied | `client/tests/lab-03/ChangePassword.test.tsx` | Pass |
| **UI-03** | UI | FR-07, AC-14 | Shell Header display and Logout interaction | Displays authenticated user name, role badge, removes dev selector, triggers logout | `client/tests/lab-03/Navbar.test.tsx` | Pass |
| **UI-04** | UI | FR-08, FR-09, FR-10 | IT Staff Ticket Queue table, search, and filters | Renders queue table, triggers live search, updates on filter selection | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Not Passed |
| **UI-05** | UI | FR-11 | Ticket Queue pagination controls and empty states | Renders previous/next page pills, renders empty and no-results banners | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Not Passed |
| **UI-06** | UI | FR-13, FR-14, FR-15 | IT Staff Ticket Detail operational controls | Renders owner dropdown, priority dropdown, status transition buttons | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Not Passed |
| **UI-07** | UI | FR-17, FR-18, BR-04 | Comments & Notes visual distinction | Renders Public Comments in green/neutral card and Internal Notes in amber/warning style | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Not Passed |
| **UI-08** | UI | FR-20, BR-05, AC-09 | Requester Ticket Detail "Problem Appears Resolved" | Renders confirmation button for requester; updates indicator without status change | `client/tests/lab-03/RequesterTicketDetail.test.tsx` | Not Passed |
| **UI-09** | UI | FR-22, FR-23, FR-24 | Administrator User Management screen & modal | Renders user list, search bar, role filter, and "+ Create User" modal | `client/tests/lab-03/UserManagement.test.tsx` | Not Passed |
| **UI-10** | UI | FR-27, BR-12, BR-13 | Administrator safety alert rendering | Displays explicit warning alert when attempting self-deactivation or last-admin removal | `client/tests/lab-03/UserManagement.test.tsx` | Not Passed |
| **E2E-01** | E2E | AC-01, AC-14 | Complete authentication and logout flow | Log in with valid credentials &rarr; verify shell &rarr; log out &rarr; verify access revoked | `e2e/lab-03/authentication.spec.ts` | Pass |
| **E2E-02** | E2E | AC-02, FR-04, FR-05 | Initial password forced change workflow | Log in with initial password &rarr; verify intercepted &rarr; change password &rarr; enter app | `e2e/lab-03/authentication.spec.ts` | Pass |
| **E2E-03** | E2E | AC-06, AC-07, AC-08 | IT Staff queue triage and ticket operation flow | Log in as IT Staff &rarr; filter queue &rarr; open ticket &rarr; claim &rarr; update priority &rarr; post note | `e2e/lab-03/staff-ticket-flow.spec.ts` | Not Passed |
| **E2E-04** | E2E | AC-04, AC-10 | Public comment vs internal note boundary flow | IT Staff posts note and comment &rarr; Requester logs in &rarr; sees comment, note is hidden | `e2e/lab-03/staff-ticket-flow.spec.ts` | Not Passed |
| **E2E-05** | E2E | AC-11, AC-12, AC-13 | Administrator user management lifecycle flow | Create user &rarr; verify in list &rarr; test self-deactivation block &rarr; non-admin blocked | `e2e/lab-03/user-administration.spec.ts` | Not Passed |

---

## 3. Acceptance-Criterion Traceability Matrix

| Acceptance Criterion | Description | Covering Automated Tests |
| :--- | :--- | :--- |
| **AC-01** | Valid user login establishes session and returns profile | `API-01`, `API-04`, `UI-01`, `E2E-01` |
| **AC-02** | Initial password login forces password change before app entry | `API-05`, `UI-02`, `E2E-02` |
| **AC-03** | Server-derived requester identity ignores foreign `requesterId` | `API-07` |
| **AC-04** | Requester accounts blocked from Internal Notes (HTTP 403) | `API-09`, `E2E-04` |
| **AC-05** | Inactive account login rejected safely (HTTP 403) | `API-03`, `UI-01` |
| **AC-06** | Shared IT Staff Queue with search, filters, and pagination | `API-08`, `API-13`, `API-14`, `API-15`, `API-16`, `UI-04`, `UI-05`, `E2E-03` |
| **AC-07** | Claim or reassign ticket ownership to active IT Staff/Admin | `API-19`, `UI-06`, `E2E-03` |
| **AC-08** | IT Priority update leaves Requested Priority unchanged | `API-20`, `UI-06`, `E2E-03` |
| **AC-09** | Requester "Problem Appears Resolved" recorded without formal status change | `API-26`, `UI-08` |
| **AC-10** | Public Comments append-only and visible to all roles | `API-23`, `UI-07`, `E2E-04` |
| **AC-11** | Administrator creates user with initial password and forced change | `API-29`, `UI-09`, `E2E-05` |
| **AC-12** | Administrator self-deactivation and last active admin protected | `API-33`, `API-34`, `UI-10`, `E2E-05` |
| **AC-13** | Non-Administrators blocked from Admin screens and APIs | `API-10`, `E2E-05` |
| **AC-14** | Logout destroys session and redirects to login | `API-06`, `UI-03`, `E2E-01` |

---

## 4. Test Execution & Automation Commands

* Run all automated tests across client and server:
  ```bash
  npm test
  ```
* Run server API integration and unit tests:
  ```bash
  npm --prefix server test
  ```
* Run client component tests:
  ```bash
  npm --prefix client test
  ```
* Run Playwright End-to-End browser tests:
  ```bash
  npx playwright test
  ```
