package com.yokyznt.fruitspire.nativo.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.yokyznt.fruitspire.core.data.Statuses

// ---------------------------------------------------------------------------------------------------------------
// Explicaciones al tocar (los «tip-box» de js/render.js): una burbuja por término, con el título del color de su
// palabra clave, una etiqueta (mejora, perjuicio, ataca, se cubre...) y el texto con las palabras clave pintadas.
// ---------------------------------------------------------------------------------------------------------------

/** Etiqueta de color de una línea (`.tip-kind` de css/style.css). */
@Immutable
class InfoTag(val label: String, val bg: Color, val fg: Color)

object InfoTags {
    val buff = InfoTag("mejora", Color(0xFFE4F4D6), Color(0xFF3E7A2A))
    val debuff = InfoTag("perjuicio", Color(0xFFE6DCF7), Color(0xFF6A4BB0))
    fun attack(l: String) = InfoTag(l, Color(0xFFFFD6DC), Color(0xFFB8324A))
    fun defend(l: String) = InfoTag(l, Color(0xFFD2F2E6), Color(0xFF23705A))
    fun gain(l: String) = InfoTag(l, Color(0xFFFFE3C4), Color(0xFFB85A1E))
    fun curse(l: String) = InfoTag(l, Color(0xFFE6DCF7), Color(0xFF6A4BB0))
    fun heal(l: String) = InfoTag(l, Color(0xFFE4F4D6), Color(0xFF3E7A2A))
    fun summon(l: String) = InfoTag(l, Color(0xFFCFE8FA), Color(0xFF2E5E9A))
    fun steal(l: String) = InfoTag(l, Color(0xFFFFF0B8), Color(0xFF9A6A12))
}

@Immutable
class InfoLine(val tag: InfoTag?, val text: String)

@Immutable
class InfoSection(val title: String, val titleColor: Color, val lines: List<InfoLine>, val sprite: String? = null) {
    constructor(title: String, text: String, tag: InfoTag? = null, sprite: String? = null) :
        this(title, Kw.colorOfTitle(title), listOf(InfoLine(tag, text)), sprite)
}

private fun statusTag(id: String) = if (Statuses.get(id)?.kind == "debuff") InfoTags.debuff else InfoTags.buff

/** statusTip: nombre con su cantidad, mejora o perjuicio, y qué hace con esa cantidad. */
fun statusSection(id: String, n: Int?): InfoSection {
    val s = Statuses.get(id) ?: return InfoSection(id, "")
    val title = s.name + if (n != null && !s.noCount) " $n" else ""
    return InfoSection(title, Kw.color(s.cls), listOf(InfoLine(statusTag(id), Statuses.describe(id, n))), s.sprite)
}

/**
 * Explicaciones de los términos que nombra [text] (cada estado, «se consume»…), hasta 3 niveles y sin repetir
 * (keywordTips de js/render.js). [skip] son títulos que ya se explicaron.
 */
fun keywordSections(text: String, skip: Collection<String> = emptyList()): List<InfoSection> {
    val seen = HashSet<String>(skip)
    val out = ArrayList<InfoSection>()
    var queue = listOf(text.lowercase())
    var depth = 0
    while (depth < 3 && queue.isNotEmpty()) {
        val next = ArrayList<String>()
        for (t in queue) for (k in Kw.entries) {
            if (k.basic || k.title == null || !t.contains(k.word) || !seen.add(k.title)) continue
            out.add(if (k.statusId != null) statusSection(k.statusId, null) else InfoSection(k.title, Kw.color(k.cls), listOf(InfoLine(null, k.text ?: ""))))
            next.add((k.text ?: "").lowercase())
        }
        queue = next
        depth++
    }
    return out
}

/** Varios estados ([id] a cantidad) más los términos que nombran (statusTipsFull). */
fun statusSectionsFull(entries: List<Pair<String, Int>>): List<InfoSection> {
    val names = entries.map { (id, _) -> Statuses.get(id)?.name ?: id }
    val helps = entries.joinToString(" ") { (id, _) -> Statuses.get(id)?.help.orEmpty() }
    return entries.map { (id, n) -> statusSection(id, n) } + keywordSections(helps, names)
}

/** La pila de burbujas que se abre al tocar un estado, la intención de un enemigo o una regla. */
@Composable
fun InfoStack(sections: List<InfoSection>, modifier: Modifier = Modifier, width: Dp = 440.dp, titleSize: Float = 21f, textSize: Float = 17f) {
    Column(modifier.width(width), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        sections.forEachIndexed { i, sec ->
            Column(
                Modifier.rotate(if (i % 2 == 0) -.6f else .8f).stickerCard(14.dp, Ink.paper2).padding(horizontal = 16.dp, vertical = 10.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (sec.sprite != null) Sprite(sec.sprite, 30.dp)
                    BasicText(sec.title, style = Fonts.body(titleSize, FontWeight.Bold, sec.titleColor))
                }
                sec.lines.forEach { line ->
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        if (line.tag != null) {
                            BasicText(
                                line.tag.label,
                                style = Fonts.body(textSize * .8f, FontWeight.Bold, line.tag.fg),
                                modifier = Modifier.chip(99.dp, line.tag.bg).padding(horizontal = 9.dp, vertical = 1.dp)
                            )
                        }
                        GameText(line.text, Fonts.body(textSize, color = Ink.ink), Modifier.weight(1f, fill = false))
                    }
                }
            }
        }
    }
}
