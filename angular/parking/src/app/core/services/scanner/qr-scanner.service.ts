import { Injectable } from '@angular/core';
import type { IScannerControls } from '@zxing/browser';

/**
 * Lado mayor, en píxeles, al que se reduce una foto antes de buscar el QR, en
 * orden de intento. Una foto de celular trae 12 MP o más, y a ese tamaño la
 * rejilla de píxeles de una pantalla fotografiada confunde a ZXing: reducirla
 * con suavizado la borra y además lee más rápido.
 */
const PHOTO_SIDES = [1024, 1600, 640];

/** Copia la imagen en un lienzo nuevo del tamaño pedido, con suavizado de alta calidad. */
function drawScaled(source: CanvasImageSource, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');

  if (context) {
    context.imageSmoothingQuality = 'high';
    context.drawImage(source, 0, 0, width, height);
  }

  return canvas;
}

/** Configuración con la que una pantalla enciende la cámara. */
export interface ScanOptions {
  /** Elemento donde se ve la cámara mientras busca el código. */
  video: HTMLVideoElement;
  /** Se llama con cada código detectado; quien lo usa decide cuándo detenerse. */
  onRead: (value: string) => void;
}

/**
 * Único punto de acceso a la cámara para leer códigos QR (ADR-012 y ADR-016).
 *
 * Basado en el `EscanerService` del proyecto `lector-codigo`. En la PWA lee con
 * ZXing sobre `getUserMedia`, que se carga solo cuando se enciende la cámara.
 * Si el proyecto adopta Capacitor (ADR-015), aquí se sumaría la rama nativa con
 * ML Kit (`@capacitor-mlkit/barcode-scanning`) sin cambiar las pantallas.
 */
@Injectable({ providedIn: 'root' })
export class QrScannerService {
  private controls?: IScannerControls;
  private torchOn = false;
  /** Identifica el encendido actual de la cámara para descartar respuestas viejas. */
  private session = 0;

  /** true si el navegador permite pedir la cámara (exige HTTPS o localhost). */
  get supported(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function';
  }

  /**
   * Enciende la cámara trasera y empieza a buscar códigos QR.
   *
   * @throws Error con un mensaje listo para mostrar si no hay cámara o permiso.
   */
  async start({ video, onRead }: ScanOptions): Promise<void> {
    await this.stop();
    const session = ++this.session;

    if (!this.supported) {
      throw new Error('Este navegador no permite usar la cámara. Usa «Leer desde una foto».');
    }

    try {
      const reader = await this.createReader();
      const controls = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' } } },
        video,
        (result) => {
          // ZXing reporta un error en cada cuadro sin código: solo interesa el resultado.
          if (result && session === this.session) {
            onRead(result.getText());
          }
        },
      );

      // La cámara puede tardar en abrir: si mientras tanto se detuvo, se cierra.
      if (session !== this.session) {
        controls.stop();
        return;
      }

      this.controls = controls;
    } catch (error) {
      await this.stop();
      throw new Error(this.describe(error));
    }
  }

  /** Apaga la cámara y libera el video. */
  async stop(): Promise<void> {
    this.session++;
    this.torchOn = false;
    this.controls?.stop();
    this.controls = undefined;
  }

  /** true si la cámara encendida permite prender la linterna. */
  torchAvailable(): boolean {
    return typeof this.controls?.switchTorch === 'function';
  }

  /**
   * Prende o apaga la linterna.
   *
   * @returns El estado en que quedó.
   */
  async toggleTorch(): Promise<boolean> {
    this.torchOn = !this.torchOn;
    await this.controls?.switchTorch?.(this.torchOn);
    return this.torchOn;
  }

  /**
   * Lee un código QR desde una foto, cuando la cámara en vivo no funciona (ADR-019).
   *
   * @param image Foto tomada con la cámara del celular o elegida de la galería.
   * @returns El texto del código.
   * @throws Error si la foto no tiene un código QR legible.
   */
  async decodeImage(image: Blob): Promise<string> {
    const [{ BrowserQRCodeReader }, { DecodeHintType }] = await Promise.all([
      import('@zxing/browser'),
      import('@zxing/library'),
    ]);
    const reader = new BrowserQRCodeReader(new Map([[DecodeHintType.TRY_HARDER, true]]));
    // null si el formato no se puede abrir (p. ej. HEIC): termina en el mismo aviso.
    const photo = await createImageBitmap(image).catch(() => null);

    if (photo) {
      try {
        for (const side of PHOTO_SIDES) {
          try {
            return reader.decodeFromCanvas(this.shrink(photo, side)).getText();
          } catch {
            // Sin código a este tamaño: se prueba el siguiente.
          }
        }
      } finally {
        photo.close();
      }
    }

    throw new Error('No encontramos un código QR legible en la foto. Acércate más y evita reflejos.');
  }

  /**
   * Reduce la foto para que su lado mayor mida `maxSide`. Va a la mitad
   * mientras sobre el doble: así el suavizado promedia la imagen en vez de
   * saltarse píxeles, que es lo que dejaría la rejilla de la pantalla.
   */
  private shrink(photo: ImageBitmap, maxSide: number): HTMLCanvasElement {
    let current: CanvasImageSource = photo;
    let { width, height } = photo;

    while (Math.max(width, height) / 2 >= maxSide) {
      width = Math.round(width / 2);
      height = Math.round(height / 2);
      current = drawScaled(current, width, height);
    }

    const scale = Math.min(1, maxSide / Math.max(width, height));
    return drawScaled(current, Math.round(width * scale), Math.round(height * scale));
  }

  private async createReader() {
    const { BrowserQRCodeReader } = await import('@zxing/browser');
    return new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 150 });
  }

  /** Traduce los errores de la cámara a mensajes que entiende cualquier persona. */
  private describe(error: unknown): string {
    const name = (error as { name?: string })?.name ?? '';
    const message = (error as { message?: string })?.message ?? '';

    if (name === 'NotAllowedError' || /denied|permission/i.test(message)) {
      return 'No hay permiso para usar la cámara. Habilítalo en el navegador o usa «Leer desde una foto».';
    }

    if (name === 'NotFoundError' || name === 'OverconstrainedError') {
      return 'No encontramos una cámara en este dispositivo. Usa «Leer desde una foto».';
    }

    if (name === 'NotReadableError') {
      return 'Otra aplicación está usando la cámara. Ciérrala e intenta de nuevo.';
    }

    return message || 'No pudimos encender la cámara.';
  }
}
