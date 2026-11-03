package mn.trustchain.keyboard

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.view.inputmethod.InputMethodManager
import android.widget.Button
import android.widget.EditText
import android.widget.TextView

/** Setup screen: step 1 enable the keyboard, step 2 choose it, then a test field. */
class SetupActivity : Activity() {

    private lateinit var status: TextView
    private lateinit var step1: Button
    private lateinit var step2: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_setup)
        status = findViewById(R.id.status)
        step1 = findViewById(R.id.step1)
        step2 = findViewById(R.id.step2)
        step1.setOnClickListener { startActivity(Intent(Settings.ACTION_INPUT_METHOD_SETTINGS)) }
        step2.setOnClickListener { imm().showInputMethodPicker() }
        findViewById<Button>(R.id.share).setOnClickListener {
            val layout = Layout.parse(assets.open("layout.json").bufferedReader().use { reader -> reader.readText() })
            val send = Intent(Intent.ACTION_SEND).apply {
                type = "text/plain"
                putExtra(Intent.EXTRA_TEXT, "${layout.shareText} ${layout.shareUrl}")
            }
            startActivity(Intent.createChooser(send, getString(R.string.share)))
        }
        findViewById<EditText>(R.id.test).requestFocus()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) refresh() // returning from Settings or the picker
    }

    private fun imm() = getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager

    private fun enabled(): Boolean = imm().enabledInputMethodList.any { it.packageName == packageName }

    private fun selected(): Boolean {
        val id = Settings.Secure.getString(contentResolver, Settings.Secure.DEFAULT_INPUT_METHOD) ?: return false
        return id.startsWith("$packageName/")
    }

    private fun refresh() {
        val on = enabled()
        val sel = selected()
        step1.isEnabled = !on
        step1.text = getString(if (on) R.string.step1_done else R.string.step1)
        step2.isEnabled = on && !sel
        step2.text = getString(if (sel) R.string.step2_done else R.string.step2)
        status.text = getString(if (sel) R.string.status_ready else R.string.status_todo)
    }
}
