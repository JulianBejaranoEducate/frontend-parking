import { ComponentFixture, TestBed } from '@angular/core/testing';
import { type ScanOptions, ScannerService } from '../../core/services/scanner.service';
import { LectorCodigoQr } from './lector-codigo-qr';

/** Cámara simulada: jsdom no tiene getUserMedia y las pruebas no deben pedir permisos. */
class ScannerStub {
  onRead?: (value: string) => void;
  stops = 0;
  failure: Error | null = null;
  torch = false;
  photoText = '  token-desde-foto  ';

  async start(options: ScanOptions): Promise<void> {
    if (this.failure) {
      throw this.failure;
    }

    this.onRead = options.onRead;
  }

  async stop(): Promise<void> {
    this.stops += 1;
  }

  torchAvailable(): boolean {
    return this.torch;
  }

  async toggleTorch(): Promise<boolean> {
    return true;
  }

  async decodeImage(): Promise<string> {
    if (this.failure) {
      throw this.failure;
    }

    return this.photoText;
  }
}

describe('LectorCodigoQr', () => {
  let fixture: ComponentFixture<LectorCodigoQr>;
  let scanner: ScannerStub;
  let reads: string[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LectorCodigoQr],
      providers: [{ provide: ScannerService, useClass: ScannerStub }],
    }).compileComponents();

    scanner = TestBed.inject(ScannerService) as unknown as ScannerStub;
    fixture = TestBed.createComponent(LectorCodigoQr);
    reads = [];
    fixture.componentInstance.read.subscribe((value) => reads.push(value));
    await fixture.whenStable();
  });

  const host = () => fixture.nativeElement as HTMLElement;
  const overlayActive = () => host().querySelector('.overlay')?.classList.contains('overlay--active');

  const startCamera = async () => {
    host().querySelector<HTMLButtonElement>('.reader__start')!.click();
    await fixture.whenStable();
  };

  it('la capa de la cámara está oculta hasta que se enciende', () => {
    expect(overlayActive()).toBe(false);
    expect(host().querySelector('.overlay')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('entrega solo el primer código leído y apaga la cámara', async () => {
    await startCamera();
    expect(overlayActive()).toBe(true);

    scanner.onRead!('token-1');
    scanner.onRead!('token-1');
    await fixture.whenStable();

    expect(reads).toEqual(['token-1']);
    expect(overlayActive()).toBe(false);
    expect(scanner.stops).toBeGreaterThan(0);
  });

  it('si la cámara no enciende, explica el motivo', async () => {
    scanner.failure = new Error('No hay permiso para usar la cámara.');

    await startCamera();

    expect(host().querySelector('.reader__error')?.textContent).toContain('No hay permiso para usar la cámara.');
    expect(overlayActive()).toBe(false);
  });

  it('la linterna solo aparece si la cámara la permite', async () => {
    scanner.torch = true;

    await startCamera();

    expect(host().querySelector('.overlay__actions')?.textContent).toContain('Encender linterna');
  });

  it('lee el código desde una foto cuando la cámara no sirve', async () => {
    const input = { files: [new File(['x'], 'pase.png', { type: 'image/png' })], value: 'pase.png' };

    await (fixture.componentInstance as unknown as { readFromPhoto: (event: Event) => Promise<void> }).readFromPhoto({
      target: input,
    } as unknown as Event);

    expect(reads).toEqual(['token-desde-foto']);
    // Se limpia para poder elegir la misma foto otra vez.
    expect(input.value).toBe('');
  });

  it('apaga la cámara al salir de la pantalla', () => {
    const before = scanner.stops;

    fixture.destroy();

    expect(scanner.stops).toBe(before + 1);
  });
});
