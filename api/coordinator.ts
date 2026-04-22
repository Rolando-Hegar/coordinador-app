import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initCoordinator, handleGet, handlePost } from './_coor_handler.js';

initCoordinator();

const rlMap = new Map<string, { count: number; resetAt: number }>();

function getIP(req: VercelRequest): string {
  const fwd = req.headers['x-forwarded-for'];
  return (typeof fwd === 'string' ? fwd.split(',')[0] : req.headers['x-real-ip'] as string) ?? 'unknown';
}

function allowRequest(ip: string): boolean {
  const now   = Date.now();
  const entry = rlMap.get(ip);
  if (!entry || now > entry.resetAt) { rlMap.set(ip, { count: 1, resetAt: now + 60_000 }); return true; }
  if (entry.count >= 30) return false;
  entry.count++;
  return true;
}

const ALLOWED_ORIGINS = [
  'https://coordinador-app.vercel.app',   // update once domain is known
  'https://servicio-app.vercel.app',
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin        = req.headers.origin ?? '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!allowRequest(getIP(req))) {
    return res.status(429).json({ message: 'Demasiadas solicitudes, intenta en un momento' });
  }

  try {
    let result: unknown;

    if (req.method === 'GET') {
      const params = new URLSearchParams(
        typeof req.url === 'string' ? req.url.split('?')[1] ?? '' : '',
      );
      result = await handleGet(params);
    } else if (req.method === 'POST') {
      result = await handlePost(req.body as Record<string, unknown>);
    } else {
      return res.status(405).json({ message: 'Método no permitido' });
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error('[coordinator]', err);
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    return res.status(status).json({ message: err instanceof Error ? err.message : 'Error interno' });
  }
}
