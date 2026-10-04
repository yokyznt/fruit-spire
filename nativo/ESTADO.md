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
- Mesas de juego (etapa 4A): `Casino.kt` (reglas puras de `MG` de js/minigames.js: manos de póker y la casa que cambia cartas, ajedrez 5×6 con su rival negamax,
  pagos de tragamonedas y ruleta; `Casino.KINDS` trae nombre, dibujo, reglas y crupier de cada mesa) y `Table.kt` (la mesa en curso: fases `intro → play → house → result`,
  apuesta, dados, póker, tragamonedas, ruleta y ajedrez; el oro y el objeto salen como premios por recoger con `Run.withLootCapture`). El núcleo decide el resultado al
  instante y la interfaz solo espera lo que se ve (por eso `slotsDraw`/`slotsSettle`, `rouletteSpin`/`rouletteSettle`, `houseRoll`/`diceSettle` van en dos pasos).
  `Run.openMinigame/openGameTable` (1 de cada 3 mesas es máquina; si no, la del tema del piso), `RunScreen.MINIGAME`, `Run.table`. No se reanuda al continuar
  (como en la web): la apuesta ya está pagada y se vuelve al mapa. `CasinoTest` (32 pruebas, incluidas partidas completas de ajedrez con un bot al azar).
- Vestidor, pase y mascotas (etapa 4B): `Cosmetics.kt` (datos de `GEN_COSMETICS`, generados de js/data/cosmetics.js: 16 colores, 23 accesorios, 12 mascotitas; textos y las capas
  que se dibujan sobre la fruta), `Pass.kt` (34 niveles, `xpForLevel = 60 + 12n`, reclamar), `Pets.kt` (efectos de las 12 mascotitas: ganchos de combate y premio al ganar) y
  en `Progress` lo que se tiene, lo que se lleva puesto, la experiencia y los retos de mascotas (`checkPetUnlocks`). Se guarda en `progreso.json` (campos nuevos con valor por defecto,
  los guardados viejos se leen igual). `Run.finishCombat` suma la XP (gane o pierda; tope 160 por combate) y abre mascotas con los jefes de castillo; las victorias en mesas dan 15 XP.
  `CosmeticsTest` (15 pruebas, incluidos los efectos de las mascotas en combate).
- Pantallas 4B: `ui/Dress.kt` (`FruitSprite` viste a la fruta con `LocalProgress`; `CosmeticIcon`), `PassScreen.kt`, `WardrobeScreen.kt`; el menú muestra los premios por reclamar y los avisos de XP y de
  mascotita nueva salen en premios, derrota y victoria. Los íconos sueltos de accesorios son dibujos exportados `accicon~<id>` (tools/export-sprites.js). `MetaScreenshotTest` (7 pruebas).
- Pendiente de portar: bestiario, colección y notas (4C).
- Para cuidar que las reglas sean idénticas: comparación cruzada con semilla (`node tools/crosscheck-combat.js 3000 1000` genera las trazas de JS en `core/build/`, y `gradlew :core:test` exige que Kotlin salga idéntico).

## Pantallas (app/)
- `GameViewModel.kt` une core y pantallas (guarda tras cada acción; `tick` avisa a Compose); `Store.kt` guarda `partida.json` y `progreso.json` en `filesDir`.
- `ui/`: `Text.kt` (números y palabras clave de color, iconos de corazón/energía), `Cards.kt` (carta 176×250, objeto, semilla dibujada, barra de vida),
  `Hud.kt`, `CharacterSelect.kt`, `ActIntro.kt`, `MapScreen.kt`, `CombatController.kt` (modelos inmutables, poses de ataque = keyframes del CSS, tiempos de `js/fx.js`),
  `CombatScreen.kt`, `RewardScreens.kt`, `DeckModal.kt`.
- Las animaciones del combate necesitan el reloj de cuadros de Compose: el controlador usa el scope de la composición (`vm.uiScope`), NO `viewModelScope`.
- Pruebas: `gradlew :core:test` (78 pruebas, con el motor idéntico a JS) y `gradlew :app:testDebugUnitTest -Proborazzi.test.record=true`
  (41 pruebas; capturas en `app/build/capturas/`; `FlowSmokeTest` monta `GameRoot` y juega con las pantallas reales; `TableScreenshotTest` captura cada mesa y prueba
  toques y arrastres reales en el tablero).
- Mesas de juego en pantalla: `ui/TableController.kt` (tiempos de las animaciones y toques; `busy` ignora toques) y `ui/TableScreens.kt` (tapete, crupier con globo, fichas,
  dados y cartas dibujados con Canvas, rodillos, ruleta, tablero de ajedrez que se toca o se arrastra). Las piezas de ajedrez son dibujos exportados `mgp_<pieza><equipo>`
  (con carita) y `mgp_<pieza><equipo>_s` (sin ella, para las bandejas); salen de `MG.fruitPiece` de js/minigames.js (se expuso solo para el exportador).
- Cuidado: un `return@key` dentro del lambda de `key(...)` de Compose generó una clase inválida (`Illegal method name "<anonymous>"`) que compila pero revienta al cargarse;
  `TableScreen` lo evita separando en otra función. Si una prueba de pantalla dice `ClassFormatError`, buscar un retorno anticipado dentro de un lambda inline composable.
- Sin hacer todavía: audio y vibración (etapa 1 pendiente), tooltips de objetos, explicaciones de intención y estados salen al tocar.
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
      Se adelantó de la etapa 3 solo el objeto de jefe (el premio del jefe de castillo lo necesita).
- [ ] 3. Tienda, campamento, tesoro, eventos, llave/cofre, pozo, reglas de piso (ya salen en combate), calabozo, dado del destino, mochila y semillas en combate, mazo.
      **Hecho (3A):** campamento (descansar / madurar / despegar), tienda (5 cartas con una en oferta, objetos, semillas, quitar carta con precio creciente),
      tesoro, Llave Dorada y Cofre Sellado. `Run.kt` (`restHeal`, `restUpgrade`, `restRemove`, `buyShop*`, `shopRemoveCard`, `leaveNode`), `Shop.kt` (surtido y precios),
      `ui/NodeScreens.kt` (`RestScreen`, `DeckPickerScreen`, `ShopScreen`, `NodeResultScreen`), `NodesTest` (14 pruebas). Estas pantallas no se reanudan al continuar
      (igual que en la web): lo que quedó sin recoger se da solo al cargar (`Run.grantAllLoot`).
      **Hecho (3B):** mochila (`ui/InventoryModal.kt`; semillas usables en combate con `CombatController.useSeedFromBag/useSeedOn`, apuntar con un toque),
      30 eventos de misterio (`core/Events.kt`, `Run.resolveEventOption`), captura de premios (`Run.withLootCapture`, igual que `js/loot.js`), pozo de los deseos,
      calabozo 3×3 de la trampilla y dado del destino (`ui/EventScreens.kt`). El pozo y el calabozo se reanudan al continuar. `EventsTest` (19 pruebas).
- [ ] 4. Minijuegos, pase de batalla, vestidor, colección, bestiario, notas.
      **Hecho (4A):** las cinco mesas de juego (dados, póker, ajedrez, tragamonedas, ruleta), desde las casillas del mapa y desde los eventos de misterio.
      **Hecho (4B):** pase de batalla, vestidor (con la fruta vestida en el mapa, el combate, la barra de arriba y la selección) y mascotitas con sus retos y efectos.
      **Falta (4C):** colección (cartas, objetos, semillas), bestiario y notas.
- [ ] 5. Tutorial, historia y final.
- [ ] 6. Pulido, compilación de lanzamiento y relevo de la app web.
