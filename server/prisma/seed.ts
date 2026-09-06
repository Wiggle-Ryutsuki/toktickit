import { getPrisma } from "../src/prisma.js";
import { Role } from "@prisma/client";

// Feature 5 Seed Data per Lab 2 Specification (docs/lab-02/specification.md & docs/features/feature-05/contract.md)

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

const developmentRequesters = [
  {
    email: "jennifer.anderson@kmutt.ac.th",
    displayName: "Jennifer Anderson",
    role: Role.REQUESTER,
    isActive: true,
  },
  {
    email: "sarah.johnson@kmutt.ac.th",
    displayName: "Sarah Johnson",
    role: Role.REQUESTER,
    isActive: true,
  },
  {
    email: "david.lee@kmutt.ac.th",
    displayName: "David Lee",
    role: Role.REQUESTER,
    isActive: true,
  },
  {
    email: "michael.brown@kmutt.ac.th",
    displayName: "Michael Brown",
    role: Role.REQUESTER,
    isActive: true,
  },
  {
    email: "alex.taylor.inactive@kmutt.ac.th",
    displayName: "Alex Taylor",
    role: Role.REQUESTER,
    isActive: false,
  },
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

  console.log("Seeding development requesters...");
  for (const reqUser of developmentRequesters) {
    await prisma.user.upsert({
      where: { email: reqUser.email },
      update: {
        displayName: reqUser.displayName,
        role: reqUser.role,
        isActive: reqUser.isActive,
      },
      create: reqUser,
    });
  }

  console.log("Feature 5 seed complete.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
