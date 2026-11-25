<div align="center">

<img src="docs/v021-desktop-01-home.png" alt="Astro Chess Home Screen" width="720">

# ♟️ Astro~Chess ✦

**Una experiencia de ajedrez cósmico moderna, táctil y adictiva para el navegador.**

[![Live Demo](https://img.shields.io/badge/🚀%20Live%20Demo-GitHub%20Pages-6366f1?style=for-the-badge&logoColor=white)](https://theastrobruh.github.io/Astro-Chess/)
[![Version](https://img.shields.io/badge/version-v.022%20Cosmic%20Royal-gold?style=for-the-badge)](https://github.com/theastrobruh/Astro-Chess/releases)
[![License](https://img.shields.io/badge/license-MIT-22c55e?style=for-the-badge)](LICENSE)
[![Vanilla JS](https://img.shields.io/badge/Vanilla-JS%20%2B%20WebAudio-f7df1e?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/API)

> Diseñada con el dinamismo, la coreografía y la emoción visual de los mejores juegos móviles — *Supercell / Marvel Snap* — fusionada con la nobleza y estrategia milenaria del ajedrez.

</div>

---

## 🌌 ¿Qué es Astro~Chess?

**Astro~Chess** no es otro simulador de ajedrez tradicional. Es una **reimaginación visual e interactiva** que convierte cada partida en una guerra de reinos y dinastías en el cosmos.

Cuenta con un ritmo vibrante, **efectos sonoros sintetizados** para cada pieza, un anunciador dinámico de jugadas al estilo League of Legends y una presentación gráfica pulida pensada tanto para jugadores casuales como para amantes de la estrategia — sin instalar nada, directo desde el navegador.

---

## 📸 Screenshots

<div align="center">

| Home | La Plaza | Partida |
|:---:|:---:|:---:|
| <img src="docs/v021-desktop-01-home.png" width="260"> | <img src="docs/v021-desktop-07-plaza.png" width="260"> | <img src="docs/v021-desktop-11-game-moves.png" width="260"> |
| **Game Over** | **Tarjeta de Jugador** | **Revisión de Partida** |
| <img src="docs/v021-desktop-13-gameover.png" width="260"> | <img src="docs/v021-desktop-14-trading-card.png" width="260"> | <img src="docs/v021-desktop-17-review-mode.png" width="260"> |

</div>

<details>
<summary>📱 Capturas en Móvil</summary>

<div align="center">

| Home | Tablero | La Plaza | Game Over |
|:---:|:---:|:---:|:---:|
| <img src="docs/v021-mobile-01-home.png" width="180"> | <img src="docs/v021-mobile-10-game-start.png" width="180"> | <img src="docs/v021-mobile-07-plaza.png" width="180"> | <img src="docs/v021-mobile-13-gameover.png" width="180"> |

</div>
</details>

---

## 🚀 Características Principales

### ⚔️ Royal Announcer — Emoción en Tiempo Real

Inspirado en el sistema de llamadas de *League of Legends*, adaptado al lore de batallas de reinos:

| Anuncio | Trigger |
|:---|:---|
| 🩸 **FIRST BLOOD** | Primera baja de la partida |
| 👑 **QUEENSLAYER** | Captura de la Dama rival |
| ⚔️ **RETALIATION** | El oponente recaptura en venganza |
| ⚡ **DOUBLE STRIKE** | 2 bajas consecutivas |
| 🔥 **ROYAL RAMPAGE** | 3 bajas en racha |
| 💀 **DOMINATING** | 4 bajas seguidas |
| ✦ **DYNASTIC SUPREMACY ✦** | 5+ bajas — Supremacía legendaria |
| 🏰 **TOWER BREAKER** | Captura con Torre |
| 👑 **CORONATION** | Promoción de peón |
| 🏰 **ROYAL BULWARK** | Enroque |
| 🗡️ **EN PASSANT** | Captura al paso |

### 📱 Pantalla de Victoria Coreografiada

Al concluir una partida, las estadísticas ya no aparecen de golpe:
1. **Impacto & Título** — La corona y el resultado emergen con rebote elástico.
2. **Cascada de Estadísticas** — 6 tarjetas secuenciales *(Turnos, Tiempo, Pieza Favorita, Capturas, Jaques, Puntos)*.
3. **Conteo en Vivo** — Los números suben digitalmente con ticks táctiles.
4. **Sello de ELO** — La variación `+30 Elo → 461` estampa con brillo esmeralda o carmesí.
5. **Fast-Forward** — Un toque en la tarjeta salta directo al estado final.

### 🎮 Modos de Juego

| Modo | Estado |
|:---|:---:|
| 🤖 **vs. CPU** — Fácil y Medio | ✅ Disponible |
| 🏟️ **La Plaza** — Rivales con ELO, personalidad y biografía | ✅ Disponible |
| 👥 **Partida Local** — 2 jugadores en el mismo dispositivo | ✅ Disponible |
| 🌐 **Multijugador Online** | 🔜 Próximamente |

### 🕹️ Sensación Táctil & Inmersión Visual

- **Físicas de Botones** — Rebote y compresión táctil con resorte.
- **Tablero Dinámico** — Pulso cósmico en selección, *Spring Spawn* en movimientos, anillos de captura palpitantes.
- **HUD con Aura Activa** — Halo astral en el jugador activo + chip **EN TURNO**.
- **Move Timeline** — Historial en notación algebraica con iconos en tiempo real.
- **Resaltado de última jugada** — Siempre visible sobre el tablero.
- **Ventaja material `+N`** — Calculada sobre capturas del bando líder.
- **⏸ Pausa Real** — Congela ambos relojes con una superposición dedicada.

### 🔍 Revisión de Partida *(click-to-review)*

Cada jugada del **Move Timeline** es un botón interactivo:
- El tablero muestra la posición exacta en ese momento.
- Barra de transporte: `⏮ ← → ⏭` con contador `4 / 12`.
- Atajos: `←` `→` navegan · `Inicio`/`Fin` van a los extremos · `Esc` sale.
- Tablero en modo **sólo lectura** con marco dorado mientras revisas.
- Al salir, la posición viva y los relojes se restauran tal cual.

### 💾 Partida en Curso & Reanudar

- Guardado automático en `localStorage` tras cada jugada.
- El Home muestra una tarjeta **"Partida en curso"** con rival, turno y tiempo desde el guardado.
- **Reanudar** restaura tablero, capturas, enroques, al paso, puntuación, relojes e historial completo.

### 🎵 Audio & Música Inmersiva

- **Sonido por Pieza** — Cada pieza tiene su propio timbre sintetizado con Web Audio API.
- **Música Ambiental** — Banda sonora para Lobby y temas de batalla durante la partida.

---

## 🕹️ Guía Rápida

| Acción | Cómo |
|:---|:---|
| **Seleccionar Pieza** | Clic / toque en tu pieza → ves el resplandor y los puntos de movimiento |
| **Mover** | Clic en punto verde/índigo (mover) o anillo rojo (capturar) |
| **Control de Tiempo** | Menú **Time** → 5 / 10 / 15 / 30 min |
| **Historial** | Botón **History** en el Home |
| **Audio** | Botón disco vinilo flotante (esquina superior) |
| **Pausar** | Botón **Pause** en opciones · o tecla `P` |
| **Revisar partida** | Clic en cualquier jugada del Move Timeline |
| **Reanudar** | Tarjeta "Partida en curso" en el Home |
| **Teclado** | `F` gira tablero · `P` pausa · `←` `→` navegan revisión · `Inicio`/`Fin` extremos · `Enter` selecciona · `Esc` cierra |

---

## ✨ Novedades de v.022 — *"Cosmic Royal"*

### 🎨 Dirección de Arte
- **Nueva capa `css/theme.css`** — Paleta índigo/violeta profunda con acentos de **oro real**, elevaciones unificadas.
- **Atmósfera en capas** — Auroras radiales, grano fino anti-banding, viñeta cinematográfica y campo de partículas cósmicas.
- **Logotipo** — Wordmark con barrido de luz, "ASTRO" en oro y halo aurora animado.
- **Selector de tablero con muestras reales** — 8 temas: *Royal Indigo, Emerald Court, Bronze Dynasty, Crimson Realm, Classic, Neon, Ocean, Ruby*.
- **Tablero con bisel marfil y esquinas doradas**, sombra interior y coordenadas legibles.

### 🖥️ Layout de Escritorio Reconstruido
- **Tres columnas** con el tablero como protagonista, en lugar de paneles laterales que aplastaban el board.
- **Panel de jugador compacto horizontal** — cabe siempre, en móvil y escritorio.
- **La Plaza a 3 columnas** · **Historial a 2 columnas** con estado vacío diseñado.

### ⏱️ Reloj Preciso
- Calculado por **deltas de tiempo real** — una pestaña en segundo plano ya no regala tiempo de pensamiento.

### ♿ Accesibilidad
- **Zoom restaurado** — eliminado `maximum-scale=1.0, user-scalable=no`.
- **`prefers-reduced-motion`** — desactiva animaciones infinitas y starfield.
- **Tablero semántico** — `role="grid"` con etiquetas en español por casilla.
- **Foco en modales** — `Tab` atrapado · foco restaurado al cerrar.

### 🐛 Correcciones Destacadas
- Parpadeo de pieza al mover (animación de entrada que se quedaba pegada).
- 28 recursos 404 en el arranque (manifesto del loader corregido).
- 4 temas de tablero que caían silenciosamente a *Classic Green*.
- Colisión de CSS en `.player-score` entre `profile.css` y `ui.css`.
- Texto corrupto (mojibake) en HTML, README y 16 módulos JS.

---

## 🛠️ Stack Tecnológico

```
HTML5 Canvas & DOM   Renderizado rápido sin dependencias pesadas
CSS3 Moderno         Glassmorphism, animaciones GPU, diseño adaptativo
Vanilla JS (ES6+)    Motor de ajedrez completo + IA heurística de CPU
Web Audio API        Síntesis procedural de SFX en tiempo real
Firebase Auth        Google Sign-In (opcional, modo invitado disponible)
```

### 📁 Estructura del Proyecto

```
Astro~Chess/
├── index.html              Principal — estructura de pantallas y modales
├── css/
│   ├── base.css            Tokens, reset y accesibilidad base
│   ├── screens.css         Contenedores y layout
│   ├── board.css           Tablero, casillas y piezas
│   ├── modals.css          Modales (promoción, fin de partida, logros)
│   ├── ui.css              Botones, paneles, toasts
│   ├── profile.css         Perfil e historial
│   ├── plaza.css           La Plaza / Modo Libre
│   ├── announcer.css       Royal Announcer y Move Timeline
│   └── theme.css           ★ Capa "Cosmic Royal" (última en cargar)
├── js/
│   ├── constants.js        Constantes globales
│   ├── starfield.js        Campo de partículas cósmicas (canvas)
│   ├── audio.js            SFX por pieza (Web Audio API)
│   ├── music.js            Música ambiental por contexto
│   ├── chess.js            Motor de reglas de ajedrez completo
│   ├── skins.js            Gestión de skins de piezas
│   ├── board.js            Renderizador del tablero
│   ├── timer.js            Reloj preciso por delta real
│   ├── profile.js          Perfil de usuario y ELO
│   ├── plaza.js            La Plaza — NPCs con personalidad
│   ├── cpu.js              IA de CPU heurística
│   ├── achievements.js     Sistema de logros
│   ├── announcer.js        Royal Announcer
│   ├── ui.js               Controlador de UI y navegación
│   ├── game.js             Lógica de partida y estado
│   ├── experience.js       ★ Partículas, FX, teclado, foco
│   ├── firebase-config.js  Credenciales Firebase (opcional)
│   ├── auth.js             Google Sign-In
│   └── loader.js           Precarga de recursos y boot screen
└── assets/
    ├── avatars/            Avatares de jugador y retratos NPC
    ├── pieces/astro/       Skin "Astro" (front/back, blancas/negras)
    └── music/              Pistas de lobby y batalla
```

---

## 🌐 Jugar Ahora

**No requiere instalación.** Abre directamente en tu navegador:

> **[▶ theastrobruh.github.io/Astro-Chess](https://theastrobruh.github.io/Astro-Chess/)**

### Correr localmente

```bash
git clone https://github.com/theastrobruh/Astro-Chess.git
cd Astro-Chess
# Abre index.html con cualquier servidor estático, por ejemplo:
npx serve .
# o simplemente arrastra index.html a tu navegador
```

> [!NOTE]
> El proyecto es 100% estático — HTML, CSS y JS puro. No hay build step, bundler ni dependencias de Node en producción.

> [!TIP]
> Para el Google Sign-In, edita `js/firebase-config.js` con tus propias credenciales de Firebase. El juego funciona completamente sin ellas en modo invitado.

---

## 🗺️ Roadmap

| Feature | Estado |
|:---|:---:|
| Multijugador Online (WebSocket / Firebase RTDB) | 🔜 Planeado |
| Más niveles de CPU (Hard / Expert con Minimax + Alpha-Beta) | 🔜 Planeado |
| Modo torneo local (bracket) | 💡 Idea |
| Análisis post-partida con evaluación de posición | 💡 Idea |
| PWA — instalable en móvil | 💡 Idea |

---

## 📄 Licencia

MIT © 2025 [theAstroBruh](https://github.com/theastrobruh)

---

<div align="center">

**Astro~Chess** &nbsp;—&nbsp; *Code with ♥ by theAstroBruh ~*

</div>
