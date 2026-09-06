import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SIDEBAR_ITEMS, Sidebar } from './sidebar';

describe('Sidebar', () => {
  let component: Sidebar;
  let fixture: ComponentFixture<Sidebar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Sidebar],
    }).compileComponents();

    fixture = TestBed.createComponent(Sidebar);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('lista las cuatro opciones iniciales del menú', () => {
    const labels = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.menu__item')].map(
      (item) => item.textContent?.trim(),
    );

    expect(labels).toEqual([
      'Registrar vehículo',
      'Parqueaderos',
      'Estadísticas',
      'Configuración',
    ]);
  });

  it('marca la opción elegida y avisa para que el cajón se cierre en móvil', async () => {
    let closedCount = 0;
    component.closed.subscribe(() => (closedCount += 1));

    const first = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.menu__item');
    first?.click();
    await fixture.whenStable();

    expect(first?.classList.contains('menu__item--active')).toBe(true);
    expect(first?.getAttribute('aria-current')).toBe('page');
    expect(closedCount).toBe(1);
  });

  it('queda oculto para lectores de pantalla mientras está cerrado', async () => {
    fixture.componentRef.setInput('open', false);
    await fixture.whenStable();

    const aside = (fixture.nativeElement as HTMLElement).querySelector('.sidebar');
    expect(aside?.getAttribute('aria-hidden')).toBe('true');
    expect(aside?.classList.contains('sidebar--open')).toBe(false);
  });

  it('expone las opciones como dato reutilizable por otras pantallas', () => {
    expect(SIDEBAR_ITEMS.map((item) => item.id)).toEqual([
      'registrar-vehiculo',
      'parqueaderos',
      'estadisticas',
      'configuracion',
    ]);
  });
});
