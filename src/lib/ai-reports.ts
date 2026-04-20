import Database from '@tauri-apps/plugin-sql';
import { ensureSchema } from './db-sqlite';

export interface TextBlock {
  type: 'text';
  content: string;
}

export interface TableBlock {
  type: 'table';
  title?: string;
  columns: { key: string; label: string }[];
  rows: Record<string, string>[];
}

export type ReportBlock = TextBlock | TableBlock;

export interface Report {
  id: string;
  projectId: string;
  createdAt: number;
  prompt: string;
  blocks: ReportBlock[];
}

type DbRow = Record<string, unknown>;

let dbPromise: Promise<Database> | null = null;

async function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = Database.load('sqlite:fatturehub.db');
  }
  return dbPromise;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export async function saveReport(report: Report): Promise<void> {
  await ensureSchema();
  const db = await getDb();
  await db.execute(
    `
      INSERT INTO reports (id, project_id, created_at, prompt, blocks_json)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT(id) DO UPDATE SET
        project_id = excluded.project_id,
        created_at = excluded.created_at,
        prompt = excluded.prompt,
        blocks_json = excluded.blocks_json
    `,
    [report.id, report.projectId, report.createdAt, report.prompt, JSON.stringify(report.blocks)]
  );
}

export async function loadReports(projectId: string): Promise<Report[]> {
  try {
    await ensureSchema();
    const db = await getDb();
    const rows = (await db.select<DbRow[]>(
      'SELECT id, project_id, created_at, prompt, blocks_json FROM reports WHERE project_id = $1 ORDER BY created_at DESC',
      [projectId]
    )) as DbRow[];

    const reports: Report[] = rows.map((row) => {
      let blocks: ReportBlock[] = [];
      try {
        const parsed = JSON.parse(asString(row.blocks_json)) as ReportBlock[];
        blocks = Array.isArray(parsed) ? parsed : [];
      } catch {
        blocks = [];
      }

      return {
        id: asString(row.id),
        projectId: asString(row.project_id),
        createdAt: asNumber(row.created_at),
        prompt: asString(row.prompt),
        blocks,
      };
    });

    return reports;
  } catch {
    return [];
  }
}

export async function deleteReport(projectId: string, reportId: string): Promise<void> {
  await ensureSchema();
  const db = await getDb();
  await db.execute('DELETE FROM reports WHERE project_id = $1 AND id = $2', [projectId, reportId]);
}
