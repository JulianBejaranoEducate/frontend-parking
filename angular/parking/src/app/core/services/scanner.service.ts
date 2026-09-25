import { Injectable } from '@angular/core';
import type { IScannerControls } from '@zxing/browser';

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
export class ScannerService {
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
    const url = URL.createObjectURL(image);

    try {
      const reader = await this.createReader();
      return (await reader.decodeFromImageUrl(url)).getText();
    } catch {
      throw new Error('No encontramos un código QR legible en la foto. Acércate más y evita reflejos.');
    } finally {
      URL.revokeObjectURL(url);
    }
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
