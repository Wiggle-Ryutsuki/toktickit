# TokTickIT Zen Green Theme UI Specification (Lab 3)

**Document ID**: UI-SPEC-LAB-03  
**Version**: 1.0  
**Status**: Approved Design Baseline  
**Handout Reference**: `docs/lab-03/Lab_3_sheet.pdf` (Sections 3, 7, 8, & Section 14 Part 9, pp. 2, 7–12, 18)  
**Parent Specification**: `docs/TokTickIT-System-Level-SDS-v1.0.pdf` (Section *Frontend and UI Design System*, p. 13–14)  
**Target Branch**: `lab3-staging`  

---

## 1. Visual Design Tokens (Zen Green Theme)

TokTickIT reuses and extends the **Zen Green Design System** established in Lab 2. All screens, cards, modals, tables, badges, and controls must strictly follow these design tokens to guarantee visual continuity:

| Design Token | Hex Code / Value | Usage & Application |
| :--- | :--- | :--- |
| `--color-primary-green` | `#006B3C` | Application header, primary action buttons, focused controls |
| `--color-forest-green` | `#0F5132` | Dark header background, strong brand accents |
| `--color-secondary-green` | `#0B7A46` | Active navigation items, interactive links, hover accents |
| `--color-pale-green` | `#EAF6EF` | Selected card surfaces, light success alerts, active tab fills |
| `--color-page-bg` | `#F5F7F6` | Main page background (neutral soft green-white) |
| `--color-surface` | `#FFFFFF` | Form cards, tables, modal dialog surfaces |
| `--color-text-primary` | `#1A2E24` | Primary high-contrast typography |
| `--color-text-muted` | `#526058` | Subtitles, helper text, table column headers, metadata |
| `--color-border-subtle` | `#DDE5E1` | Dividers, card boundaries, input borders |
| `--color-input-bg` | `#FFFFFF` | Editable form input fields |
| `--color-input-readonly` | `#EEF3F0` | Non-editable, read-only field backgrounds |
| `--color-focus-ring` | `rgba(11, 122, 70, 0.25)` | 3px visible keyboard focus glow |
| `--color-error` | `#B3261E` | Required asterisks, error alerts, invalid input borders |
| `--color-error-bg` | `#FDF2F2` | Validation callout background |
| `--color-warning` | `#B45309` | Warning badges, Internal Notes headers, attention callouts |
| `--color-warning-bg` | `#FEF3C7` | Internal Notes card background, warning alerts |
| `--color-success` | `#15803D` | Success confirmation badges, active status indicators |
| `--color-success-bg` | `#DCFCE7` | Success confirmation banner background |

---

## 2. Application Shell & Global Navigation

### 2.1. Header Bar
* **Brand Element**: Displays "TokTickIT" text logo linking to the user's role-appropriate home screen.
* **Decommissioned Scaffolding**: The temporary Lab 2 Development Requester selector dropdown and "Change Requester" modal are permanently removed.
* **Authenticated User Display**:
  * Displays user's full display name (e.g., "Michael Brown").
  * Displays role badge adjacent to name:
    * `Requester`: Blue-gray badge (`bg-secondary text-white`)
    * `IT Staff`: Green badge (`bg-success text-white`)
    * `Administrator`: Dark purple/forest badge (`bg-dark text-white`)
* **Logout Button**:
  * Explicit "Logout" action in the header (or user dropdown menu).
  * Triggers session invalidation and routes immediately to `/login`.

### 2.2. Role-Based Navigation Menu
Navigation links dynamically adapt to the authenticated role without rendering inaccessible routes:
* **Requester**:
  * `My Tickets` (`/tickets`)
  * `+ Create Ticket` (`/tickets/new`)
* **IT Staff**:
  * `My Queue` (`/staff/queue` or `/queue`)
  * `+ Create Ticket` (`/tickets/new`)
* **Administrator**:
  * `Admin` (User Management) (`/admin/users`)
  * `My Queue` (`/staff/queue`)

---

## 3. Detailed Screen Specifications

### 3.1. Login Screen (`/login`)
* **Container**: Centered card (`max-width: 440px`), elevated shadow, clean white surface on `--color-page-bg`.
* **Header**: TokTickIT brand logo with title: *"Sign in to your account"*.
* **Form Controls**:
  1. **Email Address**:
     * Label: `Email address` (with red asterisk `*`)
     * Input: `type="email"`, placeholder `user@kmutt.ac.th`, required.
  2. **Password**:
     * Label: `Password` (with red asterisk `*`)
     * Input: `type="password"`, with show/hide password visibility toggle icon.
  3. **Submit Button**:
     * Text: *"Sign In"*
     * Style: Full-width Zen Green primary button (`--color-primary-green`).
     * State: Shows animated spinner and disables during authentication API request.
* **Error & Feedback**:
  * Inline validation if fields are submitted empty.
  * Generic failure banner for bad credentials: *"Invalid email or password. Please try again."* (Never reveals if email exists).
  * Inactive account banner: *"Your account is inactive. Please contact an Administrator."*

---

### 3.2. Mandatory Change Password Screen (`/change-password`)
* **Context**: Intercepts users flagged with `mustChangePassword = true`. All other navigation links are disabled or hidden.
* **Container**: Centered card (`max-width: 480px`).
* **Header**: Title *"Change Your Password"*, subtitle *"You must change your password to continue."*
* **Form Controls**:
  1. **Current (Temporary) Password**:
     * Label: `Current (temporary) password *`
     * Input: `type="password"`, required.
  2. **New Password**:
     * Label: `New password *`
     * Input: `type="password"`, required.
  3. **Confirm New Password**:
     * Label: `Confirm new password *`
     * Input: `type="password"`, required.
  4. **Password Policy Checklist**:
     * Dynamic green checkmarks / red indicators validating rules in real time:
       * [x] Be at least 8 characters
       * [x] Include upper and lower case letters
       * [x] Include a number and a special character
  5. **Submit Button**:
     * Text: *"Continue"*
     * Disabled until all password policy rules are met and new passwords match.

---

### 3.3. Requester Ticket Detail & Regression (`/tickets/:id`)
* **Preserved Functionality**:
  * Read-only ticket summary, category, related system, requested priority, and description.
  * Attachment section: View active files, download securely, soft-remove with confirmed reason modal.
* **Additions for Lab 3**:
  1. **Public Comments Section**:
     * Chronological comment list showing author name, role badge, timestamp, and message body.
     * Textarea input with *"Post Comment"* button.
     * Empty/whitespace validation feedback.
  2. **Problem Appears Resolved Action**:
     * Prominent button: *"Problem Appears Resolved"*.
     * When clicked, records requester confirmation timestamp/flag and shows confirmation alert.
     * Clarifies to the user that IT Staff remain responsible for formal ticket closure.

---

### 3.4. IT Staff Ticket Queue (`/staff/queue` or `/queue`)
* **Header Bar**:
  * Title: *"Ticket Queue"* with active ticket count counter (e.g. *"Showing 1 to 10 of 87 tickets"*).
  * Refresh button.
* **Filter & Search Toolbar**:
  * **Search Bar**: Full-width input with magnifying glass icon: *"Search by ticket number or summary..."*.
  * **Filter Bar / Popover**:
    * Category dropdown (All, Account and Access, Hardware, Software, Network).
    * Status dropdown (All, New, In Progress, Pending Requester, Resolved, Closed, Cancelled).
    * Requested Priority dropdown (All, Low, Medium, High, Urgent).
    * IT Priority dropdown (All, Low, Medium, High, Urgent).
    * Assignment toggle/filter: `All`, `Unassigned`, `Assigned to Me`.
* **Queue Data Table (Desktop $\ge 992\text{px}$)**:
  * Columns:
    1. `Ticket No`: Monospace formatted (e.g. `TKT-2026-00012`), clickable link to Ticket Detail.
    2. `Created Date`: Locale formatted date/time.
    3. `Summary`: Truncated at 60 chars with tooltip.
    4. `Category`: Neutral pill badge.
    5. `Req. Priority`: Sized priority badge (`Low`: gray, `Medium`: blue, `High`: orange, `Urgent`: red).
    6. `IT Priority`: Distinct IT priority badge with icon.
    7. `Status`: Status badge (`New`: primary, `In Progress`: info, `Pending Requester`: warning, `Resolved`: success, `Closed`: secondary, `Cancelled`: dark).
    8. `Ticket Owner`: Display name of assigned IT Staff or *"Unassigned"* (in italic muted text).
    9. `Actions`: *"Open"* button.
* **Mobile / Tablet Queue View ($< 992\text{px}$)**:
  * Responsive cards displaying Ticket No, Status pill, Summary, Owner, and Priority pills.
* **Pagination Controls**:
  * Centered page navigation: `< Previous`, page pills `[1] [2] [3] ... [N]`, `Next >`.
  * Page size selector: 10, 25, 50.
* **Feedback States**:
  * Empty queue: *"No tickets currently in the queue."*
  * No search results: *"No matching tickets found. Try resetting your search filters."* with a "Reset Filters" action.

---

### 3.5. IT Staff Ticket Detail (`/staff/tickets/:id`)
* **Breadcrumbs**: `My Queue > Ticket Detail > TKT-2026-00012` with `< Back to Queue` button.
* **Ticket Metadata Card**:
  * Two-column responsive layout:
    * `Ticket No`: Monospace read-only text.
    * `Created Date`: Read-only UTC-formatted locale date.
    * `Requester`: Name & email (read-only).
    * `Category`: Read-only category name.
    * `Related System`: Read-only system name.
    * `Requested Priority`: Read-only priority badge.
    * `Summary`: Read-only bold heading.
    * `Description`: Read-only whitespace-preserved paragraph.
* **Operational Controls Panel (Interactive)**:
  1. **Ticket Owner**:
     * Dropdown selector listing active IT Staff and Administrator users.
     * Quick-action button: *"Claim Ticket"* (automatically assigns current user).
  2. **IT Priority**:
     * Dropdown selector: `Low`, `Medium`, `High`, `Urgent`.
  3. **Current Status**:
     * Dropdown selector restricting choices to permitted transitions per business rules.
  4. **Resolution Summary**:
     * Textarea input required when moving to `Resolved` or `Closed`.
  5. **Save Changes Button**:
     * Saves operational modifications with optimistic concurrency version check.
* **Tabbed Content Container**:
  * **Tab 1: Public Comments**:
    * Public discussion thread between Requester and IT Staff.
    * Standard card background (`--color-surface`).
    * New comment form with textarea and *"Post Comment"* button.
  * **Tab 2: Internal Notes**:
    * **Visual Distinction**: Wrapped in warning amber border with light-amber background (`--color-warning-bg`), a lock icon, and a prominent banner:
      > 🔒 **Private Internal Note** — *Visible only to IT Staff and Administrators. Requesters cannot see these notes.*
    * Append-only history; author and timestamp tagged.
    * New note form with textarea and *"Add Internal Note"* button.
  * **Tab 3: Attachments**:
    * Lists all attachments with size and upload date.
    * Download button for active files.
    * Soft-removal action with reason modal for authorized users.

---

### 3.6. Administrator User Management (`/admin/users`)
* **Header**: Title *"User Management"*, subtitle *"Manage application user accounts, roles, and credentials."* with top-right action: `+ Create User`.
* **Search & Filter Bar**:
  * Search input: *"Search users by name or email..."*
  * Role filter dropdown: `All Roles`, `Requester`, `IT Staff`, `Administrator`.
* **User List Table**:
  * Columns:
    1. `Name`: Full display name.
    2. `Email`: Case-insensitive email address.
    3. `Role`: Role pill badge (`REQUESTER`: blue-gray, `IT_STAFF`: green, `ADMINISTRATOR`: dark/purple).
    4. `Status`: Status toggle pill (`Active`: green text/badge, `Inactive`: red/muted text).
    5. `Actions`: *"Edit"* button.
* **Create User Modal / Drawer**:
  * Modal Title: *"Create New User"*
  * Fields:
    * `Full Name *`: Text input.
    * `Email Address *`: Email input.
    * `Role *`: Dropdown (`Requester`, `IT Staff`, `Administrator`).
    * `Active Status`: Switch/toggle (Default: `Yes`).
    * `Initial Password *`: Text input with notice: *"User will be forced to change this password on first login."*
  * Actions:
    * *"Save User"* (Primary Zen Green button).
    * *"Cancel"*.
* **Edit User Modal**:
  * Modal Title: *"Edit User: [User Name]"*
  * Editable Fields: Full Name, Email, Role, Active status toggle.
  * Credential Action: *"Set New Initial Password"* button (expands input and flags account for next-login password change).
  * Danger Action: *"Deactivate User"* button (disabled if self-deactivating or if user is the last active Administrator).
  * Explicit Safety Error Alerts:
    * Self-deactivation: *"You cannot deactivate your own active Administrator account."*
    * Last Admin protection: *"Cannot deactivate or re-role the only active Administrator in the system."*

---

## 4. Screen Modes, Error States, and Feedback

| State / Condition | Visual Representation & Feedback |
| :--- | :--- |
| **Loading / Busy** | Centered spinner with text *"Loading data..."*; form submit buttons show mini-spinner and disable. |
| **Field Validation Error** | Input border turns red (`--color-error`), red helper text renders directly below field. |
| **Success Banner** | Light green alert banner (`--color-success-bg`) with check icon and dismiss button. |
| **Empty Results** | Quiet card illustration with explanatory text and call-to-action (e.g. "No tickets found"). |
| **401 Unauthenticated** | Immediate redirect to `/login` with return destination stored for post-login redirect. |
| **403 Forbidden** | Dedicated error view: *"Access Denied. You do not have permission to view this resource."* |
| **404 Not Found** | Error view: *"The requested ticket or user does not exist."* with Back button. |
| **409 Concurrency Conflict**| Warning banner: *"This record was updated by another user. Please reload the page."* |
| **500 Server Error** | Generic error toast/banner: *"An unexpected error occurred. Please try again later."* (Correlation ID shown). |

---

## 5. Responsive Breakpoint Matrix

| Component / Screen | Desktop ($\ge 992\text{px}$) | Tablet ($768\text{px} - 991\text{px}$) | Mobile ($< 768\text{px}$) |
| :--- | :--- | :--- | :--- |
| **App Header** | Horizontal layout, full brand, user badge, and logout | Compact brand, icons with abbreviated labels | Hamburger menu / stacked dropdown |
| **Login / Password Card** | Centered $440\text{px}$ card with generous padding | Centered $400\text{px}$ card | Full-width container with $16\text{px}$ horizontal margin |
| **IT Staff Queue** | Full 9-column data table with sorting headers | Compact table with truncated summaries | Vertical card list with status pills and Open action |
| **Ticket Detail Layout** | 2-column layout (Metadata left, Operations right) | Stacked layout: Metadata top, Operations below | Single column stack with full-width action buttons |
| **Comments & Notes** | Side-by-side tabs or generous full-width list | Full-width list with distinct card backgrounds | Full-width cards, large touch-friendly submit buttons |
| **Admin User List** | 5-column table with search/filter toolbar | Responsive table with scrollable actions | User cards showing Name, Role pill, Status, Edit button |

---

## 6. Accessibility (WCAG 2.2 AA) Checklist

1. **Color Independence**: Status, priority, and role badges always include legible text labels alongside color fills.
2. **Contrast Ratios**: All text meets a minimum contrast ratio of $4.5:1$ against surface backgrounds ($3:1$ for large text).
3. **Form Labels**: Every `<input>`, `<select>`, and `<textarea>` has an explicit programmatic `<label>` with matching `htmlFor`/`id`.
4. **Keyboard Focus**: Visible 3px green focus ring (`--color-focus-ring`) is rendered on all interactive elements upon Tab navigation.
5. **Modal Focus Trapping**: Modals trap Tab focus within the dialog and return focus to the triggering element upon close.
