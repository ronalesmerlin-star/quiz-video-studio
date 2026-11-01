# Convierte la página web de Quiz Video Studio en src/index.html para la app Android.
# Uso: python3 scripts/desde-web.py ruta/a/quiz-video-studio.html
import sys, re
s = open(sys.argv[1], encoding='utf-8').read()
def rep(a, b):
    global s
    assert s.count(a) == 1, a[:60]
    s = s.replace(a, b)
rep('<meta name="claude:viewport-fit-sides" content="cover">\n', '')
i = s.index('<link rel="preconnect"'); j = s.index('<style>')
s = s[:i] + '<link rel="stylesheet" href="fonts.css">\n<script src="mp4-muxer.js"></script>\n<script src="native.js"></script>\n' + s[j:]
rep("async function save(blob,name,out){", "async function save(blob,name,out){if(window.NativeApp?.isNative){try{const w=await NativeApp.saveFile(blob,name);out(w?'Guardado en '+w+'. Elige también dónde compartirlo.':'Listo: elige dónde guardarlo o compartirlo.')}catch(e){out('No se pudo guardar el archivo en el teléfono.')}return}")
rep("msg('Este navegador no puede exportar video. Usa Chrome o Edge en computadora.')", "msg('Este dispositivo no puede exportar video. Actualiza «Android System WebView» y Chrome desde Google Play e inténtalo de nuevo.')")
k = s.index('</style>') + len('</style>')
head, body = s[:k], s[k:]
reset = '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif;-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none}input,textarea{-webkit-user-select:text;user-select:text}img{max-width:100%}[hidden]{display:none!important}</style>\n'
out = '<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<meta name="theme-color" content="#0A8CFF">\n' + reset + head + '\n</head>\n<body>' + body + '\n</body>\n</html>\n'
open('src/index.html', 'w', encoding='utf-8').write(out)
print('src/index.html listo')
