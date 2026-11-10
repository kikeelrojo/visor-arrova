# Pestaña Render del visor · para Claude

Desde el 10-nov-2026 el visor tiene el **Render** (`render.html`; se abre aparte con el botón «Render ↗», junto al Editor; dentro de Claude, en la misma página con `#render`): render fotográfico por trazado de rayos en el navegador (three-gpu-pathtracer, la GPU del Mac o del iPad), del modelo del visor (BIM, impresión) o de un archivo abierto ahí mismo (Rhino `.3dm`, Vectorworks exportado a `.glb/.obj/.fbx/.3ds/.dae`, `.stl`).

## Cómo llega una petición
En «Pedir a Claude», Enrique (o un colaborador) escribe qué cambiar y añade imágenes de referencia. Se crea una conversación del Chat:
- `capturas`: imagen 1 = la vista tal como la veía; `vista` empieza por «Render ·»; `tema` = «Render · …»; **`camara.render`** = el estado completo: `modelo`, `c` (encuadre: `pos` en metros con Y arriba, `yaw`, `f` focal en mm, `shift` descentramiento, `aspect`, `vert`), `luz`, `revelado`, `materiales_cambiados` (lo que tocó en su navegador, aún no publicado), `ocultos`, `capas`, `seleccionado` (el material que tenía elegido), `referencia` (la referencia elegida: Olivier Campagne, Baukunst, Bruther, Arrhov Frick, Leopold Banchini, Christian Kerez, Valerio Olgiati, Rudolf Olgiati, Peter Zumthor, SANAA, Kazuo Shinohara, Junya Ishigami), `anadir`, `marcas`, `lugar` (ver abajo).
- Imágenes 2, 3…: las referencias (notas con `imagen`, texto «Referencia · nombre»).
- Una nota con lo escrito. La captura llega con `para_claude = true`, como cualquier otra.

## Qué hacer
1. Leer lo escrito, mirar la imagen 1 y las referencias.
2. Cambiar los **ajustes de todos**: tabla de Supabase `render_ajustes`, fila `proyecto = <proyecto>`, `clave = 'ajustes'`, columna `datos` (el JSON de abajo). Leer la fila, cambiar lo pedido y escribir el JSON entero: `PATCH /rest/v1/render_ajustes?proyecto=eq.lodosa&clave=eq.ajustes` con `{"datos": {...}, "autor": "Claude"}` (clave pública del visor). El render la relee cada 5 s: se ve al momento, sin publicar. Cada cambio guarda la versión anterior en `render_historial` (para deshacer: volver a escribir esa `datos`). Si no hay fila, vale `datos/<proyecto>/render/ajustes.json` (y se crea la fila con POST). Incorporar también los `materiales_cambiados` de la petición si van en la línea de lo pedido.
3. Render de respuesta con el mismo encuadre: `node herramientas/render.js --captura <id> --publicado --muestras 500 --ancho 2400 --salida /tmp/render.jpg` (sirve el repositorio en local: no hace falta haber publicado; en el Mac va con la GPU). Subirlo a la conversación como imagen nueva (igual que los pantallazos) y contestar en una frase qué se ha cambiado.
4. Solo si se han añadido archivos (texturas, objetos, fotos de fondo): publicar `datos/<proyecto>/render/` como el resto del visor (los ajustes no hace falta: están en Supabase). Las fotos de fondo del proyecto pueden ir también al almacén público «capturas» de Supabase.

## ajustes.json
```json
{"estilo": "campagne|baukunst|bruther|arrhovfrick|banchini|kerez|volgiati|rolgiati|zumthor|sanaa|shinohara|ishigami (referencia por defecto)",
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

## Añadir vegetación, muebles, personas y fondo
La petición trae `anadir` (vegetacion, muebles, personas, fondo), `marcas` (`n`, `pos` en metros de la escena, Y arriba, `normal`, `sobre` = material tocado; salen numeradas en la imagen 1) y `lugar` (dirección o coordenadas, si pidió fondo). Si subió una foto de fondo, va como imagen «foto de fondo».
- **Objetos** (`objetos` en los ajustes): `{"id", "nombre", "archivo", "pos": [x, y, z], "giro": grados, "alto": m, "escala", "tipo": "modelo|recorte", "mira": "camara", "modelo": id}`. `modelo` = archivo `.glb/.gltf/.obj` escaneado con sus materiales y texturas; `recorte` = PNG con transparencia (persona, árbol) de pie en `pos`, con `alto`, y `mira: "camara"` para ponerlo de frente al encuadre. Sin `modelo`, valen para los modelos del visor.
- **De dónde**: CC0 escaneados de Poly Haven (polyhaven.com: plantas, muebles; glTF 1K–2K), ambientCG; personas escaneadas o recortes de licencia libre (p. ej. xoio-air, comprobando su licencia). Se descargan desde el Mac y van a `lib/render/biblioteca/<vegetacion|muebles|personas>/` (si son CC0 y sirven para otros proyectos) o a `datos/<proyecto>/render/objetos/`. Nada con derechos de terceros en el repositorio (es público).
- **Escala y sitio**: un árbol de calle 6–10 m, arbusto 1–2 m, persona 1,65–1,85 m; apoyado en `pos` de la marca (y = la del suelo tocado). Un objeto no debe atravesar muros: comprobar con el modelo.
- **Fondo** (`fondo` en los ajustes): `{"imagen": "ruta o URL", "suelo": false}`: la foto va detrás, el cielo elegido sigue iluminando; `suelo: true` deja el suelo del modelo delante (cuando la foto no lo trae). La foto tiene que estar hecha desde un punto parecido al encuadre (horizonte a la altura del ojo); si no hay foto del lugar, decirlo y no inventar el entorno (Enrique no quiere edificios inventados).

## Referencias (Dropbox › «Referencias render»)
- `Arquitectos/<nombre>`: fotos e imágenes de las referencias de la lista «Referencia» (Olivier Campagne, Arrhov Frick, Baukunst, Bruther, Leopold Banchini, Christian Kerez, Valerio Olgiati, Rudolf Olgiati, Peter Zumthor, SANAA, Kazuo Shinohara, Junya Ishigami).
- `Proyectos/<proyecto>`: lo propio de cada encargo (materiales, el lugar, fotos del solar, la vegetación de allí); manda sobre lo general. Subcarpetas «fondo», «vegetación», «materiales», «muebles» si las hay.
- Orden: carpeta del proyecto → carpeta de la referencia elegida (`referencia` en la petición) → imágenes de la petición. Son privadas: nunca al repositorio.

## Notas
- El render del navegador no lee las texturas ni la luz de Vectorworks o Rhino: solo geometría, y el material por nombre o capa.
- Lo que cada uno cambia en su navegador se guarda solo en ese navegador hasta que pulsa «Dejar mis cambios para todos» o Claude lo pasa a los ajustes.
- Que parezca una foto: luz y exposición de fotógrafo (lo hace el render), materiales y objetos escaneados de verdad (texturas fotográficas, nada procedural cuando el material importa), un fondo real del lugar y, al final, si hace falta, un paso de IA sobre el render (p. ej. Visoid, que ya usa Enrique) con el «Mapa de materiales» para que no cambie la arquitectura.
