import Database from '@tauri-apps/plugin-sql';
import { ensureSchema, getAllInvoices } from './db-sqlite';
import type { Filters } from './filters';
import { emptyFilters } from './filters';
import type { Fattura } from './parser';

export interface Project {
  id: string;
  name: string;
  savedAt: number;
  lastOpenedAt?: number;
  fatture: Fattura[];
  filters: Filters;
}

export interface ProjectMeta {
  id: string;
  name: string;
  savedAt: number;
  lastOpenedAt?: number;
  count: number;
}

type DbRow = Record<string, unknown>;

let dbPromise: Promise<Database> | null = null;

async function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = Database.load('sqlite:fatturehub.db');
  }
  return dbPromise;
}

function asNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function parseFilters(value: unknown): Filters {
  if (typeof value !== 'string' || value.length === 0) return emptyFilters();
  try {
    return { ...emptyFilters(), ...(JSON.parse(value) as Filters) };
  } catch {
    return emptyFilters();
  }
}

export async function saveProject(name: string, fatture: Fattura[], filters: Filters): Promise<Project> {
  await ensureSchema();
  const db = await getDb();
  const now = Date.now();
  const id = crypto.randomUUID();

  await db.execute(
    `
      INSERT INTO projects (id, name, saved_at, last_opened_at, filters_json)
      VALUES ($1, $2, $3, $4, $5)
    `,
    [id, name, now, now, JSON.stringify(filters)]
  );

  await db.execute('UPDATE invoices SET project_id = $1 WHERE project_id IS NULL', [id]);

  const project: Project = {
    id,
    name,
    savedAt: now,
    lastOpenedAt: now,
    fatture,
    filters,
  };
  return project;
}

export async function loadProjectsMeta(): Promise<ProjectMeta[]> {
  try {
    await ensureSchema();
    const db = await getDb();
    const rows = (await db.select<DbRow[]>(
      `
        SELECT p.id, p.name, p.saved_at, p.last_opened_at, COUNT(i.id) AS count
        FROM projects p
        LEFT JOIN invoices i ON i.project_id = p.id
        GROUP BY p.id, p.name, p.saved_at, p.last_opened_at
        ORDER BY p.saved_at DESC
      `
    )) as DbRow[];

    return rows.map((row) => ({
      id: asString(row.id),
      name: asString(row.name),
      savedAt: asNumber(row.saved_at),
      lastOpenedAt: row.last_opened_at == null ? undefined : asNumber(row.last_opened_at),
      count: asNumber(row.count),
    }));
  } catch {
    return [];
  }
}

export async function loadProject(id: string): Promise<Project | null> {
  try {
    await ensureSchema();
    const db = await getDb();
    const rows = (await db.select<DbRow[]>(
      'SELECT id, name, saved_at, last_opened_at, filters_json FROM projects WHERE id = $1 LIMIT 1',
      [id]
    )) as DbRow[];

    if (rows.length === 0) return null;

    const row = rows[0];
    const fatture = await getAllInvoices(id);

    return {
      id: asString(row.id),
      name: asString(row.name),
      savedAt: asNumber(row.saved_at),
      lastOpenedAt: row.last_opened_at == null ? undefined : asNumber(row.last_opened_at),
      fatture,
      filters: parseFilters(row.filters_json),
    };
  } catch {
    return null;
  }
}

export async function updateProject(id: string, name: string, fatture: Fattura[], filters: Filters): Promise<void> {
  void fatture;
  await ensureSchema();
  const db = await getDb();
  const now = Date.now();
  await db.execute(
    `
      UPDATE projects
      SET name = $2, saved_at = $3, last_opened_at = $4, filters_json = $5
      WHERE id = $1
    `,
    [id, name, now, now, JSON.stringify(filters)]
  );
}

export async function deleteProject(id: string): Promise<void> {
  await ensureSchema();
  const db = await getDb();
  await db.execute('DELETE FROM reports WHERE project_id = $1', [id]);
  await db.execute('DELETE FROM invoice_lines WHERE invoice_id IN (SELECT id FROM invoices WHERE project_id = $1)', [id]);
  await db.execute('DELETE FROM invoices WHERE project_id = $1', [id]);
  await db.execute('DELETE FROM projects WHERE id = $1', [id]);
}

export async function touchProjectLastOpened(id: string): Promise<void> {
  await ensureSchema();
  const db = await getDb();
  await db.execute('UPDATE projects SET last_opened_at = $2 WHERE id = $1', [id, Date.now()]);
}
