import { getPrisma } from "../src/prisma.js";
import { Role } from "@prisma/client";
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
