declare module "pdfkit" {
  type PDFDocumentOptions = {
    size?: string;
    margin?: number;
    info?: Record<string, string>;
    font?: string;
  };

  type TextOptions = {
    width?: number;
    align?: "left" | "center" | "right" | "justify";
    continued?: boolean;
    lineGap?: number;
  };

  type ImageOptions = {
    fit?: [number, number];
    cover?: [number, number];
    align?: "left" | "center" | "right";
    valign?: "top" | "center" | "bottom";
  };

  export default class PDFDocument {
    x: number;
    y: number;
    page: { width: number; height: number; margins: { top: number; right: number; bottom: number; left: number } };
    constructor(options?: PDFDocumentOptions);
    on(event: "data", callback: (chunk: Buffer) => void): this;
    on(event: "end", callback: () => void): this;
    end(): void;
    addPage(): this;
    registerFont(name: string, path: string): this;
    font(name: string): this;
    fontSize(size: number): this;
    fillColor(color: string): this;
    text(text: string, options?: TextOptions): this;
    text(text: string, x?: number, y?: number, options?: TextOptions): this;
    moveDown(lines?: number): this;
    moveTo(x: number, y: number): this;
    lineTo(x: number, y: number): this;
    strokeColor(color: string): this;
    stroke(): this;
    image(src: Buffer, x?: number, y?: number, options?: ImageOptions): this;
  }
}

declare module "pdfkit/js/pdfkit.standalone.js" {
  export { default } from "pdfkit";
}
