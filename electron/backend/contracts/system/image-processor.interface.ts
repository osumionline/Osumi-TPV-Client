export interface ProcessedImage {
  readonly buffer: Buffer;
  readonly mimeType: 'image/webp';
  readonly extension: '.webp';
  readonly sizeBytes: number;
  readonly sha256: string;
  readonly width: number;
  readonly height: number;
}

export interface ImageProcessor {
  /**
   * Valida una imagen y la convierte al formato WebP
   * canónico utilizado por Osumi TPV.
   */
  convertToWebp(input: Buffer): Promise<ProcessedImage>;
}
