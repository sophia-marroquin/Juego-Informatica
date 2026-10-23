# SILENT ASYLUM: NIGHTMARE CORRIDOR

Videojuego de terror indie en 3D (HTML + CSS + JavaScript + Three.js, sin frameworks).
Un asilo abandonado con ocho salas temáticas, una criatura que te persigue, cinco reliquias
que buscar y una puerta sellada. Todo el arte y el sonido se generan por código.

---

## Cómo jugar (local)

1. Haz doble clic en **`JUGAR_AQUI.bat`**.
   - Inicia un servidor local en `http://localhost:8000/`.
   - Abre el juego automáticamente en tu navegador.
2. También puedes abrir **`index.html`** directamente con doble clic (funciona sin servidor).
3. Pulsa **INICIAR JUEGO**.

> Si el puerto 8000 está ocupado, el script usa automáticamente el 8080.
> Si el navegador no permite capturar el ratón (Pointer Lock), mantén pulsado el botón izquierdo y arrastra para mirar.

---

## Controles

| Tecla | Acción |
|-------|--------|
| `W A S D` / flechas | Moverse |
| Ratón | Mirar |
| `Shift` | Correr (gasta resistencia y hace ruido) |
| `F` | Encender / apagar la linterna |
| `E` | Recoger objetos, leer notas / abrir la puerta |
| `M` | Abrir el plano (solo tras recogerlo en el Archivo) |
| `Esc` | Liberar el ratón / cerrar notas y plano |

---

## Mecánicas

- **Linterna con batería limitada:** ilumina las salas, pero se agota (~90 s de uso continuo). Recoge baterías repartidas por el mapa. Con poca carga la luz parpadea.
- **Resistencia (stamina):** correr agota la barra verde; al quedarse sin ella vuelves a caminar.
- **Sigilo:** correr y llevar la linterna encendida aumentan el radio de detección del monstruo.
- **Notas de Elena:** las 7 páginas del diario de la enfermera están clavadas por todo el asilo. Contienen todas las pistas: el plano, dónde escondió cada reliquia y cómo funciona la salida. Al leerlas se revela la reliquia correspondiente en el plano.
- **Reliquias escondidas:** no están a la vista. Hay que buscarlas detrás del altar, entre las calderas, detrás de muebles y en huecos oscuros, siguiendo las páginas de Elena.
- **Silbidos de la entidad:** la criatura silba. Cuanto más cerca está, más fuerte y nítido suena el silbido; cuanto más lejos, más tenue, apagado y con eco. El paneo estéreo indica si está a tu izquierda o a tu derecha.
- **Plano del asilo:** está sobre el escritorio del Archivo. Al recogerlo se activa `M` y muestra el plano completo, la SALIDA y los objetivos descubiertos.
- **Recolección:** apunta al objeto (la mira se agranda) y pulsa `E`.

## Victoria y derrota

- **Victoria:** reúne las **5 Reliquias Ancestrales** (se encienden los 5 sellos de la puerta) y pulsa `E` en la **Puerta Principal** de la SALIDA.
- **Derrota:** si la criatura te alcanza, se activa un *jumpscare* y aparece la pantalla **HAS MUERTO**.

---

## Estructura del proyecto

```
index.html            Página principal del juego
JUGAR_AQUI.bat        Lanzador: servidor local + navegador
server.ps1            Servidor HTTP local en PowerShell
css/style.css         Estilos, HUD y pantallas
js/audio.js           Motor de audio procedural (Web Audio API)
js/textures.js        Generación procedural de texturas (Canvas)
js/map.js             Asilo 3D (salas, props, colisiones), reliquias, notas, plano y puerta
js/monster.js         Modelo y IA del monstruo
js/game.js            Motor del juego, movimiento, interacción y estados
js/lib/three.min.js   Three.js r128 (local, sin CDN)
js/lib/PointerLockControls.js
tabla_categorias.html Página original de la tabla (respaldo)
```

Todo el arte (texturas, luces, sonido) se genera por código: no hay imágenes ni audios externos.
