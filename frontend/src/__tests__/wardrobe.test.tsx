import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type { MockedFunction } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '../api/client';
import type { Category, ClothingItem } from '../api/types';
import { AuthProvider } from '../auth/AuthContext';
import WardrobePage from '../pages/WardrobePage';

vi.mock('../api/client', () => ({
  getToken: () => 'test-token',
  getEmail: () => 'test@example.com',
  persistAuth: vi.fn(),
  clearAuth: vi.fn(),
  redirectToLogin: vi.fn(),
  apiFetch: vi.fn(),
}));

const mockApiFetch = apiFetch as unknown as MockedFunction<
  (path: string, options?: RequestInit) => Promise<unknown>
>;

const items: ClothingItem[] = [
  { id: 1, name: 'Bluse', category: 'oberteil', image_url: '/api/wardrobe/items/1/image' },
  { id: 2, name: 'Jeans', category: 'hose', image_url: '/api/wardrobe/items/2/image' },
];

function renderPage() {
  return render(
    <AuthProvider>
      <WardrobePage />
    </AuthProvider>,
  );
}

beforeEach(() => {
  mockApiFetch.mockReset();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      status: 200,
      blob: async () => ({}),
    })),
  );
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:mock'),
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('WardrobePage', () => {
  it('zeigt die Kleidungsstücke mit Name, Kategorie und Bild', async () => {
    mockApiFetch.mockResolvedValue(items);
    renderPage();

    expect(await screen.findByText('Bluse')).toBeInTheDocument();
    expect(screen.getByText('Jeans')).toBeInTheDocument();

    expect(await screen.findByRole('img', { name: 'Bluse' })).toBeInTheDocument();
    expect(await screen.findByRole('img', { name: 'Jeans' })).toBeInTheDocument();

    const bluseCard = screen.getByTestId('item-1');
    expect(within(bluseCard).getByText('Oberteil')).toBeInTheDocument();
    const jeansCard = screen.getByTestId('item-2');
    expect(within(jeansCard).getByText('Hose')).toBeInTheDocument();
  });

  it('filtert die Garderobe nach Kategorie', async () => {
    mockApiFetch.mockResolvedValue(items);
    renderPage();

    await screen.findByText('Bluse');
    expect(screen.getByText('Jeans')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Hose' }));

    expect(screen.queryByText('Bluse')).not.toBeInTheDocument();
    expect(screen.getByText('Jeans')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Alle' }));
    expect(screen.getByText('Bluse')).toBeInTheDocument();
    expect(screen.getByText('Jeans')).toBeInTheDocument();
  });

  it('legt ein neues Kleidungsstück an', async () => {
    const list = [...items];
    mockApiFetch.mockImplementation(async (_path, options) => {
      if (options?.method === 'POST') {
        const formData = options.body as FormData;
        const newItem: ClothingItem = {
          id: 3,
          name: String(formData.get('name')),
          category: formData.get('category') as Category,
          image_url: '/api/wardrobe/items/3/image',
        };
        list.push(newItem);
        return newItem;
      }
      return list;
    });
    renderPage();

    await screen.findByText('Bluse');

    fireEvent.click(screen.getByRole('button', { name: /hinzufügen/i }));

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Sakko' } });
    fireEvent.change(screen.getByLabelText('Kategorie'), { target: { value: 'oberteil' } });
    const file = new File(['img'], 'sakko.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Bild'), { target: { files: [file] } });

    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    await waitFor(() => expect(screen.getByText('Sakko')).toBeInTheDocument());
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/wardrobe/items',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('löscht ein Kleidungsstück', async () => {
    let list = [...items];
    mockApiFetch.mockImplementation(async (path, options) => {
      if (options?.method === 'DELETE') {
        const id = Number((path as string).split('/').pop());
        list = list.filter((item) => item.id !== id);
        return undefined;
      }
      return list;
    });
    renderPage();

    await screen.findByText('Bluse');

    const bluseCard = screen.getByTestId('item-1');
    fireEvent.click(within(bluseCard).getByRole('button', { name: 'Löschen' }));

    await waitFor(() => expect(screen.queryByText('Bluse')).not.toBeInTheDocument());
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/wardrobe/items/1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
