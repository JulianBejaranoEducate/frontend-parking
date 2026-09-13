import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { timeAgo } from '../../core/models/notification';
import { NotificationService } from '../../core/services/notification.service';
import { signInForTest } from '../../testing/demo-session';
import { Notifications } from './notifications';

describe('Notifications', () => {
  let component: Notifications;
  let fixture: ComponentFixture<Notifications>;
  let service: NotificationService;

  const create = async (profile: 'user' | 'admin' | null) => {
    await TestBed.configureTestingModule({
      imports: [Notifications],
      providers: [provideRouter([])],
    }).compileComponents();

    signInForTest(profile);

    service = TestBed.inject(NotificationService);
    fixture = TestBed.createComponent(Notifications);
    component = fixture.componentInstance;
    await fixture.whenStable();
  };

  const host = () => fixture.nativeElement as HTMLElement;
  const trigger = () => host().querySelector<HTMLButtonElement>('.bell__trigger')!;
  const panel = () => host().querySelector('.panel');

  const openPanel = async () => {
    trigger().click();
    await fixture.whenStable();
  };

  describe('como estudiante', () => {
    beforeEach(() => create('user'));

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('la campana muestra cuántas notificaciones hay pendientes', () => {
      expect(host().querySelector('.bell__badge')?.textContent?.trim()).toBe('3');
      expect(trigger().getAttribute('aria-label')).toBe('Notificaciones, 3 pendientes');
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

    it('lista solo sus avisos, del más reciente al más antiguo', async () => {
      await openPanel();

      const titles = [...host().querySelectorAll('.note__title')].map((t) => t.textContent?.trim());
      expect(titles).toEqual(['Zona de scooters casi llena', 'Ingreso registrado', 'Vehículo en revisión']);
    });

    it('descartar un aviso lo quita sin cerrar el panel', async () => {
      await openPanel();

      host().querySelector<HTMLButtonElement>('.note__dismiss')?.click();
      await fixture.whenStable();

      expect(panel()).toBeTruthy();
      expect(host().querySelectorAll('.note')).toHaveLength(2);
      expect(host().querySelector('.bell__badge')?.textContent?.trim()).toBe('2');
    });

    it('sin notificaciones muestra el mensaje y oculta la insignia', async () => {
      for (const item of service.items()) {
        service.dismiss(item.id);
      }
      await openPanel();

      expect(host().querySelector('.panel__empty')?.textContent?.trim()).toBe(
        'No tiene notificaciones pendientes',
      );
      expect(host().querySelector('.bell__badge')).toBeNull();
      expect(trigger().getAttribute('aria-label')).toBe('Notificaciones');
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

  describe('como administración', () => {
    beforeEach(() => create('admin'));

    it('recibe los avisos del equipo y cada uno enlaza a la solicitud', async () => {
      await openPanel();

      const link = host().querySelector<HTMLAnchorElement>('a.note__link');
      expect(link?.textContent?.trim()).toBe('Nueva solicitud de registro');
      expect(link?.getAttribute('href')).toBe('/admin/pendientes?solicitud=reg-mnb67c');
    });
  });

  it('sin sesión no hay avisos', async () => {
    await create(null);

    expect(host().querySelector('.bell__badge')).toBeNull();
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
