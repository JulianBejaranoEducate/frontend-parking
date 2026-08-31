import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BRAND } from '../../core/config/branding.config';
import { Login } from './login';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('muestra el nombre del producto y el dominio institucional de la marca activa', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain(BRAND.productName);
    expect(text).toContain(BRAND.emailDomain);
  });

  it('expone las dos acciones de acceso', () => {
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('.btn--primary')?.textContent).toContain('Iniciar sesión');
    expect(host.querySelector('.btn--secondary')?.textContent).toContain('Visitantes');
  });
});
