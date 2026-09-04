# Feature-05 Engineering Contract: Development Requester Context & Reference Data

**Feature ID**: FEAT-05  
**Feature Name**: Development Requester Context & Reference Data  
**Branch**: `feature/5-dev-requester`  
**Target Branch**: `lab2-staging`  
**Status**: Specified / Ready for TDD Implementation  
**Method**: Spec-Driven Development (SDD) & Test-Driven Development (TDD)  
**Parent Specifications**:  
- `docs/lab-02/specification.md`  
- `docs/lab-02/api-spec.md`  
- `docs/lab-02/ui-spec.md`  
- `docs/lab-02/tests.md`  
- `TokTickIT-System-Level-SDS-v1.0.pdf` (SDS-SYS-001)  
- `Lab_02_labsheet.pdf` (Lab 2 Requester Ticketing MVP)  

---

## 1. Purpose, Scope, and Explicit Exclusions

### 1.1. Purpose
Feature-05 establishes the essential data and frontend context foundation for TokTickIT Lab 2 by:
1. Providing reference data (Categories and Related Systems) required for ticket classification.
2. Establishing a simulated Development Requester context allowing testers and evaluators to switch between seeded requester identities.
3. Enabling multi-user ownership and ticket isolation testing before full authentication is implemented in Lab 3.

### 1.2. Included Scope
* **Prisma Models & Schema Expansion**:
  * `User` (or `RequesterUser`) model with fields: `id`, `email`, `displayName`, `role`, `isActive`, `createdAt`, `updatedAt`.
  * `RelatedSystem` model with fields: `id`, `name`, `description`, `isActive`, `createdAt`.
  * Preservation of existing `Category` model from Lab 1 with optional enhancements (`code`, `description`, `isActive`).
* **Idempotent Seed Data Script (`server/prisma/seed.ts`)**:
  * Upsert 4 mandatory Ticket Categories: *Account and Access*, *Hardware*, *Software*, *Network*.
  * Upsert at least 6 realistic Related Systems: *Campus Wi-Fi*, *Corporate Laptop*, *Email*, *Grade Submission App*, *LEB2 App*, *Printer*, *VPN*.
  * Upsert at least 4 active Development Requesters.
  * Upsert at least 1 inactive Development Requester (`isActive: false`).
* **Backend REST Endpoints**:
  * `GET /api/requesters` — returns list of active requesters (`isActive: true`).
  * `GET /api/categories` — returns list of active categories.
  * `GET /api/related-systems` — returns list of active related systems.
* **Frontend Requester Context & UI Components**:
  * `RequesterContext` & Provider in React managing `selectedRequester` state with `localStorage` persistence.
  * `RequesterSelector` screen/modal with informative testing banner, active requester dropdown, and Continue/Switch actions.
  * Application Shell Header displaying the active requester name, "Requester" badge, and a "Change Requester" action button.
  * Graceful handling of loading, empty, and API-failure states.

### 1.3. Explicit Exclusions (Strict Sprint Boundaries)
* **No Real Authentication**: No login forms, logout endpoints, passwords, plaintext credential inputs, or password hashing (Argon2id/bcrypt).
* **No Session / Token Infrastructure**: No opaque PostgreSQL session tokens, JWTs, bearer tokens, or HttpOnly session cookies.
* **No Role Enforcement Engine**: No IT Staff or Administrator dashboards, role elevation, or permission checks beyond simulating the Requester role.
* **No Ticket CRUD Yet**: Ticket creation, ticket lists, ticket detail, and attachments belong to Features 6, 7, and 8.

---

## 2. Requirements & Traceability Matrix

| Requirement / Rule ID | Source Citation | Description & Specification |
| :--- | :--- | :--- |
| **FR-01** | `Lab_02_labsheet.pdf`, Section 5.3, 8.1; `specification.md` FR-01 | The system shall retrieve all active Development Requesters from the database and populate the selection dropdown. Inactive requesters must be excluded. |
| **FR-02** | `Lab_02_labsheet.pdf`, Section 8.1; `specification.md` FR-02 | The user interface shell shall expose the currently selected Requester's name and provide a "Change Requester" action in the header to switch context at any time, reloading data for the newly selected requester. |
| **BR-03** | `Lab_02_labsheet.pdf`, Section 4.3, 5.3; `specification.md` BR-03 | Lab 2 uses a Development Requester selector instead of login. The selected identity is for testing only and is not secure authentication. Inactive requesters (`isActive: false`) must never appear in the selector dropdown. |
| **BR-04** | `Lab_02_labsheet.pdf`, Section 3, 6.3; `specification.md` BR-04 | Requester Data Isolation: Establish the requester context foundation ensuring requesters only access tickets belonging to their own `requesterId`. |
| **BR-11** | `TokTickIT-System-Level-SDS-v1.0.pdf`, p. 7; `Lab_02_labsheet.pdf`, Section 5.3; `specification.md` BR-11 | Reference Data Invariants: Provide active Categories and active Related Systems (`isActive: true`) so subsequent ticket creation only selects active reference items. |
| **AC-02** | `Lab_02_labsheet.pdf`, Section 8.11; `specification.md` AC-02 | Requester Selection Gate: *Given* no Development Requester is selected in local state, *When* the user accesses the application, *Then* the Development Requester Selection screen is displayed and ticket actions remain gated until a selection is confirmed. |

---

## 3. Data Design & Seed Requirements

### 3.1. Prisma Schema Additions (`server/prisma/schema.prisma`)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  REQUESTER
  IT_STAFF
  ADMINISTRATOR
}

model User {
  id          Int      @id @default(autoincrement())
  email       String   @unique
  displayName String
  role        Role     @default(REQUESTER)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("users")
}

model Category {
  id          Int      @id @default(autoincrement())
  name        String   @unique
  code        String?  @unique
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())

  @@map("categories")
}

model RelatedSystem {
  id          Int      @id @default(autoincrement())
  name        String   @unique
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())

  @@map("related_systems")
}
```

### 3.2. Seed Dataset (`server/prisma/seed.ts`)
The seed script must be strictly idempotent using `prisma.model.upsert({ where: { ... }, update: { ... }, create: { ... } })`:

1. **Categories (4 required)**:
   - `Account and Access` (code: `ACC`)
   - `Hardware` (code: `HW`)
   - `Software` (code: `SW`)
   - `Network` (code: `NET`)
2. **Related Systems (7 defined, &ge;6 required)**:
   - `Campus Wi-Fi`
   - `Corporate Laptop`
   - `Email`
   - `Grade Submission App`
   - `LEB2 App`
   - `Printer`
   - `VPN`
3. **Active Development Requesters (&ge;4 required)**:
   - `Jennifer Anderson` (`jennifer.anderson@kmutt.ac.th`, role: `REQUESTER`, `isActive: true`)
   - `Sarah Johnson` (`sarah.johnson@kmutt.ac.th`, role: `REQUESTER`, `isActive: true`)
   - `David Lee` (`david.lee@kmutt.ac.th`, role: `REQUESTER`, `isActive: true`)
   - `Michael Brown` (`michael.brown@kmutt.ac.th`, role: `REQUESTER`, `isActive: true`)
4. **Inactive Development Requester (&ge;1 required)**:
   - `Alex Taylor` (`alex.taylor.inactive@kmutt.ac.th`, role: `REQUESTER`, `isActive: false`)

---

## 4. REST API Contract

### 4.1. `GET /api/requesters`
* **Description**: Fetch all active Development Requesters for the selector dropdown.
* **HTTP Method**: `GET`
* **Path**: `/api/requesters`
* **Query Parameters**: None
* **Success Response (`200 OK`)**:
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
  },
  {
    "id": 3,
    "email": "david.lee@kmutt.ac.th",
    "displayName": "David Lee",
    "role": "REQUESTER",
    "isActive": true
  },
  {
    "id": 4,
    "email": "michael.brown@kmutt.ac.th",
    "displayName": "Michael Brown",
    "role": "REQUESTER",
    "isActive": true
  }
]
```
* **Failure Response (`500 Internal Server Error`)**:
```json
{
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "Failed to retrieve development requesters.",
    "fieldErrors": [],
    "correlationId": "req-9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
  }
}
```

### 4.2. `GET /api/categories`
* **Description**: Retrieve active IT support categories.
* **HTTP Method**: `GET`
* **Path**: `/api/categories`
* **Success Response (`200 OK`)**:
```json
[
  { "id": 1, "name": "Account and Access", "code": "ACC" },
  { "id": 2, "name": "Hardware", "code": "HW" },
  { "id": 3, "name": "Software", "code": "SW" },
  { "id": 4, "name": "Network", "code": "NET" }
]
```

### 4.3. `GET /api/related-systems`
* **Description**: Retrieve active related systems.
* **HTTP Method**: `GET`
* **Path**: `/api/related-systems`
* **Success Response (`200 OK`)**:
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

## 5. UI Specification & Visual States (Zen Green Theme)

### 5.1. Color Tokens Applied
* Header Background: `#006B3C` (Primary Green)
* Text: `#1A2E24` (Primary Charcoal-Green)
* Muted Text: `#526058` (Secondary Gray-Green)
* Informational Banner Background: `#EAF6EF` (Pale Green) with border `#0B7A46`
* Primary Continue Button: Solid `#006B3C` with hover `#0B7A46` and white text

### 5.2. Component: `RequesterSelector` Screen / Modal
* **Card Container**: Centered modal or dedicated card layout (`maxWidth: 540px`).
* **Header**: "Select Development Requester" with user icon.
* **Test Mode Banner**:
  > **Authentication coming in Lab 3**  
  > Choose a development requester to simulate the current requester context for Lab 2. This is for testing only and is not a login screen.
* **Dropdown Control**: `<select>` control with `<label htmlFor="requester-select">Development Requester <span className="text-danger">*</span></label>`.
* **Helper Text**: *"Only active development requesters are shown."*
* **Action Buttons**:
  * "Continue" primary button (enabled only when a valid requester is selected).
  * "Cancel" button (available if a requester was previously selected and user cancels switching).

### 5.3. Component: Application Shell Header (`Navbar`)
* **Brand**: TokTickIT logo + title.
* **Navigation Links**: *My Tickets*, *Create Ticket*.
* **Active User Badge**:
  * Displays: `[User Icon] Jennifer Anderson (Requester)`
  * Button: `Change Requester` (outline secondary style, opens selector).

### 5.4. Screen States
1. **Initial / Unselected State**: Displays selector card; navigation is disabled until selection.
2. **Loading State**: Displays clean spinner and text *"Loading development requesters..."*.
3. **Empty State**: If 0 active requesters exist, displays warning callout *"No active development requesters found in database. Please run database seed."*.
4. **API Failure State**: If `GET /api/requesters` fails (e.g. backend offline), renders danger alert *"Unable to load requesters from server. Please verify backend service."* with a "Retry" button.

---

## 6. Software Test Specification (Test DD & TDD)

### 6.1. Planned Tests for Feature-05

| Test ID | Level | Test File Path | What It Tests | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **API-01** | API Integration | `server/tests/lab-02/requesters.api.test.ts` | `GET /api/requesters` | HTTP 200; returns array containing 4 active requesters; Alex Taylor (inactive) is NOT returned. |
| **API-02** | API Integration | `server/tests/lab-02/reference-data.api.test.ts` | `GET /api/categories` & `GET /api/related-systems` | HTTP 200; returns 4 categories and 7 related systems. |
| **UI-01** | UI Component | `client/tests/lab-02/RequesterSelector.test.tsx` | Selector rendering & context switching | Fetches requesters; renders options; selecting user and clicking Continue stores selection in localStorage and updates shell header. |
| **UI-01b** | UI Component | `client/tests/lab-02/RequesterSelector.test.tsx` | Inactive filtering in UI | Ensures inactive users do not appear in options. |
| **UI-01c** | UI Component | `client/tests/lab-02/RequesterSelector.test.tsx` | Error & Loading states | Displays loading spinner while fetching, and error alert with Retry on 500 failure. |

### 6.2. Responsive Viewport Verifications
* **Desktop (&ge; 992px)**: Centered 540px card with clear button alignment.
* **Tablet (768px – 991px)**: Responsive width adapting to container.
* **Mobile (< 768px)**: Stacked full-width controls with &ge;44px touch targets.

---

## 7. Open Questions and Clarifications

1. **None identified**: Scope, data models, endpoints, and UI states strictly match the approved requirements in `docs/lab-02/specification.md` and `Lab_02_labsheet.pdf`.
