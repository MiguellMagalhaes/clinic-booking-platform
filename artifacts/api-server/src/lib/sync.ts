import { db } from "@workspace/db";
import { appointmentsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { fetchAppointmentsFromIMED } from "./imed";
import { logger } from "./logger";

export async function syncIMEDAppointments(): Promise<{
  synced: number;
  skipped: number;
  errors: number;
}> {
  logger.info("Starting IMED sync...");
  let synced = 0;
  let skipped = 0;
  let errors = 0;

  try {
    const imedAppointments = await fetchAppointmentsFromIMED();

    for (const appt of imedAppointments) {
      try {
        const existing = await db
          .select()
          .from(appointmentsTable)
          .where(eq(appointmentsTable.externalId, appt.external_id))
          .limit(1);

        if (existing.length > 0) {
          logger.info({ external_id: appt.external_id }, "Appointment already exists, skipping");
          skipped++;
          continue;
        }

        await db.insert(appointmentsTable).values({
          name: appt.patient_name,
          email: appt.patient_email,
          phone: appt.patient_phone,
          date: appt.date,
          time: appt.time,
          status: "synced",
          externalId: appt.external_id,
          source: appt.source,
        });

        logger.info({ external_id: appt.external_id }, "Synced appointment from IMED");
        synced++;
      } catch (err) {
        logger.error({ err, external_id: appt.external_id }, "Error syncing appointment");
        errors++;
      }
    }
  } catch (err) {
    logger.error({ err }, "Error fetching appointments from IMED");
    errors++;
  }

  logger.info({ synced, skipped, errors }, "IMED sync complete");
  return { synced, skipped, errors };
}

export function startSyncCron(): void {
  const INTERVAL_MS = 15 * 60 * 1000;

  logger.info({ intervalMinutes: 15 }, "Starting IMED sync cron job");

  syncIMEDAppointments().catch((err) => {
    logger.error({ err }, "Initial IMED sync failed");
  });

  setInterval(() => {
    syncIMEDAppointments().catch((err) => {
      logger.error({ err }, "IMED sync cron failed");
    });
  }, INTERVAL_MS);
}
