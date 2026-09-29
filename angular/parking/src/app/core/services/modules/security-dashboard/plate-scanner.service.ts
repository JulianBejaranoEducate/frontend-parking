import { Injectable } from '@angular/core';

/**
 * Resultado de un escaneo de placa.
 *
 * @property plate El texto de la placa, normalizado a mayúsculas y sin espacios.
 * @property raw El texto crudo que devolvió el OCR antes de extraer la placa.
 */
export interface PlateResult {
  plate: string;
  raw: string;
}

/**
 * Servicio para escanear placas de motocicletas con la cámara nativa del
 * dispositivo y reconocimiento de texto local mediante ML Kit (Fase 4, ADR-016).
 *
 * Usa `@capacitor/camera` para capturar la foto y
 * `@capacitor-mlkit/text-recognition` para el OCR en el dispositivo, sin
 * enviar la imagen a ningún servidor externo.
 *
 * El servicio se carga de forma dinámica (`import()`) para no inflar el
 * paquete inicial de la PWA: los módulos de Capacitor solo se descargan al
 * usar el botón de escaneo.
 *
 * Si Capacitor no está disponible (por ejemplo, en el navegador sin la shell
 * nativa), los métodos lanzan un error con un mensaje listo para mostrar.
 */
@Injectable({ providedIn: 'root' })
export class PlateScannerService {
  /**
   * Expresión regular para placas colombianas:
   * - Motos actuales: 3 letras + 2 dígitos + 1 letra (ABC12D).
   * - Motos/vehículos antiguos: 3 letras + 3 dígitos (ABC123).
   *
   * Admite separadores opcionales (espacios, guiones, puntos) entre bloques
   * porque el OCR puede introducirlos.
   */
  private readonly PLATE_REGEX = /[A-Z]{3}\s*[-.]?\s*\d{2}\s*[-.]?\s*[A-Z0-9]/g;

  /**
   * Abre la cámara nativa, toma una foto de la placa y ejecuta el OCR local.
   *
   * @returns La placa detectada y normalizada, o `null` si no se encontró
   *          un patrón válido de placa colombiana en la imagen.
   * @throws Error con mensaje para el usuario si la cámara falla, se cancela
   *         la foto o ML Kit no está disponible.
   */
  async scanPlate(): Promise<PlateResult | null> {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');

    let imagePath: string;

    try {
      const photo = await Camera.getPhoto({
        quality: 70,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
      });

      if (!photo.path) {
        throw new Error('No se obtuvo la ruta de la foto.');
      }

      imagePath = photo.path;
    } catch (error) {
      throw new Error(this.describeCameraError(error));
    }

    let rawText: string;

    try {
      const { TextRecognition } = await import('@capacitor-mlkit/text-recognition');

      const result = await TextRecognition.processImage({ path: imagePath });
      rawText = result.blocks.map((block: { text: string }) => block.text).join(' ');
    } catch (error) {
      throw new Error(this.describeOcrError(error));
    }

    return this.extractPlateNumber(rawText);
  }

  /**
   * Extrae una placa colombiana del texto crudo que devuelve el OCR.
   *
   * Normaliza el texto (mayúsculas, sin espacios ni guiones) y busca el
   * primer patrón que coincida con el formato de placa. Aplica correcciones
   * por posición para las confusiones típicas del OCR:
   * - Posiciones 1–3 y 6 son letras: 0→O, 8→B, 1→I, 5→S.
   * - Posiciones 4–5 son dígitos: O→0, B→8, I→1, S→5.
   *
   * @param text Texto crudo del OCR.
   * @returns La placa y el texto crudo, o `null` si no se encontró patrón.
   */
  extractPlateNumber(text: string): PlateResult | null {
    // Limpia todo lo que no sea alfanumérico y pasa a mayúsculas.
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '');

    // Busca coincidencias en el texto limpio.
    const matches = cleaned.match(this.PLATE_REGEX);

    if (!matches || matches.length === 0) {
      return null;
    }

    // Toma la primera coincidencia y la normaliza.
    let plate = matches[0].replace(/[\s\-.]/g, '').toUpperCase();

    // Correcciones por posición para confusiones típicas del OCR.
    plate = this.correctByPosition(plate);

    return { plate, raw: text };
  }

  /**
   * Corrige confusiones típicas del OCR según la posición del carácter
   * en la placa colombiana (ver ADR-016 y especificación 4.5).
   *
   * Posiciones 0–2 y 5 son letras; posiciones 3–4 son dígitos.
   */
  private correctByPosition(plate: string): string {
    const chars = plate.split('');

    const letterFixes: Record<string, string> = { '0': 'O', '8': 'B', '1': 'I', '5': 'S' };
    const digitFixes: Record<string, string> = { O: '0', B: '8', I: '1', S: '5' };

    // Posiciones de letras: 0, 1, 2 y opcionalmente 5 (formato actual ABC12D).
    for (const i of [0, 1, 2]) {
      if (chars[i] && letterFixes[chars[i]]) {
        chars[i] = letterFixes[chars[i]];
      }
    }

    // Posiciones de dígitos: 3 y 4.
    for (const i of [3, 4]) {
      if (chars[i] && digitFixes[chars[i]]) {
        chars[i] = digitFixes[chars[i]];
      }
    }

    // Posición 5: si existe, es letra en formato actual o dígito en formato antiguo.
    if (chars[5]) {
      if (/[A-Z]/.test(chars[5]) || letterFixes[chars[5]]) {
        // Formato actual (ABC12D): posición 5 es letra.
        if (letterFixes[chars[5]]) {
          chars[5] = letterFixes[chars[5]];
        }
      }
      // Si es dígito en formato antiguo (ABC123), se deja como está.
    }

    return chars.join('');
  }

  /** Traduce errores de la cámara de Capacitor a mensajes comprensibles. */
  private describeCameraError(error: unknown): string {
    const message = (error as { message?: string })?.message ?? '';

    if (/cancel/i.test(message) || /user denied/i.test(message)) {
      return 'Se canceló la captura de la foto.';
    }

    if (/permission/i.test(message) || /denied/i.test(message)) {
      return 'No hay permiso para usar la cámara. Habilítalo en los ajustes del dispositivo.';
    }

    if (/not available/i.test(message) || /not implemented/i.test(message)) {
      return 'El escaneo de placas solo funciona en la app nativa instalada en el celular. Desde el navegador, escribe la placa en el campo de texto.';
    }

    return message || 'No pudimos abrir la cámara para escanear la placa.';
  }

  /** Traduce errores de ML Kit a mensajes comprensibles. */
  private describeOcrError(error: unknown): string {
    const message = (error as { message?: string })?.message ?? '';

    if (/not available/i.test(message) || /not implemented/i.test(message)) {
      return 'El reconocimiento de texto no está disponible en este dispositivo. Escribe la placa manualmente.';
    }

    return message || 'No pudimos leer el texto de la imagen. Intenta tomar otra foto con mejor iluminación.';
  }
}
