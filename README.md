# ♟️ Astro Chess ✦
> **Una experiencia de ajedrez cósmico moderna, táctil y adictiva para el navegador.**  
> Diseñada con el dinamismo, la coreografía y la emoción visual de los mejores juegos de móvil (*Supercell / Marvel Snap*), fusionada con la nobleza y estrategia milenaria del ajedrez.

**v.022  "Cosmic Royal"**: una pasada completa de dirección de arte sobre el esqueleto existente. Ver [Novedades de v.022](#-novedades-de-v021--cosmic-royal) al final.

---

## 🌟 ¿Qué es Astro Chess?

**Astro Chess** no es otro simulador de ajedrez tradicional. Es una reimaginación visual e interactiva que convierte cada partida en una **guerra de reinos y dinastías en el cosmos**. Cuenta con un ritmo vibrante, efectos sonoros sintetizados para cada pieza, un anunciador dinámico de jugadas y una presentación gráfica pulida pensada tanto para jugadores casuales como para amantes de la estrategia.

---

## 🚀 Características Principales

### ⚔️ 1. Royal Announcer  Emoción en Tiempo Real
Inspirado en el sistema de llamadas de *League of Legends*, pero adaptado al lore de batalla real entre reinos:
* **🩸 FIRST BLOOD**: Se anuncia la primera baja de la partida con impacto épico.
* **👑 QUEENSLAYER**: Celebración ante la caída de la Dama rival (*"The rival court falls to ruin"*).
* **⚔ RETALIATION**: Salta cuando el oponente recaptura inmediatamente en venganza.
* **🔥 Rachas de Captura (Kill Streaks)**:
  * `⚡ DOUBLE STRIKE` (2 bajas en racha)
  * `🔥 ROYAL RAMPAGE` (3 bajas consecutivas)
  * `💀 DOMINATING` (4 bajas seguidas)
  * `✦ DYNASTIC SUPREMACY ✦` (5+ bajas  Supremacía legendaria)
* **🏰 Jugadas Tácticas**: `🏰 TOWER BREAKER` (Torre), `⚔ FLANK STRIKE` (Caballo/Alfil), `⚔ SIEGE STRIKE` (Captura con Jaque), `👑 CORONATION` (Promoción), `🏰 ROYAL BULWARK` (Enroque) y `🗡 EN PASSANT`.

### 📱 2. Pantalla de Victoria Coreografiada (Estilo Smartphone)
Al concluir una partida, las estadísticas ya no aparecen de golpe:
1. **Impacto & Título**: La corona y el resultado emergen con rebote elástico.
2. **Cascada de Estadísticas**: 6 tarjetas secuenciales (*Turnos, Tiempo, Pieza Favorita, Capturas, Jaques Dados, Puntos*).
3. **Conteo en Vivo (*Count-Up*)**: Los números suben digitalmente en tiempo real acompañados de ticks táctiles.
4. **Sello de ELO**: La variación de ranking (`+30 Elo → 461`) estampa con brillo esmeralda o carmesí.
5. **Fast-Forward**: Si tienes prisa, un toque en la tarjeta salta directo al estado final.

### 🎮 3. Modos de Juego
* **🤖 vs. CPU**: Desafíos rápidos con selector de dificultad (*Fácil* y *Medio*).
* **🏟️ La Plaza (Solo Hub)**: Enfréntate a una rotación de maestros rivales con personalidades, biografías y calificaciones de ELO propias (Edward, Himiko, Wolfgang, Haruka, etc.).
* **👥 Partida Local**: 2 jugadores en el mismo dispositivo con control de tiempo.
* **🌐 Multijugador Online**: En desarrollo (*Próximamente*).

### 🕹️ 4. Sensación Táctil e Inmersión Visual
* **Físicas de Botones**: Rebote y compresión táctil con resorte en cada interacción.
* **Tablero Dinámico**:
  * Casilla seleccionada con pulso cósmico interior.
  * Puntos de movimiento válido con aparición en resorte (*Spring Spawn*).
  * Anillos de captura con tensión de combate palpitante.
* **HUD con Aura Activa**: El panel del jugador en turno se ilumina con halo astral y muestra un chip **EN TURNO**; el inactivo se atenúa sutilmente.
* **Move Timeline**: Historial en tiempo real de cada movimiento en notación algebraica con iconos.
* **Resaltado de la última jugada**: las dos casillas de la jugada anterior quedan marcadas en el tablero.
* **Ventaja material**: se muestra `+N` junto a las piezas capturadas del bando que va por delante.

### 🎵 5. Audio & Música Inmersiva
* **Sonido por Pieza**: Cada tipo de pieza (Peón, Caballo, Alfil, Torre, Dama, Rey) tiene su propio timbre y ataque sintetizado con Web Audio API.
* **Música Ambiental**: Banda sonora temática para el Lobby y temas de batalla durante la partida.

---

## 🕹️ Guía Rápida para Nuevos Jugadores

| Acción | Cómo funciona |
| :--- | :--- |
| **Seleccionar Pieza** | Haz clic o toca tu pieza. Verás el resplandor de selección y los puntos de movimiento. |
| **Mover Pieza** | Haz clic en un punto verde/índigo para moverte o en un anillo rojo para capturar. |
| **Control de Tiempo** | Elige entre 5, 10, 15 o 30 minutos en el menú **Time**. |
| **Ver Historial** | Consulta tus partidas anteriores y análisis en el botón **History**. |
| **Ajustes de Sonido** | Usa el botón flotante en forma de disco de vinilo en la esquina superior para ajustar volumen o silenciar. |
| **Pausar** | Botón **Pause** en las opciones de partida, o pulsa `P`. |
| **Revisar la partida** | Haz clic en cualquier jugada del **Move Timeline** para ver esa posición sobre el tablero. Navega con `←` `→` o los botones de la barra, y pulsa **Volver** (o `Esc`) para regresar a la partida. |
| **Reanudar** | Si sales de una partida a medias, el Home muestra una tarjeta **Partida en curso** con el botón **Reanudar**. |
| **Teclado** | `F` gira el tablero · `P` pausa · flechas mueven el cursor en juego y navegan la revisión · `Inicio` / `Fin` van al principio o al final · `Enter` selecciona · `Esc` cierra o sale. |

---

## ✨ Novedades de v.022  "Cosmic Royal"

### 🎨 Dirección de arte
* **Nueva capa de diseño `css/theme.css`**: se carga al final y viste cada superficie sin tocar la estructura. Paleta índigo/violeta profunda con acentos de **oro real**, escala de superficies y elevaciones (`--surface-*`, `--shadow-*`, `--glow-*`), radios y curvas de movimiento unificados.
* **Atmósfera en capas**: auroras radiales, grano fino sobre el degradado (elimina el *banding*), viñeta cinematográfica y un **campo de partículas cósmicas** (`#cosmic-dust`) que respira sobre el starfield.
* **Logotipo**: wordmark con barrido de luz, "ASTRO" en oro y un halo aurora animado detrás del título.
* **Controles de Home** rediseñados: píldoras con placa de icono, valor activo en oro y panel con corona dorada.
* **Selector de tablero con muestras reales**: 8 temas (Royal Indigo, Emerald Court, Bronze Dynasty, Crimson Realm, Classic, Neon, Ocean, Ruby) con vista previa de casillas.
* **Tablero con bisel marfil y esquinas doradas**, sombra interior y coordenadas legibles.

### 🖥️ Layout de escritorio reconstruido
* La partida pasa a un **escenario de tres columnas** con el tablero como protagonista (`minmax(200px,272px) minmax(0,1fr) minmax(200px,272px)`), en lugar de dos paneles de 410 px con avatares de 370 px aplastando un tablero de `55vh`.
* **Panel de jugador compacto horizontal**: avatar contenido, nombre, marcador y reloj de 2 rem. El antiguo círculo de 370 px se salía de su propia tarjeta en móvil; ahora cabe siempre.
* **Home centrado con ritmo vertical coherente** (antes `space-between` empujaba todo a los bordes y recortaba el logo).
* **La Plaza a 3 columnas**, **Historial a dos columnas** con estado vacío diseñado, **modales a escala de escritorio** (520 px, estadísticas en una fila).

### 🧩 Sensación de juego
* **Resaltado de la última jugada** en el tablero.
* **Ventaja material `+N`** calculada sobre las piezas capturadas.
* **Chip "EN TURNO"** en el panel activo, con barra de energía dorada en el borde.
* **Feedback de movimiento**: aterrizaje con rebote de la pieza y **anillo de impacto** al capturar, más vibración táctil donde el dispositivo la soporte.
* **Píldora de estado** con color semántico (jaque en ámbar, mate en rojo) y punto de estado animado.
* **⏸ Pausa real** (botón y tecla `P`) con superposición dedicada: congela ambos relojes.

### 🔍 Revisión de la partida (click-to-review)
* Cada jugada del **Move Timeline** es un botón: al pulsarla, el tablero muestra la posición **después de esa jugada**.
* Se guarda una **instantánea completa por jugada** (tablero, enroques, al paso, capturas y notación), así que revisar no recalcula reglas: reproduce posiciones exactas.
* **Barra de transporte** con ir al inicio, jugada anterior, siguiente y al final, más un contador `4 / 12` y un botón **Volver**.
* **Atajos**: `←` `→` navegan, `Inicio` / `Fin` saltan a los extremos, `Esc` sale de la revisión.
* Mientras revisas, el tablero queda **de sólo lectura** (los clics no pintan encima), el reloj se **congela** y el marco del tablero se marca en oro para que quede claro que estás en modo lectura.
* Al salir, la posición viva se restaura tal cual estaba y el reloj se reanuda.

### 💾 Partida en curso y "Reanudar"
* La partida se guarda sola en `localStorage` tras cada jugada (con *debounce*), y también al ocultar o cerrar la pestaña.
* El **Home** muestra una tarjeta **Partida en curso** con el rival, de quién es el turno, cuántas jugadas llevas y hace cuánto se guardó, más un botón para **descartarla**.
* **Reanudar** restaura tablero, capturas, enroques, al paso, puntuación, estadísticas, perfil del rival, **los relojes** y **todo el historial de revisión**, así que el Move Timeline y el click-to-review siguen funcionando donde los dejaste. Todo esto sobrevive a un recargado completo de la página.
* Al terminar una partida (o rendirse) la instantánea se borra: nunca te ofrece reanudar algo ya terminado.

### ⏱️ Reloj
* El reloj ahora se calcula por **deltas de tiempo real** en lugar de restar 1 por segundo. En una pestaña en segundo plano ya no regala tiempo de pensamiento.
* Expone `Timer.pause() / resume() / isPaused()`.

### ♿ Accesibilidad
* **Zoom restaurado** (se eliminó `maximum-scale=1.0, user-scalable=no`).
* **`prefers-reduced-motion`** respetado: desactiva las animaciones infinitas y el starfield animado.
* **Anillo de foco unificado** (`:focus-visible`) en toda la app.
* **Tablero semántico**: `role="grid"`, cada casilla `role="gridcell"` con etiqueta en español (`"e4, peón blanco"`), actualizada tras cada jugada.
* **Región viva** para el estado de la partida (`role="status" aria-live="polite"`).
* **Gestión de foco en modales**: al abrirse el foco entra en el diálogo, `Tab` queda atrapado y al cerrar se restaura.
* **Nombres accesibles** para todos los botones que solo tienen icono.

### 🐛 Correcciones destacadas
* **Parpadeo de la pieza al mover** *(reportado)*: la clase `piece-animate` (la animación de entrada) se quedaba pegada en las 32 piezas indefinidamente, así que cualquier cambio de clase posterior hacía que el navegador **reanudara la animación de entrada**  la pieza bajaba a opacidad 0 y volvía a caer. Ahora la clase se retira sola cuando termina su animación, y el efecto de aterrizaje usa la **Web Animations API** en lugar de alternar clases, así que no puede disparar un respaldo.
* **Coordenadas del tablero ilegibles**: se referenciaban `--board-dark` / `--board-light`, que no existían, así que las etiquetas heredaban blanco y desaparecían sobre las casillas claras. Ahora `board.js` publica `--coord-on-light` / `--coord-on-dark` por tema.
* **4 temas de tablero no existían** en `BoardRenderer.THEMES`: elegir Neón, Océano o Ruby caía silenciosamente a Classic Green. Los 8 temas están implementados.
* **28 recursos 404 en el arranque**: el manifiesto del loader pedía `avatar_7..14.png` (8 archivos inexistentes) y 20 retratos NPC sin el prefijo `[Arquetipo] `. Ahora refleja el disco y **reporta los fallos** en consola en vez de mostrar un 100 % falso.
* **Colisión de CSS en `.player-score`**: `profile.css` lo definía ámbar y `ui.css` lo sobrescribía a violeta. Unificado en oro.
* **Contraste**: `--text-muted` #64748b quedaba en 4.2:1; las filas de logros bloqueados ya no se atenúan con `opacity`, se atenúa solo el arte.
* **Texto corrupto (mojibake)**: los archivos arrastraban secuencias tipo `â"` donde debía haber ``, además de **bytes C1 huérfanos** (`U+0097` por ``, `U+0095` por ``). Reparados en `index.html`, `README.md`, `docs/` y los 16 módulos de `js/` de forma verificada, conservando el Unicode legítimo (`═ ─ → ★ Зов Δ`).
* **Recorte de nombres en el HUD**: el nombre del jugador era un contenedor centrado que se encogía por debajo de su texto y lo cortaba por ambos lados.
* **Colores de selección opacos**: el resaltado de casilla era un amarillo plano; ahora es un anillo dorado con lavado cósmico interior.

---

## 🛠️ Tecnologías Utilizadas

* **HTML5 Canvas & DOM**: Renderizado rápido y responsive sin dependencias pesadas.
* **CSS3 Moderno**: Glassmorphism translúcido, animaciones en GPU y diseño adaptativo para móviles y escritorio.
* **JavaScript Puro (Vanilla ES6+)**: Motor de reglas de ajedrez completo, IA de CPU heurística y control de estados.
* **Web Audio API**: Síntesis procedural de efectos sonoros en tiempo real.

### Estructura de archivos
```
index.html            Estructura de pantallas y modales
css/
  base.css            Tokens de diseño, reset, accesibilidad base
  screens.css         Contenedores de pantalla y layout
  board.css           Tablero, casillas y piezas
  modals.css          Modales (promoción, fin de partida, logros)
  ui.css              Botones, paneles, toasts, controles
  profile.css         Perfil, historial, dificultad
  plaza.css           La Plaza / Modo Libre
  announcer.css       Royal Announcer y Move Timeline
  theme.css           ★ Capa "Cosmic Royal" (se carga al final)
js/
  constants.js  starfield.js  audio.js  music.js  chess.js
  skins.js      board.js      timer.js  profile.js plaza.js
  cpu.js        achievements.js  announcer.js  ui.js  game.js
  experience.js ★ Capa de experiencia (partículas, FX, teclado, foco)
  loader.js     Precarga de recursos y pantalla de arranque
```

---

<p align="center">
  <b>Astro Chess</b>  <i>Code with ♥ by theAstroBruh ~</i>
</p>
