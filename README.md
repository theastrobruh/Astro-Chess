<div align="center">

<img src="docs/v021-desktop-01-home.png" alt="Astro Chess — Home Screen" width="720"/>

<br/>

> **Una experiencia de ajedrez cósmico moderna, táctil y adictiva — directo en tu navegador.**
> Diseñada con la coreografía visual de *Supercell / Marvel Snap*, fusionada con la nobleza y estrategia milenaria del ajedrez.

[![Live Demo](https://img.shields.io/badge/🚀%20Live%20Demo-GitHub%20Pages-6366f1?logo=github&logoColor=white)](https://theastrobruh.github.io/Astro-Chess/)
[![Version](https://img.shields.io/badge/Version-v.022%20Cosmic%20Royal-gold)](#-novedades-de-v022--cosmic-royal)
[![License](https://img.shields.io/badge/License-MIT-22c55e)](#-licencia)
[![Vanilla JS](https://img.shields.io/badge/Vanilla-JS%20%2B%20WebAudio-f7df1e?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/API)
[![Firebase](https://img.shields.io/badge/Firebase-Auth-FF6F00?logo=firebase&logoColor=white)](https://firebase.google.com/)

<br/>

[**▶ Jugar Ahora**](https://theastrobruh.github.io/Astro-Chess/) · [**📸 Screenshots**](#-screenshots) · [**✨ Novedades**](#-novedades-de-v022--cosmic-royal) · [**🛠️ Stack**](#️-stack-tecnológico)

</div>

---

## 🌌 ¿Qué es Astro~Chess?

**Astro~Chess** no es otro simulador de ajedrez tradicional. Es una **reimaginación visual e interactiva** que convierte cada partida en una guerra de reinos y dinastías en el cosmos.

Cuenta con un ritmo vibrante, **efectos sonoros sintetizados** para cada pieza, un anunciador dinámico de jugadas al estilo *League of Legends* y una presentación gráfica pulida pensada tanto para jugadores casuales como para amantes de la estrategia — sin instalar nada, directo desde el navegador.

---

## 📸 Screenshots

<div align="center">

| Home | La Plaza | Partida |
|:---:|:---:|:---:|
| <img src="docs/v021-desktop-01-home.png" width="260"> | <img src="docs/v021-desktop-07-plaza.png" width="260"> | <img src="docs/v021-desktop-11-game-moves.png" width="260"> |
| **Game Over** | **Trading Card** | **Review Mode** |
| <img src="docs/v021-desktop-13-gameover.png" width="260"> | <img src="docs/v021-desktop-14-trading-card.png" width="260"> | <img src="docs/v021-desktop-17-review-mode.png" width="260"> |

</div>

<details>
<summary>📱 Ver capturas en móvil</summary>

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

---

### 🎮 Modos de Juego

| Modo | Estado |
|:---|:---:|
| 🤖 **vs. CPU** — Fácil y Medio | ✅ Disponible |
| 🏟️ **La Plaza** — Rivales con ELO, personalidad y biografía | ✅ Disponible |
| 👥 **Partida Local** — 2 jugadores en el mismo dispositivo | ✅ Disponible |
| 🌐 **Multijugador Online** | 🔜 Próximamente |

---

### ✨ Experiencia Visual & Táctil

<table>
<tr>
<td width="50%">

**📱 Pantalla de Victoria Coreografiada** — La corona y el resultado emergen con rebote elástico. 6 tarjetas de estadísticas en cascada con conteo en vivo. Sello de ELO con brillo esmeralda o carmesí.

**🎭 HUD con Aura Activa** — Halo astral en el jugador activo + chip **EN TURNO** con barra de energía dorada. El panel inactivo se atenúa.

**📋 Move Timeline** — Historial en tiempo real en notación algebraica con iconos. Cada jugada es un botón para revisar.

**🔍 Click-to-Review** — Barra de transporte `⏮ ← → ⏭` con contador `4 / 12`. Tablero en sólo lectura con marco dorado. Al salir, la partida y los relojes se restauran tal cual.

**🎨 8 Temas de Tablero** — *Royal Indigo, Emerald Court, Bronze Dynasty, Crimson Realm, Classic, Neon, Ocean, Ruby* — cada uno con vista previa de casillas reales.

</td>
<td width="50%">

**⚡ Físicas de Botones** — Rebote y compresión táctil con resorte en cada interacción.

**🌌 Tablero Dinámico** — Pulso cósmico en selección, *Spring Spawn* en movimientos, anillos de captura palpitantes.

**💾 Partida en Curso** — Guardado automático tras cada jugada. El Home muestra tarjeta *"Partida en curso"* con rival, turno y tiempo desde el guardado.

**⏸ Pausa Real** — Tecla `P` o botón dedicado. Congela ambos relojes con una superposición propia.

**♿ Accesibilidad** — Tablero semántico con `role="grid"`, etiquetas en español por casilla, `prefers-reduced-motion` respetado, foco en modales atrapado y restaurado.

</td>
</tr>
</table>

---

## 🕹️ Guía Rápida

| Acción | Cómo |
|:---|:---|
| **Seleccionar Pieza** | Clic / toque → resplandor + puntos de movimiento |
| **Mover** | Clic en punto verde/índigo (mover) o anillo rojo (capturar) |
| **Control de Tiempo** | Menú **Time** → 5 / 10 / 15 / 30 min |
| **Historial** | Botón **History** en el Home |
| **Audio** | Botón disco vinilo flotante (esquina superior) |
| **Pausar** | Botón **Pause** en opciones · o tecla `P` |
| **Revisar partida** | Clic en cualquier jugada del Move Timeline |
| **Reanudar** | Tarjeta *"Partida en curso"* en el Home |
| **Teclado** | `F` gira tablero · `P` pausa · `←``→` navegan revisión · `Inicio`/`Fin` extremos · `Enter` selecciona · `Esc` cierra |

---

## ✨ Novedades de v.022 — *"Cosmic Royal"*

| | Actualización | Detalle |
|---|---|---|
| 🎨 | **Nueva capa `theme.css`** | Paleta índigo/violeta profunda con acentos de **oro real**, elevaciones unificadas (`--surface-*`, `--shadow-*`, `--glow-*`) |
| 🌌 | **Atmósfera en capas** | Auroras radiales, grano fino anti-banding, viñeta cinematográfica y campo de partículas cósmicas |
| 🖼️ | **Logotipo** | Wordmark con barrido de luz, "ASTRO" en oro, halo aurora animado |
| 🗂️ | **8 temas de tablero** | Con vista previa de casillas reales — antes 4 caían silenciosamente a *Classic Green* |
| 🖥️ | **Layout escritorio** | 3 columnas, tablero protagonista — reemplaza paneles que aplastaban el board |
| ⏱️ | **Reloj preciso** | Delta de tiempo real — pestaña en segundo plano ya no regala tiempo |
| 🔍 | **Click-to-Review** | Instantánea por jugada, barra de transporte, atajos de teclado, modo sólo lectura |
| 💾 | **Reanudar partida** | Restaura tablero, capturas, relojes y todo el historial de revisión |
| 🐛 | **28 recursos 404** | Manifesto del loader corregido para reflejar los assets reales en disco |
| 🐛 | **Parpadeo al mover** | Clase `piece-animate` retira sola + Web Animations API para el aterrizaje |

---

## 🛠️ Stack Tecnológico

| Tech | Uso |
|:---|:---|
| **HTML5 Canvas & DOM** | Renderizado sin dependencias pesadas |
| **CSS3 Moderno** | Glassmorphism translúcido, animaciones GPU, diseño adaptativo |
| **Vanilla JS (ES6+)** | Motor de ajedrez completo + IA heurística de CPU |
| **Web Audio API** | Síntesis procedural de SFX en tiempo real |
| **Firebase Auth** | Google Sign-In (opcional — funciona en modo invitado) |

### 📁 Estructura del Proyecto

```
Astro~Chess/
├── index.html              Principal — pantallas y modales
├── css/
│   ├── base.css            Tokens, reset y accesibilidad
│   ├── screens.css         Contenedores y layout
│   ├── board.css           Tablero, casillas y piezas
│   ├── modals.css          Modales (promoción, fin de partida)
│   ├── ui.css              Botones, paneles, toasts
│   ├── profile.css         Perfil e historial
│   ├── plaza.css           La Plaza / Modo Libre
│   ├── announcer.css       Royal Announcer y Move Timeline
│   └── theme.css           ★ Capa "Cosmic Royal" (última en cargar)
├── js/
│   ├── chess.js            Motor de reglas de ajedrez completo
│   ├── board.js            Renderizador del tablero (8 temas)
│   ├── cpu.js              IA de CPU heurística
│   ├── game.js             Lógica de partida y estado
│   ├── ui.js               Controlador de UI y navegación
│   ├── plaza.js            La Plaza — NPCs con personalidad
│   ├── announcer.js        Royal Announcer
│   ├── audio.js / music.js SFX + música ambiental (Web Audio API)
│   ├── timer.js            Reloj preciso por delta real
│   ├── profile.js          Perfil de usuario y ELO
│   ├── achievements.js     Sistema de logros
│   ├── experience.js       ★ Partículas, FX, teclado, foco
│   ├── auth.js             Google Sign-In (Firebase)
│   └── loader.js           Precarga de recursos y boot screen
└── assets/
    ├── avatars/            Avatares de jugador + retratos NPC
    ├── pieces/astro/       Skin "Astro" (front/back, blancas/negras)
    └── music/              Pistas de lobby y batalla
```

---

## 🌐 Jugar Ahora

**No requiere instalación.** Abre directamente en tu navegador:

<div align="center">

### [▶ theastrobruh.github.io/Astro-Chess](https://theastrobruh.github.io/Astro-Chess/)

</div>

### Desarrollo Local

```bash
git clone https://github.com/theastrobruh/Astro-Chess.git
cd Astro-Chess
```

| Método | Comando |
|:---|:---|
| 🐍 Python | `python -m http.server 8000` → abrir `http://localhost:8000` |
| 📦 Node | `npx serve .` → abrir `http://localhost:3000` |
| 🗂️ Directo | Arrastra `index.html` a tu navegador (funciona desde `file://`) |

> [!NOTE]
> El proyecto es 100% estático — HTML, CSS y JS puro. No hay build step, bundler ni dependencias de Node en producción. Para el Google Sign-In, edita `js/firebase-config.js` con tus propias credenciales.

---

## 🗺️ Roadmap

| Feature | Estado |
|:---|:---:|
| Multijugador Online (WebSocket / Firebase RTDB) | 🔜 Planeado |
| CPU Hard / Expert (Minimax + Alpha-Beta pruning) | 🔜 Planeado |
| Modo torneo local (bracket) | 💡 Idea |
| Análisis post-partida con evaluación de posición | 💡 Idea |
| PWA — instalable desde el navegador móvil | 💡 Idea |

---

## 📄 Licencia

MIT © 2025 — Libre de usar, modificar y compartir.

<div align="center">

*Made with ♥ by [theAstroBruh](https://github.com/theastrobruh) ~*

</div>
