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
  note: { fontSize: '14px', color: 'var(--color-muted)' },
};

export default function ImpressumPage() {
  return (
    <section className="page">
      <h1 className="page__title">Impressum</h1>

      <section style={styles.section}>
        <h2 style={styles.heading}>Angaben gemäß § 5 DDG</h2>
        <p style={styles.paragraph}>
          Office Closet
          <br />
          Musterstraße 1
          <br />
          10115 Berlin
          <br />
          Deutschland
        </p>
      </section>

      <section style={styles.section}>
        <h2 style={styles.heading}>Kontakt</h2>
        <p style={styles.paragraph}>
          E-Mail:{' '}
          <a href="mailto:kontakt@office-closet.example">
            kontakt@office-closet.example
          </a>
        </p>
      </section>

      <section style={styles.section}>
        <h2 style={styles.heading}>
          Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV
        </h2>
        <p style={styles.paragraph}>
          Office Closet
          <br />
          Musterstraße 1
          <br />
          10115 Berlin
          <br />
          Deutschland
        </p>
      </section>

      <section style={styles.section}>
        <h2 style={styles.heading}>Hinweise</h2>
        <p style={styles.paragraph}>
          Diese Anwendung lädt keine Ressourcen von Drittanbietern. Hinweise
          zur Verarbeitung personenbezogener Daten finden Sie in der{' '}
          <Link to="/datenschutz">Datenschutzerklärung</Link>.
        </p>
        <p style={styles.note}>
          Bei den oben genannten Angaben handelt es sich um Platzhalter für
          eine Beispielanwendung; vor einem echten Betrieb sind sie durch die
          tatsächlichen Anbieterdaten zu ersetzen.
        </p>
      </section>
    </section>
  );
}
