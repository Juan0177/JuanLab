# Proxy per la ricerca per UID e feedback (Cloudflare Worker)

Enka.network non permette richieste dirette dal browser di altri siti (niente intestazione CORS), quindi `tools.html` non può leggere da solo la vetrina di un UID qualsiasi. Questo Worker fa da tramite: riceve l'UID, chiede la vetrina a Enka e la restituisce con l'intestazione CORS.

Senza il Worker la ricerca funziona solo per gli UID salvati in `assets/data/showcase/<uid>.json`.

## Akasha

Lo stesso Worker serve anche l'import da [Akasha](https://akasha.cv/) di Juan-optimizer e del calcolatore di `tools.html` (fonte "Akasha": tutte le build salvate di un UID, più build per personaggio). Due percorsi in sola lettura:

- `/akasha/builds/<uid>?page=<n>`: le build salvate (`akasha.cv/api/builds/?uid=`, 100 per pagina, al massimo 20 pagine);
- `/akasha/artifacts/<uid>/<md5>`: i 5 manufatti di una build (`akasha.cv/api/artifacts/<uid>/<md5>`).

Le risposte restano in cache 5 minuti. Se Akasha risponde con una pagina invece che con dei dati (per esempio la verifica anti-bot di Cloudflare), il Worker restituisce 502 e Juan-optimizer e `tools.html` lo spiegano. Dopo aver cambiato `worker.js` va ripubblicato (punto 3 qui sotto).

## Feedback di Juan-optimizer (issue su GitHub e messaggio su Discord)

Il pulsante **Feedback** di Juan-optimizer manda i messaggi a `POST /feedback` di questo Worker, che:

- apre una **issue pubblica** su `Juan0177/Juan-optimizer` con tipo (Bug, Idea, Altro), messaggio, pagina e versione, etichette `feedback` e `bug`/`enhancement`/`question`;
- manda un **messaggio su Discord** con tutto: anche il nome Discord di chi scrive, fino a 3 screenshot e, se spuntati, i dettagli della pagina e della squadra (`dettagli.json`). Questi restano privati: nella issue non ci sono.

Protezioni: accetta solo richieste da `ALLOWED_ORIGINS`, al massimo 5 invii all'ora per indirizzo IP, un campo nascosto che compilano solo i bot, messaggi fino a 4000 caratteri; le menzioni (`@everyone`, `@nome`) non avvisano nessuno.

### Configurarlo (una volta)

1. **Webhook di Discord**: nel server, impostazioni del canale dove vuoi i feedback → **Integrazioni** → **Webhook** → **Nuovo webhook** → **Copia URL del webhook**.
2. **Token di GitHub**: [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new) (fine-grained) → *Repository access*: **Only select repositories** → `Juan0177/Juan-optimizer` → *Permissions* → *Repository permissions* → **Issues: Read and write** → genera e copia il token. Alla scadenza ne va fatto uno nuovo e rimesso al punto 3.
3. Su Cloudflare: Worker `juanlab-enka` → **Settings** → **Variables and Secrets** → **Add**, tipo **Secret**:
   - `DISCORD_WEBHOOK_URL` = l'URL del webhook;
   - `GITHUB_TOKEN` = il token.

   (Facoltativa, tipo Text: `GITHUB_REPO` se le issue devono andare in un altro repository.)
4. **Edit code**: incolla il nuovo `worker.js` e premi **Deploy**.

Con uno solo dei due secret il feedback va solo lì (solo Discord, o solo la issue). Senza nessuno dei due il Worker risponde 503 e il sito dice che l'invio non è riuscito. Le chiavi non vanno mai messe nel codice né nel repository: solo come secret su Cloudflare.

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
