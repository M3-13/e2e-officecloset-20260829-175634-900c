import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getToken, persistAuth } from '../api/client';
import { AuthProvider } from '../auth/AuthContext';
import AccountPage from '../pages/AccountPage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';

function jsonResponse(status: number, body?: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;
let assignSpy: ReturnType<typeof vi.fn>;
const originalLocation = window.location;

function renderAuthApp(initialPath: string) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route
            path="/wardrobe"
            element={<div data-testid="wardrobe-view">Garderobe</div>}
          />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  assignSpy = vi.fn();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      ...originalLocation,
      pathname: '/wardrobe',
      assign: assignSpy,
      replace: vi.fn(),
      reload: vi.fn(),
    },
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: originalLocation,
  });
});

describe('LoginPage', () => {
  it('stores the token and navigates to the wardrobe after a successful login', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { access_token: 'tok-123', token_type: 'bearer' }),
    );
    renderAuthApp('/login');

    fireEvent.change(screen.getByLabelText('E-Mail'), {
      target: { value: 'holly@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Passwort'), {
      target: { value: 'geheim123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Anmelden' }));

    await screen.findByTestId('wardrobe-view');
    expect(getToken()).toBe('tok-123');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/login'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('shows an understandable error and stores no token on a 401 login', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(401, { detail: 'Ungültige E-Mail oder Passwort.' }),
    );
    renderAuthApp('/login');

    fireEvent.change(screen.getByLabelText('E-Mail'), {
      target: { value: 'falsch@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Passwort'), {
      target: { value: 'falsch' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Anmelden' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ungültige E-Mail oder Passwort.',
    );
    expect(getToken()).toBeNull();
  });
});

describe('RegisterPage', () => {
  it('registers, signs in, stores the token and navigates to the wardrobe', async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/api/auth/register')) {
        return Promise.resolve(
          jsonResponse(201, { id: 1, email: 'holly@example.com' }),
        );
      }
      return Promise.resolve(
        jsonResponse(200, { access_token: 'tok-456', token_type: 'bearer' }),
      );
    });
    renderAuthApp('/register');

    fireEvent.change(screen.getByLabelText('E-Mail'), {
      target: { value: 'holly@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Passwort'), {
      target: { value: 'geheim123' },
    });
    fireEvent.change(screen.getByLabelText('Passwort bestätigen'), {
      target: { value: 'geheim123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Registrieren' }));

    await screen.findByTestId('wardrobe-view');
    expect(getToken()).toBe('tok-456');
  });

  it('shows an error when the passwords do not match', async () => {
    renderAuthApp('/register');

    fireEvent.change(screen.getByLabelText('E-Mail'), {
      target: { value: 'holly@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Passwort'), {
      target: { value: 'geheim123' },
    });
    fireEvent.change(screen.getByLabelText('Passwort bestätigen'), {
      target: { value: 'anders' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Registrieren' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Die Passwörter stimmen nicht überein.',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('AccountPage', () => {
  it('logging out clears the token and navigates to the login page', async () => {
    persistAuth('tok-123', 'holly@example.com');
    renderAuthApp('/account');

    fireEvent.click(screen.getByRole('button', { name: 'Abmelden' }));

    expect(getToken()).toBeNull();
    await screen.findByRole('heading', { name: 'Anmeldung' });
  });

  it('deletes the account, clears the token and navigates to the login page', async () => {
    persistAuth('tok-123', 'holly@example.com');
    fetchMock.mockResolvedValue(jsonResponse(204));
    renderAuthApp('/account');

    fireEvent.click(screen.getByRole('button', { name: 'Konto löschen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Endgültig löschen' }));

    await screen.findByRole('heading', { name: 'Anmeldung' });
    expect(getToken()).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/me'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('a 401 during deletion logs out and redirects to the login page', async () => {
    persistAuth('stale-token', 'holly@example.com');
    fetchMock.mockResolvedValue(jsonResponse(401, { detail: 'Token abgelaufen' }));
    renderAuthApp('/account');

    fireEvent.click(screen.getByRole('button', { name: 'Konto löschen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Endgültig löschen' }));

    await waitFor(() => expect(getToken()).toBeNull());
    expect(assignSpy).toHaveBeenCalledWith('/login');
  });
});
