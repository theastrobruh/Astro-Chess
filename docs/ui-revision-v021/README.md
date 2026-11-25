# Capturas — Revisión de interfaz v.021 "Cosmic Royal"

Comparativa lado a lado del rediseño. Cada estado está capturado en dos
viewports:

* `mobile` — 414 × 896 (iPhone-ish), densidad 2×
* `desktop` — 1440 × 900, densidad 1.5×

## Convención de nombres

```
v020-<viewport>-<NN>-<estado>.png   Antes del rediseño
v021-<viewport>-<NN>-<estado>.png   Después del rediseño
```

## Estados capturados

| NN | Estado |
| :-- | :--- |
| 01 | Home / menú principal |
| 02 | Desplegable de control de tiempo |
| 03 | Desplegable de estilo de piezas |
| 04 | Desplegable de ajustes del tablero |
| 05 | Panel de audio |
| 06 | Modal de dificultad de la CPU |
| 07 | La Plaza (modo solitario) |
| 08 | Modal de logros |
| 09 | Historial de partidas |
| 10 | Inicio de partida |
| 11 | Partida con jugadas, cronología y resaltado de última jugada |
| 12 | Menú de opciones en partida |
| 13 | Modal de fin de partida |
| 14 | Carta coleccionable |
| 15 | Superposición de pausa (solo v.021) |
| 16 | Barra de reproducción del Move Timeline (solo v.021) |
| 17 | Modo revisión: posición histórica sobre el tablero (solo v.021) |
| 18 | Tarjeta "Partida en curso / Reanudar" en Home (solo v.021) |

## Cómo regenerarlas

Desde la raíz del proyecto:

```bash
node .tools/shot.js docs/ui-revision-v021 v021    # recorrido general
node .tools/shot-v3.js                            # revisión + reanudar
```

Y las baterías de comprobación funcional:

```bash
node .tools/functional-test.js       # 18 casos: teclado, pausa, foco, ARIA, temas
node .tools/test-review-resume.js    # 24 casos: click-to-review y persistencia
node .tools/check-css.js css         # llaves balanceadas en las 9 hojas
```

