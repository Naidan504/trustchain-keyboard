package mn.trustchain.keyboard

import org.json.JSONArray
import org.json.JSONObject

/** One key on screen. [text] is what a tap types; [long] is what the long-press popup offers. */
data class KeyDef(
    val type: Type,
    val text: String = "",
    val label: String = text,
    val long: List<String> = emptyList(),
    val weight: Float = 1f,
) {
    enum class Type { CHAR, SHIFT, BACKSPACE, SYMBOLS, LETTERS, SWITCH, SPACE, ENTER }
}

/** Parsed spec/layout.json (bundled as assets/layout.json). */
class Layout(
    val letters: List<List<KeyDef>>,
    val lettersStandard: List<List<KeyDef>>,
    val symbols: List<List<KeyDef>>,
    val longPressMs: Long,
    val compactName: String,
    val standardName: String,
    val shareText: String,
    val shareUrl: String,
) {
    companion object {
        fun parse(json: String): Layout {
            val o = JSONObject(json)
            val bottomJson = o.getJSONArray("bottom")

            fun strings(a: JSONArray?): List<String> =
                if (a == null) emptyList() else List(a.length()) { a.getString(it) }

            fun bottomRow(symbolsMode: Boolean): List<KeyDef> = List(bottomJson.length()) { i ->
                val b = bottomJson.getJSONObject(i)
                when (b.getString("type")) {
                    "symbols" -> if (symbolsMode) KeyDef(KeyDef.Type.LETTERS, label = "АБВ", weight = 1.5f)
                                 else KeyDef(KeyDef.Type.SYMBOLS, label = b.optString("label", "?123"), weight = 1.5f)
                    "switch" -> KeyDef(KeyDef.Type.SWITCH, label = b.optString("label", "🌐"))
                    "space" -> KeyDef(KeyDef.Type.SPACE, text = " ", label = b.optString("label", ""), weight = 4.5f)
                    "enter" -> KeyDef(KeyDef.Type.ENTER, label = b.optString("label", "⏎"), weight = 1.5f)
                    else -> KeyDef(KeyDef.Type.CHAR, text = b.getString("k"), long = strings(b.optJSONArray("long")))
                }
            }

            fun letterRows(field: String): List<List<KeyDef>> {
                val lettersJson = o.getJSONArray(field)
                val letters = MutableList(lettersJson.length()) { r ->
                    val row = lettersJson.getJSONArray(r)
                    MutableList(row.length()) { i ->
                        val k = row.getJSONObject(i)
                        KeyDef(KeyDef.Type.CHAR, text = k.getString("k"), long = strings(k.optJSONArray("long")))
                    }
                }
                letters.last().add(0, KeyDef(KeyDef.Type.SHIFT, label = "⇧", weight = 1.4f))
                letters.last().add(KeyDef(KeyDef.Type.BACKSPACE, label = "⌫", weight = 1.4f))
                return letters + listOf(bottomRow(false))
            }

            val symLong = o.optJSONObject("symbolsLong") ?: JSONObject()
            val symJson = o.getJSONArray("symbols")
            val symbols = MutableList(symJson.length()) { r ->
                val row = symJson.getJSONArray(r)
                MutableList(row.length()) { i ->
                    val s = row.getString(i)
                    KeyDef(KeyDef.Type.CHAR, text = s, long = strings(symLong.optJSONArray(s)))
                }
            }
            symbols.last().add(KeyDef(KeyDef.Type.BACKSPACE, label = "⌫", weight = 1.4f))

            val top = o.optJSONObject("topBar") ?: JSONObject()
            val share = top.optJSONObject("share") ?: JSONObject()
            val names = o.getJSONObject("layoutNames")
            return Layout(
                letters = letterRows("letters"),
                lettersStandard = letterRows("lettersStandard"),
                symbols = symbols + listOf(bottomRow(true)),
                longPressMs = o.getLong("longPressMs"),
                compactName = names.getString("compact"),
                standardName = names.getString("standard"),
                shareText = share.optString("text", ""),
                shareUrl = share.optString("url", "https://trustchain.mn/keyboard"),
            )
        }
    }
}
