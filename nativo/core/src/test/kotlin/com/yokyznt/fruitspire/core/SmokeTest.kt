package com.yokyznt.fruitspire.core

import kotlin.test.Test
import kotlin.test.assertTrue

class SmokeTest {
    @Test
    fun versionIsSet() {
        assertTrue(GameInfo.VERSION.isNotBlank())
    }
}
