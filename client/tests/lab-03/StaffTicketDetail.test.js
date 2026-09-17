import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import StaffTicketDetail from "../../src/components/StaffTicketDetail";
import { AuthContext } from "../../src/context/AuthContext";
import { RequesterProvider } from "../../src/context/RequesterContext";
import * as api from "../../src/api";
vi.mock("../../src/api", async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        getTicketDetailApi: vi.fn(),
        getStaffAssigneesApi: vi.fn(),
        updateTicketOperationalApi: vi.fn(),
        postCommentApi: vi.fn(),
        postNoteApi: vi.fn(),
    };
});
const mockStaffUser = {
    id: 7,
    displayName: "Somchai Staff",
    email: "staff.somchai@kmutt.ac.th",
    role: "IT_STAFF",
    mustChangePassword: false,
};
const mockStaffAssignees = [
    { id: 7, displayName: "Somchai Staff", email: "staff.somchai@kmutt.ac.th", role: "IT_STAFF" },
    { id: 8, displayName: "Malee Jaidee", email: "staff.malee@kmutt.ac.th", role: "IT_STAFF" },
    { id: 9, displayName: "Admin TokTickIT", email: "admin.toktickit@kmutt.ac.th", role: "ADMINISTRATOR" },
];
const mockTicketData = {
    id: 101,
    ticketNo: "TKT-2026-00001",
    summary: "VPN connection dropping repeatedly",
    description: "The VPN disconnects every 5 minutes when connecting from off-campus.",
    status: "IN_PROGRESS",
    requestedPriority: "MEDIUM",
    itPriority: "HIGH",
    ticketOwner: "Malee Jaidee",
    ownerId: 8,
    owner: { id: 8, displayName: "Malee Jaidee", email: "staff.malee@kmutt.ac.th", role: "IT_STAFF" },
    resolutionSummary: null,
    requesterResolutionConfirmedAt: null,
    version: 3,
    createdAt: "2026-09-03T10:15:30.000Z",
    updatedAt: "2026-09-04T11:20:00.000Z",
    requester: { id: 1, displayName: "Jennifer Anderson", email: "jennifer.anderson@kmutt.ac.th" },
    category: { id: 4, name: "Network" },
    relatedSystem: { id: 4, name: "VPN" },
    attachments: [],
    comments: [
        {
            id: 1,
            ticketId: 101,
            authorId: 1,
            commentType: "PUBLIC",
            content: "Here are the client logs from my workstation.",
            createdAt: "2026-09-03T10:30:00.000Z",
            author: { id: 1, displayName: "Jennifer Anderson", email: "jennifer.anderson@kmutt.ac.th", role: "REQUESTER" },
        },
    ],
    notes: [
        {
            id: 2,
            ticketId: 101,
            authorId: 8,
            commentType: "INTERNAL_NOTE",
            content: "Found route flapping on the campus edge firewall. Escalating to NOC.",
            createdAt: "2026-09-03T11:00:00.000Z",
            author: { id: 8, displayName: "Malee Jaidee", email: "staff.malee@kmutt.ac.th", role: "IT_STAFF" },
        },
    ],
};
describe("IT Staff Ticket Detail Component (UI-06, UI-07)", () => {
    let mockContext;
    const mockOnBack = vi.fn();
    beforeEach(() => {
        vi.clearAllMocks();
        mockContext = {
            user: mockStaffUser,
            isLoading: false,
            isAuthenticated: true,
            login: vi.fn(),
            logout: vi.fn(),
            changePassword: vi.fn(),
            refreshUser: vi.fn(),
        };
        vi.mocked(api.getTicketDetailApi).mockResolvedValue(JSON.parse(JSON.stringify(mockTicketData)));
        vi.mocked(api.getStaffAssigneesApi).mockResolvedValue(mockStaffAssignees);
    });
    function renderStaffDetail(ticketId = 101) {
        return render(_jsx(AuthContext.Provider, { value: mockContext, children: _jsx(RequesterProvider, { children: _jsx(StaffTicketDetail, { ticketId: ticketId, onBack: mockOnBack }) }) }));
    }
    describe("UI-06: IT Staff Ticket Detail Operational Controls", () => {
        it("UI-06.1: Renders 2-column layout with ticket metadata, status badge, IT Priority, and Requester Priority", async () => {
            renderStaffDetail();
            await waitFor(() => {
                expect(screen.getAllByText("TKT-2026-00001").length).toBeGreaterThanOrEqual(1);
            });
            expect(screen.getByText("VPN connection dropping repeatedly")).toBeInTheDocument();
            expect(screen.getByText("The VPN disconnects every 5 minutes when connecting from off-campus.")).toBeInTheDocument();
            // Verify badges
            expect(screen.getByTestId("ticket-status-badge")).toHaveTextContent("IN_PROGRESS");
            expect(screen.getByTestId("it-priority-badge")).toHaveTextContent("IT Priority: HIGH");
            expect(screen.getByText(/Requester Priority: MEDIUM/i)).toBeInTheDocument();
            expect(screen.getAllByText(/Jennifer Anderson/i).length).toBeGreaterThanOrEqual(1);
        });
        it("UI-06.2: Renders operational controls: Owner dropdown, IT Priority dropdown, and Status transitions", async () => {
            renderStaffDetail();
            await waitFor(() => {
                expect(screen.getByTestId("ticket-owner-select")).toBeInTheDocument();
            });
            const ownerSelect = screen.getByTestId("ticket-owner-select");
            expect(ownerSelect.value).toBe("8"); // Assigned to Malee Jaidee
            const prioritySelect = screen.getByTestId("it-priority-select");
            expect(prioritySelect.value).toBe("HIGH");
            const statusSelect = screen.getByTestId("status-transition-select");
            expect(statusSelect.value).toBe("IN_PROGRESS");
            // Verify available next transitions from IN_PROGRESS: PENDING_REQUESTER, RESOLVED, CANCELLED
            const options = Array.from(statusSelect.options).map((opt) => opt.text);
            expect(options.some((t) => t.includes("PENDING_REQUESTER"))).toBe(true);
            expect(options.some((t) => t.includes("RESOLVED"))).toBe(true);
            expect(options.some((t) => t.includes("CANCELLED"))).toBe(true);
        });
        it("UI-06.3: Renders [ Claim Ticket ] button when unassigned or owned by another staff member, and claims ticket", async () => {
            renderStaffDetail();
            await waitFor(() => {
                expect(screen.getByTestId("claim-ticket-button")).toBeInTheDocument();
            });
            const updatedTicket = {
                ...mockTicketData,
                ownerId: mockStaffUser.id,
                owner: { id: mockStaffUser.id, displayName: mockStaffUser.displayName, email: mockStaffUser.email, role: mockStaffUser.role },
                version: 4,
            };
            vi.mocked(api.updateTicketOperationalApi).mockResolvedValue(updatedTicket);
            fireEvent.click(screen.getByTestId("claim-ticket-button"));
            await waitFor(() => {
                expect(api.updateTicketOperationalApi).toHaveBeenCalledWith(101, {
                    ownerId: mockStaffUser.id,
                    version: 3,
                });
            });
            expect(await screen.findByText(/Ticket claimed successfully by Somchai Staff/i)).toBeInTheDocument();
        });
        it("UI-06.4: Enforces resolution summary when transitioning to RESOLVED or CLOSED", async () => {
            renderStaffDetail();
            await waitFor(() => {
                expect(screen.getByTestId("status-transition-select")).toBeInTheDocument();
            });
            const statusSelect = screen.getByTestId("status-transition-select");
            fireEvent.change(statusSelect, { target: { value: "RESOLVED" } });
            // Resolution summary textarea should now be rendered
            const summaryInput = await screen.findByTestId("resolution-summary-input");
            expect(summaryInput).toBeInTheDocument();
            // Submit with empty or <10 chars
            fireEvent.change(summaryInput, { target: { value: "Fixed" } });
            fireEvent.click(screen.getByTestId("save-operations-button"));
            expect(await screen.findByTestId("resolution-summary-error")).toHaveTextContent(/Resolution summary is required and must be between 10 and 2000 characters/i);
            expect(api.updateTicketOperationalApi).not.toHaveBeenCalled();
            // Submit with valid resolution summary (>=10 chars)
            const validSummary = "Reconfigured edge firewall failover rules to eliminate route flapping.";
            fireEvent.change(summaryInput, { target: { value: validSummary } });
            const resolvedTicket = {
                ...mockTicketData,
                status: "RESOLVED",
                resolutionSummary: validSummary,
                version: 4,
            };
            vi.mocked(api.updateTicketOperationalApi).mockResolvedValue(resolvedTicket);
            fireEvent.click(screen.getByTestId("save-operations-button"));
            await waitFor(() => {
                expect(api.updateTicketOperationalApi).toHaveBeenCalledWith(101, expect.objectContaining({
                    status: "RESOLVED",
                    resolutionSummary: validSummary,
                    version: 3,
                }));
            });
            expect(await screen.findByText(/Ticket operations updated successfully/i)).toBeInTheDocument();
        });
        it("UI-06.5: Optimistic concurrency conflict displays error banner and reloads latest ticket state", async () => {
            renderStaffDetail();
            await waitFor(() => {
                expect(screen.getByTestId("it-priority-select")).toBeInTheDocument();
            });
            const conflictError = new Error("Ticket has been modified by another user.");
            conflictError.status = 409;
            conflictError.code = "CONFLICT";
            vi.mocked(api.updateTicketOperationalApi).mockRejectedValue(conflictError);
            fireEvent.change(screen.getByTestId("it-priority-select"), { target: { value: "CRITICAL" } });
            fireEvent.click(screen.getByTestId("save-operations-button"));
            expect(await screen.findByText(/Concurrency Conflict:/i)).toBeInTheDocument();
        });
    });
    describe("UI-07: Comments & Notes Visual Distinction & Segregation", () => {
        it("UI-07.1: Switches between Public Comments, Internal Notes, and Attachments tabs", async () => {
            renderStaffDetail();
            await waitFor(() => {
                expect(screen.getByTestId("tab-comments")).toBeInTheDocument();
                expect(screen.getByTestId("tab-notes")).toBeInTheDocument();
                expect(screen.getByTestId("tab-attachments")).toBeInTheDocument();
            });
            // Public comments default
            expect(screen.getByTestId("public-comments-section")).toBeInTheDocument();
            expect(screen.queryByTestId("internal-notes-section")).not.toBeInTheDocument();
            // Switch to notes
            fireEvent.click(screen.getByTestId("tab-notes"));
            expect(screen.getByTestId("internal-notes-section")).toBeInTheDocument();
            expect(screen.queryByTestId("public-comments-section")).not.toBeInTheDocument();
            // Switch to attachments
            fireEvent.click(screen.getByTestId("tab-attachments"));
            expect(screen.getByTestId("attachments-section")).toBeInTheDocument();
        });
        it("UI-07.2: Public comments thread renders in neutral/green card style and posts new comment", async () => {
            renderStaffDetail();
            await waitFor(() => {
                expect(screen.getByTestId("public-comments-section")).toBeInTheDocument();
            });
            // Existing comment visible
            expect(screen.getByText("Here are the client logs from my workstation.")).toBeInTheDocument();
            const newCommentData = {
                id: 10,
                ticketId: 101,
                authorId: mockStaffUser.id,
                commentType: "PUBLIC",
                content: "We have reviewed the logs and identified the issue.",
                createdAt: "2026-09-04T12:00:00.000Z",
                author: mockStaffUser,
            };
            vi.mocked(api.postCommentApi).mockResolvedValue(newCommentData);
            const textarea = screen.getByPlaceholderText(/Type a comment to communicate with the requester/i);
            fireEvent.change(textarea, { target: { value: "We have reviewed the logs and identified the issue." } });
            fireEvent.click(screen.getByText("Post Public Comment"));
            await waitFor(() => {
                expect(api.postCommentApi).toHaveBeenCalledWith(101, "We have reviewed the logs and identified the issue.");
            });
            expect(await screen.findByText("We have reviewed the logs and identified the issue.")).toBeInTheDocument();
        });
        it("UI-07.3: Internal notes thread renders in amber warning style, displays confidential warning banner, and posts note", async () => {
            renderStaffDetail();
            await waitFor(() => {
                expect(screen.getByTestId("tab-notes")).toBeInTheDocument();
            });
            fireEvent.click(screen.getByTestId("tab-notes"));
            // Confidential banner
            expect(screen.getByTestId("internal-notes-confidential-banner")).toBeInTheDocument();
            expect(screen.getByText(/Strictly Confidential:/i)).toBeInTheDocument();
            // Existing note in amber card
            expect(screen.getByText("Found route flapping on the campus edge firewall. Escalating to NOC.")).toBeInTheDocument();
            const newNoteData = {
                id: 11,
                ticketId: 101,
                authorId: mockStaffUser.id,
                commentType: "INTERNAL_NOTE",
                content: "NOC engineer applied patch to BGP daemon.",
                createdAt: "2026-09-04T13:00:00.000Z",
                author: mockStaffUser,
            };
            vi.mocked(api.postNoteApi).mockResolvedValue(newNoteData);
            const textarea = screen.getByPlaceholderText(/Record diagnostic findings, internal escalation notes/i);
            fireEvent.change(textarea, { target: { value: "NOC engineer applied patch to BGP daemon." } });
            fireEvent.click(screen.getByText("Add Internal Note"));
            await waitFor(() => {
                expect(api.postNoteApi).toHaveBeenCalledWith(101, "NOC engineer applied patch to BGP daemon.");
            });
            expect(await screen.findByText("NOC engineer applied patch to BGP daemon.")).toBeInTheDocument();
        });
    });
});
