import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { DeclarationData } from "./types";

/**
 * Génère un PDF de déclaration/formalité (tier Domaine) depuis des champs
 * structurés. pdf-lib crée le document côté serveur (Node) ; pour remplir un
 * gabarit officiel existant (AcroForm), charger le template via
 * PDFDocument.load() et utiliser form.getTextField().setText().
 */

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 56;
const NAVY = rgb(0.078, 0.098, 0.204); // #141934

export async function buildDeclarationPdf(
  data: DeclarationData,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage(A4);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const width = page.getWidth();
  const height = page.getHeight();
  let y = height - MARGIN;

  page.drawText(data.title, { x: MARGIN, y, size: 18, font: bold, color: NAVY });
  y -= 26;

  if (data.subtitle) {
    page.drawText(data.subtitle, {
      x: MARGIN,
      y,
      size: 11,
      font,
      color: rgb(0.32, 0.32, 0.32),
    });
    y -= 24;
  }

  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: width - MARGIN, y },
    thickness: 1,
    color: rgb(0.9, 0.9, 0.9),
  });
  y -= 28;

  for (const f of data.fields) {
    if (y < MARGIN + 60) {
      y = pdf.addPage(A4).getSize().height - MARGIN;
    }
    page.drawText(`${f.label} :`, { x: MARGIN, y, size: 10, font: bold, color: NAVY });
    const lines = wrap(f.value, 80);
    let ly = y - 14;
    for (const line of lines) {
      page.drawText(line, { x: MARGIN + 12, y: ly, size: 10, font });
      ly -= 13;
    }
    y = ly - 10;
  }

  if (data.footer) {
    page.drawText(data.footer, {
      x: MARGIN,
      y: MARGIN,
      size: 8,
      font,
      color: rgb(0.55, 0.55, 0.55),
    });
  }

  return pdf.save();
}

/** Découpe naïve d'une valeur longue en lignes (largeur approximative). */
function wrap(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = (cur + " " + w).trim();
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}
