package app.arc.bridge

import android.content.Intent
import android.os.Bundle
import android.text.InputType
import android.view.Gravity
import android.widget.Button
import android.widget.CheckBox
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.result.ActivityResultLauncher
import androidx.appcompat.app.AppCompatActivity
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch

/**
 * One screen: the ARC server + device token (filled in by the website's
 * "Open in ARC app" link), what ARC may read, grant it in Health Connect, sync.
 * Deliberately not a second ARC app.
 */
class MainActivity : AppCompatActivity() {

    companion object {
        const val DEFAULT_SERVER = "https://winterarc-six-lac.vercel.app"
    }

    private lateinit var settings: BridgeSettings
    private lateinit var server: EditText
    private lateinit var token: EditText
    private lateinit var status: TextView
    private lateinit var requestPermissions: ActivityResultLauncher<Set<String>>
    private val choices = linkedMapOf<String, CheckBox>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        settings = BridgeSettings(this)

        requestPermissions = registerForActivityResult(PermissionController.createRequestPermissionResultContract()) {
            lifecycleScope.launch { showStatus() }
        }

        val pad = (20 * resources.displayMetrics.density).toInt()
        val root = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(pad, pad * 2, pad, pad) }
        fun label(text: String) = TextView(this).apply { this.text = text; setPadding(0, pad, 0, pad / 4) }

        root.addView(TextView(this).apply { text = "ARC"; textSize = 22f; letterSpacing = 0.3f; gravity = Gravity.START })
        root.addView(TextView(this).apply { text = "Sends your daily steps, sleep, exercise and weight from Health Connect to your Arc. Nothing else." })

        root.addView(label("ARC address"))
        server = EditText(this).apply {
            hint = DEFAULT_SERVER
            setText(settings.serverUrl.ifEmpty { DEFAULT_SERVER })
            inputType = InputType.TYPE_TEXT_VARIATION_URI
        }
        root.addView(server)

        root.addView(label("Device token (ARC website → Settings → Health)"))
        token = EditText(this).apply { hint = "arc_hc_…"; setText(settings.token); inputType = InputType.TYPE_TEXT_VARIATION_PASSWORD or InputType.TYPE_CLASS_TEXT }
        root.addView(token)

        root.addView(label("What ARC may read"))
        for (type in HealthReader.PERMISSIONS.keys) {
            val box = CheckBox(this).apply { text = type.replaceFirstChar { it.uppercase() }; isChecked = type != "weight" }
            choices[type] = box
            root.addView(box)
        }

        root.addView(Button(this).apply {
            text = "Save and grant access"
            setOnClickListener {
                settings.serverUrl = server.text.toString().trim()
                settings.token = token.text.toString().trim()
                val wanted = choices.filterValues { it.isChecked }.keys.mapNotNull { HealthReader.PERMISSIONS[it] }.toSet()
                if (wanted.isNotEmpty()) requestPermissions.launch(wanted)
                Uploader.schedule(this@MainActivity)
            }
        })
        root.addView(Button(this).apply {
            text = "Sync now"
            setOnClickListener {
                settings.serverUrl = server.text.toString().trim()
                settings.token = token.text.toString().trim()
                status.text = "Syncing…"
                lifecycleScope.launch {
                    status.text = when (val r = Uploader.sync(this@MainActivity)) {
                        is UploadResult.Ok -> "Synced. ${r.changedDays} day(s) updated."
                        is UploadResult.Failed -> r.message
                    }
                }
            }
        })

        status = TextView(this).apply { setPadding(0, pad, 0, 0) }
        root.addView(status)
        setContentView(root)

        if (!applySetupLink(intent)) lifecycleScope.launch { showStatus() }
    }

    /** The app was already open when the website's link was tapped. */
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        applySetupLink(intent)
    }

    /** Fill in the server and token from arcbridge://setup?server=…&token=…. True when the link was used. */
    private fun applySetupLink(intent: Intent?): Boolean {
        val link = intent?.data ?: return false
        if (link.scheme != "arcbridge" || link.host != "setup") return false
        val linkServer = link.getQueryParameter("server")?.takeIf { it.startsWith("https://") }
        val linkToken = link.getQueryParameter("token")?.takeIf { it.startsWith("arc_hc_") }
        linkServer?.let { settings.serverUrl = it; server.setText(it) }
        linkToken?.let { settings.token = it; token.setText(it) }
        status.text = if (linkToken != null) "Linked to your Arc. Now tap Save and grant access." else "That link didn't include a token. Create a new one on the website."
        return true
    }

    private suspend fun showStatus() {
        if (HealthConnectClient.getSdkStatus(this) != HealthConnectClient.SDK_AVAILABLE) {
            status.text = "Install or update Health Connect to continue."
            return
        }
        val granted = HealthReader(HealthConnectClient.getOrCreate(this)).grantedTypes()
        status.text = if (granted.isEmpty()) "No access granted yet." else "Reading: ${granted.joinToString(", ")}. Syncs daily."
    }
}
