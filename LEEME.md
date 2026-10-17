# Quiz Video Studio — app Android (beta)

Este proyecto convierte Quiz Video Studio en una app de Android. GitHub la compila gratis en la nube y te da un enlace de descarga para compartir. No necesitas instalar Android Studio.

## Qué hay en esta carpeta

| Carpeta o archivo | Para qué sirve |
|---|---|
| `src/index.html` | La app: el editor completo. Aquí van los cambios futuros. |
| `src/native.js` | Guarda los videos en el teléfono y abre el menú de compartir. |
| `android/` | El proyecto Android (ícono, nombre, permisos, firma). |
| `docs/index.html` | La página de descarga para compartir en YouTube. |
| `.github/workflows/construir-apk.yml` | Las instrucciones para que GitHub compile la app. |
| `assets/` | Ícono en alta resolución (1024 px) y para Google Play (512 px). |

## Paso a paso (una sola vez)

### 1. Crea tu cuenta y el repositorio
1. Crea una cuenta gratis en **github.com**.
2. Arriba a la derecha toca **+** → **New repository**.
3. Nombre: `quiz-video-studio`. Elige **Public** (es necesario para que cualquiera pueda descargar la app gratis). No marques ninguna otra opción. Toca **Create repository**.

### 2. Guarda la llave de firma (antes de subir los archivos)
La llave hace que cada versión nueva se instale encima de la anterior sin perder los proyectos de la gente.

1. En tu repositorio ve a **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.
2. Crea estos dos secretos, copiando el contenido de los archivos de la carpeta **llave-de-firma** (la que te entregué aparte):
   - Nombre `ANDROID_KEYSTORE_BASE64` → pega todo el texto de `ANDROID_KEYSTORE_BASE64.txt`.
   - Nombre `ANDROID_KEYSTORE_PASSWORD` → pega el texto de `ANDROID_KEYSTORE_PASSWORD.txt`.

> ⚠️ Nunca subas la carpeta **llave-de-firma** al repositorio ni la compartas. Guárdala en un lugar seguro (por ejemplo, tu Google Drive). Si la pierdes, no podrás publicar actualizaciones que se instalen encima. También servirá cuando publiques en Google Play.

### 3. Sube los archivos
1. Descomprime `quiz-video-studio-app.zip`.
2. En la página del repositorio toca **uploading an existing file**.
3. Abre la carpeta descomprimida, selecciona **todo su contenido** (no la carpeta en sí) y arrástralo a la página.
4. Abajo toca **Commit changes**.
5. Revisa que en el repositorio aparezca la carpeta `.github`. Si no aparece (algunos navegadores no suben carpetas que empiezan con punto), toca **Add file** → **Create new file**, escribe como nombre `.github/workflows/construir-apk.yml`, pega el contenido de ese archivo y toca **Commit changes**.

### 4. Espera a que GitHub compile la app
1. Ve a la pestaña **Actions**. Si te pide activarlas, acepta.
2. Verás **Construir APK beta** en marcha. Tarda unos 5 a 10 minutos. Cuando aparezca el ✅ verde, está lista.
3. Ve a la página principal del repositorio → **Releases** (a la derecha). Ahí está **QuizVideoStudio-beta.apk**.

### 5. Activa la página de descarga
1. **Settings** → **Pages**.
2. En **Source** elige **Deploy from a branch**. Branch: **main**, carpeta: **/docs**. Toca **Save**.
3. En un par de minutos tu página estará en:
   `https://TU-USUARIO.github.io/quiz-video-studio/`

Ese es el enlace para la descripción de tu video de YouTube. El botón siempre descarga la versión más reciente.

Enlace directo al APK (también siempre el más reciente):
`https://github.com/TU-USUARIO/quiz-video-studio/releases/latest/download/QuizVideoStudio-beta.apk`

## Publicar una versión nueva
Reemplaza `src/index.html` en GitHub (abre el archivo → ícono del lápiz, o súbelo de nuevo) y guarda. GitHub compila y publica la nueva versión solo. La página de descarga se actualiza sola.

## Otras tiendas gratis (opcional)
Puedes subir el mismo `QuizVideoStudio-beta.apk` a **Uptodown** o **Aptoide** creando una cuenta de desarrollador gratis en cada una. Usa el ícono de `assets/icono-512-play-store.png`.

## Si algo falla
- **La compilación sale con ❌ roja:** abre el paso con error en **Actions**, copia las últimas líneas del mensaje y envíaselas a Claude.
- **El botón Exportar no funciona en un teléfono:** actualiza **Android System WebView** y **Chrome** desde Google Play.
- **El video exportado no tiene sonido en algún teléfono:** avísale a Claude con el modelo del teléfono.

## Datos de la app
- Nombre: Quiz Video Studio
- Identificador: `com.quizvideostudio.app` (cámbialo antes de publicar en Google Play si quieres otro; después ya no se puede cambiar)
- Android mínimo: 7.0
