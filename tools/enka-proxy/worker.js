// Cloudflare Worker: inoltra le richieste del browser a Enka.network e ad Akasha (akasha.cv), aggiungendo
// l'intestazione CORS che permette a tools.html e a Juan-optimizer di leggere la risposta dal browser.
// Uso:
//   https://<nome>.<account>.workers.dev/<uid>                          vetrina di Enka
//   https://<nome>.<account>.workers.dev/akasha/builds/<uid>?page=<n>    build salvate su Akasha (100 per pagina)
//   https://<nome>.<account>.workers.dev/akasha/artifacts/<uid>/<md5>    i 5 manufatti di una build di Akasha
//   POST https://<nome>.<account>.workers.dev/feedback                    il pulsante Feedback di Juan-optimizer
// Le letture sono in sola lettura; l'unico POST è il feedback, che apre una issue su GitHub e manda il
// messaggio su Discord con le chiavi salvate come secret del Worker (vedi README.md).
const ALLOWED_ORIGINS = ['https://juan0177.github.io', 'http://localhost:8765'];
const USER_AGENT = 'JuanLab-calcolatore/1.0';
const AKASHA_USER_AGENT = 'JuanLab-Juan-optimizer/1.0 (import delle build salvate di un UID)';

export default {
  async fetch(request, env = {}) {
    const origin = request.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      Vary: 'Origin',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    const fail = (status, error) =>
      new Response(JSON.stringify({ error }), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

    const url = new URL(request.url);
    if (url.pathname.replace(/\/+$/, '') === '/feedback') {
      if (request.method !== 'POST') return fail(405, 'Metodo non permesso');
      return feedback(request, env, origin, fail, cors);
    }
    if (request.method !== 'GET') return new Response('Metodo non permesso', { status: 405, headers: cors });
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

// ---------------------------------------------------------------------------------------------------
// Feedback di Juan-optimizer: una issue pubblica su GitHub (tipo, messaggio, pagina, versione) e un
// messaggio su Discord con tutto (anche il contatto, gli screenshot e i dettagli, che restano privati).
// Secret del Worker: GITHUB_TOKEN (token fine-grained con Issues: Read and write sul solo repository) e
// DISCORD_WEBHOOK_URL (webhook del canale). Variabile facoltativa: GITHUB_REPO (Juan0177/Juan-optimizer).

const FEEDBACK_KINDS = { bug: 'Bug', idea: 'Idea', other: 'Altro' };
const FEEDBACK_COLORS = { bug: 0xe5484d, idea: 0xd4a94a, other: 0x8b8d98 };
const FEEDBACK_LABELS = { bug: 'bug', idea: 'enhancement', other: 'question' };
const MAX_BODY_BYTES = 12_000_000;
const MAX_MESSAGE = 4000;
const MAX_SHOTS = 3;
const MAX_SHOT_CHARS = 2_900_000;
const MAX_CONTEXT_CHARS = 60_000;
/** Invii accettati per indirizzo IP in un'ora */
const PER_HOUR = 5;

/** Un testo come lo ha scritto l'utente, accorciato, senza menzioni che notificano qualcuno */
const clean = (value, max) =>
  typeof value === 'string' ? value.replace(/\r\n?/g, '\n').trim().slice(0, max) : '';
const noPing = (text) => text.replace(/@/g, '@\u200b');

/** Al massimo PER_HOUR invii per IP all'ora (contati nella cache del Worker, per data center) */
async function overLimit(request) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const key = new Request(`https://juanlab-feedback.invalid/rate/${encodeURIComponent(ip)}`);
  const cache = caches.default;
  const hit = await cache.match(key);
  const count = hit ? Number(await hit.text()) || 0 : 0;
  if (count >= PER_HOUR) return true;
  await cache.put(key, new Response(String(count + 1), { headers: { 'Cache-Control': 'max-age=3600' } }));
  return false;
}

/** Un'immagine data:image/...;base64 come file (tipo e byte), se lo è */
function imageFile(dataUrl, index) {
  const match = /^data:image\/(webp|jpeg|png);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || '');
  if (!match || dataUrl.length > MAX_SHOT_CHARS) return undefined;
  const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
  const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
  return { name: `screenshot-${index + 1}.${ext}`, type: `image/${match[1]}`, bytes };
}

async function createIssue(env, data) {
  const repo = env.GITHUB_REPO || 'Juan0177/Juan-optimizer';
  const firstLine = data.message.split('\n')[0].slice(0, 70);
  const title = `[Feedback · ${FEEDBACK_KINDS[data.kind]}] ${firstLine}${data.message.length > firstLine.length ? '…' : ''}`;
  const extras = [
    data.shots ? `${data.shots} screenshot` : '',
    data.context ? 'i dettagli della pagina' : '',
  ].filter(Boolean);
  const body = [
    `**Tipo:** ${FEEDBACK_KINDS[data.kind]}`,
    data.page ? `**Pagina:** \`${data.page.replace(/`/g, '')}\`` : '',
    data.version ? `**Versione:** v${data.version}${data.build ? ` (build ${data.build})` : ''}` : '',
    '',
    '### Messaggio',
    '',
    noPing(data.message),
    '',
    '---',
    `_Inviato dal pulsante Feedback di Juan-optimizer${extras.length ? `; ${extras.join(' e ')} sono su Discord` : ''}._`,
  ]
    .filter((line, i, all) => line !== '' || (all[i - 1] ?? '') !== '')
    .join('\n');
  const post = (labels) =>
    fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'JuanLab-feedback/1.0',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, body, ...(labels && { labels }) }),
    });
  // (con le etichette feedback e bug/enhancement/question; senza, se non si possono mettere)
  let res = await post(['feedback', FEEDBACK_LABELS[data.kind]]);
  if (res.status === 422 || res.status === 403) res = await post(undefined);
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  return (await res.json()).html_url;
}

async function sendDiscord(env, data, issueUrl) {
  const fields = [
    data.page && { name: 'Pagina', value: `\`${data.page.replace(/`/g, '').slice(0, 200)}\``, inline: true },
    data.version && { name: 'Versione', value: `v${data.version}${data.build ? ` (${data.build})` : ''}`, inline: true },
    data.contact && { name: 'Contatto', value: noPing(data.contact) },
    issueUrl ? { name: 'Issue', value: issueUrl } : { name: 'Issue', value: 'non creata (GitHub non ha risposto)' },
  ].filter(Boolean);
  const files = [...data.images];
  if (data.context)
    files.push({
      name: 'dettagli.json',
      type: 'application/json',
      bytes: new TextEncoder().encode(JSON.stringify(data.context, null, 2)),
    });
  const payload = {
    username: 'Juan-optimizer · Feedback',
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title: `${FEEDBACK_KINDS[data.kind]}: ${data.message.split('\n')[0].slice(0, 200)}`,
        ...(issueUrl && { url: issueUrl }),
        description: data.message.slice(0, 4000),
        color: FEEDBACK_COLORS[data.kind],
        fields,
        footer: { text: data.site || 'Juan-optimizer' },
        timestamp: new Date().toISOString(),
        ...(data.images[0] && { image: { url: `attachment://${data.images[0].name}` } }),
      },
    ],
    attachments: files.map((f, id) => ({ id, filename: f.name })),
  };
  const form = new FormData();
  form.append('payload_json', JSON.stringify(payload));
  files.forEach((f, i) => form.append(`files[${i}]`, new Blob([f.bytes], { type: f.type }), f.name));
  const res = await fetch(`${env.DISCORD_WEBHOOK_URL}?wait=true`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`Discord ${res.status}`);
}

async function feedback(request, env, origin, fail, cors) {
  if (!ALLOWED_ORIGINS.includes(origin)) return fail(403, 'Origine non permessa');
  if (!env.GITHUB_TOKEN && !env.DISCORD_WEBHOOK_URL) return fail(503, 'Feedback non configurato');
  if (Number(request.headers.get('Content-Length') || 0) > MAX_BODY_BYTES) return fail(413, 'Messaggio troppo grande');
  let body;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return fail(413, 'Messaggio troppo grande');
    body = JSON.parse(text);
  } catch {
    return fail(400, 'Richiesta non valida');
  }
  const ok = (extra = {}) =>
    new Response(JSON.stringify({ ok: true, ...extra }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  // (il campo nascosto lo compilano solo i bot: risposta normale, niente inviato)
  if (body.website) return ok();
  const kind = Object.hasOwn(FEEDBACK_KINDS, body.kind) ? body.kind : 'other';
  const message = clean(body.message, MAX_MESSAGE);
  if (message.length < 3) return fail(400, 'Messaggio troppo corto');
  const images = (Array.isArray(body.images) ? body.images : [])
    .slice(0, MAX_SHOTS)
    .map(imageFile)
    .filter(Boolean);
  let context;
  if (body.context && typeof body.context === 'object') {
    const json = JSON.stringify(body.context);
    context = json.length <= MAX_CONTEXT_CHARS ? body.context : { leftOut: ['too large'] };
  }
  if (await overLimit(request)) return fail(429, 'Troppi invii, riprova tra un\'ora');
  const data = {
    kind,
    message,
    contact: clean(body.contact, 100),
    page: clean(body.page, 300),
    version: clean(body.version, 40),
    build: clean(body.build, 60),
    site: clean(body.site, 100),
    images,
    shots: images.length,
    context,
  };
  let issueUrl;
  let issueError;
  if (env.GITHUB_TOKEN)
    try {
      issueUrl = await createIssue(env, data);
    } catch (e) {
      issueError = String(e?.message || e);
    }
  let discordError;
  if (env.DISCORD_WEBHOOK_URL)
    try {
      await sendDiscord(env, data, issueUrl);
    } catch (e) {
      discordError = String(e?.message || e);
    }
  const delivered = (env.GITHUB_TOKEN && !issueError) || (env.DISCORD_WEBHOOK_URL && !discordError);
  if (!delivered) return fail(502, `Invio non riuscito (${[issueError, discordError].filter(Boolean).join(', ')})`);
  return ok({ issue: issueUrl });
}
