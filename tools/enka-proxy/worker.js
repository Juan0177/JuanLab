// Cloudflare Worker: inoltra a Enka.network la richiesta della vetrina di un UID,
// aggiungendo l'intestazione CORS che permette a tools.html di leggerla dal browser.
// Uso: https://<nome>.<account>.workers.dev/<uid>
const ALLOWED_ORIGINS = ['https://juan0177.github.io', 'http://localhost:8765'];

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      Vary: 'Origin',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'GET') return new Response('Metodo non permesso', { status: 405, headers: cors });

    const uid = new URL(request.url).pathname.replace(/\//g, '');
    if (!/^\d{9,10}$/.test(uid)) {
      return new Response(JSON.stringify({ error: 'UID non valido' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    // Enka chiede un User-Agent che identifichi l'applicazione
    const res = await fetch(`https://enka.network/api/uid/${uid}/`, {
      headers: { 'User-Agent': 'JuanLab-calcolatore/1.0' },
      cf: { cacheTtl: 60, cacheEverything: true },
    });
    return new Response(res.body, {
      status: res.status,
      headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=60' },
    });
  },
};
