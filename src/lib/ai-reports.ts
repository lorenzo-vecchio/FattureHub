import { mkdir, readTextFile, writeTextFile, readDir, remove } from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';

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

async function reportsDir(projectId: string): Promise<string> {
  const base = await appDataDir();
  const dir = await join(base, 'reports', projectId);
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function saveReport(report: Report): Promise<void> {
  const dir = await reportsDir(report.projectId);
  const path = await join(dir, `${report.id}.json`);
  await writeTextFile(path, JSON.stringify(report));
}

export async function loadReports(projectId: string): Promise<Report[]> {
  try {
    const dir = await reportsDir(projectId);
    const entries = await readDir(dir);
    const reports: Report[] = [];
    for (const entry of entries) {
      if (!entry.name?.endsWith('.json')) continue;
      try {
        const path = await join(dir, entry.name);
        const raw = await readTextFile(path);
        reports.push(JSON.parse(raw) as Report);
      } catch {
        // skip corrupt files
      }
    }
    return reports.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export async function deleteReport(projectId: string, reportId: string): Promise<void> {
  const dir = await reportsDir(projectId);
  const path = await join(dir, `${reportId}.json`);
  await remove(path);
}
