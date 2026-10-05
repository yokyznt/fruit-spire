package com.yokyznt.fruitspire.core

import com.yokyznt.fruitspire.core.data.Statuses
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/** statusTip de js/render.js: cada estado explica qué hace con su cantidad actual. */
class StatusDescribeTest {
    @Test fun textoConLaCantidad() {
        assertEquals("Cada ataque hace 3 de daño extra. Una fruta madura pega más fuerte.", Statuses.describe("strength", 3))
    }

    @Test fun singularCuandoCambiaElTexto() {
        assertEquals("Los ataques hacen 25% menos daño. Dura 1 turno más.", Statuses.describe("weak", 1))
        assertEquals("Los ataques hacen 25% menos daño. Dura 4 turnos más.", Statuses.describe("weak", 4))
    }

    @Test fun sinCantidadExplicaLaReglaGeneral() {
        assertEquals(Statuses.get("poison")!!.help, Statuses.describe("poison", null))
    }

    @Test fun todosLosEstadosConDescripcionNoDejanLlavesSinReemplazar() {
        Statuses.db.keys.forEach { id ->
            val t = Statuses.describe(id, 2)
            assertFalse(t.contains("{n}"), "$id quedó con {n}")
            assertTrue(t.isNotBlank(), "$id sin texto")
        }
    }
}
