import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { BRAND } from '../../core/config/branding.config';
import { provideFirebaseWithoutSession, signInForTest } from '../../testing/test-session';
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
      providers: [provideRouter([]), provideFirebaseWithoutSession()],
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

  it('no ofrece accesos de demostración: solo Microsoft y visitantes', async () => {
    await create();

    expect(host().querySelectorAll('button, a')).toHaveLength(2);
  });

  it('con la sesión abierta lleva directo al inicio del rol', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    signInForTest('security');

    await create();

    expect(navigate).toHaveBeenCalledWith('/seguridad/resumen');
  });
});
