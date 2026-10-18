package com.quizvideostudio.app;

import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.util.Base64;
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

    private void finish(String id, String err) {
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
        Runnable job = () -> {
            if (!ready || tts == null) {
                call.reject("El teléfono no tiene un motor de voz disponible");
                return;
            }
            tts.setLanguage(Locale.forLanguageTag(lang));
            tts.setSpeechRate(rate);
            tts.setPitch(1.0f);
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

    @Override
    protected void handleOnDestroy() {
        if (tts != null) {
            tts.stop();
            tts.shutdown();
            tts = null;
        }
    }
}
