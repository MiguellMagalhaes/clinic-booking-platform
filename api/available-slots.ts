import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from '../lib/supabase'

const ALL_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
]

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.status(405).json({ error: 'method_not_allowed', message: 'Method not allowed' })
    return
  }

  const { date } = req.query

  if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: 'bad_request', message: 'date is required (YYYY-MM-DD)' })
    return
  }

  // Parse the date and check if it's a weekend or in the past
  const [year, month, day] = date.split('-').map(Number)
  const dateObj = new Date(year, month - 1, day)
  const dayOfWeek = dateObj.getDay() // 0 = Sunday, 6 = Saturday

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    res.json([]) // No slots on weekends
    return
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (dateObj < today) {
    res.json([]) // No slots for past dates
    return
  }

  // Query booked appointments for this date
  let bookedTimes = new Set<string>()
  try {
    const { data: booked, error } = await supabase
      .from('appointments')
      .select('time')
      .eq('date', date)

    if (!error && booked) {
      bookedTimes = new Set(booked.map((b) => b.time))
    }
  } catch {
    // If Supabase is unreachable, show all slots as available (MVP fallback)
  }

  const slots = ALL_SLOTS.map((time) => ({
    time,
    available: !bookedTimes.has(time),
  }))

  res.json(slots)
}
