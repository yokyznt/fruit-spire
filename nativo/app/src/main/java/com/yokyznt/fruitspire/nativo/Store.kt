package com.yokyznt.fruitspire.nativo

import android.content.Context
import java.io.File

/**
 * Archivos de la partida y del progreso en el almacenamiento privado de la app (el JSON lo arma core/Save.kt).
 * Se escribe a un archivo temporal y se renombra, así un corte a la mitad nunca deja la partida a medias.
 */
class SaveStore(context: Context) {
    private val dir: File = context.applicationContext.filesDir
    private val runFile = File(dir, "partida.json")
    private val progressFile = File(dir, "progreso.json")

    fun readRun(): String? = read(runFile)
    fun writeRun(text: String) = write(runFile, text)
    fun clearRun() { runFile.delete() }
    fun hasRun(): Boolean = runFile.exists()

    fun readProgress(): String? = read(progressFile)
    fun writeProgress(text: String) = write(progressFile, text)

    private fun read(f: File): String? = try { if (f.exists()) f.readText() else null } catch (e: Exception) { null }

    private fun write(f: File, text: String) {
        try {
            val tmp = File(dir, f.name + ".tmp")
            tmp.writeText(text)
            if (!tmp.renameTo(f)) { f.delete(); tmp.renameTo(f) }
        } catch (e: Exception) { /* sin espacio o sin permiso: se ignora, como el localStorage de la web */ }
    }
}
