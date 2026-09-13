import { DestroyRef, inject, signal } from '@angular/core';

/** Ancho a partir del cual la barra lateral cabe junto al contenido. */
const DESKTOP_QUERY = '(min-width: 64rem)';

/**
 * matchMedia no existe fuera del navegador (renderizado en servidor, pruebas).
 * Sin ventana se asume móvil, que es el diseño de partida.
 */
export function isDesktop(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(DESKTOP_QUERY).matches
    : false;
}

/**
 * Estado del cajón lateral compartido por los dashboards. En escritorio arranca
 * desplegado; en móvil, cerrado. Al cruzar el umbral (rotar el celular,
 * redimensionar la ventana) se ajusta solo.
 *
 * Debe crearse en un contexto de inyección, p. ej. como campo de un componente.
 */
export function createDrawerState() {
  const open = signal(isDesktop());

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    const query = window.matchMedia(DESKTOP_QUERY);
    const sync = (event: MediaQueryListEvent) => open.set(event.matches);

    query.addEventListener('change', sync);
    inject(DestroyRef).onDestroy(() => query.removeEventListener('change', sync));
  }

  return {
    open: open.asReadonly(),
    toggle: () => open.update((value) => !value),
    /** En escritorio la barra convive con el contenido: no se cierra al elegir. */
    closeOnMobile: () => {
      if (!isDesktop()) {
        open.set(false);
      }
    },
  };
}
