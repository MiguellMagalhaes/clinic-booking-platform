import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { appointmentsTable, clinicsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod/v4";
import { createAppointmentInIMED } from "../lib/imed";
import { sendAppointmentConfirmation } from "../lib/email";

const router: IRouter = Router();

const ALL_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "14:00", "14:30", "15:00",
  "15:30", "16:00", "16:30", "17:00", "17:30",
];

const createAppointmentSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(6),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string(),
  clinicId: z.number().int().positive().nullable().optional(),
});

router.get("/available-slots", async (req, res) => {
  const { date, clinicId } = req.query;

  if (!date || typeof date !== "string") {
    res.status(400).json({ error: "bad_request", message: "date is required" });
    return;
  }

  const conditions = [eq(appointmentsTable.date, date)];
  if (clinicId) {
    conditions.push(eq(appointmentsTable.clinicId, Number(clinicId)));
  }

  const booked = await db
    .select({ time: appointmentsTable.time })
    .from(appointmentsTable)
    .where(
      conditions.length > 1
        ? and(...conditions)
        : conditions[0]
    );

  const bookedTimes = new Set(booked.map((b) => b.time));

  const slots = ALL_SLOTS.map((time) => ({
    time,
    available: !bookedTimes.has(time),
  }));

  res.json(slots);
});

router.get("/appointments", async (req, res) => {
  const { clinicId, status } = req.query;

  const allAppointments = await db
    .select({
      id: appointmentsTable.id,
      name: appointmentsTable.name,
      email: appointmentsTable.email,
      phone: appointmentsTable.phone,
      date: appointmentsTable.date,
      time: appointmentsTable.time,
      status: appointmentsTable.status,
      externalId: appointmentsTable.externalId,
      source: appointmentsTable.source,
      clinicId: appointmentsTable.clinicId,
      clinicName: clinicsTable.name,
      createdAt: appointmentsTable.createdAt,
    })
    .from(appointmentsTable)
    .leftJoin(clinicsTable, eq(appointmentsTable.clinicId, clinicsTable.id));

  let filtered = allAppointments;
  if (clinicId) {
    filtered = filtered.filter((a) => a.clinicId === Number(clinicId));
  }
  if (status && typeof status === "string") {
    filtered = filtered.filter((a) => a.status === status);
  }

  res.json(filtered);
});

router.post("/appointments", async (req, res) => {
  const parsed = createAppointmentSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const data = parsed.data;

  const existing = await db
    .select()
    .from(appointmentsTable)
    .where(
      and(
        eq(appointmentsTable.date, data.date),
        eq(appointmentsTable.time, data.time),
        ...(data.clinicId ? [eq(appointmentsTable.clinicId, data.clinicId)] : [])
      )
    )
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "slot_taken", message: "This time slot is already booked" });
    return;
  }

  let externalId: string | undefined;
  let source = "web";

  try {
    const imedResult = await createAppointmentInIMED({
      name: data.name,
      email: data.email,
      phone: data.phone,
      date: data.date,
      time: data.time,
    });
    externalId = imedResult.external_id;
    source = "imed";
  } catch (_err) {
    req.log.warn("Could not create appointment in IMED, continuing without external ID");
  }

  const [created] = await db
    .insert(appointmentsTable)
    .values({
      name: data.name,
      email: data.email,
      phone: data.phone,
      date: data.date,
      time: data.time,
      status: "confirmed",
      externalId: externalId ?? null,
      source,
      clinicId: data.clinicId ?? null,
    })
    .returning();

  let clinicName: string | null = null;
  if (data.clinicId) {
    const clinic = await db
      .select()
      .from(clinicsTable)
      .where(eq(clinicsTable.id, data.clinicId))
      .limit(1);
    clinicName = clinic[0]?.name ?? null;
  }

  sendAppointmentConfirmation({
    to: data.email,
    name: data.name,
    date: data.date,
    time: data.time,
    clinicName: clinicName ?? undefined,
  }).catch((err) => {
    req.log.error({ err }, "Failed to send confirmation email");
  });

  res.status(201).json({ ...created, clinicName });
});

router.get("/appointments/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    res.status(400).json({ error: "bad_request", message: "Invalid id" });
    return;
  }

  const [appt] = await db
    .select({
      id: appointmentsTable.id,
      name: appointmentsTable.name,
      email: appointmentsTable.email,
      phone: appointmentsTable.phone,
      date: appointmentsTable.date,
      time: appointmentsTable.time,
      status: appointmentsTable.status,
      externalId: appointmentsTable.externalId,
      source: appointmentsTable.source,
      clinicId: appointmentsTable.clinicId,
      clinicName: clinicsTable.name,
      createdAt: appointmentsTable.createdAt,
    })
    .from(appointmentsTable)
    .leftJoin(clinicsTable, eq(appointmentsTable.clinicId, clinicsTable.id))
    .where(eq(appointmentsTable.id, id))
    .limit(1);

  if (!appt) {
    res.status(404).json({ error: "not_found", message: "Appointment not found" });
    return;
  }

  res.json(appt);
});

export default router;
