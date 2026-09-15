import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  validarEsImagen,
  calcularDimensionesProporcionales,
  estimarTamanoBytes,
  comprimirImagen,
} from './imageCompression';

describe('imageCompression utils', () => {
  describe('validarEsImagen', () => {
    it('returns true for image MIME types', () => {
      const fileJpeg = new File(['fake-content'], 'factura.jpg', { type: 'image/jpeg' });
      const filePng = new File(['fake-content'], 'recibo.png', { type: 'image/png' });
      const fileWebp = new File(['fake-content'], 'comprobante.webp', { type: 'image/webp' });

      expect(validarEsImagen(fileJpeg)).toBe(true);
      expect(validarEsImagen(filePng)).toBe(true);
      expect(validarEsImagen(fileWebp)).toBe(true);
    });

    it('returns true for files with image extensions even if MIME is empty', () => {
      const fileJpg = new File(['fake-content'], 'recibo_uber.JPG', { type: '' });
      const filePng = new File(['fake-content'], 'ticket_metro.png', { type: '' });

      expect(validarEsImagen(fileJpg)).toBe(true);
      expect(validarEsImagen(filePng)).toBe(true);
    });

    it('returns false for non-image files', () => {
      const filePdf = new File(['fake-content'], 'reporte.pdf', { type: 'application/pdf' });
      const fileTxt = new File(['fake-content'], 'notas.txt', { type: 'text/plain' });
      const fileDoc = new File(['fake-content'], 'factura.docx', { type: '' });

      expect(validarEsImagen(filePdf)).toBe(false);
      expect(validarEsImagen(fileTxt)).toBe(false);
      expect(validarEsImagen(fileDoc)).toBe(false);
      // @ts-expect-error test null/undefined
      expect(validarEsImagen(null)).toBe(false);
    });
  });

  describe('calcularDimensionesProporcionales', () => {
    it('preserves dimensions if already within limits', () => {
      const dims = calcularDimensionesProporcionales(800, 600, 1000, 1000);
      expect(dims).toEqual({ width: 800, height: 600 });
    });

    it('downscales proportionally when width exceeds maxWidth (landscape)', () => {
      // 4000x2000 -> max 1000x1000 -> width: 1000, height: 500
      const dims = calcularDimensionesProporcionales(4000, 2000, 1000, 1000);
      expect(dims).toEqual({ width: 1000, height: 500 });
    });

    it('downscales proportionally when height exceeds maxHeight (portrait phone photo)', () => {
      // 3000x4000 (typical camera photo) -> max 1000x1000 -> height: 1000, width: 750
      const dims = calcularDimensionesProporcionales(3000, 4000, 1000, 1000);
      expect(dims).toEqual({ width: 750, height: 1000 });
    });

    it('handles square images above limits', () => {
      const dims = calcularDimensionesProporcionales(2500, 2500, 1000, 1000);
      expect(dims).toEqual({ width: 1000, height: 1000 });
    });

    it('handles zero or negative dimensions safely', () => {
      const dims = calcularDimensionesProporcionales(0, 0, 1000, 1000);
      expect(dims.width).toBeGreaterThanOrEqual(1);
      expect(dims.height).toBeGreaterThanOrEqual(1);
    });
  });

  describe('estimarTamanoBytes', () => {
    it('calculates approximate bytes from base64 string correctly', () => {
      // 400 chars of base64 -> ~300 bytes
      const fakeBase64 = 'data:image/webp;base64,' + 'A'.repeat(400);
      const bytes = estimarTamanoBytes(fakeBase64);
      expect(bytes).toBe(300);
    });

    it('handles string without base64 prefix', () => {
      const plainStr = 'sample-text-data';
      expect(estimarTamanoBytes(plainStr)).toBe(plainStr.length);
    });
  });

  describe('comprimirImagen with Canvas', () => {
    let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;
    let originalToDataURL: typeof HTMLCanvasElement.prototype.toDataURL;
    let mockDrawImage: ReturnType<typeof vi.fn>;
    let mockContext2d: any;

    beforeEach(() => {
      originalGetContext = HTMLCanvasElement.prototype.getContext;
      originalToDataURL = HTMLCanvasElement.prototype.toDataURL;

      mockDrawImage = vi.fn();
      mockContext2d = {
        drawImage: mockDrawImage,
        imageSmoothingEnabled: false,
        imageSmoothingQuality: 'low',
      };

      // Mock canvas getContext and toDataURL
      HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((contextId) => {
        if (contextId === '2d') return mockContext2d;
        return null;
      });

      HTMLCanvasElement.prototype.toDataURL = vi
        .fn()
        .mockImplementation((type: string) => {
          if (type === 'image/webp') {
            return 'data:image/webp;base64,UklGRk4AAABXRUJQVlA4IDoAAADwAQCdASo';
          }
          return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD';
        });

      // Mock Image loading
      vi.spyOn(globalThis, 'Image').mockImplementation(() => {
        const img: any = {
          width: 3000,
          height: 4000,
          naturalWidth: 3000,
          naturalHeight: 4000,
          src: '',
          onload: null,
          onerror: null,
        };
        setTimeout(() => {
          if (img.onload) img.onload();
        }, 10);
        return img;
      });
    });

    afterEach(() => {
      HTMLCanvasElement.prototype.getContext = originalGetContext;
      HTMLCanvasElement.prototype.toDataURL = originalToDataURL;
      vi.restoreAllMocks();
    });

    it('compresses high-res image and returns WebP data URL scaled to max 1000px', async () => {
      const file = new File(['fake-binary-data'], 'factura_gasolina.jpg', { type: 'image/jpeg' });
      const resultDataUrl = await comprimirImagen(file, 1000, 1000, 0.75);

      expect(resultDataUrl).toContain('data:image/webp;base64');
      // Verify drawImage was called with scaled dimensions 750 x 1000
      expect(mockDrawImage).toHaveBeenCalledTimes(1);
      const callArgs = mockDrawImage.mock.calls[0];
      expect(callArgs[3]).toBe(750);
      expect(callArgs[4]).toBe(1000);
    });

    it('falls back to JPEG if WebP is not returned by canvas', async () => {
      HTMLCanvasElement.prototype.toDataURL = vi.fn().mockImplementation((type: string) => {
        if (type === 'image/webp') {
          // Browser returns empty or fallback
          return 'data:image/jpeg;base64,fallback-jpeg';
        }
        return 'data:image/jpeg;base64,fallback-jpeg';
      });

      const file = new File(['fake-binary-data'], 'factura.png', { type: 'image/png' });
      const resultDataUrl = await comprimirImagen(file);

      expect(resultDataUrl).toBe('data:image/jpeg;base64,fallback-jpeg');
    });

    it('rejects when no file is passed', async () => {
      // @ts-expect-error test missing file
      await expect(comprimirImagen(null)).rejects.toThrow('No se proporcionó ningún archivo');
    });

    it('rejects when canvas 2d context is unavailable', async () => {
      HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(null);

      const file = new File(['fake-binary-data'], 'factura.jpg', { type: 'image/jpeg' });
      await expect(comprimirImagen(file)).rejects.toThrow('No se pudo obtener el contexto 2D del Canvas');
    });
  });
});
