package com.yokyznt.fruitspire.nativo

import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Las mismas pantallas de [ScreenshotTest] a 1920×1080 (16:9), la relación que pide Google Play para las capturas de la ficha.
 * Quedan en app/build/tienda/; `tools/package-playstore.js` copia las que sirven.
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w640dp-h360dp-land-xxhdpi")
class StoreScreenshotTest : ScreenshotTest() {
    override val dir = "build/tienda"
}
