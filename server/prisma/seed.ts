import { getPrisma } from "../src/prisma.js";
import { Role, ActionStatus, Priority, TicketStatus } from "@prisma/client";
import { hashPassword } from "../src/utils/password.js";

const categories = [
  { name: "Account and Access", code: "ACC", description: "Account and access requests", isActive: true },
  { name: "Hardware", code: "HW", description: "Hardware issues and equipment requests", isActive: true },
  { name: "Software", code: "SW", description: "Software installation, licensing, and application issues", isActive: true },
  { name: "Network", code: "NET", description: "Network connectivity and internet access issues", isActive: true },
];

const relatedSystems = [
  { name: "Campus Wi-Fi", description: "KMUTT wireless campus network", isActive: true },
  { name: "Corporate Laptop", description: "Staff and faculty assigned laptops", isActive: true },
  { name: "Email", description: "KMUTT official email service", isActive: true },
  { name: "Grade Submission App", description: "Academic grading submission platform", isActive: true },
  { name: "LEB2 App", description: "Learning Environment at Bangmod 2nd Gen", isActive: true },
  { name: "Printer", description: "Campus networked printers and copiers", isActive: true },
  { name: "VPN", description: "Virtual Private Network for off-campus access", isActive: true },
];

async function main() {
  const prisma = getPrisma();

  console.log("Seeding categories...");
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {
        code: cat.code,
        description: cat.description,
        isActive: cat.isActive,
      },
      create: cat,
    });
  }

  console.log("Seeding related systems...");
  for (const system of relatedSystems) {
    await prisma.relatedSystem.upsert({
      where: { name: system.name },
      update: {
        description: system.description,
        isActive: system.isActive,
      },
      create: system,
    });
  }

  console.log("Seeding users with Argon2id password hashes...");
  const defaultPasswordHash = await hashPassword("Password123!");
  const initialPasswordHash = await hashPassword("InitialPass123!");

  const users = [
    {
      email: "jennifer.anderson@kmutt.ac.th",
      displayName: "Jennifer Anderson",
      role: Role.REQUESTER,
      isActive: true,
      passwordHash: defaultPasswordHash,
      mustChangePassword: false,
    },
    {
      email: "sarah.johnson@kmutt.ac.th",
      displayName: "Sarah Johnson",
      role: Role.REQUESTER,
      isActive: true,
      passwordHash: defaultPasswordHash,
      mustChangePassword: false,
    },
    {
      email: "david.lee@kmutt.ac.th",
      displayName: "David Lee",
      role: Role.REQUESTER,
      isActive: true,
      passwordHash: defaultPasswordHash,
      mustChangePassword: false,
    },
    {
      email: "michael.brown@kmutt.ac.th",
      displayName: "Michael Brown",
      role: Role.REQUESTER,
      isActive: true,
      passwordHash: defaultPasswordHash,
      mustChangePassword: false,
    },
    {
      email: "firstlogin.requester@kmutt.ac.th",
      displayName: "FirstLogin Requester",
      role: Role.REQUESTER,
      isActive: true,
      passwordHash: initialPasswordHash,
      mustChangePassword: true,
    },
    {
      email: "alex.taylor.inactive@kmutt.ac.th",
      displayName: "Alex Taylor",
      role: Role.REQUESTER,
      isActive: false,
      passwordHash: defaultPasswordHash,
      mustChangePassword: false,
    },
    {
      email: "staff.somchai@kmutt.ac.th",
      displayName: "Somchai Prasert",
      role: Role.IT_STAFF,
      isActive: true,
      passwordHash: defaultPasswordHash,
      mustChangePassword: false,
    },
    {
      email: "staff.malee@kmutt.ac.th",
      displayName: "Malee Jaidee",
      role: Role.IT_STAFF,
      isActive: true,
      passwordHash: defaultPasswordHash,
      mustChangePassword: false,
    },
    {
      email: "staff.anong@kmutt.ac.th",
      displayName: "Anong Srichai",
      role: Role.IT_STAFF,
      isActive: true,
      passwordHash: defaultPasswordHash,
      mustChangePassword: false,
    },
    {
      email: "staff.inactive@kmutt.ac.th",
      displayName: "Inactive Staff",
      role: Role.IT_STAFF,
      isActive: false,
      passwordHash: defaultPasswordHash,
      mustChangePassword: false,
    },
    {
      email: "admin.toktickit@kmutt.ac.th",
      displayName: "Admin TokTickIT",
      role: Role.ADMINISTRATOR,
      isActive: true,
      passwordHash: defaultPasswordHash,
      mustChangePassword: false,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        displayName: user.displayName,
        role: user.role,
        isActive: user.isActive,
        passwordHash: user.passwordHash,
        mustChangePassword: user.mustChangePassword,
      },
      create: user,
    });
  }
  console.log(`Seeded ${users.length} users successfully.`);

  // ---------------------------------------------------------------------------
  // Feature 13 / Lab 4 — Idempotent Realistic Tickets & Actions Taken Seeding
  // ---------------------------------------------------------------------------
  console.log("Seeding realistic tickets and actions taken...");
  const jennifer = await prisma.user.findUniqueOrThrow({ where: { email: "jennifer.anderson@kmutt.ac.th" } });
  const sarah = await prisma.user.findUniqueOrThrow({ where: { email: "sarah.johnson@kmutt.ac.th" } });
  const david = await prisma.user.findUniqueOrThrow({ where: { email: "david.lee@kmutt.ac.th" } });
  const somchai = await prisma.user.findUniqueOrThrow({ where: { email: "staff.somchai@kmutt.ac.th" } });
  const malee = await prisma.user.findUniqueOrThrow({ where: { email: "staff.malee@kmutt.ac.th" } });

  const hwCat = await prisma.category.findUniqueOrThrow({ where: { name: "Hardware" } });
  const swCat = await prisma.category.findUniqueOrThrow({ where: { name: "Software" } });
  const netCat = await prisma.category.findUniqueOrThrow({ where: { name: "Network" } });
  const accCat = await prisma.category.findUniqueOrThrow({ where: { name: "Account and Access" } });

  const laptopSys = await prisma.relatedSystem.findUniqueOrThrow({ where: { name: "Corporate Laptop" } });
  const printerSys = await prisma.relatedSystem.findUniqueOrThrow({ where: { name: "Printer" } });
  const vpnSys = await prisma.relatedSystem.findUniqueOrThrow({ where: { name: "VPN" } });
  const emailSys = await prisma.relatedSystem.findUniqueOrThrow({ where: { name: "Email" } });
  const wifiSys = await prisma.relatedSystem.findUniqueOrThrow({ where: { name: "Campus Wi-Fi" } });

  const seedTickets = [
    {
      ticketNo: "TKT-2026-00034",
      title: "Laptop battery drains quickly",
      description: "Laptop battery drains from 100% to 10% in under 30 minutes during lectures.",
      requesterId: jennifer.id,
      ownerId: somchai.id,
      categoryId: hwCat.id,
      relatedSystemId: laptopSys.id,
      requestedPriority: Priority.HIGH,
      itPriority: Priority.HIGH,
      status: TicketStatus.IN_PROGRESS,
      actions: [
        {
          description: "Ran hardware diagnostic tools on laptop memory and battery modules.",
          result: "Battery capacity measured at 34% of original design capacity.",
          status: ActionStatus.COMPLETED,
          performedById: somchai.id,
          assigneeId: somchai.id,
          isFollowUpRequired: true,
          followUpNote: "Order replacement OEM battery pack from supplier.",
          attachmentNotes: "battery-diag-report.txt",
        },
        {
          description: "Placed purchase request for replacement OEM battery pack.",
          result: "Purchase order #PO-4421 submitted to procurement.",
          status: ActionStatus.IN_PROGRESS,
          performedById: somchai.id,
          assigneeId: malee.id, // Independent assignee (BR-02)
          isFollowUpRequired: false,
          followUpNote: null,
          attachmentNotes: null,
        },
      ],
    },
    {
      ticketNo: "TKT-2026-00030",
      title: "Printer keep showing offline",
      description: "Network printer in CB2 floor 3 appears offline on staff workstations.",
      requesterId: jennifer.id,
      ownerId: malee.id,
      categoryId: hwCat.id,
      relatedSystemId: printerSys.id,
      requestedPriority: Priority.MEDIUM,
      itPriority: Priority.MEDIUM,
      status: TicketStatus.ASSIGNED,
      actions: [
        {
          description: "Restarted print server spooler daemon and tested ping response.",
          result: "Print spooler service restored; test page printed successfully.",
          status: ActionStatus.COMPLETED,
          performedById: malee.id,
          assigneeId: malee.id,
          isFollowUpRequired: false,
          followUpNote: null,
          attachmentNotes: null,
        },
      ],
    },
    {
      ticketNo: "TKT-2026-00028",
      title: "Outlook freezing intermittently",
      description: "Outlook client freezes when syncing mailbox or switching folders.",
      requesterId: jennifer.id,
      ownerId: somchai.id,
      categoryId: swCat.id,
      relatedSystemId: emailSys.id,
      requestedPriority: Priority.MEDIUM,
      itPriority: Priority.MEDIUM,
      status: TicketStatus.IN_PROGRESS,
      actions: [
        {
          description: "Cleared corrupted Outlook local cache and rebuilt OST profile.",
          result: "Sync resumed without locking; monitoring user feedback.",
          status: ActionStatus.IN_PROGRESS,
          performedById: somchai.id,
          assigneeId: somchai.id,
          isFollowUpRequired: true,
          followUpNote: "Verify with user if indexing completes cleanly.",
          attachmentNotes: null,
        },
      ],
    },
    {
      ticketNo: "TKT-2026-00023",
      title: "Phone not receiving calls",
      description: "IP phone on desk 402 cannot receive incoming external calls.",
      requesterId: sarah.id,
      ownerId: somchai.id,
      categoryId: netCat.id,
      relatedSystemId: wifiSys.id,
      requestedPriority: Priority.LOW,
      itPriority: Priority.LOW,
      status: TicketStatus.ASSIGNED,
      actions: [], // Zero actions (empty state)
    },
    {
      ticketNo: "TKT-2026-00019",
      title: "VPN disconnects randomly",
      description: "OpenVPN connection drops every 10-15 minutes when working off campus.",
      requesterId: jennifer.id,
      ownerId: somchai.id,
      categoryId: netCat.id,
      relatedSystemId: vpnSys.id,
      requestedPriority: Priority.MEDIUM,
      itPriority: Priority.MEDIUM,
      status: TicketStatus.RESOLVED,
      resolutionSummary: "Reinstalled client TLS certificate profile and updated MTU settings.",
      actions: [
        {
          description: "Updated client configuration file with adjusted MSS clamping and TLS key.",
          result: "Connection tested stable for 6 consecutive hours.",
          status: ActionStatus.COMPLETED,
          performedById: somchai.id,
          assigneeId: somchai.id,
          isFollowUpRequired: false,
          followUpNote: null,
          attachmentNotes: "vpn-config-patch.ovpn",
        },
      ],
    },
    {
      ticketNo: "TKT-2026-00040",
      title: "Wi-Fi disconnected in Building 3",
      description: "Access point in Engineering Building 3 floor 2 not broadcasting SSID.",
      requesterId: david.id,
      ownerId: null, // Unassigned
      categoryId: netCat.id,
      relatedSystemId: wifiSys.id,
      requestedPriority: Priority.URGENT,
      itPriority: Priority.URGENT,
      status: TicketStatus.NEW,
      actions: [], // Zero actions (empty state)
    },
    {
      ticketNo: "TKT-2026-00041",
      title: "Software license expired",
      description: "Matlab license expired error when launching lab software.",
      requesterId: jennifer.id,
      ownerId: somchai.id,
      categoryId: swCat.id,
      relatedSystemId: laptopSys.id,
      requestedPriority: Priority.HIGH,
      itPriority: Priority.HIGH,
      status: TicketStatus.PENDING_REQUESTER,
      actions: [
        {
          description: "Requested renewal license token from university software licensing team.",
          result: null,
          status: ActionStatus.PLANNED,
          performedById: somchai.id,
          assigneeId: somchai.id,
          isFollowUpRequired: true,
          followUpNote: "Send license key instructions to requester once received.",
          attachmentNotes: null,
        },
      ],
    },
  ];

  for (const t of seedTickets) {
    const { actions, ...ticketData } = t;
    const ticket = await prisma.ticket.upsert({
      where: { ticketNo: t.ticketNo },
      update: ticketData,
      create: ticketData,
    });

    for (const action of actions) {
      const existing = await prisma.actionTaken.findFirst({
        where: {
          ticketId: ticket.id,
          description: action.description,
        },
      });

      if (!existing) {
        await prisma.actionTaken.create({
          data: {
            ticketId: ticket.id,
            description: action.description,
            result: action.result,
            status: action.status,
            performedById: action.performedById,
            assigneeId: action.assigneeId,
            isFollowUpRequired: action.isFollowUpRequired,
            followUpNote: action.followUpNote,
            attachmentNotes: action.attachmentNotes,
          },
        });
      }
    }
  }

  console.log(`Seeded ${seedTickets.length} tickets with Actions Taken.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    const prisma = getPrisma();
    await prisma.$disconnect();
  });
