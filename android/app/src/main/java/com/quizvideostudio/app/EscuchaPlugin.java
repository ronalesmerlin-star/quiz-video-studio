package com.quizvideostudio.app;

import android.Manifest;
import android.content.Intent;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;

/**
 * Escucha lo que la persona dice en inglés (reconocimiento de voz del teléfono) para el modo shadowing:
 * así la app puede decir qué palabras pronunció bien.
 */
@CapacitorPlugin(name = "Escucha", permissions = { @Permission(strings = { Manifest.permission.RECORD_AUDIO }, alias = "mic") })
public class EscuchaPlugin extends Plugin {

    private SpeechRecognizer sr;
    private PluginCall current;

    @PluginMethod
    public void available(PluginCall call) {
        JSObject r = new JSObject();
        boolean ok = false;
        try { ok = SpeechRecognizer.isRecognitionAvailable(getContext()); } catch (Exception e) { ok = false; }
        r.put("ok", ok);
        call.resolve(r);
    }

    @PluginMethod
    public void listen(PluginCall call) {
        if (getPermissionState("mic") != PermissionState.GRANTED) {
            requestPermissionForAlias("mic", call, "micCallback");
            return;
        }
        start(call);
    }

    @PermissionCallback
    private void micCallback(PluginCall call) {
        if (getPermissionState("mic") == PermissionState.GRANTED) start(call);
        else call.reject("Sin permiso para usar el micrófono", "permiso");
    }

    private void done(PluginCall call, JSArray results, String err, String code) {
        if (current != call) return;
        current = null;
        if (err != null) call.reject(err, code);
        else {
            JSObject r = new JSObject();
            r.put("results", results);
            call.resolve(r);
        }
        getActivity().runOnUiThread(() -> {
            if (sr != null) { try { sr.destroy(); } catch (Exception e) { } sr = null; }
        });
    }

    private void start(final PluginCall call) {
        final String lang = call.getString("lang", "en-US");
        getActivity().runOnUiThread(() -> {
            try {
                if (sr != null) { try { sr.destroy(); } catch (Exception e) { } }
                if (current != null) { PluginCall old = current; current = null; old.reject("cancelado", "cancel"); }
                current = call;
                sr = SpeechRecognizer.createSpeechRecognizer(getContext());
                sr.setRecognitionListener(new RecognitionListener() {
                    @Override public void onReadyForSpeech(Bundle params) { notifyListeners("escuchaListo", new JSObject()); }
                    @Override public void onBeginningOfSpeech() { }
                    @Override public void onRmsChanged(float rmsdB) { }
                    @Override public void onBufferReceived(byte[] buffer) { }
                    @Override public void onEndOfSpeech() { }
                    @Override public void onError(int error) { done(call, null, "error " + error, String.valueOf(error)); }
                    @Override public void onResults(Bundle results) {
                        ArrayList<String> m = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                        JSArray a = new JSArray();
                        if (m != null) for (String s : m) a.put(s);
                        done(call, a, null, null);
                    }
                    @Override public void onPartialResults(Bundle partialResults) { }
                    @Override public void onEvent(int eventType, Bundle params) { }
                });
                Intent it = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                it.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                it.putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang);
                it.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 5);
                it.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false);
                sr.startListening(it);
            } catch (Exception e) {
                done(call, null, "No se pudo escuchar: " + e.getMessage(), "fallo");
            }
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (sr != null) { try { sr.stopListening(); } catch (Exception e) { } }
            call.resolve();
        });
    }
}
