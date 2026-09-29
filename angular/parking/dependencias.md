# Uni-parking · Dependencias y librerías

> **Última actualización:** 2026-09-28 · Fuente: `package.json`

Aquí están todas las librerías que usa el frontend: para qué sirve cada una, si de verdad se usa y cómo se instala. Cuando se agregue o se quite una dependencia, se actualiza este archivo en el mismo commit y se anota en la bitácora de [planeacion-desarrollo.md](planeacion-desarrollo.md).

## Contenido

1. [Requisitos](#1-requisitos)
2. [Instalar el proyecto desde cero](#2-instalar-el-proyecto-desde-cero)
3. [Dependencias de la aplicación](#3-dependencias-de-la-aplicación)
4. [Dependencias de desarrollo](#4-dependencias-de-desarrollo)
5. [Capacitor: la app de Android](#5-capacitor-la-app-de-android)
6. [PWA: aplicación web progresiva](#6-pwa-aplicación-web-progresiva)
7. [Agregar una dependencia nueva](#7-agregar-una-dependencia-nueva)

---

## 1. Requisitos

| Herramienta | Versión | Para qué |
| --- | --- | --- |
| Node.js | 22.22.3 o superior en la rama 22, 24.15.0 o superior en la rama 24, o 26 en adelante | Lo exige Angular 22 |
| npm | 12.0.1 (lo fija `packageManager` en `package.json`) | Instalar las dependencias |
| Android Studio, con el SDK de Android | La que pida Capacitor 8 | Solo para compilar y probar la app de Android |

Para revisar las versiones instaladas:

```bash
node --version
```

```bash
npm --version
```

---

## 2. Instalar el proyecto desde cero

Todas las dependencias ya están en `package.json`, así que al clonar el proyecto basta con un solo comando: no hay que instalar las librerías una por una. Los comandos de las secciones 3 y 4 sirven para reinstalar una sola, actualizarla o replicarla en otro proyecto.

```bash
git clone <url-del-repositorio>
```

```bash
cd frontend/angular/parking
```

```bash
npm install
```

Comandos del día a día:

| Comando | Qué hace |
| --- | --- |
| `npm start` | Levanta la app en `http://localhost:4200` y se recarga con cada cambio |
| `npm test` | Corre las pruebas unitarias (Vitest) |
| `npm run build` | Compila la versión de producción en `dist/parking/browser` |

> La dirección del backend está en `src/app/environments/environments.ts` (`apiUrl`). Para probar desde el celular se pone la IP del computador en la red local; ese cambio **no se sube** al repositorio.

---

## 3. Dependencias de la aplicación

Son las que viajan dentro de la app (`dependencies` en `package.json`).

| Librería | Versión | Para qué sirve | Estado |
| --- | --- | --- | --- |
| `@angular/core`, `@angular/common`, `@angular/compiler`, `@angular/platform-browser` | ^22.0.0 | El framework: componentes, signals y arranque de la app | En uso |
| `@angular/router` | ^22.0.0 | Rutas por rol (`/login`, `/visitantes`, `/inicio`, `/admin/...`, `/seguridad/...`) | En uso |
| `@angular/forms` | ^22.0.0 | Formularios reactivos: visitantes y registro de vehículos | En uso |
| `@angular/service-worker` | ^22.1.3 | La PWA: guarda la app para abrirla sin conexión (sección 6) | En uso |
| `rxjs` | ~7.8.0 | Lo usa Angular por dentro (peticiones HTTP) | En uso |
| `tslib` | ^2.3.0 | Ayudantes de TypeScript que necesita el código compilado | En uso |
| `firebase` | ^12.18.0 | Inicio de sesión con Microsoft y el token que se envía al backend (`services/auth/firebase-auth.ts`). Se carga solo al usarlo, no entra en el paquete inicial | En uso |
| `@capacitor-firebase/authentication` | ^8.5.2 | Plugin nativo para manejar el inicio de sesión con Microsoft en Android, esquivando las restricciones del WebView | En uso (solo en la app nativa) |
| `@zxing/browser` y `@zxing/library` | ^0.2.1 y ^0.23.0 | Leer el QR con la cámara o desde una foto (`services/scanner/qr-scanner.service.ts`) | En uso |
| `qrcode` | ^1.5.4 | Dibujar el QR del visitante y el de cada vehículo (`utils/qr-code.ts`) | En uso |
| `@capacitor/core` | ^8.5.2 | Base de la app de Android (sección 5) | En uso |
| `@capacitor/camera` | ^8.2.4 | Tomar la foto de la placa en la app de Android (`services/scanner/plate-scanner.service.ts`) | En uso (solo en la app nativa) |
| `@capacitor-mlkit/text-recognition` | ^8.2.1 | Leer el texto de la placa en el celular con ML Kit, sin internet (`plate-scanner.service.ts`) | En uso (solo en la app nativa) |
| `bootstrap` | ^5.3.8 | Estilos. Está importado en `styles.css`, pero ninguna vista usa sus clases: solo aplica su hoja base. Pesa 252 kB y es lo que pasa el paquete inicial del límite (MEJ-001) | Instalada, sin uso real |

### Cómo se instala cada una

**Angular** (viene con `ng new`; para actualizarlo a la siguiente versión se usa `ng update`):

```bash
npx ng update @angular/core @angular/cli
```

**Lector de QR (ZXing):**

```bash
npm install @zxing/browser @zxing/library
```

**Firebase y Plugin Nativo** (inicio de sesión con Microsoft; la configuración del proyecto está en `core/config/firebase.config.ts`):

```bash
npm install firebase @capacitor-firebase/authentication
```

**Cámara y lectura de placas en la app de Android** (después de instalarlas hay que correr `npx cap sync android`):

```bash
npm install @capacitor/camera @capacitor-mlkit/text-recognition
```

**Generador de QR** (la segunda línea instala sus tipos para TypeScript):

```bash
npm install qrcode
```

```bash
npm install --save-dev @types/qrcode
```

**Capacitor:** ver la [sección 5](#5-capacitor-la-app-de-android).

**PWA (service worker):** ver la [sección 6](#6-pwa-aplicación-web-progresiva).

**Bootstrap** (solo si se decide usarlo; ver MEJ-001):

```bash
npm install bootstrap
```

---

## 4. Dependencias de desarrollo

Solo se usan para programar, probar y compilar; no viajan dentro de la app (`devDependencies`).

| Librería | Versión | Para qué sirve |
| --- | --- | --- |
| `@angular/cli` | ^22.0.7 | El comando `ng`: servir, compilar, probar y generar código |
| `@angular/build` | ^22.0.7 | El compilador de la app (`ng build`, `ng serve`) |
| `@angular/compiler-cli` | ^22.0.0 | Compila las plantillas de Angular |
| `typescript` | ~6.0.2 | El lenguaje del proyecto |
| `vitest` | ^4.0.8 | Corre las pruebas unitarias (`npm test`) |
| `jsdom` | ^28.0.0 | Simula el navegador dentro de las pruebas |
| `prettier` | ^3.8.1 | Da formato al código |
| `@capacitor/cli` | ^8.5.2 | El comando `npx cap` para la app de Android |
| `@capacitor/android` | ^8.5.2 | La plataforma Android de Capacitor (sección 5) |
| `@types/qrcode` | ^1.5.6 | Tipos de TypeScript para `qrcode` |

Las de Angular, TypeScript, Vitest y jsdom vienen con `ng new`. Las demás se instalan con `--save-dev`:

```bash
npm install --save-dev prettier
```

---

## 5. Capacitor: la app de Android

Capacitor toma la app ya compilada (`dist/parking/browser`) y la mete en un proyecto nativo de Android. La configuración está en `capacitor.config.ts`:

- `appId: co.edu.ue.uniparking` y `appName: Uni-parking`.
- `webDir: dist/parking/browser`: la carpeta que se empaqueta.
- `server.androidScheme: 'http'` y `server.cleartext: true`: configuran el WebView para que cargue la app en `http://localhost` y permita conexiones HTTP inseguras (Mixed Content). Sin esto el celular bloquea las peticiones a IPs locales como `http://167.234.233.96:3000`.

La carpeta `android/` **no se sube al repositorio** (está en el `.gitignore`): cada quien la genera en su equipo con los pasos de abajo.

### Instalar Capacitor (ya hecho en este proyecto)

```bash
npm install @capacitor/core @capacitor/android
```

```bash
npm install --save-dev @capacitor/cli
```

Si alguna vez necesitas crear el proyecto desde cero porque borraste el archivo de configuración, el comando completo para inicializarlo es:

```bash
npx cap init parking co.edu.ue.uniparking --web-dir dist/parking/browser
```
*(Nota: Aquí ya existe el `capacitor.config.ts`, así que no hace falta correrlo a menos que lo borres).*

> **⚠️ IMPORTANTE:** A veces, al instalar nuevas librerías o plugins de Capacitor, el terminal arroja un error que bloquea la instalación quejándose de que el archivo `capacitor.config.ts` ya existe o da un conflicto de módulos. Si te ocurre esto, **elimina temporalmente el archivo `capacitor.config.ts`**, ejecuta tu comando de instalación (`npm install...`), y luego vuelve a crear el archivo `capacitor.config.ts` pegando exactamente este código de respaldo:

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'co.edu.ue.uniparking',
  appName: 'parking',
  webDir: 'dist/parking/browser',
  server: {
    androidScheme: 'http',
    cleartext: true
  }
};

export default config;
```

### Primera vez en un equipo (Configuración Nativa y Firebase)

1. Compilar la app:

   ```bash
   npm run build
   ```

2. Crear la carpeta `android/` y acoplar el código nativo:

   ```bash
   npx cap add android
   ```

3. **Copiar configuración de Firebase:** Descargar el archivo `google-services.json` desde la consola de Firebase (Proyecto -> Configuración -> App Android) y pegarlo dentro de la carpeta `android/app/`. Sin este archivo, la app nativa crasheará al intentar usar autenticación.

4. **Registrar la Huella Digital (SHA-1):** Para que el inicio de sesión de Microsoft (OAuth) funcione en el celular sin arrojar el error `auth/invalid-cert-hash`, debes registrar la firma de tu computadora en la consola de Firebase:
   - Saca tu huella ejecutando en PowerShell: `keytool -list -v -keystore "$env:USERPROFILE\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android | Select-String -Pattern "SHA1:"`
   - Ve a la Consola de Firebase -> Configuración del proyecto -> App Android -> Agregar huella digital.
   - Pega tu huella SHA-1 y guarda.

5. **Pasos manuales en el AndroidManifest.xml (`android/app/src/main/AndroidManifest.xml`), obligatorios:** 
   - **Tráfico HTTP (Backend de pruebas):** A partir de Android 9, el SO bloquea a nivel de red cualquier conexión a un backend que no sea `https://` (arrojando ERR_CLEARTEXT_NOT_PERMITTED). Para permitir temporalmente la conexión al backend de desarrollo (`http://167.234.233.96:3000`), debes buscar la etiqueta `<application` casi al inicio del archivo y agregarle `android:usesCleartextTraffic="true"`, quedando así:
     ```xml
     <application
         android:usesCleartextTraffic="true"
         android:allowBackup="true"
         <!-- ... resto de atributos ... -->
     ```
   - **Permisos de Cámara y Almacenamiento:** Para que la app nativa pueda usar el lector de QR y tomar fotos sin que el sistema la bloquee, debes agregar un bloque de permisos. Ve hasta el **final del archivo**, justo antes de la etiqueta de cierre `</manifest>`, y asegúrate de que estén estos permisos (puedes pegarlos debajo del de `INTERNET`):
     ```xml
     <uses-permission android:name="android.permission.INTERNET" />
     <uses-permission android:name="android.permission.CAMERA" />
     <uses-feature android:name="android.hardware.camera" android:required="false" />
     
     <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
     <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
     ```

6. Abrir el proyecto en Android Studio y ejecutarlo en el celular o en el emulador:

   ```bash
   npx cap open android
   ```

### Cada vez que cambia el código

```bash
npm run build
```

```bash
npx cap sync android
```

`sync` copia la app compilada a `android/` y actualiza los plugins; el permiso de cámara se conserva. Si se borra `android/` y se vuelve a crear con `npx cap add android`, hay que repetir el paso 3.

---

## 6. PWA: aplicación web progresiva

La base de la PWA **ya está instalada** (ADR-014): el service worker de Angular (`@angular/service-worker`), la configuración en `ngsw-config.json`, el registro en `app.config.ts` (`provideServiceWorker`) y el manifiesto con los íconos en `public/`.

La forma estándar de agregarla a un proyecto de Angular es:

```bash
npx ng add @angular/pwa
```

Ese comando instala `@angular/service-worker`, crea `ngsw-config.json` y el manifiesto, y registra el service worker. En este proyecto los íconos que genera se reemplazaron por los de la marca.

El service worker **no corre con `npm start`**. Para probarlo hay que compilar y servir la carpeta con cualquier servidor estático:

```bash
npm run build
```

```bash
npx http-server dist/parking/browser -p 8080
```

Lo que falta de la PWA está en [planeacion-desarrollo.md](planeacion-desarrollo.md): probarla en celulares (PEN-010), avisar cuando hay una versión nueva (PEN-011) e íconos por cliente (PEN-012).

---

## 7. Agregar una dependencia nueva

1. Instalarla. Si viaja dentro de la app:

   ```bash
   npm install <paquete>
   ```

   Si solo se usa para programar o probar:

   ```bash
   npm install --save-dev <paquete>
   ```

2. Agregarla a la tabla que corresponda (sección 3 o 4), con su comando de instalación y para qué sirve.
3. Anotarla en la bitácora de [planeacion-desarrollo.md](planeacion-desarrollo.md).
4. Subir en el mismo commit `package.json`, `package-lock.json` y este archivo.
