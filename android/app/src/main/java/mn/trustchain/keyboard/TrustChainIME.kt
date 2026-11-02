package mn.trustchain.keyboard

import android.content.Context
import android.content.Intent
import android.inputmethodservice.InputMethodService
import android.net.Uri
import android.os.Build
import android.os.SystemClock
import android.text.InputType
import android.text.TextUtils
import android.view.View
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputMethodManager

/**
 * The system keyboard service. It has no network access (no INTERNET permission) and stores nothing typed.
 */
class TrustChainIME : InputMethodService(), KeyboardView.Listener {

    private lateinit var layout: Layout
    private var view: KeyboardView? = null
    private var lastShiftTap = 0L
    private var lastSpaceAt = 0L

    override fun onCreate() {
        super.onCreate()
        layout = Layout.parse(assets.open("layout.json").bufferedReader().use { it.readText() })
    }

    override fun onCreateInputView(): View = KeyboardView(this, layout, this).also { view = it }

    override fun onStartInputView(info: EditorInfo?, restarting: Boolean) {
        super.onStartInputView(info, restarting)
        val v = view ?: return
        val cls = (info?.inputType ?: 0) and InputType.TYPE_MASK_CLASS
        v.symbolsMode = cls == InputType.TYPE_CLASS_NUMBER || cls == InputType.TYPE_CLASS_PHONE
        v.shift = KeyboardView.Shift.OFF
        updateAutoShift()
    }

    override fun onUpdateSelection(oldSelStart: Int, oldSelEnd: Int, newSelStart: Int, newSelEnd: Int, candidatesStart: Int, candidatesEnd: Int) {
        super.onUpdateSelection(oldSelStart, oldSelEnd, newSelStart, newSelEnd, candidatesStart, candidatesEnd)
        updateAutoShift()
    }

    /** Capitalise at the start of a sentence, as the app's text field asks (getCursorCapsMode). */
    private fun updateAutoShift() {
        val v = view ?: return
        if (v.shift == KeyboardView.Shift.LOCK) return
        val ic = currentInputConnection ?: return
        val info = currentInputEditorInfo ?: return
        val caps = info.inputType != InputType.TYPE_NULL && ic.getCursorCapsMode(info.inputType) != 0
        v.shift = if (caps) KeyboardView.Shift.ONCE else KeyboardView.Shift.OFF
    }

    override fun onText(text: String) {
        val ic = currentInputConnection ?: return
        if (text == " ") {
            val now = SystemClock.uptimeMillis()
            val before = ic.getTextBeforeCursor(2, 0)
            // Double space → ". " (after a letter or digit), like other phone keyboards.
            if (now - lastSpaceAt < 600 && before != null && before.length == 2 && before[1] == ' ' && before[0].isLetterOrDigit()) {
                ic.deleteSurroundingText(1, 0)
                ic.commitText(". ", 1)
                lastSpaceAt = 0
            } else {
                ic.commitText(" ", 1)
                lastSpaceAt = now
            }
        } else {
            ic.commitText(text, 1)
            lastSpaceAt = 0
            val v = view
            if (v != null && v.shift == KeyboardView.Shift.ONCE) v.shift = KeyboardView.Shift.OFF
        }
        updateAutoShift()
    }

    override fun onBackspace() {
        val ic = currentInputConnection ?: return
        lastSpaceAt = 0
        val selected = ic.getSelectedText(0)
        if (!TextUtils.isEmpty(selected)) {
            ic.commitText("", 1)
        } else {
            // Delete one whole code point (emoji and surrogate pairs included).
            val before = ic.getTextBeforeCursor(2, 0)
            val n = if (before != null && before.length == 2 && Character.isSurrogatePair(before[0], before[1])) 2 else 1
            ic.deleteSurroundingText(n, 0)
        }
        updateAutoShift()
    }

    override fun onShiftTap() {
        val v = view ?: return
        val now = SystemClock.uptimeMillis()
        v.shift = when (v.shift) {
            KeyboardView.Shift.OFF -> KeyboardView.Shift.ONCE
            KeyboardView.Shift.ONCE -> if (now - lastShiftTap < 350) KeyboardView.Shift.LOCK else KeyboardView.Shift.OFF
            KeyboardView.Shift.LOCK -> KeyboardView.Shift.OFF
        }
        lastShiftTap = now
    }

    override fun onSymbols(on: Boolean) {
        view?.symbolsMode = on
    }

    override fun onSwitch() {
        if (Build.VERSION.SDK_INT >= 28) {
            if (!switchToNextInputMethod(false)) onSwitchPicker()
        } else {
            @Suppress("DEPRECATION")
            val imm = getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
            @Suppress("DEPRECATION")
            val token = window?.window?.attributes?.token
            @Suppress("DEPRECATION")
            if (token == null || !imm.switchToNextInputMethod(token, false)) onSwitchPicker()
        }
    }

    override fun onSwitchPicker() {
        (getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager).showInputMethodPicker()
    }

    override fun onEnter() {
        val ic = currentInputConnection ?: return
        val info = currentInputEditorInfo
        val action = (info?.imeOptions ?: 0) and EditorInfo.IME_MASK_ACTION
        val noAction = info == null || (info.imeOptions and EditorInfo.IME_FLAG_NO_ENTER_ACTION) != 0 ||
            action == EditorInfo.IME_ACTION_NONE || action == EditorInfo.IME_ACTION_UNSPECIFIED
        val multiLine = info != null && (info.inputType and InputType.TYPE_TEXT_FLAG_MULTI_LINE) != 0
        if (noAction || multiLine) ic.commitText("\n", 1) else ic.performEditorAction(action)
        updateAutoShift()
    }

    override fun onShare() {
        val send = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, "${layout.shareText} ${layout.shareUrl}")
        }
        val chooser = Intent.createChooser(send, layout.shareLabel).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        runCatching { startActivity(chooser) }
        requestHideSelf(0)
    }

    override fun onBrand() {
        runCatching {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(layout.brandUrl)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        }
        requestHideSelf(0)
    }
}
