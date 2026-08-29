VERDICT: CHANGES_REQUESTED

## DSGVO / Datenschutz

**D1 – Datenschutzerklärung nur Platzhalter (hoch)**  
`frontend/src/pages/DatenschutzPage.tsx` enthält ausschließlich den Text „Dieser Bereich wird in einem späteren Schritt umgesetzt.“ Damit fehlen die Informationspflichten nach Art. 13 DSGVO vollständig: Verantwortlicher, Zwecke, Rechtsgrundlage, Empfänger, Speicherdauer, Betroffenenrechte, Beschwerderecht.  
**Remedy:** Die Datei mit einer vollständigen Datenschutzerklärung füllen. Mindestens aufnehmen: Verantwortlicher (Name/Anschrift/Kontakt), Verarbeitung von E-Mail-Adresse und Passwort-Hash zur Kontoführung, Rechtsgrundlage Art. 6 Abs. 1 lit. b DSGVO, Speicherdauer (z. B. „bis zur Löschung des Kontos“), Rechte auf Auskunft/Berichtigung/Löschung/Einschränkung/Übertragbarkeit/Widerspruch, Hinweis auf Beschwerderecht bei der Aufsichtsbehörde.

**D2 – Server-Access-Logs können IP-Adressen enthalten (mittel)**  
`backend/app/logging_setup.py` konfiguriert nur das Root-Logging. Uvicorn-Access-Logs protokollieren standardmäßig Client-IP und User-Agent; IP-Adressen sind personenbezogen. AC-15 verlangt, dass keine personenbezogenen Daten in Server-Logs gespeichert werden.  
**Remedy:** In `backend/app/logging_setup.py` den Logger `uvicorn.access` auf ein Format ohne IP/User-Agent setzen (z. B. nur Methode, Pfad, Status) oder beim Start `--no-access-log` verwenden. Alternativ das Access-Log-Level auf WARNING anheben.

**D3 – Keine dokumentierte Speicherdauer (mittel)**  
Es existiert kein Mechanismus zur automatisierten Löschung inaktiver Konten und keine Angabe zur Speicherdauer. Die Löschung durch den Nutzer ist mit AC-14 umgesetzt (`DELETE /api/auth/me` löscht Nutzer, Garderobe, Outfits und Bilddateien), aber die Informationspflicht und das Löschkonzept sind unvollständig.  
**Remedy:** In der Datenschutzerklärung eine konkrete Speicherdauer angeben (z. B. „bis zur Löschung des Kontos“). Optional einen Prozess für automatische Löschung inaktiver Konten implementieren.

**D4 – JWT im localStorage (mittel)**  
`frontend/src/api/client.ts` speichert das JWT im `window.localStorage`. Dadurch kann ein XSS-Angriff das Token auslesen und auf personenbezogene Daten zugreifen.  
**Remedy:** Token-Handling auf ein HttpOnly-Cookie umstellen (Login setzt Cookie, `credentials: 'include'`, CSRF-Schutz ergänzen). Mindestens aber eine strikte CSP (`script-src 'self'`) in `frontend/index.html` bzw. als Security-Header setzen, um das XSS-Risiko zu reduzieren.

**D5 – Bild-Upload ohne echte Inhaltsprüfung (mittel/niedrig)**  
`backend/app/storage.py` prüft nur den deklarierten `Content-Type` und die Länge, nicht den tatsächlichen Dateiinhalt. Ein Angreifer kann Dateien mit falschem MIME hochladen. Das betrifft Integrität/Vertraulichkeit (Art. 5 Abs. 1 lit. f DSGVO) und Sicherheitsanforderungen.  
**Remedy:** In `save_image` nach dem Einlesen die ersten Bytes prüfen (Magic Numbers für JPEG/PNG/WebP) und nur dann speichern; oder eine Bibliothek wie Pillow zur Validierung verwenden.

**Positiv:** Passwörter werden mit bcrypt gehasht (`$2b$` Präfix, AC-09). Benutzerisolation in Garderobe/Outfit ist überall umgesetzt (AC-10). Konto-Löschung entfernt personenbezogene Daten und Dateien (AC-14). Die Exception-Handler loggen selbst nur Methode/Pfad ohne PII.

## EU Cyber Resilience Act (CRA)

**C1 – SBOM / Dependency-Transparenz fehlt (mittel)**  
`backend/requirements.txt` und `frontend/package-lock.json` sind vorhanden, aber es ist kein SBOM (z. B. CycloneDX/SPDX) sichtbar und keine dokumentierte Schwachstellen-/Update-Policy. Für Produkte mit digitalen Elementen verlangt der CRA ein SBOM und ein Verfahren für Sicherheits-Updates.  
**Remedy:** SBOM-Generierung in die CI aufnehmen (z. B. `cyclonedx-bom`, `pip-audit`, `npm sbom`) und das Ergebnis in `README.md`/`DESIGN.md` dokumentieren. Update- und Patch-Prozess beschreiben.

**C2 – Security-Header/Härtung fehlen (mittel)**  
Es fehlen `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS. CORS ist sauber begrenzt (AC-11), aber Security-by-Default verlangt weitere Härtung.  
**Remedy:** In `backend/app/main.py` eine Middleware ergänzen, die diese Header setzt. CSP so wählen, dass eigene Ressourcen und die API erlaubt bleiben: z. B. `img-src 'self' blob: http://localhost:8000; connect-src 'self' http://localhost:8000; script-src 'self'; style-src 'self'`. Die App muss unter diesen Restriktionen weiterhin korrekt laden.

**C3 – Rate Limiting nur In-Memory (niedrig)**  
`backend/app/rate_limit.py` speichert Zähler pro Prozess. Bei mehreren Uvicorn-Workern oder mehreren Instanzen ist die Sperre leicht umgehbar. Für Dev/CI ausreichend, für einen Produktivbetrieb unzureichend.  
**Remedy:** Deployment dokumentieren (Single-Worker) oder Rate Limiting auf einen gemeinsamen Speicher (z. B. Redis) umstellen.

## EU AI Act

**Kein Befund**  
Im sichtbaren Code ist keine KI-Funktion enthalten. Der AI Act ist daher nicht anwendbar.

## Pflichttexte & UI

**T1 – Impressum nur Platzhalter (hoch)**  
`frontend/src/pages/ImpressumPage.tsx` enthält keinen rechtskonformen Inhalt nach § 5 DDG: Name, Anschrift, Kontakt, ggf. Vertretungsberechtigter fehlen.  
**Remedy:** Die Datei mit einem vollständigen Impressum füllen.

**T2 – Datenschutzerklärung nur Platzhalter (hoch)**  
Siehe D1; `frontend/src/pages/DatenschutzPage.tsx` muss mit echtem Text gefüllt werden.

**T3 – Verlinkung grundsätzlich erfüllt (low)**  
`frontend/src/components/Navbar.tsx` verlinkt „Impressum“ und „Datenschutz“ von jeder Seite. Sobald die Seiten Inhalte haben, ist AC-12 erfüllt.

**T4 – Cookie-Banner nicht erforderlich (kein Mangel)**  
Im Frontend werden keine Cookies und keine Drittanbieter-Ressourcen geladen. `frontend/index.html` und die CSS-Dateien enthalten keine externen URLs. Der Test `frontend/src/__tests__/shell.test.tsx` prüft AC-13 erfolgreich. `localStorage` fällt nicht unter die Cookie-Einwilligungspflicht. Es ist daher kein Consent-Banner nötig.

## Barrierefreiheit (EAA / WCAG / BITV)

**A1 – `window.confirm` für Löschdialoge nicht barrierefrei (mittel)**  
In `frontend/src/pages/OutfitsPage.tsx` (und voraussichtlich `WardrobePage.tsx`) wird `window.confirm` verwendet. Das ist für Screenreader und Tastaturnutzer schwer zugänglich und unterbricht den Fokus.  
**Remedy:** Bestätigungsdialog als eigene Modal-Komponente mit `role="dialog"`, Fokusfalle, Fokus-Rückgabe und klaren Buttons umsetzen. Die in `AccountPage.tsx` bereits vorhandene Löschbestätigung kann als Muster dienen.

**A2 – Modal-Fokusmanagement unvollständig (niedrig)**  
`OutfitsPage` rendert ein Modal mit `role="dialog"` und schließt bei Escape, aber ein anfänglicher Fokus auf das Dialogelement und eine vollständige Fokusfalle sind nicht sichtbar.  
**Remedy:** Beim Öffnen Fokus auf das Modal oder den Schließen-Button setzen, Tab-Fokus im Dialog halten, beim Schließen Fokus auf den auslösenden Button zurückgeben.

**Positiv:** `alt`-Attribute für Bilder vorhanden, Formulare mit Labels, `aria-pressed` für Filter/Auswahl, `aria-label` für Icon-Buttons, `html lang="de"`.

## Zusammenfassung

Der Code erfüllt viele Sicherheits- und Datenschutzanforderungen der Sprint-ACs (bcrypt, JWT, CORS, Rate Limiting, Benutzerisolation, Account-Löschung, keine Drittanbieter-Ressourcen). Die Freigabe scheitert jedoch an den fehlenden Inhalten von `ImpressumPage.tsx` und `DatenschutzPage.tsx`. Da diese Lücken klar behebbar sind und kein grundlegender Verstoß gegen ein Datenverarbeitungsverbot vorliegt, werden Änderungen angefordert.