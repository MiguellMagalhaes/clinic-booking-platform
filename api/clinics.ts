import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from '../lib/supabase'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    return listClinics(res)
  }

  res.setHeader('Allow', 'GET')
  res.status(405).json({ error: 'method_not_allowed', message: 'Method not allowed' })
}

async function listClinics(res: VercelResponse) {
  const { data, error } = await supabase
    .from('clinics')
    .select('id, name')

  if (error) {
    res.status(500).json({ error: 'server_error', message: error.message })
    return
  }

  res.json(data)
}
