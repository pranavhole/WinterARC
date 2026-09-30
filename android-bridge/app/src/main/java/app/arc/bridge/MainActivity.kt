package app.arc.bridge

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
 * One screen: paste the ARC server + device token, choose what ARC may read,
 * grant it in Health Connect, sync. Deliberately not a second ARC app.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var status: TextView
    private lateinit var requestPermissions: ActivityResultLauncher<Set<String>>
    private val choices = linkedMapOf<String, CheckBox>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val settings = BridgeSettings(this)

        // Opened from the website's "Open in ARC app" link: take the server and token from it.
        intent?.data?.let { link ->
            if (link.scheme == "arcbridge" && link.host == "setup") {
                link.getQueryParameter("server")?.takeIf { it.startsWith("https://") }?.let { settings.serverUrl = it }
                link.getQueryParameter("token")?.takeIf { it.startsWith("arc_hc_") }?.let { settings.token = it }
            }
        }

        requestPermissions = registerForActivityResult(PermissionController.createRequestPermissionResultContract()) {
            lifecycleScope.launch { showStatus() }
        }

        val pad = (20 * resources.displayMetrics.density).toInt()
        val root = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(pad, pad * 2, pad, pad) }
        fun label(text: String) = TextView(this).apply { this.text = text; setPadding(0, pad, 0, pad / 4) }

        root.addView(TextView(this).apply { text = "ARC"; textSize = 22f; letterSpacing = 0.3f; gravity = Gravity.START })
        root.addView(TextView(this).apply { text = "Sends your daily steps, sleep, exercise and weight from Health Connect to your Arc. Nothing else." })

        root.addView(label("ARC address"))
        val server = EditText(this).apply { hint = "https://your-arc.app"; setText(settings.serverUrl); inputType = InputType.TYPE_TEXT_VARIATION_URI }
        root.addView(server)

        root.addView(label("Device token (ARC → Settings → Health)"))
        val token = EditText(this).apply { hint = "arc_hc_…"; setText(settings.token); inputType = InputType.TYPE_TEXT_VARIATION_PASSWORD or InputType.TYPE_CLASS_TEXT }
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
                settings.serverUrl = server.text.toString()
                settings.token = token.text.toString()
                val wanted = choices.filterValues { it.isChecked }.keys.mapNotNull { HealthReader.PERMISSIONS[it] }.toSet()
                if (wanted.isNotEmpty()) requestPermissions.launch(wanted)
                Uploader.schedule(this@MainActivity)
            }
        })
        root.addView(Button(this).apply {
            text = "Sync now"
            setOnClickListener {
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
        lifecycleScope.launch { showStatus() }
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
