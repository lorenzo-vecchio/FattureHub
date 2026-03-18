import JSZip from 'jszip';
import type { Fattura } from './parser';
import { cedenteLabel, cessionarioLabel } from './parser';

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadZip(fatture: Fattura[], fileName = 'fatture_filtrate.zip') {
  const zip = new JSZip();
  for (const f of fatture) {
    zip.file(f.fileName, f.rawXml);
  }
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  triggerDownload(blob, fileName);
}

export async function downloadZipGrouped(
  fatture: Fattura[],
  groupBy: 'cedente' | 'cessionario',
  fileName?: string
) {
  const zip = new JSZip();
  for (const f of fatture) {
    const label = groupBy === 'cedente' ? cedenteLabel(f) : cessionarioLabel(f);
    const folder = label.replace(/[/\\:*?"<>|]/g, '_').trim() || 'Sconosciuto';
    zip.file(`${folder}/${f.fileName}`, f.rawXml);
  }
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  triggerDownload(blob, fileName ?? `fatture_per_${groupBy}.zip`);
}
