import type { VercelRequest, VercelResponse } from '@vercel/node'

function generateSlots(startHour: number, endHour: number, intervalMin: number): string[] {
  const slots: string[] = []
  for (let m = startHour * 60; m <= endHour * 60; m += intervalMin) {
    const hh = String(Math.floor(m / 60)).padStart(2, '0')
    const mm = String(m % 60).padStart(2, '0')
    slots.push(`${hh}:${mm}`)
  }
  return slots
}

const ALL_SLOTS = generateSlots(8, 20, 30)

async function getSupabase(): Promise<any> {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY
  if (!url || !key) return null
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(url, key)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method === 'GET') {
    return listAppointments(req, res)
  }
  if (req.method === 'POST') {
    return createAppointment(req, res)
  }

  res.setHeader('Allow', 'GET, POST, OPTIONS')
  return res.status(405).json({ error: 'method_not_allowed', message: 'Method not allowed' })
}

async function listAppointments(req: VercelRequest, res: VercelResponse) {
  const { status } = req.query

  try {
    const supabase = await getSupabase()
    if (!supabase) {
      return res.status(500).json({ error: 'server_error', message: 'Missing database configuration' })
    }

    let query = supabase
      .from('appointments')
      .select('id, name, email, phone, date, time, status, external_id, source, consultation_type, duration_minutes, created_at')
      .order('created_at', { ascending: false })

    if (status && typeof status === 'string') {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      return res.status(500).json({ error: 'server_error', message: error.message })
    }

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
      consultationType: row.consultation_type,
      durationMinutes: row.duration_minutes,
      createdAt: row.created_at,
    }))

    return res.json(mapped)
  } catch (err: any) {
    return res.status(500).json({ error: 'server_error', message: err.message ?? 'Failed to connect to database' })
  }
}

async function createAppointment(req: VercelRequest, res: VercelResponse) {
  const body = req.body

  // Validation
  if (!body.name || typeof body.name !== 'string' || body.name.length < 2) {
    return res.status(400).json({ error: 'validation_error', message: 'name is required (min 2 chars)' })
  }
  if (!body.email || typeof body.email !== 'string' || !body.email.includes('@')) {
    return res.status(400).json({ error: 'validation_error', message: 'valid email is required' })
  }
  if (!body.phone || typeof body.phone !== 'string' || body.phone.length < 6) {
    return res.status(400).json({ error: 'validation_error', message: 'phone is required (min 6 chars)' })
  }
  if (!body.date || typeof body.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    return res.status(400).json({ error: 'validation_error', message: 'date is required (YYYY-MM-DD)' })
  }
  if (!body.time || typeof body.time !== 'string' || !ALL_SLOTS.includes(body.time)) {
    return res.status(400).json({ error: 'validation_error', message: `time must be one of: ${ALL_SLOTS.join(', ')}` })
  }

  // Check for existing booking in the same slot (date + time must be unique)
  try {
    const supabase = await getSupabase()
    if (!supabase) {
      return res.status(500).json({ error: 'server_error', message: 'Missing database configuration' })
    }

    const { data: existing, error: conflictError } = await supabase
      .from('appointments')
      .select('id')
      .eq('date', body.date)
      .eq('time', body.time)
      .limit(1)

    if (conflictError) {
      return res.status(500).json({ error: 'server_error', message: conflictError.message })
    }

    if (existing && existing.length > 0) {
      return res.status(409).json({ error: 'slot_taken', message: 'This time slot is already booked' })
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
        ...(body.consultationType ? { consultation_type: body.consultationType } : {}),
        ...(body.durationMinutes ? { duration_minutes: body.durationMinutes } : {}),
      }])
      .select('id, name, email, phone, date, time, status, external_id, source, consultation_type, duration_minutes, created_at')
      .single()

    if (insertError) {
      return res.status(500).json({ error: 'server_error', message: insertError.message })
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
    return res.status(201).json({
      id: created.id,
      name: created.name,
      email: created.email,
      phone: created.phone,
      date: created.date,
      time: created.time,
      status: created.status,
      externalId: created.external_id,
      source: created.source,
      consultationType: created.consultation_type,
      durationMinutes: created.duration_minutes,
      createdAt: created.created_at,
    })
  } catch (err: any) {
    return res.status(500).json({ error: 'server_error', message: err.message ?? 'Failed to connect to database' })
  }
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
