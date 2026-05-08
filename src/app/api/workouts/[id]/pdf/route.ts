import PDFDocument from "pdfkit";
import sharp from "sharp";
import { getWorkoutById } from "@/lib/workouts/data";
import type { WorkoutDisplay, WorkoutItem } from "@/lib/workouts/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PdfDoc = InstanceType<typeof PDFDocument>;
type PdfTextOptions = { width?: number; lineGap?: number };
type PdfKitOptions = ConstructorParameters<typeof PDFDocument>[0] & { size?: string | [number, number] };
type PdfImageOptions = { width?: number; height?: number; fit?: [number, number]; align?: "center"; valign?: "center" };
type LayoutPdfDoc = PdfDoc & {
  heightOfString: (text: string, options?: PdfTextOptions) => number;
  save: () => LayoutPdfDoc;
  restore: () => LayoutPdfDoc;
  roundedRect: (x: number, y: number, width: number, height: number, radius: number) => {
    clip: () => LayoutPdfDoc;
    fill: (color: string) => LayoutPdfDoc;
    fillAndStroke: (fillColor: string, strokeColor: string) => LayoutPdfDoc;
  };
  rect: (x: number, y: number, width: number, height: number) => {
    fill: (color: string) => LayoutPdfDoc;
    fillAndStroke: (fillColor: string, strokeColor: string) => LayoutPdfDoc;
  };
};

const REGULAR_FONT = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf";
const BOLD_FONT = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf";

function cleanFilename(value: string) {
  const cleaned = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned ? `${cleaned}.pdf` : "oracle-conditioning-workout.pdf";
}

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
}

function repsLabel(value: string | null) {
  if (!value) return null;
  if (/\b(rep|second|sec|minute|min|metre|meter|round|calorie|hold|each)\b/i.test(value)) return value;
  if (/^\d+(-\d+)?$/i.test(value.trim())) return `${value.trim()} reps`;
  return value;
}

function prescription(item: WorkoutItem) {
  const sets = item.sets ? `${item.sets} ${item.sets === 1 ? "set" : "sets"}` : null;
  const work = repsLabel(item.reps) ?? formatDuration(item.durationSeconds);
  const rest = item.restSeconds !== null ? `${item.restSeconds}s rest` : null;
  const main = sets && work ? `${sets} x ${work}` : work ?? sets;
  if (main && rest) return `${main} and ${rest}`;
  return main ?? rest ?? "As prescribed";
}

function compactInstructions(item: WorkoutItem) {
  const source = item.exercise.instructions.length ? item.exercise.instructions : [item.coachingNote, ...item.coachingCues];
  return source
    .filter((value): value is string => Boolean(value?.trim()))
    .flatMap((value) => value.split(/\n+/))
    .map((value) => value.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 2);
}

const PAGE_WIDTH = 595.28;
const PDF_MARGIN = 28;
const CARD_GAP = 10;
const IMAGE_HEIGHT = 170;

function createMeasurementDoc() {
  const doc = new PDFDocument({ size: [PAGE_WIDTH, 20000], margin: PDF_MARGIN, font: REGULAR_FONT } as unknown as PdfKitOptions);
  doc.registerFont("Regular", REGULAR_FONT);
  doc.registerFont("Bold", BOLD_FONT);
  return doc;
}

async function imageBuffer(url: string | null) {
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) return null;
    const raw = Buffer.from(await response.arrayBuffer());
    return await sharp(raw, { animated: false }).rotate().jpeg({ quality: 82 }).toBuffer();
  } catch {
    return null;
  }
}

async function firstImages(urls: string[], limit = 2) {
  const images: Buffer[] = [];
  for (const url of urls) {
    const image = await imageBuffer(url);
    if (image) images.push(image);
    if (images.length >= limit) break;
  }
  return images;
}

async function fixedSizeImage(image: Buffer, width: number, height: number) {
  return sharp(image)
    .resize(Math.ceil(width * 2), Math.ceil(height * 2), { fit: "cover", position: "center" })
    .jpeg({ quality: 84 })
    .toBuffer();
}

function exerciseLayout(doc: PdfDoc, item: WorkoutItem) {
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const cardW = pageWidth;
  const padding = 18;
  const textW = cardW - padding * 2;
  const instructions = compactInstructions(item);
  const prescriptionText = prescription(item);

  doc.font("Bold").fontSize(18);
  const nameH = (doc as LayoutPdfDoc).heightOfString(item.exercise.name, { width: textW, lineGap: 1 });
  doc.font("Bold").fontSize(12);
  const prescriptionH = (doc as LayoutPdfDoc).heightOfString(prescriptionText, { width: textW });
  doc.font("Regular").fontSize(9.5);
  const instructionText = instructions.join("\n");
  const instructionsH = instructions.length ? 40 + (doc as LayoutPdfDoc).heightOfString(instructionText, { width: textW, lineGap: 4 }) : 0;
  const textH = padding + nameH + 7 + prescriptionH + instructionsH + padding;

  return { cardW, padding, textW, instructions, instructionText, prescriptionText, cardH: IMAGE_HEIGHT + textH };
}

async function renderExercise(doc: PdfDoc, item: WorkoutItem) {
  const cardX = doc.page.margins.left;
  const { cardW, padding, textW, instructions, instructionText, prescriptionText, cardH } = exerciseLayout(doc, item);
  const startY = doc.y;
  const images = await firstImages(item.exercise.imageUrls.length ? item.exercise.imageUrls : item.exercise.imageUrl ? [item.exercise.imageUrl] : []);

  (doc as LayoutPdfDoc).roundedRect(cardX, startY, cardW, cardH, 16).fillAndStroke("#ffffff", "#e4e4e7");

  if (images.length) {
    const imageW = images.length > 1 ? cardW / 2 : cardW;
    (doc as LayoutPdfDoc).save();
    (doc as LayoutPdfDoc).roundedRect(cardX, startY, cardW, cardH, 16).clip();
    for (let imageIndex = 0; imageIndex < images.length; imageIndex += 1) {
      try {
        const image = await fixedSizeImage(images[imageIndex], imageW, IMAGE_HEIGHT);
        doc.image(image, cardX + imageIndex * imageW, startY, { width: imageW, height: IMAGE_HEIGHT } as PdfImageOptions);
      } catch {
        // Bad remote images should not break the export.
      }
    }
    (doc as LayoutPdfDoc).restore();
    if (images.length > 1) {
      doc.strokeColor("#e4e4e7").moveTo(cardX + imageW, startY).lineTo(cardX + imageW, startY + IMAGE_HEIGHT).stroke();
    }
  } else {
    (doc as LayoutPdfDoc).roundedRect(cardX, startY, cardW, IMAGE_HEIGHT, 16).fill("#fafafa");
    doc.font("Bold").fontSize(9).fillColor("#a1a1aa").text("Exercise image", cardX, startY + IMAGE_HEIGHT / 2 - 5, { width: cardW, align: "center" });
  }

  doc.strokeColor("#e4e4e7").moveTo(cardX, startY + IMAGE_HEIGHT).lineTo(cardX + cardW, startY + IMAGE_HEIGHT).stroke();

  let textY = startY + IMAGE_HEIGHT + padding;
  doc.font("Bold").fontSize(18).fillColor("#000000").text(item.exercise.name, cardX + padding, textY, { width: textW, lineGap: 1 });
  textY = doc.y + 7;
  doc.font("Bold").fontSize(12).fillColor("#3f3f46").text(prescriptionText, cardX + padding, textY, { width: textW });

  if (instructions.length) {
    const dividerY = doc.y + 16;
    doc.strokeColor("#f4f4f5").moveTo(cardX + padding, dividerY).lineTo(cardX + cardW - padding, dividerY).stroke();
    doc.font("Bold").fontSize(9.5).fillColor("#3f3f46").text("Instructions", cardX + padding, dividerY + 14, { width: textW });
    doc.font("Regular").fontSize(9.5).fillColor("#52525b").text(instructionText, cardX + padding, doc.y + 9, { width: textW, lineGap: 4 });
  }

  doc.y = startY + cardH + CARD_GAP;
}

function workoutItems(workout: WorkoutDisplay) {
  return workout.sections.flatMap((section) => section.items);
}

function measurePdfHeight(workout: WorkoutDisplay) {
  const measureDoc = createMeasurementDoc();
  const contentWidth = measureDoc.page.width - measureDoc.page.margins.left - measureDoc.page.margins.right;
  measureDoc.font("Bold").fontSize(28);
  const titleH = (measureDoc as LayoutPdfDoc).heightOfString(workout.title, { width: contentWidth, lineGap: 2 });
  const cardsH = workoutItems(workout).reduce((total, item) => total + exerciseLayout(measureDoc, item).cardH + CARD_GAP, 0);
  const pageH = PDF_MARGIN + titleH + 26 + cardsH + PDF_MARGIN;
  measureDoc.end();
  return Math.max(842, Math.ceil(pageH));
}

async function renderWorkoutPdf(workout: WorkoutDisplay) {
  const doc = new PDFDocument({ size: [PAGE_WIDTH, measurePdfHeight(workout)], margin: PDF_MARGIN, font: REGULAR_FONT, info: { Title: workout.title, Author: "Oracle Boxing" } } as unknown as PdfKitOptions);
  doc.registerFont("Regular", REGULAR_FONT);
  doc.registerFont("Bold", BOLD_FONT);
  const chunks: Buffer[] = [];

  doc.on("data", (chunk) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  doc.font("Bold").fontSize(28).fillColor("#000000").text(workout.title, { width: doc.page.width - doc.page.margins.left - doc.page.margins.right, lineGap: 2 });
  doc.y += 22;

  for (const item of workoutItems(workout)) {
    await renderExercise(doc, item);
  }

  doc.end();
  return done;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getWorkoutById(id);

  if (result.status === "not-found") {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  const pdf = await renderWorkoutPdf(result.workout);

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${cleanFilename(result.workout.title)}"`,
      "Cache-Control": "no-store",
    },
  });
}
