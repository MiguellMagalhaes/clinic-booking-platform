import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from '../../lib/supabase'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.status(405).json({ error: 'method_not_allowed', message: 'Method not allowed' })
    return
  }

  const { id } = req.query

  if (!id || typeof id !== 'string') {
    res.status(400).json({ error: 'bad_request', message: 'Invalid id' })
    return
  }

  const { data, error } = await supabase
    .from('appointments')
    .select('id, name, email, phone, date, time, status, external_id, source, created_at')
    .eq('id', id)
    .single()

  if (error || !data) {
    res.status(404).json({ error: 'not_found', message: 'Appointment not found' })
    return
  }

  res.json({
    id: data.id,
    name: data.name,
    email: data.email,
    phone: data.phone,
    date: data.date,
    time: data.time,
    status: data.status,
    externalId: data.external_id,
    source: data.source,
    createdAt: data.created_at,
  })
}
