# TokTickIT REST API Specification (Lab 3)

**Document ID**: API-SPEC-LAB-03  
**Version**: 1.0  
**Status**: Approved API Contract Baseline  
**Handout Reference**: `docs/lab-03/Lab_3_sheet.pdf` (Section 6, pp. 6–7)  
**Parent Specification**: `docs/TokTickIT-System-Level-SDS-v1.0.pdf` (Section *API Design Standards*, p. 12)  
**Target Branch**: `lab3-staging`  

---

## 1. Global API Conventions

* **Base URL**: `/api/v1` (with backward-compatible routing maintained under `/api`).
* **Protocol & Serialization**: All requests and responses use JSON (`Content-Type: application/json`), except multipart file upload (`multipart/form-data`) and binary file downloads.
* **Naming Conventions**: JSON object property names strictly use `camelCase`.
* **Date & Time**: Timestamps use ISO 8601 UTC strings (e.g. `2026-09-15T14:30:00.000Z`).
* **Authentication & Sessions**: 
  * Authenticated requests use an opaque session cookie (`toktickit_session`) with flags `HttpOnly; Secure; SameSite=Lax; Path=/`.
  * The server reads this cookie, looks up the session in PostgreSQL, and produces the authenticated user context (`req.user`).
  * Direct spoofing via client-supplied headers (such as `X-Requester-Id` or `requesterId` bodies) is completely ignored.
* **DTO Mapping**: Database Prisma models are never directly serialized; output payloads strictly adhere to documented DTO schemas.

---

## 2. Standard Error Envelope & Status Codes

### 2.1. Standard Error Envelope
All error responses return a standardized JSON structure:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request payload failed validation.",
    "fieldErrors": [
      {
        "field": "newPassword",
        "message": "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
      }
    ],
    "correlationId": "req-1726410600-abc1234"
  }
}
```

### 2.2. HTTP Status Codes
* `200 OK`: Successful resource retrieval or mutation.
* `201 Created`: Resource successfully created.
* `400 Bad Request`: Malformed JSON or invalid query syntax.
* `401 Unauthorized`: Missing or invalid session credentials.
* `403 Forbidden`: Authenticated user lacks permission for the resource.
* `404 Not Found`: Resource does not exist (or concealed to prevent enumeration).
* `409 Conflict`: Stale update detected via optimistic concurrency `version`.
* `413 Payload Too Large`: Uploaded file exceeds 5 MB.
* `415 Unsupported Media Type`: File format not allowed (only JPG, PNG, WEBP, PDF).
* `422 Unprocessable Entity`: Business rule or validation constraint violation.
* `500 Internal Server Error`: Generic safe server error; no stack traces exposed.

---

## 3. Detailed Endpoint Contracts

### 3.1. Authentication & Session Management

#### `POST /api/v1/auth/login`
* **Purpose**: Authenticate user credentials and establish a server session.
* **Access**: Public.
* **Request Body**:
```json
{
  "email": "staff.somchai@kmutt.ac.th",
  "password": "Password123!"
}
```
* **Validation**:
  * `email`: valid email string, required, trimmed, normalized lowercase.
  * `password`: non-empty string, required.
* **Response `200 OK`**:
  * Header: `Set-Cookie: toktickit_session=<opaque-token>; HttpOnly; SameSite=Lax; Path=/`
  * Body:
```json
{
  "user": {
    "id": 5,
    "email": "staff.somchai@kmutt.ac.th",
    "displayName": "Somchai Jaidee",
    "role": "IT_STAFF",
    "mustChangePassword": false
  }
}
```
* **Errors**:
  * `401 Unauthorized` (`INVALID_CREDENTIALS`): Generic error if email not found or password incorrect.
  * `403 Forbidden` (`ACCOUNT_INACTIVE`): Account exists but `isActive: false`.

---

#### `POST /api/v1/auth/logout`
* **Purpose**: Invalidate current session and remove authentication cookie.
* **Access**: Authenticated.
* **Headers**: `Cookie: toktickit_session=...`
* **Response `200 OK`**:
  * Header: `Set-Cookie: toktickit_session=; Max-Age=0; Path=/`
```json
{
  "message": "Successfully logged out."
}
```

---

#### `GET /api/v1/auth/me`
* **Purpose**: Retrieve the current authenticated user's profile and permissions.
* **Access**: Authenticated.
* **Response `200 OK`**:
```json
{
  "user": {
    "id": 5,
    "email": "staff.somchai@kmutt.ac.th",
    "displayName": "Somchai Jaidee",
    "role": "IT_STAFF",
    "mustChangePassword": false
  }
}
```
* **Errors**:
  * `401 Unauthorized`: If session missing or expired.

---

#### `POST /api/v1/auth/change-password`
* **Purpose**: Change password for first-login compliance or manual user update.
* **Access**: Authenticated.
* **Request Body**:
```json
{
  "currentPassword": "InitialPassword123!",
  "newPassword": "NewSecurePassword456#",
  "confirmPassword": "NewSecurePassword456#"
}
```
* **Validation**:
  * `currentPassword`: Required string matching active user password hash.
  * `newPassword`: Required string $\ge 8$ characters with upper, lower, digit, and special char.
  * `confirmPassword`: Required string matching `newPassword`.
* **Response `200 OK`**:
```json
{
  "message": "Password changed successfully.",
  "user": {
    "id": 5,
    "email": "staff.somchai@kmutt.ac.th",
    "displayName": "Somchai Jaidee",
    "role": "IT_STAFF",
    "mustChangePassword": false
  }
}
```
* **Errors**:
  * `400 Bad Request`: `newPassword` does not match `confirmPassword`.
  * `422 Unprocessable Entity`: `currentPassword` incorrect or `newPassword` violates complexity rules.

---

### 3.2. IT Staff Ticket Queue

#### `GET /api/v1/tickets` (IT Staff / Admin Shared Queue)
* **Purpose**: Retrieve filtered, sorted, paginated ticket records.
* **Access**: `IT_STAFF` and `ADMINISTRATOR` only. (Requesters calling this without `requesterId` query receive `403 Forbidden`).
* **Query Parameters**:
  * `search` (optional): string searching Ticket Number and Summary.
  * `category` (optional): category ID or name filter.
  * `status` (optional): ticket status filter (`NEW`, `ASSIGNED`, `IN_PROGRESS`, etc.).
  * `requestedPriority` (optional): priority filter (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).
  * `itPriority` (optional): priority filter (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).
  * `assignment` (optional): `unassigned` | `mine` | `all`.
  * `sortBy` (optional): `createdAt` | `ticketNo` | `updatedAt` | `status` (default: `createdAt`).
  * `sortOrder` (optional): `asc` | `desc` (default: `desc`).
  * `page` (optional): integer (default: `1`).
  * `pageSize` (optional): integer (default: `10`, max: `100`).
* **Response `200 OK`**:
```json
{
  "tickets": [
    {
      "id": 12,
      "ticketNo": "TKT-2026-00012",
      "summary": "Laptop battery drains quickly",
      "category": { "id": 2, "name": "Hardware" },
      "relatedSystem": { "id": 2, "name": "Corporate Laptop" },
      "requester": { "id": 1, "displayName": "Jennifer Anderson", "email": "jennifer.anderson@kmutt.ac.th" },
      "owner": { "id": 5, "displayName": "Somchai Jaidee" },
      "requestedPriority": "MEDIUM",
      "itPriority": "HIGH",
      "status": "IN_PROGRESS",
      "createdAt": "2026-09-12T08:30:00.000Z",
      "updatedAt": "2026-09-13T10:15:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalCount": 87,
    "totalPages": 9
  }
}
```
* **Errors**:
  * `403 Forbidden`: If called by user with role `REQUESTER`.

---

### 3.3. Ticket Detail & Operational Updates

#### `GET /api/v1/tickets/:id`
* **Purpose**: Retrieve ticket details, owner info, comments, and attachments.
* **Access**: Authenticated.
  * Requester can only access owned tickets (`requesterId === user.id`).
  * IT Staff and Admin can access all tickets.
* **Response `200 OK`**:
```json
{
  "id": 12,
  "ticketNo": "TKT-2026-00012",
  "summary": "Laptop battery drains quickly",
  "description": "My laptop battery is draining much faster than usual.",
  "requester": {
    "id": 1,
    "displayName": "Jennifer Anderson",
    "email": "jennifer.anderson@kmutt.ac.th"
  },
  "owner": {
    "id": 5,
    "displayName": "Somchai Jaidee",
    "email": "staff.somchai@kmutt.ac.th"
  },
  "category": { "id": 2, "name": "Hardware" },
  "relatedSystem": { "id": 2, "name": "Corporate Laptop" },
  "requestedPriority": "MEDIUM",
  "itPriority": "HIGH",
  "status": "IN_PROGRESS",
  "resolutionSummary": null,
  "requesterResolutionConfirmedAt": null,
  "version": 3,
  "attachments": [
    {
      "id": 101,
      "originalFilename": "battery_diagnostic.png",
      "sizeBytes": 204800,
      "mimeType": "image/png",
      "createdAt": "2026-09-12T08:30:00.000Z",
      "isDeleted": false
    }
  ],
  "createdAt": "2026-09-12T08:30:00.000Z",
  "updatedAt": "2026-09-13T10:15:00.000Z"
}
```
* **Errors**:
  * `403 Forbidden`: Requester accessing another requester's ticket.
  * `404 Not Found`: Ticket does not exist.

---

#### `PATCH /api/v1/tickets/:id`
* **Purpose**: Operational ticket updates (claim/reassign owner, update IT priority, transition status, resolution summary).
* **Access**: `IT_STAFF` and `ADMINISTRATOR` only.
* **Request Body**:
```json
{
  "ownerId": 5,
  "itPriority": "HIGH",
  "status": "RESOLVED",
  "resolutionSummary": "Replaced battery with spare unit; diagnostics verified.",
  "version": 3
}
```
* **Validation**:
  * `ownerId` (optional): Must reference active user with role `IT_STAFF` or `ADMINISTRATOR`.
  * `itPriority` (optional): `LOW` | `MEDIUM` | `HIGH` | `URGENT`.
  * `status` (optional): Must follow permitted status transition rules.
  * `resolutionSummary`: Required if transitioning to `RESOLVED` or `CLOSED`.
  * `version`: Required integer matching current database record version.
* **Response `200 OK`**:
```json
{
  "id": 12,
  "ticketNo": "TKT-2026-00012",
  "ownerId": 5,
  "itPriority": "HIGH",
  "status": "RESOLVED",
  "resolutionSummary": "Replaced battery with spare unit; diagnostics verified.",
  "version": 4,
  "updatedAt": "2026-09-15T15:00:00.000Z"
}
```
* **Errors**:
  * `403 Forbidden`: Calling user is `REQUESTER`.
  * `409 Conflict`: Concurrency conflict (`version` mismatch).
  * `422 Unprocessable Entity`: Invalid status transition or missing resolution summary.

---

#### `POST /api/v1/tickets/:id/resolve-indication`
* **Purpose**: Requester indication that the reported problem appears resolved.
* **Access**: Requester who owns the ticket.
* **Response `200 OK`**:
```json
{
  "message": "Resolution indication recorded.",
  "requesterResolutionConfirmedAt": "2026-09-15T15:10:00.000Z"
}
```

---

### 3.4. Comments and Notes

#### `GET /api/v1/tickets/:id/comments`
* **Purpose**: Retrieve chronological Public Comments for an accessible ticket.
* **Access**: Authenticated (accessible if ticket is viewable).
* **Response `200 OK`**:
```json
[
  {
    "id": 1,
    "author": { "id": 1, "displayName": "Jennifer Anderson", "role": "REQUESTER" },
    "content": "Thank you for the update. Please let me know if you need more logs.",
    "createdAt": "2026-09-13T11:45:00.000Z"
  }
]
```

---

#### `POST /api/v1/tickets/:id/comments`
* **Purpose**: Post a new Public Comment on a ticket.
* **Access**: Authenticated (accessible if ticket is viewable).
* **Request Body**:
```json
{
  "content": "We have received the replacement parts and scheduled the repair."
}
```
* **Validation**: `content` must be non-empty after trim, between 1 and 2000 characters.
* **Response `201 Created`**:
```json
{
  "id": 2,
  "ticketId": 12,
  "authorId": 5,
  "content": "We have received the replacement parts and scheduled the repair.",
  "createdAt": "2026-09-15T15:20:00.000Z"
}
```

---

#### `GET /api/v1/tickets/:id/notes`
* **Purpose**: Retrieve chronological Internal Notes for a ticket.
* **Access**: `IT_STAFF` and `ADMINISTRATOR` only. (Requesters return `403 Forbidden`).
* **Response `200 OK`**:
```json
[
  {
    "id": 1,
    "author": { "id": 5, "displayName": "Somchai Jaidee", "role": "IT_STAFF" },
    "content": "Checked warranty status with vendor. Unit is eligible for battery replacement.",
    "createdAt": "2026-09-12T09:00:00.000Z"
  }
]
```
* **Errors**:
  * `403 Forbidden`: If called by user with role `REQUESTER`.

---

#### `POST /api/v1/tickets/:id/notes`
* **Purpose**: Post a new private Internal Note.
* **Access**: `IT_STAFF` and `ADMINISTRATOR` only.
* **Request Body**:
```json
{
  "content": "Escalated to level 2 hardware support for component swap."
}
```
* **Validation**: `content` must be non-empty after trim, between 1 and 2000 characters.
* **Response `201 Created`**:
```json
{
  "id": 2,
  "ticketId": 12,
  "authorId": 5,
  "content": "Escalated to level 2 hardware support for component swap.",
  "createdAt": "2026-09-15T15:25:00.000Z"
}
```
* **Errors**:
  * `403 Forbidden`: If called by `REQUESTER`.

---

### 3.5. Administrator User Management

#### `GET /api/v1/admin/users`
* **Purpose**: List user accounts with optional name/email search and role filtering.
* **Access**: `ADMINISTRATOR` only.
* **Query Parameters**:
  * `search` (optional): Name or email substring.
  * `role` (optional): `REQUESTER` | `IT_STAFF` | `ADMINISTRATOR`.
* **Response `200 OK`**:
```json
[
  {
    "id": 1,
    "displayName": "Jennifer Anderson",
    "email": "jennifer.anderson@kmutt.ac.th",
    "role": "REQUESTER",
    "isActive": true,
    "createdAt": "2026-09-01T00:00:00.000Z"
  },
  {
    "id": 5,
    "displayName": "Somchai Jaidee",
    "email": "staff.somchai@kmutt.ac.th",
    "role": "IT_STAFF",
    "isActive": true,
    "createdAt": "2026-09-01T00:00:00.000Z"
  }
]
```

---

#### `POST /api/v1/admin/users`
* **Purpose**: Create a new user account with one permitted role and initial password.
* **Access**: `ADMINISTRATOR` only.
* **Request Body**:
```json
{
  "displayName": "Alex Thompson",
  "email": "alex.thompson@kmutt.ac.th",
  "role": "IT_STAFF",
  "isActive": true,
  "initialPassword": "InitialPassword123!"
}
```
* **Validation**:
  * `displayName`: non-empty trimmed string (min 2, max 100).
  * `email`: valid email string, case-insensitively unique in database.
  * `role`: strictly one of `REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`.
  * `isActive`: boolean.
  * `initialPassword`: string meeting password complexity policy.
* **Response `201 Created`**:
```json
{
  "id": 10,
  "displayName": "Alex Thompson",
  "email": "alex.thompson@kmutt.ac.th",
  "role": "IT_STAFF",
  "isActive": true,
  "mustChangePassword": true,
  "createdAt": "2026-09-15T15:30:00.000Z"
}
```
* **Errors**:
  * `409 Conflict`: Email address already registered.
  * `422 Unprocessable Entity`: Validation failure.

---

#### `PATCH /api/v1/admin/users/:id`
* **Purpose**: Update user display name, email, role, or active status.
* **Access**: `ADMINISTRATOR` only.
* **Request Body**:
```json
{
  "displayName": "Alex Thompson-Smith",
  "email": "alex.thompson@kmutt.ac.th",
  "role": "IT_STAFF",
  "isActive": false
}
```
* **Safety Invariants Enforced**:
  * Self-deactivation: If `userId === session.userId` and `isActive === false`, rejected with `422` (`SELF_DEACTIVATION_PROHIBITED`).
  * Last admin deactivation: If user is the only active Administrator, deactivation or role modification is rejected with `422` (`LAST_ADMIN_PROTECTION`).
* **Response `200 OK`**:
```json
{
  "id": 10,
  "displayName": "Alex Thompson-Smith",
  "email": "alex.thompson@kmutt.ac.th",
  "role": "IT_STAFF",
  "isActive": false,
  "updatedAt": "2026-09-15T15:35:00.000Z"
}
```

---

#### `POST /api/v1/admin/users/:id/reset-password`
* **Purpose**: Set a new initial password for a user.
* **Access**: `ADMINISTRATOR` only.
* **Request Body**:
```json
{
  "initialPassword": "NewInitialPass123!"
}
```
* **Response `200 OK`**:
```json
{
  "message": "Initial password successfully updated. User must change password at next login.",
  "userId": 10,
  "mustChangePassword": true
}
```

---

## 4. Role Authorization Matrix

| Endpoint | Requester | IT Staff | Administrator |
| :--- | :--- | :--- | :--- |
| `POST /api/v1/auth/login` | Allowed | Allowed | Allowed |
| `POST /api/v1/auth/logout` | Allowed | Allowed | Allowed |
| `GET /api/v1/auth/me` | Allowed | Allowed | Allowed |
| `POST /api/v1/auth/change-password` | Allowed | Allowed | Allowed |
| `GET /api/v1/tickets` (Queue) | **Denied (403)** | Allowed | Allowed |
| `GET /api/v1/tickets/:id` | Owned only | Allowed | Allowed |
| `PATCH /api/v1/tickets/:id` | **Denied (403)** | Allowed | Allowed |
| `POST /api/v1/tickets/:id/resolve-indication` | Owned only | **Denied (403)** | **Denied (403)** |
| `GET /api/v1/tickets/:id/comments` | Owned only | Allowed | Allowed |
| `POST /api/v1/tickets/:id/comments` | Owned only | Allowed | Allowed |
| `GET /api/v1/tickets/:id/notes` | **Denied (403)** | Allowed | Allowed |
| `POST /api/v1/tickets/:id/notes` | **Denied (403)** | Allowed | Allowed |
| `GET /api/v1/admin/*` | **Denied (403)** | **Denied (403)** | Allowed |
| `POST /api/v1/admin/*` | **Denied (403)** | **Denied (403)** | Allowed |
| `PATCH /api/v1/admin/*` | **Denied (403)** | **Denied (403)** | Allowed |
