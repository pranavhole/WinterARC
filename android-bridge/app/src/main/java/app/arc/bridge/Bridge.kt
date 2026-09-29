package app.arc.bridge

import android.content.Context
import android.content.SharedPreferences
import androidx.health.connect.client.HealthConnectClient
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.TimeUnit

/** Server URL and device token, stored encrypted on the phone. */
class BridgeSettings(context: Context) {
    private val prefs: SharedPreferences = EncryptedSharedPreferences.create(
        context,
        "arc_bridge",
        MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )

    var serverUrl: String
        get() = prefs.getString("server", "") ?: ""
        set(value) = prefs.edit().putString("server", value.trimEnd('/')).apply()

    var token: String
        get() = prefs.getString("token", "") ?: ""
        set(value) = prefs.edit().putString("token", value.trim()).apply()

    val configured get() = serverUrl.startsWith("https://") || serverUrl.startsWith("http://10.0.2.2")
}

sealed interface UploadResult {
    data class Ok(val changedDays: Int) : UploadResult
    data class Failed(val message: String) : UploadResult
}

object Uploader {
    /** Read the last few days and send them to ARC. Safe to repeat: the server de-duplicates. */
    suspend fun sync(context: Context): UploadResult = withContext(Dispatchers.IO) {
        val settings = BridgeSettings(context)
        if (!settings.configured || settings.token.isEmpty()) return@withContext UploadResult.Failed("Set the server and token first.")
        if (HealthConnectClient.getSdkStatus(context) != HealthConnectClient.SDK_AVAILABLE) {
            return@withContext UploadResult.Failed("Health Connect isn't available on this phone.")
        }
        val reader = HealthReader(HealthConnectClient.getOrCreate(context))
        val payload = reader.buildPayload()
        if (payload.getJSONArray("permissions").length() == 0) return@withContext UploadResult.Failed("No Health Connect permissions granted.")

        val connection = (URL("${settings.serverUrl}/api/health/ingest").openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 15_000
            readTimeout = 30_000
            doOutput = true
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("Authorization", "Bearer ${settings.token}")
        }
        try {
            connection.outputStream.use { it.write(payload.toString().toByteArray()) }
            when (val code = connection.responseCode) {
                200 -> {
                    val body = connection.inputStream.bufferedReader().readText()
                    UploadResult.Ok(Regex("\"changedDays\":(\\d+)").find(body)?.groupValues?.get(1)?.toInt() ?: 0)
                }
                401 -> UploadResult.Failed("ARC didn't accept this token. Create a new one in ARC Settings.")
                429 -> UploadResult.Failed("Synced too often. Try again later.")
                else -> UploadResult.Failed("ARC returned $code.")
            }
        } catch (e: Exception) {
            UploadResult.Failed("Couldn't reach ARC.")
        } finally {
            connection.disconnect()
        }
    }

    /** Daily background sync, only on a network connection. */
    fun schedule(context: Context) {
        val request = PeriodicWorkRequestBuilder<SyncWorker>(24, TimeUnit.HOURS)
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .build()
        WorkManager.getInstance(context).enqueueUniquePeriodicWork("arc-health-sync", ExistingPeriodicWorkPolicy.UPDATE, request)
    }
}

class SyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result = when (Uploader.sync(applicationContext)) {
        is UploadResult.Ok -> Result.success()
        is UploadResult.Failed -> Result.retry()
    }
}
