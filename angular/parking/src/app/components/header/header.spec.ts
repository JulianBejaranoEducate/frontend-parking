import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Header } from './header';

describe('Header', () => {
  let component: Header;
  let fixture: ComponentFixture<Header>;
  let auth: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Header],
      providers: [provideRouter([])],
    }).compileComponents();

    auth = TestBed.inject(AuthService);
    fixture = TestBed.createComponent(Header);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  const host = () => fixture.nativeElement as HTMLElement;

  const api = () =>
    component as unknown as {
      profileOpen: () => boolean;
      searchExpanded: () => boolean;
      toggleProfile: () => void;
      expandSearch: () => void;
      affiliationLine: () => string | null;
      initials: () => string;
      submitSearch: (event: Event, value: string) => void;
    };

  const signIn = (extra: Record<string, unknown> = {}) => {
    (auth as unknown as { _user: { set: (value: unknown) => void } })._user.set({
      uid: 'u1',
      displayName: 'Julian Bejarano',
      email: 'julian.bejarano@uniempresarial.edu.co',
      photoUrl: null,
      role: 'user',
      affiliation: 'estudiante',
      program: 'Administración de Empresas',
      ...extra,
    });
  };

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('no muestra micrófono ni botón de crear, solo búsqueda, notificaciones y cuenta', () => {
    const labels = [...host().querySelectorAll('button')].map((b) => b.getAttribute('aria-label'));

    expect(labels).toContain('Buscar');
    expect(labels).toContain('Notificaciones');
    expect(labels).toContain('Cuenta');
    expect(host().textContent).not.toContain('Create');
  });

  it('el menú de cuenta está cerrado hasta que se pulsa el avatar', async () => {
    expect(host().querySelector('.account')).toBeNull();

    api().toggleProfile();
    await fixture.whenStable();

    expect(host().querySelector('.account')).toBeTruthy();
    expect(host().querySelector('.avatar-btn')?.getAttribute('aria-expanded')).toBe('true');
  });

  it('muestra nombre, correo y vínculo institucional en el menú', async () => {
    signIn();
    api().toggleProfile();
    await fixture.whenStable();

    expect(host().querySelector('.account__name')?.textContent?.trim()).toBe('Julian Bejarano');
    expect(host().querySelector('.account__email')?.textContent?.trim()).toBe(
      'julian.bejarano@uniempresarial.edu.co',
    );
    expect(host().querySelector('.account__affiliation')?.textContent?.trim()).toBe(
      'Estudiante · Administración de Empresas',
    );
  });

  it('omite la línea de vínculo cuando el directorio no la informa', async () => {
    signIn({ affiliation: null, program: null });
    api().toggleProfile();
    await fixture.whenStable();

    expect(api().affiliationLine()).toBeNull();
    expect(host().querySelector('.account__affiliation')).toBeNull();
  });

  it('cierra sesión y termina el menú con esa opción', async () => {
    signIn();
    api().toggleProfile();
    await fixture.whenStable();

    const items = [...host().querySelectorAll('.account__item')].map((i) => i.textContent?.trim());
    expect(items).toEqual(['Configuración', 'Cerrar sesión']);
  });

  it('avisa al contenedor cuando se pulsa la hamburguesa', () => {
    let toggles = 0;
    component.menuToggled.subscribe(() => (toggles += 1));

    host().querySelector<HTMLButtonElement>('.icon-btn')?.click();

    expect(toggles).toBe(1);
  });

  it('emite la búsqueda solo cuando hay texto', () => {
    const queries: string[] = [];
    component.searched.subscribe((q) => queries.push(q));
    const event = new Event('submit');

    api().submitSearch(event, '   ');
    api().submitSearch(event, '  KZT45F  ');

    expect(queries).toEqual(['KZT45F']);
  });
});
