import JSZip from 'jszip';
import type { Fattura } from './parser';

export async function downloadZip(fatture: Fattura[], fileName = 'fatture_filtrate.zip') {
  const zip = new JSZip();
  for (const f of fatture) {
    zip.file(f.fileName, f.rawXml);
  }
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}