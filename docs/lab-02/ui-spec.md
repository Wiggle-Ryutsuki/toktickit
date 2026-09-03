# TokTickIT Zen Green Theme UI Specification

**Document ID**: UI-SPEC-LAB-02  
**Version**: 1.0  
**Status**: Approved Design Baseline  
**Handout Reference**: `Lab_02_labsheet.pdf` (Sections 7, 8 & Appendix C, pp. 8–12, 21–22)  

---

## 1. Visual Design Tokens (Zen Green Theme)

TokTickIT adopts the **Zen Green Theme** for all Requester-facing screens in Lab 2. All UI components, buttons, inputs, alerts, and navigation bars must strictly adhere to the following color palette and token definitions:

| Design Token | Hex Code / Value | Usage & Application |
| :--- | :--- | :--- |
| `--color-primary-green` | `#006B3C` | Application header, primary action buttons, strong emphasis text |
| `--color-secondary-green` | `#0B7A46` | Active navigation tabs, links, focus accents, button hover states |
| `--color-pale-green` | `#EAF6EF` | Selected card backgrounds, success banners, soft section callouts |
| `--color-page-bg` | `#F5F7F6` | Main application body background (quiet near-white) |
| `--color-surface` | `#FFFFFF` | Card surfaces, modal panels, table backgrounds |
| `--color-text-primary` | `#1A2E24` | Primary text (dark charcoal-green, high-contrast readable) |
| `--color-text-muted` | `#526058` | Secondary labels, metadata timestamps, table headers |
| `--color-border-subtle` | `#DDE5E1` | Card borders, table dividers, input borders |
| `--color-input-bg` | `#FFFFFF` | Editable input field background |
| `--color-input-readonly` | `#EEF3F0` | Read-only field background (soft gray-green distinct tint) |
| `--color-focus-ring` | `rgba(11, 122, 70, 0.25)` | Keyboard focus outline glow |
| `--color-error` | `#B3261E` | Error borders, validation error text, required field asterisk |
| `--color-error-bg` | `#FDF2F2` | Error alert callouts and validation background |
| `--color-warning` | `#B45309` | Warning badge text, amber callouts |
| `--color-warning-bg` | `#FEF3C7` | Amber warning badge background |
| `--color-success` | `#15803D` | Success badge text, confirmation banner text |
| `--color-success-bg` | `#DCFCE7` | Success banner background |

---

## 2. Typography and Spacing

* **Font Family**: System font stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`.
* **Font Sizes**:
  * Page Title (`h1`): `1.75rem` (28px), Semi-bold (`600`)
  * Section Header (`h2` / `h5`): `1.25rem` (20px), Semi-bold (`600`)
  * Body Text: `0.9375rem` (15px), Regular (`400`), Line-height `1.5`
  * Small / Metadata / Validation: `0.8125rem` (13px), Regular (`400`)
* **Spacing & Container Scale**:
  * Max Content Width: `1140px` (centered with auto margins)
  * Card Padding: `1.5rem` (24px) desktop, `1rem` (16px) mobile
  * Grid Gap: `1rem` (16px) standard spacing between controls

---

## 3. Global Component Rules

1. **Form Labels & Asterisks**:
   * Labels sit directly above the form control in semi-bold text (`0.875rem`).
   * Required fields show a bright red asterisk: `<span className="text-danger">*</span>`.
2. **Input Fields & Heights**:
   * Standard inputs (text, select) have a uniform height of `42px`, `6px` border-radius, and border `#DDE5E1`.
   * On focus, inputs show a `#0B7A46` border with a 3px soft green focus ring.
   * Multiline Description textarea is `120px` minimum height, vertically resizable only.
   * Read-only inputs display `#EEF3F0` background and cursor default.
3. **Button Hierarchy**:
   * **Primary Button**: Solid `#006B3C` background, white text, hover `#0B7A46`.
   * **Secondary Button**: Outline `#006B3C` with green text, hover light green background `#EAF6EF`.
   * **Destructive Button**: Solid or outline red (`#B3261E`), used for soft-removal confirmations.
   * **Disabled / Busy State**: `#9CA3AF` background, cursor `not-allowed`. Submit buttons show an inline animated spinner with "Submitting…" text when active.
4. **Validation Message Placement**:
   * Validation errors appear directly underneath the offending input field with red icon, red text (`#B3261E`), and aria-live association.
   * Never rely on a single top-level generic banner for field errors.
5. **Badges (Status & Priority)**:
   * Status and Priority must combine readable text labels and distinct colors (never color alone):
     * `New`: Light blue badge with dark blue text (`bg-info-subtle text-info-emphasis`)
     * `In Progress`: Soft yellow/amber badge (`bg-warning-subtle text-warning-emphasis`)
     * `Resolved` / `Closed`: Green badge (`bg-success-subtle text-success-emphasis`)
     * `Urgent`: Red badge (`bg-danger-subtle text-danger-emphasis`)
     * `High`: Orange badge
     * `Medium`: Amber/Yellow badge
     * `Low`: Neutral gray/green badge

---

## 4. Application Shell & Navigation

```
+---------------------------------------------------------------------------------------+
|  (v) TokTickIT     [ My Tickets ]   [ + Create Ticket ]       (o) Jennifer Anderson v  |
|                                                               [ Change Requester ]     |
+---------------------------------------------------------------------------------------+
|                                                                                       |
|  [ Content Area: Breadcrumbs / Active Screen / Responsive Layout ]                    |
|                                                                                       |
+---------------------------------------------------------------------------------------+
```

* **Header Bar**:
  * Background: `#006B3C` (Primary Green) with white text and clean SVG logo.
  * Navigation Links: *My Tickets* and *+ Create Ticket* with active link underline indicator (`#FFC72C` or pale green pill).
  * Current User Badge: Displays current requester name, role badge (`Requester`), and a distinct *Change Requester* button.
* **Mobile Navigation**:
  * Hamburger menu or stacked responsive nav bar on viewports `< 768px`.

---

## 5. Screen Specifications

### Screen 1: Development Requester Selection Screen / Modal
* **Purpose**: Temporary context selection allowing test users to simulate different requesters.
* **Elements**:
  * Centered card dialog with header "Select Development Requester".
  * Informational banner: *"Authentication coming in Lab 3. Choose a development requester to test requester-specific ticket behavior."*
  * Dropdown populated with active requesters loaded from PostgreSQL.
  * Helper note: *"Only active development requesters are shown."*
  * "Continue" primary button (disabled until a valid requester is chosen).
  * Loading state (spinner while fetching requesters) and safe error state (if API fails).

### Screen 2: Create Ticket Screen (Create Mode)
* **Layout Structure**:
  * Top: Breadcrumbs (`My Tickets > Create Ticket`) and page header.
  * System-Generated / Read-Only Panel:
    * Ticket Date (current timestamp in locale format)
    * Requester Name & Email (read-only, populated from active context)
  * Classification Fields (Two Columns on Desktop):
    * Category (`*` dropdown: Account and Access, Hardware, Software, Network)
    * Related System (`*` dropdown: Email, Campus Wi-Fi, VPN, LEB2, etc.)
    * Requested Priority (`*` dropdown: Low, Medium, High, Urgent; default Medium)
  * Details Fields (Full Width):
    * Summary (`*` text input, max 120 chars, placeholder: "Brief summary of the issue")
    * Description (`*` textarea, max 2000 chars, placeholder: "Detailed steps and description")
  * Attachments Section:
    * File dropzone / file picker button (accepts `.jpg,.jpeg,.png,.webp,.pdf`, max 5 MB).
    * List of selected files with filename, formatted file size, and remove button.
    * File counter (`0 of 5 files attached`).
  * Action Footer:
    * "Submit Ticket" (Primary green button, displays spinner when busy).
    * "Cancel" (Secondary button, redirects to My Tickets).
  * Success Feedback:
    * Prominent green alert banner displaying generated Ticket Number (e.g., `TKT-2026-00001`) with direct buttons to "View Ticket Details" or "Back to My Tickets".

### Screen 3: My Tickets Screen (List Mode)
* **Layout Structure**:
  * Top Action Bar: Search input (by ticket number or summary), Category filter dropdown, Priority filter dropdown, Status filter dropdown, "Clear Filters" button, and "+ Create Ticket" primary button.
  * Data Table (Desktop) / Cards (Mobile):
    * Columns: `Ticket No`, `Created Date`, `Summary`, `Category`, `Requested Priority`, `IT Priority`, `Current Status`, `Actions`.
    * Row click or "View Details" link opens the Ticket Detail screen.
  * Pagination Controls:
    * Display text: *"Showing 1 to 10 of 24 tickets"*
    * Previous / Page numbers / Next buttons with active page highlighted in primary green.
  * Feedback States:
    * **Loading**: Clean skeleton loader or centered spinner.
    * **Empty State (0 Tickets)**: Friendly illustration/icon with text *"You have not submitted any support tickets yet."* and a "+ Create Ticket" button.
    * **No-Results State**: Filter icon with text *"No tickets matched your search criteria."* and a "Clear Filters" button.

### Screen 4: Requester Ticket Detail Screen (View Mode)
* **Layout Structure**:
  * Top: Breadcrumbs (`My Tickets > Ticket Details`), "Back to My Tickets" button.
  * Ticket Information Card (Read-Only):
    * Key-value grid showing Ticket No, Status badge, Priority badge, Created Date, Requester Name, Category, Related System, Summary, and full Description.
  * Attachments Section:
    * Header with active count: `Attachments (2/5)`.
    * Active Attachment Items: Filename, file size, uploaded date, "Download" button, and "Remove" button.
    * Add Attachment Action: File input allowing additional attachments if active count < 5.
    * Soft-Removed Attachments List (Tombstones): Displays filename, removed timestamp, remover, removal reason, and disabled/blocked download badge.
  * Soft-Removal Confirmation Modal:
    * Header: *"Confirm Attachment Removal"*
    * Message: *"Are you sure you want to remove [filename]? This action cannot be undone."*
    * Mandatory input field: *"Removal Reason (required)"*
    * "Confirm Removal" (Destructive red button) and "Cancel" button.

---

## 6. Responsive Breakpoints

| Breakpoint | Viewport Width | Required Layout Behavior |
| :--- | :--- | :--- |
| **Desktop** | &ge; 992px | Multi-column grid; 1140px centered container; full desktop table for My Tickets; side-by-side metadata and form inputs. |
| **Tablet** | 768px – 991px | 2-column layout where practical; filter controls wrap neatly; table supports horizontal scrolling if needed without page-level scroll. |
| **Mobile** | < 768px | Single column stacked layout; form controls and buttons full width; My Tickets converts to stacked card layout; touch targets &ge; 44px; zero horizontal scrolling. |

---

## 7. Accessibility (WCAG 2.2 AA Compliance)

1. **Color Contrast**: All text tokens exceed WCAG AA minimum 4.5:1 contrast ratio against their respective background surfaces.
2. **Keyboard Navigation**:
   * All interactive elements (buttons, inputs, dropdowns, links) are reachable via `Tab` key with a prominent visible focus ring (`rgba(11, 122, 70, 0.4)`).
   * Modals trap keyboard focus and return focus to the invoking trigger when dismissed.
3. **Form Semantics**:
   * Every input has an explicit `<label htmlFor="...">` tag.
   * Required fields include `aria-required="true"`.
   * Field validation messages are linked via `aria-describedby` and use `role="alert"`.
4. **Non-Color Indicators**: Status badges and priority indicators include full text labels and icons, ensuring accessibility for color-blind users.

---

## 8. Visual Inspection & Screenshot Deliverables

During evaluation, automated and manual screenshots will be captured and stored in the repository artifacts:
* `artifacts/lab-02/screenshots/create-ticket/`: Desktop initial, validation failure, submitting busy state, success banner with ticket number, API error recovery.
* `artifacts/lab-02/screenshots/my-tickets/`: Desktop table, mobile cards, search filter in action, empty state, no-results state, requester switching isolation.
* `artifacts/lab-02/screenshots/ticket-detail/`: Read-only detail view, active attachment download, soft-removal confirmation modal, soft-removed tombstone display.
