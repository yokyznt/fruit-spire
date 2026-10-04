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

## Port del motor (core/)
- `tools/export-core-data.js` (Node, desde la raíz) lee `js/data/*.js` y genera `core/.../data/gen/Gen*.kt`: estados, cartas, objetos, semillas,
  brotes, 121 enemigos con sus jugadas, 12 temas, 3 castillos, personajes y dificultades. Se vuelve a correr si cambia un dato en la versión web.
- A mano (funciones): `data/Logic.kt` (efectos de las 73 cartas, ganchos de los 51 objetos, 20 semillas, 5 brotes, reglas de piso,
  habilidades de personaje), `data/EnemyAi.kt` (IA de 30 enemigos; los 14 que solo recorren una lista salen generados con `cycle(...)`).
- `Entities.kt` (azar con semilla mulberry32 = el de las pruebas web, entidades), `Combat.kt` (port de `js/engine/combat.js`, incluida la vista previa).
- `MapGen.kt` (port de `js/engine/map.js`: mapas, muros, ríos, casillas, sin trampas). 1000 mapas con semilla salen idénticos a JS y sin callejones.
- Pendiente de portar: flujo de partida (`js/game.js`), guardado, mascotas (`PetHooks` ya es el enganche).
- Para cuidar que las reglas sean idénticas: comparación cruzada con semilla (`node tools/crosscheck-combat.js 3000 1000` genera las trazas de JS en `core/build/`, y `gradlew :core:test` exige que Kotlin salga idéntico).

## Etapas
- [x] 0. Tutorial arreglado en la app web (v2.9).
- [ ] 1. Cimientos: proyecto, dibujos y letras exportados, base visual, menú y ajustes **(hecho)**;
      port del motor de combate y de todos los datos **(hecho, 3000 combates idénticos a JS)**;
      sonido exportado **(pendiente)**.
- [ ] 2. Partida base. Hecho: motor de combate y datos. Hecho también: generador de mapas. **Pendiente (siguiente paso)**: flujo de partida y guardado de `js/game.js` (elegir fruta, portada de piso, casillas de enemigo/élite/jefe,
      recompensas de combate, derrota/victoria, siguiente piso), y las pantallas Compose (elegir fruta, portada, mapa con arrastre y zoom,
      combate con cartas arrastrables, recompensas).
- [ ] 3. Tienda, campamento, tesoro, eventos, llave/cofre, pozo, objeto de jefe, reglas de piso, calabozo, dado, mochila, mazo.
- [ ] 4. Minijuegos, pase de batalla, vestidor, colección, bestiario, notas.
- [ ] 5. Tutorial, historia y final.
- [ ] 6. Pulido, compilación de lanzamiento y relevo de la app web.
