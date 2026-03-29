import type { VercelRequest, VercelResponse } from '@vercel/node'

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

  try {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_ANON_KEY
    if (!url || !key) {
      return res.status(500).json({ error: 'server_error', message: 'Missing database configuration' })
    }
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(url, key)

    const { data, error } = await supabase
      .from('appointments')
      .select('id, name, email, phone, date, time, status, external_id, source, created_at')
      .eq('id', id)
      .single()

    if (error || !data) {
      return res.status(404).json({ error: 'not_found', message: 'Appointment not found' })
    }

    return res.json({
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
  } catch (err: any) {
    return res.status(500).json({ error: 'server_error', message: err.message ?? 'Failed to connect to database' })
  }
}
