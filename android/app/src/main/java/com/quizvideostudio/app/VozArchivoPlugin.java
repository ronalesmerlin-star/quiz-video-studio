package com.quizvideostudio.app;

import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;
import android.util.Base64;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Convierte texto en voz y la guarda como archivo de audio, para poder ponerla dentro del video MP4.
 * Usa el motor de voz del teléfono: es gratis y funciona sin internet.
 */
@CapacitorPlugin(name = "VozArchivo")
public class VozArchivoPlugin extends Plugin {

    private TextToSpeech tts;
    private boolean initDone = false;
    private boolean ready = false;
    private final List<Runnable> pending = new ArrayList<>();
    private final Map<String, PluginCall> calls = new HashMap<>();

    @Override
    public void load() {
        tts = new TextToSpeech(getContext(), status -> {
            List<Runnable> jobs;
            synchronized (pending) {
                initDone = true;
                ready = status == TextToSpeech.SUCCESS;
                jobs = new ArrayList<>(pending);
                pending.clear();
            }
            for (Runnable r : jobs) r.run();
        });
        tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
            @Override
            public void onStart(String id) {}

            @Override
            public void onDone(String id) {
                finish(id, null);
            }

            @Override
            public void onError(String id) {
                finish(id, "error");
            }

            @Override
            public void onError(String id, int code) {
                finish(id, "error " + code);
            }
        });
    }

    private final Map<String, PluginCall> says = new HashMap<>();

    private void finish(String id, String err) {
        if (id != null && id.startsWith("say")) {
            PluginCall sc;
            synchronized (says) {
                sc = says.remove(id);
            }
            if (sc != null) sc.resolve();
            return;
        }
        PluginCall call;
        synchronized (calls) {
            call = calls.remove(id);
        }
        if (call == null) return;
        File f = new File(getContext().getCacheDir(), id + ".wav");
        try {
            if (err != null) {
                call.reject(err);
                return;
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            try (FileInputStream in = new FileInputStream(f)) {
                byte[] buf = new byte[16384];
                int n;
                while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            }
            JSObject r = new JSObject();
            r.put("data", Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP));
            call.resolve(r);
        } catch (Exception e) {
            call.reject("No se pudo leer el audio: " + e.getMessage());
        } finally {
            f.delete();
        }
    }

    @PluginMethod
    public void synth(PluginCall call) {
        final String text = call.getString("text", "");
        final String lang = call.getString("lang", "es-ES");
        final Float rateObj = call.getFloat("rate", 1.0f);
        final float rate = rateObj == null ? 1.0f : rateObj;
        final String voiceName = call.getString("voiceName", "");
        final Float pitchObj = call.getFloat("pitch", 1.0f);
        final float pitch = pitchObj == null ? 1.0f : pitchObj;
        Runnable job = () -> {
            if (!ready || tts == null) {
                call.reject("El teléfono no tiene un motor de voz disponible");
                return;
            }
            useVoice(lang, voiceName);
            tts.setSpeechRate(rate);
            tts.setPitch(pitch);
            String id = "voz" + System.nanoTime();
            File f = new File(getContext().getCacheDir(), id + ".wav");
            synchronized (calls) {
                calls.put(id, call);
            }
            Bundle params = new Bundle();
            params.putString(TextToSpeech.Engine.KEY_PARAM_UTTERANCE_ID, id);
            int res = tts.synthesizeToFile(text, params, f, id);
            if (res != TextToSpeech.SUCCESS) {
                synchronized (calls) {
                    calls.remove(id);
                }
                call.reject("No se pudo crear la voz");
            }
        };
        boolean now;
        synchronized (pending) {
            now = initDone;
            if (!now) pending.add(job);
        }
        if (now) job.run();
    }

    private void whenReady(Runnable job) {
        boolean now;
        synchronized (pending) {
            now = initDone;
            if (!now) pending.add(job);
        }
        if (now) job.run();
    }

    private void useVoice(String lang, String voiceName) {
        tts.setLanguage(Locale.forLanguageTag(lang));
        if (voiceName == null || voiceName.isEmpty()) return;
        try {
            Set<Voice> all = tts.getVoices();
            if (all != null) for (Voice v : all) if (voiceName.equals(v.getName())) { tts.setVoice(v); break; }
        } catch (Exception e) { /* se usa la voz del idioma */ }
    }

    /** Lista las voces instaladas con su calidad, para elegir la que suena más natural. */
    @PluginMethod
    public void voices(PluginCall call) {
        whenReady(() -> {
            JSArray arr = new JSArray();
            try {
                Set<Voice> all = (ready && tts != null) ? tts.getVoices() : null;
                if (all != null) for (Voice v : all) {
                    JSObject o = new JSObject();
                    o.put("name", v.getName());
                    o.put("lang", v.getLocale().toLanguageTag());
                    o.put("quality", v.getQuality());
                    o.put("network", v.isNetworkConnectionRequired());
                    Set<String> f = v.getFeatures();
                    o.put("notInstalled", f != null && f.contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED));
                    arr.put(o);
                }
            } catch (Exception e) { /* lista vacía */ }
            JSObject r = new JSObject();
            r.put("voices", arr);
            call.resolve(r);
        });
    }

    /** Habla en voz alta con la voz elegida; termina cuando acaba de hablar. */
    @PluginMethod
    public void say(PluginCall call) {
        final String text = call.getString("text", "");
        final String lang = call.getString("lang", "es-ES");
        final Float rateObj = call.getFloat("rate", 1.0f);
        final Float pitchObj = call.getFloat("pitch", 1.0f);
        final String voiceName = call.getString("voiceName", "");
        whenReady(() -> {
            if (!ready || tts == null) { call.reject("El teléfono no tiene un motor de voz disponible"); return; }
            useVoice(lang, voiceName);
            tts.setSpeechRate(rateObj == null ? 1.0f : rateObj);
            tts.setPitch(pitchObj == null ? 1.0f : pitchObj);
            String id = "say" + System.nanoTime();
            synchronized (says) { says.put(id, call); }
            Bundle params = new Bundle();
            params.putString(TextToSpeech.Engine.KEY_PARAM_UTTERANCE_ID, id);
            if (tts.speak(text, TextToSpeech.QUEUE_FLUSH, params, id) != TextToSpeech.SUCCESS) {
                synchronized (says) { says.remove(id); }
                call.reject("No se pudo hablar");
            }
        });
    }

    /** Calla la voz que está hablando. */
    @PluginMethod
    public void hush(PluginCall call) {
        java.util.List<PluginCall> open;
        synchronized (says) { open = new ArrayList<>(says.values()); says.clear(); }
        if (tts != null && !open.isEmpty()) tts.stop();
        for (PluginCall c : open) c.resolve();
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        if (tts != null) {
            tts.stop();
            tts.shutdown();
            tts = null;
        }
    }
}
