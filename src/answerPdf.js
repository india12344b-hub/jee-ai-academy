import { jsPDF } from 'jspdf';
import { markdownToPdfLines } from './math.js';

function makeFilename(question) {
  const topic = (question || 'JEE AI Answer')
    .replace(/[^a-z0-9 ]/gi, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 5)
    .join('-');
  return `JEE-AI-Answer-${topic || 'Notes'}.pdf`;
}

export function createAnswerPdf({ answer, question }) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const addPageIfNeeded = (height) => {
    if (y + height > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
  };
  const write = (text, { size, bold = false, gap = 2 } = {}) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(text, contentWidth);
    const lineHeight = size * 0.42;
    for (const line of lines) {
      addPageIfNeeded(lineHeight + gap);
      pdf.text(line, margin, y);
      y += lineHeight;
    }
    y += gap;
  };

  write('JEE AI Academy', { size: 10, bold: true, gap: 5 });
  if (question) {
    write('Question', { size: 11, bold: true, gap: 1 });
    write(question, { size: 10, gap: 4 });
  }
  write('Answer', { size: 16, bold: true, gap: 4 });

  for (const line of markdownToPdfLines(answer)) {
    if (!line.text) {
      y += 2;
      continue;
    }
    const headingSize = Math.max(11, 15 - line.level);
    write(line.text, {
      size: line.type === 'heading' ? headingSize : 10,
      bold: line.type === 'heading',
      gap: line.type === 'heading' ? 2 : 1.5,
    });
  }

  return { pdf, filename: makeFilename(question) };
}

export function downloadAnswerPdf(input) {
  const { pdf, filename } = createAnswerPdf(input);
  pdf.save(filename);
}
