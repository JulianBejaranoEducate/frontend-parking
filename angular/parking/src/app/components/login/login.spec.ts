import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { BRAND } from '../../core/config/branding.config';
import { AuthService } from '../../core/services/auth.service';
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

  it('la acción principal es el registro de visitantes; no hay inicio de sesión de la comunidad', async () => {
    await create();

    expect(host().querySelector('.btn--primary')?.textContent).toContain('Visitantes');
    expect(host().textContent).not.toContain('Iniciar sesión');
  });

  it('el único acceso con cuenta es el de los dos guardias', async () => {
    await create();
    const shortcuts = [...host().querySelectorAll('.demo__link')].map((link) => link.textContent?.trim());

    expect(shortcuts).toEqual(['Guardia Carlos', 'Guardia Diana']);
  });

  it('entrar como guardia abre su sesión y lleva al panel de seguridad', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    await create();

    host().querySelector<HTMLButtonElement>('.demo__link')?.click();

    expect(TestBed.inject(AuthService).user()?.displayName).toBe('Carlos Ramírez');
    expect(navigate).toHaveBeenCalledWith('/seguridad/resumen');
  });

  it('con la sesión abierta lleva directo al inicio del rol', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    signInForTest('security');

    await create();

    expect(navigate).toHaveBeenCalledWith('/seguridad/resumen');
  });
});
