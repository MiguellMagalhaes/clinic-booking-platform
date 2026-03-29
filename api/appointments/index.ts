import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from '../../lib/supabase'

const ALL_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '14:00', '14:30', '15:00',
  '15:30', '16:00', '16:30', '17:00', '17:30',
]

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    return listAppointments(req, res)
  }
  if (req.method === 'POST') {
    return createAppointment(req, res)
  }

  res.setHeader('Allow', 'GET, POST')
  res.status(405).json({ error: 'method_not_allowed', message: 'Method not allowed' })
}

async function listAppointments(req: VercelRequest, res: VercelResponse) {
  const { status } = req.query

  let query = supabase
    .from('appointments')
    .select('id, name, email, phone, date, time, status, external_id, source, created_at')
    .order('created_at', { ascending: false })

  if (status && typeof status === 'string') {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    res.status(500).json({ error: 'server_error', message: error.message })
    return
  }

  // Transform snake_case → camelCase to match the existing frontend API contract
  const mapped = (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    date: row.date,
    time: row.time,
    status: row.status,
    externalId: row.external_id,
    source: row.source,
    createdAt: row.created_at,
  }))

  res.json(mapped)
}

async function createAppointment(req: VercelRequest, res: VercelResponse) {
  const body = req.body

  // Validation
  if (!body.name || typeof body.name !== 'string' || body.name.length < 2) {
    res.status(400).json({ error: 'validation_error', message: 'name is required (min 2 chars)' })
    return
  }
  if (!body.email || typeof body.email !== 'string' || !body.email.includes('@')) {
    res.status(400).json({ error: 'validation_error', message: 'valid email is required' })
    return
  }
  if (!body.phone || typeof body.phone !== 'string' || body.phone.length < 6) {
    res.status(400).json({ error: 'validation_error', message: 'phone is required (min 6 chars)' })
    return
  }
  if (!body.date || typeof body.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    res.status(400).json({ error: 'validation_error', message: 'date is required (YYYY-MM-DD)' })
    return
  }
  if (!body.time || typeof body.time !== 'string' || !ALL_SLOTS.includes(body.time)) {
    res.status(400).json({ error: 'validation_error', message: `time must be one of: ${ALL_SLOTS.join(', ')}` })
    return
  }

  // Check for existing booking in the same slot (date + time must be unique)
  const { data: existing, error: conflictError } = await supabase
    .from('appointments')
    .select('id')
    .eq('date', body.date)
    .eq('time', body.time)
    .limit(1)

  if (conflictError) {
    res.status(500).json({ error: 'server_error', message: conflictError.message })
    return
  }

  if (existing && existing.length > 0) {
    res.status(409).json({ error: 'slot_taken', message: 'This time slot is already booked' })
    return
  }

  // Insert appointment
  const { data: created, error: insertError } = await supabase
    .from('appointments')
    .insert([{
      name: body.name,
      email: body.email,
      phone: body.phone,
      date: body.date,
      time: body.time,
      status: 'confirmed',
      source: 'web',
    }])
    .select('id, name, email, phone, date, time, status, external_id, source, created_at')
    .single()

  if (insertError) {
    res.status(500).json({ error: 'server_error', message: insertError.message })
    return
  }

  // Send confirmation email (fire-and-forget)
  if (process.env.RESEND_API_KEY) {
    sendConfirmationEmail({
      to: body.email,
      name: body.name,
      date: body.date,
      time: body.time,
    }).catch((err) => console.error('Failed to send email:', err))
  }

  // Transform to camelCase
  res.status(201).json({
    id: created.id,
    name: created.name,
    email: created.email,
    phone: created.phone,
    date: created.date,
    time: created.time,
    status: created.status,
    externalId: created.external_id,
    source: created.source,
    createdAt: created.created_at,
  })
}

async function sendConfirmationEmail(data: {
  to: string
  name: string
  date: string
  time: string
}) {
  const subject = `Confirmação de Consulta - ${data.date} às ${data.time}`
  const body = `Olá ${data.name},

A sua consulta foi agendada com sucesso!

Data: ${data.date}
Hora: ${data.time}

Por favor, apareça 10 minutos antes da hora marcada.

Com os melhores cumprimentos,
Clínica Médica`

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'noreply@clinica.pt',
      to: data.to,
      subject,
      text: body,
    }),
  })
}
