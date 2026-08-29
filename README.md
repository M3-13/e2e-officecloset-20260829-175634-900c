# Glamouröser Kleiderschrank-Manager

Ein elegantes Web-Tool im Hollywood-Stil: Benutzer registrieren sich und melden
sich an, verwalten Kleidungsstücke mit Bildern und Kategorien in ihrer
Garderobe, durchstöbern sie und kombinieren im Outfit-Creator Einzelteile zu
gespeicherten Outfits.

## Tech-Stack

- **Backend**: Python 3.12+ · FastAPI · SQLAlchemy · SQLite
- **Auth**: JWT (Access-Token), Passwort-Hashing mit bcrypt
- **Frontend**: Vite · React · TypeScript
- **Bilder**: lokaler Dateispeicher
- **Testing**: pytest (Backend), vitest (Frontend)

## Installation

```bash
cd backend
python -m pip install -r requirements.txt
```

## Start (Entwicklung)

`SECRET_KEY` ist der Signierschlüssel für die JWTs. Er wird nie fest im
Repository eingecheckt — beim Start einen eigenen erzeugen und exportieren
(oder alle Werte in `.env.example` ansehen und als Umgebungsvariablen setzen):

```bash
cd backend
export SECRET_KEY=$(python -c "import secrets; print(secrets.token_hex(32))")
python -m uvicorn app.main:app --port 8000
```

PowerShell:

```powershell
cd backend
$env:SECRET_KEY = python -c "import secrets; print(secrets.token_hex(32))"
python -m uvicorn app.main:app --port 8000
```

Der Server bindet an Port 8000, legt die SQLite-Datenbank (`dev.db`) beim ersten
Start automatisch an und beantwortet `GET /api/health` mit `200`. Ein pro Start
neu erzeugter `SECRET_KEY` macht bestehende Tokens beim Neustart ungültig; wer
das vermeiden will, setzt einen festen Wert in `.env`.

## Umgebungsvariablen

| Variable | Standard | Bedeutung |
| --- | --- | --- |
| `DATABASE_URL` | `sqlite:///./dev.db` | Datenbank-URL (SQLAlchemy) |
| `SECRET_KEY` | pro Start zufällig | Signierschlüssel für JWTs (nie fest eingecheckt) |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | Erlaubte CORS-Origin |
| `UPLOAD_DIR` | `uploads` | Verzeichnis für hochgeladene Bilder |
| `MAX_UPLOAD_BYTES` | `5242880` | Maximale Upload-Größe in Bytes |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Gültigkeit des Access-Tokens in Minuten |

## API-Endpunkte

| Methode | Pfad | Antwort |
| --- | --- | --- |
| GET | `/api/health` | `200 {"status": "ok"}` |
| POST | `/api/auth/register` `{email, password}` | `201 User` \| `409` \| `422` |
| POST | `/api/auth/login` `{email, password}` | `200 {access_token, token_type}` \| `401` \| `429` |
| DELETE | `/api/auth/me` (Bearer) | `204` |
| GET | `/api/wardrobe/items?category=` (Bearer) | `200 [ClothingItem]` |
| POST | `/api/wardrobe/items` (Bearer, multipart) | `201 ClothingItem` \| `413` \| `422` |
| GET | `/api/wardrobe/items/{id}` (Bearer) | `200 ClothingItem` \| `404` |
| PUT | `/api/wardrobe/items/{id}` (Bearer, multipart) | `200 ClothingItem` \| `404` |
| DELETE | `/api/wardrobe/items/{id}` (Bearer) | `204` |
| GET | `/api/wardrobe/items/{id}/image` (Bearer) | `200 (jpeg/png/webp)` \| `404` |
| GET | `/api/outfits` (Bearer) | `200 [Outfit]` |
| POST | `/api/outfits` `{name, item_ids}` (Bearer) | `201 Outfit` \| `422` |
| GET | `/api/outfits/{id}` (Bearer) | `200 Outfit` \| `404` |
| DELETE | `/api/outfits/{id}` (Bearer) | `204` |

Fehler antworten immer mit `{"detail": "<Nachricht>"}`. Geschützte Routen
erwarten den Header `Authorization: Bearer <jwt>`.

## Features

- Registrierung und Anmeldung mit JWT
- Garderobe mit Kategorien und Bildern verwalten
- Outfit-Creator: Kleidungsstücke zu Outfits kombinieren
- Datenschutz: keine personenbezogenen Daten in Server-Logs, CORS nur für die
  konfigurierte Frontend-Origin
