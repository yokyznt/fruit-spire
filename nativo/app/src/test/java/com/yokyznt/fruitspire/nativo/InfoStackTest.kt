package com.yokyznt.fruitspire.nativo

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onRoot
import com.github.takahirom.roborazzi.captureRoboImage
import com.yokyznt.fruitspire.core.data.Statuses
import com.yokyznt.fruitspire.nativo.ui.DesignCanvas
import com.yokyznt.fruitspire.nativo.ui.InfoStack
import com.yokyznt.fruitspire.nativo.ui.Kw
import com.yokyznt.fruitspire.nativo.ui.keywordSections
import com.yokyznt.fruitspire.nativo.ui.notebookPaper
import com.yokyznt.fruitspire.nativo.ui.statusSectionsFull
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/** La explicación de un estado, como el tooltip de la web: título de color, mejora/perjuicio, texto por cantidad y términos que nombra. */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w911dp-h411dp-land-xxhdpi")
class InfoStackTest {
    @get:Rule
    val compose = createComposeRule()

    @Test fun elTituloLlevaElColorDeLaPalabraClaveYLaCantidad() {
        val sections = statusSectionsFull(listOf("vulnerable" to 2))
        assertEquals("Magulladura 2", sections[0].title)
        assertEquals(Kw.color("vuln"), sections[0].titleColor)
        assertEquals("perjuicio", sections[0].lines[0].tag!!.label)
        assertEquals("Recibe 50% más daño de ataques. Dura 2 turnos más.", sections[0].lines[0].text)
    }

    @Test fun losTerminosQueNombraElEstadoSeExplicanUnaVez() {
        val extra = keywordSections(Statuses.get("strength")!!.help, listOf("Madurez"))
        assertEquals(extra.size, extra.map { it.title }.toSet().size)
        assertTrue(extra.none { it.title == "Madurez" })
    }

    @Test fun captura() {
        compose.setContent {
            DesignCanvas {
                Box(Modifier.fillMaxSize().notebookPaper(), contentAlignment = Alignment.Center) {
                    InfoStack(statusSectionsFull(listOf("poison" to 3, "strength" to 2)))
                }
            }
        }
        compose.onNodeWithText("Putrefacción 3").assertExists()
        compose.onRoot().captureRoboImage("build/capturas/info_estados.png")
    }
}
