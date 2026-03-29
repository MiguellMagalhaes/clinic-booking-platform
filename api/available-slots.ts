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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'method_not_allowed', message: 'Method not allowed' })
  }

  const { date, duration, startHour: startHourParam, endHour: endHourParam } = req.query

  if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'bad_request', message: 'date is required (YYYY-MM-DD)' })
  }

  // Duration of the appointment in minutes (default 30)
  const durationMin = duration && typeof duration === 'string' ? Math.max(15, Math.min(120, parseInt(duration, 10) || 30)) : 30

  // Optional time-range filtering per consultation type
  const rangeStart = startHourParam && typeof startHourParam === 'string' ? Math.max(0, Math.min(24, parseInt(startHourParam, 10) || 8)) : 8
  const rangeEnd = endHourParam && typeof endHourParam === 'string' ? Math.max(0, Math.min(24, parseInt(endHourParam, 10) || 20)) : 20

  // Parse the date parts to avoid timezone issues (no new Date(string))
  const [year, month, day] = date.split('-').map(Number)
  const dateObj = new Date(year, month - 1, day)
  const dayOfWeek = dateObj.getDay() // 0 = Sunday, 6 = Saturday

  // Weekends — no slots
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return res.json([])
  }

  // Past dates — no slots
  const now = new Date()
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (dateObj < todayMidnight) {
    return res.json([])
  }

  // Query Supabase for already-booked times (optional — MVP works without it)
  let bookedTimes = new Set<string>()
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_ANON_KEY
    if (url && key) {
      const supabase = createClient(url, key)
      const { data: booked, error } = await supabase
        .from('appointments')
        .select('time')
        .eq('date', date)
      if (!error && booked) {
        bookedTimes = new Set(booked.map((b: { time: string }) => b.time))
      }
    }
  } catch {
    // Supabase unavailable — all slots shown as available (MVP fallback)
  }

  // Filter slots to the requested time range, then check availability
  const rangeStartMin = rangeStart * 60
  const rangeEndMin = rangeEnd * 60

  const slots = ALL_SLOTS
    .filter((time) => {
      const [hh, mm] = time.split(':').map(Number)
      const m = hh * 60 + mm
      return m >= rangeStartMin && m < rangeEndMin
    })
    .map((time) => {
    // Check if the appointment would fit: none of its 30-min blocks should be booked
    // and it must not exceed the end of the available range
    const [hh, mm] = time.split(':').map(Number)
    const startMin = hh * 60 + mm
    const endMin = startMin + durationMin
    if (endMin > rangeEndMin) return { time, available: false }

    // Check each 30-min block within the duration
    let blocked = false
    for (let m = startMin; m < endMin; m += 30) {
      const bh = String(Math.floor(m / 60)).padStart(2, '0')
      const bm = String(m % 60).padStart(2, '0')
      if (bookedTimes.has(`${bh}:${bm}`)) {
        blocked = true
        break
      }
    }
    return { time, available: !blocked }
  })

  return res.json(slots)
}
