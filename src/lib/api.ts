async function get<T>(action: string, params: Record<string, string> = {}): Promise<T> {
  const sp = new URLSearchParams({ action, ...params });
  const res = await fetch(`/api/coordinator?${sp.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Error de red' })) as { message: string };
    throw new Error(err.message);
  }
  return res.json() as Promise<T>;
}

async function post<T>(action: string, data: Record<string, unknown>): Promise<T> {
  const res = await fetch('/api/coordinator', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, data }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Error de red' })) as { message: string };
    throw new Error(err.message);
  }
  return res.json() as Promise<T>;
}

export const api = { get, post };
