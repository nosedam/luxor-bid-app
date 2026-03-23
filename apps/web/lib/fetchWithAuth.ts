let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch("/api/adapters/auth/refresh", { method: "POST" })
      .then((r) => r.ok)
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

export async function fetchWithAuth(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);

  if (res.status !== 401) return res;

  const refreshed = await tryRefresh();
  if (!refreshed) return res;

  return fetch(input, init);
}
