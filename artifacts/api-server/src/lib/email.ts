import { logger } from "./logger";

export interface AppointmentConfirmationEmail {
  to: string;
  name: string;
  date: string;
  time: string;
  clinicName?: string;
}

export async function sendAppointmentConfirmation(
  data: AppointmentConfirmationEmail
): Promise<void> {
  const subject = `Confirmação de Consulta - ${data.date} às ${data.time}`;

  const body = `
Olá ${data.name},

A sua consulta foi agendada com sucesso!

Data: ${data.date}
Hora: ${data.time}
${data.clinicName ? `Clínica: ${data.clinicName}` : ""}

Por favor, apareça 10 minutos antes da hora marcada.

Se precisar de cancelar ou remarcar, entre em contacto connosco com pelo menos 24 horas de antecedência.

Com os melhores cumprimentos,
Clínica Médica
  `.trim();

  if (process.env.RESEND_API_KEY) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "noreply@clinica.pt",
          to: data.to,
          subject,
          text: body,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        logger.error({ err }, "Failed to send email via Resend");
        return;
      }

      logger.info({ to: data.to }, "Confirmation email sent via Resend");
    } catch (err) {
      logger.error({ err }, "Error sending email via Resend");
    }
  } else {
    logger.info(
      {
        to: data.to,
        subject,
        body,
      },
      "Mock email: confirmation email (RESEND_API_KEY not set)"
    );
  }
}
