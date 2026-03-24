import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  ShadingType,
  WidthType,
  BorderStyle,
} from 'docx';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import type { Report, ReportBlock, TextBlock, TableBlock } from './ai-reports';

// ── Markdown → docx paragraphs ────────────────────────────────────────────────

function parseInline(text: string): TextRun[] {
  const runs: TextRun[] = [];
  // Split on **bold** patterns
  const parts = text.split(/(\*\*[^*]+\*\*)/);
  for (const part of parts) {
    if (part.startsWith('**') && part.endsWith('**')) {
      runs.push(new TextRun({ text: part.slice(2, -2), bold: true }));
    } else if (part) {
      runs.push(new TextRun({ text: part }));
    }
  }
  return runs.length ? runs : [new TextRun({ text: '' })];
}

function textBlockToParagraphs(block: TextBlock): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const lines = block.content.split('\n');

  for (const line of lines) {
    if (line.startsWith('## ')) {
      paragraphs.push(new Paragraph({
        text: line.slice(3).trim(),
        heading: HeadingLevel.HEADING_2,
      }));
    } else if (line.startsWith('### ')) {
      paragraphs.push(new Paragraph({
        text: line.slice(4).trim(),
        heading: HeadingLevel.HEADING_3,
      }));
    } else if (line.startsWith('# ')) {
      paragraphs.push(new Paragraph({
        text: line.slice(2).trim(),
        heading: HeadingLevel.HEADING_1,
      }));
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      paragraphs.push(new Paragraph({
        children: parseInline(line.slice(2).trim()),
        bullet: { level: 0 },
      }));
    } else if (line.trim() === '') {
      paragraphs.push(new Paragraph({ text: '' }));
    } else {
      paragraphs.push(new Paragraph({
        children: parseInline(line),
        alignment: AlignmentType.LEFT,
      }));
    }
  }

  return paragraphs;
}

// ── TableBlock → docx Table ───────────────────────────────────────────────────

function tableBlockToDocxTable(block: TableBlock): (Paragraph | Table)[] {
  const result: (Paragraph | Table)[] = [];

  if (block.title) {
    result.push(new Paragraph({
      text: block.title,
      heading: HeadingLevel.HEADING_3,
    }));
  }

  const headerRow = new TableRow({
    tableHeader: true,
    children: block.columns.map(col =>
      new TableCell({
        shading: { type: ShadingType.SOLID, color: '4F46E5', fill: '4F46E5' },
        children: [new Paragraph({
          children: [new TextRun({ text: col.label, bold: true, color: 'FFFFFF' })],
        })],
        width: { size: Math.floor(9000 / block.columns.length), type: WidthType.DXA },
      })
    ),
  });

  const dataRows = block.rows.map((row, rowIdx) =>
    new TableRow({
      children: block.columns.map(col =>
        new TableCell({
          shading: rowIdx % 2 === 1
            ? { type: ShadingType.SOLID, color: 'F3F4F6', fill: 'F3F4F6' }
            : undefined,
          children: [new Paragraph({
            children: [new TextRun({ text: String(row[col.key] ?? '') })],
          })],
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
            left: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
            right: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
          },
          width: { size: Math.floor(9000 / block.columns.length), type: WidthType.DXA },
        })
      ),
    })
  );

  result.push(new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 9000, type: WidthType.DXA },
  }));

  return result;
}

// ── Main export function ──────────────────────────────────────────────────────

export async function exportReportToDocx(report: Report): Promise<void> {
  const path = await save({
    filters: [{ name: 'Word Document', extensions: ['docx'] }],
    defaultPath: `report-${new Date().toISOString().split('T')[0]}.docx`,
  });

  if (!path) return; // user cancelled

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      text: report.prompt,
      heading: HeadingLevel.HEADING_1,
    }),
    new Paragraph({ text: '' }),
  ];

  for (const block of report.blocks as ReportBlock[]) {
    if (block.type === 'text') {
      children.push(...textBlockToParagraphs(block as TextBlock));
    } else if (block.type === 'table') {
      children.push(...tableBlockToDocxTable(block as TableBlock));
      children.push(new Paragraph({ text: '' }));
    }
  }

  const doc = new Document({
    sections: [{
      children,
    }],
  });

  // Use toBlob() for browser/WebView compatibility (toBuffer needs Node.js Buffer)
  const blob = await Packer.toBlob(doc);
  const arrayBuffer = await blob.arrayBuffer();
  await writeFile(path, new Uint8Array(arrayBuffer));
}
