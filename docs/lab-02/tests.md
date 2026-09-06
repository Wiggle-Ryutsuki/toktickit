# Lab 2 Test Plan and Results

**Document ID**: TEST-LAB-02  
**Version**: 1.0  
**Status**: Complete / All Automated Tests Passing  
**Handout Reference**: `Lab_02_labsheet.pdf` (Section 9 & Appendix B, pp. 14–15, 21)  

---

## 1. Test Strategy

TokTickIT employs a multi-tiered testing strategy ensuring that all functional requirements, business rules, and acceptance criteria are verified with automated tests before declaring features complete:

1. **Unit Tests (Vitest)**:
   * Test pure business logic, input validation helpers, Ticket Number sequence generation, file extension/size validation, and DTO mappers without network or database dependencies.
2. **API Integration Tests (Vitest + Supertest)**:
   * Test Express route handlers, Prisma queries, relational integrity, error envelopes, and cross-requester ownership enforcement against a local test PostgreSQL database.
3. **UI Component Tests (Vitest + React Testing Library + jsdom)**:
   * Test React components, form interactions, input validation messaging, busy/disabled button states, requester switching context, empty/no-results displays, and modal dialogs.
4. **End-to-End Tests (Playwright)**:
   * Test full user journeys across real browsers: selecting a Development Requester, creating a ticket with an attachment, viewing the ticket in My Tickets, filtering and searching, opening Ticket Detail, and performing soft-removal of an attachment.
5. **Responsive & Visual Checks**:
   * Verify layout integrity across Desktop (&ge;992px), Tablet (768–991px), and Mobile (<768px) viewports with automated screenshot captures.

---

## 2. Planned Tests

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **UT-01** | Unit | BR-01, FR-06 | Ticket Number formatting function | Generates format `TKT-YYYY-NNNNN` with 5-digit padding | `server/tests/lab-02/ticket-number.test.ts` | Pass |
| **UT-02** | Unit | BR-08, AC-06 | Attachment validator (file type & size) | Accepts JPG/PNG/WEBP/PDF &le; 5MB; rejects invalid types & >5MB | `server/tests/lab-02/attachment-validator.test.ts` | Pass |
| **UT-03** | Unit | BR-05, BR-06 | Ticket form input validation schemas | Rejects summary <5 or >120 chars, description <10 or >2000 chars | `server/tests/lab-02/validation.test.ts` | Pass |
| **API-01** | API | FR-01, BR-03 | `GET /api/requesters` | Returns HTTP 200 with list of active requesters only; inactive excluded | `server/tests/lab-02/requesters.api.test.ts` | Pass |
| **API-02** | API | FR-03, BR-11 | `GET /api/categories` and `GET /api/related-systems` | Returns HTTP 200 with 4 categories and 6+ related systems | `server/tests/lab-02/reference-data.api.test.ts` | Pass |
| **API-03** | API | FR-06, BR-01, BR-02, AC-01 | `POST /api/tickets` (Valid submission) | Returns HTTP 201 with saved ticket, status `NEW`, and generated ticket number | `server/tests/lab-02/create-ticket.api.test.ts` | Pass |
| **API-04** | API | FR-05, AC-05 | `POST /api/tickets` (Validation failure) | Returns HTTP 422 with field-level validation errors when summary/desc empty | `server/tests/lab-02/create-ticket.api.test.ts` | Pass |
| **API-05** | API | FR-08, BR-04, AC-03 | `GET /api/tickets?requesterId=:id` | Returns HTTP 200 with only tickets belonging to requested user | `server/tests/lab-02/my-tickets.api.test.ts` | Pass |
| **API-06** | API | FR-09, FR-10, AC-09 | `GET /api/tickets` with search, filter, sort, page | Returns HTTP 200 with filtered results and pagination metadata | `server/tests/lab-02/my-tickets.api.test.ts` | Pass |
| **API-07** | API | FR-12, FR-13, AC-04 | `GET /api/tickets/:id` (Ownership validation) | Returns HTTP 200 for owner; HTTP 403 / 404 if accessed by different requester | `server/tests/lab-02/ticket-detail.api.test.ts` | Pass |
| **API-08** | API | FR-14, BR-08, AC-07 | `POST /api/tickets/:id/attachments` (Max limit) | Returns HTTP 422 / 400 when attempting to add a 6th active attachment | `server/tests/lab-02/attachments.api.test.ts` | Pass |
| **API-09** | API | FR-15, BR-09, BR-10, AC-08 | `DELETE /api/tickets/:id/attachments/:attachmentId` | Soft-deletes attachment, sets `deletedAt` and reason, returns HTTP 200 | `server/tests/lab-02/attachments.api.test.ts` | Pass |
| **API-10** | API | FR-16, BR-09, AC-08 | `GET /api/tickets/:id/attachments/:attachmentId` | Returns file stream for active attachment; HTTP 410 / 404 for soft-deleted file | `server/tests/lab-02/attachments.api.test.ts` | Pass |
| **UI-01** | UI | FR-01, FR-02, AC-02 | Development Requester Selector Component | Renders active requester list, handles selection change and localStorage update | `client/tests/lab-02/RequesterSelector.test.tsx` | Pass |
| **UI-02** | UI | FR-03, FR-04, FR-05 | Create Ticket Form Rendering & Pre-population | Displays read-only requester name, loads categories/systems, displays asterisks | `client/tests/lab-02/CreateTicket.test.tsx` | Pass |
| **UI-03** | UI | FR-05, AC-05 | Create Ticket Client Validation | Submitting empty form displays field-level errors and prevents API call | `client/tests/lab-02/CreateTicket.test.tsx` | Pass |
| **UI-04** | UI | FR-06, FR-07, AC-01 | Create Ticket Submission & Success State | Shows busy state during submit, renders success banner with ticket number | `client/tests/lab-02/CreateTicket.test.tsx` | Pass |
| **UI-05** | UI | FR-08, FR-11, AC-03 | My Tickets List & Empty State | Displays ticket table/cards; renders empty state when user has 0 tickets | `client/tests/lab-02/MyTickets.test.tsx` | Pass |
| **UI-06** | UI | FR-09, FR-11, AC-10 | My Tickets Search, Filter & No-Results State | Filters tickets by search/category; displays "No matching tickets found" banner | `client/tests/lab-02/MyTickets.test.tsx` | Pass |
| **UI-07** | UI | FR-12, FR-13 | Ticket Detail Read-Only View | Displays all ticket fields in read-only mode with status & priority badges | `client/tests/lab-02/RequesterTicketDetail.test.tsx` | Pass |
| **UI-08** | UI | FR-15, BR-09, AC-08 | Attachment Section & Soft-Removal Modal | Prompts for confirmation and reason; updates attachment display to tombstone | `client/tests/lab-02/AttachmentSection.test.tsx` | Pass |
| **UI-09** | UI | BR-12 | Error Resilience and Form Recovery | Simulates backend 500 failure; ensures form inputs and entered data are retained | `client/tests/lab-02/CreateTicket.test.tsx` | Pass |
| **E2E-01** | E2E | AC-01, AC-02, AC-03 | Complete Requester Ticketing Flow | Select requester &rarr; create ticket &rarr; view in My Tickets &rarr; switch requester (verify isolation) | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pass |
| **E2E-02** | E2E | AC-08, FR-14, FR-15 | Attachment Lifecycle Flow | Upload attachment on creation &rarr; view on detail &rarr; download &rarr; soft-remove with reason | `e2e/lab-02/attachment-lifecycle.spec.ts` | Pass |

---

## 3. Acceptance-Criterion Traceability Matrix

| Acceptance Criterion | Description | Covering Tests (Unit / API / UI / E2E) |
| :--- | :--- | :--- |
| **AC-01** | Ticket Creation Happy Path & Ticket Number Generation | `UT-01`, `API-03`, `UI-04`, `E2E-01` |
| **AC-02** | Requester Selection Gate & Switching Context | `API-01`, `UI-01`, `E2E-01` |
| **AC-03** | Cross-Requester Ticket List Isolation | `API-05`, `UI-05`, `E2E-01` |
| **AC-04** | Cross-Requester Detail Access Forbidden | `API-07`, `UI-07` |
| **AC-05** | Create Ticket Validation Failure & Field Error Placement | `UT-03`, `API-04`, `UI-03` |
| **AC-06** | Attachment File Size & Type Validation | `UT-02`, `API-08`, `UI-08` |
| **AC-07** | Attachment Max Limit Enforcement (5 active files) | `API-08`, `UI-08` |
| **AC-08** | Attachment Soft-Removal with Reason & Download Blocking | `API-09`, `API-10`, `UI-08`, `E2E-02` |
| **AC-09** | Search and Filtering in My Tickets | `API-06`, `UI-06`, `E2E-01` |
| **AC-10** | No-Results vs Empty List State | `UI-05`, `UI-06` |

---

## 4. Responsive and Visual Checklist

* **Desktop Viewport (&ge; 992px)**:
  * [ x ] Multi-column layout for Create Ticket (system/metadata on right, inputs on left)
  * [ x ] Full data table with all columns for My Tickets
  * [ x ] Centered content container with max-width (~1140px)
  * [ x ] Clear button visual hierarchy (Primary Green `#006B3C`, Secondary Green `#0B7A46`)
* **Tablet Viewport (768px – 991px)**:
  * [ x ] Two-column or compact grid layout; Summary and Description receive sufficient width
  * [ x ] Horizontal filter controls wrap cleanly without overlapping
  * [ x ] Table remains readable or provides smooth horizontal scroll
* **Mobile Viewport (< 768px)**:
  * [ x ] Form fields and controls stack vertically in a single column
  * [ x ] Touch-friendly button sizes (&ge;44px touch targets)
  * [ x ] Zero horizontal page overflow or clipping
  * [ x ] My Tickets renders responsive cards or optimized mobile table
* **Visual & Accessibility (All Viewports)**:
  * [ x ] Required fields show red asterisk (`*`) with associated field-level error messages
  * [ x ] Read-only fields rendered with distinct soft gray-green background
  * [ x ] Visible keyboard focus rings on all interactive inputs and buttons
  * [ x ] Badges for Status and Priority include visible text (no color-only reliance)
  * [ x ] Soft-removed attachments clearly identified as deleted tombstones

---

## 5. Test Commands

* **Run Backend Unit & API Tests**:
  ```bash
  cd server
  npm run test
  ```
* **Run Frontend Unit & Component Tests**:
  ```bash
  cd client
  npm run test
  ```
* **Run End-to-End Browser Tests** (from project root `toktickit`):
  ```bash
  # From project root:
  npx playwright test
  # Or:
  npm run test:e2e
  ```

---

## 6. Final Results Summary

| Test Suite | Total Tests | Passed | Failed | Skipped | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Server Unit Tests | 13 | 13 | 0 | 0 | Pass |
| Server API Integration Tests | 45 | 45 | 0 | 0 | Pass |
| Client UI Component Tests | 29 | 29 | 0 | 0 | Pass |
| Playwright E2E Tests | 2 | 2 | 0 | 0 | Pass |

---

## 7. Known Limitations or Deferred Tests

1. **Authentication Session & Token Tests**: Deferred to Lab 3 per explicit sprint scope boundaries.
2. **IT Staff Workflow & Reassignment Tests**: Deferred to Lab 3 / Lab 4.
3. **Public Comments & Actions Taken Tests**: Deferred to Lab 3 / Lab 4.
