package com.yokyznt.fruitspire.nativo.ui

import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.text.BasicText
import androidx.compose.foundation.text.InlineTextContent
import androidx.compose.foundation.text.TextAutoSize
import androidx.compose.foundation.text.appendInlineContent
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.Placeholder
import androidx.compose.ui.text.PlaceholderVerticalAlign
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.em
import com.yokyznt.fruitspire.core.PreviewResult
import com.yokyznt.fruitspire.core.data.Sprouts
import com.yokyznt.fruitspire.core.data.Statuses

/** Palabras clave del juego (keywords() de js/render.js): se pintan de su color dentro de los textos. */
object Kw {
    class Entry(val word: String, val cls: String, val title: String?, val text: String?, val statusId: String?, val basic: Boolean)

    val entries: List<Entry> by lazy {
        val list = ArrayList<Entry>()
        Statuses.db.values.forEach { s -> list.add(Entry(s.word, s.cls, s.name, s.help, s.id, false)) }
        list.add(Entry("cáscara", "block", null, null, null, true))
        list.add(Entry("energía", "energy", null, null, null, true))
        list.add(Entry("roba", "draw", null, null, null, true))
        list.add(Entry("recupera", "heal", null, null, null, true))
        list.add(Entry("se consume", "poison", "Se consume", "Tras jugarla, sale del combate.", null, false))
        list.add(Entry("se conserva", "draw", "Se conserva", "No se descarta al terminar el turno.", null, false))
        list.add(Entry("injugable", "weak", "Injugable", "No se puede jugar.", null, false))
        list.add(Entry("pepita", "heal", "Pepita", "Carta de 0 de energía que inflige 3 de daño. Se consume.", null, false))
        listOf("planta", "brote", "viñedo", "cosecha").forEach { list.add(Entry(it, "heal", null, null, null, true)) }
        Sprouts.db.values.forEach { sp -> list.add(Entry(sp.word, "heal", sp.name, sp.help, null, false)) }
        list
    }

    fun color(cls: String): Color = when (cls) {
        "poison" -> Color(0xFF7A5BC4)
        "weak" -> Color(0xFF8A8A3A)
        "vuln" -> Color(0xFFD2445B)
        "str" -> Color(0xFFD86A3E)
        "block" -> Ink.mintDark
        "energy" -> Color(0xFFD9791F)
        "draw" -> Color(0xFF5A6FB0)
        "heal" -> Color(0xFF4E9A35)
        else -> Ink.ink
    }

    /** Color del título de una explicación ("Madurez 3" → el de Madurez). */
    fun colorOfTitle(title: String): Color {
        val t = title.replace(Regex("""\s+\d+$"""), "").lowercase()
        val k = entries.firstOrNull { (it.title ?: it.word).lowercase() == t }
        return if (k != null) color(k.cls) else Ink.ink
    }
}

/** Una explicación de un término que aparece en un texto (para la ficha de una carta o un objeto). */
class KwRow(val sprite: String?, val title: String, val text: String, val color: Color)

/** Términos con explicación que menciona [text] (los básicos como cáscara o energía no se explican). */
fun keywordRows(text: String, skip: String? = null): List<KwRow> {
    val low = text.lowercase()
    val seen = HashSet<String>()
    if (skip != null) seen.add(skip)
    val out = ArrayList<KwRow>()
    var queue = listOf(low)
    var depth = 0
    while (depth < 3 && queue.isNotEmpty()) {
        val next = ArrayList<String>()
        for (t in queue) {
            for (k in Kw.entries) {
                if (k.basic || k.title == null || !seen.add(k.title) || !t.contains(k.word)) continue
                val status = k.statusId?.let { Statuses.get(it) }
                val kind = if (status?.kind == "debuff") "perjuicio" else if (status != null) "mejora" else null
                out.add(KwRow(status?.sprite ?: "ui_up", k.title, (if (kind != null) "$kind. " else "") + (k.text ?: ""), Kw.color(k.cls)))
                next.add((k.text ?: "").lowercase())
            }
        }
        queue = next
        depth++
    }
    return out
}

private val TOKEN: Regex by lazy {
    val words = Kw.entries.map { Regex.escape(it.word) }.sortedByDescending { it.length }
    // 1 número · 2 unidad (para la vista previa) · 3 corazón · 4 energía · 5 palabra clave
    Regex("""(\d+)( de daño| de cáscara)?|(❤️?)|(energía)|(?<![\p{L}\p{N}_-])(${words.joinToString("|")})[\p{L}\p{N}_]*""", RegexOption.IGNORE_CASE)
}

private val NUM_STYLE = SpanStyle(fontFamily = Fonts.display, fontSize = 1.15.em, fontWeight = FontWeight.Normal)

/**
 * Texto del juego listo para pintar: números en la letra de títulos, palabras clave de su color y los iconos
 * de corazón y energía en lugar de ❤️ y «energía». Con [preview] los números de daño y cáscara muestran el valor
 * real (verde si sube, rojo si baja), como previewDescHtml del juego web.
 */
fun gameText(text: String, preview: PreviewResult? = null): AnnotatedString = buildAnnotatedString {
    var last = 0
    var di = 0
    var bi = 0
    for (m in TOKEN.findAll(text)) {
        append(text.substring(last, m.range.first))
        last = m.range.last + 1
        val num = m.groups[1]
        when {
            num != null -> {
                val unit = m.groups[2]?.value ?: ""
                val base = num.value.toIntOrNull() ?: 0
                var shown = num.value
                var color: Color? = null
                if (preview != null) {
                    val live = if (unit == " de daño") preview.dmg.getOrNull(di++) else if (unit == " de cáscara") preview.block.getOrNull(bi++) else null
                    if (live != null) {
                        shown = live.toString()
                        color = if (live > base) Color(0xFF2F8E72) else if (live < base) Color(0xFFD2445B) else null
                    }
                }
                pushStyle(if (color != null) NUM_STYLE.copy(color = color) else NUM_STYLE)
                append(shown)
                pop()
                append(unit)
            }
            m.groups[3] != null -> appendInlineContent("heart", "❤")
            m.groups[4] != null -> appendInlineContent("energy", "E")
            else -> {
                val word = m.groups[5]!!.value.lowercase()
                val k = Kw.entries.firstOrNull { word.startsWith(it.word) }
                if (k == null) append(m.value) else {
                    pushStyle(SpanStyle(color = Kw.color(k.cls), fontWeight = FontWeight.Bold))
                    append(m.value)
                    pop()
                }
            }
        }
    }
    append(text.substring(last))
}

/** Iconos que van dentro del texto: el corazón de vida y el gajo de energía. */
val InlineIcons: Map<String, InlineTextContent> by lazy {
    fun icon(id: String) = InlineTextContent(Placeholder(1.2.em, 1.2.em, PlaceholderVerticalAlign.TextCenter)) {
        BoxWithConstraints(Modifier.fillMaxSize()) { Sprite(id, maxWidth, outline = false) }
    }
    mapOf("heart" to icon("ui_heart"), "energy" to icon("ui_energy"))
}

/** Texto del juego (con iconos). */
@Composable
fun GameText(
    text: AnnotatedString,
    style: TextStyle,
    modifier: Modifier = Modifier,
    maxLines: Int = Int.MAX_VALUE,
    autoSize: TextAutoSize? = null
) {
    BasicText(text, modifier, style, overflow = TextOverflow.Clip, maxLines = maxLines, inlineContent = InlineIcons, autoSize = autoSize)
}

@Composable
fun GameText(
    text: String,
    style: TextStyle,
    modifier: Modifier = Modifier,
    maxLines: Int = Int.MAX_VALUE
) = GameText(gameText(text), style, modifier, maxLines)
