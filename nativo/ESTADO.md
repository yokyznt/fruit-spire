# Fruit Spire nativo — estado del port

Plan completo: versión nativa en Kotlin + Jetpack Compose, por etapas, como app aparte
(«Fruit Spire Nativo», `com.yokyznt.fruitspire.nativo`) hasta que tenga todo; entonces
reemplaza a la app web empaquetada (`android/`).

Compilar y probar: `JAVA_HOME=~/.jdks/jdk-21.0.12.1+1 ./gradlew.bat :core:test :app:assembleDebug`
Dibujos: `node tools/export-sprites.js` (desde la raíz del repositorio) regenera `app/src/main/assets/sprites`.

## Cómo está armado
- `core/`: reglas del juego en Kotlin puro (port de `js/engine`, `js/data` y el flujo de `js/game.js`). Sin Android.
- `app/`: pantallas en Compose.
  - `ui/Design.kt`: todo se mide en "px de diseño" igual que el juego web (alto 660): `DesignCanvas`
    cambia la densidad para que 1.dp = 1 px de diseño. Colores y letras del juego.
  - `ui/Sprites.kt`: `Sprite(id, size…)` carga el dibujo exportado y le pone el borde de sticker una
    sola vez por tamaño (queda en caché).
  - `ui/Widgets.kt`: botón sticker, panel, logo de letras, avisos.

## Etapas
- [x] 0. Tutorial arreglado en la app web (v2.9).
- [ ] 1. Cimientos: proyecto, dibujos y letras exportados, base visual, menú y ajustes **(hecho)**;
      sonido exportado y port del motor (`engine` + `data`) con pruebas **(pendiente)**.
- [ ] 2. Partida base: elegir fruta, portada de piso, mapa, combate, recompensas, guardar.
- [ ] 3. Tienda, campamento, tesoro, eventos, llave/cofre, pozo, objeto de jefe, reglas de piso, calabozo, dado, mochila, mazo.
- [ ] 4. Minijuegos, pase de batalla, vestidor, colección, bestiario, notas.
- [ ] 5. Tutorial, historia y final.
- [ ] 6. Pulido, compilación de lanzamiento y relevo de la app web.
