# Fruit Spire nativo — estado del port

> **Para retomar el trabajo en otra conversación: leer `nativo/PLAN_SIGUIENTE.md`** (lo que pidió el usuario y falta: UIs más grandes, estados con colores y descripción extra, personaje a la derecha, mesas a pantalla completa, animaciones; luego tutorial y lanzamiento).

Plan completo: versión nativa en Kotlin + Jetpack Compose, por etapas, como app aparte
(«Fruit Spire Nativo», `com.yokyznt.fruitspire.nativo`) hasta que tenga todo; entonces
reemplaza a la app web empaquetada (`android/`).

Compilar y probar: `JAVA_HOME=~/.jdks/jdk-21.0.12.1+1 ./gradlew.bat :core:test :app:assembleDebug`
Dibujos: `node tools/export-sprites.js` (desde la raíz del repositorio) regenera `app/src/main/assets/sprites`.
Sonido: `node tools/export-audio.js` regenera `app/src/main/assets/audio` y `GenAudio.kt`.
Historia y final: `node tools/export-cine.js` regenera `app/src/main/assets/cine` (46 videos).

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
- Colección, bestiario y notas (etapa 4C): `Bestiary.kt` (catálogo por castillo y piso con dónde sale cada enemigo y su nivel, `describeMove` y `traits` en texto;
  `gameText` ya resalta números y palabras clave), `Album.kt` (cartas por fruta/neutrales/maldiciones, objetos y semillas por rareza en orden alfabético, `refOf` = guiño a otros juegos),
  `GenNotes.kt` (13 notas de la versión, `GAME_VERSION`, datos del creador, 27 guiños con la clave de su juego y `GEN_GAME_COLORS`; lo genera `tools/export-core-data.js` desde js/notes.js y js/data/refs.js). `Progress` guarda objetos y semillas
  encontrados (`Run.syncFound()` anota lo que llevas; `GameViewModel.persist()` la llama tras cada acción), el bestiario (`bestiary`: id → derrotas; entrar = visto) y `notesSeen` (`notesAreNew`/`openNotes`).
  `Run.startCombat` marca vistos a los enemigos y `finishCombat` suma las derrotas. `Album.TABS`/`countText` dan las pestañas y el «N de M …» de arriba. `AlbumTest` (10 pruebas).
- Pantallas 4C: `ui/CollectionScreen.kt` (`CollectionState` = pestaña y fichas elegidas, las guarda el ViewModel; pestañas Cartas · Objetos · Semillas · Bestiario con cuadrículas, siluetas «???» para lo no encontrado y ficha en grande a la derecha;
  el objeto muestra su guiño con el dibujito del juego `refgame~<clave>`; el bestiario tiene Castillo 1/2/3 e Invocados, el chip de la regla del piso (toque → aviso con `onInfo`) y la ficha con vida, dónde sale, rasgos y jugadas, que al tocarlas explican sus estados),
  `ui/NotesScreen.kt` (notas a la derecha, a la izquierda la tarjeta del creador que abre `CREATOR_URL` con `LocalUriHandler`), puntito rojo de notas nuevas en `MenuScreen` (`notesBadge`) y `AppScreen.COLLECTION/NOTES` en el `GameViewModel`
  (`openCollection` anota lo que llevas y abre el bestiario en el castillo de tu partida la primera vez; `openNotes` las marca leídas y guarda). `Sprite(silhouette = true)` y `SeedArt(silhouette = true)` dibujan la mancha oscura de lo no descubierto.
  Los botones «Ver la historia/el final otra vez» de las notas llegan en la etapa 5. `CollectionScreenTest` (19 pruebas: capturas de cada pestaña, toques y el recorrido menú → Colección/Notas con el `GameViewModel` real).
- Sonido (etapa 5A): `tools/export-audio.js` (Node 22 + Chrome + ffmpeg con libvorbis; `node tools/export-audio.js [sfx|music]`) reevalúa una copia parcheada de `js/audio.js` con un `OfflineAudioContext`
  (azar con semilla fija, buses al máximo) y escribe `app/src/main/assets/audio/{sfx,music}/*.ogg` (34 efectos con 63 variantes, 21 canciones, ~9 MB) y `core/.../data/gen/GenAudio.kt` (enum `Sfx`, `GEN_SONGS`,
  `GEN_PLAYLISTS`, `GEN_BUZZ`). `core/Audio.kt`: `MusicContext.forRun` (= `musicContextFor` de render.js), `MusicPlan` (lista por lugar: empieza al azar y sigue en orden), `Volume.curve` (`(v/100)^1.7`).
  App: `Audio.kt` (`AndroidAudio`: SoundPool de 8 voces, MediaPlayer con fundido, vibración con la tabla BUZZ, pausa/reanudación con el ciclo de vida), `ui/GameAudio.kt` (interfaz `GameAudio`, `NoAudio` por defecto en pruebas,
  `LocalAudio`, `Modifier.tapButton`). Enlaces: `CombatController(audio)`, `TableController(audio)`, `GameViewModel.audio`/`musicPlace()` (la raíz cambia de canción con `LaunchedEffect`), `Settings.onChanged`, `StickerButton` y los
  botones de barra, selección de fruta y ajustes hacen «tap» como todo `<button>` de la web. Los controladores reciben un reenviador del ViewModel, así que sobreviven a que la actividad se recree.
  Pruebas: `AudioTest` (core, 8), `AndroidAudioTest` (4), `AudioHooksTest` (24, con un `RecordingAudio`), `TableAudioTest` (11), `ButtonTapTest` (3). Sin probar a oído en el teléfono.
- Historia y final (etapa 5B): en vez de portar a mano ~2000 líneas de escenas CSS, `tools/export-cine.js` (`node tools/export-cine.js [story|ending] [filtro]`; Node 22 + Chrome + ffmpeg con libx264) dibuja cada escena de
  `js/story.js`/`js/ending.js` en un contenedor de 1920×810, pausa TODAS las animaciones CSS (`document.getAnimations`), fija el tiempo de cada cuadro y lo captura; cada escena arranca desde el final de la anterior (el fundido queda dentro del video).
  Salen 46 MP4 de 30 cuadros, ~31 MB, en `app/src/main/assets/cine/` (`s<escena>_<fruta>`, `s3`/`s4` sin fruta, `e0_<fruta>_<jefe final>`, `e<escena>_<fruta>`) porque las escenas dibujan a la fruta elegida y a las otras tres, y la 0 del final al jefe vencido.
  Límite: el héroe sale sin ropa del vestidor (los videos se hicieron con el aspecto básico). `core/Cine.kt` (escenas, duraciones, textos con el nombre, sonidos, nombre del video, `CineTimeline` con el guardia de 350 ms) y `Progress.endingSeen`;
  app: `ui/CinePlayer.kt` (un `MediaPlayer` y una `TextureView` que se reutilizan, recorte para llenar la pantalla) y `ui/CineScreen.kt` (texto que se escribe a 26 ms por letra, puntos, atrás/saltar/siguiente, botón final, sonidos).
  `play()` va a la historia y la fanfarria de la portada sale al terminarla (`finishStory`); vencer al último jefe lleva al final (`startEnding`) y luego a la victoria; Notas tiene «Ver la historia otra vez» y, si ya la viste, «Ver el final otra vez».
  Las pruebas que arrancan partida llaman `vm.finishStory()` tras `vm.play()`. `CineTest` (núcleo, 12) y `CineFlowTest` (9).
- Revisión de diseño del combate (2026-10-05): `CombatLayoutTest` (16 capturas: 1 a 4 enemigos, nombres largos, estados, jefe y carta elegida en 20:9, 16:9 y 4:3 → `app/build/capturas/combate_<escenario>_<proporción>.png`) y `NarrowScreenshotTest` (todas las pantallas de `ScreenshotTest` en 4:3 → `app/build/capturas43/`; en 16:9 salen con `StoreScreenshotTest` a `app/build/tienda/`). Correr con `gradlew :app:testDebugUnitTest --tests '*CombatLayoutTest*' --tests '*NarrowScreenshotTest*' '-Proborazzi.test.record=true'`. El lienzo mide siempre 660 de alto; lo que cambia entre teléfonos es el ancho, así que **todo tamaño que dependa del ancho se calcula con `LocalDesignWidth`**. Reglas que salieron de ahí (`CombatScreen.kt`): la placa de cada personaje lleva el nombre arriba en una sola línea (se achica según el ancho de la placa, nunca tapa la barra), barra de vida de 34 con cifras al 62 %, placa crema que mide solo su contenido, cáscara pegada a la barra solo si la placa mide ≥ 240 (si no pasa a la fila de estados), globo de intención centrado sobre la cabeza (compacto con varios enemigos), ancho de cada enemigo = reparto del ancho que queda (150 a 260), `HAND_TOP` 410 y `handScale`/`HAND_SIDE`/`HAND_FAN` para que el abanico no tape la naranja, las pilas ni el botón de turno en pantallas poco anchas; la barra de arriba (`HudBar`) quita la mini barra de vida y el nombre del piso por debajo de 1000 de ancho, y «Elige tu fruta» reparte el ancho entre las 4 fotos.
- Mapa hacia arriba y escalera (2026-10-05, noche): el núcleo NO cambió (`MapGen` sigue idéntico al motor JS: x = avance de izquierda a derecha, y = fila, la guarida es la última columna); solo `MapScreen.kt` lo dibuja girado: `cellPos(y)` = izquierda de la casilla, `cellY(cols, x)` = arriba de la casilla (x = 0 queda abajo del todo), la guarida es una franja arriba (`MAP_LAIR_H`), los muros `wallsV` salen acostados entre pisos y `wallsH` parados entre casillas, el río es una banda horizontal con puentes. Toques, centrado, seguimiento de la ficha y anclas del tutorial usan esas funciones. Tras un jefe, `GameViewModel.ascendIfNewFloor` activa `ascend` (`ui/StairsScene.kt`: la fruta sube 8 escalones con saltitos hacia una puerta de luz, ~3 s, tocar salta, la fanfarria suena al terminar) y la portada del piso nuevo queda debajo. `StairsSceneTest` saca capturas (`escalera_*.png`).
- Mesas y eventos: el crupier (`Table.dealerLine`, `Table.ahead`) cambia de frases y de gesto según lo que haces y si vas ganando o perdiendo (`TableDialogueTest`); la mesa se agranda con `AutoFit` para llenar la pantalla; los botones secundarios (`secondary = true`) son sólidos y más grandes.
- Gotcha de los dibujos: volver a correr `node tools/export-sprites.js` regraba ~12 `.webp` viejos con bytes distintos (carta_marcada, flor_imperial, guardia_hielo…); si no vienen al caso, restaurarlos con `git checkout` y dejar solo los nuevos y `sprites.json`.
- Para cuidar que las reglas sean idénticas: comparación cruzada con semilla (`node tools/crosscheck-combat.js 3000 1000` genera las trazas de JS en `core/build/`, y `gradlew :core:test` exige que Kotlin salga idéntico).

## Pantallas (app/)
- `GameViewModel.kt` une core y pantallas (guarda tras cada acción; `tick` avisa a Compose); `Store.kt` guarda `partida.json` y `progreso.json` en `filesDir`.
- `ui/`: `Text.kt` (números y palabras clave de color, iconos de corazón/energía), `Cards.kt` (carta 176×250, objeto, semilla dibujada, barra de vida),
  `Hud.kt`, `CharacterSelect.kt`, `ActIntro.kt`, `MapScreen.kt`, `CombatController.kt` (modelos inmutables, poses de ataque = keyframes del CSS, tiempos de `js/fx.js`),
  `CombatScreen.kt`, `RewardScreens.kt`, `DeckModal.kt`.
- Las animaciones del combate necesitan el reloj de cuadros de Compose: el controlador usa el scope de la composición (`vm.uiScope`), NO `viewModelScope`.
- Pruebas: `gradlew :core:test` (123 pruebas, con el motor idéntico a JS) y `gradlew :app:testDebugUnitTest -Proborazzi.test.record=true`
  (122 pruebas; capturas en `app/build/capturas/`; `FlowSmokeTest` monta `GameRoot` y juega con las pantallas reales; `TableScreenshotTest` captura cada mesa y prueba
  toques y arrastres reales en el tablero).
- Mesas de juego en pantalla: `ui/TableController.kt` (tiempos de las animaciones y toques; `busy` ignora toques) y `ui/TableScreens.kt` (tapete, crupier con globo, fichas,
  dados y cartas dibujados con Canvas, rodillos, ruleta, tablero de ajedrez que se toca o se arrastra). Las piezas de ajedrez son dibujos exportados `mgp_<pieza><equipo>`
  (con carita) y `mgp_<pieza><equipo>_s` (sin ella, para las bandejas); salen de `MG.fruitPiece` de js/minigames.js (se expuso solo para el exportador).
- Cuidado (compilador de Compose): `Run` es mutable y las pantallas se redibujan solo por `GameViewModel.tick`, así que `app/build.gradle.kts` DESACTIVA «strong skipping» (`composeCompiler.featureFlags`);
  con él, una pantalla que recibe la misma instancia de `Run` se salta y se queda vieja (premios ya recogidos que seguían por recoger, casillas del mapa que desaparecían). `LootCollectTest` lo vigila.
  Tampoco poner `alpha`/`.alpha()` en un elemento que dibuja fuera de sus límites (contornos, sombras): la capa se recorta y los botones salían partidos; se atenúa el contenido o se usa `saveLayer` (ver `StickerButton`).
- Cuidado: un `return@key` dentro del lambda de `key(...)` de Compose generó una clase inválida (`Illegal method name "<anonymous>"`) que compila pero revienta al cargarse;
  `TableScreen` lo evita separando en otra función. Si una prueba de pantalla dice `ClassFormatError`, buscar un retorno anticipado dentro de un lambda inline composable.
- Sin hacer todavía: tooltips de objetos, explicaciones de intención y estados salen al tocar.
- Emulador: el controlador AEHD no estaba cargado el 2026-10-04 (`emulator -accel-check` decía que no está instalado); el teléfono tiene bloqueo seguro, así que
  las pruebas de pantalla se hicieron con Robolectric. APK: `./gradlew.bat :app:assembleDebug` → `app/build/outputs/apk/debug/app-debug.apk` (ya instalado en el teléfono).

## Etapas
- [x] 0. Tutorial arreglado en la app web (v2.9).
- [ ] 1. Cimientos: proyecto, dibujos y letras exportados, base visual, menú y ajustes **(hecho)**;
      port del motor de combate y de todos los datos **(hecho, 3000 combates idénticos a JS)**;
      sonido y vibración **(hechos en la 5A)**.
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
      **Hecho (4C):** colección (cartas, objetos, semillas), bestiario y notas, con sus pantallas conectadas al menú. **Con esto la etapa 4 queda completa.**
- [ ] 5. Sonido, historia y final, tutorial. **Hecho (5A):** sonido (efectos, música por pantalla, vibración, volumen de Ajustes). **Hecho (5B):** historia y final animados (videos exportados de la web). **Hecho (5C, rama `nativo-pulido-ui`):** tutorial «Cómo jugar» — `core/Tutorial.kt` (33 pasos, `TutorialDirector`, mapa fijo 7×3), ganchos en `Run` (`startTutorial`, primer combate dirigido, sin dado del destino, misterio fijo, semilla de chile, perder repite), `TutorialTest` con un bot que recorre los pasos con 60 semillas; en la app `ui/TutorialUi.kt` (Profe Limón, marcos, velo de lectura, pantalla final), anclas `tutAnchor` en cada pantalla y bloqueo en `GameViewModel`/`CombatController` (`TutorialGate`). No se guarda ni toca el progreso real.
- [~] 6. Pulido y lanzamiento. **Hecho:** release firmado (llave de subida fuera de git, `nativo/keystore.properties`), id `com.yokyznt.fruitspire` (el debug sigue siendo `.nativo`), versión 3.0.0, R8, política de privacidad (`privacidad.html`) y `node tools/package-playstore.js` que arma la carpeta del Escritorio (AAB, APK, mapping, proyecto limpio, ficha de tienda). **Falta:** probar todo con el dedo en el teléfono, las animaciones menores de `PLAN_SIGUIENTE.md` (tienda, revelado del mazo) y relevar la app web instalada.
