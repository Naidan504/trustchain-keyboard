package mn.trustchain.keyboard

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class LayoutTest {
    private val layout = Layout.parse(File("src/main/assets/layout.json").readText())
    private val alphabet = "абвгдеёжзийклмноөпрстуүфхцчшщъыьэюя".map { it.toString() }

    @Test fun allLettersReachable() {
        val chars = layout.letters.flatten().filter { it.type == KeyDef.Type.CHAR }
        val reachable = chars.map { it.text }.toSet() + chars.flatMap { it.long }
        assertEquals(emptyList<String>(), alphabet.filter { it !in reachable })
    }

    @Test fun rowsHaveShiftBackspaceAndBottomRow() {
        val row3 = layout.letters[2]
        assertEquals(KeyDef.Type.SHIFT, row3.first().type)
        assertEquals(KeyDef.Type.BACKSPACE, row3.last().type)
        val bottom = layout.letters.last().map { it.type }
        assertTrue(KeyDef.Type.SPACE in bottom && KeyDef.Type.ENTER in bottom && KeyDef.Type.SYMBOLS in bottom)
        assertTrue(KeyDef.Type.LETTERS in layout.symbols.last().map { it.type })
    }

    @Test fun mongolianUppercaseWorks() {
        assertEquals("ӨҮЁ", "өүё".uppercase())
    }
}
