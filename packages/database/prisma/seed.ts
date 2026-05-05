import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  // Admin user
  await prisma.user.upsert({
    where: { email: "admin@naart.com" },
    update: {},
    create: {
      email: "admin@naart.com",
      name: "Admin",
      passwordHash: await bcrypt.hash("Admin@123", 12),
      role: "ADMIN",
    }
  })

  // Sample EV
  const ev = await prisma.eV.upsert({
    where: { serialNumber: "NRT-EV-001" },
    update: {},
    create: { serialNumber: "NRT-EV-001", locationName: "MG Road, Bangalore" }
  })

  // 3 TVs in the EV
  for (let i = 1; i <= 3; i++) {
    await prisma.tV.upsert({
      where: { subSerial: `NRT-EV-001-TV${i}` },
      update: {},
      create: {
        evId: ev.id,
        subSerial: `NRT-EV-001-TV${i}`,
        screenIndex: i,
      }
    })
  }

  // Sample campaigner
  const campaigner = await prisma.user.upsert({
    where: { email: "client@example.com" },
    update: {},
    create: {
      email: "client@example.com",
      name: "Sample Client",
      passwordHash: await bcrypt.hash("Client@123", 12),
      role: "CAMPAIGNER",
    }
  })

  // Give campaigner access to EV
  await prisma.campaignerEVAccess.upsert({
    where: { userId_evId: { userId: campaigner.id, evId: ev.id } },
    update: {},
    create: { userId: campaigner.id, evId: ev.id }
  })

  console.log("Seed complete ✓")
}

main().catch(console.error).finally(() => prisma.$disconnect())