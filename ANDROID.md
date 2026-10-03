# Fruit Spire en Android (APK / Play Store)

El juego es una página web; se empaqueta con Capacitor.

## Una sola vez
1. Instala Node.js y Android Studio (trae el SDK y el JDK).
2. En esta carpeta: `npm run android:init` (instala Capacitor y crea `android/`).
3. En `android/app/src/main/AndroidManifest.xml`, dentro de `<activity ...>`, agrega
   `android:screenOrientation="sensorLandscape"` para que siempre sea horizontal.

## Cada vez que cambie el juego
1. `npm run android:sync` (copia el juego a `www/` y lo pasa al proyecto Android).
2. `npm run android:open` y en Android Studio:
   - Probar: botón Run con el teléfono conectado.
   - APK: Build > Build Bundle(s) / APK(s) > Build APK(s).
   - Play Store: Build > Generate Signed Bundle (AAB) con tu llave de firma.

## Para probar el modo teléfono en la computadora
Abre `index.html?phone=1` con la ventana en horizontal.

## Antes de publicar
- Iconos: `icons/` (192, 512 y maskable). El de la tienda (512) ya sirve.
- Play Console pide: política de privacidad (el juego no recoge datos: todo se guarda en el teléfono),
  clasificación de contenido y capturas en horizontal.
