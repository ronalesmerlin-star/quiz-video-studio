package com.quizvideostudio.app;

import android.app.Activity;
import android.view.WindowManager;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Protege el contenido de la app: mientras está activo, Android no deja hacer
 * capturas ni grabar la pantalla (se ve en negro).
 */
@CapacitorPlugin(name = "Proteccion")
public class ProteccionPlugin extends Plugin {

    @PluginMethod
    public void set(PluginCall call) {
        final Boolean onObj = call.getBoolean("on", false);
        final boolean on = onObj != null && onObj;
        final Activity act = getActivity();
        if (act == null) {
            call.resolve();
            return;
        }
        act.runOnUiThread(() -> {
            if (on) act.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
            else act.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
            call.resolve();
        });
    }
}
