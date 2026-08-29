import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { AuthProvider } from '../auth/AuthContext';
import Layout from '../components/Layout';
import DatenschutzPage from '../pages/DatenschutzPage';
import ImpressumPage from '../pages/ImpressumPage';

function renderPage(element: ReactElement) {
  return render(<MemoryRouter>{element}</MemoryRouter>);
}

afterEach(cleanup);

describe('Impressum und Datenschutzerklärung', () => {
  it('rendert die Impressumsseite mit Anbieter- und Kontaktangaben', () => {
    renderPage(<ImpressumPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Impressum' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/§ 5 DDG/i)).toBeInTheDocument();
    expect(screen.getByText(/E-Mail:/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Datenschutzerklärung' }),
    ).toHaveAttribute('href', '/datenschutz');
  });

  it('rendert die Datenschutzerklärung mit Angaben zur Datenverarbeitung und Löschung', () => {
    renderPage(<DatenschutzPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Datenschutzerklärung' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/E-Mail-Adresse:/i)).toBeInTheDocument();
    expect(screen.getByText(/bcrypt/i)).toBeInTheDocument();
    expect(screen.getByText(/Bilder:/i)).toBeInTheDocument();
    expect(screen.getByText(/Löschung Ihres Kontos/i)).toBeInTheDocument();
  });

  it('verlinkt beide Rechtsseiten aus der Navigation', () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/wardrobe']}>
          <Layout />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(screen.getByRole('link', { name: 'Impressum' })).toHaveAttribute(
      'href',
      '/impressum',
    );
    expect(
      screen.getByRole('link', { name: 'Datenschutz' }),
    ).toHaveAttribute('href', '/datenschutz');
  });
});
