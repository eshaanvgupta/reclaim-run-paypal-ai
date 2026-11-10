export let csrf = '';
export function setCsrf(value: string) {
  csrf = value;
}
export async function api<T = any>(
  path: string,
  body?: unknown,
  method = body === undefined ? 'GET' : 'POST',
): Promise<T> {
  const r = await fetch('/api' + path, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Request failed.');
  return data;
}
export const usd = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value / 100);
export const cats = ['Lighting', 'Audio', 'Organization', 'Desk', 'Stationery', 'Hobby'] as const;
export type Product = {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  price: number;
  retail: number;
  available: number;
  ageDays: number;
  quality: number;
  tags: string;
  cost?: number;
  floor?: number;
  stock?: number;
  reserved?: number;
  discountBps?: number;
  marginBps?: number;
  clearance?: boolean;
};
export type Config = {
  provider: string;
  model: string;
  apiKey: string;
  endpoint?: string;
  maxTokens: number;
  maxSteps: number;
};
