# Pestaña Render del visor · para Claude

Desde el 10-nov-2026 el visor tiene el **Render** (`render.html`; se abre aparte con el botón «Render ↗», junto al Editor; dentro de Claude, en la misma página con `#render`): render fotográfico por trazado de rayos en el navegador (three-gpu-pathtracer, la GPU del Mac o del iPad), del modelo del visor (BIM, impresión) o de un archivo abierto ahí mismo (Rhino `.3dm`, Vectorworks exportado a `.glb/.obj/.fbx/.3ds/.dae`, `.stl`).

## Cómo llega una petición
En «Pedir a Claude», Enrique (o un colaborador) escribe qué cambiar y añade imágenes de referencia. Se crea una conversación del Chat:
- `capturas`: imagen 1 = la vista tal como la veía; `vista` empieza por «Render ·»; `tema` = «Render · …»; **`camara.render`** = el estado completo: `modelo`, `c` (encuadre: `pos` en metros con Y arriba, `yaw`, `f` focal en mm, `shift` descentramiento, `aspect`, `vert`), `luz`, `revelado`, `materiales_cambiados` (lo que tocó en su navegador, aún no publicado), `ocultos`, `capas`, `seleccionado` (el material que tenía elegido), `referencia` (la referencia elegida: Olivier Campagne, Baukunst, Bruther, Arrhov Frick, Leopold Banchini, Christian Kerez, Valerio Olgiati, Rudolf Olgiati, Peter Zumthor).
- Imágenes 2, 3…: las referencias (notas con `imagen`, texto «Referencia · nombre»).
- Una nota con lo escrito. La captura llega con `para_claude = true`, como cualquier otra.

## Qué hacer
1. Leer lo escrito, mirar la imagen 1 y las referencias.
2. Cambiar **`datos/<proyecto>/render/ajustes.json`** (es lo que ven todos; el visor lo vuelve a leer cada 20 s y aplica los cambios solo). Incorporar también los `materiales_cambiados` de la petición si van en la línea de lo pedido (es la forma de «dejarlos para todos»).
3. Render de respuesta con el mismo encuadre: `node herramientas/render.js --captura <id> --publicado --muestras 500 --ancho 2400 --salida /tmp/render.jpg` (sirve el repositorio en local: no hace falta haber publicado; en el Mac va con la GPU). Subirlo a la conversación como imagen nueva (igual que los pantallazos) y contestar en una frase qué se ha cambiado.
4. Publicar `datos/<proyecto>/render/` como el resto del visor.

## ajustes.json
```json
{"estilo": "campagne|baukunst|bruther|arrhovfrick|banchini|kerez|volgiati|rolgiati|zumthor (referencia por defecto)",
 "luz": {"cielo": "nublado|sol|amanecer|atardecer", "sol": 0-360, "intensidad": 1, "exposicion": 1, "niebla": 0-1},
 "revelado": {"contraste": 1.04, "saturacion": 0.92, "grano": 0.25, "temperatura": -1..1},
 "materiales": {"<clave del material>": {
    "tipo": "liso|revoco|hormigon|tablilla|microcemento|madera|teja|pavimento|metal|vidrio|imagen",
    "color": "#rrggbb", "rugosidad": 0-1, "metal": 0-1, "relieve": 0-2, "escala": "metros por repetición de la textura",
    "variacion": 0-0.4, "transmision": 0-1, "ior": 1.5,
    "textura": "solo con tipo imagen: ruta o URL del color", "textura_relieve": "mapa normal", "textura_rugosidad": "mapa de rugosidad (canal G)"}},
 "encuadres": [{"nombre": "Desde la calle", "modelo": "bim_op3", "c": {…como camara.render.c…}}]}
```
- Claves: las de `materiales` del modelo del visor (`revoco`, `ha_zocalo`, `carpinteria`, `vidrio`, `teja`…), más `suelo` (la calle) y `entorno_tejado`. En archivos de Rhino, el nombre del material o, si no tiene, el de la capa.
- `tipo` procedural: las texturas se generan en el navegador (sin descargas). Para algo que pida una foto de referencia concreta (una piedra, un hormigón de encofrado concreto…), bajar una textura CC0 (ambientCG, Poly Haven) a `datos/<proyecto>/render/texturas/` (1K o 2K, JPG, < 2 MB cada mapa), `tipo: "imagen"` y sus rutas relativas a la raíz del visor.
- `escala` en metros: revoco ≈ 1, hormigón ≈ 2, tablilla 2 (16 tablas por repetición = 12,5 cm), teja 2,4.
- Para compartir un encuadre con todos, añadirlo a `encuadres`.

## Referencias de Enrique
Olivier Campagne (sus imágenes de concurso para Baukunst, Bruther y Arrhov Frick) y las fotos de las obras de esos estudios; Leopold Banchini, Christian Kerez, Valerio Olgiati, Rudolf Olgiati y Peter Zumthor: tipo de luz, de material y tonos. En el render son la lista «Referencia» (luz y revelado de partida, en `ESTILOS` de render.html). Las fotos de referencia, privadas, en Dropbox › «Referencias render» › <arquitecto> (no en este repositorio, que es público): mirarlas cuando la petición diga una referencia o pida «como X».

## Notas
- El render del navegador no lee las texturas ni la luz de Vectorworks o Rhino: solo geometría, y el material por nombre o capa.
- Lo que cada uno cambia en su navegador se guarda solo en ese navegador hasta que Claude lo pasa a `ajustes.json`.
