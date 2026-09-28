import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { timeAgo } from '../../core/models/notification';
import { Notifications } from './notifications';

describe('Notifications', () => {
  let component: Notifications;
  let fixture: ComponentFixture<Notifications>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Notifications],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Notifications);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  const host = () => fixture.nativeElement as HTMLElement;
  const trigger = () => host().querySelector<HTMLButtonElement>('.bell__trigger')!;
  const panel = () => host().querySelector('.panel');

  const openPanel = async () => {
    trigger().click();
    await fixture.whenStable();
  };

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('todavía no hay avisos: sin insignia y con el mensaje de vacío', async () => {
    expect(host().querySelector('.bell__badge')).toBeNull();
    expect(trigger().getAttribute('aria-label')).toBe('Notificaciones');

    await openPanel();

    expect(host().querySelector('.panel__empty')?.textContent?.trim()).toBe('No tiene notificaciones pendientes');
  });

  it('el panel está cerrado hasta pulsar la campana', async () => {
    expect(panel()).toBeNull();

    await openPanel();

    expect(panel()).toBeTruthy();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(host().querySelector('.panel__title')?.textContent?.trim()).toBe('Notificaciones');
  });

  it('incluye el botón de configuración de notificaciones', async () => {
    await openPanel();

    expect(host().querySelector('[aria-label="Configuración de notificaciones"]')).toBeTruthy();
  });

  it('se cierra con Escape', async () => {
    await openPanel();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();

    expect(panel()).toBeNull();
  });

  it('se cierra al pulsar fuera del panel', async () => {
    await openPanel();

    document.body.click();
    await fixture.whenStable();

    expect(panel()).toBeNull();
  });
});

describe('timeAgo', () => {
  const now = new Date('2026-09-13T12:00:00');
  const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60_000);

  it('expresa el tiempo transcurrido de forma legible', () => {
    expect(timeAgo(minutesAgo(0), now)).toBe('ahora');
    expect(timeAgo(minutesAgo(45), now)).toBe('hace 45 min');
    expect(timeAgo(minutesAgo(125), now)).toBe('hace 2 h');
    expect(timeAgo(minutesAgo(60 * 27), now)).toBe('hace 1 día');
    expect(timeAgo(minutesAgo(60 * 24 * 3), now)).toBe('hace 3 días');
  });
});
