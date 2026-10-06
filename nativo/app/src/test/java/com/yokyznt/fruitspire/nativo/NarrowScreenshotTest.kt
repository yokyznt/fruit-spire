package com.yokyznt.fruitspire.nativo

import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Las mismas pantallas de [ScreenshotTest] en una pantalla poco ancha (4:3, como una tableta), para ver si algo se sale,
 * se monta o queda chico. El lienzo mide siempre 660 de alto y aquí solo le caben ~880 de ancho. Quedan en app/build/capturas43/.
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w548dp-h411dp-land-xhdpi")
class NarrowScreenshotTest : ScreenshotTest() {
    override val dir = "build/capturas43"
}
