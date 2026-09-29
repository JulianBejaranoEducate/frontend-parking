import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { BRAND } from '../../core/config/branding.config';
import { signInForTest } from '../../testing/demo-session';
import { Login } from './login';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;

  const create = async () => {
    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  const host = () => fixture.nativeElement as HTMLElement;

  it('should create', async () => {
    await create();
    expect(component).toBeTruthy();
  });

  it('muestra el nombre del producto y la organización de la marca activa', async () => {
    await create();
    const text = host().textContent ?? '';

    expect(text).toContain(BRAND.productName);
    expect(text).toContain(BRAND.organizationName);
  });

  it('expone las dos acciones de acceso', async () => {
    await create();

    expect(host().querySelector('.btn--primary')?.textContent).toContain('Iniciar sesión');
    expect(host().querySelector('.btn--secondary')?.textContent).toContain('Visitantes');
  });

  it('en demostración permite entrar como administración o como cualquiera de los dos guardias', async () => {
    await create();
    const shortcuts = [...host().querySelectorAll('.demo__link')].map((link) => link.textContent?.trim());

    expect(shortcuts).toEqual(['Administración', 'Guardia Carlos', 'Guardia Diana']);
  });

  it('con la sesión abierta lleva directo al inicio del rol', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    signInForTest('security');

    await create();

    expect(navigate).toHaveBeenCalledWith('/seguridad/resumen');
  });
});
