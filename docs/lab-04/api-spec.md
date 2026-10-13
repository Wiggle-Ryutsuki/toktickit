# TokTickIT REST API Specification (Lab 4)

**Document ID**: API-SPEC-LAB-04  
**Version**: 1.0  
**Status**: Approved API Contract Baseline  
**Handout Reference**: `docs/lab-04/Labsheet_4.pdf` (Section 6, pp. 4–5)  
**Parent Specification**: `docs/TokTickIT-System-Level-SDS-v1.0.pdf` (Section *API Design Standards*, pp. 12–13)  
**Target Branch**: `lab4-staging`  

---

## 1. Global API Conventions

* **Base URL**: `/api/v1` (with backward-compatible aliases routed under `/api`).
* **Serialization & Content Type**: All requests and responses use JSON (`application/json`), except multipart file uploads (`multipart/form-data`) and binary file streams.
* **Naming Discipline**: All JSON request and response keys strictly use `camelCase`.
* **Date & Time Format**: All timestamps are formatted as ISO 8601 UTC strings (e.g. `2026-10-08T14:30:00.000Z`). Client handles localization.
* **Session Authentication**:
  * Authenticated calls use the opaque `toktickit_session` cookie (`HttpOnly; Secure; SameSite=Lax; Path=/`).
  * Backend middleware derives `req.user` securely from PostgreSQL.
  * Direct client spoofing (e.g. client-supplied `requesterId` or `performedById`) is completely ignored.
* **DTO Serialization**: Prisma models are never directly serialized; output payloads adhere strictly to documented DTO shapes (`SDS-SYS-001`, Section 9, p. 12).

---

## 2. Standard Error Envelope & Status Codes

### 2.1. Standard Error Envelope
All error responses adhere to the standard envelope defined in `SDS-SYS-001` Section 9 (p. 12):

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request payload failed validation.",
    "fieldErrors": [
      {
        "field": "followUpNote",
        "message": "Follow-up note is mandatory when follow-up is required."
      }
    ],
    "correlationId": "req-1728470000-abc1234"
  }
}
```

### 2.2. HTTP Status Codes
* `200 OK`: Successful resource retrieval or update.
* `201 Created`: Resource successfully created.
* `400 Bad Request`: Malformed JSON or invalid parameter syntax.
* `401 Unauthorized`: Missing or invalid session cookie.
* `403 Forbidden`: Authenticated user lacks permission for the requested operation.
* `404 Not Found`: Target resource does not exist.
* `409 Conflict`: Optimistic locking conflict or workflow resolution gate violation (`TICKET_STATE_CONFLICT`).
* `422 Unprocessable Entity`: Business rule failure (e.g., assigning an action to an inactive user).
* `500 Internal Server Error`: Generic safe failure message with correlation ID; no stack traces exposed.

---

## 3. Actions Taken REST Endpoints (Feature-13)

### 3.1. List Actions Taken for Ticket
Retrieves all Actions Taken lines for a specific ticket in ascending chronological order.

* **Endpoint**: `GET /api/v1/tickets/:id/actions`
* **Access Control**:
  * `REQUESTER`: Permitted strictly for tickets where `requesterId == req.user.id`.
  * `IT_STAFF` & `ADMINISTRATOR`: Permitted for all tickets.
* **URL Parameters**:
  * `id` (integer, required): Target Ticket ID.
* **Response (HTTP 200 OK)**:
```json
[
  {
    "id": 101,
    "ticketId": 34,
    "actionDateTime": "2026-10-08T09:30:00.000Z",
    "description": "Ran hardware diagnostic tools on laptop memory modules.",
    "result": "Memory module in slot 2 reported multiple parity errors.",
    "status": "COMPLETED",
    "performedBy": {
      "id": 2,
      "displayName": "Michael Brown",
      "email": "michael@example.com",
      "role": "IT_STAFF"
    },
    "assignee": {
      "id": 2,
      "displayName": "Michael Brown",
      "email": "michael@example.com",
      "role": "IT_STAFF"
    },
    "isFollowUpRequired": true,
    "followUpNote": "Order replacement DDR4 16GB RAM module from supplier.",
    "attachmentNotes": "diagnostic-report-memtest.txt",
    "createdAt": "2026-10-08T09:35:00.000Z",
    "updatedAt": "2026-10-08T09:40:00.000Z"
  }
]
```

---

### 3.2. Create Action Taken
Appends a new Action Taken record to a ticket.

* **Endpoint**: `POST /api/v1/tickets/:id/actions`
* **Access Control**:
  * `IT_STAFF` & `ADMINISTRATOR`: Permitted.
  * `REQUESTER`: **HTTP 403 Forbidden**.
* **Request Body**:
```json
{
  "actionDateTime": "2026-10-08T10:00:00.000Z",
  "description": "Installed replacement RAM module and re-ran diagnostic test suite.",
  "result": "All diagnostics passed successfully with 0 errors.",
  "status": "COMPLETED",
  "assigneeId": 2,
  "isFollowUpRequired": false,
  "followUpNote": null,
  "attachmentNotes": null
}
```
* **Validation Rules**:
  * `description`: Required string, 5–1000 characters.
  * `status`: Optional enum (`PLANNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`); defaults to `PLANNED`.
  * `assigneeId`: Optional integer. If provided, must reference an active user (`isActive: true`) having role `IT_STAFF` or `ADMINISTRATOR`. If user is inactive, returns `HTTP 422` with code `INACTIVE_ASSIGNEE_ERROR`.
  * `isFollowUpRequired`: Optional boolean, defaults to `false`.
  * `followUpNote`: If `isFollowUpRequired == true`, must be a non-empty string (3–500 chars). If `false`, forced to `null`.
  * `performedById`: Ignored if sent by client; automatically set to `req.user.id`.
* **Response (HTTP 201 Created)**: Returns created Action Taken DTO.
* **Error Responses**:
  * `403 Forbidden`: Authenticated user is a Requester.
  * `404 Not Found`: Ticket does not exist.
  * `422 Unprocessable Entity`: Validation failure or inactive assignee.

---

### 3.3. Update Action Taken
Modifies an existing Action Taken record.

* **Endpoint**: `PATCH /api/v1/tickets/:id/actions/:actionId`
* **Access Control**:
  * `IT_STAFF` & `ADMINISTRATOR`: Permitted.
  * `REQUESTER`: **HTTP 403 Forbidden**.
* **Request Body** (all fields optional):
```json
{
  "description": "Updated action description.",
  "result": "PO placed for hardware components.",
  "status": "IN_PROGRESS",
  "assigneeId": 3,
  "isFollowUpRequired": true,
  "followUpNote": "Check shipping confirmation by 12 Oct.",
  "attachmentNotes": "po-receipt.pdf"
}
```
* **Validation & Business Rules**:
  * Terminal state check: An action with status `COMPLETED` or `CANCELLED` cannot be reverted to `PLANNED` or `IN_PROGRESS`.
  * Inactive assignee check: Cannot update `assigneeId` to an inactive user.
  * Conditional follow-up: If updating `isFollowUpRequired` to `true`, `followUpNote` is mandatory.
* **Response (HTTP 200 OK)**: Returns updated Action Taken DTO.

---

## 4. Ticket Workflow & Resolution Gate REST Endpoints (Feature-15)

### 4.1. Operational Ticket Update (Enforcing Resolution Gate)
Extends the existing `PATCH /api/v1/tickets/:id` endpoint with resolution gate verification.

* **Endpoint**: `PATCH /api/v1/tickets/:id`
* **Access Control**:
  * `IT_STAFF` & `ADMINISTRATOR`: Full update authority.
  * `REQUESTER`: **HTTP 403 Forbidden** for status, priority, and owner updates.
* **Request Body**:
```json
{
  "status": "RESOLVED",
  "resolutionSummary": "Replaced faulty RAM module with new 16GB unit. Diagnostics verified.",
  "version": 2
}
```
* **Resolution Gate Rule (FR-43, BR-06)**:
  * When `status` is set to `RESOLVED` or `CLOSED`, the backend queries associated Actions Taken for the ticket.
  * If ANY action exists with status `PLANNED` or `IN_PROGRESS`, the request is **rejected** with `HTTP 409 Conflict`.
* **Conflict Response (HTTP 409 Conflict)**:
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
* **Cascade Cancellation Rule (BR-10)**:
  * When `status` is set to `CANCELLED`, `cancellationReason` (or `resolutionSummary`) is required.
  * In a single Prisma transaction, the backend updates ticket status to `CANCELLED` and atomically sets all open (`PLANNED`, `IN_PROGRESS`) Actions Taken to `CANCELLED` with the same reason.
* **Reopening Rule (BR-11)**:
  * An authorized user may reopen a ticket in `RESOLVED`, `CLOSED`, or `CANCELLED` status.
  * If `ownerId` is not null, status transitions to `IN_PROGRESS`.
  * If `ownerId` is null (unassigned), status transitions to `NEW`.
  * Previously cancelled actions remain `CANCELLED`.
* **Optimistic Concurrency (BR-12)**:
  * Submitting a stale `version` number returns `HTTP 409 Conflict` (`STALE_UPDATE_CONFLICT`).

---

### 4.2. Advisory Requester Resolution Indication
Preserved from Lab 3. Allows requesters to indicate that their problem appears resolved without modifying formal ticket status.

* **Endpoint**: `POST /api/v1/tickets/:id/resolve-indication`
* **Access Control**:
  * `REQUESTER`: Permitted for owned tickets (`requesterId == req.user.id`).
  * `IT_STAFF` & `ADMINISTRATOR`: Permitted.
* **Request Body**:
```json
{
  "note": "The laptop boots up fast now and works great. Thank you!"
}
```
* **Behavior (FR-45, BR-08, BR-09)**:
  * Sets `requesterResolutionConfirmedAt` to `now()` and appends a Public Comment with the note.
  * Formal ticket status is **not** changed to `RESOLVED`.
  * If open Actions Taken exist on the ticket, the confirmation is recorded and the Ticket Owner receives a warning flag in the ticket payload (`hasOpenActionsWarning: true`).
* **Response (HTTP 200 OK)**: Returns updated Ticket DTO.

---

## 5. Role-Based Dashboards REST Endpoints (Feature-16)

### 5.1. Requester Dashboard
Returns authoritative metric counts and recent tickets strictly scoped to the calling Requester.

* **Endpoint**: `GET /api/v1/dashboard/requester`
* **Access Control**:
  * `REQUESTER`: Permitted.
  * `IT_STAFF` & `ADMINISTRATOR`: Permitted (returns metrics for any tickets requested by the current user).
  * Unauthenticated: **HTTP 401 Unauthorized**.
* **Query Parameters**: None. Scoped authoritatively to `req.user.id`.
* **Response (HTTP 200 OK)**:
```json
{
  "metrics": {
    "myOpenTickets": 3,
    "inProgress": 2,
    "resolved": 5,
    "closed": 12
  },
  "recentTickets": [
    {
      "id": 34,
      "ticketNo": "TKT-2026-00034",
      "title": "Laptop battery drains quickly",
      "status": "IN_PROGRESS",
      "priority": "HIGH",
      "createdAt": "2026-10-08T09:14:00.000Z",
      "updatedAt": "2026-10-08T09:30:00.000Z"
    },
    {
      "id": 22,
      "ticketNo": "TKT-2026-00022",
      "title": "Request software access",
      "status": "RESOLVED",
      "priority": "MEDIUM",
      "createdAt": "2026-10-07T11:20:00.000Z",
      "updatedAt": "2026-10-07T16:00:00.000Z"
    }
  ]
}
```

---

### 5.2. IT Staff & Administrator Dashboard
Returns authoritative operational queue metrics and recent triage tickets across the entire organization.

* **Endpoint**: `GET /api/v1/dashboard/staff`
* **Access Control**:
  * `IT_STAFF` & `ADMINISTRATOR`: Permitted.
  * `REQUESTER`: **HTTP 403 Forbidden**.
* **Response (HTTP 200 OK)**:
```json
{
  "metrics": {
    "newTickets": {
      "count": 14,
      "deltaYesterday": 3
    },
    "openTickets": {
      "count": 23,
      "deltaYesterday": -1
    },
    "inProgress": {
      "count": 18,
      "deltaYesterday": -1
    },
    "waitingForRequester": {
      "count": 7,
      "deltaYesterday": 2
    },
    "myAssigned": {
      "count": 16,
      "deltaYesterday": 1
    }
  },
  "recentTickets": [
    {
      "id": 34,
      "ticketNo": "TKT-2026-00034",
      "title": "Laptop battery drains quickly",
      "status": "IN_PROGRESS",
      "itPriority": "HIGH",
      "requesterName": "Jennifer Anderson",
      "ownerName": "Michael Brown",
      "createdAt": "2026-10-08T09:14:00.000Z",
      "updatedAt": "2026-10-08T09:30:00.000Z"
    },
    {
      "id": 30,
      "ticketNo": "TKT-2026-00030",
      "title": "Printer keep showing offline",
      "status": "ASSIGNED",
      "itPriority": "MEDIUM",
      "requesterName": "Alex Chen",
      "ownerName": null,
      "createdAt": "2026-10-08T08:00:00.000Z",
      "updatedAt": "2026-10-08T08:00:00.000Z"
    }
  ]
}
```

---

## 6. Security & Role Authorization Matrix

| Endpoint | Method | Requester | IT Staff | Administrator |
| :--- | :---: | :---: | :---: | :---: |
| `/api/v1/tickets/:id/actions` | `GET` | Owned tickets only | All tickets | All tickets |
| `/api/v1/tickets/:id/actions` | `POST` | **403 Forbidden** | Allowed | Allowed |
| `/api/v1/tickets/:id/actions/:actionId` | `PATCH` | **403 Forbidden** | Allowed | Allowed |
| `/api/v1/tickets/:id` (operational/status) | `PATCH` | **403 Forbidden** | Allowed | Allowed |
| `/api/v1/tickets/:id/resolve-indication` | `POST` | Owned tickets only | Allowed | Allowed |
| `/api/v1/dashboard/requester` | `GET` | Owned data only | Owned data | Owned data |
| `/api/v1/dashboard/staff` | `GET` | **403 Forbidden** | Allowed | Allowed |
| `/api/v1/users/staff` | `GET` | Allowed (for detail) | Allowed | Allowed |
| `/api/v1/admin/users` | All | **403 Forbidden** | **403 Forbidden** | Allowed |
