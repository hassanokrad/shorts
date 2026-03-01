import { ListProjectsResponseSchema, type ProjectListItemDto } from '@shorts/shared-types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/v1';
const DEV_AUTH_TOKEN = process.env.NEXT_PUBLIC_DEV_AUTH_TOKEN ?? 'dev-token';

type JsonObject = Record<string, unknown>;

async function request<T>(path: string, init?: RequestInit, schema?: { parse: (value: unknown) => T }): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${DEV_AUTH_TOKEN}`,
      ...(init?.headers ?? {})
    },
    cache: 'no-store'
  });

  const body = (await response.json().catch(() => null)) as JsonObject | null;

  if (!response.ok) {
    const message = typeof body?.message === 'string' ? body.message : `Request failed (${response.status})`;
    throw new Error(message);
  }

  if (!schema) {
    return body as T;
  }

  return schema.parse(body);
}

export async function listProjects(): Promise<ProjectListItemDto[]> {
  const data = await request('/projects', undefined, ListProjectsResponseSchema);
  return data.items;
}

export async function createProject(title: string): Promise<ProjectListItemDto> {
  const data = await request<{ project: ProjectListItemDto }>(
    '/projects',
    {
      method: 'POST',
      body: JSON.stringify({ title })
    }
  );

  return data.project;
}
