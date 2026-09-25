# Uni-parking · Planeación y registro de desarrollo

> **Fase actual:** Fases 1, 2 y 3 **completadas** el 2026-09-15. Sigue la **Fase 4: foto de placa** (sin iniciar).
> **Rama de trabajo:** `frontend-julian` · **Última actualización:** 2026-09-15
> **Estado técnico:** compila con un aviso de tamaño (paquete inicial de 519 kB, límite de 500 kB; ver MEJ-001) · 250 pruebas unitarias pasando (2026-09-15)

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
- **Tecnología:** Angular 22 (componentes standalone, signals, sin zone.js), `@angular/service-worker`, Firebase JS SDK 12 (inicio de sesión con Microsoft), `qrcode` (generar el pase), ZXing (`@zxing/browser`, leer el pase) y Vitest.

| Rol | Quién | Qué hace |
| --- | --- | --- |
| Usuario institucional | Estudiantes, docentes y administrativos con correo institucional | Registra hasta 5 vehículos; ve disponibilidad, historial y notificaciones |
| Visitante | Personas sin cuenta | Llena un formulario y recibe un QR para ingresar |
| Administrador | Personal de la universidad | Aprueba, rechaza o pide actualizar vehículos; ve estadísticas e incidencias |
| Personal de seguridad | Guardias de la empresa de vigilancia | Autoriza y registra ingresos y salidas; toma y entrega turnos |

---

## 2. Estado por módulo

Estados (ver [Estados](#estados)):

- **Completado:** terminado y probado.
- **Completado (demo):** terminado, pero funciona con datos de demostración; falta el backend.
- **Pendiente:** empezado y sin terminar; la nota dice qué falta.
- **Sin iniciar:** todavía no tiene trabajo.

| Módulo | Ruta | Estado | Responsable | Actualizado | Notas |
| --- | --- | --- | --- | --- | --- |
| Login | `/login` | Completado (demo) | Julian | 2026-09-15 | Inicio con Microsoft vía Firebase implementado, sin probar aún con credenciales reales. En demostración: accesos a administración y a los dos guardias |
| Visitantes | `/visitantes` | Completado (demo) | Julian | 2026-09-15 | Los pases se guardan y portería los valida (COR-002). Scooter con color obligatorio y marca opcional; serial opcional en bicicletas. En demostración, el pase solo se valida en el navegador donde se generó (PEN-016) |
| Dashboard de usuarios | `/inicio` | Completado (demo) | Julian | 2026-09-15 | Usa el layout común; disponibilidad e historial salen de las mismas estancias que registra portería |
| Registro de vehículos | `/vehiculos/registrar` | Completado (demo) | Julian | 2026-09-15 | Las bicicletas piden documento (PEN-009) y los scooters color y marca opcional |
| Dashboard de administración | `/admin/:section` | Completado (demo) | Julian | 2026-09-15 | Usa el layout común; la revisión del scooter incluye color y marca. Faltan cuentas de guardias e historial de turnos |
| Notificaciones | Panel del header | Completado (demo) | Julian | 2026-09-15 | Avisos por persona, para administración y para seguridad. Botón de configuración sin función (PEN-004) |
| Layout común por rol | — | Completado | Julian | 2026-09-15 | ADR-010. Cada rol solo ve y descarga su grupo de rutas; cada rol puede aportar su buscador del header |
| Dashboard de seguridad | `/seguridad/:section` | Pendiente | Julian | 2026-09-15 | Resumen, Turno (Fase 1), Control de acceso con búsqueda y QR, Vehículos dentro y Movimientos (Fases 2 y 3) listos. Falta la foto de placa (Fase 4) |
| PWA | — | Pendiente | Julian | 2026-09-15 | Base lista y verificada: service worker activo y apertura sin conexión. Faltan pruebas en celulares, aviso de nueva versión e íconos por cliente |
| Documentación del código (TSDoc) | — | Pendiente | Julian | 2026-09-15 | Todo lo nuevo de las Fases 1 a 3 está documentado; falta el código anterior (PEN-015) |
| Lector de QR (`lector-codigo-qr`) | — | Completado | Julian | 2026-09-15 | ZXing en la PWA, con linterna y lectura desde una foto (ADR-019). Probado con la foto de un pase real en computador; la cámara en vivo se prueba en celulares en la Fase 6 (PEN-010) |
| Accesibilidad y footer | — | Sin iniciar | — | 2026-08-31 | Componentes creados sin contenido (PEN-008) |
| Backend (Firebase) | — | Sin iniciar | — | — | Authentication, Firestore, Storage y reglas de seguridad |
| Ionic / Capacitor | — | Sin iniciar | — | — | Opcional: solo si la materia lo pide (ADR-015) |

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

**Estado de la fase: Pendiente (iniciada en la Fase 1)**

- [ ] Disponibilidad e historial del usuario alimentados por los movimientos reales — **Pendiente**: salen de las mismas estancias que registra portería desde la Fase 2, y lo anulado ya no aparece en el historial; falta comprobarlo entre dispositivos, que exige Firebase (PEN-001)
- [ ] Notificar al usuario cada ingreso y salida (por confirmar, [pregunta 4](#9-preguntas-abiertas)) — Sin iniciar

### Fase 6 · PWA en portería y opción nativa

**Estado de la fase: Sin iniciar**

- [ ] Probar la PWA instalada en celulares de portería: cámara, luz de día, noche y placas sucias o dobladas (PEN-010) — Sin iniciar
- [ ] Elegir el lector de placas definitivo (ADR-016) — Sin iniciar
- [ ] Solo si se adopta Ionic/Capacitor: empaquetar la app y probar ML Kit (ADR-015) — Sin iniciar

### Después

- [ ] Firebase real: Authentication, Firestore, Storage y reglas de seguridad — Sin iniciar
- [ ] Administración: crear y desactivar cuentas de guardias; historial de turnos — Sin iniciar
- [ ] Incidencias reportadas por seguridad desde su dashboard — Sin iniciar
- [ ] Registrar movimientos sin conexión y sincronizar después — Sin iniciar
- [ ] Aviso de nueva versión de la PWA (PEN-011) — Sin iniciar

---

## 4. Especificación: dashboard de seguridad

> Acordada el 2026-09-14. Los cambios posteriores se anotan en la bitácora; si cambian una decisión, se escribe un ADR nuevo.

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
| PEN-001 | Alta | Backend | Firebase no está configurado: todo funciona en modo demostración, con los datos guardados en el navegador (`uniparking.demo.v2.*`). | Sin iniciar |
| PEN-002 | Alta | Seguridad | Faltan las reglas de Firestore y los claims por rol. Las rutas por rol ordenan la navegación, pero no protegen datos. | Sin iniciar |
| PEN-003 | Media | Registro de vehículos | Subir los documentos a Storage; hoy quedan comprimidos en el navegador. | Sin iniciar |
| PEN-004 | Baja | Notificaciones | El botón de configuración no hace nada. | Sin iniciar |
| PEN-005 | Baja | Header | El buscador ya funciona en seguridad (lleva a Control de acceso), pero en usuarios y administración no hace nada. «Configuración» del menú de cuenta no tiene función. | Pendiente |
| PEN-006 | Baja | Dashboard de usuarios | «Parqueaderos» y «Estadísticas» del menú no llevan a ninguna parte. | Sin iniciar |
| PEN-007 | Media | Administración | Las estadísticas usan datos simulados (generador con semilla). | Sin iniciar |
| PEN-008 | Baja | Componentes | `accessibility` y `footer` están creados, pero vacíos. | Sin iniciar |
| PEN-009 | Alta | Registro de vehículos | El registro de bicicletas no pedía documento, y portería las busca por documento (ADR-007). Resuelto: tipo y número de documento obligatorios en bicicletas. | **Completado** (2026-09-15) |
| PEN-010 | Media | PWA | Probar en Android e iOS la instalación, el uso sin conexión y el lector de QR con la cámara en vivo (exige HTTPS). Verificado solo en computador: la PWA en Edge sin interfaz y el lector leyendo la foto de un pase. | Sin iniciar (Fase 6) |
| PEN-011 | Media | PWA | Avisar cuando hay una versión nueva de la app (`SwUpdate`), para no dejar a nadie con una versión vieja. | Sin iniciar |
| PEN-012 | Baja | PWA | El manifiesto y los íconos son de Uniempresarial; cada cliente necesitará los suyos al publicar. | Sin iniciar |
| PEN-013 | Alta | Autenticación | Con Firebase la sesión se restaura de forma asíncrona: las rutas por rol deben esperarla antes de decidir (hoy la sesión de demostración es inmediata). | Sin iniciar |
| PEN-014 | Media | Autenticación | En la PWA instalada en iOS, la ventana emergente de Microsoft puede fallar: usar redirección en modo `standalone`, como ya se hace en la app nativa. | Sin iniciar |
| PEN-015 | Media | Documentación | Completar TSDoc en el código anterior a la Fase 1 (ADR-017). | Pendiente |
| PEN-016 | Alta | Visitantes | En demostración los pases viven en el navegador: un pase solo se valida en el mismo navegador donde se generó. Con Firestore se comparten, y marcar un pase como usado debe ser una transacción para que dos guardias no lo validen a la vez. | Sin iniciar |
| PEN-017 | Baja | Seguridad | Vibrar al registrar un movimiento en los celulares que lo permitan (4.2). | Sin iniciar |
| MEJ-001 | Media | Estilos | Bootstrap está importado en `styles.css`, pero ninguna vista lo usa. Por eso el paquete inicial pesa 519 kB (límite de 500 kB) y sus clases chocan con `.card`, `.table` y `.btn`. Conviene decidirlo antes de evaluar Ionic (ADR-015). | Por decidir |
| MEJ-002 | Baja | Estilos | El límite de estilos por componente se subió a 12 kB (aviso) por `admin-dashboard` y `register-vehicle`. Revisarlo al separar componentes. | Sin iniciar |
| MEJ-003 | Baja | Documentación | Generar un sitio navegable con la documentación del código (p. ej. Compodoc). Hay que verificar antes su compatibilidad con Angular 22. | Por decidir |
| MEJ-004 | Baja | Dependencias | `npm audit` reporta dos avisos moderados en dependencias de las herramientas (`hono` y `qs`). Revisar con `npm audit fix`. | Por decidir |
| MEJ-005 | Baja | Seguridad | La tarjeta de resultado se reevalúa cuando cambia algo en portería, no con el paso del tiempo: el aviso de movimiento repetido (menos de 2 minutos) puede seguir visible un rato de más si nada cambia. Al registrar se vuelve a evaluar con la hora real, así que no permite errores. | Sin iniciar |

---

## 6. Registro de decisiones

Formato ADR ligero: contexto, decisión, alternativas y consecuencias. Estados posibles: Propuesto, Aceptado, Reemplazado por ADR-XXX u Obsoleto. Una decisión aceptada no se edita: si cambia, se escribe un ADR nuevo que la reemplace.

| ID | Fecha | Decisión | Estado |
| --- | --- | --- | --- |
| ADR-001 | 2026-08-31 | Marca personalizable desde un solo archivo | Aceptado |
| ADR-002 | 2026-09-05 | Firebase JS SDK en lugar de `@angular/fire` | Aceptado |
| ADR-003 | 2026-09-05 | Pase de visitante con token opaco, vigencia corta y uso único | Aceptado |
| ADR-004 | 2026-09-13 | Verificación humana de la tarjeta de propiedad | Aceptado |
| ADR-005 | 2026-09-13 | Modo demostración con datos locales | Aceptado |
| ADR-006 | 2026-09-14 | Un solo flujo de control de acceso con dirección automática | Aceptado |
| ADR-007 | 2026-09-14 | Identificación según el tipo de vehículo y de persona | Aceptado |
| ADR-008 | 2026-09-14 | Ocupación por conteo con cupo por tipo | Aceptado |
| ADR-009 | 2026-09-14 | Cuenta individual por guardia y registro de turnos | Aceptado |
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

---

## 7. Bitácora de cambios

Basada en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/): lo más reciente va arriba, las fechas en formato AAAA-MM-DD y los cambios se agrupan en **Agregado**, **Cambiado**, **Corregido**, **Eliminado** y **Seguridad**. Lo que aún no está en `main` va en **Sin publicar**.

### [Sin publicar] · rama `frontend-julian`

#### Agregado

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

- 2026-09-15 · COR-002: los pases QR se guardan y portería puede validarlos.
- 2026-09-15 · COR-001: `/inicio` ya no se abre sin sesión ni desde la cuenta de otro rol.

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
- Propuesta: integrar a `main` mediante pull request revisado.

### Mensajes de commit (propuesta)

Formato `tipo(ámbito): descripción en español`, basado en [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/):

- `feat(seguridad): registrar ingreso con foto de placa`
- `fix(visitantes): guardar el pase emitido`
- `docs: actualizar la hoja de ruta`

Tipos: `feat` (función nueva), `fix` (corrección), `docs`, `refactor`, `test`, `style` y `chore`.

### Código

- Textos de interfaz, comentarios y documentación en español; clases y archivos nuevos en inglés.
- La marca sale solo de `branding.config.ts` (ADR-001); los cupos y la portería, de `parking.config.ts`.
- Los estados llevan siempre icono y texto, nunca solo color.
- Los datos de prueba son siempre ficticios: nunca datos de documentos o personas reales.
- Las reglas de negocio van en servicios (`core/services`), no en componentes.
- Mobile-first: todo debe verse bien en computador y en celular (probar al menos a 375 y 320 px de ancho).

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
 * Registra la salida de una estancia abierta.
 *
 * @param stayId Estancia que termina.
 * @param audit Guardia, turno y método con que se identificó la salida.
 * @returns La estancia cerrada.
 * @throws StayError `not-found` si la estancia no existe, o `already-exited` si ya tenía salida.
 */
registerExit(stayId: string, audit: MovementAudit, at: Date = new Date()): ParkingStay
```

### Verificación

- Compilar: `npx ng build`
- Pruebas: `npx ng test --no-watch`
- PWA: el service worker no corre con `ng serve`. Hay que compilar y servir `dist/parking/browser` con cualquier servidor estático, y abrirlo en Chrome o Edge.
- Control de acceso con QR en computador: generar un pase en `/visitantes`, guardar una captura del QR y, en el mismo navegador, entrar como «Guardia Carlos» → Control de acceso → Pase de visitante (QR) → «Leer desde una foto».
- Datos de demostración limpios: borrar las claves `uniparking.demo.v2.*` del almacenamiento del navegador y recargar.

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
| 2 | ¿Cuáles son los cupos reales por tipo de vehículo en Uniempresarial? Hoy se usan 60, 30 y 20 de ejemplo. | Ocupación |
| 3 | ¿Cuánto tiempo se guardan las fotos de las placas? Son datos personales (Ley 1581 de 2012). | Movimientos (Fase 4) |
| 4 | ¿Se notifica al usuario cada ingreso y salida de su vehículo? | Fase 5 |
| 5 | ¿La universidad dará correo institucional a los guardias? Si lo hace, solo cambia el inicio de sesión (ADR-009). | Inicio de sesión |
| 6 | ¿Una persona puede tener dos roles, por ejemplo un administrativo con vehículo propio? | Roles y layout |
| 7 | ¿A qué hora cierra el parqueadero? Sirve para alertar sobre vehículos que se quedan dentro. | Resumen de seguridad |
| 8 | ¿Se quita Bootstrap o se empieza a usar? (MEJ-001) | Estilos |
| 9 | ¿La materia exigirá Ionic? (ADR-015) | Layout y estilos |
| 10 | ¿Generamos un sitio navegable con la documentación del código? (MEJ-003) | Documentación |
| 11 | Si un visitante no puede mostrar el QR al llegar (sin batería o sin datos), ¿qué hace portería? Hoy debe generar un pase nuevo: no hay ingreso de visitantes sin QR (ADR-007). | Visitantes |
| 12 | ¿Quién corrige un movimiento de un turno ya entregado? Hoy solo se anulan los del turno propio (ADR-018); lo lógico sería la administración. | Movimientos y administración |
