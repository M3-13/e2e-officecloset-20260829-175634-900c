export type Category = 'oberteil' | 'hose' | 'kleid' | 'schuhe' | 'accessoire';

export interface User {
  id: number;
  email: string;
}

export interface ClothingItem {
  id: number;
  name: string;
  category: Category;
  image_url: string;
}

export interface Outfit {
  id: number;
  name: string;
  items: ClothingItem[];
}

export interface LoginResponse {
  access_token: string;
  token_type: 'bearer';
}

export interface ErrorResponse {
  detail: string;
}
