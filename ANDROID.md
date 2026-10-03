# Fruit Spire en Android (APK / Play Store)

El juego es una página web; se empaqueta con Capacitor.

## Una sola vez
1. Instala Node.js y Android Studio (trae el SDK y el JDK).
2. En esta carpeta: `npm install`.

El proyecto Android ya viene en `android/` (horizontal, pantalla completa, permiso de
vibración y el puente `FruitNativePlugin` que usa Ajustes → Pantalla encendida). Lo que
copia `android:sync` (el juego dentro de `assets/public`) no se guarda en el repositorio.

## Cada vez que cambie el juego
Rápido: `npm run android:apk` deja `FruitSpire-debug.apk` en esta carpeta (pásalo al teléfono e instálalo,
o con el teléfono conectado: `adb install -r FruitSpire-debug.apk`).
Necesita un JDK 17 o 21 en `~/.jdks` (Gradle 8 no corre con el Java 25 de Android Studio).

Con Android Studio:
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
