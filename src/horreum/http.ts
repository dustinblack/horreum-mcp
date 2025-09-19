import { fetch } from 'undici';

export type HorreumClientConfig = {
  baseUrl: string;
  token?: string | undefined;
  timeoutMs?: number | undefined;
};

export type ListTestsParams = {
  limit?: number | undefined;
  offset?: number | undefined;
  search?: string | undefined;
};

export type HorreumTest = {
  id: number;
  name: string;
  owner?: string;
};

export type ListTestsResponse = {
  total?: number;
  tests: HorreumTest[];
};

export function createHorreumClient(config: HorreumClientConfig) {
  const { baseUrl, token, timeoutMs = 30_000 } = config;

  async function request<T>(path: string): Promise<T> {
    const url = new URL(path, baseUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: controller.signal,
      });
      if (!res.ok) {
        const bodyText = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} ${res.statusText}: ${bodyText}`);
      }
      return (await res.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    async listTests(params: ListTestsParams = {}): Promise<ListTestsResponse> {
      const query = new URLSearchParams();
      if (params.limit != null) query.set('limit', String(params.limit));
      if (params.offset != null) query.set('offset', String(params.offset));
      if (params.search) query.set('search', params.search);

      // NOTE: Endpoint path is based on typical Horreum API conventions and
      // may require adjustment when OpenAPI is integrated.
      const path = `/api/test${query.toString() ? `?${query}` : ''}`;
      const data = await request<unknown>(path);

      // Attempt to normalize a couple of likely shapes without being strict.
      if (
        data &&
        typeof data === 'object' &&
        Array.isArray((data as any).tests)
      ) {
        return data as ListTestsResponse;
      }
      if (Array.isArray(data)) {
        return { tests: data as HorreumTest[] };
      }
      return { tests: [] };
    },
  };
}


