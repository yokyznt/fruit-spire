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
- Flujo de partida (`Run.kt`, port de `js/game.js`): `Run.start` (fruta + grado), `newFloor`, `arrive` (casilla → combate pendiente o `NODE_STUB`),
  `startCombat`/`finishCombat` (oro, 3 cartas, objeto de élite, semilla, jefe/guardián/castillo/final), `collectLoot`/`pickRewardCard`/`finishReward`,
  `openBossRelics`, `startNextFloor` (cura, maldición de castillo). `Plan.kt` (temas de los 9 pisos, tamaños, jefe, encuentros), `Rewards.kt` (sorteos),
  `Progress.kt` (grados desbloqueados, cartas vistas), `Save.kt` (JSON de la partida y del progreso; no se guarda en combate).
  `RunTest` juega partidas completas con un bot (9 pisos hasta la victoria con 12 semillas, muertes en Desafiante, ida y vuelta del guardado).
- Pendiente de portar: mascotas (`PetHooks` ya es el enganche), experiencia del pase (`Run.lastCombatXp` ya la guarda), bestiario.
- Para cuidar que las reglas sean idénticas: comparación cruzada con semilla (`node tools/crosscheck-combat.js 3000 1000` genera las trazas de JS en `core/build/`, y `gradlew :core:test` exige que Kotlin salga idéntico).

## Pantallas (app/)
- `GameViewModel.kt` une core y pantallas (guarda tras cada acción; `tick` avisa a Compose); `Store.kt` guarda `partida.json` y `progreso.json` en `filesDir`.
- `ui/`: `Text.kt` (números y palabras clave de color, iconos de corazón/energía), `Cards.kt` (carta 176×250, objeto, semilla dibujada, barra de vida),
  `Hud.kt`, `CharacterSelect.kt`, `ActIntro.kt`, `MapScreen.kt`, `CombatController.kt` (modelos inmutables, poses de ataque = keyframes del CSS, tiempos de `js/fx.js`),
  `CombatScreen.kt`, `RewardScreens.kt`, `DeckModal.kt`.
- Las animaciones del combate necesitan el reloj de cuadros de Compose: el controlador usa el scope de la composición (`vm.uiScope`), NO `viewModelScope`.
- Pruebas: `gradlew :core:test` (21 pruebas con el motor idéntico a JS) y `gradlew :app:testDebugUnitTest -Proborazzi.test.record=true`
  (capturas en `app/build/capturas/`; `FlowSmokeTest` monta `GameRoot` y juega con las pantallas reales).
- Sin hacer todavía: audio y vibración (etapa 1 pendiente), mochila/semillas en combate y tooltips de objetos (etapa 3), explicaciones de intención y estados salen al tocar.
- Emulador: el controlador AEHD no estaba cargado el 2026-10-04 (`emulator -accel-check` decía que no está instalado); el teléfono tiene bloqueo seguro, así que
  las pruebas de pantalla se hicieron con Robolectric. APK: `./gradlew.bat :app:assembleDebug` → `app/build/outputs/apk/debug/app-debug.apk` (ya instalado en el teléfono).

## Etapas
- [x] 0. Tutorial arreglado en la app web (v2.9).
- [ ] 1. Cimientos: proyecto, dibujos y letras exportados, base visual, menú y ajustes **(hecho)**;
      port del motor de combate y de todos los datos **(hecho, 3000 combates idénticos a JS)**;
      sonido exportado **(pendiente)**.
- [x] 2. Partida base **(hecha, falta probarla con dedo en el teléfono)**. Motor, mapas, flujo de partida, guardado y todas las pantallas:
      elegir fruta y grado, portada de piso, barra de arriba, mapa (arrastre, zoom de Ajustes, muros de cinta, ríos con puente, guarida, ficha que camina),
      «¡A pelear!», combate (mano en abanico: tocar selecciona, arrastrar juega; intenciones, estados, cáscara, efectos, turno enemigo, viñedo de la Uva,
      regla del piso, pilas), recompensas con premios por recoger, objeto de jefe, derrota/victoria, visor del mazo/pilas, guardar y continuar.
      Las casillas que no son combate (tienda, campamento, tesoro, misterio, mesa de juegos, llave, cofre) muestran «llega en la siguiente etapa» y se siguen de largo.
      Se adelantó de la etapa 3 solo el objeto de jefe (el premio del jefe de castillo lo necesita).
- [ ] 3. Tienda, campamento, tesoro, eventos, llave/cofre, pozo, reglas de piso (ya salen en combate), calabozo, dado del destino, mochila y semillas en combate, mazo.
- [ ] 4. Minijuegos, pase de batalla, vestidor, colección, bestiario, notas.
- [ ] 5. Tutorial, historia y final.
- [ ] 6. Pulido, compilación de lanzamiento y relevo de la app web.
