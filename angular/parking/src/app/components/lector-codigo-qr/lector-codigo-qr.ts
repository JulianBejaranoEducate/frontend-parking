import { Component, ElementRef, type OnDestroy, inject, input, output, signal, viewChild } from '@angular/core';
import { ScannerService } from '../../core/services/scanner.service';

/**
 * Lector de códigos QR reutilizable (Fase 3, ADR-012).
 *
 * Basado en el componente `lector` del proyecto `lector-codigo`: solo enciende
 * la cámara, detecta un código y lo entrega; la pantalla que lo usa decide qué
 * hacer con él. Si la cámara en vivo falla, permite leer el código desde una
 * foto (ADR-019).
 */
@Component({
  selector: 'app-lector-codigo-qr',
  styleUrl: './lector-codigo-qr.css',
  templateUrl: './lector-codigo-qr.html',
})
export class LectorCodigoQr implements OnDestroy {
  /** Texto de ayuda sobre la cámara. */
  readonly hint = input('Centra el código QR dentro del marco');
  /** Texto del botón que enciende la cámara. */
  readonly label = input('Escanear código QR');

  /** Se emite con el texto del primer código leído. */
  readonly read = output<string>();

  private readonly scanner = inject(ScannerService);
  private readonly video = viewChild.required<ElementRef<HTMLVideoElement>>('video');
  /** Evita emitir dos veces si la cámara detecta el mismo código en cuadros seguidos. */
  private handled = false;

  protected readonly scanning = signal(false);
  protected readonly starting = signal(false);
  protected readonly decoding = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly torchAvailable = signal(false);
  protected readonly torchOn = signal(false);

  /** Enciende la cámara y muestra la capa de escaneo. */
  protected async start(): Promise<void> {
    if (this.scanning() || this.starting()) {
      return;
    }

    this.error.set(null);
    this.starting.set(true);
    this.handled = false;

    try {
      await this.scanner.start({ video: this.video().nativeElement, onRead: (value) => this.handle(value) });

      // Si el código se leyó mientras la cámara terminaba de abrir, no hay nada que mostrar.
      if (this.handled) {
        await this.stop();
        return;
      }

      this.scanning.set(true);
      this.torchAvailable.set(this.scanner.torchAvailable());
    } catch (error) {
      this.error.set((error as Error).message);
      this.scanning.set(false);
    } finally {
      this.starting.set(false);
    }
  }

  /** Cierra la capa de escaneo en el acto y apaga la cámara. */
  protected async stop(): Promise<void> {
    this.scanning.set(false);
    this.torchOn.set(false);
    this.torchAvailable.set(false);
    await this.scanner.stop();
  }

  protected async toggleTorch(): Promise<void> {
    try {
      this.torchOn.set(await this.scanner.toggleTorch());
    } catch {
      this.torchAvailable.set(false);
    }
  }

  /** Plan B cuando la cámara en vivo no funciona: leer el código desde una foto. */
  protected async readFromPhoto(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // Permite volver a elegir la misma foto.
    input.value = '';

    if (!file) {
      return;
    }

    this.error.set(null);
    this.decoding.set(true);
    this.handled = false;

    try {
      this.handle(await this.scanner.decodeImage(file));
    } catch (error) {
      this.error.set((error as Error).message);
    } finally {
      this.decoding.set(false);
    }
  }

  ngOnDestroy(): void {
    void this.scanner.stop();
  }

  /** Toma el primer código, apaga la cámara y avisa a la pantalla. */
  private handle(value: string): void {
    const text = value.trim();

    if (this.handled || !text) {
      return;
    }

    this.handled = true;
    void this.stop();
    this.read.emit(text);
  }
}
