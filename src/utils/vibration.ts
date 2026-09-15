/**
 * Utilidades de respuesta háptica (vibración) para operaciones rápidas en calle.
 */

export function vibrarExito(): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate([30]);
    }
  } catch {
    // Ignorar si el navegador bloquea la vibración
  }
}

export function vibrarAlerta(): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate([60, 40, 60]);
    }
  } catch {
    // Ignorar si el navegador bloquea la vibración
  }
}
