# Uni-parking · Planeación y registro de desarrollo

> **Fase actual:** Fase 9 (integración de las ramas y orden del proyecto) **completada** el 2026-09-28, sin commit todavía: `frontend-miguel` y `frontend-julian` quedaron unidas en `frontend-integracion`, sin modo demostración y con los servicios ordenados por módulo del backend (ADR-024). Todas las pantallas trabajan con el backend real e inicio de sesión con Microsoft. El historial y las estadísticas del usuario ya tienen su permiso (PEN-030, parte del historial resuelta el 2026-09-28); lo que sigue depende de «Vehículos dentro» de Parqueaderos (resto de PEN-030) y de la Fase 8 («Movimientos de hoy» y dirección automática).
> **Rama de trabajo:** `frontend-integracion` · **Última actualización:** 2026-09-28
> **Estado técnico:** compila con el aviso de tamaño de siempre (paquete inicial de 555 kB, límite de 500 kB; lo causa Bootstrap, MEJ-001) · 163 pruebas unitarias pasando (2026-09-28)

Este documento es la fuente única para saber en qué va el proyecto: qué está hecho, qué se decidió y por qué, qué falta y qué hay que corregir. Se actualiza en el mismo commit que el cambio que registra (ver [Cómo actualizar este documento](#cómo-actualizar-este-documento)).

## Contenido

1. [Visión y alcance](#1-visión-y-alcance)
2. [Estado por módulo](#2-estado-por-módulo)
3. [Hoja de ruta](#3-hoja-de-ruta)
4. [Especificación: dashboard de seguridad](#4-especificación-dashboard-de-seguridad)
5. [Pendientes, mejoras y correcciones](#5-pendientes-mejoras-y-correcciones)
6. [Registro de decisiones](#6-registro-de-decisiones)
7. [Bitácora de cambios](#7-bitácora-de-cambios)
8. [Convenciones](#8-convenciones)
9. [Preguntas abiertas](#9-preguntas-abiertas)

---

## 1. Visión y alcance

**Uni-parking** es un sistema de control y gestión de parqueaderos. Se desarrolla para Uniempresarial, pero se venderá a otras instituciones con su propia marca (colores, logos e imágenes). Por eso ningún componente escribe la marca directamente.

- **Plataforma:** aplicación web progresiva (PWA) instalable en computador y celular (ADR-014). Ionic y Capacitor quedan como opción si la materia los pide (ADR-015).
- **Vehículos admitidos:** moto, bicicleta y scooter. No hay parqueadero para carros.
- **Tecnología:** Angular 22 (componentes standalone, signals, sin zone.js), `@angular/service-worker`, Firebase Auth (inicio de sesión con Microsoft y token para el backend), `qrcode` (generar los QR), ZXing (`@zxing/browser`, leer el QR), Capacitor 8 con ML Kit (foto de placa en Android) y Vitest. Ver [dependencias.md](dependencias.md).

| Rol | Quién | Qué hace |
| --- | --- | --- |
| Usuario institucional | Estudiantes, docentes y administrativos con correo institucional | Registra hasta 5 vehículos; ve disponibilidad, historial y el QR de cada vehículo |
| Visitante | Personas sin cuenta | Llena un formulario y recibe un QR para ingresar |
| Administrador | Personal de la universidad | Aprueba vehículos o les quita el permiso, reactiva usuarios y revisa incidencias |
| Personal de seguridad | Guardias de la empresa de vigilancia | Registra ingresos y salidas y reporta novedades |

---

## 2. Estado por módulo

Estados (ver [Estados](#estados)):

- **Completado:** terminado y probado.
- **Completado (demo):** terminado, pero funciona con datos de demostración; falta el backend.
- **Pendiente:** empezado y sin terminar; la nota dice qué falta.
- **Sin iniciar:** todavía no tiene trabajo.

| Módulo | Ruta | Estado | Responsable | Actualizado | Notas |
| --- | --- | --- | --- | --- | --- |
| Login | `/login` | Completado | Miguel · Julian | 2026-09-28 | «Iniciar sesión» con Microsoft (Firebase) y «Visitantes». Al entrar, la cuenta se registra en el backend (`POST /users`) y el rol sale del claim `rolId` del token. Sin accesos de demostración (ADR-024) |
| Visitantes | `/visitantes` | Completado | Julian | 2026-09-28 | Conectado al backend, sin datos quemados. Enviar el formulario solo registra la visita; el QR (el id que asigna el backend) es la llave con la que portería valida el ingreso (ADR-021). Acepta placas `ABC12D`, `ABC12` y `ABC123`, como el backend (PEN-028) |
| Dashboard de usuarios | `/inicio` | Completado | Miguel · Juan José | 2026-09-28 | «Mis vehículos» (`GET /users/:id`), la disponibilidad por zona y el historial (`GET /parking/historical/:plate`) funcionan con el backend: userEstandar ya tiene `access-record:historical`, validado contra el uid del token (PEN-030 resuelto para el historial) |
| Registro de vehículos | `/vehiculos/registrar` | Completado | Miguel · Julian | 2026-09-28 | Tres pasos (vehículo, datos y confirmar). Crea el vehículo en el backend (`POST /vehicles`) sin permiso para entrar: lo aprueba la administración. Sin documentos: el backend no los recibe (PEN-003, ADR-024) |
| Vehículos | `/vehiculos` | Completado | Miguel | 2026-09-28 | Lista los vehículos de la persona y muestra el QR de cada uno, con su identificador del backend (PEN-018) |
| Parqueaderos | `/parqueaderos` | Pendiente | Miguel · Juan José | 2026-09-28 | Disponibilidad por zona y «Estado de tu vehículo» (del historial) ya funcionan. Solo falta «Vehículos dentro»: pide `GET /parking/records/open`, que userEstandar sigue sin tener porque expone las placas de todo el mundo (PEN-030, parte pendiente) |
| Estadísticas | `/estadisticas` | Completado | Miguel · Juan José | 2026-09-28 | Promedios e historial calculados del historial de cada vehículo, ya con el permiso concedido (PEN-030 resuelto para el historial) |
| Dashboard de administración | `/admin/:section` | Completado | Miguel · Julian | 2026-09-28 | Resumen, vehículos pendientes (aprobar), aprobados (quitar el permiso), usuarios inactivos (reactivar) e incidencias, todo con el backend. Faltan cambiar el rol de una cuenta y marcar incidencias como resueltas (PEN-031) |
| Notificaciones | — | Sin iniciar | — | 2026-09-28 | La campana del header se retiró el 2026-09-28: no había API y siempre salía vacía (ADR-024). Se recupera del historial de git (`b869f89`) cuando el backend tenga notificaciones |
| Layout común por rol | — | Completado | Julian | 2026-09-15 | ADR-010. Cada rol solo ve y descarga su grupo de rutas; cada rol puede aportar su buscador del header |
| Dashboard de seguridad | `/seguridad/:section` | Pendiente | Julian · Miguel | 2026-09-28 | **Resumen**: vehículos dentro, puestos disponibles, ocupación por tipo y «Dentro ahora» con los registros de acceso abiertos. **Control de acceso** registra ingresos y salidas para visitantes (QR, documento o placa) y comunidad (placa, también con foto en Android) (ADR-021). **Novedades**: reporta incidencias a la administración. Faltan «Movimientos de hoy» y la dirección automática (PEN-021) |
| PWA | — | Pendiente | Julian | 2026-09-15 | Base lista y verificada: service worker activo y apertura sin conexión. Faltan pruebas en celulares, aviso de nueva versión e íconos por cliente |
| Documentación del código (TSDoc) | — | Pendiente | Julian | 2026-09-15 | Todo lo nuevo de las Fases 1 a 3 está documentado; falta el código anterior (PEN-015) |
| Lector de QR (`lector-codigo-qr`) | — | Completado | Julian | 2026-09-15 | ZXing en la PWA, con linterna y lectura desde una foto (ADR-019). Probado con la foto de un pase real en computador; la cámara en vivo se prueba en celulares en la Fase 6 (PEN-010) |
| Accesibilidad y footer | — | Sin iniciar | — | 2026-09-26 | Los componentes vacíos se borraron el 2026-09-26; se crean de nuevo cuando se diseñen (PEN-008) |
| Inicio de sesión real | — | Completado | Miguel · Julian | 2026-09-28 | Microsoft vía Firebase para todos los roles; cada petición al backend lleva el token (`auth.interceptor.ts`) y las rutas esperan a que Firebase restaure la sesión (PEN-013). Verificado en el navegador con una cuenta de vigilante: el panel de seguridad recibe 200 del backend |
| Ionic / Capacitor | — | Pendiente | Julian | 2026-09-28 | Capacitor 8 para probar en Android (`capacitor.config.ts`). La carpeta `android/` no se sube: cada quien la genera con los pasos de [dependencias.md](dependencias.md), incluido el permiso de cámara. Falta acordarlo con el equipo (ADR-015). Ionic sigue sin instalar |

---

## 3. Hoja de ruta

Cada tarea lleva su casilla y su estado. Cada fase dice en qué estado quedó.

### Fase 0 · Documentación y definición

**Estado de la fase: Completada (2026-09-14)**

- [x] Definir el dashboard de seguridad — **Completado** (2026-09-14)
- [x] Crear este documento y registrar lo construido hasta ese día — **Completado** (2026-09-14)

### Fase 1 · Base y aislamiento por rol

**Estado de la fase: Completada (2026-09-15)**

- [x] Rol `security` con dos guardias de demostración (Carlos y Diana) y accesos directos en el login — **Completado** (2026-09-15)
- [x] Guard por rol con `canMatch` y redirección al inicio de cada rol (resuelve COR-001) — **Completado** (2026-09-15)
- [x] Layout común; migrar `main-dashboard` y `admin-dashboard`; menú por rol — **Completado** (2026-09-15)
- [x] Modelo de movimientos y estancias; ocupación calculada por tipo de vehículo — **Completado** (2026-09-15)
- [x] Turnos: tomar, entregar, recibir y cerrar la jornada — **Completado** (2026-09-15)
- [x] Resumen de disponibilidad — **Completado** (2026-09-15)
- [x] PWA base: manifiesto, íconos y service worker (agregada el 2026-09-15, ADR-014) — **Completado** (2026-09-15)
- [x] Documentación TSDoc de todo el código nuevo o modificado (ADR-017) — **Completado** (2026-09-15)

### Fase 2 · Control de acceso manual

**Estado de la fase: Completada (2026-09-15)**

- [x] Servicio de control de acceso: identificar, validar, decidir la dirección, registrar y deshacer — **Completado** (2026-09-15)
- [x] Búsqueda por documento, placa o nombre, también desde el buscador del header — **Completado** (2026-09-15)
- [x] Tarjeta de resultado (`access-result`) con bloqueos, avisos por confirmar y acciones especiales (4.6) — **Completado** (2026-09-15)
- [x] Vehículos dentro (incluye la salida de visitantes) y movimientos del turno — **Completado** (2026-09-15)
- [x] Anular movimientos del turno con motivo (agregada el 2026-09-15, ADR-018) — **Completado** (2026-09-15)
- [x] Campos nuevos: marca (opcional) y color (obligatorio) del scooter en el registro y en visitantes; serial opcional en bicicletas de visitantes — **Completado** (2026-09-15)
- [x] Pedir tipo y número de documento al registrar bicicletas, para poder buscarlas en portería (PEN-009) — **Completado** (2026-09-15)

### Fase 3 · QR de visitantes

**Estado de la fase: Completada (2026-09-15)**

- [x] Guardar los pases emitidos (resuelve COR-002) — **Completado** (2026-09-15)
- [x] Portar el lector del proyecto `lector-codigo` a `lector-codigo-qr` (ZXing en la PWA, ADR-016) — **Completado** (2026-09-15)
- [x] Leer el QR desde una foto cuando la cámara en vivo falla (agregada el 2026-09-15, ADR-019) — **Completado** (2026-09-15)
- [x] Validar el pase y confirmar el ingreso — **Completado** (2026-09-15)

### Fase 4 · Foto de placa

**Estado de la fase: Sin iniciar**

- [ ] `plate-capture` con marco guía — Sin iniciar
- [ ] Lector de placa simulado, normalización y corrección por posición — Sin iniciar
- [ ] Registro automático con «Deshacer»; rechazo de motos sin aprobación — Sin iniciar

### Fase 5 · Integración con el usuario

**Estado de la fase: Pendiente** (iniciada con la integración del 2026-09-28)

- [x] Disponibilidad e historial del usuario alimentados por los movimientos reales — **Completado** (2026-09-28): la disponibilidad sale de `GET /parkingZone`; el historial usa `GET /parking/historical/:plate`, que el backend ya le permite a userEstandar para su propia placa (PEN-030)
- [ ] Notificar al usuario cada ingreso y salida (por confirmar, [pregunta 4](#9-preguntas-abiertas)) — Sin iniciar

### Fase 6 · PWA en portería y opción nativa

**Estado de la fase: Sin iniciar**

- [ ] Probar la PWA instalada en celulares de portería: cámara, luz de día, noche y placas sucias o dobladas (PEN-010) — Sin iniciar
- [ ] Elegir el lector de placas definitivo (ADR-016) — Sin iniciar
- [ ] Solo si se adopta Ionic/Capacitor: empaquetar la app y probar ML Kit (ADR-015) — Sin iniciar

### Fase 7 · Conexión a backend real (Visitantes y Seguridad)

**Estado de la fase: Completada (2026-09-26)**

- [x] Analizar el backend real del equipo (rama `camilo-dev`) para Visitantes y Vehículos — **Completado** (2026-09-26)
- [x] Reescribir `visitor-api.service` para el modelo plano de visitantes, sin autorizar aparte — **Completado** (2026-09-26)
- [x] Reorganizar los servicios por módulo del backend (`core/services/modules/visitors`, `.../security-dashboard`) — **Completado** (2026-09-26)
- [x] Reescribir el formulario de visitantes: enviarlo es el ingreso, sin cuenta regresiva ni vencimiento — **Completado** (2026-09-26)
- [x] Reducir el dashboard de seguridad a Resumen y Control de acceso; retirar Turno, Movimientos, «Vehículos dentro» y `access-result` — **Completado** (2026-09-26)
- [x] `vehicle-api.service` nuevo: autorizar y desautorizar vehículos institucionales (ingreso y salida) — **Completado** (2026-09-26)
- [x] Eliminar del proyecto los servicios, modelos y semillas de datos quemados de ambos módulos — **Completado** (2026-09-26)
- [x] Sembrar datos de ejemplo reales a través de la API (5 usuarios institucionales con vehículo, 5 visitantes) — **Completado** (2026-09-26)
- [x] Verificar en el navegador contra el backend real: registrar un visitante, marcarle la salida, autorizar y desautorizar un vehículo institucional — **Completado** (2026-09-26)

### Fase 8 · Módulo Parking: el QR valida el ingreso

**Estado de la fase: Pendiente (iniciada el 2026-09-27)**

- [x] Formulario de visitantes: enviarlo solo registra la visita; el QR es la llave de ingreso — **Completado** (2026-09-27)
- [x] Resumen: vehículos dentro, puestos disponibles y ocupación por tipo con las zonas reales (`GET /parkingZone`) — **Completado** (2026-09-27)
- [x] Control de acceso: registrar ingreso y salida en `access_record`, para visitantes (QR, documento o placa) y comunidad (placa) — **Completado** (2026-09-27)
- [x] Corregir en el backend los tres errores del ingreso (PEN-022) y verificarlos por la API — **Completado** (2026-09-27)
- [x] Verificar ingreso y salida de punta a punta — **Completado** (2026-09-27): Julian registró desde el celular el ingreso de un visitante en bicicleta y cuadraron el panel y la base de datos
- [x] Backend (autorizado): `GET /parking/records/open`, y las correcciones de la salida, del contador de puestos con ingresos simultáneos y de los errores de tipos que rompían `npm run build` (PEN-022) — **Completado** (2026-09-27)
- [x] «Dentro ahora» (búsqueda, filtros, orden y paginación) a partir de los registros de acceso abiertos — **Completado** (2026-09-27)
- [ ] «Movimientos de hoy» — Sin iniciar: necesita consultar los registros del día, no solo los abiertos (PEN-021)
- [ ] Una sola acción según si la persona está dentro o no (dirección automática, ADR-006) — Sin iniciar: ya es posible con `GET /parking/records/open`

### Fase 9 · Integración de las ramas y orden del proyecto

**Estado de la fase: Completada (2026-09-28)**, sin commit: queda para revisión de Julian (ADR-024)

- [x] Crear `frontend-integracion` desde `frontend-miguel` y unirle `frontend-julian`, recuperando lo que el merge automático había borrado — **Completado** (2026-09-28): commit `b869f89`
- [x] Ordenar los servicios por módulo del backend (`services/api`, `auth`, `scanner`, `student-panel`) y unir los duplicados — **Completado** (2026-09-28)
- [x] Retirar el modo demostración y todo dato quemado: cuentas, semillas, documentos de ejemplo y accesos directos del login — **Completado** (2026-09-28)
- [x] Inicio de sesión con Microsoft y token en cada petición al backend (PEN-027); las rutas esperan la sesión (PEN-013) — **Completado** (2026-09-28)
- [x] Registro de vehículos solo contra el backend, sin documentos — **Completado** (2026-09-28)
- [x] Novedades de seguridad con el formato del backend (título, descripción y quién reporta) — **Completado** (2026-09-28)
- [x] Borrar el código, los estilos y las pruebas que ya no usa nada; rehacer las pruebas sobre los servicios reales — **Completado** (2026-09-28): 163 pruebas pasando
- [x] Verificar en el navegador: login, rutas por rol, visitantes y panel de seguridad con una sesión real — **Completado** (2026-09-28)

### Después

- [x] Inicio de sesión real para la comunidad, la administración y los guardias — **Completado** (2026-09-28, Fase 9)
- [x] Conectar al backend el dashboard de usuarios, el registro de vehículos y la administración — **Completado** (2026-09-28, Fase 9); el historial ya tiene el permiso del backend, validado contra el dueño de la placa (PEN-030)
- [ ] Administración: cambiar el rol de una cuenta (así se crean los guardias) y cerrar incidencias (PEN-031) — Sin iniciar
- [x] Incidencias reportadas por seguridad desde su dashboard — **Completado** (2026-09-28, Fase 9)
- [ ] Notificaciones, cuando el backend las tenga — Sin iniciar
- [ ] Registrar movimientos sin conexión y sincronizar después — Sin iniciar
- [ ] Aviso de nueva versión de la PWA (PEN-011) — Sin iniciar

---

## 4. Especificación: dashboard de seguridad

> Acordada el 2026-09-14. Los cambios posteriores se anotan en la bitácora; si cambian una decisión, se escribe un ADR nuevo.
>
> **Vigencia (2026-09-26):** esta era la especificación de demostración. Para Visitantes y Seguridad, el diseño vigente es el del backend real del equipo (rama `camilo-dev`): sin turnos ni movimientos históricos, sin `access-result`, con el ingreso del visitante automático al enviar el formulario y con control de acceso también para vehículos institucionales. Ver **ADR-020**. Esta sección queda como registro de las decisiones originales (4.3 a 4.9 describen funciones que hoy no existen en el código). Desde el 2026-09-27 tampoco existen `parking.config.ts` ni `StayService` (ADR-022): la capacidad de las zonas viene del backend (ADR-021). La estructura vigente está en [Estructura de `core/` y `testing/`](#estructura-de-core-y-testing).

### 4.1 Objetivo

El personal de seguridad autoriza y registra los ingresos y salidas de vehículos de usuarios institucionales y de visitantes, ve en todo momento la disponibilidad del parqueadero y deja constancia de quién toma y quién entrega cada turno.

Principio: **el celular identifica el vehículo y el guardia verifica a la persona.** Cada movimiento queda a nombre del guardia que lo registró.

### 4.2 Secciones

| Sección | Ruta | Contenido | Estado |
| --- | --- | --- | --- |
| **Resumen** (primera vista) | `/seguridad/resumen` | Vehículos dentro (total, de la comunidad y visitantes); puestos disponibles y en uso por tipo; alertas (cupo casi lleno o sin cupos, vehículos con muchas horas dentro); últimos movimientos; estado del turno con el botón **Registrar ingreso o salida** | Completado |
| **Turno** | `/seguridad/turno` | Tomar, entregar y recibir el turno; cerrar la jornada; turnos recientes | Completado |
| **Control de acceso** | `/seguridad/control` | **Buscar** (documento, placa o nombre) y **Pase de visitante (QR)**, con tarjeta de resultado, «Deshacer» y acciones especiales. **Foto de placa** (motos) llega con la Fase 4 | Pendiente (falta la foto de placa) |
| **Vehículos dentro** | `/seguridad/dentro` | Hora de ingreso, tiempo dentro y filtros por tipo, persona y texto; desde cada vehículo se abre su salida (visitantes y salidas manuales) | Completado |
| **Movimientos** | `/seguridad/movimientos` | Ingresos y salidas del turno o de todo el día, con hora, método de identificación, guardia, notas y marcas; anulación con motivo (ADR-018) | Completado |
| **Incidencias** (después) | — | Reportar novedades, que llegan al dashboard de administración | Sin iniciar |

El menú solo muestra las secciones construidas: desde la Fase 2, Resumen, Control de acceso, Vehículos dentro, Movimientos y Turno. El buscador del header lleva a Control de acceso con lo escrito.

Diseño para usar con una mano en el celular: botones grandes, alto contraste para trabajar al sol, estados siempre con icono y texto, y vibración al registrar en los celulares que lo permitan (pendiente, PEN-017).

### 4.3 Capacidad y ocupación

- Cada tipo de vehículo tiene su cupo, configurable por institución en `core/config/parking.config.ts`. Valores de ejemplo hasta confirmar los reales ([pregunta 2](#9-preguntas-abiertas)): motos 60, bicicletas 30 y scooters 20.
- Los puestos están numerados, pero no se asignan y no hay sensores: el sistema **cuenta**.
  - **Ocupados** = vehículos de ese tipo con ingreso abierto.
  - **Disponibles** = cupo − ocupados.
- Si un tipo está lleno, el sistema avisa y el guardia confirma el ingreso de forma explícita, porque es quien ve el espacio real.

### 4.4 Cuentas de seguridad y turnos

- **Cuenta individual por guardia.** El administrador la crea y la desactiva. El guardia inicia sesión con su número de documento y una contraseña. Si la universidad entrega correos institucionales, solo cambia el inicio de sesión; los turnos y la trazabilidad siguen igual.
- **Sin turno activo no se registran movimientos.** Hay un solo turno activo por portería.
- **Tomar turno:** si el turno anterior no fue recibido, el guardia entrante ve la entrega (vehículos dentro por tipo y observaciones) y confirma **Recibo el turno**. Quien entregó no puede recibir su propio turno.
- **Conteo que no coincide:** hay que explicar la diferencia; el sistema crea la incidencia «Diferencia en el conteo al recibir el turno» y avisa a la administración.
- **Entregar turno:** resumen automático (vehículos dentro por tipo, ingresos y salidas del turno e incidencias abiertas) más las observaciones del guardia. El sistema avisa a todo el personal de seguridad que hay un turno por recibir.
- **Cierre de jornada:** si nadie recibe el turno, se cierra dejando constancia de los vehículos que quedan dentro. Si quedan vehículos, se avisa a la administración. El siguiente guardia toma el turno sin tener que recibirlo.

### 4.5 Identificación y autorización

| Caso | Cómo se identifica | Condición para autorizar | Registro |
| --- | --- | --- | --- |
| Moto institucional | Foto de la placa | Registro aprobado por un administrador | **Automático** si la lectura es clara |
| Bicicleta o scooter institucional | Búsqueda por documento | Registro aprobado | Lo confirma el guardia |
| Visitante: ingreso | Escaneo del QR | Pase vigente y sin usar | Lo confirma el guardia tras ver los datos del formulario |
| Visitante: salida | Vehículos dentro, o búsqueda por documento o placa | Visita con ingreso abierto | Lo confirma el guardia; no se exige el QR |

**Motos con foto de placa**

1. El guardia toma la foto con un marco que guía el encuadre.
2. El sistema normaliza el texto: mayúsculas, sin espacios ni guiones y sin el nombre de la ciudad. Luego corrige las confusiones según la posición de cada carácter:
   - posiciones 1 a 3 y 6 son letras (0→O, 8→B);
   - posiciones 4 y 5 son números (O→0, B→8).
3. **Lectura clara** = se obtiene exactamente una placa con formato `ABC12D` (actual) o `ABC12` (antiguo).
4. Si el registro está aprobado, el ingreso o la salida se registran solos.
5. Si no hay registro aprobado (no registrada, pendiente, por actualizar o rechazada), sale **No autorizado** con el motivo y la moto no ingresa. Si es de un visitante, debe llenar el formulario y presentar su QR.
6. Si la lectura no es clara, la placa aparece editable junto a la foto, o el guardia busca por documento. En ese caso confirma él; no hay registro automático.

**Bicicletas y scooters institucionales**

1. El guardia busca por número de documento.
2. Ve los vehículos aprobados de esa persona con sus datos.
3. Elige el vehículo que tiene enfrente y confirma el ingreso o la salida.

**Visitantes**

1. El visitante llena el formulario y recibe un QR. El QR lleva un token sin datos personales, sirve una sola vez y hay que usarlo en los 15 minutos siguientes.
2. El guardia escanea el QR, ve los datos que la persona escribió, los compara con su documento y confirma el ingreso.
3. Un QR inválido, vencido, ya usado o anulado se rechaza mostrando el motivo.
4. La salida no exige el QR, porque el visitante pudo cerrar la página o quedarse sin batería. El guardia lo ubica en Vehículos dentro o lo busca por documento o placa.
5. Un visitante que ya salió no vuelve a entrar con el mismo pase: necesita uno nuevo. Generar un pase nuevo anula el anterior.
6. Si la cámara en vivo falla, el guardia toma una foto del QR con «Leer desde una foto» (ADR-019). No hay ingreso de visitantes sin QR.

**Casos que resuelve la Fase 2**

- Un vehículo de la comunidad cuyo registro se eliminó puede salir, pero no volver a entrar.
- La búsqueda trae registros en cualquier estado, para que el guardia vea por qué uno no está autorizado; los visitantes solo aparecen mientras están dentro.

### 4.6 Reglas generales

- **Dirección automática:** si el vehículo tiene un ingreso abierto, es salida; si no, es ingreso. El guardia nunca la elige.
- **Bloqueos** (no hay botón de registrar): sin turno activo, registro sin aprobar o eliminado, visitante sin pase y pase vencido, usado o anulado. El mensaje dice el motivo.
- **Avisos** (se registra solo si el guardia marca «Revisé el aviso»): cupo lleno, movimiento del mismo vehículo hace menos de 2 minutos, ingreso abierto de otro día, la misma persona con otro vehículo dentro y, en visitantes, comparar el documento. Si aparece un aviso nuevo con la tarjeta abierta, hay que confirmarlo otra vez.
- **Deshacer** está disponible durante 10 segundos y no deja rastro. Después, anular un movimiento exige un motivo de al menos 5 caracteres, y solo se anulan los del turno propio (ADR-018).
- Una salida sin ingreso registrado se permite con una nota: en la bitácora figura solo la salida, marcada «Sin ingreso registrado».
- Si hay un ingreso abierto de otro día, se avisa y se ofrece cerrarlo (queda marcado «Salida no registrada») antes de registrar el ingreso nuevo.
- La tarjeta se evalúa con los datos de ese momento: si mientras está abierta cambia el registro, se usa el pase o se registra otro movimiento, la decisión se actualiza sin borrar la nota del guardia.
- Sin cámara o sin permiso de cámara, la búsqueda manual siempre está disponible, y el QR se puede leer desde una foto (ADR-019).
- Si dos guardias registran lo mismo a la vez, en producción lo resuelve el servidor con una transacción.
- Un vehículo nunca puede tener dos ingresos abiertos (lo impide `StayService` desde la Fase 1).

### 4.7 Datos que ve el guardia

Solo lo necesario para verificar:

| Tipo | Persona | Vehículo |
| --- | --- | --- |
| Moto | Nombre completo (nombres y apellidos), documento y vínculo (o motivo de la visita) | Placa, marca, línea (si existe) y color |
| Bicicleta | Igual | Serial (si existe), marca y color |
| Scooter | Igual | Marca (si existe) y color |

El guardia **no** ve las fotos de documentos (tarjeta de propiedad, facturas), las notas de revisión del administrador ni el historial completo del usuario. En la tarjeta (`access-result`), placas y seriales van en letra monoespaciada para leer cada carácter sin dudas.

### 4.8 Qué se guarda de cada movimiento

- Tipo (ingreso o salida), fecha, hora y estancia a la que pertenece.
- Copia de los datos del vehículo, y la persona o el pase del visitante.
- Método de identificación: placa, documento, QR o manual.
- Guardia y turno que lo registraron.
- Foto de la placa (motos) y notas.
- Marcas de control: registro automático, placa corregida a mano, movimiento anulado (con su motivo).

Desde la Fase 1, cada estancia guarda la persona, el vehículo y quién registró su ingreso y su salida (`ParkingStay` en `core/models/parking.ts`). Desde la Fase 2 guarda también la nota del guardia, las anulaciones (quién, cuándo y por qué) y las marcas «sin ingreso registrado» y «salida no registrada». Los pases usados guardan la estancia que abrieron y el guardia que los validó. La foto de la placa y las marcas de registro automático y placa corregida llegan con la Fase 4.

### 4.9 Estructura técnica

```
Rutas: un grupo por rol, protegido con canMatch        Archivo
├─ Públicas ........ /login · /visitantes                app.routes.ts
├─ Usuario ......... /inicio · /vehiculos/registrar      components/main-dashboard/user.routes.ts
├─ Administración .. /admin/:section                     components/admin-dashboard/admin.routes.ts
└─ Seguridad ....... /seguridad/:section                 components/security-dashboard/security.routes.ts

Componentes
├─ dashboard-layout ....... header + sidebar + contenido; menú y buscador del rol     Completado
├─ zone-availability ...... disponibilidad por tipo, compartida con usuarios          Completado
├─ security-dashboard ..... resumen, control, dentro, movimientos y turno             Pendiente (Fase 4)
├─ access-result .......... persona + vehículo + bloqueos + avisos + acciones         Completado
├─ lector-codigo-qr ....... cámara + lectura de QR + lectura desde foto               Completado
└─ plate-capture .......... cámara con marco de placa                                 Sin iniciar (Fase 4)

core
├─ config/parking.config .. cupos por tipo, portería y umbral de estancia larga       Completado
├─ navigation ............. DASHBOARD_NAVIGATION: menú y buscador de cada rol         Completado
├─ models/access .......... candidato, decisión, bloqueos, avisos y registro          Completado
├─ utils/dates ............ horas y días en español para portería                     Completado
└─ services
   ├─ stay ................ estancias: ocupación, movimientos, anulaciones             Completado
   ├─ shift ............... tomar, entregar y recibir turnos                          Completado
   ├─ access-control ...... identificar, validar, decidir, registrar, deshacer, anular Completado
   ├─ visitor-pass ........ emitir, guardar, validar y anular pases                   Completado
   ├─ scanner ............. motor de cámara: ZXing en la PWA; ML Kit si hay app      Completado (web)
   └─ plate-reader ........ lectura de placa: simulada; la definitiva según ADR-016   Sin iniciar (Fase 4)
```

- Las reglas viven en servicios, no en componentes: se prueban sin cámara y pueden pasar al backend sin rehacer pantallas.
- Los componentes nuevos se nombran en inglés; `lector-codigo-qr` conserva su nombre.

### 4.10 Cámara y lectura

- **QR:** del proyecto `lector-codigo` se reutilizan el `EscanerService` (hoy `ScannerService`) y la capa de cámara con marco, adaptada a la marca. En la PWA lee con ZXing (`@zxing/browser` 0.2.1 y `@zxing/library` 0.23.0), que se descarga solo al encender la cámara o leer una foto: unos 507 kB fuera del paquete inicial. Usa la cámara trasera, ofrece la linterna si el equipo la tiene y apaga la cámara al leer el primer código o al salir de la pantalla. ML Kit solo si se empaqueta con Capacitor (ADR-016). No se trae Ionic mientras no se confirme (ADR-015).
- **QR desde una foto:** si la cámara en vivo falla, «Leer desde una foto» abre la cámara del celular o la galería y ZXing lee la imagen (ADR-019). La foto no se guarda.
- **Placas:** lector simulado mientras se construye el flujo; el definitivo se elige en las pruebas de portería (ADR-016).
- **Cámara en el celular:** exige HTTPS. Para probar por la red local hay que usar `ng serve --ssl` o la PWA publicada con HTTPS.

---

## 5. Pendientes, mejoras y correcciones

Tipos: **COR** corrección (algo funciona mal) · **MEJ** mejora · **PEN** pendiente por implementar. Prioridad: Alta, Media o Baja. Estados: los de la [sección 2](#2-estado-por-módulo), más **Por decidir** cuando falta una decisión del equipo.

| ID | Prioridad | Módulo | Descripción | Estado |
| --- | --- | --- | --- | --- |
| COR-001 | Alta | Rutas | `/inicio` no tenía guard de sesión y el historial de demostración era global: sin sesión, o con sesión de administrador, se veía el historial de prueba del usuario. Resuelto con las rutas por rol y el historial filtrado por cuenta. | **Completado** (2026-09-15) |
| COR-002 | Alta | Visitantes | El pase QR no se guardaba en ningún lado, así que seguridad no podía validarlo. Resuelto: `VisitorPassService` guarda los pases, portería los valida y quedan usados con la estancia y el guardia. | **Completado** (2026-09-15) |
| PEN-001 | Alta | Backend | Firebase no estaba configurado y todo funcionaba en modo demostración, con los datos guardados en el navegador (`uniparking.demo.v2.*`). | **Completado** (2026-09-27): ya no se guarda nada en el navegador. Visitantes y Seguridad usan el backend del equipo (ADR-020, ADR-021) y el resto quedó sin datos hasta conectarse (ADR-022) |
| PEN-002 | Alta | Seguridad | Faltan los permisos por rol en el servidor (antes se pensaban como reglas de Firestore y claims). Las rutas por rol ordenan la navegación, pero no protegen datos, y la API de Visitantes y Parking hoy no pide sesión. | **Completado** (2026-09-28): el backend exige token y permiso en cada ruta (ADR-023). Falta que compruebe de quién es cada dato (PEN-029) |
| PEN-003 | Media | Registro de vehículos | Subir los documentos del registro al backend. El backend no tiene dónde recibirlos; desde el 2026-09-28 el registro no los pide (ADR-024). | Por decidir (backend) |
| PEN-004 | Baja | Notificaciones | El botón de configuración no hace nada. | **Completado** (2026-09-28): la campana se retiró hasta que exista la API (ADR-024) |
| PEN-005 | Baja | Header | El buscador funciona en seguridad (lleva a Control de acceso), pero en usuarios y administración no hace nada. («Configuración» del menú de cuenta se retiró el 2026-09-28 porque no tenía función.) | Pendiente |
| PEN-006 | Baja | Dashboard de usuarios | «Parqueaderos» y «Estadísticas» del menú no llevan a ninguna parte. | **Completado** (2026-09-28): las dos pantallas llegaron con la rama de Miguel |
| PEN-007 | Media | Administración | La administración no tiene estadísticas: la sección de gráficas se retiró con el modo demostración. Se pueden calcular a partir de los registros de acceso cuando el backend los publique por fecha. | Sin iniciar |
| PEN-008 | Baja | Componentes | `accessibility` y `footer` estaban creados, pero vacíos, y se borraron el 2026-09-26. Se crean de nuevo cuando se diseñen. | Sin iniciar |
| PEN-009 | Alta | Registro de vehículos | El registro de bicicletas no pedía documento, y portería las busca por documento (ADR-007). Resuelto: tipo y número de documento obligatorios en bicicletas. | **Completado** (2026-09-15) |
| PEN-010 | Media | PWA | Probar en Android e iOS la instalación, el uso sin conexión y el lector de QR con la cámara en vivo (exige HTTPS). Verificado solo en computador: la PWA en Edge sin interfaz y el lector leyendo la foto de un pase. | Sin iniciar (Fase 6) |
| PEN-011 | Media | PWA | Avisar cuando hay una versión nueva de la app (`SwUpdate`), para no dejar a nadie con una versión vieja. | Sin iniciar |
| PEN-012 | Baja | PWA | El manifiesto y los íconos son de Uniempresarial; cada cliente necesitará los suyos al publicar. | Sin iniciar |
| PEN-013 | Alta | Autenticación | Con un inicio de sesión real la sesión se restaura de forma asíncrona: las rutas por rol deben esperarla antes de decidir (hoy la sesión simulada de los guardias es inmediata). | **Completado** (2026-09-28): `roleGuard` y `redirectToHome` esperan `AuthService.waitUntilReady()` (con tope de 10 s); tiene su prueba |
| PEN-014 | Media | Autenticación | En la PWA instalada en iOS, la ventana emergente de Microsoft puede fallar: usar redirección en modo `standalone`, como ya se hace en la app nativa. | Sin iniciar |
| PEN-015 | Media | Documentación | Completar TSDoc en el código anterior a la Fase 1 (ADR-017). | Pendiente |
| PEN-016 | Alta | Visitantes | En demostración los pases vivían en el navegador: un pase solo se validaba en el mismo navegador donde se generó. | **Completado** (2026-09-26): con el backend real (ADR-020) el visitante queda guardado en la base de datos, así que cualquier guardia lo valida desde cualquier navegador |
| PEN-017 | Baja | Seguridad | Vibrar al registrar un movimiento en los celulares que lo permitan (4.2). | Sin iniciar |
| PEN-018 | Alta | Seguridad | El QR de un vehículo de la comunidad («Vehículos», rama de Miguel) codifica el identificador que tiene en el backend: la placa en las motos y el que asigna el backend en bicicletas y scooters. Portería lo busca con `GET /vehicles/:plate`, así que funciona; falta confirmar con el equipo que es el formato definitivo. | Por decidir |
| PEN-019 | Media | Todo el proyecto | La limpieza de datos quemados solo se había hecho en Visitantes y Seguridad (ADR-020): el dashboard de usuarios, la administración, el registro de vehículos y las notificaciones seguían en modo demostración, con sus servicios (`parking`, `parking-stats`, `stay`, `vehicle-registration`, `incident`, `notification`, `upload`). | **Completado** (2026-09-27): Julian pidió retirarlo todo antes de integrar la rama. Esas pantallas quedan con su diseño y sin datos (ADR-022) |
| PEN-021 | Alta | Seguridad y visitantes | Para el flujo del módulo Parking (ADR-021) el backend debía publicar cuatro cosas. Camilo publicó (commit `84c49a2`) el ingreso y la salida de visitantes por id y la consulta de zonas (`GET /parkingZone`). La cuarta se agregó el 2026-09-27, con su autorización, para «Dentro ahora»: `GET /parking/records/open` (registros sin salida). Falta consultar los registros del día para «Movimientos de hoy». | Pendiente (backend) |
| PEN-022 | Alta | Seguridad | Errores del backend en `camilo-dev` (`84c49a2`), encontrados al probar por la API el 2026-09-27: **(1)** ningún ingreso se guarda: `RegisterEntryUseCase` y `RegisterEntryVisitorUseCase` crean el registro con id `""` y Postgres lo rechaza (`invalid input syntax for type integer: ""`); con `null` o sin id lo genera la base de datos. **(2)** El puesto de la zona se descuenta antes de guardar el registro y sin transacción: cada ingreso fallido deja un puesto ocupado de más (los de las pruebas se devolvieron con `PATCH /parkingZone/:id`). **(3)** Latente, se verá al corregir (1): a los visitantes sin placa se les guarda la placa como `""`, y el índice único de registros abiertos por placa solo excluye `NULL`, así que no podrían estar dentro dos visitantes sin placa a la vez. Corrección (autorizada por el líder de backend, solo estos tres puntos, en `RegisterEntryUseCase.ts` y `RegisterEntryVisitorUseCase.ts`): el registro se crea con id `null`, se guarda antes de descontar el puesto, y la placa vacía se guarda como `null`. Verificado por la API: ingresos y salidas, dos visitantes sin placa dentro a la vez, ingresos repetidos rechazados sin gastar puestos, y con un guardado que falla la zona no se toca. Segunda ronda, también autorizada: **(a)** la salida cerraba el registro después de liberar el puesto; ahora lo cierra primero y solo si seguía abierto, así dos salidas simultáneas no liberan dos puestos. **(b)** El contador de puestos se leía, se restaba y se guardaba: dos ingresos simultáneos podían dejarlo descuadrado. Ahora Postgres suma o resta en el mismo `UPDATE`, con tope en 0 y en la capacidad, y el ingreso reserva el puesto antes de guardar el registro (si el registro falla, lo devuelve). **(c)** `npm run build` fallaba por errores de tipos en Incidencias, Usuarios, Vehículos, Visitantes y los scripts; el de Incidencias era una falla real: al actualizar, el dueño nunca cambiaba. Verificado con ingresos y salidas simultáneos contra la base real. | **Completado** (2026-09-27), sin commit: queda para revisión de backend |
| PEN-023 | Media | Visitantes | El QR del visitante no vence después de la salida: el backend solo rechaza el ingreso si el visitante está dentro en ese momento, así que con el mismo QR puede volver a entrar ese día o cualquier otro. Si cada QR debe servir para una sola visita (un ingreso y una salida), el ingreso del visitante tiene que rechazar a quien ya tenga un registro cerrado, y el visitante llenaría el formulario en cada visita. | Por decidir (con backend) |
| PEN-024 | Media | Backend | En `camilo-dev` la carpeta `dist/` sigue versionada aunque `.gitignore` la excluye (en `master` y `nico_dev` ya se sacó): cada `npm run build` modifica unos 190 archivos versionados. Se arregla sacándola del índice (`git rm -r --cached dist`). | Por decidir (backend) |
| PEN-025 | Media | Seguridad | En el celular, «Leer desde una foto» todavía falla en algunas fotos reales de la pantalla (Julian, 2026-09-27), aunque con las fotos simuladas lee 16 de 16. La cámara en vivo sí funciona. Si hace falta, la opción más robusta es el lector nativo ML Kit, como en `lector-codigo`. | Sin iniciar |
| PEN-026 | Baja | Dependencias | El paquete `firebase` sigue en `package.json`, aunque desde el 2026-09-27 ningún archivo lo importa (Julian decidió dejarlo instalado). | **Completado** (2026-09-28): vuelve a usarse para el inicio de sesión con Microsoft (ADR-024) |
| PEN-027 | Alta | Seguridad | Desde el 2026-09-28, en `master` del backend todas las rutas piden un token de Firebase con permiso, salvo `POST /visitors` y `POST /users` (ADR-023). Hacía falta el inicio de sesión real, un interceptor que agregue `Authorization: Bearer <token>` y traducir el claim `rolId` a los roles del frontend. | **Completado** (2026-09-28): `auth.interceptor.ts` agrega el token solo a las peticiones a `environment.apiUrl`; `rolId` 1 → `user`, 2 → `security`, 3 y 4 → `admin` (ADR-024). Las cuentas deben ser `@uniempresarial.edu.co`, también las de los guardias: `POST /users` rechaza otros correos |
| PEN-028 | Alta | Visitantes | El formulario de visitantes solo acepta placas `ABC123` (formato de carro), así que rechaza las de moto. El backend (`master`, 2026-09-28) ya acepta `ABC12D`, las antiguas `ABC12` y `ABC123` (`/^[A-Z]{3}[0-9]{2}[A-Z0-9]?$/`). | **Completado** (2026-09-28): mismo patrón y mensaje «Usa el formato de placa de moto: ABC12D.» |
| PEN-029 | Media | Backend | Observaciones para el líder de backend al agregar roles (2026-09-28): **(1)** el backend no comprueba que un vehículo, historial o usuario sea de quien lo pide; por eso userEstandar solo tiene permisos que no exponen datos ajenos. **(2)** `POST /vehicles` toma el dueño del cuerpo y no del token. **(3)** Un rol nuevo llega al token cuando este se renueva (hasta 1 hora). **(4)** `role_id_user` es texto y no es llave foránea a `Role`. **(5)** Restaurar un usuario reactiva en Firebase un uid fijo (`testRestoreUser.ts`), no el del usuario. **(6)** El `.env` sigue versionado aunque está en el `.gitignore`: la contraseña de la base y la llave de Firebase quedaron en el repositorio; hay que sacarlo del índice y cambiar la llave. **(7)** El dominio `@uniempresarial.edu.co` que exige `POST /users` está escrito en el código; para vender el producto a otras instituciones (ADR-001) debería venir del `.env`. | Por decidir (backend) |
| PEN-030 | Alta | Backend | El rol userEstandar no tenía `access-record:historical` ni `access-record:read-open`, así que el historial y las estadísticas del usuario (`GET /parking/historical/:plate`) y «Vehículos dentro» de Parqueaderos (`GET /parking/records/open`) recibían 403. No bastaba con darle los permisos: el backend no comprobaba que la placa fuera de quien pregunta (PEN-029), y los registros abiertos exponen las placas de todos. | **Parcial** (2026-09-28): `GethistoricalByPlateUseCase` ya valida que la placa sea del uid del token cuando quien pregunta es userEstandar (403 si no lo es); vigilancia y administración siguen sin esa restricción. Con eso, userEstandar ya tiene `access-record:historical`. `access-record:read-open` sigue sin dársele: expone las placas de todo el mundo y falta un conteo de ocupación sin placas (backend) |
| PEN-031 | Media | Administración | Faltan en la administración: cambiar el rol de una cuenta (`PATCH /users/:userId/role`, que es como se crea un guardia: se registra con su correo institucional y la administración le asigna «vigilante»), dar de baja un usuario (`DELETE /users/:id`) y marcar una incidencia como resuelta. | Sin iniciar |
| PEN-032 | Baja | Backend | `GET /parkingZone` responde 201 (Created) en lugar de 200; el frontend lo acepta igual, pero no es el código correcto para una consulta. | Por decidir (backend) |
| PEN-020 | Baja | Seguridad | En «Dentro ahora», un vehículo institucional no tenía hora de ingreso real (el backend solo guardaba `is_authorized`), así que el orden por hora lo dejaba al final. Con los registros de acceso (ADR-021) cada ingreso tiene su hora: se resuelve al reconstruir «Dentro ahora» sobre ellos (PEN-021). | **Completado** (2026-09-27): «Dentro ahora» ordena por la hora real de ingreso de todos |
| MEJ-001 | Media | Estilos | Bootstrap está importado en `styles.css`, pero ninguna vista usa sus clases (revisado de nuevo el 2026-09-28): solo aplica su hoja base. Sus 252 kB son los que dejan el paquete inicial en 555 kB (límite de 500 kB), y sus clases chocan con `.card`, `.table` y `.btn`. Quitarlo pide revisar a ojo todas las pantallas. Conviene decidirlo antes de evaluar Ionic (ADR-015). | Por decidir |
| MEJ-002 | Baja | Estilos | El límite de estilos por componente se subió a 12 kB (aviso) por `admin-dashboard` y `register-vehicle`. El 2026-09-28 los dos bajaron mucho al borrar sus estilos sin uso: se puede volver al límite normal. | Sin iniciar |
| MEJ-003 | Baja | Documentación | Generar un sitio navegable con la documentación del código (p. ej. Compodoc). Hay que verificar antes su compatibilidad con Angular 22. | Por decidir |
| MEJ-004 | Baja | Dependencias | `npm audit` reporta dos avisos moderados en dependencias de las herramientas (`hono` y `qs`). Revisar con `npm audit fix`. | Por decidir |
| MEJ-005 | Baja | Seguridad | La tarjeta de resultado se reevalúa cuando cambia algo en portería, no con el paso del tiempo: el aviso de movimiento repetido (menos de 2 minutos) puede seguir visible un rato de más si nada cambia. Al registrar se vuelve a evaluar con la hora real, así que no permite errores. | Sin iniciar |

---

## 6. Registro de decisiones

Formato ADR ligero: contexto, decisión, alternativas y consecuencias. Estados posibles: Propuesto, Aceptado, Reemplazado por ADR-XXX u Obsoleto. Una decisión aceptada no se edita: si cambia, se escribe un ADR nuevo que la reemplace.

| ID | Fecha | Decisión | Estado |
| --- | --- | --- | --- |
| ADR-001 | 2026-08-31 | Marca personalizable desde un solo archivo | Aceptado |
| ADR-002 | 2026-09-05 | Firebase JS SDK en lugar de `@angular/fire` | Aceptado (vuelve con ADR-024 tras retirarse en ADR-022) |
| ADR-003 | 2026-09-05 | Pase de visitante con token opaco, vigencia corta y uso único | Reemplazado por ADR-020 |
| ADR-004 | 2026-09-13 | Verificación humana de la tarjeta de propiedad | Reemplazado en parte por ADR-024 (sin documentos mientras el backend no los reciba, PEN-003) |
| ADR-005 | 2026-09-13 | Modo demostración con datos locales | Reemplazado por ADR-022 |
| ADR-006 | 2026-09-14 | Un solo flujo de control de acceso con dirección automática | Aceptado |
| ADR-007 | 2026-09-14 | Identificación según el tipo de vehículo y de persona | Aceptado |
| ADR-008 | 2026-09-14 | Ocupación por conteo con cupo por tipo | Aceptado |
| ADR-009 | 2026-09-14 | Cuenta individual por guardia y registro de turnos | Retirado por ADR-020 (sin turnos mientras el backend no los tenga) |
| ADR-010 | 2026-09-14 | Layout común aislado por rol | Aceptado |
| ADR-011 | 2026-09-14 | Estructura de componentes del dashboard de seguridad | Aceptado |
| ADR-012 | 2026-09-14 | Lector de QR basado en el proyecto `lector-codigo` | Aceptado |
| ADR-013 | 2026-09-14 | Lectura de placas: simulada ahora, ML Kit en la app | Reemplazado por ADR-016 |
| ADR-014 | 2026-09-15 | La aplicación se entrega como PWA | Aceptado |
| ADR-015 | 2026-09-15 | Ionic queda como opción abierta | Aceptado |
| ADR-016 | 2026-09-15 | Lectura de QR y placas dentro de la PWA | Aceptado para desarrollo |
| ADR-017 | 2026-09-15 | Documentación del código con TSDoc | Aceptado |
| ADR-018 | 2026-09-15 | Deshacer sin rastro y anular con motivo | Aceptado |
| ADR-019 | 2026-09-15 | Leer el QR desde una foto como respaldo de la cámara | Aceptado |
| ADR-020 | 2026-09-26 | Conexión al backend real (`camilo-dev`): nuevo modelo de visitantes y reducción del dashboard de seguridad | Reemplazado en parte por ADR-021 (ingreso del visitante) |
| ADR-021 | 2026-09-27 | Módulo Parking: el QR valida el ingreso y la ocupación sale de las zonas | Aceptado |
| ADR-022 | 2026-09-27 | Retiro del modo demostración: quedan Visitantes, Seguridad y el acceso simulado de los guardias | Reemplazado en parte por ADR-024 (sale también el acceso simulado; vuelve Firebase) |
| ADR-023 | 2026-09-28 | Roles y permisos en el backend: cada ruta exige su permiso | Aceptado |
| ADR-024 | 2026-09-28 | Integración de las ramas: sin modo demostración, inicio de sesión real y servicios por módulo del backend | Aceptado |

### ADR-001 · Marca personalizable desde un solo archivo

- **Estado:** Aceptado · **Fecha:** 2026-08-31
- **Contexto:** Uni-parking se venderá a otras instituciones, cada una con su marca.
- **Decisión:** colores, logos, nombre del producto, nombre de la institución y dominio de correo salen de `src/app/core/config/branding.config.ts`, que los publica como variables CSS. Ningún componente escribe colores ni el nombre de la universidad.
- **Consecuencias:** cambiar de cliente no exige tocar componentes, pero toda vista nueva debe usar esas variables.

### ADR-002 · Firebase JS SDK en lugar de `@angular/fire`

- **Estado:** Aceptado · **Fecha:** 2026-09-05
- **Contexto:** la instalación de `@angular/fire` fallaba porque exigía una versión anterior de Angular.
- **Decisión:** usar el paquete `firebase` directamente, cargado con import dinámico solo al iniciar sesión. Sin credenciales configuradas, la app entra en modo demostración.
- **Alternativas descartadas:** forzar la instalación de `@angular/fire` con dependencias incompatibles.
- **Consecuencias:** hay menos integración automática con Angular, pero el proyecto no depende del ritmo de actualización de esa librería.

### ADR-003 · Pase de visitante con token opaco, vigencia corta y uso único

- **Estado:** Aceptado · **Fecha:** 2026-09-05
- **Contexto:** se pidió bloquear las capturas de pantalla del QR. En la web eso no es posible, y en iOS tampoco con app nativa.
- **Decisión:** el QR solo contiene un token aleatorio, sin datos personales. Vence a los 15 minutos, sirve una sola vez y la pantalla lo tapa cuando la app pasa a segundo plano.
- **Consecuencias:** una captura filtrada deja de servir enseguida. El pase debe guardarse en el sistema para que seguridad lo valide (COR-002).

### ADR-004 · Verificación humana de la tarjeta de propiedad

- **Estado:** Aceptado · **Fecha:** 2026-09-13
- **Contexto:** al registrar una moto, los datos escritos deben coincidir con la tarjeta de propiedad y con la cuenta institucional.
- **Decisión:** el sistema compara solo los nombres con la cuenta y revisa que la placa no esté repetida. Un administrador revisa la tarjeta con una lista de comparación punto por punto. Solo puede aprobar con todos los puntos marcados; también puede rechazar (con motivo) o pedir actualizar un documento.
- **Alternativas descartadas:** leer la tarjeta automáticamente (OCR) en esta etapa.
- **Consecuencias:** la aprobación depende de una persona; la lista reduce errores y deja constancia.

### ADR-005 · Modo demostración con datos locales

- **Estado:** Aceptado · **Fecha:** 2026-09-13
- **Contexto:** todavía no hay un proyecto de Firebase configurado.
- **Decisión:** sin credenciales, la app usa cuentas simuladas y datos de ejemplo ficticios, y guarda los cambios en el navegador con claves `uniparking.demo.v1.*` (desde el 2026-09-15, `uniparking.demo.v2.*`; ver bitácora).
- **Consecuencias:** los flujos completos entre roles se pueden probar, pero nada de esto es seguro ni se comparte entre dispositivos (PEN-001, PEN-002).

### ADR-006 · Un solo flujo de control de acceso con dirección automática

- **Estado:** Aceptado · **Fecha:** 2026-09-14
- **Contexto:** el personal de seguridad registra ingresos y salidas. Se evaluó hacer componentes separados para cada dirección.
- **Decisión:** un único flujo (identificar → validar → registrar). El sistema decide la dirección: si el vehículo tiene un ingreso abierto es salida; si no, es ingreso.
- **Alternativas descartadas:** componentes separados de ingreso y salida. Duplican la cámara, la búsqueda y la tarjeta de resultado, y obligan al guardia a elegir la dirección, que es el error típico en hora pico.
- **Consecuencias:** el guardia hace menos pasos, pero hay que manejar casos como una salida sin ingreso o un ingreso abierto de otro día (ver 4.6).

### ADR-007 · Identificación según el tipo de vehículo y de persona

- **Estado:** Aceptado · **Fecha:** 2026-09-14
- **Contexto:** motos, bicicletas, scooters y visitantes llegan con datos distintos, y solo las motos tienen placa.
- **Decisión:**
  - **Motos institucionales:** foto de placa, con registro automático si la lectura es clara y el registro está aprobado.
  - **Bicicletas y scooters institucionales:** búsqueda por documento; confirma el guardia.
  - **Visitantes:** QR; confirma el guardia.
  - Una moto sin registro aprobado no ingresa, salvo como visitante con QR.
  - La salida de visitantes no exige el QR.
- **Consecuencias:** hacen falta un lector de placas (ADR-013) y guardar los pases (COR-002). También hay que agregar marca (opcional) y color (obligatorio) al scooter, y serial opcional a la bicicleta de visitantes.

### ADR-008 · Ocupación por conteo con cupo por tipo

- **Estado:** Aceptado · **Fecha:** 2026-09-14
- **Contexto:** los puestos están numerados, pero no se asignan y no hay sensores.
- **Decisión:** cada tipo de vehículo tiene un cupo configurable. Los ocupados se calculan contando los ingresos abiertos, y los disponibles son el cupo menos los ocupados.
- **Alternativas descartadas:** asignar un puesto al ingresar. Agrega un paso en portería y nadie verifica que se respete.
- **Consecuencias:** la ocupación deja de guardarse como un número fijo y se calcula a partir de los movimientos, que pasan a ser la única fuente de verdad.

### ADR-009 · Cuenta individual por guardia y registro de turnos

- **Estado:** Aceptado · **Fecha:** 2026-09-14
- **Contexto:** los guardias pertenecen a una empresa de vigilancia externa y no se sabe si la universidad les dará correo institucional. Es indispensable saber quién toma y quién entrega cada turno, y quién autorizó cada movimiento.
- **Decisión:** el administrador crea y desactiva una cuenta por guardia (documento y contraseña). Registrar movimientos exige un turno activo, y cada movimiento queda a nombre del guardia. Si luego hay correos institucionales, solo cambia el inicio de sesión.
- **Alternativas descartadas:**
  - Celular de portería con un PIN por guardia: un PIN se presta fácil y la trazabilidad es débil.
  - Esperar los correos institucionales: bloquea el uso real mientras tanto.
- **Consecuencias:**
  - El dashboard de administración necesitará una sección para gestionar las cuentas de guardias.
  - El inicio de sesión debe aceptar estas cuentas aunque no sean del dominio institucional; el rol se valida en el servidor.

### ADR-010 · Layout común aislado por rol

- **Estado:** Aceptado · **Fecha:** 2026-09-14
- **Contexto:** los tres dashboards deben tener el mismo header y sidebar, pero el contenido de un rol nunca puede aparecer en el de otro. Hoy `main-dashboard` y `admin-dashboard` repiten el armazón y `/inicio` no tiene guard (COR-001).
- **Decisión:**
  1. Un solo `dashboard-layout` (header + sidebar + contenido) que no conoce datos de ningún rol.
  2. Un grupo de rutas por rol, protegido con `canMatch`: si el rol no coincide, la ruta no se carga y su código ni siquiera se descarga.
  3. El menú sale de la configuración del grupo de rutas del rol, no de un menú general filtrado.
  4. Al iniciar sesión, cada rol va a su propio inicio; una dirección de otro rol redirige al inicio propio.
  5. Cada dashboard usa solo los servicios y datos de su rol.
  6. Al cerrar sesión se limpia el estado en memoria, algo importante en celulares compartidos.
  7. La protección real está en el servidor: reglas de Firestore con el rol en los claims. Los guards del frontend no son seguridad por sí solos.
- **Alternativas descartadas:** un header y un sidebar por dashboard. Triplica cada corrección y rompe la consistencia y la marca personalizable.
- **Consecuencias:** hay que migrar los dos dashboards existentes y agregar pruebas de aislamiento por rol.

### ADR-011 · Estructura de componentes del dashboard de seguridad

- **Estado:** Aceptado · **Fecha:** 2026-09-14
- **Decisión:** `security-dashboard` como página principal, más `lector-codigo-qr`, `plate-capture` y `access-result`. Las reglas van en los servicios `access-control` y `shift` (ver 4.9).
- **Alternativas descartadas:**
  - Componentes separados para ingreso y salida (ver ADR-006).
  - Todo dentro de `security-dashboard`: crece sin control, como pasó con `admin-dashboard`, y la cámara necesita aislarse para liberarse bien.
- **Consecuencias:** las reglas se prueban sin cámara y los componentes nuevos se nombran en inglés.

### ADR-012 · Lector de QR basado en el proyecto `lector-codigo`

- **Estado:** Aceptado · **Fecha:** 2026-09-14
- **Contexto:** Julian ya construyó un lector de QR y códigos de barras con Angular 22 y Capacitor 8 (proyecto `lector-codigo`, clase de aplicaciones móviles).
- **Decisión:** reutilizar su `EscanerService` (ML Kit nativo en el celular, ZXing en el navegador) y su capa de cámara, adaptados a la marca. No se traen Ionic ni el historial de lecturas.
- **Consecuencias:** al usar la misma versión de Angular no hay conflictos de dependencias. Para usar ML Kit hay que agregar Capacitor a Uni-parking (fase 6). Ese proyecto no tiene configuración PWA.

### ADR-013 · Lectura de placas: simulada ahora, ML Kit en la app

- **Estado:** Reemplazado por ADR-016 (2026-09-15) · **Fecha:** 2026-09-14
- **Decisión:** construir el flujo con un lector simulado y la placa siempre editable. En la app, usar ML Kit Text Recognition en el dispositivo.
- **Alternativas:**
  - API especializada de placas: más precisa de noche y con ángulos, pero cobra por lectura, la foto sale a un tercero y exige backend.
  - Tesseract.js en el navegador: poco preciso con placas y lento en celulares económicos.
- **Consecuencias:** la foto de la placa es un dato personal, así que hay que definir cuánto tiempo se guarda ([pregunta 3](#9-preguntas-abiertas)).

### ADR-014 · La aplicación se entrega como PWA

- **Estado:** Aceptado · **Fecha:** 2026-09-15
- **Contexto:** el proyecto se manejará como aplicación web progresiva, y en portería se usará desde el celular.
- **Decisión:**
  - Configurar la PWA con `@angular/service-worker` (la misma versión de Angular del proyecto), `public/manifest.webmanifest` e íconos generados del isotipo de la marca (`public/icons`).
  - El service worker guarda solo archivos de la aplicación: código, estilos, íconos y fuentes. Nunca guarda datos personales ni respuestas del backend (`ngsw-config.json` no tiene `dataGroups`).
  - En desarrollo (`ng serve`) el service worker está apagado.
- **Alternativas descartadas:** entregar principalmente una app nativa con Capacitor. Exige tiendas y compilar por plataforma; queda como opción (ADR-015).
- **Consecuencias:**
  - La app se instala desde el navegador y abre sin conexión (verificado en Edge sin interfaz: service worker activo y recarga sin red).
  - Para probar el service worker hay que compilar y servir la carpeta `dist` (ver sección 8).
  - La cámara en el celular exige HTTPS.
  - ML Kit no está disponible en la PWA (ver ADR-016).
  - El paquete inicial crece unos 6 kB.

### ADR-015 · Ionic queda como opción abierta

- **Estado:** Aceptado · **Fecha:** 2026-09-15
- **Contexto:** es probable que la materia pida usar Ionic, pero no está confirmado.
- **Decisión:** no instalar Ionic todavía, y construir de forma que adoptarlo sea un cambio localizado:
  1. Las reglas viven en servicios, independientes de los componentes visuales.
  2. El armazón está en un solo lugar (`dashboard-layout`). Con Ionic pasaría a `ion-split-pane`, `ion-menu` e `ion-router-outlet` sin tocar dashboards ni rutas.
  3. Los colores salen de variables CSS de la marca, que se pueden mapear a las de Ionic (`--ion-color-primary`, etc.) desde `branding.config.ts`.
  4. Componentes standalone y sin zone.js: Ionic Angular 9 declara compatibilidad con Angular 18 o superior (verificado con `npm view @ionic/angular peerDependencies`), y el proyecto `lector-codigo` ya lo usa con Angular 22 sin zone.js.
  5. Cámara y lectura detrás de servicios con implementación web, para sumar la nativa (Capacitor) sin cambiar pantallas.
- **Alternativas descartadas:** instalar Ionic ya. Suma peso y una tercera capa de estilos junto a la propia y a Bootstrap (MEJ-001), sin que esté confirmado.
- **Consecuencias:** si la materia lo confirma, un ADR nuevo definirá la migración del layout. Conviene resolver antes MEJ-001.

### ADR-016 · Lectura de QR y placas dentro de la PWA

- **Estado:** Aceptado para desarrollo; reemplaza ADR-013 · **Fecha:** 2026-09-15
- **Contexto:** ADR-013 contaba con ML Kit en una app nativa, pero la entrega principal es una PWA (ADR-014) y ML Kit solo funciona en apps nativas de Android e iOS.
- **Decisión:**
  - **QR:** ZXing en el navegador, como en `lector-codigo`. ML Kit solo si se empaqueta con Capacitor.
  - **Placas:** lector simulado mientras se construye el flujo (Fase 4). El definitivo se elige en las pruebas de portería (Fase 6) entre:
    - lectura en el navegador (p. ej. Tesseract.js): gratis y sin conexión, pero menos precisa con placas;
    - una API especializada a través del backend: más precisa, con costo por lectura y la foto sale a un tercero.
  - ML Kit, solo si se adopta Capacitor (ADR-015).
  - La placa siempre queda editable y la búsqueda por documento siempre está disponible.
- **Consecuencias:** `plate-reader` debe exponer una sola interfaz con varias implementaciones. Sigue abierto cuánto tiempo se guardan las fotos ([pregunta 3](#9-preguntas-abiertas)).

### ADR-017 · Documentación del código con TSDoc

- **Estado:** Aceptado · **Fecha:** 2026-09-15
- **Contexto:** la materia y el proyecto piden documentar el código, además del avance.
- **Decisión:** todo código nuevo o modificado se documenta con comentarios TSDoc (`/** … */`) en español, con la convención de la sección 8. El código anterior a la Fase 1 se completa de forma progresiva (PEN-015).
- **Alternativas descartadas:** documentar el código en archivos aparte, que se desactualizan con facilidad. Generar un sitio navegable (Compodoc) queda por decidir (MEJ-003).
- **Consecuencias:** el editor muestra la documentación al pasar el cursor sobre clases, funciones y propiedades. Cada cambio debe dejar documentado lo que agrega.

### ADR-018 · Deshacer sin rastro y anular con motivo

- **Estado:** Aceptado · **Fecha:** 2026-09-15
- **Contexto:** la especificación (4.6) pide «Deshacer» durante 10 segundos y, después, anular con motivo. Faltaba decidir qué rastro deja cada uno, quién puede anular y qué pasa con la ocupación y con los pases.
- **Decisión:**
  - **Deshacer** (primeros 10 segundos): devuelve todo al estado anterior sin dejar rastro, porque el error se nota en el momento y el movimiento no llegó a ocurrir. Si el ingreso usó un pase, el pase vuelve a quedar vigente.
  - **Anular** (después): el movimiento no se borra. Queda en la bitácora marcado «Anulado», con guardia, hora y motivo (mínimo 5 caracteres), y deja de contar para la ocupación, los conteos del turno y el historial del usuario.
  - Solo se anulan movimientos del **turno activo propio**.
  - Anular un ingreso anula la estancia completa. Anular una salida deja el vehículo dentro otra vez; si ya volvió a entrar, primero hay que anular ese ingreso.
  - Anular el ingreso de un visitante **no** reactiva su pase: necesita uno nuevo (ADR-003).
- **Alternativas descartadas:**
  - Borrar movimientos: se pierde la trazabilidad que exige trabajar con una empresa de vigilancia externa (ADR-009).
  - Dejar que cualquier guardia anule cualquier movimiento: podría alterar lo que registró otro turno.
- **Consecuencias:**
  - Las estancias guardan `entryAnnulment` y `annulledExits`; los movimientos anulados se derivan de ahí.
  - Corregir movimientos de turnos anteriores queda para la administración ([pregunta 12](#9-preguntas-abiertas)).
  - Con Firestore, anular debe ser una escritura protegida por reglas: solo el guardia del turno.

### ADR-019 · Leer el QR desde una foto como respaldo de la cámara

- **Estado:** Aceptado · **Fecha:** 2026-09-15
- **Contexto:** la cámara en vivo exige HTTPS y permiso, y puede fallar: permiso negado, otra app usando la cámara o un navegador sin acceso a ella. Los visitantes solo entran con QR (ADR-007), así que la búsqueda manual no sirve para su ingreso.
- **Decisión:** `lector-codigo-qr` ofrece siempre «Leer desde una foto». El guardia toma una foto del QR con la cámara del celular, o la elige de la galería, y ZXing la lee igual que en vivo. La foto no se guarda.
- **Alternativas descartadas:**
  - Dejar entrar al visitante buscándolo por documento: rompe la regla de ingreso con QR y el uso único del pase.
  - Escribir el código a mano: el token tiene 36 caracteres y no es práctico en portería.
- **Consecuencias:** el mismo motor de lectura sirve para la cámara y para las fotos, y se descarga solo cuando se usa. En computador se puede probar el flujo completo sin cámara, con una captura del QR del pase.

### ADR-020 · Conexión al backend real (`camilo-dev`): nuevo modelo de visitantes y reducción del dashboard de seguridad

- **Estado:** Aceptado · **Fecha:** 2026-09-26
- **Contexto:** el backend del equipo (rama `camilo-dev`, la que trae las últimas actualizaciones según Camilo Sánchez, líder de backend) ya tiene módulos reales de Visitantes, Vehículos y Usuarios, con un modelo distinto al que se diseñó en demostración (ADR-003, ADR-006, ADR-007, ADR-009): ya no se guarda el vehículo del visitante por separado, no existe un paso de autorizar su ingreso, y no hay turnos ni movimientos históricos en el backend.
- **Decisión:**
  - Los datos del vehículo de un visitante viven solo en su fila de `visitor` (campos planos: placa, marca, color, tipo y modelo), nunca duplicados en `vehicle`: esa tabla es solo de vehículos institucionales.
  - Enviar el formulario de visitantes **es** el ingreso: no hay confirmación aparte del guardia. El QR lleva el id numérico que asigna el backend. Reemplaza el pase con token, vigencia de 15 minutos y uso único de ADR-003.
  - El guardia solo tiene una acción sobre un visitante: marcar su salida (`PATCH /visitors/:id/exit`).
  - El control de acceso deja de ser solo de visitantes: también cubre vehículos institucionales. El guardia escanea o escribe la placa; el sistema decide sola si corresponde autorizar (ingreso) o desautorizar (salida), igual que ya se decidía con visitantes (ADR-006). La generación del QR de ingreso/salida de un usuario institucional queda fuera de este ADR (se construye en otra parte del proyecto); aquí solo se construye el lado de portería que lo escanea.
  - El dashboard de seguridad se reduce a **Resumen** (quién está dentro, de verdad, combinando visitantes y vehículos institucionales) y **Control de acceso**. Turnos (ADR-009), movimientos históricos, «Vehículos dentro» como pantalla aparte y `access-result` se retiran: el backend todavía no tiene esos módulos, y mantenerlos habría significado seguir mostrando datos quemados al guardia. Puestos disponibles por tipo queda pendiente hasta que exista el módulo de Parking.
  - Todo el código de esos dos módulos que hablaba con datos de demostración se elimina, no se deja apagado ni comentado: `AccessControlService`, `ShiftService`, `VisitorPassService` (reemplazado por `VisitorApiService`), sus modelos (`access.ts`, `shift.ts`) y sus semillas.
  - Los servicios se reorganizan por módulo del backend, reflejando su estructura: `core/services/modules/visitors/` y `core/services/modules/security-dashboard/`.
  - No se modifica el backend bajo ninguna circunstancia: el frontend se adapta a lo que ya expone `camilo-dev`, incluyendo trabajar del lado del frontend con que `GET /vehicles/:plate` solo encuentra vehículos autorizados (se busca también entre los desautorizados si la primera consulta falla).
  - Se siembran datos de ejemplo reales a través de la API real, nunca datos quemados en el frontend: 5 usuarios institucionales con un vehículo cada uno y 5 visitantes, algunos con salida ya registrada.
- **Alternativas descartadas:** mantener turnos y movimientos con datos de demostración mientras el backend no los tenga. Se descarta porque contradice la limpieza pedida: mostrarle al guardia datos que no son reales es peor que no mostrar la sección.
- **Consecuencias:**
  - Se pierde temporalmente la trazabilidad por turno y el historial de movimientos; vuelven cuando el backend tenga esos módulos.
  - La suite de pruebas baja de 250 a 178: se eliminan las de lo que ya no existe y se agregan las de los servicios y pantallas reescritos.
  - Queda por confirmar que el QR de ingreso/salida del usuario institucional codifica la **placa** del vehículo (PEN-018): es el único identificador que expone hoy el módulo de Vehículos, y el escaneo de portería se construyó sobre ese supuesto.
  - La limpieza de datos quemados solo se hizo en Visitantes y Seguridad; el resto del proyecto (dashboard de usuarios, administración, registro de vehículos) sigue en modo demostración (PEN-019).
  - La sección 4 de este documento describe el diseño original de demostración; para Visitantes y Seguridad, este ADR es la versión vigente.

### ADR-021 · Módulo Parking: el QR valida el ingreso y la ocupación sale de las zonas

- **Estado:** Aceptado; reemplaza la parte de ADR-020 según la cual enviar el formulario era el ingreso · **Fecha:** 2026-09-27
- **Contexto:** el backend agregó el módulo Parking (`camilo-dev`, commits `a1d54c8` a `84c49a2`): zonas de parqueo con capacidad y puestos libres por tipo de vehículo, y registros de acceso (`access_record`) con placa, visitante, zona, hora de ingreso y hora de salida. Con eso, registrarse ya no tiene que ser entrar: una persona puede llenar el formulario y al final no ingresar.
- **Decisión:**
  - Enviar el formulario de visitantes solo registra la visita. El QR (el id del registro) es la llave de acceso: el ingreso queda validado cuando portería lo escanea y lo registra (`POST /parking/entry/visitor/:id`), y la salida cuando el guardia la registra con un botón (`PATCH /parking/exit/visitor/:id`).
  - Los vehículos de la comunidad entran y salen igual, por placa (`/parking/entry/:plate`, `/parking/exit/:plate`). `is_authorized` pasa a ser el permiso para entrar, no «está dentro»; sin permiso no se ofrece el ingreso.
  - Sin el QR a mano, el guardia encuentra al visitante por documento o por la placa de su moto; vale su registro más reciente.
  - El resumen toma la ocupación de las zonas (`GET /parkingZone`): vehículos dentro = capacidad − puestos libres, en total y por tipo.
  - Mientras el backend no deje consultar los registros de acceso (PEN-021): el guardia ve las dos acciones y el backend rechaza la que no corresponde, con su motivo; «Dentro ahora» muestra un aviso en lugar de la lista, y «Movimientos de hoy» no se muestra.
- **Alternativas descartadas:**
  - Seguir mostrando en «Dentro ahora» a los visitantes sin salida y a los vehículos autorizados: con este modelo, eso incluye a quien solo se registró y a quien solo tiene permiso, y el guardia vería como «dentro» a gente que no entró.
  - Registrar el ingreso sin que el guardia lo confirme al escanear: se pierde la verificación del documento, y un escaneo de alguien que va saliendo abriría un ingreso.
- **Consecuencias:**
  - La lista «Dentro ahora» (búsqueda, filtros, orden y paginación) se retiró por ahora y se reconstruye sobre los registros de acceso, que traen la hora de ingreso de todos, también de la comunidad (resuelve PEN-020).
  - El ingreso dependía de corregir tres errores del backend (PEN-022); se corrigieron el 2026-09-27 con autorización del líder de backend.

### ADR-022 · Retiro del modo demostración: quedan Visitantes, Seguridad y el acceso simulado de los guardias

- **Estado:** Aceptado; reemplaza ADR-005 y retira el uso de Firebase de ADR-002 · **Fecha:** 2026-09-27
- **Contexto:** Visitantes y Seguridad ya trabajan con el backend real (ADR-020, ADR-021). El resto del proyecto seguía en modo demostración (ADR-005, PEN-019): el inicio de sesión de la comunidad y de administración, el dashboard de usuarios, el registro de vehículos, la administración y las notificaciones usaban cuentas simuladas y servicios con datos quemados guardados en el navegador. Antes de integrar la rama, Julian pidió dejar solo lo que se usa de verdad, para que no haya confusiones entre los desarrolladores sobre qué está en uso.
- **Decisión:**
  - Se borra todo lo que generaba o guardaba datos de demostración: los servicios `parking`, `parking-stats`, `stay`, `vehicle-registration`, `incident`, `notification`, `upload` y `microsoft-auth`; la carpeta `core/demo` (semillas, documentos de ejemplo, reloj y almacenamiento de demostración); `auth.interceptors.ts`; `firebase.config.ts` y `parking.config.ts`; y `utils/id.ts`. Nada queda apagado ni comentado.
  - Las pantallas sin backend (dashboard de usuarios, registro de vehículos, administración y notificaciones) se conservan como **componentes vacíos**: compilan con su HTML y su CSS intactos, pero sin servicios ni datos, y cada sección muestra su estado vacío. Las acciones que necesitan backend (adjuntar, enviar, aprobar, rechazar y pedir actualización) validan lo que corresponde y avisan que el módulo no está conectado. Sus rutas siguen, pero ninguna cuenta puede abrirlas.
  - El login queda con «Visitantes» y el acceso simulado de los dos guardias (Carlos Ramírez y Diana Morales), que sigue validando las rutas de seguridad (ADR-010). La sesión simulada se guarda en `sessionStorage` (`uniparking.session`) mientras la pestaña esté abierta. Se retiran el inicio con Microsoft y el acceso de administración.
  - Los modelos de `core/models` se recortan a lo que usan los componentes: salen los movimientos, las anulaciones y las marcas de las estancias, y los ayudantes que solo usaban los servicios borrados.
  - El paquete `firebase` sigue instalado por decisión de Julian, aunque ya no lo importa ningún archivo (PEN-026).
- **Alternativas descartadas:**
  - Borrar también las pantallas: se van a conectar después y su diseño ya está hecho.
  - Dejar el modo demostración apagado con una bandera: seguiría habiendo código que nadie usa y que confunde al integrar.
- **Consecuencias:**
  - Resuelve PEN-019 y cierra PEN-001. La Fase 5 vuelve a «Sin iniciar»: la disponibilidad y el historial del usuario se harán sobre el backend.
  - La suite de pruebas baja de 186 a 133: salen las de los servicios borrados y las que dependían de datos de ejemplo. Las pantallas vacías se prueban con sus estados vacíos y sus validaciones.
  - Las pruebas de rutas por rol siguen cubriendo a la comunidad y la administración con cuentas que solo existen en las pruebas (`testing/demo-session.ts`).

### ADR-023 · Roles y permisos en el backend: cada ruta exige su permiso

- **Estado:** Aceptado · **Fecha:** 2026-09-28
- **Contexto:** el líder de backend pidió, para la rama `master` del backend: registrar todas las rutas como permisos, crear los roles, relacionarlos por la tabla `RolePermission`, un endpoint para cambiar el rol de un usuario en Firebase y en la base de datos, y exigir permiso en todas las rutas. La base de datos de pruebas estaba vacía.
- **Decisión:**
  - Cuatro roles con ids fijos, porque Firebase guarda el id en el claim `rolId` del token: 1 userEstandar, 2 vigilante, 3 administrador y 4 superadmin.
  - Un permiso por ruta (32), con nombre `módulo:acción` (p. ej. `access-record:visitor-entry`). `shared/config/seedPermission.ts` es la fuente de verdad: en cada arranque la base queda igual a sus listas de permisos, roles y asignaciones.
  - Qué puede cada rol: el vigilante tiene lo que usa el panel de seguridad (zonas, quién está dentro, ingresos y salidas, vehículos, visitantes, historial) y reportar incidencias; userEstandar solo consulta las zonas, registra vehículos y ve un usuario; administrador y superadmin tienen todo.
  - Dos rutas quedan públicas a propósito: `POST /visitors` (el visitante no tiene cuenta) y `POST /users` (quien se registra todavía no tiene rol; la ruta sí exige token y le asigna userEstandar).
  - `PATCH /users/:userId/role` cambia el rol en Firebase y en la base, y deshace el cambio en la base si Firebase falla. Nadie asigna un rol igual o superior al suyo: el administrador solo mueve usuarios entre userEstandar y vigilante; el superadmin puede todo. El primer superadmin se crea desde la consola con `scripts/setRol.ts <correo> <rolId>`.
- **Alternativas descartadas:** exigir permiso también en `POST /visitors` y `POST /users`. Nadie podría registrarse: el visitante no tiene cuenta y el usuario nuevo todavía no tiene rol.
- **Consecuencias:**
  - El frontend tiene que enviar el token de Firebase en cada petición al backend (PEN-027); hasta entonces, el panel de seguridad no funciona contra `master`.
  - La matriz de permisos es una propuesta: la confirma el líder de backend. Hasta que el backend compruebe a quién pertenece cada dato, userEstandar tiene lo mínimo (PEN-029).

### ADR-024 · Integración de las ramas: sin modo demostración, inicio de sesión real y servicios por módulo del backend

- **Estado:** Aceptado; reemplaza en parte ADR-022 (el acceso simulado de los guardias) y ADR-004 (documentos), y reactiva ADR-002 · **Fecha:** 2026-09-28
- **Contexto:** con el backend y el frontend casi terminados, Julian pidió integrar el trabajo. `frontend-miguel` tenía casi todos los módulos conectados al backend (inicio de sesión con Microsoft, panel de usuario, registro de vehículos, administración, foto de placa en Android); `frontend-julian` tenía el retiro del modo demostración, Visitantes, Seguridad y el módulo Parking. Las dos ramas habían divergido y los servicios estaban repetidos y dispersos (`core/services/modules/...`, archivos `.sp.service.ts`, servicios sueltos en `core/services/`). Julian pidió borrar todo lo que no se use en el flujo del parking y todo dato quemado, y ordenar los servicios sin dejar archivos sueltos.
- **Decisión:**
  - **Rama:** `frontend-integracion` sale de `frontend-miguel` y se le une `frontend-julian` (commit `b869f89`); ninguna de las dos ramas originales se toca. El merge automático había borrado o cambiado en silencio archivos que Miguel usa: se recuperaron antes del commit.
  - **Servicios por módulo del backend**, un archivo por módulo, sin duplicados: `services/api/` (`users-api`, `vehicles-api`, `visitors-api`, `parking-api`, `incidents-api`), `services/auth/` (`auth.service` y `firebase-auth`), `services/scanner/` (`qr-scanner` y `plate-scanner`) y `services/student-panel/` (`student-vehicles` y `student-parking`, lo que combina varios módulos para el panel del usuario). Los archivos se movieron con `git mv` para conservar su historial.
  - **Sin modo demostración:** salen las cuentas simuladas, los accesos directos del login, las semillas de solicitudes, los documentos de ejemplo y todo lo que solo existía para la demostración. Se usa solo el inicio de sesión con Microsoft (Firebase), con la configuración real del proyecto (sus valores son públicos por diseño; lo protegen las reglas y el backend).
  - **Autenticación:** el interceptor envía el token solo al backend (`environment.apiUrl`); el rol sale del claim `rolId`; las rutas esperan a que Firebase restaure la sesión antes de decidir. Firebase se usa a través del token `FIREBASE_AUTH`, que las pruebas reemplazan por uno sin red.
  - **Registro de vehículos** solo contra el backend y sin documentos, porque el backend no los recibe (opción elegida por Julian). Sale el modo «actualizar documentos».
  - **Novedades de seguridad** con los campos que guarda el backend (título, descripción, estado y quién reporta); la placa, si se escribe, va en la descripción. Salen la gravedad y la zona, que el backend no tiene.
  - Se borra lo que ya no tiene uso: la campana de notificaciones (sin API), «Configuración» del menú de cuenta (sin función), servicios repetidos, modelos y funciones sin uso y 173 reglas de CSS que ninguna plantilla usaba.
- **Alternativas descartadas:**
  - Unir las ramas directamente en `main` o en una de las dos: si algo salía mal, se perdía el punto de partida de ambas.
  - Ordenar los servicios por pantalla (como estaba `modules/security-dashboard`): la misma API terminaba repetida en varias carpetas.
  - Dejar el modo demostración apagado con una bandera: seguiría habiendo código y datos que nadie usa.
- **Consecuencias:**
  - Resuelve PEN-013, PEN-026, PEN-027 y PEN-028. Todas las pantallas trabajan con el backend real.
  - El historial, las estadísticas y «Vehículos dentro» del usuario recibían 403 hasta que el backend le diera esos permisos a userEstandar de forma segura (PEN-030); el historial y las estadísticas ya están resueltos (2026-09-28), «Vehículos dentro» sigue pendiente.
  - Todas las cuentas, también las de los guardias, deben ser `@uniempresarial.edu.co`: `POST /users` rechaza las demás.
  - Las pruebas usan cuentas ficticias por rol (`testing/test-session.ts`) y respuestas del backend fabricadas (`testing/backend-stubs.ts`). La suite queda en 163 pruebas.

---

## 7. Bitácora de cambios

Basada en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/): lo más reciente va arriba, las fechas en formato AAAA-MM-DD y los cambios se agrupan en **Agregado**, **Cambiado**, **Corregido**, **Eliminado** y **Seguridad**. Lo que aún no está en `main` va en **Sin publicar**.

### [Sin publicar] · rama `frontend-integracion`

Une `frontend-miguel` y `frontend-julian` (ADR-024). Salvo el merge (`b869f89`), todo va sin commit, para revisión de Julian.

#### Agregado

- 2026-09-28 · Rama `frontend-integracion`: parte de `frontend-miguel` y le une `frontend-julian`. Trae de Miguel el inicio de sesión con Microsoft, el panel de usuario (inicio, «Vehículos» con el QR de cada vehículo, «Parqueaderos» y «Estadísticas»), el registro de vehículos contra el backend, la administración y la foto de placa con ML Kit en Android.
- 2026-09-28 · `auth.interceptor.ts`: envía el token de Firebase en cada petición al backend, y a nadie más (PEN-027).
- 2026-09-28 · Seguridad, sección **Novedades**: el guardia reporta una incidencia con título, descripción y placa opcional; la administración la ve en su sección de incidencias.
- 2026-09-28 · Administración: avisos cuando el backend no responde o rechaza un cambio, y los botones se desactivan mientras se guarda.
- 2026-09-28 · Pruebas: `testing/test-session.ts` (cuentas ficticias por rol y un Firebase sin red) y `testing/backend-stubs.ts` (respuestas fabricadas del backend para el panel de usuario). Pruebas nuevas: la espera de la sesión en las rutas, el reporte de novedades, las acciones de la administración y el registro de vehículos contra el backend. La suite pasa a 163 pruebas.

#### Cambiado

- 2026-09-28 · Servicios ordenados por módulo del backend (ADR-024): `services/api/` (`users-api`, `vehicles-api`, `visitors-api`, `parking-api` e `incidents-api`), `services/auth/` (`auth.service` y `firebase-auth`, antes `microsoft-auth`), `services/scanner/` (`qr-scanner`, antes `scanner.service`, y `plate-scanner`) y `services/student-panel/` (`student-vehicles`, antes `students.service`, y `student-parking`, antes `parking.service`). Las clases se renombraron igual (`QrScannerService`, `VehiclesApiService`, `VisitorsApiService`, `UsersApiService`, `IncidentsApiService`, `StudentVehiclesService` y `StudentParkingService`).
- 2026-09-28 · Las rutas por rol esperan a que Firebase restaure la sesión antes de decidir (PEN-013); el rol sale del claim `rolId` (1 usuario, 2 seguridad, 3 y 4 administración).
- 2026-09-28 · Registro de vehículos en tres pasos (vehículo, datos y confirmar): crea el vehículo en el backend y avisa que queda pendiente de aprobación. Los campos son los que guarda el backend (placa, marca, modelo y color en la moto; marca y color en bicicleta y scooter).
- 2026-09-28 · El panel de administración usa los estilos de la marca en lugar de estilos escritos en la plantilla, y una sección desconocida muestra el resumen.
- 2026-09-28 · El formulario de visitantes acepta las placas que acepta el backend: `ABC12D`, `ABC12` y `ABC123` (PEN-028).
- 2026-09-28 · El QR (del visitante y de cada vehículo) se dibuja con un solo ayudante, `utils/qr-code.ts`, que las pruebas pueden reemplazar.
- 2026-09-28 · Modelos: `visitor-pass.ts` pasa a `visitor.ts`; `vehicle.ts` sin «línea» ni serial del marco, que el backend no guarda; `isAuthorized` documentado como lo que es, el permiso para entrar.
- 2026-09-28 · `environments.ts` apunta a `http://localhost:3000`; cada quien pone ahí la dirección de su backend sin subir el cambio.

#### Corregido

- 2026-09-28 · Backend (rama `juanjose-develop-firebase`): el historial y las estadísticas del panel de estudiante recibían 403 desde que se endureció `authorize` en todas las rutas (PEN-030). `GethistoricalByPlateUseCase` ya comprueba que la placa consultada sea del uid del token cuando quien pregunta es userEstandar, y ese rol ya tiene `access-record:historical`. «Vehículos dentro» de Parqueaderos sigue pendiente: necesitaría exponer las placas de todo el mundo, y todavía no hay una versión que solo cuente.
- 2026-09-28 · El superadmin (`rolId` 4) entraba como usuario común; ahora entra a la administración.
- 2026-09-28 · Administración: «Aprobados» mostraba la lista de pendientes, y «Rechazar» y «Eliminar» llamaban rutas que no hacen eso; el contador de incidencias del menú nunca se actualizaba.
- 2026-09-28 · Las novedades se enviaban con campos que el backend no conoce (gravedad, zona, placa) y sin quién las reportó.
- 2026-09-28 · Texto dañado por la codificación en «Parqueaderos» («quiAc!n estAc!») y en comentarios del panel de seguridad.
- 2026-09-28 · Pruebas que ya no compilaban en la rama de Miguel (tipos del backend desactualizados y servicios que ya no existían).

#### Eliminado

- 2026-09-28 · El modo demostración: cuentas y accesos directos del login, semillas de solicitudes, documentos de ejemplo, reloj y almacenamiento de demostración (`core/demo`), la sesión simulada de los guardias y `parking.config.ts`.
- 2026-09-28 · Servicios repetidos o sin uso: `parking-api.sp`, `vehicles-api.sp`, `admin-api`, `user-profile`, `notification`, `parking-stats`, `upload` y `vehicle-registration`, con sus modelos (`parking-stats.ts`, `vehicle-registration.ts`, `notification.ts`) y `utils/id.ts`.
- 2026-09-28 · Del registro de vehículos: el paso de documentos, el modo «actualizar documentos» y los campos «línea» y serial del marco.
- 2026-09-28 · La campana de notificaciones del header (sin API, siempre vacía) y «Configuración» del menú de cuenta (sin función).
- 2026-09-28 · De los modelos, lo que ya nada usaba: estancias con auditoría, anulaciones y movimientos (`parking.ts`), `visitorFullName` y `documentLabel`, `momentLabel`, `totalOccupied` y `UsersApiService.deactivate`.
- 2026-09-28 · 173 reglas de CSS que ninguna plantilla usaba (gráficas, revisión de documentos y visor de la administración; subida de archivos del registro; temporizador del pase de visitante).

#### Seguridad

- 2026-09-28 · El token de Firebase solo viaja al backend propio (`environment.apiUrl`), nunca a servicios de terceros.

### [Sin publicar] · rama `frontend-julian`

#### Agregado

- 2026-09-28 · [dependencias.md](dependencias.md): todas las librerías del frontend, para qué sirve cada una, si se usa y cómo se instala, con los pasos de Capacitor (incluido el permiso de cámara, que se agrega a mano al generar `android/`) y de la PWA.
- 2026-09-28 · Backend (rama `master`, pedido por el líder de backend): roles y permisos (ADR-023). Seed con 32 permisos, uno por ruta, los 4 roles con ids fijos y sus asignaciones; `authorize` en todas las rutas salvo `POST /visitors` y `POST /users`; `PATCH /users/:userId/role`; y `scripts/setRol.ts` recibe el correo y el rol. Verificado contra la base local: el seed deja siempre 4 roles, 32 permisos y 85 asignaciones, y las 32 rutas responden 401 sin token.
- 2026-09-27 · «Dentro ahora» vuelve al resumen de seguridad, ahora con los registros de acceso abiertos: la búsqueda (placa, documento o nombre), los filtros de quién y de vehículo, el orden por hora real de ingreso y la paginación de siete en siete. La tarjeta «Vehículos dentro» vuelve a decir cuántos son de la comunidad y cuántos visitantes.
- 2026-09-27 · Backend (autorizado por el líder de backend): `GET /parking/records/open`, los registros de acceso sin salida.
- 2026-09-27 · `ParkingApiService` (módulo Parking del backend, ADR-021): zonas de parqueo e ingreso y salida en `access_record`, para visitantes y para la comunidad.
- 2026-09-27 · Resumen de seguridad con la ocupación real de las zonas: tarjetas «Vehículos dentro» y «Puestos disponibles», y «Ocupación por tipo de vehículo» (reutiliza `zone-availability`).
- 2026-09-27 · Control de acceso: «Registrar ingreso» y «Registrar salida» para visitantes y vehículos de la comunidad, con el motivo del backend cuando rechaza un movimiento; búsqueda del visitante por documento o placa cuando no tiene el QR a mano.
- 2026-09-27 · Los 5 visitantes de ejemplo se volvieron a crear por la API: la base de datos se había vaciado con la actualización del backend.
- 2026-09-26 · Conexión real de **Visitantes** y **Seguridad** al backend del equipo (rama `camilo-dev`, ADR-020): `VisitorApiService` y `VehicleApiService` nuevos, reorganizados en `core/services/modules/visitors` y `core/services/modules/security-dashboard`.
- 2026-09-26 · Datos de ejemplo reales sembrados a través de la API, no quemados en el frontend: 5 usuarios institucionales con vehículo y 5 visitantes.
- 2026-09-26 · Verificación de punta a punta en el navegador contra el backend real: registrar un visitante, marcarle la salida, y autorizar y desautorizar un vehículo institucional.
- 2026-09-26 · Resumen de seguridad: tres filtros combinables en «Dentro ahora» — texto libre (placa, documento o nombre), quién (todos, visitantes o comunidad) y tipo de vehículo (todos, moto, scooter o bicicleta) — más orden por hora de ingreso (el más reciente primero) y paginación de siete en siete. El título «Dentro ahora» y «Actualizar» quedan en su propia fila arriba; los tres filtros van en una fila aparte debajo.
- 2026-09-15 · Dashboard de seguridad, sección **Control de acceso** (Fases 2 y 3): búsqueda por placa, documento o nombre y lectura del pase QR del visitante. La tarjeta de resultado (`access-result`) muestra la persona y el vehículo según su tipo, los bloqueos y los avisos por confirmar, y ofrece cerrar un ingreso de otro día o registrar una salida sin ingreso con nota. Cada registro se puede deshacer durante 10 segundos.
- 2026-09-15 · Secciones **Vehículos dentro** (filtros por tipo, persona y texto; salida desde cada vehículo) y **Movimientos** (del turno o de todo el día, con notas, marcas y anulación con motivo, ADR-018).
- 2026-09-15 · `AccessControlService` (identificar, validar, decidir la dirección, registrar, deshacer y anular) y su modelo `core/models/access.ts`.
- 2026-09-15 · `StayService`: salida sin ingreso, cierre de ingresos de otro día, anulación de ingresos y salidas, y restauración para «Deshacer».
- 2026-09-15 · `VisitorPassService` guarda los pases: emitir, validar, marcar como usado, devolver a vigente y anular. Datos de ejemplo con los pases usados de los dos visitantes que están dentro.
- 2026-09-15 · `lector-codigo-qr` con ZXing: cámara trasera, linterna si el equipo la tiene y lectura desde una foto (ADR-019). `ScannerService` es el único punto de acceso a la cámara.
- 2026-09-15 · Buscador del header por rol: en seguridad lleva a Control de acceso con lo escrito.
- 2026-09-15 · Formularios: marca opcional y color obligatorio del scooter (registro y visitantes), serial opcional en bicicletas de visitantes y documento obligatorio en bicicletas del registro (PEN-009). La revisión del scooter en administración incluye color y marca.
- 2026-09-15 · Formatos de hora y día para portería (`core/utils/dates.ts`): «hoy a las…», «ayer a la 1:40 p. m.».
- 2026-09-15 · La suite de pruebas unitarias pasa de 164 a 250 (control de acceso, estancias, pases, tarjeta de resultado, lector, dashboard de seguridad, rutas, fechas y formularios).
- 2026-09-15 · Rol de seguridad con dos guardias de demostración (Carlos Ramírez y Diana Morales) y accesos directos en el login: «Administración», «Guardia Carlos» y «Guardia Diana».
- 2026-09-15 · Rutas por rol con `canMatch`: cada rol solo abre y descarga sus pantallas, y cualquier otra dirección lo lleva a su inicio. Pruebas de aislamiento entre roles (`app.routes.spec.ts`).
- 2026-09-15 · `dashboard-layout`: header y sidebar comunes, con el menú que aporta cada grupo de rutas (`DASHBOARD_NAVIGATION`).
- 2026-09-15 · Dashboard de seguridad, sección **Resumen**: vehículos dentro, puestos disponibles y en uso por tipo, alertas, últimos movimientos y estado del turno.
- 2026-09-15 · Dashboard de seguridad, sección **Turno**: tomar, entregar y recibir el turno, cerrar la jornada y ver los turnos recientes.
- 2026-09-15 · `StayService` (estancias, ocupación y movimientos), `ShiftService` (turnos) y configuración de cupos en `parking.config.ts`.
- 2026-09-15 · Componente compartido `zone-availability` para la disponibilidad por tipo.
- 2026-09-15 · Incidencias creadas al recibir un turno con diferencias en el conteo; avisos dirigidos al equipo de seguridad.
- 2026-09-15 · Datos de ejemplo: diez vehículos aprobados más, estancias del día (con dos visitantes) y turnos.
- 2026-09-15 · PWA: manifiesto, íconos generados del isotipo y service worker de Angular.
- 2026-09-15 · Documentación TSDoc en todo el código nuevo o modificado.
- 2026-09-15 · La suite de pruebas unitarias pasa de 117 a 164 pruebas (rutas por rol, layout, estancias, turnos, dashboard de seguridad y disponibilidad).
- 2026-09-14 · Este documento de planeación, con el estado del proyecto y lo construido hasta ese día.
- 2026-09-14 · Especificación del dashboard de seguridad y decisiones ADR-006 a ADR-013.

#### Cambiado

- 2026-09-28 · Backend (`master`, merge de `nico_dev`): `POST /users` exige correo `@uniempresarial.edu.co` y, si el usuario ya existe, no le cambia el rol: solo copia a Firebase el de la base de datos (201 si es nuevo, 200 si ya existía). El backend usa ahora el proyecto de Firebase de Nico, y `synchronize` se apaga con `NODE_ENV=production`. El merge automático había dejado `app.ts` con marcadores de conflicto escondidos (el merge tenía dos bases comunes); se corrigió antes del commit.
- 2026-09-28 · `.gitignore` ignora la carpeta `android/` de Capacitor: cada quien la genera en su equipo (ver [dependencias.md](dependencias.md)).
- 2026-09-28 · Backend (rama `master`, pedido por un sublíder de backend): la marca acepta números, varias palabras y guiones («Mazda 3», «Harley-Davidson»); el color acepta espacios («Azul oscuro»); en bicicleta y scooter la marca y el color pueden quedar vacíos; la placa del visitante acepta `ABC12D`, `ABC12` y `ABC123` (falta el frontend, PEN-028). Al registrarse, el rol por defecto pasa de 3 (hoy administrador) a 1 (userEstandar), y registrarse otra vez responde 409 en lugar de reiniciar el rol.
- 2026-09-27 · Revisión de `core/` y `testing/` antes de integrar: todo lo que queda tiene uso (ver [Estructura de `core/` y `testing/`](#estructura-de-core-y-testing)). Se corrigieron comentarios que todavía hablaban de Firestore, de Firebase Storage y del conteo de ocupación anterior.
- 2026-09-27 · El login queda con «Visitantes» y el acceso simulado de los dos guardias; salen «Iniciar sesión con Microsoft» y el acceso de administración (ADR-022). `AuthService` ya no usa Firebase: solo abre y cierra la sesión simulada del guardia, guardada en `sessionStorage` mientras la pestaña esté abierta.
- 2026-09-27 · El dashboard de usuarios, el registro de vehículos, la administración y las notificaciones quedan como componentes vacíos: el mismo diseño, sin servicios ni datos, y cada sección con su estado vacío. Adjuntar, enviar, aprobar, rechazar y pedir actualización avisan que el módulo no está conectado al backend; el menú de administración ya no muestra contadores (ADR-022).
- 2026-09-27 · Los tipos de las estadísticas pasan del servicio borrado a `core/models/parking-stats.ts`, y `app.config.ts` registra `HttpClient` sin interceptor.
- 2026-09-27 · La suite de pruebas pasa de 186 a 133: salen las de los servicios borrados y las que dependían de datos de ejemplo. Las de rutas por rol usan cuentas de comunidad y de administración que solo existen en las pruebas (`testing/demo-session.ts`).
- 2026-09-27 · El paquete inicial baja de 541 kB a 536 kB (sigue el aviso de MEJ-001).
- 2026-09-27 · Enviar el formulario de visitantes ya no es el ingreso: solo registra la visita, y el QR es la llave que portería escanea para validar el ingreso (ADR-021). El botón pasa a decir «Registrar visita».
- 2026-09-27 · Vehículos de la comunidad: el ingreso y la salida ya no autorizan ni desautorizan el vehículo (eso ahora es el permiso para entrar), sino que abren y cierran su registro de acceso.
- 2026-09-26 · El formulario de visitantes ya no muestra cuenta regresiva ni vencimiento: enviarlo es el ingreso (ADR-020). Los campos de vehículo del visitante se simplifican al modelo plano del backend: marca y color siempre obligatorios, placa solo para moto, sin serial de marco.
- 2026-09-26 · El dashboard de seguridad se reduce a Resumen y Control de acceso; el resumen combina visitantes y vehículos institucionales reales (ADR-020).
- 2026-09-15 · El menú de seguridad pasa a cinco secciones y el botón del resumen, «Registrar ingreso o salida», lleva a Control de acceso.
- 2026-09-15 · Los campos de vehículo por tipo salen de una sola tabla (`VEHICLE_REQUIREMENTS`: obligatorio, opcional o no se pide), que usan el registro y el formulario de visitantes.
- 2026-09-15 · Generar un pase nuevo desde el formulario de visitantes anula el anterior.
- 2026-09-15 · Los conteos del resumen y del turno ignoran los movimientos anulados; el historial del usuario ya no muestra estancias anuladas.
- 2026-09-15 · Nuevas dependencias: `@zxing/browser` 0.2.1 y `@zxing/library` 0.23.0, cargadas solo al usar el lector; el paquete inicial no cambia (519 kB).
- 2026-09-15 · `main-dashboard` y `admin-dashboard` ya no pintan header ni sidebar: lo hace `dashboard-layout`.
- 2026-09-15 · La disponibilidad y el historial del usuario salen de las mismas estancias que ve portería. El historial solo trae las estancias de quien tiene la sesión.
- 2026-09-15 · El sidebar ya no trae opciones propias: recibe las del rol.
- 2026-09-15 · Las claves del modo demostración pasan a `uniparking.demo.v2.*`, porque los datos de ejemplo cambiaron de forma.
- 2026-09-15 · Las cuentas de seguridad no exigen correo institucional (ADR-009); el menú de cuenta oculta el correo cuando no hay.
- 2026-09-15 · El paquete inicial pasa de 512 kB a 519 kB por el registro del service worker.
- 2026-09-15 · La hoja de ruta suma la PWA base a la Fase 1, y la Fase 6 pasa a ser «PWA en portería y opción nativa».
- 2026-09-14 · `.gitignore` ignora las carpetas `.claude/`.

#### Corregido

- 2026-09-28 · Backend (rama `master`): el seed de permisos insertaba otra vez los mismos permisos en cada arranque, y dos rutas pedían el permiso de la otra (`GET /parking/status/:plate` y `GET /parkingZone`). El middleware `authorize` consultaba dos veces el permiso en cada petición.
- 2026-09-27 · Backend (autorizado por el líder de backend): la salida ya no libera el puesto antes de cerrar el registro; el contador de puestos ya no se descuadra con ingresos simultáneos; `npm run build` vuelve a compilar (PEN-022).
- 2026-09-27 · App Android (Capacitor): la cámara no abría porque el manifiesto no declaraba el permiso `CAMERA`, y sin declararlo Android lo niega sin preguntar. Agregado en `android/app/src/main/AndroidManifest.xml`.
- 2026-09-27 · «Leer desde una foto» no reconocía el QR en fotos de celular tomadas a una pantalla: ZXing recibía la foto completa (12 MP o más) y la rejilla de píxeles del monitor lo confundía. Ahora la foto se reduce con suavizado (1024, 1600 o 640 px de lado) y se lee con `TRY_HARDER`. En 16 fotos simuladas de pantalla, el lector anterior leyó 4 y el nuevo las 16.
- 2026-09-27 · Backend (con autorización del líder de backend): los tres errores del ingreso en el módulo Parking (PEN-022). Ningún ingreso se guardaba, cada intento fallido gastaba un puesto y dos visitantes sin placa no podían estar dentro a la vez.
- 2026-09-27 · El backend ahora devuelve el dueño de un vehículo como `owner.name` (antes `owner.name_user`): el panel de seguridad mostraba el nombre vacío y el buscador de «Dentro ahora» fallaba. Adaptado en `vehicle-api.service`.
- 2026-09-26 · En «Dentro ahora», un visitante sin placa (bicicleta o scooter) mostraba el título vacío en vez del tipo de vehículo: el backend devuelve `''` (no `null`) cuando no hay placa, y el `??` no lo tomaba como ausente.
- 2026-09-15 · COR-002: los pases QR se guardan y portería puede validarlos.
- 2026-09-15 · COR-001: `/inicio` ya no se abre sin sesión ni desde la cuenta de otro rol.

#### Eliminado

- 2026-09-27 · El rol `visitor` (`UserRole` y su inicio en `ROLE_HOME`): los visitantes no tienen cuenta, y ninguna ruta, cuenta ni prueba lo usaba.
- 2026-09-27 · Todo lo que generaba o guardaba datos de demostración fuera de Visitantes y Seguridad (ADR-022): los servicios `parking`, `parking-stats`, `stay`, `vehicle-registration`, `incident`, `notification`, `upload` y `microsoft-auth` (con sus pruebas); la carpeta `core/demo` (semillas de estancias y solicitudes, documentos de ejemplo, reloj y almacenamiento de demostración); `core/interceptors/auth.interceptors.ts`; `core/config/firebase.config.ts` y `parking.config.ts`; y `core/utils/id.ts`.
- 2026-09-27 · De los modelos, lo que solo usaban esos servicios: movimientos, anulaciones y marcas de las estancias (`parking.ts`); `requirementsFor`, `isAsked` y `NO_VEHICLE_REQUIREMENTS` (`vehicle.ts`); `missingRequiredDocuments` y `statusNote` (`vehicle-registration.ts`); `visitorFullName` y `documentLabel` (`visitor-pass.ts`); y `momentLabel` (`dates.ts`).
- 2026-09-27 · Todo el código de Firebase. El paquete `firebase` sigue instalado por decisión de Julian, pero ya no entra en el build (PEN-026).
- 2026-09-27 · La lista «Dentro ahora» (búsqueda, filtros, orden y paginación) sale por ahora del resumen: con el modelo nuevo mostraría como dentro a quien solo se registró. Vuelve sobre los registros de acceso (PEN-021). También sale `registerExit` de `VisitorApiService`: `PATCH /visitors/:id/exit` no cierra el registro de acceso y el backend lo marcó para borrar.
- 2026-09-26 · `AccessControlService`, `ShiftService`, `VisitorPassService` (y sus modelos, semillas y pruebas), el componente `access-result`, y las secciones de Turno y Movimientos del dashboard de seguridad: reemplazados por el backend real o retirados hasta que el backend tenga esos módulos (ADR-020).
- 2026-09-26 · Auditoría de código huérfano en `core/` antes de subir la rama a integrar: se confirmó con qué archivo usa cada cosa y se borró lo que ningún componente ni servicio importaba: `accessibility` y `footer` (componentes creados sin contenido, nunca enlazados a ninguna ruta) y `user-profile.service.ts` (nunca importado). El resto de `core/` sigue en uso — por ejemplo `parking.service`, `stay.service`, `vehicle-registration.service` e `incident.service` los usan hoy `main-dashboard`, `admin-dashboard` y `register-vehicle`, así que no se tocan aunque no sean del enfoque actual (visitantes y seguridad).

#### Seguridad

- 2026-09-15 · Los pases de visitante son de un solo uso de verdad: al validar quedan usados, un visitante que sale necesita un pase nuevo y anular su ingreso no reactiva el pase (ADR-018).
- 2026-09-15 · Aislamiento por rol en el frontend (ADR-010). La protección de los datos sigue pendiente en el servidor (PEN-002).

### 2026-09-13 · Registro de vehículos, administración y notificaciones (`c99e9ca`)

#### Agregado

- Registro de vehículos en cuatro pasos (vehículo, datos, documentos y confirmación), con campos según el tipo, comparación de nombres con la cuenta, placa única y fotos comprimidas antes de enviarse.
- Modo «actualizar documento» cuando el administrador lo pide.
- Dashboard de administración: resumen, pendientes, aprobados, rechazados, actualizaciones, estadísticas e incidencias. La revisión incluye visor de documentos, verificación automática y lista de comparación.
- «Mis vehículos» (hasta 5, con estados y eliminación) e «Historial de entradas y salidas» con filtro de 1, 7, 15 y 30 días.
- Panel de notificaciones por rol, con enlace a la solicitud.
- Guards de sesión y de administrador; acceso de administrador en modo demostración.
- Datos de demostración ficticios guardados en el navegador; 117 pruebas unitarias.

#### Cambiado

- «Mis vehículos» se alimenta de las solicitudes de registro.
- El sidebar admite enlaces, contadores y un texto de contexto.

#### Corregido

- En celular: tooltips de las gráficas que se salían de la pantalla, etiquetas que desbordaban las filas y correos que se partían a mitad del dominio.

### 2026-09-09 · Barra superior del dashboard (`5c2f093`)

#### Agregado

- Header con buscador al centro, notificaciones y menú de cuenta (foto, nombre, correo, vínculo, «Configuración» y «Cerrar sesión»).

#### Cambiado

- La barra superior sale de `main-dashboard` y pasa a ser el componente `header`, compartido; ajustes del sidebar.

### 2026-09-06 · Dashboard de usuarios (`5a91ab0`)

#### Agregado

- Dashboard de usuarios con resumen, disponibilidad por zona, un primer historial de entradas y salidas y sidebar colapsable.
- Modelos de vehículo y de parqueadero.
- Componentes base `security-dashboard` y `lector-codigo-qr`, todavía vacíos.

#### Cambiado

- Visitantes: el tipo de vehículo (moto, bicicleta o scooter) se pregunta antes que la placa, y los campos cambian según el tipo (moto: marca, color y placa; bicicleta: marca y color; scooter: ninguno más).
- Login: se quitaron el subtítulo y el aviso del dominio institucional.

### 2026-09-05 · Acceso con Microsoft y pase de visitante (`2937df0`)

#### Agregado

- Inicio de sesión con Microsoft a través de Firebase, con modo demostración cuando no hay credenciales.
- Formulario de visitantes y pase QR de un solo uso con vigencia de 15 minutos.

#### Corregido

- El logo del login no cargaba.
- El formulario de visitantes se descuadraba al mostrar errores de validación.

### 2026-08-31 · Estructura inicial y diseño del login (`dafe644`, `048b380`)

#### Agregado

- Estructura de carpetas y componentes base.
- Primer diseño del login con los colores institucionales; configuración de marca (`branding.config.ts`).

### 2026-08-26 · Proyecto inicial (`0a85578`)

#### Agregado

- Proyecto Angular del frontend.

---

## 8. Convenciones

### Estados

Cada tarea, fase y módulo lleva siempre su estado, y se actualiza en cuanto cambia:

- **Completado:** terminado, probado y registrado en la bitácora. En la hoja de ruta, casilla marcada `[x]` y fecha.
- **Pendiente:** se empezó y quedó a medias. Casilla sin marcar y una nota breve con lo que falta.
- **Sin iniciar:** todavía no tiene trabajo.
- **Por decidir:** solo en la tabla de pendientes, cuando falta una decisión del equipo.

Una fase queda **Completada** cuando todas sus tareas lo están, **Pendiente** si alguna ya empezó y **Sin iniciar** si ninguna.

### Ramas

- `main`: versión estable.
- `frontend-julian` y `frontend-miguel`: una rama por desarrollador.
- `frontend-integracion`: une las dos anteriores (ADR-024); desde aquí se propone el pull request a `main`.
- Propuesta: integrar a `main` mediante pull request revisado.

### Mensajes de commit (propuesta)

Formato `tipo(ámbito): descripción en español`, basado en [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/):

- `feat(seguridad): registrar ingreso con foto de placa`
- `fix(visitantes): guardar el pase emitido`
- `docs: actualizar la hoja de ruta`

Tipos: `feat` (función nueva), `fix` (corrección), `docs`, `refactor`, `test`, `style` y `chore`.

### Código

- Textos de interfaz, comentarios y documentación en español; clases y archivos nuevos en inglés.
- La marca sale solo de `branding.config.ts` (ADR-001); la capacidad y la ocupación de las zonas, del backend (`GET /parkingZone`, ADR-021).
- Nada de datos quemados: lo que no tiene backend todavía se muestra vacío, no con datos de ejemplo (ADR-022).
- Los estados llevan siempre icono y texto, nunca solo color.
- Los datos de prueba son siempre ficticios: nunca datos de documentos o personas reales.
- Las reglas de negocio van en servicios (`core/services`), no en componentes.
- Mobile-first: todo debe verse bien en computador y en celular (probar al menos a 375 y 320 px de ancho).

### Estructura de `core/` y `testing/`

Revisada el 2026-09-28 (ADR-024): todo lo que queda tiene uso, y cada servicio que consume el backend vive en `services/api/`, uno por módulo del backend.

| Archivo | Para qué sirve | Quién lo usa |
| --- | --- | --- |
| `config/branding.config.ts` | Colores, logos y nombres de la marca (ADR-001) | Toda la app |
| `config/firebase.config.ts` | Proyecto de Firebase y tenant de Microsoft (valores públicos por diseño) | `services/auth/firebase-auth.ts` |
| `guards/auth.guards.ts` | Espera la sesión, deja entrar a cada grupo de rutas solo al rol que le toca y manda a cada quien a su inicio (ADR-010) | Rutas y login |
| `interceptors/auth.interceptor.ts` | Agrega el token de Firebase a las peticiones al backend | `app.config.ts` |
| `layout/drawer-state.ts` | Menú lateral: cerrado en el celular, abierto en el computador | `dashboard-layout` |
| `navigation/dashboard-navigation.ts` | Cada rol declara su menú y su buscador del header (ADR-010) | Layout, sidebar y las rutas de cada rol |
| `services/api/users-api.service.ts` | Módulo de usuarios: registrarse al entrar, ver un usuario con sus vehículos, inactivos y reactivar | Sesión, panel de usuario y administración |
| `services/api/vehicles-api.service.ts` | Módulo de vehículos: registrar, buscar por placa, aprobar y quitar el permiso | Registro de vehículos, seguridad y administración |
| `services/api/visitors-api.service.ts` | Módulo de visitantes: registrar la visita y buscarla por id, documento o placa | Visitantes y seguridad |
| `services/api/parking-api.service.ts` | Módulo Parking: zonas, registros abiertos, historial por placa, ingresos y salidas | Seguridad y panel de usuario |
| `services/api/incidents-api.service.ts` | Módulo de incidencias: listar y reportar | Seguridad (reporta) y administración (lista y contador) |
| `services/auth/auth.service.ts` | La sesión: inicio con Microsoft, registro en el backend, rol del token y cierre | Login, guards, header y pantallas |
| `services/auth/firebase-auth.ts` | Única puerta al SDK de Firebase (`FIREBASE_AUTH`), cargado solo al usarlo | `auth.service` y el interceptor |
| `services/scanner/qr-scanner.service.ts` | Cámara y lectura del QR con ZXing | `lector-codigo-qr` |
| `services/scanner/plate-scanner.service.ts` | Foto de la placa y lectura con ML Kit (solo en la app de Android) | Seguridad |
| `services/student-panel/student-vehicles.service.ts` | «Mis vehículos» de quien tiene la sesión, compartido entre pantallas | Inicio, vehículos, registro y `student-parking` |
| `services/student-panel/student-parking.service.ts` | Zonas e historial de los vehículos de quien tiene la sesión | Inicio, parqueaderos y estadísticas |
| `utils/dates.ts` | Horas para portería: «hoy a las 7:05 p. m.» | Seguridad |
| `utils/qr-code.ts` | Dibuja un QR (`QR_CODE_RENDERER`) | Visitantes y vehículos |
| `models/visitor.ts` | Datos del formulario de visitantes y tipos de documento | Visitantes |
| `models/vehicle.ts` | Tipos de vehículo, qué datos pide cada uno y cómo se muestran | Todo el proyecto |
| `models/parking.ts` | Zonas y su estado (Disponible, Casi lleno, Sin cupos); estancias e historial | Seguridad y panel de usuario |
| `models/incident.ts` | Incidencias y sus estados | Administración |
| `environments/environments.ts` | Dirección del backend (`apiUrl`) | Servicios de `api/` e interceptor |
| `testing/test-session.ts` | Cuentas ficticias por rol y un Firebase sin red, para las pruebas | Solo las pruebas; no entra en la app |
| `testing/backend-stubs.ts` | Respuestas del backend fabricadas para las pruebas del panel de usuario | Solo las pruebas; no entra en la app |

Los archivos `*.spec.ts` son las pruebas unitarias (`npm test`) y tampoco entran en la app.

### Documentación del código (TSDoc)

Todo código nuevo o modificado lleva comentarios TSDoc (`/** … */`) en español (ADR-017).

- **Qué se documenta:** toda clase, interfaz, tipo, función y constante exportada; en los componentes, los inputs, outputs y métodos que usa la plantilla; en los servicios, su responsabilidad, sus reglas y los errores que lanzan.
- **Etiquetas:**
  - `@param`: qué recibe cada parámetro.
  - `@returns`: qué devuelve.
  - `@throws`: qué error lanza y cuándo.
  - `@example`: cuando el uso no es obvio.
  - Referencias a decisiones con su ID, p. ej. «(ADR-010)».
- **Qué no:** comentarios que repiten lo que ya dice el código, o TODO sin contexto.

```ts
/**
 * Valida el ingreso de un visitante: es lo que pasa al escanear su QR.
 *
 * @param visitorId Id del registro del visitante, el que lleva el QR.
 * @returns El registro de acceso que abrió el backend.
 * @throws HttpErrorResponse si el backend rechaza el ingreso, p. ej. porque el visitante ya está dentro.
 */
registerVisitorEntry(visitorId: number): Promise<BackendAccessRecord>
```

### Verificación

- Compilar: `npx ng build`
- Pruebas: `npx ng test --no-watch`
- PWA: el service worker no corre con `ng serve`. Hay que compilar y servir `dist/parking/browser` con cualquier servidor estático, y abrirlo en Chrome o Edge.
- Control de acceso con QR en computador (con el backend corriendo): registrar una visita en `/visitantes`, guardar una captura del QR, iniciar sesión con una cuenta `@uniempresarial.edu.co` que tenga el rol vigilante → Control de acceso → «Leer desde una foto».
- Dar un rol a una cuenta: la persona inicia sesión una vez (queda como userEstandar) y después se le cambia con `PATCH /users/:userId/role` o, para el primer superadmin, con `scripts/setRol.ts` del backend. El rol nuevo llega al renovar el token (cerrar sesión y volver a entrar).

### Terminado significa

- [ ] Compila sin errores nuevos.
- [ ] Las pruebas pasan y lo nuevo tiene sus propias pruebas.
- [ ] Probado en el navegador, en computador y en celular.
- [ ] Usable con teclado y lector de pantalla (etiquetas, foco y contraste).
- [ ] Lo nuevo está documentado con TSDoc.
- [ ] Este documento está actualizado: estados, hoja de ruta, bitácora, pendientes y decisiones.

### Cómo actualizar este documento

1. Al empezar una tarea, pasarla a **Pendiente**; al terminarla, marcar su casilla y pasarla a **Completado** con la fecha (ver [Estados](#estados)).
2. Actualizar el estado de la fase y del módulo en la [sección 2](#2-estado-por-módulo).
3. Anotar el cambio en **Sin publicar** de la [bitácora](#7-bitácora-de-cambios).
4. Si aparece algo por corregir, mejorar o implementar, agregarlo a los [pendientes](#5-pendientes-mejoras-y-correcciones) con el siguiente ID libre.
5. Si se toma una decisión que afecta la estructura del proyecto, escribir un ADR nuevo.
6. Cambiar la fecha de «Última actualización» y la fase actual en el encabezado.
7. Hacerlo todo en el mismo commit que el cambio.

Referencias: [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) · [Architectural Decision Records](https://adr.github.io/) · [MADR](https://github.com/adr/madr) · [Decision log del Microsoft Engineering Playbook](https://microsoft.github.io/code-with-engineering-playbook/design/design-reviews/decision-log/) · [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/)

---

## 9. Preguntas abiertas

| # | Pregunta | Afecta |
| --- | --- | --- |
| 1 | ¿Cuántas porterías hay? ¿Puede haber más de un guardia en turno al mismo tiempo? Hoy se asume una portería y un turno activo. | Turnos |
| 2 | ¿Cuáles son los cupos reales por tipo de vehículo en Uniempresarial? Hoy las zonas del backend tienen 50 (motos), 20 (bicicletas) y 10 (scooters) de ejemplo. | Ocupación |
| 3 | ¿Cuánto tiempo se guardan las fotos de las placas? Son datos personales (Ley 1581 de 2012). | Movimientos (Fase 4) |
| 4 | ¿Se notifica al usuario cada ingreso y salida de su vehículo? | Fase 5 |
| 5 | ¿La universidad dará correo institucional a los guardias? Desde el 2026-09-28 es obligatorio: el backend solo registra cuentas `@uniempresarial.edu.co` (ADR-024). Si no lo da, el backend tendría que aceptar otro dominio para los vigilantes. | Inicio de sesión |
| 6 | ¿Una persona puede tener dos roles, por ejemplo un administrativo con vehículo propio? | Roles y layout |
| 7 | ¿A qué hora cierra el parqueadero? Sirve para alertar sobre vehículos que se quedan dentro. | Resumen de seguridad |
| 8 | ¿Se quita Bootstrap o se empieza a usar? (MEJ-001) | Estilos |
| 9 | ¿La materia exigirá Ionic? (ADR-015) | Layout y estilos |
| 10 | ¿Generamos un sitio navegable con la documentación del código? (MEJ-003) | Documentación |
| 11 | Si un visitante no puede mostrar el QR al llegar (sin batería o sin datos), ¿qué hace portería? Hoy debe generar un pase nuevo: no hay ingreso de visitantes sin QR (ADR-007). | Visitantes |
| 12 | ¿Quién corrige un movimiento de un turno ya entregado? Hoy solo se anulan los del turno propio (ADR-018); lo lógico sería la administración. | Movimientos y administración |
