# Dentakay Aufgaben (To-do)

Team-Aufgaben: Managerin weist zu, Agents sehen ihre Aufgaben und können eigene hinzufügen.
Next.js + Upstash Redis, für Vercel.

## Einrichtung (einmalig)

1. **Upstash Redis** erstellen (kostenlos): https://console.upstash.com → "Create Database" → Region wählen.
   Dann bei der Datenbank unter **REST API** kopieren: `UPSTASH_REDIS_REST_URL` und `UPSTASH_REDIS_REST_TOKEN`.

2. **Konten & Passwörter** eintragen in `lib/accounts.ts` (echte Namen, starke Passwörter).

3. **Lokal testen:**
   ```
   npm install
   cp .env.example .env.local   # und die zwei Upstash-Werte eintragen
   npm run dev
   ```
   Öffnen: http://localhost:3000

## Auf Vercel deployen

1. Projekt zu GitHub pushen.
2. Auf https://vercel.com → "New Project" → das Repo wählen.
3. Unter **Environment Variables** hinzufügen:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. Deploy.

## Wie es funktioniert
- Login pro Konto (Session als httpOnly-Cookie, in Redis gespeichert).
- Rechteprüfung passiert **auf dem Server**: Agent kann nur eigene Aufgaben, Managerin sieht/verwaltet alle.
- Aufgaben liegen in Redis und sind auf allen Geräten gleich.
- Beim ersten Start werden ein paar Demo-Aufgaben angelegt (in Redis-Key `dentakay:seeded`). Zum Zurücksetzen die Keys `dentakay:*` in Upstash löschen.
