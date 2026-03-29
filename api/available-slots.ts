import type { VercelRequest, VercelResponse } from '@vercel/node'

const ALL_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
]

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

  const { date } = req.query

  if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'bad_request', message: 'date is required (YYYY-MM-DD)' })
  }

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

  const slots = ALL_SLOTS.map((time) => ({
    time,
    available: !bookedTimes.has(time),
  }))

  return res.json(slots)
}
