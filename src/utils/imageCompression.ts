/**
 * Utilidad de compresión y validación de comprobantes y fotos de facturas en el cliente.
 * Reduce fotos de alta resolución tomadas por teléfonos móviles (4MB - 10MB)
 * a un tamaño óptimo (<120KB) en formato WebP / JPEG base64 Data URL,
 * protegiendo los límites de almacenamiento de IndexedDB y garantizando rendimiento offline.
 */

export function validarEsImagen(file: File): boolean {
  if (!file) return false;
  if (file.type && file.type.startsWith('image/')) return true;
  const extensionesValidas = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.heic', '.heif'];
  const nombre = file.name ? file.name.toLowerCase() : '';
  return extensionesValidas.some((ext) => nombre.endsWith(ext));
}

export function calcularDimensionesProporcionales(
  width: number,
  height: number,
  maxWidth = 1000,
  maxHeight = 1000
): { width: number; height: number } {
  if (width <= 0 || height <= 0) {
    return { width: Math.max(1, width || 1), height: Math.max(1, height || 1) };
  }
  if (width <= maxWidth && height <= maxHeight) {
    return { width: Math.round(width), height: Math.round(height) };
  }
  const ratio = Math.min(maxWidth / width, maxHeight / height);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

export function estimarTamanoBytes(dataUrl: string): number {
  const base64Index = dataUrl.indexOf(';base64,');
  if (base64Index === -1) return dataUrl.length;
  const base64Length = dataUrl.length - (base64Index + 8);
  return Math.round(base64Length * 0.75);
}

/**
 * Comprime una imagen a máx 1000x1000px y calidad 0.75 usando HTML5 Canvas.
 * Retorna un Data URL (WebP o JPEG).
 */
export async function comprimirImagen(
  file: File | Blob,
  maxWidth = 1000,
  maxHeight = 1000,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('No se proporcionó ningún archivo de imagen'));
    }

    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo de imagen'));
    };

    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();

      img.onerror = () => {
        reject(new Error('Error al decodificar la imagen'));
      };

      img.onload = () => {
        try {
          const imgWidth = img.naturalWidth || img.width;
          const imgHeight = img.naturalHeight || img.height;

          const { width, height } = calcularDimensionesProporcionales(
            imgWidth,
            imgHeight,
            maxWidth,
            maxHeight
          );

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return reject(new Error('No se pudo obtener el contexto 2D del Canvas'));
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Intentar WebP primero, si el navegador no lo soporta retorna JPEG
          let resultDataUrl = '';
          try {
            resultDataUrl = canvas.toDataURL('image/webp', quality);
            if (!resultDataUrl || !resultDataUrl.startsWith('data:image/webp')) {
              resultDataUrl = canvas.toDataURL('image/jpeg', quality);
            }
          } catch {
            resultDataUrl = canvas.toDataURL('image/jpeg', quality);
          }

          // Si el tamaño aún excede 120KB (~160,000 chars) y la calidad > 0.4, comprimir más agresivo
          const maxCaracteres = 160000;
          if (resultDataUrl.length > maxCaracteres && quality > 0.4) {
            try {
              const lowerQualityUrl = canvas.toDataURL(
                resultDataUrl.startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg',
                0.5
              );
              if (lowerQualityUrl && lowerQualityUrl.length < resultDataUrl.length) {
                resultDataUrl = lowerQualityUrl;
              }
            } catch {
              // fallback al original
            }
          }

          resolve(resultDataUrl);
        } catch (error) {
          reject(error);
        }
      };

      img.src = dataUrl;
    };

    reader.readAsDataURL(file);
  });
}
