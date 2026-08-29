import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AuthProvider } from '../auth/AuthContext';
import Layout from '../components/Layout';

const here = dirname(fileURLToPath(import.meta.url));

function renderShell() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/wardrobe']}>
        <Layout />
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe('App-Shell', () => {
  it('renders the navigation bar with all required links', () => {
    renderShell();

    expect(screen.getByRole('link', { name: 'Garderobe' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Outfits' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Impressum' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Datenschutz' })).toBeInTheDocument();
  });

  it('loads no third-party resources (scripts, styles, fonts) before consent', () => {
    const indexHtml = readFileSync(resolve(here, '../../index.html'), 'utf-8');
    expect(indexHtml).not.toMatch(/https?:\/\//);
    expect(indexHtml).not.toMatch(/<link[^>]*rel=["']stylesheet/i);

    const css = readFileSync(resolve(here, '../styles/index.css'), 'utf-8');
    expect(css).not.toMatch(/@import/);
    expect(css).not.toMatch(/url\(\s*["']?https?:/i);
  });
});
