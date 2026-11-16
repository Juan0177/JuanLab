# Proxy per la ricerca per UID (Cloudflare Worker)

Enka.network non permette richieste dirette dal browser di altri siti (niente intestazione CORS), quindi `tools.html` non può leggere da solo la vetrina di un UID qualsiasi. Questo Worker fa da tramite: riceve l'UID, chiede la vetrina a Enka e la restituisce con l'intestazione CORS.

Senza il Worker la ricerca funziona solo per gli UID salvati in `assets/data/showcase/<uid>.json`.

## Come pubblicarlo (gratis)

1. Accedi a [dash.cloudflare.com](https://dash.cloudflare.com) (serve un account Cloudflare, il piano gratuito basta).
2. **Workers & Pages** → **Create** → **Create Worker** → dai un nome, per esempio `juanlab-enka`, e conferma.
3. **Edit code**: sostituisci tutto il codice con il contenuto di `worker.js` e premi **Deploy**.
4. Copia l'indirizzo del Worker, per esempio `https://juanlab-enka.<account>.workers.dev`.
5. In `tools.html`, nel modulo `<form ... id="quick-calc" ...>`, imposta l'attributo:

   ```html
   data-enka-proxy="https://juanlab-enka.<account>.workers.dev/{uid}"
   ```

   `{uid}` viene sostituito con l'UID cercato.

## Note

- Il Worker accetta solo richieste da `https://juan0177.github.io` (e da `localhost:8765` per le prove): se il sito cambia indirizzo, aggiorna `ALLOWED_ORIGINS`.
- Enka chiede di non fare troppe richieste: il Worker tiene in cache ogni vetrina per 60 secondi.
- Il piano gratuito di Cloudflare permette 100.000 richieste al giorno.
