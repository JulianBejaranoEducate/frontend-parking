/**
 * Configuración de marca (white-label).
 *
 * Este es el ÚNICO archivo que un cliente necesita tocar para personalizar
 * el producto con su propia identidad: colores, logo, nombre y dominio.
 * Los colores se inyectan como custom properties de CSS sobre :root, así que
 * toda la aplicación se re-tematiza sin recompilar los estilos de cada componente.
 */

export interface BrandTheme {
  /** Color principal: acciones primarias, enlaces, foco. */
  primary: string;
  primaryDark: string;
  /** Texto/iconos sobre el color principal. */
  primaryContrast: string;
  /** Color secundario: acciones alternas y acentos. */
  secondary: string;
  secondaryDark: string;
  /** Acento terciario para avisos y destacados. */
  accent: string;
  /** Fondo de la aplicación. */
  background: string;
  /** Superficie de tarjetas y paneles. */
  surface: string;
  /** Texto principal y texto atenuado. */
  text: string;
  textMuted: string;
  /** Bordes y separadores. */
  border: string;
}

export interface BrandConfig {
  /** Identificador del tenant. Útil cuando el producto sea multi-cliente. */
  id: string;
  /** Nombre de la institución o empresa cliente. */
  organizationName: string;
  /** Nombre comercial del producto tal como se muestra en pantalla. */
  productName: string;
  tagline: string;
  /**
   * Ruta al logo del cliente (p. ej. 'brand/uniempresarial-logo.png' dentro de
   * /public). Si es null se dibuja el logotipo genérico en SVG del producto.
   */
  logoUrl: string | null;
  logoAlt: string;
  /** Dominio institucional esperado en el inicio de sesión. */
  emailDomain: string;
  supportEmail: string;
  theme: BrandTheme;
}

/** Marca activa: Uniempresarial (colores tomados del campus virtual oficial). */
export const BRAND: BrandConfig = {
  id: 'uniempresarial',
  organizationName: 'Uniempresarial',
  productName: 'Uni-parking',
  tagline: 'Sistema de control y gestión de parqueadero',
  logoUrl: null,
  logoAlt: 'Uniempresarial - Fundación Universitaria Empresarial',
  emailDomain: 'uniempresarial.edu.co',
  supportEmail: 'soporte@uniempresarial.edu.co',
  theme: {
    primary: '#003DA5',
    primaryDark: '#002E7A',
    primaryContrast: '#FFFFFF',
    secondary: '#C8102E',
    secondaryDark: '#A00C24',
    accent: '#FF9635',
    background: '#FFFFFF',
    surface: '#FFFFFF',
    text: '#1A2340',
    textMuted: '#4A5878',
    border: '#E2E7F0',
  },
};

/** Mapeo tema -> custom property de CSS. */
const THEME_VARIABLES: Record<keyof BrandTheme, string> = {
  primary: '--brand-primary',
  primaryDark: '--brand-primary-dark',
  primaryContrast: '--brand-primary-contrast',
  secondary: '--brand-secondary',
  secondaryDark: '--brand-secondary-dark',
  accent: '--brand-accent',
  background: '--brand-background',
  surface: '--brand-surface',
  text: '--brand-text',
  textMuted: '--brand-text-muted',
  border: '--brand-border',
};

/**
 * Escribe la paleta de la marca sobre :root. Se invoca una sola vez al arrancar
 * la aplicación; para vender el producto a otro cliente basta con pasarle su
 * propio BrandConfig.
 */
export function applyBrandTheme(brand: BrandConfig = BRAND): void {
  const root = document.documentElement;

  for (const [key, cssVariable] of Object.entries(THEME_VARIABLES)) {
    root.style.setProperty(cssVariable, brand.theme[key as keyof BrandTheme]);
  }

  // Variantes translúcidas derivadas, usadas en fondos suaves y anillos de foco.
  root.style.setProperty('--brand-primary-soft', hexToRgba(brand.theme.primary, 0.08));
  root.style.setProperty('--brand-primary-ring', hexToRgba(brand.theme.primary, 0.28));
  root.style.setProperty('--brand-secondary-soft', hexToRgba(brand.theme.secondary, 0.08));
  root.style.setProperty('--brand-secondary-ring', hexToRgba(brand.theme.secondary, 0.28));
  root.style.setProperty('--brand-accent-soft', hexToRgba(brand.theme.accent, 0.14));
}

function hexToRgba(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.replace(/./g, (c) => c + c) : value;
  const int = Number.parseInt(full, 16);

  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
