import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from '../lib/supabase'

const ALL_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '14:00', '14:30', '15:00',
  '15:30', '16:00', '16:30', '17:00', '17:30',
]

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.status(405).json({ error: 'method_not_allowed', message: 'Method not allowed' })
    return
  }

  const { date } = req.query

  if (!date || typeof date !== 'string') {
    res.status(400).json({ error: 'bad_request', message: 'date is required' })
    return
  }

  const { data: booked, error } = await supabase
    .from('appointments')
    .select('time')
    .eq('date', date)

  if (error) {
    res.status(500).json({ error: 'server_error', message: error.message })
    return
  }

  const bookedTimes = new Set((booked ?? []).map((b) => b.time))

  const slots = ALL_SLOTS.map((time) => ({
    time,
    available: !bookedTimes.has(time),
  }))

  res.json(slots)
}
