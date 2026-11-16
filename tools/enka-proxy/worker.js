// Cloudflare Worker: inoltra le richieste del browser a Enka.network e ad Akasha (akasha.cv), aggiungendo
// l'intestazione CORS che permette a tools.html e a Juan-optimizer di leggere la risposta dal browser.
// Uso:
//   https://<nome>.<account>.workers.dev/<uid>                          vetrina di Enka
//   https://<nome>.<account>.workers.dev/akasha/builds/<uid>?page=<n>    build salvate su Akasha (100 per pagina)
//   https://<nome>.<account>.workers.dev/akasha/artifacts/<uid>/<md5>    i 5 manufatti di una build di Akasha
// Solo lettura: nessuna altra richiesta passa.
const ALLOWED_ORIGINS = ['https://juan0177.github.io', 'http://localhost:8765'];
const USER_AGENT = 'JuanLab-calcolatore/1.0';
const AKASHA_USER_AGENT = 'JuanLab-Juan-optimizer/1.0 (import delle build salvate di un UID)';

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
    const fail = (status, error) =>
      new Response(JSON.stringify({ error }), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);
    let target;
    let userAgent = USER_AGENT;
    let ttl = 60;
    if (parts[0] === 'akasha') {
      const uid = parts[2] || '';
      if (!/^\d{9,10}$/.test(uid)) return fail(400, 'UID non valido');
      userAgent = AKASHA_USER_AGENT;
      ttl = 300; // Akasha cambia solo quando il giocatore aggiorna il profilo
      if (parts[1] === 'builds' && parts.length === 3) {
        const page = Number(url.searchParams.get('page') || '1');
        if (!Number.isInteger(page) || page < 1 || page > 20) return fail(400, 'Pagina non valida');
        target = `https://akasha.cv/api/builds/?sort=lastBuildUpdate&order=-1&size=100&page=${page}&uid=${uid}`;
      } else if (parts[1] === 'artifacts' && parts.length === 4 && /^[a-f0-9]{32}$/.test(parts[3])) {
        target = `https://akasha.cv/api/artifacts/${uid}/${parts[3]}`;
      } else return fail(404, 'Percorso sconosciuto');
    } else {
      const uid = parts.join('');
      if (parts.length !== 1 || !/^\d{9,10}$/.test(uid)) return fail(400, 'UID non valido');
      // Enka chiede un User-Agent che identifichi l'applicazione
      target = `https://enka.network/api/uid/${uid}/`;
    }

    const res = await fetch(target, {
      headers: { 'User-Agent': userAgent, Accept: 'application/json' },
      cf: { cacheTtl: ttl, cacheEverything: true },
    });
    // Da Akasha una pagina HTML (per esempio la verifica anti-bot di Cloudflare) non e una risposta: la si segnala.
    // Per Enka si passa lo stato cosi com'e (404, 424 manutenzione, 429…), che il sito spiega all'utente.
    const type = res.headers.get('Content-Type') || '';
    if (userAgent === AKASHA_USER_AGENT && !type.includes('json')) return fail(502, `Akasha non ha risposto con dei dati (${res.status})`);
    return new Response(res.body, {
      status: res.status,
      headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': `public, max-age=${ttl}` },
    });
  },
};
