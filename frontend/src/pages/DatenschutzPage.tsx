import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

const styles: Record<string, CSSProperties> = {
  section: { marginBottom: 'var(--space-5)' },
  heading: {
    fontSize: '20px',
    fontWeight: 600,
    margin: '0 0 var(--space-2)',
  },
  paragraph: { margin: '0 0 var(--space-2)', lineHeight: 1.6 },
  list: { margin: '0 0 var(--space-2)', paddingLeft: '24px', lineHeight: 1.6 },
};

export default function DatenschutzPage() {
  return (
    <section className="page">
      <h1 className="page__title">Datenschutzerklärung</h1>

      <section style={styles.section}>
        <h2 style={styles.heading}>1. Verantwortlicher</h2>
        <p style={styles.paragraph}>
          Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO) ist
          der Anbieter dieser Anwendung. Die vollständigen Kontaktdaten finden
          Sie im <Link to="/impressum">Impressum</Link>.
        </p>
      </section>

      <section style={styles.section}>
        <h2 style={styles.heading}>2. Verarbeitete Daten</h2>
        <p style={styles.paragraph}>
          Beim Betrieb des Kleiderschrank-Managers verarbeitet die Anwendung
          ausschließlich die Daten, die Sie selbst angeben oder hochladen:
        </p>
        <ul style={styles.list}>
          <li>
            <strong>E-Mail-Adresse:</strong> wird bei der Registrierung erhoben
            und dient als Benutzername für die Anmeldung sowie als
            Kontaktmöglichkeit.
          </li>
          <li>
            <strong>Passwort:</strong> wird niemals im Klartext gespeichert,
            sondern ausschließlich als kryptografischer Hash (bcrypt) abgelegt.
          </li>
          <li>
            <strong>Bilder:</strong> die von Ihnen hochgeladenen Bilder Ihrer
            Kleidungsstücke werden lokal auf dem Server der Anwendung
            gespeichert und ausschließlich Ihrem Konto zugeordnet.
          </li>
          <li>
            <strong>Sitzungs-Token (JWT):</strong> zur technischen
            Authentifizierung wird ein kurzlebiges Zugriffstoken erzeugt.
          </li>
        </ul>
      </section>

      <section style={styles.section}>
        <h2 style={styles.heading}>3. Zwecke und Rechtsgrundlagen</h2>
        <p style={styles.paragraph}>
          Die Verarbeitung erfolgt ausschließlich zur Bereitstellung der von
          Ihnen genutzten Funktionen (Registrierung, Anmeldung, Verwaltung der
          Garderobe und der Outfits). Rechtsgrundlage ist Art. 6 Abs. 1 lit. b
          DSGVO (Erfüllung des Nutzungsvertrags).
        </p>
      </section>

      <section style={styles.section}>
        <h2 style={styles.heading}>4. Weitergabe und Drittanbieter</h2>
        <p style={styles.paragraph}>
          Ihre Daten werden nicht an Dritte weitergegeben. Die Anwendung lädt
          keine Ressourcen von Drittanbietern (z. B. Schriften oder Skripte)
          nach.
        </p>
      </section>

      <section style={styles.section}>
        <h2 style={styles.heading}>5. Server-Logs</h2>
        <p style={styles.paragraph}>
          In den Server-Logs werden keine personenbezogenen Daten gespeichert
          (keine E-Mail-Adressen, keine Zugriffstoken, keine Bildinhalte).
        </p>
      </section>

      <section style={styles.section}>
        <h2 style={styles.heading}>6. Speicherdauer</h2>
        <p style={styles.paragraph}>
          Ihre Daten werden so lange gespeichert, wie Ihr Konto besteht und
          dies für die Bereitstellung der Funktionen erforderlich ist. Beim
          Löschen Ihres Kontos werden alle zugehörigen Daten unverzüglich
          entfernt (siehe Abschnitt 7).
        </p>
      </section>

      <section style={styles.section}>
        <h2 style={styles.heading}>7. Löschung Ihres Kontos und Ihrer Daten</h2>
        <p style={styles.paragraph}>
          Sie können Ihr Konto jederzeit im Bereich „Konto“ der Anwendung
          löschen. Dabei werden dauerhaft und vollständig entfernt:
        </p>
        <ul style={styles.list}>
          <li>Ihre E-Mail-Adresse und Ihr Passwort-Hash,</li>
          <li>alle von Ihnen angelegten Kleidungsstücke und Outfits,</li>
          <li>alle von Ihnen hochgeladenen Bilddateien.</li>
        </ul>
      </section>

      <section style={styles.section}>
        <h2 style={styles.heading}>8. Ihre Rechte</h2>
        <p style={styles.paragraph}>
          Ihnen stehen nach der DSGVO folgende Rechte zu:
        </p>
        <ul style={styles.list}>
          <li>Recht auf Auskunft (Art. 15 DSGVO),</li>
          <li>Recht auf Berichtigung (Art. 16 DSGVO),</li>
          <li>Recht auf Löschung (Art. 17 DSGVO),</li>
          <li>Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO),</li>
          <li>Recht auf Datenübertragbarkeit (Art. 20 DSGVO),</li>
          <li>Recht auf Widerspruch (Art. 21 DSGVO),</li>
          <li>
            Recht auf Beschwerde bei einer Aufsichtsbehörde (Art. 77 DSGVO).
          </li>
        </ul>
        <p style={styles.paragraph}>
          Zur Ausübung Ihrer Rechte genügt eine Nachricht an die im{' '}
          <Link to="/impressum">Impressum</Link> genannte Kontaktadresse.
        </p>
      </section>
    </section>
  );
}
