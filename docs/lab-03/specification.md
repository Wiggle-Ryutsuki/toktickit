# Lab 3 Sprint Engineering Specification

**Document ID**: SPEC-LAB-03  
**Version**: 1.0  
**Status**: Specified / Ready for Staged TDD Implementation  
**Method**: Spec-Driven Development (SDD) & Test-Driven Development (TDD)  
**Parent Specification**: `docs/TokTickIT-System-Level-SDS-v1.0.pdf` (SDS-SYS-001)  
**Assignment Handout**: `docs/lab-03/Lab_3_sheet.pdf` (CPE 334 Lab 3: Users, Roles, IT Staff Ticketing, and Admin Screens)  
**Target Branch**: `lab3-staging`  

---

## 1. Sprint Goal

Deliver a secure, role-based IT support ticketing increment that replaces the simulated Development Requester selector with real authentication (email/password, Argon2id hashing, and mandatory first-login password change), introduces the operational IT Staff workflow (shared ticket queue, ownership assignment, IT priority management, status transitions, public comments, and role-restricted internal notes), and provides a minimalist Administrator user management interface (user listing, account creation, single-role assignment, account activation toggling, and initial password resets), while maintaining strict server-side authorization and preserving all completed Lab 1 and Lab 2 Requester capabilities under the Zen Green UI design system.

---

## 2. Stakeholder Request Interpretation

The stakeholder requires replacing temporary development scaffolding with real users and role-based operational capabilities:
1. **Authentication & Identity**: The temporary requester selector must be decommissioned. Users authenticate with email and password. Users provisioned with an initial password must choose a new password before entering the application. All ticket operations must derive requester identity securely from the server session rather than trusting client-supplied identifiers.
2. **IT Staff Operations**: IT Staff need a shared Ticket Queue to discover, search, filter, and sort tickets across the organization. IT Staff must be able to open Ticket Detail, claim or reassign ticket ownership, set IT Priority, update ticket status through permitted workflow transitions, communicate with requesters via Public Comments, and record private Internal Notes hidden from requesters.
3. **Requester Continuity**: Requesters continue to create and view their tickets and attachments without regression, can participate in Public Comments, and may indicate that a reported issue appears resolved without directly modifying formal ticket status.
4. **Administrator Management**: Administrators need a dedicated, minimalist User Management screen to view users, create accounts, update basic account info, assign one permitted role (`Requester`, `IT Staff`, or `Administrator`), toggle active/inactive status, and set initial passwords. Hard deletion, self-deactivation, and deactivating the last active administrator are prohibited.
5. **Architectural Discipline**: Every protected endpoint must be enforced server-side. Hiding UI controls is not authorization. The Zen Green design language and reusable component foundation from Lab 2 must be preserved.

---

## 3. Scope

### 3.1. Included Scope (Feature-09 through Feature-12)

* **Feature-09: Authentication Foundation & Mandatory Password Change** (`Lab_3_sheet.pdf`, Section 1, 3, 4.1, 4.4, 5.1, 5.2, 6.1, 8.1; `SDS-SYS-001`, Decision D-04, D-05):
  * Evolve User model with `passwordHash` and `mustChangePassword` flag.
  * Secure login endpoint (`POST /api/v1/auth/login`) with Argon2id password verification.
  * Inactive user authentication rejection (`isActive: false`).
  * Current authenticated user retrieval (`GET /api/v1/auth/me`).
  * Mandatory first-login password change enforcement (`POST /api/v1/auth/change-password`) blocking access to normal screens.
  * Logout endpoint (`POST /api/v1/auth/logout`) and session invalidation.
  * Removal of Lab 2 Development Requester selector from frontend shell and state.
  * Shell header rendering authenticated user display name, role badge, and logout action.

* **Feature-10: IT Staff Ticket Queue** (`Lab_3_sheet.pdf`, Section 1, 3, 4.1, 4.3, 6.3, 8.3; `SDS-SYS-001`, Decision D-02, D-03):
  * Shared Ticket Queue endpoint (`GET /api/v1/tickets`) for IT Staff and Administrator.
  * Server-side search across Ticket Number and Summary.
  * Filtering by Category, Status, Requested Priority, IT Priority, and Ownership/Assignment.
  * Sorting by Ticket Date/Number, Status, Priority, and Last Updated.
  * Pagination with configurable page size and metadata.
  * Responsive Zen Green table/card interface with status and priority badges.
  * Requesters forbidden from viewing the IT Staff queue.

* **Feature-11: IT Staff Ticket Operations, Comments & Notes** (`Lab_3_sheet.pdf`, Section 1, 3, 4.1, 4.3, 4.4, 4.5, 4.6, 6, 8.2, 8.4; `SDS-SYS-001`, Decision D-02, D-03, D-06, D-11):
  * Extended Ticket Detail endpoint (`GET /api/v1/tickets/:id`) and UI screen.
  * Ticket ownership claiming and reassignment (`PATCH /api/v1/tickets/:id/owner` or `PATCH /api/v1/tickets/:id`).
  * Setting and updating IT Priority (`Low`, `Medium`, `High`, `Urgent`) by IT Staff/Admin only.
  * Permitted status transitions enforcement (`New`, `In Progress`, `Pending Requester`, `Resolved`, `Closed`, `Cancelled`).
  * Public Comments thread: append-only, visible to Requester, IT Staff, Administrator (`POST /api/v1/tickets/:id/comments`).
  * Internal Notes thread: append-only, visible strictly to IT Staff and Administrator; Requesters forbidden (`POST /api/v1/tickets/:id/notes`).
  * Requester "Problem Appears Resolved" indication flag/note without direct formal status change (`POST /api/v1/tickets/:id/resolve-indication`).
  * Preserved Lab 2 attachment upload, streaming download, and soft-removal with reason.

* **Feature-12: Minimalist Administrator User Management** (`Lab_3_sheet.pdf`, Section 1, 3, 4.1, 4.3, 4.4, 5.1, 6, 8.5):
  * Dedicated User Management screen (`/admin/users`) accessible only to Administrator.
  * User list table displaying Name, Email, Role, Status (`Active`/`Inactive`), and Edit action.
  * Search users by Name or Email substring.
  * Optional single-role filter dropdown (`Requester`, `IT Staff`, `Administrator`).
  * Create user drawer/modal with Name, Email, one role, activation state, and initial password.
  * Edit user basic info (Name, Email, Role, activation state).
  * Set new initial password with mandatory password change at next login.
  * Admin safety rules: prevent duplicate emails, prevent self-deactivation, prevent deactivation of the last active admin, soft deactivation only (no user hard deletion).
  * Rejection of non-Administrator access with HTTP 403.

### 3.2. Explicitly Excluded Scope

Per `Lab_3_sheet.pdf` Section 4.2 & `TokTickIT-System-Level-SDS-v1.0.pdf` Section *Purpose and Scope* (p. 3–4):
* Email invitations, password-reset emails, magic links, or email verification;
* Multi-factor authentication (MFA), social login, OAuth2, and Single Sign-On (SSO);
* Self-registration and Requester self-signup;
* Service Actions / Actions Taken by IT Staff (deferred to Lab 4);
* Blocking ticket resolution due to incomplete Service Actions (deferred to Lab 4);
* Formal SLA calculation, automated escalation engines, and external notification services;
* Dashboards and KPI analytics beyond simple queue counts;
* Multi-tenant organizations, departments, or customer account administration;
* Multiple roles assigned to one user;
* User deletion, bulk user operations, CSV import/export, and account audit history screens;
* Extended user profile management (profile photos, phone numbers, department trees);
* Account unlocking or advanced identity-management approval workflows;
* Advanced user list features such as mandatory pagination, multi-column sorting, and multiple simultaneous filter combinations;
* Cloud infrastructure changes (AWS S3, container orchestration, cloud databases).

---

## 4. Functional Requirements (FR)

| FR ID | Feature Area | Description | Source Citation |
| :--- | :--- | :--- | :--- |
| **FR-01** | Feature-09 (Auth) | The system shall authenticate users via email and password using constant-time verification against an Argon2id password hash. | `Lab_3_sheet.pdf`, Section 1, 4.4 (`BR-01`), 6.1; `SDS-SYS-001`, p. 9 |
| **FR-02** | Feature-09 (Auth) | The system shall reject login attempts for inactive accounts (`isActive: false`) with a safe, generic failure response. | `Lab_3_sheet.pdf`, Section 4.4 (`BR-01`), 8.1 |
| **FR-03** | Feature-09 (Auth) | The system shall establish an authenticated server session upon valid login and expose the authenticated user profile via `GET /api/v1/auth/me`. | `Lab_3_sheet.pdf`, Section 4.1, 6, 9.1 (`AC-01`); `SDS-SYS-001`, Decision `D-04` |
| **FR-04** | Feature-09 (Auth) | The system shall intercept any authenticated user whose account is flagged with `mustChangePassword = true`, restricting access strictly to the Change Password screen until a valid new password is saved. | `Lab_3_sheet.pdf`, Section 1, 4.4 (`BR-02`), 8.1, 9.1 (`AC-02`) |
| **FR-05** | Feature-09 (Auth) | The system shall validate and save a new password on `POST /api/v1/auth/change-password`, update the stored hash, clear the `mustChangePassword` flag, and grant normal application access. | `Lab_3_sheet.pdf`, Section 1, 4.4 (`BR-02`), 8.1 |
| **FR-06** | Feature-09 (Auth) | The system shall provide `POST /api/v1/auth/logout` to invalidate the active server session and clear client authentication credentials. | `Lab_3_sheet.pdf`, Section 4.1, 6, 8.1; `SDS-SYS-001`, p. 9 |
| **FR-07** | Feature-09 (Auth) | The frontend shell shall replace the Development Requester selector with the authenticated user's display name, role badge, and logout action, and remove all simulated requester local storage state. | `Lab_3_sheet.pdf`, Section 1, 3, 4.1, 5.2, 7, 8.1, 8.2 |
| **FR-08** | Feature-10 (Queue) | The system shall provide `GET /api/v1/tickets` for IT Staff and Administrators to retrieve a paginated, searchable, filterable, and sortable shared ticket queue. | `Lab_3_sheet.pdf`, Section 1, 4.1, 6, 6.3, 8.3 |
| **FR-09** | Feature-10 (Queue) | The Ticket Queue API and UI shall support text search across Ticket Number and Summary. | `Lab_3_sheet.pdf`, Section 6.3, 8.3 |
| **FR-10** | Feature-10 (Queue) | The Ticket Queue API and UI shall support filtering by Category, Status, Requested Priority, IT Priority, and Assignment (e.g. Unassigned, Assigned to Me, All). | `Lab_3_sheet.pdf`, Section 6.3, 8.3 |
| **FR-11** | Feature-10 (Queue) | The Ticket Queue API and UI shall support sorting by Created Date, Ticket Number, Last Updated, and Status, with previous/next pagination controls. | `Lab_3_sheet.pdf`, Section 6.3, 8.3 |
| **FR-12** | Feature-10 (Queue) | The Ticket Queue endpoint shall strictly reject Requester accounts with HTTP 403 Forbidden. | `Lab_3_sheet.pdf`, Section 4.3, 6.2, 8.3 |
| **FR-13** | Feature-11 (Detail) | The system shall provide `GET /api/v1/tickets/:id` returning detailed ticket metadata, ownership, priority, comments, notes (for authorized roles), and attachments. | `Lab_3_sheet.pdf`, Section 6, 8.4 |
| **FR-14** | Feature-11 (Detail) | IT Staff and Administrators shall be able to claim unassigned tickets or reassign ticket ownership to any active IT Staff or Administrator. | `Lab_3_sheet.pdf`, Section 1, 3, 4.5, 6, 8.4 |
| **FR-15** | Feature-11 (Detail) | IT Staff and Administrators shall be able to set or update the ticket's IT Priority (`Low`, `Medium`, `High`, `Urgent`). Requesters shall be blocked from modifying IT Priority. | `Lab_3_sheet.pdf`, Section 1, 4.5, 6, 8.4; `SDS-SYS-001`, Decision `D-03`, p. 12 |
| **FR-16** | Feature-11 (Detail) | IT Staff and Administrators shall be able to transition ticket status across permitted states (`New`, `In Progress`, `Pending Requester`, `Resolved`, `Closed`, `Cancelled`). Requesters cannot directly set Resolved or Closed. | `Lab_3_sheet.pdf`, Section 4.4 (`BR-05`), 4.5, 8.4; `SDS-SYS-001`, Decision `D-02`, p. 11 |
| **FR-17** | Feature-11 (Detail) | The system shall allow Requesters, IT Staff, and Administrators to create and view append-only Public Comments on a ticket (`POST /api/v1/tickets/:id/comments`). | `Lab_3_sheet.pdf`, Section 4.4 (`BR-04`), 4.6, 6, 8.4 |
| **FR-18** | Feature-11 (Detail) | The system shall allow IT Staff and Administrators to create and view append-only Internal Notes (`POST /api/v1/tickets/:id/notes`). | `Lab_3_sheet.pdf`, Section 4.4 (`BR-04`), 4.6, 6, 8.4 |
| **FR-19** | Feature-11 (Detail) | The system shall strictly reject Requester attempts to view or post Internal Notes with HTTP 403 Forbidden, without exposing note existence or content. | `Lab_3_sheet.pdf`, Section 4.4 (`BR-04`), 6.2, 9.1 (`AC-04`) |
| **FR-20** | Feature-11 (Detail) | The system shall provide an action for Requesters to indicate "Problem Appears Resolved", recording an audit confirmation flag/note while leaving formal status modification to IT Staff. | `Lab_3_sheet.pdf`, Section 1, 3, 4.4 (`BR-05`), 8.2; `SDS-SYS-001`, p. 11 |
| **FR-21** | Feature-11 (Detail) | The system shall preserve all Lab 2 attachment operations (upload up to 5 files $\le$5MB, secure streaming download, soft-removal with mandatory reason). | `Lab_3_sheet.pdf`, Section 1, 4.1, 5.1, 8.4 |
| **FR-22** | Feature-12 (Admin) | The system shall provide `GET /api/v1/admin/users` returning a user list with Name, Email, Role, Status, and Edit action, accessible only to Administrators. | `Lab_3_sheet.pdf`, Section 1, 3, 6, 8.5 |
| **FR-23** | Feature-12 (Admin) | The User Management interface and API shall support filtering/searching users by Name or Email substring and optional single-role dropdown. | `Lab_3_sheet.pdf`, Section 6, 8.5 |
| **FR-24** | Feature-12 (Admin) | The system shall allow an Administrator to create a new user account with Name, Email, one permitted role (`REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`), activation status, and an initial password (`POST /api/v1/admin/users`). | `Lab_3_sheet.pdf`, Section 4.4, 5.1, 6, 8.5 |
| **FR-25** | Feature-12 (Admin) | The system shall allow an Administrator to edit an existing user's Name, Email, Role, and activation state (`PATCH /api/v1/admin/users/:id`). | `Lab_3_sheet.pdf`, Section 4.4, 6, 8.5 |
| **FR-26** | Feature-12 (Admin) | The system shall allow an Administrator to set a new initial password for a user (`POST /api/v1/admin/users/:id/reset-password`), flagging the account to mandate password change at next login. | `Lab_3_sheet.pdf`, Section 4.4, 6, 8.5 |
| **FR-27** | Feature-12 (Admin) | The system shall prevent an Administrator from deactivating their own account, and prevent deactivating or re-roling the last active Administrator in the system. | `Lab_3_sheet.pdf`, Section 4.4, 8.5, 14 (Part 8) |
| **FR-28** | Feature-12 (Admin) | The system shall enforce unique email addresses and reject non-Administrator access to all admin routes with HTTP 403 Forbidden. | `Lab_3_sheet.pdf`, Section 4.3, 4.4, 6.2, 8.5 |

---

## 5. Business Rules (BR)

| BR ID | Rule Name | Specification Details | Source Citation |
| :--- | :--- | :--- | :--- |
| **BR-01** | Active User Authentication | Only an active user account (`isActive: true`) with valid credentials may authenticate. Authentication attempts with unknown emails or invalid passwords return generic safe error `INVALID_CREDENTIALS` (HTTP 401). Inactive accounts return safe message `ACCOUNT_INACTIVE` (HTTP 403). | `Lab_3_sheet.pdf`, Section 4.4 (`BR-01`), 8.1; `SDS-SYS-001`, p. 9 |
| **BR-02** | Mandatory Password Change Intercept | A user flagged with `mustChangePassword = true` cannot access normal application screens (tickets, queue, admin) and is restricted to the password change endpoint until a valid new password is saved. | `Lab_3_sheet.pdf`, Section 4.4 (`BR-02`), 8.1, 9.1 (`AC-02`) |
| **BR-03** | Server-Derived Requester Ownership | The authenticated session identity on the server, not a `requesterId` supplied by the client, determines ownership for ticket creation, retrieval, and attachment operations. Client-supplied foreign IDs are ignored. | `Lab_3_sheet.pdf`, Section 4.4 (`BR-03`), 9.1 (`AC-03`) |
| **BR-04** | Comments vs Notes Visibility Boundary | Public Comments are visible to the Requester, IT Staff, and Administrator. Internal Notes are visible **strictly** to IT Staff and Administrator. Requesters are blocked from reading or writing Internal Notes. | `Lab_3_sheet.pdf`, Section 4.4 (`BR-04`), 4.6, 9.1 (`AC-04`) |
| **BR-05** | Requester Resolution Restriction | A Requester may record an indication that the problem appears resolved ("Problem Appears Resolved"), but cannot formally set the ticket status to `Resolved` or `Closed`. | `Lab_3_sheet.pdf`, Section 4.4 (`BR-05`), 8.2 |
| **BR-06** | Ticket Ownership Eligibility | Each Ticket may have zero or one primary Ticket Owner. The Ticket Owner must be an active user with role `IT_STAFF` or `ADMINISTRATOR`. A Ticket cannot be assigned to a `REQUESTER` or an inactive account. | `Lab_3_sheet.pdf`, Section 4.5, 5.1; `SDS-SYS-001`, p. 8 |
| **BR-07** | IT Priority Control & Initialization | Requested Priority is set by Requester upon creation (`Low`, `Medium`, `High`, `Urgent`). `itPriority` is initialized to match `requestedPriority` upon creation. IT Priority can subsequently be updated only by `IT_STAFF` or `ADMINISTRATOR`. | `Lab_3_sheet.pdf`, Section 4.5; `SDS-SYS-001`, Decision `D-03`, p. 12 |
| **BR-08** | Status Transition Invariants | Permitted status transitions are: <br>• `New` &rarr; `In Progress`, `Cancelled` <br>• `In Progress` &rarr; `Pending Requester`, `Resolved`, `Cancelled` <br>• `Pending Requester` &rarr; `In Progress`, `Resolved`, `Cancelled` <br>• `Resolved` &rarr; `Closed`, `Reopened` (or `In Progress`) <br>• `Closed` &rarr; `Reopened` (or `In Progress`) <br>• Direct jump from `New` to `Resolved` or `Closed` is prohibited. Transitions to `Resolved` or `Closed` can only be performed by IT Staff or Administrator. | `Lab_3_sheet.pdf`, Section 4.5; `SDS-SYS-001`, Decision `D-02`, p. 11 |
| **BR-09** | Comment and Note Immutability | Public Comments and Internal Notes are append-only. Editing and deletion of comments or notes are strictly excluded. | `Lab_3_sheet.pdf`, Section 4.6 |
| **BR-10** | Comment and Note Content Validation | Comment and note content must be non-empty after trimming whitespace, with a minimum length of 1 character and a maximum length of 2000 characters. Empty or whitespace-only submissions must be rejected with HTTP 422. | `Lab_3_sheet.pdf`, Section 4.6 **[Proposed Decision: min 1, max 2000]** |
| **BR-11** | Single Permitted Role Assignment | Each User must have exactly one role from: `REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`. Multiple roles per user are prohibited. | `Lab_3_sheet.pdf`, Section 4.2, 4.3, 5.1 |
| **BR-12** | Administrator Self-Deactivation Guard | An Administrator is prohibited from deactivating their own active account (`userId === session.userId`). Requests must be rejected with HTTP 422 `SELF_DEACTIVATION_PROHIBITED`. | `Lab_3_sheet.pdf`, Section 4.4, 8.5, 14 (Part 8) |
| **BR-13** | Last Active Administrator Protection | The system must prevent deactivating or changing the role of the last remaining active Administrator. If count of active Administrators is 1, modifying that account's role or `isActive` status must be rejected with HTTP 422 `LAST_ADMIN_PROTECTION`. | `Lab_3_sheet.pdf`, Section 4.4, 8.5, 14 (Part 8) |
| **BR-14** | Account Soft Deactivation Only | User deletion (`DELETE /api/v1/admin/users/:id`) is strictly excluded. Inactive users are disabled via `isActive: false` while preserving historical foreign key integrity. | `Lab_3_sheet.pdf`, Section 4.2, 4.4, 5.1; `SDS-SYS-001`, p. 8 |
| **BR-15** | Password Complexity Policy | Passwords must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, one numeric digit, and one special character. | `Lab_3_sheet.pdf`, Section 8.1 (screenshot p. 8) **[Proposed Decision: align with UI checklist]** |
| **BR-16** | Optimistic Concurrency on Ticket Updates | Ticket updates must supply the integer `version`. If the database `version` does not match, the update is rejected with HTTP 409 Conflict. | `SDS-SYS-001`, Section *Concurrency and Transactions*, p. 9, 12 |

---

## 6. UI Specification Summary

Detailed mockups, token definitions, and interaction flows are documented in [docs/lab-03/ui-spec.md](file:///c:/Users/Maimoona%20Aziz/OneDrive/Desktop/toktickit/docs/lab-03/ui-spec.md).

### 6.1. Navigation & Shell Layout
* **Header**: "TokTickIT" brand anchor, user profile badge with display name and role pill (`Requester`, `IT Staff`, or `Administrator`), and an accessible Logout button.
* **Role-Specific Links**:
  * `REQUESTER`: "My Tickets", "Create Ticket"
  * `IT_STAFF`: "My Queue", "Create Ticket"
  * `ADMINISTRATOR`: "Admin" (User Management)
* **Removed**: The Lab 2 Development Requester dropdown and "Change Requester" modal are eliminated completely.

### 6.2. Screens and Modes
1. **Login (`/login`)**:
   * Mode: Authentication form.
   * Controls: Email input, password input with visibility toggle, "Sign In" button, busy spinner.
   * Feedback: Inline field validation, generic error alert ("Invalid email or password. Please try again.").
2. **Mandatory Change Password (`/change-password`)**:
   * Mode: Forced credential update intercept.
   * Controls: Current temporary password, new password, confirm new password, dynamic requirement checklist (8+ chars, uppercase, lowercase, number, special char), "Continue" button.
3. **IT Staff Ticket Queue (`/staff/queue` or `/queue`)**:
   * Mode: Operational tabular view.
   * Controls: Search input (Ticket No / Summary), filter dropdowns (Category, Requested Priority, IT Priority, Status, Assignment), sortable table headers, pagination bar (`< Previous`, page pills, `Next >`).
   * Feedback: Loading skeletons, empty queue alert, no-results filter alert, 403 forbidden screen for Requesters.
4. **IT Staff Ticket Detail (`/staff/tickets/:id`)**:
   * Mode: Operational view & mutation.
   * Controls: Read-only ticket summary & description, interactive dropdowns for Status, Ticket Owner, and IT Priority; tabbed/card container for Public Comments, Internal Notes, and Attachments.
   * Visual Separation: Internal Notes render with a prominent amber/slate header badge and private warning callout ("Private note visible only to IT Staff & Admin").
5. **Administrator User Management (`/admin/users`)**:
   * Mode: Minimalist administration list and drawer/modal.
   * Controls: Search input (name/email), role filter dropdown, user list table with Name, Email, Role pill, Status pill, and "Edit" button; "+ Create User" button opening modal/drawer with Full Name, Email, Role, Active toggle, and Initial Password; Edit modal with Deactivate action and password reset capability.

### 6.3. Responsive and Accessibility Rules
* Layouts adhere to Bootstrap breakpoints: Desktop ($\ge 992\text{px}$), Tablet ($768\text{px} - 991\text{px}$), Mobile ($< 768\text{px}$).
* No text clipping, overlapping controls, or horizontal viewport overflow.
* Meets WCAG 2.2 AA: Color contrast $\ge 4.5:1$, form controls programmatically labeled via `id`/`htmlFor`, visible keyboard focus rings, and dialog focus trapping.

---

## 7. Data Changes & Migration Design

### 7.1. Prisma Schema Evolution

```prisma
// server/prisma/schema.prisma increment for Lab 3

enum Role {
  REQUESTER
  IT_STAFF
  ADMINISTRATOR
}

model User {
  id                 Int          @id @default(autoincrement())
  email              String       @unique
  displayName        String
  passwordHash       String       @default("") // Sourced Argon2id hash
  mustChangePassword Boolean      @default(false)
  role               Role         @default(REQUESTER)
  isActive           Boolean      @default(true)
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt

  requestedTickets   Ticket[]     @relation("RequesterTickets")
  ownedTickets       Ticket[]     @relation("OwnedTickets")
  attachments        Attachment[] @relation("UploadedAttachments")
  comments           TicketComment[]
  sessions           Session[]

  @@map("users")
}

enum TicketStatus {
  NEW
  ASSIGNED
  IN_PROGRESS
  PENDING_REQUESTER
  RESOLVED
  CLOSED
  CANCELLED
}

model Ticket {
  id                             Int           @id @default(autoincrement())
  ticketNo                       String        @unique
  title                          String
  description                    String
  requesterId                    Int
  ownerId                        Int?          // Nullable until claimed/assigned
  categoryId                     Int
  relatedSystemId                Int
  requestedPriority              Priority      @default(MEDIUM)
  itPriority                     Priority      @default(MEDIUM)
  status                         TicketStatus  @default(NEW)
  resolutionSummary              String?
  requesterResolutionConfirmedAt DateTime?
  version                        Int           @default(1)
  createdAt                      DateTime      @default(now())
  updatedAt                      DateTime      @updatedAt

  requester                      User          @relation("RequesterTickets", fields: [requesterId], references: [id])
  owner                          User?         @relation("OwnedTickets", fields: [ownerId], references: [id])
  category                       Category      @relation(fields: [categoryId], references: [id])
  relatedSystem                  RelatedSystem @relation(fields: [relatedSystemId], references: [id])
  attachments                    Attachment[]
  comments                       TicketComment[]

  @@index([requesterId])
  @@index([ownerId])
  @@index([status])
  @@index([categoryId])
  @@index([createdAt])
  @@map("tickets")
}

enum CommentType {
  PUBLIC
  INTERNAL_NOTE
}

model TicketComment {
  id        Int         @id @default(autoincrement())
  ticketId  Int
  authorId  Int
  type      CommentType @default(PUBLIC)
  content   String
  createdAt DateTime    @default(now())

  ticket    Ticket      @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  author    User        @relation(fields: [authorId], references: [id])

  @@index([ticketId, type])
  @@index([createdAt])
  @@map("ticket_comments")
}

model Session {
  id        String   @id // Opaque session ID
  userId    Int
  expiresAt DateTime
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
  @@map("sessions")
}
```

### 7.2. Migration Strategy from Lab 2
1. **Preserve Existing Records**: Existing `User`, `Category`, `RelatedSystem`, `Ticket`, and `Attachment` data remain valid.
2. **User Credential Migration**: 
   * Add `passwordHash` (non-null with default temporary hash) and `mustChangePassword` (`Boolean @default(false)`).
   * Migration seed script sets known initial passwords for seeded users (e.g. `Password123!`) with `mustChangePassword = false` for test accounts, and `mustChangePassword = true` for first-login test accounts.
3. **Ticket Ownership**:
   * Add nullable `ownerId Int?` referencing `User(id)` with foreign key.
   * Add `resolutionSummary String?` and `requesterResolutionConfirmedAt DateTime?`.
4. **Comments Model**:
   * Create `ticket_comments` table storing both `PUBLIC` comments and `INTERNAL_NOTE` entries tagged by `type`.
5. **Session Model**:
   * Create `sessions` table storing opaque server session IDs with expiration timestamps per SDS Decision `D-04`.

### 7.3. Required Seed Data
Per `Lab_3_sheet.pdf` Section 5.3:
* **Requesters**:
  * Active ($\ge 4$): `jennifer.anderson@kmutt.ac.th`, `sarah.johnson@kmutt.ac.th`, `david.lee@kmutt.ac.th`, `michael.brown@kmutt.ac.th`.
  * Inactive ($\ge 1$): `alex.taylor.inactive@kmutt.ac.th`.
* **IT Staff**:
  * Active ($\ge 3$): `staff.somchai@kmutt.ac.th`, `staff.malee@kmutt.ac.th`, `staff.anong@kmutt.ac.th`.
  * Inactive ($\ge 1$): `staff.inactive@kmutt.ac.th`.
* **Administrator**:
  * Active ($\ge 1$): `admin.toktickit@kmutt.ac.th`.
* **Initial Passwords**: Documented test credentials for all seed accounts (e.g., standard: `Password123!`; first-login test user: `InitialPass123!` with `mustChangePassword: true`).

---

## 8. API Contract Summary

Full JSON schemas, DTOs, and error envelopes are detailed in [docs/lab-03/api-spec.md](file:///c:/Users/Maimoona%20Aziz/OneDrive/Desktop/toktickit/docs/lab-03/api-spec.md).

| Method | Endpoint Path | Role Allowed | Purpose & Key Parameters |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Public | Authenticates credentials, issues session cookie. |
| `POST` | `/api/v1/auth/logout` | Authenticated | Invalidates active session, clears auth cookie. |
| `GET` | `/api/v1/auth/me` | Authenticated | Returns current authenticated user profile DTO. |
| `POST` | `/api/v1/auth/change-password` | Authenticated | Validates and saves new password, clears must-change flag. |
| `GET` | `/api/v1/tickets` | IT Staff, Admin | Retrieves IT queue with search, filters, sort, pagination. |
| `GET` | `/api/v1/tickets/:id` | Authenticated | Retrieves ticket detail; notes filtered out for Requesters. |
| `PATCH` | `/api/v1/tickets/:id` | IT Staff, Admin | Updates owner, IT priority, status, resolution summary (optimistic concurrency version checked). |
| `POST` | `/api/v1/tickets/:id/resolve-indication` | Requester | Records Requester confirmation that issue appears resolved. |
| `GET` | `/api/v1/tickets/:id/comments` | Authenticated | Lists Public Comments for an accessible ticket. |
| `POST` | `/api/v1/tickets/:id/comments` | Authenticated | Posts a new Public Comment. |
| `GET` | `/api/v1/tickets/:id/notes` | IT Staff, Admin | Lists Internal Notes (Requesters return 403 Forbidden). |
| `POST` | `/api/v1/tickets/:id/notes` | IT Staff, Admin | Posts a new Internal Note (Requesters return 403 Forbidden). |
| `GET` | `/api/v1/admin/users` | Administrator | Lists users with search and optional role filter. |
| `POST` | `/api/v1/admin/users` | Administrator | Creates user with one permitted role and initial password. |
| `GET` | `/api/v1/admin/users/:id` | Administrator | Retrieves single user details. |
| `PATCH` | `/api/v1/admin/users/:id` | Administrator | Updates user name, email, role, or active status. |
| `POST` | `/api/v1/admin/users/:id/reset-password`| Administrator | Sets new initial password and flags account for change. |

---

## 9. Acceptance Criteria (AC)

| AC ID | Given | When | Then |
| :--- | :--- | :--- | :--- |
| **AC-01** | An active user with valid email and password credentials | The user submits the login form | The backend establishes authenticated session, sets HttpOnly cookie, and returns user profile with role (`Lab_3_sheet.pdf`, Section 9.1). |
| **AC-02** | An authenticated user flagged with `mustChangePassword = true` | The user attempts to access any normal application screen | The application intercepts navigation and restricts the user to the Change Password screen until a valid new password is saved (`Lab_3_sheet.pdf`, Section 9.1). |
| **AC-03** | An authenticated Requester | The client sends a request supplying another user's `requesterId` | The backend applies the authenticated user's ID from session and does not return or mutate another user's ticket data (`Lab_3_sheet.pdf`, Section 9.1). |
| **AC-04** | An authenticated Requester account | The client requests `GET` or `POST` on `/api/v1/tickets/:id/notes` | The backend responds with HTTP 403 Forbidden without exposing note existence or content (`Lab_3_sheet.pdf`, Section 9.1). |
| **AC-05** | An inactive account (`isActive: false`) | A user attempts to authenticate | The backend rejects login with HTTP 403 and returns a safe error without revealing extra account details. |
| **AC-06** | An authenticated IT Staff user | The user accesses the shared Ticket Queue with filters and search query | The queue returns matching tickets across all requesters with pagination metadata and correct priority/status badges. |
| **AC-07** | An authenticated IT Staff user on Ticket Detail | The user clicks "Claim Ticket" or selects an IT Staff assignee | The backend atomically assigns `ownerId`, updates status if applicable, and updates the displayed owner. |
| **AC-08** | An authenticated IT Staff user on Ticket Detail | The user selects a new IT Priority (`Low`, `Medium`, `High`, `Urgent`) | The backend updates `itPriority` while leaving `requestedPriority` unchanged. |
| **AC-09** | An authenticated Requester on Ticket Detail | The Requester clicks "Problem Appears Resolved" | The backend records the confirmation timestamp/flag; the formal status is not changed to Resolved or Closed. |
| **AC-10** | An authenticated user on Ticket Detail | The user submits a valid Public Comment | The comment is appended, author and timestamp are recorded, and it is rendered for Requesters, IT Staff, and Admin. |
| **AC-11** | An authenticated Administrator on User Management | The Administrator creates a user with valid email, name, role, and initial password | The user is persisted in PostgreSQL with an Argon2id hash and flagged with `mustChangePassword = true`. |
| **AC-12** | An authenticated Administrator on User Management | The Administrator attempts to deactivate their own account or the last active Administrator | The backend rejects the request with HTTP 422 and a clear safety alert is displayed. |
| **AC-13** | A non-Administrator user (Requester or IT Staff) | The user attempts to access `/admin/users` or call `/api/v1/admin/*` | The backend returns HTTP 403 Forbidden and the frontend renders an unauthorized access warning. |
| **AC-14** | An authenticated user | The user clicks Logout in the shell header | The backend destroys the session and the user is redirected to `/login`, blocked from returning via browser back navigation. |

---

## 10. Product Definition of Done (DoD)

A feature increment or sprint deliverable is marked **Done** only when all conditions are satisfied:
1. **Spec & Traceability Complete**: All requirements, business rules, and acceptance criteria are documented with source citations in `specification.md`, `tests.md`, `ui-spec.md`, and `api-spec.md`.
2. **Migrations Applied & Preserved**: Prisma migrations run cleanly against PostgreSQL without dropping or corrupting Lab 1 or Lab 2 tables/data.
3. **Idempotent Seed Data**: Seed script populates all required Requesters, IT Staff, Admin, and realistic ticket datasets safely upon repeated runs.
4. **Backend Authorization Verified**: All protected routes enforce authentication, role permissions, and resource ownership server-side; direct API bypass attempts fail with HTTP 401 or 403.
5. **No Regressions**: All Lab 1 and Lab 2 automated tests continue to pass; Requester ticket submission, list, detail, and attachment soft-removal work seamlessly.
6. **Automated Test Coverage**: All planned unit, API integration, UI component, and Playwright E2E tests in `tests.md` pass with zero failures.
7. **Zen Green UI Standards**: All screens adhere to the Zen Green design language, responsive breakpoints, visible focus indicators, and WCAG 2.2 AA accessibility requirements.
8. **Git Workflow Compliant**: Features are developed on dedicated feature branches, reviewed via PRs, merged cleanly into `lab3-staging`, and verified prior to `main` release.

---

## 11. Assumptions and Decisions

### 11.1. Categorization of Decisions
* **[Source Requirement]**: Directly mandated by `Lab_3_sheet.pdf` or `SDS-SYS-001`.
* **[Proposed Decision]**: Technical design choice recommended to resolve ambiguities while maintaining consistency with earlier labs.
* **[Missing in Handout]**: Detail absent from handout requiring explicit alignment.

### 11.2. Key Architectural Decisions

1. **Ticket Status Vocabulary Alignment**:
   * *Status in SDS-SYS-001 (D-02)*: `New`, `Assigned`, `In Progress`, `Pending Requester`, `Resolved`, `Closed`, `Cancelled`.
   * *Status in Lab 3 Sheet (Section 4.5)*: `New`, `Open`, `In Progress`, `Waiting for Requester`, `Resolved`, `Closed`, `Reopened`, `Cancelled`.
   * **[Proposed Decision]**: Standardize database enum on `NEW`, `ASSIGNED`, `IN_PROGRESS`, `PENDING_REQUESTER`, `RESOLVED`, `CLOSED`, `CANCELLED`. In UI presentation, display `Assigned` (or `Open`), `Pending Requester` (or `Waiting for Requester`), and treat "Reopen" as a transition moving `Closed`/`Resolved` tickets back to `IN_PROGRESS` (with owner) or `NEW` (without owner) per SDS Section *Cross-Feature Workflow Rules* (p. 11).

2. **Primary Key Data Types (`Int` vs `UUID`)**:
   * *Status in SDS-SYS-001 (p. 7)*: Specifies UUIDs.
   * *Status in Lab 3 Sheet (Section 5)*: Dictates evolving existing PostgreSQL/Prisma design without discarding existing data.
   * **[Proposed Decision]**: Maintain `Int @id @default(autoincrement())` for primary keys on existing entities to preserve backward compatibility with Lab 1 & 2 data and test suites.

3. **Session Management Design**:
   * *Source*: SDS Decision `D-04` mandates opaque PostgreSQL session stored in `HttpOnly`, `SameSite=Lax` cookie.
   * **[Proposed Decision]**: Implement database-backed session table `Session` with crypto-generated opaque tokens transmitted via `HttpOnly`, `SameSite=Lax` cookie (`toktickit_session`).

4. **Password Policy**:
   * *Source*: Lab 3 Sheet p. 8 mockup checklist.
   * **[Proposed Decision]**: Enforce minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 digit, and 1 special character (`[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]`).

5. **Comment & Note Length Bounds**:
   * *Source*: Lab 3 Sheet Section 4.6 requires students to justify limits.
   * **[Proposed Decision]**: Minimum 1 trimmed character, maximum 2000 characters.

---

## 12. GitHub Issues, Branch Flow, and Merge Order

### 12.1. Staged Integration Flow
All work branches branch from and merge back into `lab3-staging`:
```
lab3-staging
  ├── feature/9-authentication-password-change    --> PR #1 into lab3-staging
  ├── feature/10-staff-queue                      --> PR #2 into lab3-staging
  ├── feature/11-staff-ticket-detail              --> PR #3 into lab3-staging
  └── feature/12-user-management                  --> PR #4 into lab3-staging
                                                    └── PR to main
```

### 12.2. Decomposed Issues & Scope

| Issue # | Issue Title | Target Branch | Dependencies | Scope Summary |
| :--- | :--- | :--- | :--- | :--- |
| **#23** | `Sprint 3 Engineering Contract & Specs` | `lab3-staging` | None | `specification.md`, `tests.md`, `ui-spec.md`, `api-spec.md`. |
| **#24** | `Feature 9: Authentication Foundation & Password Change` | `feature/9-authentication` | #23 | User schema migration, Argon2id, session cookie, login/logout/me APIs, Change Password UI, decommissioning Requester selector. |
| **#25** | `Feature 10: IT Staff Ticket Queue` | `feature/10-staff-queue` | #24 | Queue API, multi-field filters, search, sort, pagination, responsive Zen Green table, role guard. |
| **#26** | `Feature 11: IT Staff Ticket Detail, Comments & Notes` | `feature/11-staff-ticket-detail` | #24, #25 | Ownership claim/reassign, IT priority, status transitions, Public Comments, Internal Notes, Requester resolution indication. |
| **#27** | `Feature 12: Minimalist Administrator User Management` | `feature/12-user-management` | #24 | User list, search/filter, create user modal, edit user, set initial password, self-deactivation & last-admin guards. |
| **#28** | `Lab 3 Full Regression, E2E Testing & Release Integration` | `lab3-staging` | #24, #25, #26, #27 | End-to-end Playwright tests, responsive verification, screenshot captures, final staging merge to `main`. |
