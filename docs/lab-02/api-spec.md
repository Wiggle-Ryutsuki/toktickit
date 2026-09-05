# TokTickIT REST API Specification (Lab 2)

**Document ID**: API-SPEC-LAB-02  
**Version**: 1.0  
**Status**: Approved API Contract Baseline  
**Handout Reference**: `Lab_02_labsheet.pdf` (Section 6, pp. 7–8)  
**Parent Specification**: `TokTickIT-System-Level-SDS-v1.0.pdf` (Section *API Design Standards*, p. 12)  

---

## 1. Global API Conventions

* **Base URL**: `/api` (also aliased under `/api/v1` for system SDS compatibility).
* **Protocol & Data Format**: All endpoints communicate via HTTP over JSON, except for multipart file upload and file binary download endpoints.
* **Naming Convention**: JSON property names use `camelCase`.
* **Date & Time Representation**: All timestamps are formatted as ISO 8601 UTC strings (e.g., `2026-09-03T10:00:00.000Z`).
* **Client Identification**: In Lab 2, since real session authentication is excluded, client requests supply the current simulated requester identity via `X-Requester-Id` header (or `requesterId` query/body parameter).
* **DTO Isolation**: Database Prisma entities are never serialized directly; response payloads strictly map to defined DTO schemas.

---

## 2. Standard Error Envelope & Status Codes

### Standard Error Response Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request payload failed validation.",
    "fieldErrors": [
      {
        "field": "summary",
        "message": "Summary is required and must be between 5 and 120 characters."
      }
    ],
    "correlationId": "req-9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
  }
}
```

### HTTP Status Code Usage:
* `200 OK`: Successful resource retrieval or mutation.
* `201 Created`: Successful resource creation.
* `400 Bad Request`: Malformed JSON or invalid query parameter types.
* `403 Forbidden`: Access denied (e.g. attempting to view or modify another requester's ticket or attachment).
* `404 Not Found`: Target resource does not exist.
* `410 Gone`: Resource is permanently removed / inaccessible (e.g. download attempt on a soft-removed attachment).
* `422 Unprocessable Entity`: Business rule or validation constraint violation.
* `500 Internal Server Error`: Generic safe server error (no stack traces or database details exposed).

---

## 3. Endpoints

### 3.1. Reference Data & Development Requesters

#### `GET /api/requesters`
* **Purpose**: Retrieve the list of active Development Requesters for the selection dropdown.
* **Headers**: None.
* **Query Parameters**: None.
* **Response `200 OK`**:
```json
[
  {
    "id": 1,
    "email": "jennifer.anderson@kmutt.ac.th",
    "displayName": "Jennifer Anderson",
    "role": "REQUESTER",
    "isActive": true
  },
  {
    "id": 2,
    "email": "sarah.johnson@kmutt.ac.th",
    "displayName": "Sarah Johnson",
    "role": "REQUESTER",
    "isActive": true
  }
]
```

#### `GET /api/categories`
* **Purpose**: Retrieve active IT support categories.
* **Response `200 OK`**:
```json
[
  { "id": 1, "name": "Account and Access", "code": "ACC" },
  { "id": 2, "name": "Hardware", "code": "HW" },
  { "id": 3, "name": "Software", "code": "SW" },
  { "id": 4, "name": "Network", "code": "NET" }
]
```

#### `GET /api/related-systems`
* **Purpose**: Retrieve active related systems.
* **Response `200 OK`**:
```json
[
  { "id": 1, "name": "Campus Wi-Fi" },
  { "id": 2, "name": "Corporate Laptop" },
  { "id": 3, "name": "Email" },
  { "id": 4, "name": "Grade Submission App" },
  { "id": 5, "name": "LEB2 App" },
  { "id": 6, "name": "Printer" },
  { "id": 7, "name": "VPN" }
]
```

---

### 3.2. Ticket Creation (Feature-6)

#### `POST /api/tickets`
* **Purpose**: Create a new IT support ticket for the active requester.
* **Headers**:
  * `Content-Type: application/json` (or `multipart/form-data` if attaching initial files)
  * `X-Requester-Id: <number>` (Optional if supplied in body)
* **Request Body (JSON)**:
```json
{
  "requesterId": 1,
  "categoryId": 2,
  "relatedSystemId": 2,
  "requestedPriority": "MEDIUM",
  "summary": "Laptop battery drains quickly after Windows update",
  "description": "My laptop battery is draining much faster than usual even when the system is idle. This started happening after last week's Windows update."
}
```
* **Validation Rules**:
  * `requesterId`: required integer, must correspond to an active user.
  * `categoryId`: required integer, must correspond to an active category.
  * `relatedSystemId`: required integer, must correspond to an active related system.
  * `requestedPriority`: required enum: `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
  * `summary`: required string, length 5–120 characters after trimming.
  * `description`: required string, length 10–2000 characters after trimming.
* **Response `201 Created`**:
```json
{
  "id": 101,
  "ticketNo": "TKT-2026-00001",
  "summary": "Laptop battery drains quickly after Windows update",
  "description": "My laptop battery is draining much faster than usual even when the system is idle. This started happening after last week's Windows update.",
  "status": "NEW",
  "requestedPriority": "MEDIUM",
  "itPriority": "MEDIUM",
  "requester": {
    "id": 1,
    "displayName": "Jennifer Anderson",
    "email": "jennifer.anderson@kmutt.ac.th"
  },
  "category": {
    "id": 2,
    "name": "Hardware"
  },
  "relatedSystem": {
    "id": 2,
    "name": "Corporate Laptop"
  },
  "attachments": [],
  "createdAt": "2026-09-03T10:15:30.000Z",
  "updatedAt": "2026-09-03T10:15:30.000Z"
}
```
* **Error Responses**:
  * `422 Unprocessable Entity`: Validation failure on missing/invalid fields.

---

### 3.3. Ticket Listing & Search (Feature-7)

#### `GET /api/tickets`
* **Purpose**: Retrieve a paginated and filtered list of tickets owned by the requesting user.
* **Query Parameters**:
  * `requesterId` (required integer): The ID of the currently selected requester.
  * `search` (optional string): Case-insensitive substring match against `ticketNo` or `summary`.
  * `categoryId` (optional integer): Filter by Category ID.
  * `priority` (optional string): Filter by `requestedPriority` (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).
  * `status` (optional string): Filter by Ticket Status (`NEW`, `ASSIGNED`, `IN_PROGRESS`, etc.).
  * `sortBy` (optional string): Sort field (`createdAt`, `ticketNo`, `updatedAt`; default `createdAt`).
  * `sortOrder` (optional string): `asc` or `desc` (default `desc`).
  * `page` (optional integer): Page number (1-indexed; default `1`).
  * `limit` (optional integer): Items per page (default `10`, max `50`).
* **Response `200 OK`**:
```json
{
  "data": [
    {
      "id": 101,
      "ticketNo": "TKT-2026-00001",
      "summary": "Laptop battery drains quickly after Windows update",
      "status": "NEW",
      "requestedPriority": "MEDIUM",
      "itPriority": "MEDIUM",
      "categoryName": "Hardware",
      "relatedSystemName": "Corporate Laptop",
      "createdAt": "2026-09-03T10:15:30.000Z",
      "updatedAt": "2026-09-03T10:15:30.000Z"
    }
  ],
  "pagination": {
    "totalItems": 1,
    "totalPages": 1,
    "currentPage": 1,
    "limit": 10
  }
}
```

---

### 3.4. Ticket Detail & Attachments (Feature-8)

#### `GET /api/tickets/:id`
* **Purpose**: Retrieve full details of a specific ticket, including active and soft-removed attachments.
* **Headers**: `X-Requester-Id: <number>` (or query `requesterId=<number>`).
* **Response `200 OK`**:
```json
{
  "id": 101,
  "ticketNo": "TKT-2026-00001",
  "summary": "Laptop battery drains quickly after Windows update",
  "description": "My laptop battery is draining much faster than usual even when the system is idle. This started happening after last week's Windows update.",
  "status": "NEW",
  "requestedPriority": "MEDIUM",
  "itPriority": "MEDIUM",
  "requester": {
    "id": 1,
    "displayName": "Jennifer Anderson",
    "email": "jennifer.anderson@kmutt.ac.th"
  },
  "category": {
    "id": 2,
    "name": "Hardware"
  },
  "relatedSystem": {
    "id": 2,
    "name": "Corporate Laptop"
  },
  "attachments": [
    {
      "id": 1,
      "originalFilename": "battery_report.pdf",
      "mimeType": "application/pdf",
      "sizeBytes": 204800,
      "uploadedById": 1,
      "uploadedByName": "Jennifer Anderson",
      "createdAt": "2026-09-03T10:15:30.000Z",
      "isDeleted": false
    },
    {
      "id": 2,
      "originalFilename": "screenshot.png",
      "mimeType": "image/png",
      "sizeBytes": 512000,
      "uploadedById": 1,
      "uploadedByName": "Jennifer Anderson",
      "createdAt": "2026-09-03T10:16:00.000Z",
      "isDeleted": true,
      "deletedAt": "2026-09-03T10:20:00.000Z",
      "removalReason": "Uploaded duplicate file"
    }
  ],
  "createdAt": "2026-09-03T10:15:30.000Z",
  "updatedAt": "2026-09-03T10:20:00.000Z"
}
```
* **Error Responses**:
  * `403 Forbidden`: Ticket belongs to a different requester.
  * `404 Not Found`: Ticket does not exist.

#### `POST /api/tickets/:id/attachments`
* **Purpose**: Upload and link an attachment to an existing owned ticket.
* **Headers**: `Content-Type: multipart/form-data`, `X-Requester-Id: <number>`.
* **Form Payload**:
  * `file`: Binary file stream (max 5 MB; JPG, PNG, WEBP, PDF only).
  * `uploadedById`: Requester ID.
* **Response `201 Created`**:
```json
{
  "id": 3,
  "ticketId": 101,
  "originalFilename": "power_diagnostics.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 1048576,
  "createdAt": "2026-09-03T10:25:00.000Z",
  "isDeleted": false
}
```
* **Error Responses**:
  * `403 Forbidden`: Uploader does not own the ticket.
  * `422 Unprocessable Entity`: File size exceeds 5 MB, invalid file MIME type, or ticket already has 5 active attachments.

#### `GET /api/tickets/:id/attachments/:attachmentId`
* **Purpose**: Stream/download an active attachment file.
* **Headers**: `X-Requester-Id: <number>`.
* **Response `200 OK`**:
  * Binary stream with headers:
    * `Content-Type: <mimeType>`
    * `Content-Disposition: attachment; filename="<originalFilename>"`
    * `Content-Length: <sizeBytes>`
* **Error Responses**:
  * `403 Forbidden`: Requester does not own the ticket.
  * `410 Gone`: Attachment was soft-removed and can no longer be downloaded.
  * `404 Not Found`: Attachment record not found.

#### `DELETE /api/tickets/:id/attachments/:attachmentId`
* **Purpose**: Perform soft-removal of an owned attachment.
* **Headers**: `Content-Type: application/json`, `X-Requester-Id: <number>`.
* **Request Body**:
```json
{
  "removalReason": "Accidentally uploaded confidential document",
  "deletedById": 1
}
```
* **Validation Rules**:
  * `removalReason`: required non-empty string (min 3 characters).
* **Response `200 OK`**:
```json
{
  "id": 1,
  "ticketId": 101,
  "originalFilename": "battery_report.pdf",
  "isDeleted": true,
  "deletedAt": "2026-09-03T10:30:00.000Z",
  "removalReason": "Accidentally uploaded confidential document"
}
```
* **Error Responses**:
  * `400 / 422 Bad Request`: Missing removal reason.
  * `403 Forbidden`: User did not upload this attachment or ticket is closed.
  * `404 Not Found`: Attachment not found.
