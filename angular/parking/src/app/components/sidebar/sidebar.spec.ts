import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { USER_NAVIGATION_ITEMS } from '../main-dashboard/user-navigation';
import { Sidebar } from './sidebar';

describe('Sidebar', () => {
  let component: Sidebar;
  let fixture: ComponentFixture<Sidebar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Sidebar);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('items', USER_NAVIGATION_ITEMS);
    await fixture.whenStable();
  });

  const host = () => fixture.nativeElement as HTMLElement;

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('lista las opciones que recibe', () => {
    const labels = [...host().querySelectorAll('.menu__label')].map((item) => item.textContent?.trim());

    expect(labels).toEqual(['Registrar vehículo', 'Parqueaderos', 'Estadísticas']);
  });

  it('sin opciones no muestra ningún menú, ni siquiera el de otro rol', async () => {
    fixture.componentRef.setInput('items', []);
    await fixture.whenStable();

    expect(host().querySelectorAll('.menu__item')).toHaveLength(0);
  });

  it('las opciones con ruta son enlaces reales', () => {
    const link = host().querySelector<HTMLAnchorElement>('a.menu__item');

    expect(link?.textContent).toContain('Registrar vehículo');
    expect(link?.getAttribute('href')).toBe('/vehiculos/registrar');
  });

  it('una opción sin ruta marca la selección y avisa para que el cajón se cierre en móvil', async () => {
    let closedCount = 0;
    component.closed.subscribe(() => (closedCount += 1));

    const button = host().querySelector<HTMLButtonElement>('button.menu__item');
    button?.click();
    await fixture.whenStable();

    expect(button?.classList.contains('menu__item--active')).toBe(true);
    expect(button?.getAttribute('aria-current')).toBe('page');
    expect(closedCount).toBe(1);
  });

  it('muestra contadores y un contexto cuando el rol los aporta', async () => {
    fixture.componentRef.setInput('context', 'Administración');
    fixture.componentRef.setInput('items', [
      { id: 'pendientes', label: 'Pendientes', icon: 'M0 0h24v24H0z', route: '/admin/pendientes', badge: 4, badgeLabel: 'por revisar' },
    ]);
    await fixture.whenStable();

    expect(host().querySelector('.sidebar__context')?.textContent?.trim()).toBe('Administración');
    expect(host().querySelector('.menu__badge')?.textContent?.trim()).toBe('4');
    expect(host().querySelector('.menu__item .sr-only')?.textContent?.trim()).toBe('(4 por revisar)');
  });

  it('no muestra el logo: la identidad ya la lleva el nombre del producto', () => {
    expect(host().querySelector('img')).toBeNull();
    expect(host().querySelector('.sidebar__product')?.textContent?.trim()).toBe('Uni-parking');
  });

  it('queda oculto para lectores de pantalla mientras está cerrado', async () => {
    fixture.componentRef.setInput('open', false);
    await fixture.whenStable();

    const aside = host().querySelector('.sidebar');
    expect(aside?.getAttribute('aria-hidden')).toBe('true');
    expect(aside?.classList.contains('sidebar--open')).toBe(false);
  });
});
