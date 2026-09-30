package app.arc.bridge

import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.HealthConnectFeatures
import androidx.health.connect.client.feature.ExperimentalFeatureAvailabilityApi
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.Record
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.WeightRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import kotlin.reflect.KClass

/**
 * Reads raw Health Connect records for the last few local days and shapes them
 * into the payload POST /api/health/ingest expects. Records keep their Health
 * Connect ids, so the ARC server de-duplicates them; re-sending is harmless.
 */
class HealthReader(private val client: HealthConnectClient) {

    companion object {
        val PERMISSIONS: Map<String, String> = mapOf(
            "steps" to HealthPermission.getReadPermission(StepsRecord::class),
            "sleep" to HealthPermission.getReadPermission(SleepSessionRecord::class),
            "exercise" to HealthPermission.getReadPermission(ExerciseSessionRecord::class),
            "weight" to HealthPermission.getReadPermission(WeightRecord::class),
        )
        private val ISO: DateTimeFormatter = DateTimeFormatter.ISO_INSTANT
        private val AWAKE = setOf(SleepSessionRecord.STAGE_TYPE_AWAKE, SleepSessionRecord.STAGE_TYPE_OUT_OF_BED)
    }

    /**
     * Android 14+ only lets an app read Health Connect from the background
     * (our scheduled sync) with this extra permission. Null when the phone
     * doesn't support it; older versions allow background reads anyway.
     */
    @OptIn(ExperimentalFeatureAvailabilityApi::class)
    fun backgroundPermission(): String? =
        if (client.features.getFeatureStatus(HealthConnectFeatures.FEATURE_READ_HEALTH_DATA_IN_BACKGROUND) ==
            HealthConnectFeatures.FEATURE_STATUS_AVAILABLE
        ) HealthPermission.PERMISSION_READ_HEALTH_DATA_IN_BACKGROUND else null

    /** True when background sync can read Health Connect. */
    suspend fun canReadInBackground(): Boolean {
        val needed = backgroundPermission() ?: return true
        return needed in client.permissionController.getGrantedPermissions()
    }

    /** ARC data types the user has granted. */
    suspend fun grantedTypes(): List<String> {
        val granted = client.permissionController.getGrantedPermissions()
        return PERMISSIONS.filterValues { it in granted }.keys.toList()
    }

    suspend fun buildPayload(days: Int = 3, zone: ZoneId = ZoneId.systemDefault()): JSONObject {
        val types = grantedTypes()
        val today = LocalDate.now(zone)
        val out = JSONArray()
        for (i in 0 until days) {
            val date = today.minusDays(i.toLong())
            val start = date.atStartOfDay(zone).toInstant()
            val end = date.plusDays(1).atStartOfDay(zone).toInstant()
            val day = JSONObject().put("date", date.toString())

            if ("steps" in types) {
                day.put("steps", JSONArray(readAll(StepsRecord::class, start, end).map {
                    JSONObject().put("id", it.metadata.id).put("start", iso(it.startTime)).put("end", iso(it.endTime)).put("count", it.count)
                }))
            }
            if ("sleep" in types) {
                // A night belongs to the day you wake up.
                day.put("sleep", JSONArray(readAll(SleepSessionRecord::class, start.minusSeconds(18 * 3600), end)
                    .filter { !it.endTime.isBefore(start) && it.endTime.isBefore(end) }
                    .map {
                        val asleep = if (it.stages.isEmpty()) null
                        else it.stages.filter { s -> s.stage !in AWAKE }.sumOf { s -> (s.endTime.epochSecond - s.startTime.epochSecond) / 60 }
                        JSONObject().put("id", it.metadata.id).put("start", iso(it.startTime)).put("end", iso(it.endTime))
                            .apply { if (asleep != null) put("minutesAsleep", asleep) }
                    }))
            }
            if ("exercise" in types) {
                day.put("exercise", JSONArray(readAll(ExerciseSessionRecord::class, start, end).map {
                    JSONObject().put("id", it.metadata.id).put("start", iso(it.startTime)).put("end", iso(it.endTime))
                        .put("minutes", (it.endTime.epochSecond - it.startTime.epochSecond) / 60)
                        .put("type", it.exerciseType.toString())
                }))
            }
            if ("weight" in types) {
                day.put("weight", JSONArray(readAll(WeightRecord::class, start, end).map {
                    JSONObject().put("id", it.metadata.id).put("time", iso(it.time)).put("kg", it.weight.inKilograms)
                }))
            }
            out.put(day)
        }
        return JSONObject()
            .put("timeZone", zone.id)
            .put("permissions", JSONArray(types))
            .put("days", out)
    }

    private suspend fun <T : Record> readAll(type: KClass<T>, start: Instant, end: Instant): List<T> {
        val records = mutableListOf<T>()
        var pageToken: String? = null
        do {
            val response = client.readRecords(
                ReadRecordsRequest(type, TimeRangeFilter.between(start, end), pageToken = pageToken),
            )
            records += response.records
            pageToken = response.pageToken
        } while (pageToken != null)
        return records
    }

    private fun iso(instant: Instant) = ISO.format(instant)
}
