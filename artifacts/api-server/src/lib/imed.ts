import { logger } from "./logger";

export interface ImedAppointment {
  external_id: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  date: string;
  time: string;
  status: string;
  source: string;
}

export async function fetchAppointmentsFromIMED(): Promise<ImedAppointment[]> {
  logger.info("Fetching appointments from IMED (mock)");

  await new Promise((resolve) => setTimeout(resolve, 100));

  return [
    {
      external_id: "IMED-001",
      patient_name: "Maria Silva",
      patient_email: "maria.silva@example.com",
      patient_phone: "+351912345678",
      date: new Date().toISOString().split("T")[0],
      time: "09:00",
      status: "confirmed",
      source: "imed",
    },
    {
      external_id: "IMED-002",
      patient_name: "João Santos",
      patient_email: "joao.santos@example.com",
      patient_phone: "+351923456789",
      date: new Date().toISOString().split("T")[0],
      time: "10:30",
      status: "confirmed",
      source: "imed",
    },
  ];
}

export async function createAppointmentInIMED(appointment: {
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
}): Promise<{ external_id: string; status: string }> {
  logger.info({ appointment }, "Creating appointment in IMED (mock)");

  await new Promise((resolve) => setTimeout(resolve, 100));

  const external_id = `IMED-${Date.now()}`;

  return {
    external_id,
    status: "confirmed",
  };
}
