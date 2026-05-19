import { NextResponse } from "next/server"
import { prisma } from "@vaart/database"

export async function POST(req: Request) {
  const serial = req.headers.get("X-Serial")
  const subSerial = req.headers.get("X-SubSerial")
  const { timestamp } = await req.json()

  if (!serial || !subSerial) return NextResponse.json({ error: "Missing headers" }, { status: 400 })

  const tv = await prisma.tV.findUnique({
    where: { subSerial },
    include: { ev: true }
  })

  if (!tv || tv.ev.serialNumber !== serial) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await prisma.tVHeartbeat.create({
    data: { tvId: tv.id, timestamp: new Date(timestamp) }
  })

  return NextResponse.json({ status: "ok" })
}