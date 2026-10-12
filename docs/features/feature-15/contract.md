# Feature-15 Engineering Contract: Enforced Ticket Lifecycle & Resolution Gate Workflow

**Feature ID**: FEAT-15  
**Feature Name**: Enforced Ticket Lifecycle & Resolution Gate Workflow  
**Branch**: `feature/15-ticket-workflow-resolution-gate`  
**Target Branch**: `lab4-staging`  
**Status**: Specified / Ready for Staged TDD Implementation  
**Method**: Spec-Driven Development (SDD) & Test-Driven Development (TDD)  
**Parent Specifications**:  
- `docs/lab-04/specification.md` (`SPEC-LAB-04`)  
- `docs/lab-04/api-spec.md` (`API-SPEC-LAB-04`)  
- `docs/lab-04/ui-spec.md` (`UI-SPEC-LAB-04`)  
- `docs/lab-04/tests.md` (`TEST-LAB-04`)  
- `docs/TokTickIT-System-Level-SDS-v1.0.pdf` (`SDS-SYS-001`)  
- `docs/lab-04/Labsheet_4.pdf` (CPE 334 Lab 4 Assignment Sheet)  
- `docs/features/feature-13/contract.md` (`FEAT-13` Domain Foundation)  
- `docs/features/feature-14/contract.md` (`FEAT-14` Actions Taken UI)  

---

## 1. Purpose, Scope, and Explicit Exclusions

### 1.1. Purpose
Feature-15 establishes authoritative backend and frontend enforcement of the **TokTickIT Ticket Lifecycle State Machine**, anchoring the integrity of technical IT service operations through a strict **Resolution Gate**.

Under this workflow:
1. A Ticket cannot be prematurely resolved or closed while incomplete technical tasks remain outstanding. Any attempt to transition a ticket to `RESOLVED` or `CLOSED` when any associated Action Taken is in `PLANNED` or `IN_PROGRESS` status is strictly rejected by the backend with `HTTP 409 Conflict` (`TICKET_STATE_CONFLICT`).
2. Only authorized **IT Staff** and **Administrators** possess the role authority to formally transition ticket lifecycle states; Requesters attempting formal status updates are rejected with `HTTP 403 Forbidden`.
3. Requester resolution feedback (*"Problem Appears Resolved"*) is preserved as an **advisory confirmation**, recording an audit timestamp and public comment without bypassing incomplete technical actions or directly altering the formal lifecycle state.
4. Ticket cancellation enforces entry of an explicit cancellation reason (min 5 characters) and **atomically cascades cancellation** to all open (`PLANNED`, `IN_PROGRESS`) Actions Taken within a single transactional boundary.
5. Reopening closed tickets executes deterministic lifecycle logic: transitioning to `IN_PROGRESS` if a Ticket Owner is assigned, or to `NEW` if unassigned, while previously cancelled actions remain terminal.

---

### 1.2. Included Scope

1. **Ticket Lifecycle Transition State Machine**:
   - Authoritative enforcement of valid state transitions across all 7 ticket statuses: `NEW`, `ASSIGNED`, `IN_PROGRESS`, `PENDING_REQUESTER`, `RESOLVED`, `CLOSED`, and `CANCELLED`.
   - Client and server enforcement of permitted next transitions based on current ticket state.
2. **Hard Resolution Gate (`TICKET_STATE_CONFLICT`)**:
   - Server-side validation during `PATCH /api/v1/tickets/:id`: when target status is `RESOLVED` or `CLOSED`, query associated `ActionTaken` records.
   - If any action has `status: PLANNED` or `status: IN_PROGRESS`, reject the request with `HTTP 409 Conflict`, code `TICKET_STATE_CONFLICT`, detailed `fieldErrors`, and correlation ID.
   - All associated Actions Taken must be terminal (`COMPLETED` or `CANCELLED`) before resolution is allowed.
3. **Role-Based Transition Authority**:
   - Formal status updates on `PATCH /api/v1/tickets/:id` are restricted exclusively to `IT_STAFF` and `ADMINISTRATOR` roles.
   - Direct status modification attempts by `REQUESTER` accounts are rejected with `HTTP 403 Forbidden`.
4. **Advisory Requester Indication (`POST /api/v1/tickets/:id/resolve-indication`)**:
   - Allows ticket requesters to submit an advisory *"Problem Appears Resolved"* notification with an optional note.
   - Appends a Public Comment with the requester's note and records `requesterResolutionConfirmedAt = now()`.
   - Leaves formal ticket status untouched; if open actions remain on the ticket, flags the ticket payload with `hasOpenActionsWarning: true` for the Ticket Owner.
5. **Atomic Cascade Cancellation**:
   - When a ticket transitions to `CANCELLED`, the caller must supply a non-empty cancellation reason (minimum 5 characters).
   - In a single Prisma database transaction (`$transaction`), updates the ticket status to `CANCELLED` (storing the reason in `resolutionSummary`) and atomically updates all open (`PLANNED`, `IN_PROGRESS`) Actions Taken to `CANCELLED`, recording the cancellation reason in their `result` field.
6. **Deterministic Reopening Semantics**:
   - Transitioning an inactive ticket (`RESOLVED`, `CLOSED`, `CANCELLED`) back to active service transitions to `IN_PROGRESS` if `ownerId` is populated, or to `NEW` if unassigned (`ownerId == null`).
   - Actions previously marked `CANCELLED` remain `CANCELLED` (terminal state invariant `BR-17`).
7. **Optimistic Concurrency Control**:
   - Enforcement of the integer `version` field on `PATCH /api/v1/tickets/:id`.
   - Stale version submissions return `HTTP 409 Conflict` with code `STALE_UPDATE_CONFLICT` (or `CONCURRENCY_CONFLICT`).
8. **UI Workflow Feedback & Accessible Zen Modals**:
   - **Dynamic Status Transition Select**: In `StaffTicketDetail`, the status dropdown renders strictly valid next transitions according to the state machine.
   - **Resolution Gate Warning Dialog**: Intercepts `409 TICKET_STATE_CONFLICT` responses and displays an accessible high-contrast Zen warning dialog:
     - Header: *"Action Required: Incomplete Actions Taken"*
     - Body: Explains open actions must be Completed or Cancelled before resolving.
     - Actions: `[Review Actions Taken]` button (smoothly scrolls to the Actions Taken section) and `[Dismiss]` button.
   - **Requester Confirmation Modal**: Dialog confirming advisory nature before submitting *"Problem Appears Resolved"*.
   - **Cancellation Prompt Modal**: Enforces entry of a mandatory cancellation reason before allowing ticket cancellation.

---

### 1.3. Explicit Exclusions

Per `Labsheet_4.pdf` Section 4.2 (p. 2), Section 4.5 (pp. 3–4), and `SDS-SYS-001` Section *Purpose and Scope* (pp. 3–4):
- **No automated SLA clocks, countdown timers, or breach dispatchers**: No background workers or cron jobs calculating elapsed time, pause clocks, or triggering escalation emails.
- **No external outbound notification delivery**: No external email, SMS, LINE, webhook, or push notification dispatch upon status transitions or resolution indications.
- **No multi-level managerial approval hierarchies**: No sequential multi-tier sign-offs required prior to ticket closure.
- **No inventory, spare parts, or hardware purchasing tracking**: Parts consumption and cost accounting are excluded.
- **No labor costing, hourly billing, or payroll integration**: No billing rate calculation for action durations.
- **No multi-tenant database partitioning**: Single-instance database architecture.
- **No operational dashboard metric aggregation**: Dashboard endpoints (`GET /api/v1/dashboard/staff`, `GET /api/v1/dashboard/requester`) belong strictly to **Feature-16** (`SPEC-LAB-04`, Section 3.1).

---

## 2. Requirements & Traceability Matrix

| Requirement / Rule ID | Source Document Citation | Description & Specification |
| :--- | :--- | :--- |
| **FR-43** | `Labsheet_4.pdf`, Sec 4.5, 6.1; `SDS-SYS-001`, Sec 8, p. 11, Sec 9, p. 12; `API-SPEC-LAB-04`, Sec 4.1 | The backend shall prevent transitioning a Ticket to `RESOLVED` or `CLOSED` if any associated Action Taken is in `PLANNED` or `IN_PROGRESS` status, returning HTTP 409 Conflict (`TICKET_STATE_CONFLICT`). |
| **FR-44** | `Labsheet_4.pdf`, Sec 4.5, p. 3; `SDS-SYS-001`, Sec 8, p. 11; `API-SPEC-LAB-04`, Sec 4.1 | Only IT Staff and Administrator shall be authorized to transition a Ticket to `RESOLVED` or `CLOSED`. Requesters attempting direct status transitions receive HTTP 403 Forbidden. |
| **FR-45** | `Labsheet_4.pdf`, Sec 3, 4.5; `SDS-SYS-001`, Sec 8, p. 11; `API-SPEC-LAB-04`, Sec 4.2; `UI-SPEC-LAB-04`, Sec 6.3 | The Requester *"Problem Appears Resolved"* action shall record an advisory confirmation flag and audit note/comment, but shall not directly update formal ticket status to `RESOLVED`. |
| **FR-46** | `SDS-SYS-001`, Sec 8, p. 11; `API-SPEC-LAB-04`, Sec 4.2 | If Requester resolution confirmation is submitted while open Actions Taken remain, the system shall record the confirmation, warn the Ticket Owner (`hasOpenActionsWarning: true`), and leave ticket status unchanged. |
| **FR-47** | `SDS-SYS-001`, Sec 8, p. 11; `API-SPEC-LAB-04`, Sec 4.1; `SPEC-LAB-04`, Sec 5 | Cancelling a ticket shall require a non-empty cancellation reason (min 5 characters) and atomically cancel all associated `PLANNED` and `IN_PROGRESS` actions in a single transaction. |
| **FR-48** | `SDS-SYS-001`, Sec 8, p. 11; `API-SPEC-LAB-04`, Sec 4.1; `SPEC-LAB-04`, Sec 5 | Reopening a ticket from `RESOLVED`, `CLOSED`, or `CANCELLED` shall transition status to `IN_PROGRESS` if a Ticket Owner exists, or `NEW` if unassigned. Previously cancelled actions remain cancelled. |
| **BR-06** | `Labsheet_4.pdf`, Sec 4.5, 6.1; `SDS-SYS-001`, p. 11, 12 | **Resolution Gate Rule**: A Ticket cannot transition to status `RESOLVED` or `CLOSED` while any associated Action Taken is in `PLANNED` or `IN_PROGRESS` status. The backend must reject such transitions with HTTP 409 Conflict (`TICKET_STATE_CONFLICT`). |
| **BR-07** | `SDS-SYS-001`, Sec 8, p. 11 | **Resolution Prerequisite**: Before a ticket can be resolved, every Action Taken associated with it must have reached a terminal state (`COMPLETED` or `CANCELLED`). |
| **BR-08** | `Labsheet_4.pdf`, Sec 3, 4.5; `SDS-SYS-001`, p. 11 | **Advisory Requester Indication**: A Requester's indication that the problem appears resolved is strictly advisory and records a confirmation timestamp and public comment without directly modifying formal ticket status. |
| **BR-09** | `SDS-SYS-001`, Sec 8, p. 11 | **Open Actions Warning**: If a Requester confirms resolution while open actions remain, the confirmation is recorded, the Ticket Owner is flagged/warned, and formal status remains unchanged. |
| **BR-10** | `SDS-SYS-001`, Sec 8, p. 11; `API-SPEC-LAB-04`, Sec 4.1 | **Cascade Cancellation**: Cancelling a ticket requires a non-empty cancellation reason (min 5 chars) and atomically transitions all open (`PLANNED`, `IN_PROGRESS`) Actions Taken to `CANCELLED` using that reason within a single transaction. |
| **BR-11** | `SDS-SYS-001`, Sec 8, p. 11; `SPEC-LAB-04`, Sec 6 | **Reopening Logic**: Reopening a ticket from `RESOLVED`, `CLOSED`, or `CANCELLED` sets status to `IN_PROGRESS` if `ownerId` is present, or `NEW` if unassigned. Previously cancelled actions remain cancelled. |
| **BR-12** | `SDS-SYS-001`, Sec 6, p. 9; `Labsheet_4.pdf`, Sec 6.1 | **Optimistic Concurrency**: Ticket modifications require an integer `version` field. A stale update returns HTTP 409 Conflict (`STALE_UPDATE_CONFLICT` / `CONCURRENCY_CONFLICT`) rather than overwriting newer concurrent work. |
| **AC-07** | `Labsheet_4.pdf`, Sec 4.5, 6.1, 10 (`AC-07`), p. 8; `SDS-SYS-001`, p. 11, 12 | Given a Ticket with at least one Action Taken in `PLANNED` or `IN_PROGRESS` status, when an IT Staff user attempts to transition status to `RESOLVED` or `CLOSED`, then the API rejects the transition with HTTP 409 Conflict (`TICKET_STATE_CONFLICT`) and ticket status remains unchanged. |
| **AC-08** | `Labsheet_4.pdf`, Sec 4.5, 10 (`AC-08`), p. 8; `SDS-SYS-001`, p. 11 | Given a Ticket with all Actions Taken in `COMPLETED` or `CANCELLED` status, when an IT Staff user transitions status to `RESOLVED` with a valid resolution summary, then the transition succeeds with HTTP 200 and status updates to `RESOLVED`. |
| **AC-09** | `SDS-SYS-001`, Sec 8, p. 11; `SPEC-LAB-04`, Sec 10 (`AC-09`) | Given a Ticket in any non-Cancelled status with open Actions Taken, when an authorized user cancels the ticket with a reason, then the ticket status updates to `CANCELLED` and all open actions atomically transition to `CANCELLED`. |
| **AC-10** | `SDS-SYS-001`, Sec 8, p. 11; `SPEC-LAB-04`, Sec 10 (`AC-10`) | Given a Ticket in `RESOLVED`, `CLOSED`, or `CANCELLED` status, when an authorized user reopens it, then the ticket transitions to `IN_PROGRESS` (if owner exists) or `NEW` (if unassigned). |

---

## 3. Lifecycle Workflow Invariants & Transition Matrix

### 3.1. Formal Ticket Status Transition Matrix

TokTickIT implements the lifecycle state machine defined in `SDS-SYS-001` Section 8 (Decision `D-02`, pp. 10–12) across 7 ticket statuses:
- `NEW`: Ticket submitted, pending initial assignment/triage.
- `ASSIGNED`: Ticket owner designated, awaiting technical work.
- `IN_PROGRESS`: Active technical investigation or service tasks ongoing.
- `PENDING_REQUESTER`: Awaiting clarification, test verification, or response from requester.
- `RESOLVED`: Technical remediation completed by IT Staff; all actions finished.
- `CLOSED`: Administrative final closure.
- `CANCELLED`: Abandoned, duplicated, or withdrawn ticket.

```
                  +-------------------------------------------------------------+
                  |                                                             |
                  v                                                             |
            +------------+          +------------+                              |
  [Create]  |    NEW     | -------> |  ASSIGNED  |                              |
    ------> |            |          |   (Open)   |                              |
            +------------+          +------------+                              |
              |       \                 |      |                                |
              |        \----------------|---\  |                                |
              |                         |    \ |                                |
              |                         v     v                                 |
              |                   +---------------+                             |
              |                   |  IN_PROGRESS  | <----+                      |
              |                   +---------------+      |                      |
              |                     |          ^         |                      |
              |                     v          |         | (Reopen with owner)  |
              |               +-------------------+      |                      |
              |               | PENDING_REQUESTER |      |                      |
              |               +-------------------+      |                      |
              |                     |          |         |                      |
              |                     v          |         |                      |
              |       (Resolution Gate:        |         |                      |
              |        All Actions Terminal)   |         |                      |
              |                     |          |         |                      |
              |                     v          v         |                      |
              |                   +---------------+      |                      |
              |                   |   RESOLVED    | -----+                      |
              |                   +---------------+                             |
              |                         |                                       |
              |                         v                                       |
              |                   +---------------+                             |
              |                   |    CLOSED     | ----------------------------+
              |                   +---------------+      |
              |                                          | (Reopen unassigned)
              v                                          |
        +------------+                                   |
        | CANCELLED  | ----------------------------------+
        +------------+
```

#### State Transition Truth Table:

| Current Ticket Status | Permitted Next Statuses | Invariants & Pre-Conditions |
| :--- | :--- | :--- |
| **`NEW`** | `ASSIGNED`, `IN_PROGRESS`, `CANCELLED` | Self-transition (`NEW`) is a no-op. Moving to `ASSIGNED` typically requires `ownerId`. Cancelling requires cancellation reason. |
| **`ASSIGNED`** | `IN_PROGRESS`, `PENDING_REQUESTER`, `CANCELLED` | Self-transition (`ASSIGNED`) is a no-op. Cancelling cascades to open actions. |
| **`IN_PROGRESS`** | `PENDING_REQUESTER`, `RESOLVED`, `CANCELLED` | Transition to `RESOLVED` strictly guarded by the **Resolution Gate**: requires all Actions Taken to be terminal (`COMPLETED` or `CANCELLED`) and a valid `resolutionSummary` (10–2000 chars). Cancelling requires reason. |
| **`PENDING_REQUESTER`** | `IN_PROGRESS`, `RESOLVED`, `CANCELLED` | Transition to `RESOLVED` strictly guarded by the **Resolution Gate**: requires all Actions Taken to be terminal (`COMPLETED` or `CANCELLED`) and a valid `resolutionSummary`. |
| **`RESOLVED`** | `CLOSED`, `IN_PROGRESS`, `NEW` | Transition to `CLOSED` guarded by Resolution Gate. Reopening: transitions to `IN_PROGRESS` if `ownerId != null`, or `NEW` if `ownerId == null`. |
| **`CLOSED`** | `IN_PROGRESS`, `NEW` | Reopening: transitions to `IN_PROGRESS` if `ownerId != null`, or `NEW` if `ownerId == null`. |
| **`CANCELLED`** | `IN_PROGRESS`, `NEW` | Reopening: transitions to `IN_PROGRESS` if `ownerId != null`, or `NEW` if `ownerId == null`. Previously cancelled actions remain cancelled. |

---

### 3.2. Hard Resolution Gate Invariant (`BR-06`, `BR-07`, `FR-43`)

When a client requests a transition to `RESOLVED` or `CLOSED` on `PATCH /api/v1/tickets/:id`:
1. The domain service queries all records in the `actions_taken` table matching `ticketId == :id`.
2. The domain service evaluates open actions:
   $$\text{openActions} = \{ a \in \text{actions} \mid a.\text{status} \in \{\text{PLANNED}, \text{IN\_PROGRESS}\} \}$$
3. **If $\mathbf{|\text{openActions}| > 0}$**:
   - The transaction is immediately aborted.
   - The ticket status remains completely unmodified in the database.
   - The server responds with **`HTTP 409 Conflict`**, error code **`TICKET_STATE_CONFLICT`**, providing the exact count of incomplete actions in `fieldErrors`.
4. **If $\mathbf{|\text{openActions}| == 0}$** (every action is `COMPLETED` or `CANCELLED`, or no actions exist):
   - The resolution gate allows the update to proceed.
   - Requires non-empty `resolutionSummary` (10–2000 characters).
   - Ticket status transitions to target state and version is incremented.

---

### 3.3. Role Authority & Access Boundaries (`BR-13`, `FR-44`)

- **IT Staff (`IT_STAFF`) & Administrators (`ADMINISTRATOR`)**:
  - Full operational authority to mutate `status`, `itPriority`, `ownerId`, and `resolutionSummary` on `PATCH /api/v1/tickets/:id`.
  - Subject to domain rules, optimistic concurrency, and the resolution gate.
- **Requesters (`REQUESTER`)**:
  - Strictly prohibited from mutating formal ticket status or operational attributes.
  - Submitting `status`, `ownerId`, or `itPriority` on `PATCH /api/v1/tickets/:id` yields **`HTTP 403 Forbidden`** (`FORBIDDEN`).
  - Permitted only to trigger advisory confirmation via `POST /api/v1/tickets/:id/resolve-indication` for tickets they created.

---

### 3.4. Advisory Requester Confirmation Semantics (`BR-08`, `BR-09`, `FR-45`, `FR-46`)

Requesters have a dedicated action: *"Problem Appears Resolved"* (`POST /api/v1/tickets/:id/resolve-indication`):
1. **Advisory Nature**: This endpoint **never** directly alters the formal `status` of the ticket (e.g. status remains `IN_PROGRESS` or `PENDING_REQUESTER`).
2. **Audit Timestamp**: Updates `requesterResolutionConfirmedAt = new Date()`.
3. **Public Comment & Content Invariant**:
   - If an optional `note` is provided and non-empty (after trimming), appends a `TicketComment` record marked `isInternal: false` containing that note.
   - If `note` is omitted, empty, or whitespace-only, `requesterResolutionConfirmedAt` and `hasOpenActionsWarning` are recorded, and a standardized public comment is appended (`"Requester confirmed that the problem appears resolved."`), preserving database comment content invariants (`validateCommentContent` min 1 char, max 2000 chars per `BR-10`).
4. **Open Actions Warning Flag (`hasOpenActionsWarning`)**:
   - The service inspects whether any Actions Taken remain in `PLANNED` or `IN_PROGRESS`.
   - If open actions exist, the confirmation is successfully recorded, but the returned ticket payload and subsequent detail responses include `hasOpenActionsWarning: true`.
   - The assigned IT Staff Ticket Owner is alerted in the UI that the user indicated resolution while service tasks are still unfinished.

---

### 3.5. Atomic Cascade Cancellation (`BR-10`, `FR-47`, `AC-09`)

Cancelling a ticket requires an explicit cancellation reason and cascades atomically:
1. **Reason Validation**: When `status == CANCELLED`, the client must supply a cancellation reason via `resolutionSummary` (or `cancellationReason`) of at least 5 characters (and max 2000 characters). Empty or short reasons are rejected with `HTTP 422 Unprocessable Entity` (`MISSING_CANCELLATION_REASON`).
2. **Transactional Boundary (`prisma.$transaction`)**:
   - Updates `Ticket`: sets `status = CANCELLED`, records the reason in `resolutionSummary`, increments `version`.
   - Updates `ActionTaken`: updates all actions where `ticketId == :id` AND `status IN ['PLANNED', 'IN_PROGRESS']` to:
     - `status = CANCELLED`
     - `result = "Cancelled due to ticket cancellation: " + cancellationReason` (or appends to existing result note)
     - increments each action's `version`.
   - If either operation fails, the entire transaction rolls back.

---

### 3.6. Deterministic Reopening Semantics (`BR-11`, `FR-48`, `AC-10`)

When a ticket currently in `RESOLVED`, `CLOSED`, or `CANCELLED` status is reopened:
1. **Target Status Resolution Rule**:
   $$\text{targetStatus} = \begin{cases} \text{IN\_PROGRESS}, & \text{if } \text{ownerId} \neq \text{null} \\ \text{NEW}, & \text{if } \text{ownerId} == \text{null} \end{cases}$$
2. **Action State Preservation**:
   - Previously cancelled Actions Taken remain `CANCELLED`.
   - Previously completed Actions Taken remain `COMPLETED`.
   - No actions are automatically re-activated or reverted to `PLANNED`. Technical staff may add new Actions Taken to document subsequent work.

---

### 3.7. Optimistic Concurrency Control (`BR-12`) & Validation Precedence

- Every status modification payload on `PATCH /api/v1/tickets/:id` must include `version: number`.
- If the submitted `version` does not match the database `version`, the query rejects the update with `HTTP 409 Conflict`, code `STALE_UPDATE_CONFLICT` (or `CONCURRENCY_CONFLICT`).
- **Validation Precedence**: The backend evaluates optimistic concurrency version validation *before* executing resolution gate queries against `actions_taken`. If `version !== existingTicket.version`, the server immediately returns `409 STALE_UPDATE_CONFLICT`. Only after version alignment is verified does the service evaluate the resolution gate on open actions. This avoids executing unnecessary queries against `actions_taken` on stale client snapshots and guarantees deterministic error response codes.
- The ticket remains untouched on concurrency conflicts, prompting the client to reload the latest state before retrying.

---

## 4. API Contract & Payload Specifications

### 4.1. Operational Ticket Update (Enforcing Resolution Gate & Cascade Cancel)

* **Endpoint**: `PATCH /api/v1/tickets/:id`
* **Access Control**:
  * `IT_STAFF` & `ADMINISTRATOR`: Authorized.
  * `REQUESTER`: **HTTP 403 Forbidden** (`FORBIDDEN`).
  * Unauthenticated: **HTTP 401 Unauthorized** (`UNAUTHORIZED`).

#### Request Headers:
```http
Content-Type: application/json
```

#### Request Payload Schema:
```typescript
interface UpdateTicketOperationalPayload {
  status?: "NEW" | "ASSIGNED" | "IN_PROGRESS" | "PENDING_REQUESTER" | "RESOLVED" | "CLOSED" | "CANCELLED";
  ownerId?: number | null;
  itPriority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  resolutionSummary?: string;    // Required when status is RESOLVED, CLOSED, or CANCELLED (min 10 chars for resolve/close, min 5 chars for cancel)
  cancellationReason?: string;   // Alias for resolutionSummary when cancelling
  version: number;               // Required for optimistic locking
}
```

#### Example Request: Attempting Resolution
```json
{
  "status": "RESOLVED",
  "resolutionSummary": "Replaced damaged DDR4 RAM stick. Completed 4-pass Memtest86 without errors.",
  "version": 3
}
```

#### Status Code Mappings:

| HTTP Status | Reason / Condition | Error Code | Response Payload Structure |
| :---: | :--- | :--- | :--- |
| **`200 OK`** | Transition permitted, resolution gate passed (or non-terminal transition), version matched. | N/A | Full updated `TicketDetailDto` |
| **`400 Bad Request`** | Invalid ticket ID format or malformed JSON body. | `BAD_REQUEST` | Standard error envelope |
| **`401 Unauthorized`** | Missing or invalid authentication session. | `UNAUTHORIZED` | Standard error envelope |
| **`403 Forbidden`** | Requester attempted to modify status, owner, or priority. | `FORBIDDEN` | Standard error envelope |
| **`404 Not Found`** | Ticket ID does not exist. | `TICKET_NOT_FOUND` | Standard error envelope |
| **`409 Conflict`** | **Resolution Gate Blocked**: One or more Actions Taken are `PLANNED` or `IN_PROGRESS`. | `TICKET_STATE_CONFLICT` | Detailed resolution gate error envelope with `fieldErrors` |
| **`409 Conflict`** | **Concurrency Collision**: Supplied `version` does not match database record. | `STALE_UPDATE_CONFLICT` | Standard concurrency error envelope |
| **`422 Unprocessable`**| Invalid lifecycle transition (e.g. `NEW` &rarr; `RESOLVED`), missing resolution summary, or invalid cancellation reason. | `INVALID_STATUS_TRANSITION` / `MISSING_RESOLUTION_SUMMARY` / `MISSING_CANCELLATION_REASON` | Standard validation error envelope |

#### Exact 409 Resolution Gate Error Envelope (Conforming to `SDS-SYS-001` Section 9):
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
    "correlationId": "req-1728645000-gate-conflict"
  }
}
```

#### Exact 409 Optimistic Concurrency Error Envelope:
```json
{
  "error": {
    "code": "STALE_UPDATE_CONFLICT",
    "message": "Ticket has been modified by another transaction. Please reload and review the latest changes.",
    "correlationId": "req-1728645000-stale-ver"
  }
}
```

---

### 4.2. Requester Advisory Resolution Indication

* **Endpoint**: `POST /api/v1/tickets/:id/resolve-indication`
* **Access Control**:
  * `REQUESTER`: Permitted for owned tickets (`requesterId == req.user.id`).
  * `IT_STAFF` & `ADMINISTRATOR`: Permitted.
  * Cross-requester attempt: **HTTP 403 Forbidden** (`FORBIDDEN`).

#### Request Payload Schema:
```typescript
interface ResolveIndicationPayload {
  note?: string; // Optional user feedback note (up to 1000 characters)
}
```

* **Note Handling & Content Validation**:
  - The `note` field is optional (up to 1000 characters).
  - When non-empty, creates a Public Comment with the caller's text.
  - When omitted or whitespace-only, appends the standard audit text: `"Requester confirmed that the problem appears resolved."` to ensure database integrity (`BR-10`).

#### Example Request:
```json
{
  "note": "The screen does not flicker anymore after the graphics driver update. Works great, thank you!"
}
```

#### Response Payload (`HTTP 200 OK`):
Returns updated confirmation details and warning flag:
```json
{
  "success": true,
  "message": "Resolution indication recorded.",
  "requesterResolutionConfirmedAt": "2026-10-11T14:30:00.000Z",
  "hasOpenActionsWarning": true,
  "ticket": {
    "id": 42,
    "ticketNo": "TKT-2026-00042",
    "status": "IN_PROGRESS",
    "requesterResolutionConfirmedAt": "2026-10-11T14:30:00.000Z",
    "hasOpenActionsWarning": true,
    "version": 4
  }
}
```

---

## 5. UI Specification & Workflow Feedback

### 5.1. Dynamic Staff Status Transition Dropdown

In `StaffTicketDetail.tsx`, the status control replaces arbitrary options with strictly valid next states based on current `ticket.status`:

```typescript
function getPermittedTransitions(currentStatus: string, hasOwner: boolean): string[] {
  switch (currentStatus) {
    case "NEW":
      return ["ASSIGNED", "IN_PROGRESS", "CANCELLED"];
    case "ASSIGNED":
      return ["IN_PROGRESS", "PENDING_REQUESTER", "CANCELLED"];
    case "IN_PROGRESS":
      return ["PENDING_REQUESTER", "RESOLVED", "CANCELLED"];
    case "PENDING_REQUESTER":
      return ["IN_PROGRESS", "RESOLVED", "CANCELLED"];
    case "RESOLVED":
      return ["CLOSED", hasOwner ? "IN_PROGRESS" : "NEW"];
    case "CLOSED":
      return [hasOwner ? "IN_PROGRESS" : "NEW"];
    case "CANCELLED":
      return [hasOwner ? "IN_PROGRESS" : "NEW"];
    default:
      return [];
  }
}
```

- When status is `RESOLVED` or `CLOSED`, the UI dynamically presents the reopen option: `Reopen Ticket (→ IN_PROGRESS)` or `Reopen Ticket (→ NEW)`.
- **HTML Option Value vs. Label Invariant**: While the visible UI labels provide rich context (e.g. `&rarr; Reopen Ticket (IN_PROGRESS)` or `&rarr; Reopen Ticket (NEW)`), the underlying `<option>` element's `value` attribute strictly uses standard `TicketStatus` enum strings (`value="IN_PROGRESS"` or `value="NEW"`):
  ```tsx
  <option value="IN_PROGRESS">&rarr; Reopen Ticket (IN_PROGRESS)</option>
  <option value="NEW">&rarr; Reopen Ticket (NEW)</option>
  ```
  This guarantees that the payload submitted to `PATCH /api/v1/tickets/:id` remains a valid `TicketStatus` enum value without requiring frontend payload transformation.
- Selecting `RESOLVED` or `CLOSED` dynamically expands the required Resolution Summary textarea.
- Selecting `CANCELLED` opens the Cancellation Reason Modal or renders a mandatory Cancellation Reason input.

---

### 5.2. Resolution Gate Warning Dialog / Alert (`UI-15`)

When an IT Staff user attempts to transition status to `RESOLVED` or `CLOSED` and the backend responds with `HTTP 409 Conflict` (`TICKET_STATE_CONFLICT`):
1. The error interceptor detects `error.code === "TICKET_STATE_CONFLICT"`.
2. Rather than displaying a generic error message, the client launches an accessible, high-contrast Zen warning dialog (`ResolutionGateBlockedModal`):
   - **Dialog Role**: `role="alertdialog"`, `aria-labelledby="resolution-gate-title"`, `aria-modal="true"`.
   - **Header Title**: `⚠️ Action Required: Incomplete Actions Taken`
   - **Body Text**:
     > *"This ticket cannot be resolved or closed because open action(s) taken remain in Planned or In Progress status.*
     > 
     > *Please complete or cancel all actions taken before resolving this ticket."*
   - **Actions Taken Notice**: Displays the specific message from `fieldErrors[0].message` (e.g. *"There are 2 open action(s) taken on this ticket."*).
   - **Interactive Actions**:
     1. **`[Review Actions Taken]` (Primary Button)**: Dismisses modal, smoothly scrolls the browser viewport to the `#actions-taken-container` section, and shifts focus to the first open action row.
     2. **`[Dismiss]` (Secondary Button)**: Closes the modal. The ticket status in the sidebar dropdown resets to the current ticket status.

---

### 5.3. Requester Advisory Confirmation Modal

In `RequesterTicketDetail.tsx`, clicking `[✓ Problem Appears Resolved]`:
1. Opens an accessible confirmation modal (`RequesterResolveModal`):
   - **Header**: *"Confirm Resolution"*
   - **Notice**: *"Are you satisfied that your issue has been resolved? IT Staff will review the resolution and formally close the ticket."*
   - **Optional Feedback Note Input**: Textarea for comments (e.g. *"Works great, thank you!"*).
   - **Submit**: Submits payload to `POST /api/v1/tickets/:id/resolve-indication`.
2. Upon success, displays the confirmation banner:
   - *"✓ Problem Appears Resolved: You confirmed that this problem appears resolved on [Date]."*
   - If `hasOpenActionsWarning: true`, the banner notes that technical tasks are still wrapping up.

---

### 5.4. Ticket Cancellation Reason Modal

When transitioning status to `CANCELLED`:
1. The UI enforces entry of a cancellation reason before allowing submission.
2. Form validates `cancellationReason.trim().length >= 5`.
3. Modal clarifies: *"Cancelling this ticket will automatically cancel all open (Planned and In Progress) Actions Taken."*
4. Confirming executes the atomic cascade cancellation.

---

## 6. Software Test Specification

In accordance with `docs/lab-04/tests.md`, Feature-15 is verified across Unit, API Integration, UI Component, and End-to-End browser tiers:

| Test ID | Level | Mapped Reqs / AC | Test Name & Target Verification | Implementation Details & Assertions | Target File |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **UT-05** | Unit | `BR-06`, `BR-07`, `FR-43`, `AC-07` | Pure Domain Resolution Gate Rule Function | Evaluates action status list. Returns `false` if ANY action is `PLANNED` or `IN_PROGRESS`. Returns `true` only when all actions are `COMPLETED` or `CANCELLED` (or empty array). | `server/tests/lab-04/ticket-workflow.api.test.ts` |
| **UT-06** | Unit | `BR-11`, `FR-48`, `AC-10` | Reopen Status Calculation Rule | Pure function returns `IN_PROGRESS` if `ownerId` exists; returns `NEW` if `ownerId` is `null` or `undefined`. | `server/tests/lab-04/ticket-workflow.api.test.ts` |
| **API-28** | API | `AC-07`, `FR-43`, `BR-06` | Attempt Ticket Resolution with Open Actions | Create ticket with one `PLANNED` action and one `IN_PROGRESS` action. IT Staff attempts `PATCH /api/v1/tickets/:id` with `status: RESOLVED`. Assert `HTTP 409 Conflict`, error code `TICKET_STATE_CONFLICT`, `fieldErrors` present. Ticket status remains unchanged. | `server/tests/lab-04/ticket-workflow.api.test.ts` |
| **API-29** | API | `AC-08`, `FR-43`, `BR-07` | Resolve Ticket After Actions Completed / Cancelled | Update all actions on ticket to `COMPLETED` or `CANCELLED`. IT Staff submits `status: RESOLVED` with valid `resolutionSummary`. Assert `HTTP 200 OK` and status updates to `RESOLVED`. | `server/tests/lab-04/ticket-workflow.api.test.ts` |
| **API-30** | API | `FR-44`, `BR-13` | Requester Direct Status Transition Rejection | Requester submits `PATCH /api/v1/tickets/:id` with `status: RESOLVED` or `CLOSED`. Assert `HTTP 403 Forbidden` (`FORBIDDEN`). Status remains unchanged. | `server/tests/lab-04/ticket-workflow.api.test.ts` |
| **API-31** | API | `FR-45`, `FR-46`, `BR-08`, `BR-09` | Requester Advisory Indication with Open Actions | Requester submits `POST /api/v1/tickets/:id/resolve-indication` while open actions exist. Assert `HTTP 200 OK`, `requesterResolutionConfirmedAt` recorded, `hasOpenActionsWarning: true`, formal status unchanged. | `server/tests/lab-04/ticket-workflow.api.test.ts` |
| **API-32** | API | `AC-09`, `FR-47`, `BR-10` | Ticket Cancellation Cascades Atomically to Actions | Cancel ticket with valid cancellation reason. Assert in database that ticket status is `CANCELLED` and all previously `PLANNED` or `IN_PROGRESS` actions are now `CANCELLED`. Terminal (`COMPLETED`) actions remain untouched. | `server/tests/lab-04/ticket-workflow.api.test.ts` |
| **API-33** | API | `AC-10`, `FR-48`, `BR-11` | Reopen Ticket with Assigned Owner | Reopen ticket that has an assigned `ownerId`. Assert ticket status transitions to `IN_PROGRESS`. Previously cancelled actions remain `CANCELLED`. | `server/tests/lab-04/ticket-workflow.api.test.ts` |
| **API-34** | API | `AC-10`, `FR-48`, `BR-11` | Reopen Ticket Without Assigned Owner | Reopen ticket with `ownerId: null`. Assert ticket status transitions to `NEW`. | `server/tests/lab-04/ticket-workflow.api.test.ts` |
| **UI-15** | UI | `FR-43`, `AC-07` | Ticket Detail Resolution Gate Blocked Alert Modal | Render `StaffTicketDetail`. Simulate API returning `409 TICKET_STATE_CONFLICT`. Assert high-contrast warning modal renders with title *"Action Required: Incomplete Actions Taken"*, message, and `[Review Actions Taken]` button. | `client/tests/lab-04/TicketWorkflow.test.tsx` |
| **UI-16** | UI | `FR-45`, `FR-48` | Status Dropdown Permitted Transitions & Reopen Display | Render `StaffTicketDetail` for various statuses (`NEW`, `IN_PROGRESS`, `RESOLVED`, `CANCELLED`). Assert dropdown only renders permitted transitions matching state machine. | `client/tests/lab-04/TicketWorkflow.test.tsx` |
| **E2E-03** | E2E | `AC-07`, `AC-08` | Full Resolution Gate Enforcement Workflow | 1. IT Staff logs in, opens ticket with open Action Taken.<br>2. Attempts to set status to `RESOLVED` &rarr; blocked by Resolution Gate warning dialog.<br>3. Clicks `[Review Actions Taken]` &rarr; scrolls to actions section.<br>4. Edits open action and marks it `COMPLETED`.<br>5. Retries setting status to `RESOLVED` with summary &rarr; succeeds, badge displays `RESOLVED`. | `e2e/lab-04/ticket-resolution.spec.ts` |

---

## 7. Genuine Source Conflicts, Ambiguities & Open Questions

The following engineering decisions reconcile source specifications without introducing scope creep:

1. **Cancellation Reason Storage (`resolutionSummary` vs. `cancellationReason`)**:
   - *Conflict*: `api-spec.md` Section 4.1 notes `"When status is set to CANCELLED, cancellationReason (or resolutionSummary) is required"`. The Prisma schema `Ticket` model contains `resolutionSummary String?`, but lacks a separate `cancellationReason` column.
   - *Resolution*: Accept either `cancellationReason` or `resolutionSummary` in the incoming payload. Persist the value into `ticket.resolutionSummary` and propagate this text into the `result` field of each cascaded action (`"Cancelled due to ticket cancellation: " + reason`).
2. **Reopening State Matrix Extension in `status-transition.ts`**:
   - *Conflict*: The current Lab 3 codebase has `CANCELLED: []` (strictly terminal) and `RESOLVED: [CLOSED, IN_PROGRESS]`. However, Lab 4 `FR-48`, `BR-11`, and `AC-10` require reopening from `RESOLVED`, `CLOSED`, or `CANCELLED` to `IN_PROGRESS` (if owner assigned) or `NEW` (if unassigned).
   - *Resolution*: Update `isValidStatusTransition` and `ALLOWED_STATUS_TRANSITIONS` so that `CANCELLED` permits transitions to `IN_PROGRESS` and `NEW`, and `RESOLVED`/`CLOSED` permit transitions to `NEW` when unassigned.
3. **Reopening Actor Authorization**:
   - *Conflict*: `BR-11` states *"Any authenticated user with read access may reopen a ticket..."*, but `FR-44` and `api-spec.md` state *"Requesters receive HTTP 403 Forbidden for status updates"*.
   - *Resolution*: Reopening via `PATCH /api/v1/tickets/:id` is enforced as an IT Staff / Administrator operation, maintaining strict RBAC consistency with Lab 3. If a requester needs to request ticket reopening, they post a public comment.
4. **Advisory Indication API Response Contract**:
   - *Conflict*: `ticket-detail.controller.ts` previously returned `{ message, requesterResolutionConfirmedAt }`, whereas `api-spec.md` Sec 4.2 states `Returns updated Ticket DTO`.
   - *Resolution*: Return a hybrid DTO containing `{ success: true, message: string, requesterResolutionConfirmedAt: string, hasOpenActionsWarning: boolean, ticket: TicketDetailDto }`. This satisfies both the existing client caller and the expanded specification.
5. **Conflict Error Codes (`TICKET_STATE_CONFLICT` vs `STALE_UPDATE_CONFLICT`)**:
   - *Ambiguity*: Lab 3 returned generic `CONCURRENCY_CONFLICT` on stale versions.
   - *Resolution*: Return `code: "TICKET_STATE_CONFLICT"` specifically when open actions block resolution, and `code: "STALE_UPDATE_CONFLICT"` (with backward-compatible message) when version collision occurs, satisfying both test suites and SDS error standards.
6. **Controller Validation Precedence on `PATCH /api/v1/tickets/:id`**:
   - *Recommendation*: Evaluate `version` concurrency check prior to the resolution gate query. If `version !== existingTicket.version`, return `409 STALE_UPDATE_CONFLICT` immediately. This prevents unnecessary database queries against `actions_taken` on stale client snapshots and prevents masking concurrency collisions.
7. **Frontend Reopen Dropdown Option Value vs. Label Separation**:
   - *Recommendation*: Keep `<option value="IN_PROGRESS">` and `<option value="NEW">` as standard enum strings, displaying `Reopen Ticket (→ IN_PROGRESS)` as the visible label. This avoids custom enum mapping layers on the client.
8. **Handling Omitted or Blank Notes on `POST /resolve-indication`**:
   - *Recommendation*: When `note` is omitted or empty/whitespace, record the confirmation timestamp and warning flag, and append standard audit text (`"Requester confirmed that the problem appears resolved."`), preserving comment table non-empty validation invariants (`BR-10`).
