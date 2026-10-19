package com.quizvideostudio.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Pieza propia de la app: guarda la voz del narrador para ponerla dentro del video
        registerPlugin(VozArchivoPlugin.class);
        // Protege los textos de la app contra capturas y grabación de pantalla
        registerPlugin(ProteccionPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
