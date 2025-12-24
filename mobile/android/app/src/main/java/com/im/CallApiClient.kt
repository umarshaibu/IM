package com.im

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

/**
 * Native HTTP client for making call-related API requests.
 * This allows answering/declining calls before React Native is fully loaded.
 */
object CallApiClient {
    private const val TAG = "CallApiClient"
    private const val PREFS_NAME = "im_call_prefs"
    private const val KEY_ACCESS_TOKEN = "access_token"
    private const val KEY_API_URL = "api_url"

    private val executor = Executors.newSingleThreadExecutor()

    /**
     * Data class for join call response
     */
    data class JoinCallResult(
        val success: Boolean,
        val roomToken: String? = null,
        val roomId: String? = null,
        val liveKitUrl: String? = null,
        val error: String? = null
    )

    /**
     * Save auth token and API URL to SharedPreferences for native access
     */
    fun saveCredentials(context: Context, accessToken: String, apiUrl: String) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit()
            .putString(KEY_ACCESS_TOKEN, accessToken)
            .putString(KEY_API_URL, apiUrl)
            .apply()
        Log.d(TAG, "Credentials saved to SharedPreferences")
    }

    /**
     * Clear credentials on logout
     */
    fun clearCredentials(context: Context) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().clear().apply()
        Log.d(TAG, "Credentials cleared from SharedPreferences")
    }

    /**
     * Get the saved access token
     */
    fun getAccessToken(context: Context): String? {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getString(KEY_ACCESS_TOKEN, null)
    }

    /**
     * Get the saved API URL
     */
    fun getApiUrl(context: Context): String? {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getString(KEY_API_URL, null)
    }

    /**
     * Join a call via HTTP API
     * This is called from native code when user accepts a call
     */
    fun joinCall(
        context: Context,
        callId: String,
        callback: (JoinCallResult) -> Unit
    ) {
        executor.execute {
            try {
                val accessToken = getAccessToken(context)
                val apiUrl = getApiUrl(context)

                if (accessToken == null || apiUrl == null) {
                    Log.e(TAG, "Missing credentials: token=$accessToken, url=$apiUrl")
                    callback(JoinCallResult(false, error = "Missing credentials"))
                    return@execute
                }

                val url = URL("$apiUrl/api/calls/$callId/join")
                Log.d(TAG, "Joining call via API: $url")

                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "POST"
                connection.setRequestProperty("Authorization", "Bearer $accessToken")
                connection.setRequestProperty("Content-Type", "application/json")
                connection.connectTimeout = 10000
                connection.readTimeout = 10000
                connection.doOutput = true

                // Send empty body for POST
                val writer = OutputStreamWriter(connection.outputStream)
                writer.write("{}")
                writer.flush()
                writer.close()

                val responseCode = connection.responseCode
                Log.d(TAG, "Join call response code: $responseCode")

                if (responseCode == HttpURLConnection.HTTP_OK) {
                    val reader = BufferedReader(InputStreamReader(connection.inputStream))
                    val response = reader.readText()
                    reader.close()

                    val json = JSONObject(response)
                    val result = JoinCallResult(
                        success = true,
                        roomToken = json.optString("roomToken"),
                        roomId = json.optString("roomId"),
                        liveKitUrl = json.optString("liveKitUrl")
                    )
                    Log.d(TAG, "Join call success: roomId=${result.roomId}")
                    callback(result)
                } else {
                    val errorReader = BufferedReader(InputStreamReader(connection.errorStream ?: connection.inputStream))
                    val errorResponse = errorReader.readText()
                    errorReader.close()
                    Log.e(TAG, "Join call failed: $responseCode - $errorResponse")
                    callback(JoinCallResult(false, error = "HTTP $responseCode: $errorResponse"))
                }

                connection.disconnect()
            } catch (e: Exception) {
                Log.e(TAG, "Error joining call: ${e.message}", e)
                callback(JoinCallResult(false, error = e.message))
            }
        }
    }

    /**
     * Decline a call via HTTP API
     * This is called from native code when user declines a call
     */
    fun declineCall(
        context: Context,
        callId: String,
        callback: ((Boolean, String?) -> Unit)? = null
    ) {
        executor.execute {
            try {
                val accessToken = getAccessToken(context)
                val apiUrl = getApiUrl(context)

                if (accessToken == null || apiUrl == null) {
                    Log.e(TAG, "Missing credentials for decline")
                    callback?.invoke(false, "Missing credentials")
                    return@execute
                }

                val url = URL("$apiUrl/api/calls/$callId/decline")
                Log.d(TAG, "Declining call via API: $url")

                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "POST"
                connection.setRequestProperty("Authorization", "Bearer $accessToken")
                connection.setRequestProperty("Content-Type", "application/json")
                connection.connectTimeout = 10000
                connection.readTimeout = 10000
                connection.doOutput = true

                // Send empty body for POST
                val writer = OutputStreamWriter(connection.outputStream)
                writer.write("{}")
                writer.flush()
                writer.close()

                val responseCode = connection.responseCode
                Log.d(TAG, "Decline call response code: $responseCode")

                val success = responseCode == HttpURLConnection.HTTP_OK
                callback?.invoke(success, if (success) null else "HTTP $responseCode")

                connection.disconnect()
            } catch (e: Exception) {
                Log.e(TAG, "Error declining call: ${e.message}", e)
                callback?.invoke(false, e.message)
            }
        }
    }
}
