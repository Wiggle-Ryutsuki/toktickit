# TokTickIT Zen Green Theme UI Specification (Lab 4)

**Document ID**: UI-SPEC-LAB-04  
**Version**: 1.0  
**Status**: Approved Design Baseline  
**Handout Reference**: `docs/lab-04/Labsheet_4.pdf` (Sections 3, 7, 8, & Section 14 Part 9, pp. 1–2, 4–7, 10–11)  
**Parent Specification**: `docs/TokTickIT-System-Level-SDS-v1.0.pdf` (Section *Frontend and UI Design System*, pp. 13–14)  
**Target Branch**: `lab4-staging`  

---

## 1. Visual Design Tokens (Zen Green Theme)

TokTickIT preserves and extends the **Zen Green Design System** established in Lab 2 and Lab 3. In accordance with `Labsheet_4.pdf` Section 3 (p. 2) and Section 7 (p. 4), all newly delivered dashboards, Actions Taken views, cards, and modal dialogs must strictly adhere to the Zen Green color tokens and styling conventions defined in `client/src/theme.css`:

| Design Token | Hex Code / Value | Usage & Application |
| :--- | :--- | :--- |
| `--color-primary-green` | `#006B3C` | Application header, primary action buttons, active tab borders |
| `--color-forest-green` | `#0F5132` | Dark header background, strong brand typography, metric card icons |
| `--color-secondary-green` | `#0B7A46` | Active navigation links, interactive buttons, hover accents |
| `--color-pale-green` | `#EAF6EF` | Metric card highlights, light success surfaces, badge fills |
| `--color-page-bg` | `#F5F7F6` | Main application background (soft, neutral green-tinted canvas) |
| `--color-surface` | `#FFFFFF` | Dashboard metric cards, table cards, modal surfaces |
| `--color-text-primary` | `#1A2E24` | Primary high-contrast headings, card numbers, table values |
| `--color-text-muted` | `#526058` | Metric card subtitles, table column headers, helper notes |
| `--color-border-subtle` | `#DDE5E1` | Card outlines, table borders, form input boundaries |
| `--color-input-bg` | `#FFFFFF` | Editable form inputs |
| `--color-input-readonly` | `#EEF3F0` | Auto-populated read-only fields (`Performed By`) |
| `--color-focus-ring` | `rgba(11, 122, 70, 0.25)` | 3px visible keyboard focus indicator ring |
| `--color-error` | `#B3261E` | Resolution-blocked warning banner, validation errors, danger badges |
| `--color-error-bg` | `#FDF2F2` | Conflict/resolution gate callout background |
| `--color-warning` | `#B45309` | Follow-up required badges, pending actions status, amber callouts |
| `--color-warning-bg` | `#FEF3C7` | Pending action warning cards |
| `--color-success` | `#15803D` | Completed actions badge, resolved status indicators |
| `--color-success-bg` | `#DCFCE7` | Success confirmation banner background |

> **Theme Continuity Note**: While `SDS-SYS-001` Decision `D-09` originally suggested the KMUTT corporate palette (`#FA4616`), `Labsheet_4.pdf` Section 3, Section 7, and Section 14 (Part 9) explicitly mandate preserving the **Zen Green design language**. Zen Green is the binding sprint theme.

---

## 2. Application Shell & Global Navigation

### 2.1. Header Bar (`Navbar.tsx`)
- **Brand Element**: "TokTickIT" text logo linking to the role-appropriate landing screen (`/dashboard`).
- **Dashboard Navigation Item**: A new top-level **Dashboard** navigation link is added to the navigation bar for all authenticated users:
  - When authenticated as `REQUESTER`, routes to `/dashboard` (rendering `RequesterDashboard`).
  - When authenticated as `IT_STAFF` or `ADMINISTRATOR`, routes to `/dashboard` (rendering `StaffDashboard`).
  - The navigation item displays an active indicator (underline/highlight) when the user is on the dashboard route (`Labsheet_4.pdf`, Section 7, p. 5).
- **Secondary Role Navigation**:
  - `REQUESTER`: `Dashboard`, `My Tickets`, `+ Create Ticket`.
  - `IT_STAFF`: `Dashboard`, `Ticket Queue`, `+ Create Ticket`.
  - `ADMINISTRATOR`: `Dashboard`, `Ticket Queue`, `+ Create Ticket`, `User Management`.
- **User Profile & Session Controls**:
  - Displays user's full display name (e.g., "Michael Brown", "Jennifer Anderson").
  - Role pill badge: `Requester` (neutral/green), `IT Staff` (teal/green), `Administrator` (forest/dark).
  - Explicit "Logout" action in the header that terminates the server session and redirects to `/login`.

---

## 3. Screen 1: IT Staff Dashboard UI

*(Source: `Labsheet_4.pdf`, Section 8.1, p. 5)*

```
+---------------------------------------------------------------------------------------------------+
|  TokTickIT          Dashboard      Queue      Create Ticket                       Michael (IT Staff)|
+---------------------------------------------------------------------------------------------------+
|  Welcome back, Michael!                                                              [ ⟳ Refresh ] |
|  Here's what's happening with your queue today.                                                   |
|                                                                                                   |
|  +-----------------+  +-----------------+  +-----------------+  +-----------------+  +----------+ |
|  | New             |  | Open            |  | In Progress     |  | Waiting for Req |  | My Assign| |
|  |   14            |  |   23            |  |   18            |  |    7            |  |   16     | |
|  | +3 from yest.   |  | -1 from yest.   |  | -1 from yest.   |  | +2 from yest.   |  | +1 yest. | |
|  +-----------------+  +-----------------+  +-----------------+  +-----------------+  +----------+ |
|                                                                                                   |
|  +--------------------------------------------------------+  +-----------------------------------+ |
|  | My Recent Tickets                            [View all]|  | Quick Actions                     | |
|  | ------------------------------------------------------ |  | --------------------------------- | |
|  | TKT-2026-00034  Laptop battery drains quickly  [Prog]  |  |  + Create Ticket                  | |
|  | TKT-2026-00030  Printer keep showing offline    [Open] |  |  🔍 Search Tickets                | |
|  | TKT-2026-00028  Outlook freezing intermittently [Prog] |  |  📋 My Queue                      | |
|  | TKT-2026-00023  Phone not receiving calls       [Open] |  |                                   | |
|  | TKT-2026-00019  VPN disconnects randomly        [Res]  |  |                                   | |
|  +--------------------------------------------------------+  +-----------------------------------+ |
+---------------------------------------------------------------------------------------------------+
```

### 3.1. Structure & Layout
1. **Welcome Banner**:
   - Heading: `Welcome back, {user.displayName}!`
   - Subtitle: `Here's what's happening with your queue today.`
   - Action: `Refresh` button with sync icon (`⟳ Refresh`), triggering a re-fetch of authoritative dashboard metrics.
2. **Metric Cards Grid (5 Cards)**:
   - Card 1: `New` — Count of unassigned tickets in `NEW` status; subtitle delta indicator.
   - Card 2: `Open` — Count of assigned/open tickets; subtitle delta indicator.
   - Card 3: `In Progress` — Count of tickets actively being worked on; subtitle delta indicator.
   - Card 4: `Waiting for Requester` — Count of tickets pending requester feedback; subtitle delta indicator.
   - Card 5: `My Assigned` — Count of all non-closed tickets where `ownerId == currentUserId`.
   - **Interactive Drill-Down**: Every metric card is a clickable surface (with `:focus-visible` outline) that navigates to `/queue` with pre-filtered query parameters:
     - `New` &rarr; `/queue?status=NEW`
     - `Open` &rarr; `/queue?status=ASSIGNED`
     - `In Progress` &rarr; `/queue?status=IN_PROGRESS`
     - `Waiting for Requester` &rarr; `/queue?status=PENDING_REQUESTER`
     - `My Assigned` &rarr; `/queue?assignment=MINE`
3. **Operational Layout (Two Columns on Desktop)**:
   - **Left Column (8/12 cols)**: "My Recent Tickets" card:
     - Header with title and accessible "View all" link to `/queue`.
     - Data table displaying the 5 most recent triage tickets: Ticket Number, Title/Summary, Status badge, Timestamp.
     - Clicking any row navigates directly to `/tickets/:id` (Staff Ticket Detail).
     - Empty state: *"No recent tickets found in queue."*
   - **Right Column (4/12 cols)**: "Quick Actions" card:
     - `+ Create Ticket`: Navigates to `/tickets/new`.
     - `🔍 Search Tickets`: Focuses global queue search or navigates to `/queue`.
     - `📋 My Queue`: Navigates to `/queue?assignment=MINE`.
4. **States**:
   - Loading: Pulsing skeleton cards for metric values and ticket list rows.
   - Error: Alert banner with retry button on network failure.
   - Forbidden: Requesters attempting to view the Staff Dashboard are redirected to `/dashboard` (Requester view) with HTTP 403 logged.

---

## 4. Screen 2: Requester Dashboard UI

*(Source: `Labsheet_4.pdf`, Section 8.2, p. 6)*

```
+---------------------------------------------------------------------------------------------------+
|  TokTickIT          Dashboard      My Tickets      Create Ticket             Jennifer (Requester) |
+---------------------------------------------------------------------------------------------------+
|  Welcome, Jennifer!                                                                               |
|  Here's the latest on your requests.                                                              |
|                                                                                                   |
|  +--------------------+  +--------------------+  +--------------------+  +--------------------+   |
|  | My Open Tickets    |  | In Progress        |  | Resolved           |  | Closed             |   |
|  |   3                |  |   2                |  |   5                |  |   12               |   |
|  | [View all]         |  | [View all]         |  | [View all]         |  | [View all]         |   |
|  +--------------------+  +--------------------+  +--------------------+  +--------------------+   |
|                                                                                                   |
|  +-------------------------------------------------------+  +-----------------------------------+ |
|  | My Recent Tickets                           [View all]|  | Quick Actions                     | |
|  | ----------------------------------------------------- |  | --------------------------------- | |
|  | TKT-2026-00034  Laptop battery drains quickly  [Prog] |  |  + Create Ticket                  | |
|  | TKT-2026-00022  Request software access        [Res]  |  |    Submit a new request           | |
|  | TKT-2026-00013  Need new monitor               [Prog] |  |  📂 View My Tickets               | |
|  | TKT-2026-00005  Email not syncing              [Res]  |  |    Track existing requests        | |
|  | TKT-2026-00001  Password reset request         [Closed]| |                                   | |
|  +-------------------------------------------------------+  +-----------------------------------+ |
+---------------------------------------------------------------------------------------------------+
```

### 4.1. Structure & Layout
1. **Welcome Banner**:
   - Heading: `Welcome, {user.displayName}!`
   - Subtitle: `Here's the latest on your requests.`
2. **Metric Cards Grid (4 Cards)**:
   - Card 1: `My Open Tickets` — Total tickets owned by user with non-terminal status (`NEW`, `ASSIGNED`, `IN_PROGRESS`, `PENDING_REQUESTER`).
   - Card 2: `In Progress` — Total tickets owned by user currently `IN_PROGRESS`.
   - Card 3: `Resolved` — Total tickets owned by user currently `RESOLVED`.
   - Card 4: `Closed` — Total tickets owned by user currently `CLOSED`.
   - **Drill-Down Links**: Each card includes an accessible "View all" link routing to `/tickets` with corresponding filter applied (`/tickets?status=IN_PROGRESS`, etc.).
3. **Operational Layout (Two Columns on Desktop)**:
   - **Left Column (8/12 cols)**: "My Recent Tickets" card:
     - List displaying the 5 most recently created/updated tickets belonging strictly to the authenticated Requester.
     - Row items: Ticket Number, Summary, Status badge, Date. Clicking an item navigates to Requester Ticket Detail (`/tickets/:id`).
     - Dedicated empty state: *"You have not submitted any tickets yet."* with a prominent "+ Create Your First Ticket" button.
   - **Right Column (4/12 cols)**: "Quick Actions" card:
     - `+ Create Ticket`: Large action with description *"Submit a new request"*.
     - `📂 View My Tickets`: Action with description *"Track existing requests"*.
4. **Data Isolation**:
   - Metrics and recent tickets are strictly scoped to `requesterId == req.user.id`. Tickets from other users are completely invisible.

---

## 5. Screen 3: Actions Taken on Ticket Detail

*(Source: `Labsheet_4.pdf`, Section 8.3, p. 6)*

### 5.1. Integration on Ticket Detail
The Actions Taken section is rendered as a first-class card container located below the core ticket metadata on both Staff Ticket Detail (`StaffTicketDetail.tsx`) and Requester Ticket Detail (`RequesterTicketDetail.tsx`):

```
+---------------------------------------------------------------------------------------------------+
|  ACTIONS TAKEN                                                              [ + Add Action Taken ]|
|  ------------------------------------------------------------------------------------------------ |
|  Date/Time         Description               Result          Status    Performed By   Assignee    |
|  ------------------------------------------------------------------------------------------------ |
|  08 Oct 09:30 AM   Ran memory diagnostics    RAM test failed [COMPL]   Michael Brown  Michael B.  |
|  08 Oct 11:15 AM   Ordered replacement RAM   PO #8491        [IN_PROG] Michael Brown  Sarah Davis |
|                    [!] Follow-Up: Check shipment status by Friday (Attachment Note: ram-po.pdf)  |
|  ------------------------------------------------------------------------------------------------ |
|  [Edit Action]                                                                                    |
+---------------------------------------------------------------------------------------------------+
```

### 5.2. Presentation Modes
1. **Desktop Data Table (≥992px)**:
   - Columns: `Date/Time`, `Description`, `Result`, `Status`, `Performed By`, `Assignee`, `Follow-Up`, `Actions`.
   - Status Badges:
     - `PLANNED`: Neutral/gray badge (`bg-light text-dark border`).
     - `IN_PROGRESS`: Blue/teal badge (`bg-info text-dark`).
     - `COMPLETED`: Green badge (`bg-success text-white`).
     - `CANCELLED`: Red/muted badge (`bg-secondary text-white`).
   - Follow-Up Indicator: Amber badge `[!] Follow-Up Required` displaying the note underneath.
2. **Mobile Stacked Cards (<768px)**:
   - Table collapses into stacked cards with clear label-value pairs:
     - Card header: Status badge and Date/Time.
     - Body: Description and Result.
     - Footer: Performed By, Assignee, Follow-Up callout, and Edit button.
3. **Empty State**:
   - When 0 actions exist: *"No actions taken recorded for this ticket yet."*
   - For IT Staff/Admin, shows an encouraging "+ Add the First Action" prompt.

### 5.3. Create & Edit Modes (IT Staff & Administrator)
- **Modal / Form Controls**:
  - `Performed By`: Read-only field displaying current authenticated user's name (auto-recorded on backend).
  - `Action Date/Time`: Date and time picker defaulting to current time (`now`).
  - `Description`: Multi-line textarea (required, 5–1000 characters).
  - `Result`: Textarea for outcome or notes (optional, up to 1000 characters).
  - `Status`: Select dropdown (`PLANNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`).
  - `Assignee`: Dropdown populated with active IT Staff and Admin users (`GET /api/v1/users/staff`). Inactive users excluded.
  - `Follow-Up Required`: Checkbox toggle (`isFollowUpRequired`).
  - `Follow-Up Note`: Text input. **Conditionally required**: if checkbox is checked, field is marked required with red asterisk `*` and client/server validator enforces non-empty string; if unchecked, field is disabled/cleared.
  - `Attachment Notes`: Optional text field (e.g. referencing physical file or attachment name).
- **Form Actions**:
  - `Save Action`: Submits payload, displays loading spinner, disables button to prevent double-submission.
  - `Cancel`: Discards draft inputs and closes form.
- **Requester Mode**:
  - Requesters can see all Actions Taken lines and details.
  - "+ Add Action Taken" button and all "Edit" action buttons are completely omitted.

---

## 6. Screen 4: Ticket Workflow & Resolution Feedback

*(Source: `Labsheet_4.pdf`, Section 8.4, p. 6; `SDS-SYS-001`, Section 8, p. 11)*

### 6.1. Dynamic Transition Controls
- On Staff Ticket Detail, the ticket status control displays only permitted transitions from the ticket's current state:
  - `NEW` &rarr; `ASSIGNED`, `IN_PROGRESS`, `CANCELLED`.
  - `ASSIGNED` &rarr; `IN_PROGRESS`, `PENDING_REQUESTER`, `CANCELLED`.
  - `IN_PROGRESS` &rarr; `PENDING_REQUESTER`, `RESOLVED`, `CANCELLED`.
  - `PENDING_REQUESTER` &rarr; `IN_PROGRESS`, `RESOLVED`, `CANCELLED`.
  - `RESOLVED` &rarr; `CLOSED`, `IN_PROGRESS` (Reopen).
  - `CLOSED` &rarr; `IN_PROGRESS` (Reopen).
  - `CANCELLED` &rarr; `IN_PROGRESS` / `NEW` (Reopen).

### 6.2. Resolution Gate Feedback Modal / Alert
When an IT Staff user attempts to transition status to `RESOLVED` or `CLOSED` while any associated Action Taken is `PLANNED` or `IN_PROGRESS`:
- The client intercepts or catches the backend `409 Conflict` (`TICKET_STATE_CONFLICT`).
- An accessible, high-contrast Zen warning dialog is rendered:
  - Header: `Action Required: Incomplete Actions Taken`
  - Body: *"This ticket cannot be resolved because 2 action(s) taken are still open (Planned or In Progress). Please mark all actions as Completed or Cancelled before closing or resolving this ticket."*
  - Action: `[Review Actions Taken]` button which scrolls directly to the Actions Taken section, plus a `[Dismiss]` button.
  - Status remains unchanged.

### 6.3. Requester Advisory Indication
- Requesters retain the *"Problem Appears Resolved"* button on their Ticket Detail view.
- Clicking the button opens a confirmation dialog: *"Confirm that your issue has been resolved. IT Staff will review the resolution and formally close the ticket."*
- Submitting records the confirmation timestamp and advisory note. If open actions remain, the ticket owner is alerted, but formal status remains unchanged.

---

## 7. Responsive Specifications & Breakpoints

| Breakpoint Range | Device Target | Dashboard Layout | Actions Taken Layout | Ticket Detail Layout |
| :--- | :--- | :--- | :--- | :--- |
| **≥ 992px** | Desktop / Laptop | 5 metric cards in one row; 2-column layout (8 cols recents, 4 cols quick actions) | Full data table with all columns, badges, and inline action buttons | Two-column grid (metadata on left, threads and actions on right) |
| **768px – 991px** | Tablet | Metric cards wrap to 2 or 3 per row; stacked cards below | Horizontally scrolled responsive table or dense cards | Single column stacked |
| **< 768px** | Mobile Devices | Metric cards stack in 2x2 grid or single column; quick actions full-width | Data table converts to stacked cards; touch targets ≥ 44px | Single column stacked; zero horizontal scroll |

---

## 8. Accessibility Compliance (WCAG 2.2 AA)

1. **Color Independence**:
   - Status badges (`PLANNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`) and Priority badges (`LOW`, `MEDIUM`, `HIGH`, `URGENT`) include text labels and distinctive icons. Color is never the sole visual indicator.
2. **Keyboard Navigation & Focus Trapping**:
   - All interactive metric cards, drill-down links, buttons, and form inputs feature a high-contrast `3px` focus ring (`--color-focus-ring`).
   - Action Taken create/edit modals trap keyboard Tab focus and restore focus to the invoking trigger button upon dismissal.
3. **Programmatic Form Labels**:
   - Every input, select, and textarea in the Action Taken form has an associated `<label for="...">` with matching ID.
   - Conditional error alerts use `role="alert"` and `aria-live="polite"` for screen readers.
4. **Touch & Target Sizing**:
   - All clickable cards, buttons, and table links maintain a minimum target size of 44x44px.

---

## 9. Screenshot Deliverable Inventory

In accordance with `Labsheet_4.pdf` Section 12 (p. 10) and Section 14 (Parts 5, 6, 8, 9, pp. 10–11), screenshot deliverables will be generated and cataloged under `artifacts/lab-04/screenshots/`:

| Directory | Screenshot Name | View / Scenario Captured |
| :--- | :--- | :--- |
| `artifacts/lab-04/screenshots/staff-dashboard/` | `01-staff-dashboard-desktop.png` | Full IT Staff dashboard with 5 metric cards, recent tickets, quick actions |
| `artifacts/lab-04/screenshots/staff-dashboard/` | `02-staff-dashboard-mobile.png` | Responsive mobile view (<768px) of IT Staff dashboard |
| `artifacts/lab-04/screenshots/staff-dashboard/` | `03-staff-dashboard-drilldown.png` | Queue filtered by status after clicking a metric card |
| `artifacts/lab-04/screenshots/requester-dashboard/` | `04-requester-dashboard-desktop.png`| Full Requester dashboard with 4 metric cards, recent tickets, quick actions |
| `artifacts/lab-04/screenshots/requester-dashboard/` | `05-requester-dashboard-mobile.png` | Responsive mobile view (<768px) of Requester dashboard |
| `artifacts/lab-04/screenshots/requester-dashboard/` | `06-requester-dashboard-empty.png` | Requester dashboard with zero tickets (empty state) |
| `artifacts/lab-04/screenshots/actions-taken/` | `07-actions-taken-table-desktop.png` | Actions Taken table on Ticket Detail with multiple actions |
| `artifacts/lab-04/screenshots/actions-taken/` | `08-actions-taken-create-modal.png` | Add Action Taken form with conditional follow-up note |
| `artifacts/lab-04/screenshots/actions-taken/` | `09-actions-taken-requester-view.png`| Read-only Actions Taken view seen by Requester |
| `artifacts/lab-04/screenshots/actions-taken/` | `10-resolution-blocked-alert.png` | High-contrast conflict error when resolving with open actions |
