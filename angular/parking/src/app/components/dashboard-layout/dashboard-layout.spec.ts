import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideDashboardNavigation } from '../../core/navigation/dashboard-navigation';
import { DashboardLayout } from './dashboard-layout';

describe('DashboardLayout', () => {
  let fixture: ComponentFixture<DashboardLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardLayout],
      providers: [
        provideRouter([]),
        provideDashboardNavigation(() => ({
          context: 'Pruebas',
          items: signal([{ id: 'uno', label: 'Opción de prueba', icon: 'M0 0h24v24H0z', route: '/uno' }]),
        })),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardLayout);
    await fixture.whenStable();
  });

  const host = () => fixture.nativeElement as HTMLElement;

  it('pinta el menú y el contexto que aporta el grupo de rutas, y nada más', () => {
    const labels = [...host().querySelectorAll('.menu__label')].map((item) => item.textContent?.trim());

    expect(labels).toEqual(['Opción de prueba']);
    expect(host().querySelector('.sidebar__context')?.textContent?.trim()).toBe('Pruebas');
  });

  it('incluye el header y el lugar donde se pinta cada dashboard', () => {
    expect(host().querySelector('app-header')).toBeTruthy();
    expect(host().querySelector('router-outlet')).toBeTruthy();
  });

  it('la hamburguesa abre y cierra el menú', async () => {
    const shell = () => host().querySelector('.shell')!;
    const before = shell().classList.contains('shell--menu-open');

    host().querySelector<HTMLButtonElement>('app-header .icon-btn')?.click();
    await fixture.whenStable();

    expect(shell().classList.contains('shell--menu-open')).toBe(!before);
  });

  it('sin buscador propio, el header muestra el texto genérico', () => {
    expect(host().querySelector<HTMLInputElement>('.topbar__center .search__input')?.placeholder).toBe('Buscar');
  });
});

describe('DashboardLayout con buscador', () => {
  it('muestra la ayuda del grupo de rutas y le entrega lo que se busca', async () => {
    const queries: string[] = [];

    await TestBed.configureTestingModule({
      imports: [DashboardLayout],
      providers: [
        provideRouter([]),
        provideDashboardNavigation(() => ({
          context: 'Pruebas',
          items: signal([]),
          search: { placeholder: 'Buscar placa o documento', submit: (query) => queries.push(query) },
        })),
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(DashboardLayout);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    const input = host.querySelector<HTMLInputElement>('.topbar__center .search__input')!;

    expect(input.placeholder).toBe('Buscar placa o documento');

    input.value = '  KZT45F ';
    host.querySelector('.topbar__center form')!.dispatchEvent(new Event('submit'));

    expect(queries).toEqual(['KZT45F']);
  });
});
