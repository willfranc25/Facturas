import Tesseract from 'tesseract.js';

export class OCREngine {
  async ocrImage(imageBuffer: Buffer): Promise<string> {
    try {
      const result = await Tesseract.recognize(imageBuffer, 'spa', {
        logger: () => {}, // silenciar logs
      });
      return result.data.text || '';
    } catch (error) {
      console.error('[OCREngine] Error:', error);
      return '';
    }
  }
}

export const ocrEngine = new OCREngine();
