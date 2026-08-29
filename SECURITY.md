VERDICT: CHANGES_REQUESTED

## Sicherheitsbericht

### Scanner-Hinweis
Die statischen Analysen `bandit` und `semgrep` wurden nicht ausgeführt (`[skipped]`). Auch `pip-audit` / `npm audit` wurden nicht geliefert. Die Abhängigkeiten (`backend/requirements.txt`, `frontend/package.json`, `frontend/package-lock.json`) konnten daher nicht auf bekannte CVEs geprüft werden. Dies ist eine Prüflücke, aber kein eigenständiger Befund. Vor Auslieferung sollten `pip-audit` und `npm audit` laufen.

### Befunde

#### 1. Mittel – Prozesslokales Rate-Limiting ist bei mehreren Workern umgehbar und zählt auch erfolgreiche Logins
- **Betroffene Stellen:** `backend/app/rate_limit.py`, `backend/app/routers/auth.py`
- **Beschreibung:** Der `RateLimiter` wird als Modulglobale Instanz gehalten. Bei mehreren Uvicorn-Workern hat jeder Prozess eigene Zähler; ein Angreifer kann durch parallele Requests auf verschiedene Worker die 5-Versuche-Grenze pro Client umgehen. Zusätzlich ruft die Login-Route `is_allowed` vor der Passwortprüfung auf, sodass auch erfolgreiche Logins den Zähler erhöhen und legitime Nutzer nach fünf erfolgreichen Logins innerhalb einer Minute ausgesperrt werden. Hinter einem Proxy ohne `--proxy-headers` sehen zudem alle Clients nach derselben IP aus, was einen gezielten Lockout ermöglicht.
- **Fix:**
  - `RateLimiter` so umbauen, dass zwischen „ist blockiert“ und „Fehlversuch erfassen“ getrennt wird (z. B. `is_blocked()` und `record_failure()`).
  - Im Login-Endpunkt vorab nur `is_blocked()` prüfen; einen Fehlversuch erst nach fehlgeschlagener Passwortprüfung erfassen. Erfolgreiche Logins nicht als Fehlversuch zählen.
  - Für Produktionsbetrieb mit mehreren Workern einen geteilten Store (z. B. Redis) verwenden. `X-Forwarded-For` nur hinter einem ausdrücklich vertrauenswürdigen Proxy auswerten.

#### 2. Mittel – Fehlendes `SECRET_KEY` erzeugt pro Prozess einen anderen zufälligen Schlüssel
- **Betroffene Stelle:** `backend/app/config.py`
- **Beschreibung:** `self.secret_key = os.environ.get("SECRET_KEY") or secrets.token_hex(32)`. In Produktion mit mehreren Uvicorn-Workern oder nach einem Neustart werden damit alle ausgestellten JWTs invalid bzw. von anderen Workern abgelehnt. Das ist vor allem ein Verfügbarkeits- und Berechenbarkeitsproblem; es verhindert außerdem einen klaren Fehlstart bei Fehlkonfiguration.
- **Fix:** `Settings.validate()` bei Produktionsumgebung (`ENV=production` o. Ä.) erweitern: Wenn `SECRET_KEY` nicht gesetzt oder zu kurz ist, Exception werfen und Start verweigern. In der Entwicklung kann der zufällige Fallback erhalten bleiben. Secret aus Secret-Management/Umgebung laden, niemals aus dem Repository.

#### 3. Mittel – Bild-Upload validiert nur den Client-`Content-Type`, nicht den tatsächlichen Dateiinhalt
- **Betroffene Stelle:** `backend/app/storage.py`, Funktion `save_image`
- **Beschreibung:** Die Dateiendung wird ausschließlich anhand des vom Client gelieferten `Content-Type`-Headers gewählt. Der Dateiinhalt selbst wird nicht geprüft. Ein Angreifer kann beliebige Inhalte (z. B. HTML, JavaScript, exotische Binärformate) mit einem erlaubten `Content-Type` hochladen und unter einer `.jpg`/`.png`/`.webp`-Adresse abrufen. Aktuell wird die Datei mit `image/*` ausgeliefert, was das Risiko mindert, aber eine echte Bildvalidierung fehlt.
- **Fix:** Nach dem Einlesen der Bytes die Magie-Bytes prüfen:
  - JPEG: `FF D8 FF`
  - PNG: `89 50 4E 47 0D 0A 1A 0A`
  - WebP: `RIFF` und Bytes 8–12 gleich `WEBP`
  - Bei unbekannter Signatur HTTP 422 zurückgeben.
  - Die Dateiendung anhand der erkannten Signatur bestimmen, nicht anhand des Client-Headers. Optional mit Pillow öffnen, re-encoden und EXIF-Metadaten entfernen.

#### 4. Mittel – JWT im `localStorage` erhöht die Auswirkungen möglicher XSS-Lücken
- **Betroffene Stellen:** `frontend/src/api/client.ts`, `frontend/src/auth/AuthContext.tsx`
- **Beschreibung:** Access-Token werden im `window.localStorage` gespeichert. Aktuell ist keine XSS-Lücke sichtbar (React escaped alle Texte), aber `localStorage` ist für Skripte auslesbar. Falls künftig eine XSS-Lücke entsteht, kann der Token direkt entwendet werden.
- **Fix:** Mittelfristig auf ein `HttpOnly; Secure; SameSite=Strict`-Cookie für den Access-Token umstellen. `apiFetch` dann mit `credentials: 'include'` arbeiten, den `Authorization`-Header entfernen und CSRF-Schutz (z. B. Double-Submit-Cookie bei mutierenden Requests) ergänzen. Das ist ein Breaking Change und sollte als geplantes Hardening umgesetzt werden.

#### 5. Niedrig – Keine Passwort-Mindestlänge oder Komplexitätsanforderung
- **Betroffene Stelle:** `backend/app/schemas.py`, Klasse `UserCreate`
- **Beschreibung:** `password: str` akzeptiert auch leere oder sehr kurze Passwörter. Das erhöht das Risiko schwacher Accounts.
- **Fix:** `password: str = Field(..., min_length=8, max_length=128)` setzen; optional weitere Passwortregeln (z. B. nicht ausschließlich Leerzeichen) definieren.

#### 6. Niedrig – SQLite-Foreign-Key-Enforcement nicht aktiviert
- **Betroffene Stelle:** `backend/app/db.py`
- **Beschreibung:** Für SQLite wird kein `PRAGMA foreign_keys=ON` gesetzt. Die aktuellen ORM-Cascades funktionieren für die sichtbaren Löschpfade, aber auf Datenbankebene bleiben kaskadierende Fremdschlüssel wirkungslos, bis das PRAGMA gesetzt ist. Künftige Roh-SQL-Löschungen könnten verwaiste Datensätze hinterlassen.
- **Fix:** Bei der Engine-Erstellung für SQLite einen SQLAlchemy-Event-Listener registrieren:
  ```python
  from sqlalchemy import event
  
  @event.listens_for(engine, "connect")
  def set_sqlite_pragma(dbapi_connection, connection_record):
      cursor = dbapi_connection.cursor()
      cursor.execute("PRAGMA foreign_keys=ON")
      cursor.close()
  ```

#### 7. Niedrig – Keine Content-Security-Policy, kein `X-Content-Type-Options`
- **Betroffene Stellen:** `frontend/index.html`, `backend/app/storage.py`
- **Beschreibung:** Es wird keine CSP gesetzt, und Bildantworten setzen kein `X-Content-Type-Options: nosniff`. Dadurch könnten Browser in bestimmten Fällen MIME-Sniffing betreiben, insbesondere bei nicht ausreichend validierten Uploads.
- **Fix:** In `frontend/index.html` eine restriktive CSP setzen, z. B.:
  ```
  default-src 'self';
  img-src 'self' blob: data:;
  style-src 'self';
  script-src 'self';
  connect-src 'self' http://localhost:8000;
  ```
  Die `connect-src` muss die tatsächlich konfigurierte Backend-Origin enthalten. Zusätzlich serverseitig `X-Content-Type-Options: nosniff` für alle Antworten setzen, insbesondere für Bilddateien.

#### 8. Niedrig – Unbehandelte Exception-Handler loggen vollständige Stacktraces
- **Betroffene Stelle:** `backend/app/main.py`, `unhandled_exception_handler`
- **Beschreibung:** `logger.exception(...)` schreibt den vollständigen Stacktrace. Stacktraces können lokal begrenzt PII oder interne Details enthalten. Aktuell werden E-Mail, JWT und Body nicht direkt geloggt, aber Exception-Texte sind nicht kontrolliert.
- **Fix:** In Produktion nur `logger.error("unhandled error on %s %s", method, path)` ohne Stacktrace loggen; optional eine Request-ID ohne PII ausgeben. Vollständige Stacktraces nur im Entwicklungsmodus.

### Begründung des Verdicts
Es wurden keine kritischen oder hohen Risiken gefunden: keine hartkodierten Secrets, keine Injection/RCE, kein Auth-Bypass, keine bekannte ausgenutzte CVE im sichtbaren Code. Die Befunde sind überwiegend mittlere Härtungsmaßnahmen und Konfigurationsrisiken, insbesondere beim Rate-Limiting und beim JWT-Secret in Produktionsszenarien. Daher wird `CHANGES_REQUESTED` vergeben, nicht `BLOCKED`.