package com.skidmarks.app.run

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import java.util.Locale

/*
 * The coach voice. TextToSpeech with the "navigation guidance" audio use,
 * so the voice plays in Bluetooth headphones and other audio gets quieter
 * (ducking) while it speaks.
 * When the watch has no text-to-speech engine, `available` stays false and
 * onReady(false) is called. The run service then uses vibration.
 */
class Voice(context: Context, private val onReady: (Boolean) -> Unit) : TextToSpeech.OnInitListener {
    private val app = context.applicationContext
    private val audio = app.getSystemService(AudioManager::class.java)
    private val attrs = AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE)
        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
        .build()
    private val focus = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
        .setAudioAttributes(attrs)
        .setOnAudioFocusChangeListener { }
        .build()
    private var tts: TextToSpeech? = null
    private val pending = ArrayList<Pair<String, Float>>()
    private var counter = 0

    @Volatile var available = false
        private set

    @Volatile var failed = false
        private set

    init {
        tts = try {
            TextToSpeech(app, this)
        } catch (e: Exception) {
            null
        }
        if (tts == null) fail()
    }

    private fun fail() {
        failed = true
        available = false
        pending.clear()
        onReady(false)
    }

    override fun onInit(status: Int) {
        val t = tts
        if (status != TextToSpeech.SUCCESS || t == null || t.engines.isNullOrEmpty()) {
            fail()
            return
        }
        t.setAudioAttributes(attrs)
        var lang = t.setLanguage(Locale.UK)
        if (lang < TextToSpeech.LANG_AVAILABLE) lang = t.setLanguage(Locale.getDefault())
        if (lang < TextToSpeech.LANG_AVAILABLE) {
            fail()
            return
        }
        t.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(utteranceId: String?) {}
            override fun onDone(utteranceId: String?) = release()
            @Deprecated("Deprecated in Java")
            override fun onError(utteranceId: String?) = release()
        })
        available = true
        onReady(true)
        val queued = pending.toList()
        pending.clear()
        for ((text, rate) in queued) speak(text, rate)
    }

    private fun release() {
        val t = tts ?: return
        if (!t.isSpeaking) audio?.abandonAudioFocusRequest(focus)
    }

    fun speak(text: String, rate: Float = 1f) {
        val t = tts
        if (!available || t == null) {
            if (!failed) pending.add(text to rate)
            return
        }
        audio?.requestAudioFocus(focus)
        t.setSpeechRate(rate)
        t.speak(text, TextToSpeech.QUEUE_ADD, Bundle(), "cue-${counter++}")
    }

    fun stop() {
        tts?.stop()
        audio?.abandonAudioFocusRequest(focus)
    }

    fun shutdown() {
        stop()
        tts?.shutdown()
        tts = null
        available = false
    }
}
