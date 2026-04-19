import type { Fattura } from './parser';
import type { Filters } from './filters';
import { mkdir, readTextFile, writeTextFile, readDir, remove } from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';

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

async function projectsDir(): Promise<string> {
  const base = await appDataDir();
  const dir = await join(base, 'projects');
  await mkdir(dir, { recursive: true });
  return dir;
}

async function projectPath(dir: string, id: string): Promise<string> {
  return join(dir, `${id}.json`);
}

export async function saveProject(name: string, fatture: Fattura[], filters: Filters): Promise<Project> {
  const project: Project = {
    id: crypto.randomUUID(),
    name,
    savedAt: Date.now(),
    lastOpenedAt: Date.now(),
    fatture,
    filters,
  };
  const dir = await projectsDir();
  const path = await projectPath(dir, project.id);
  console.log('[projects] saving to:', path);
  await writeTextFile(path, JSON.stringify(project));
  console.log('[projects] saved ok:', project.id);
  return project;
}

export async function loadProjectsMeta(): Promise<ProjectMeta[]> {
  try {
    const dir = await projectsDir();
    const entries = await readDir(dir);
    const metas: ProjectMeta[] = [];

    for (const entry of entries) {
      if (!entry.name?.endsWith('.json')) continue;
      try {
        const path = await projectPath(dir, entry.name.replace('.json', ''));
        const raw = await readTextFile(path);
        const p = JSON.parse(raw) as Project;
        metas.push({ 
          id: p.id, 
          name: p.name, 
          savedAt: p.savedAt, 
          lastOpenedAt: p.lastOpenedAt,
          count: p.fatture.length 
        });
      } catch {
        // skip corrupt files
      }
    }

    return metas.sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}

export async function loadProject(id: string): Promise<Project | null> {
  try {
    const dir = await projectsDir();
    const path = await projectPath(dir, id);
    const raw = await readTextFile(path);
    return JSON.parse(raw) as Project;
  } catch {
    return null;
  }
}

export async function updateProject(id: string, name: string, fatture: Fattura[], filters: Filters): Promise<void> {
  const project: Project = { id, name, savedAt: Date.now(), lastOpenedAt: Date.now(), fatture, filters };
  const dir = await projectsDir();
  const path = await projectPath(dir, id);
  await writeTextFile(path, JSON.stringify(project));
}

export async function deleteProject(id: string): Promise<void> {
  const dir = await projectsDir();
  const path = await projectPath(dir, id);
  await remove(path);
}
