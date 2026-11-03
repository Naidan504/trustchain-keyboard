package mn.trustchain.keyboard

import android.annotation.SuppressLint
import android.content.Context
import android.content.res.Configuration
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Typeface
import android.os.Handler
import android.os.Looper
import android.view.HapticFeedbackConstants
import android.view.MotionEvent
import android.view.View
import kotlin.math.abs
import kotlin.math.roundToInt

/**
 * The whole keyboard drawn on one canvas: keys, press preview and the long-press popup.
 * One view handles all touches, so it stays fast and the popup can slide freely.
 */
@SuppressLint("ViewConstructor")
class KeyboardView(context: Context, private val layout: Layout, private val listener: Listener) : View(context) {

    interface Listener {
        fun onText(text: String)
        fun onBackspace()
        fun onShiftTap()
        fun onSymbols(on: Boolean)
        fun onSwitch()
        fun onSwitchPicker()
        fun onEnter()
        fun onLayoutToggle()
    }

    enum class Shift { OFF, ONCE, LOCK }

    var shift = Shift.OFF
        set(v) { if (field != v) { field = v; invalidate() } }
    var symbolsMode = false
        set(v) { if (field != v) { field = v; rebuild(); invalidate() } }
    var standardMode = false
        set(v) { if (field != v) { field = v; rebuild(); invalidate() } }

    private class KeyRect(val def: KeyDef, val rect: RectF, val row: Int)

    private val dp = resources.displayMetrics.density
    private val night = (resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES

    // Colours: TrustChain green accent, neutral keys.
    private val cBg = if (night) 0xFF1B1D1F.toInt() else 0xFFE4E7EB.toInt()
    private val cKey = if (night) 0xFF3A3D41.toInt() else 0xFFFFFFFF.toInt()
    private val cKeyDown = if (night) 0xFF55595E.toInt() else 0xFFC9CED5.toInt()
    private val cSpecial = if (night) 0xFF2B2E31.toInt() else 0xFFC4C9D0.toInt()
    private val cText = if (night) 0xFFEDEDED.toInt() else 0xFF1F1F1F.toInt()
    private val cHint = if (night) 0xFF9AA0A6.toInt() else 0xFF80868B.toInt()
    private val cAccent = if (night) 0xFFA8D5AC.toInt() else 0xFF2F6B3E.toInt()
    private val cOnAccent = if (night) 0xFF10301A.toInt() else 0xFFFFFFFF.toInt()
    private val cPopup = if (night) 0xFF4A4E53.toInt() else 0xFFFFFFFF.toInt()
    private val cShadow = 0x33000000

    private val fill = Paint(Paint.ANTI_ALIAS_FLAG)
    private val text = Paint(Paint.ANTI_ALIAS_FLAG).apply { textAlign = Paint.Align.CENTER }
    private val hint = Paint(Paint.ANTI_ALIAS_FLAG).apply { textAlign = Paint.Align.CENTER; color = cHint }

    private val topPadding get() = 8 * dp
    private val rowH: Float get() {
        val landscape = resources.configuration.orientation == Configuration.ORIENTATION_LANDSCAPE
        return (if (landscape) 44 else 62) * dp
    }
    private val gap = 3 * dp
    private val radius = 7 * dp

    private var keys = listOf<KeyRect>()

    // Touch state: one active pointer at a time (a new finger commits the previous key).
    private var activeId = -1
    private var active: KeyRect? = null
    private var popup: List<String>? = null
    private var popupRect = RectF()
    private var popupCellW = 0f
    private var popupSel = 0
    private var popupStartX = 0f
    private var longFired = false
    private val handler = Handler(Looper.getMainLooper())
    private val longPress = Runnable { onLongPress() }
    private val repeat = object : Runnable {
        override fun run() {
            listener.onBackspace()
            handler.postDelayed(this, 45)
        }
    }

    init {
        isHapticFeedbackEnabled = true
    }

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val w = MeasureSpec.getSize(widthMeasureSpec)
        setMeasuredDimension(w, (topPadding + rowsNow.size * rowH + gap).roundToInt())
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) = rebuild()

    private fun rebuild() {
        val rows = rowsNow
        val w = width.toFloat()
        if (w <= 0f) return
        val out = ArrayList<KeyRect>()
        rows.forEachIndexed { r, row ->
            val total = row.sumOf { it.weight.toDouble() }.toFloat()
            // Rows with fewer keys keep the same key width as a 12-key row and are centred,
            // so letters line up like on a normal keyboard.
            val unit = minOf(w / total, w / 12f)
            var x = (w - unit * total) / 2f
            val top = topPadding + r * rowH
            for (k in row) {
                val kw = unit * k.weight
                out += KeyRect(k, RectF(x, top, x + kw, top + rowH), r)
                x += kw
            }
        }
        // Stretch the first and last key of each row to the edge, so edge taps don't fall in a gap.
        for (r in rows.indices) {
            val inRow = out.filter { it.row == r }
            inRow.firstOrNull()?.rect?.left = 0f
            inRow.lastOrNull()?.rect?.right = w
        }
        keys = out
        requestLayout()
    }

    // ---------- drawing ----------

    override fun onDraw(canvas: Canvas) {
        canvas.drawColor(cBg)
        for (k in keys) drawKey(canvas, k)
        val a = active
        if (popup != null && a != null) drawPopup(canvas, a)
        else if (a != null && a.def.type == KeyDef.Type.CHAR && !longFired) drawPreview(canvas, a)
    }

    private fun label(k: KeyDef): String = when (k.type) {
        KeyDef.Type.CHAR -> cased(k.text)
        KeyDef.Type.SHIFT -> if (shift == Shift.LOCK) "⇪" else "⇧"
        KeyDef.Type.SPACE -> if (standardMode) layout.standardName else layout.compactName
        else -> k.label
    }

    private fun cased(s: String) = if (shift != Shift.OFF && !symbolsMode) s.uppercase() else s

    private fun drawKey(canvas: Canvas, k: KeyRect) {
        val r = RectF(k.rect.left + gap, k.rect.top + gap, k.rect.right - gap, k.rect.bottom - gap)
        // For the edge keys that were stretched, draw them at their visual size.
        if (k.rect.left == 0f && k.def.type == KeyDef.Type.CHAR && !isFirstInFullRow(k)) r.left = maxOf(r.left, visualLeft(k))
        if (k.rect.right == width.toFloat() && k.def.type == KeyDef.Type.CHAR && !isLastInFullRow(k)) r.right = minOf(r.right, visualRight(k))
        val pressed = active === k && popup == null
        val special = k.def.type != KeyDef.Type.CHAR && k.def.type != KeyDef.Type.SPACE
        val accent = k.def.type == KeyDef.Type.ENTER || (k.def.type == KeyDef.Type.SHIFT && shift != Shift.OFF)
        fill.color = cShadow
        canvas.drawRoundRect(RectF(r.left, r.top + 1.2f * dp, r.right, r.bottom + 1.2f * dp), radius, radius, fill)
        fill.color = when {
            pressed -> cKeyDown
            accent -> cAccent
            special -> cSpecial
            else -> cKey
        }
        canvas.drawRoundRect(r, radius, radius, fill)

        val lbl = label(k.def)
        text.color = if (accent && !pressed) cOnAccent else cText
        text.typeface = Typeface.DEFAULT
        text.textSize = when {
            k.def.type == KeyDef.Type.SPACE -> 13 * dp
            lbl.length > 2 -> 15 * dp
            else -> 24 * dp
        }
        if (k.def.type == KeyDef.Type.SPACE) text.color = cHint
        canvas.drawText(lbl, r.centerX(), r.centerY() - (text.descent() + text.ascent()) / 2, text)

        // Corner hint: the first long-press letter, so people discover the hidden ones.
        if (k.def.type == KeyDef.Type.CHAR && k.def.long.isNotEmpty()) {
            hint.textSize = 11 * dp
            canvas.drawText(cased(k.def.long[0]), r.right - 8 * dp, r.top + 13 * dp, hint)
        }
    }

    // Visual bounds of a centred row's edge keys (touch area is stretched to the screen edge).
    private val rowsNow get() = if (symbolsMode) layout.symbols else if (standardMode) layout.lettersStandard else layout.letters
    private fun rowUnit(row: Int): Float {
        val total = rowsNow[row].sumOf { it.weight.toDouble() }.toFloat()
        return minOf(width / total, width / 12f)
    }
    private fun rowOffset(row: Int): Float {
        val total = rowsNow[row].sumOf { it.weight.toDouble() }.toFloat()
        return (width - rowUnit(row) * total) / 2f
    }
    private fun isFirstInFullRow(k: KeyRect) = rowOffset(k.row) < 1f
    private fun isLastInFullRow(k: KeyRect) = rowOffset(k.row) < 1f
    private fun visualLeft(k: KeyRect) = rowOffset(k.row) + gap
    private fun visualRight(k: KeyRect) = width - rowOffset(k.row) - gap

    private fun drawPreview(canvas: Canvas, k: KeyRect) {
        val w = maxOf(k.rect.width(), 44 * dp)
        val h = rowH * 1.05f
        val left = (k.rect.centerX() - w / 2).coerceIn(0f, width - w)
        val top = maxOf(0f, k.rect.top - h)
        val r = RectF(left, top, left + w, top + h)
        fill.color = cShadow
        canvas.drawRoundRect(RectF(r.left, r.top + 2 * dp, r.right, r.bottom + 2 * dp), radius, radius, fill)
        fill.color = cPopup
        canvas.drawRoundRect(r, radius, radius, fill)
        text.color = cText
        text.textSize = 30 * dp
        canvas.drawText(cased(k.def.text), r.centerX(), r.centerY() - (text.descent() + text.ascent()) / 2, text)
    }

    private fun drawPopup(canvas: Canvas, k: KeyRect) {
        val opts = popup ?: return
        fill.color = cShadow
        canvas.drawRoundRect(RectF(popupRect.left, popupRect.top + 2 * dp, popupRect.right, popupRect.bottom + 2 * dp), radius, radius, fill)
        fill.color = cPopup
        canvas.drawRoundRect(popupRect, radius, radius, fill)
        opts.forEachIndexed { i, s ->
            val cell = RectF(popupRect.left + i * popupCellW, popupRect.top, popupRect.left + (i + 1) * popupCellW, popupRect.bottom)
            val sel = i == popupSel
            if (sel) {
                fill.color = cAccent
                canvas.drawRoundRect(RectF(cell.left + 3 * dp, cell.top + 3 * dp, cell.right - 3 * dp, cell.bottom - 3 * dp), radius, radius, fill)
            }
            text.color = if (sel) cOnAccent else cText
            text.textSize = 26 * dp
            canvas.drawText(cased(s), cell.centerX(), cell.centerY() - (text.descent() + text.ascent()) / 2, text)
        }
    }

    // ---------- touch ----------

    private fun keyAt(x: Float, y: Float): KeyRect? {
        if (y < topPadding) return null
        val row = ((y - topPadding) / rowH).toInt().coerceIn(0, rowsNow.size - 1)
        val inRow = keys.filter { it.row == row }
        return inRow.firstOrNull { x >= it.rect.left && x < it.rect.right }
            ?: inRow.minByOrNull { abs(it.rect.centerX() - x) }
    }

    @SuppressLint("ClickableViewAccessibility")
    override fun onTouchEvent(e: MotionEvent): Boolean {
        when (e.actionMasked) {
            MotionEvent.ACTION_DOWN, MotionEvent.ACTION_POINTER_DOWN -> {
                if (activeId != -1) release(commit = true) // fast typing: the earlier finger's key goes first
                val i = e.actionIndex
                press(e.getPointerId(i), e.getX(i), e.getY(i))
            }
            MotionEvent.ACTION_MOVE -> {
                val i = e.findPointerIndex(activeId)
                if (i >= 0) move(e.getX(i), e.getY(i))
            }
            MotionEvent.ACTION_UP, MotionEvent.ACTION_POINTER_UP -> {
                if (e.getPointerId(e.actionIndex) == activeId) release(commit = true)
            }
            MotionEvent.ACTION_CANCEL -> release(commit = false)
        }
        return true
    }

    private fun press(id: Int, x: Float, y: Float) {
        activeId = id
        longFired = false
        popup = null
        val k = keyAt(x, y) ?: run { activeId = -1; return }
        active = k
        performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
        when (k.def.type) {
            KeyDef.Type.CHAR -> if (k.def.long.isNotEmpty()) handler.postDelayed(longPress, layout.longPressMs)
            KeyDef.Type.BACKSPACE -> { listener.onBackspace(); handler.postDelayed(repeat, 380) }
            KeyDef.Type.SWITCH -> handler.postDelayed(longPress, 450)
            KeyDef.Type.SPACE -> handler.postDelayed(longPress, layout.longPressMs)
            else -> {}
        }
        popupStartX = x
        invalidate()
    }

    private fun move(x: Float, y: Float) {
        val opts = popup
        if (opts != null) {
            val sel = (popupInitial() + ((x - popupStartX) / popupCellW).roundToInt()).coerceIn(0, opts.size - 1)
            if (sel != popupSel) { popupSel = sel; invalidate() }
            return
        }
        // Anchor a future popup to the finger's position when it opens, even after a small drift.
        popupStartX = x
        val cur = active ?: return
        if (cur.def.type != KeyDef.Type.CHAR) return
        // Sliding to a neighbour before the long-press fires: the key under the finger counts.
        val k = keyAt(x, y) ?: return
        if (k !== cur && k.def.type == KeyDef.Type.CHAR) {
            handler.removeCallbacks(longPress)
            active = k
            popupStartX = x
            if (k.def.long.isNotEmpty()) handler.postDelayed(longPress, layout.longPressMs)
            invalidate()
        }
    }

    private fun popupInitial() = 0

    private fun onLongPress() {
        val k = active ?: return
        longFired = true
        if (k.def.type == KeyDef.Type.SWITCH) { listener.onSwitchPicker(); return }
        if (k.def.type == KeyDef.Type.SPACE) {
            performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
            listener.onLayoutToggle()
            return
        }
        val opts = k.def.long
        if (opts.isEmpty()) return
        performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
        popupCellW = maxOf(k.rect.width(), 42 * dp)
        val w = popupCellW * opts.size
        val h = rowH * 1.05f
        // The first option sits right above the key, so "hold and release" picks it with no slide.
        val left = (k.rect.centerX() - popupCellW / 2).coerceIn(0f, width - w)
        val top = maxOf(0f, k.rect.top - h)
        popupRect = RectF(left, top, left + w, top + h)
        popup = opts
        popupSel = 0
        invalidate()
    }

    private fun release(commit: Boolean) {
        handler.removeCallbacks(longPress)
        handler.removeCallbacks(repeat)
        val k = active
        val opts = popup
        activeId = -1; active = null; popup = null
        invalidate()
        if (!commit) return
        if (k == null) return
        if (opts != null) { listener.onText(cased(opts[popupSel])); return }
        if (longFired) return // switch or space long-press already handled
        when (k.def.type) {
            KeyDef.Type.CHAR -> listener.onText(cased(k.def.text))
            KeyDef.Type.SPACE -> listener.onText(" ")
            KeyDef.Type.SHIFT -> listener.onShiftTap()
            KeyDef.Type.SYMBOLS -> listener.onSymbols(true)
            KeyDef.Type.LETTERS -> listener.onSymbols(false)
            KeyDef.Type.SWITCH -> listener.onSwitch()
            KeyDef.Type.ENTER -> listener.onEnter()
            KeyDef.Type.BACKSPACE -> {}
        }
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        handler.removeCallbacksAndMessages(null)
        activeId = -1; active = null; popup = null
    }
}
