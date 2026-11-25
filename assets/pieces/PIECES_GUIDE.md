# 🎨 Guía de Imágenes de Piezas — Astro Chess

## Resolución Recomendada

| Uso | Resolución | Notas |
|-----|-----------|-------|
| **Mínima** | 128 × 128 px | Funciona bien en pantallas normales |
| **Ideal ✅** | 256 × 256 px | Calidad máxima, soporta pantallas Retina/HiDPI |
| **Ultra** | 512 × 512 px | Solo si priorizas calidad extrema sobre peso |

- **Formato**: PNG con fondo **transparente** (canal alpha)
- **Color de fondo**: Ninguno — las piezas se renderizan sobre el tablero
- **Orientación**: La pieza debe estar centrada y ocupar ~80% del canvas

---

## Convención de Nombres

```
{pieza}_{cara}.png
```

| Pieza   | Nombre archivo (cara frontal) | Nombre archivo (cara trasera) |
|---------|-------------------------------|-------------------------------|
| Rey     | `king_front.png`              | `king_back.png`               |
| Reina   | `queen_front.png`             | `queen_back.png`              |
| Torre   | `rook_front.png`              | `rook_back.png`               |
| Alfil   | `bishop_front.png`            | `bishop_back.png`             |
| Caballo | `knight_front.png`            | `knight_back.png`             |
| Peón    | `pawn_front.png`              | `pawn_back.png`               |

### ¿Qué es `_front` vs `_back`?
- **`_front`**: Vista que ve el jugador que controla esa pieza (perspectiva normal).
- **`_back`**: Vista que se muestra cuando el tablero está volteado — es la pieza vista desde el lado opuesto. Puede ser la misma imagen rotada 180°, o una versión con perspectiva diferente para un efecto más dramático.

---

## Estructura de Carpetas

```
assets/pieces/
├── PIECES_GUIDE.md       ← Esta guía
│
├── classic/              ← Skin "Classic" (FontAwesome, no necesita PNGs)
│   └── .gitkeep
│
└── astro/                ← Skin "Astro" (tus imágenes personalizadas)
    ├── white/            ← Piezas blancas
    │   ├── king_front.png
    │   ├── king_back.png
    │   ├── queen_front.png
    │   ├── queen_back.png
    │   ├── rook_front.png
    │   ├── rook_back.png
    │   ├── bishop_front.png
    │   ├── bishop_back.png
    │   ├── knight_front.png
    │   ├── knight_back.png
    │   ├── pawn_front.png
    │   └── pawn_back.png
    │
    └── black/            ← Piezas negras
        ├── king_front.png
        ├── king_back.png
        ├── queen_front.png
        ├── queen_back.png
        ├── rook_front.png
        ├── rook_back.png
        ├── bishop_front.png
        ├── bishop_back.png
        ├── knight_front.png
        ├── knight_back.png
        ├── pawn_front.png
        └── pawn_back.png
```

---

## Cómo Agregar una Nueva Skin en el Futuro

1. **Crear la carpeta** en `assets/pieces/mi-nueva-skin/white/` y `assets/pieces/mi-nueva-skin/black/`
2. **Agregar las 24 imágenes** siguiendo la misma convención de nombres
3. **Registrar el skin** en `js/skins.js`, agregando una entrada nueva al array `SKINS`:

```javascript
{
    id:          'mi-nueva-skin',
    name:        'Mi Skin',
    description: 'Descripción corta',
    type:        'png',
    path:        'assets/pieces/mi-nueva-skin',
    preview:     { white: 'king', black: 'king' }  // pieza para el preview
}
```

4. ¡Listo! El selector de skins la detectará automáticamente.

---

## Consejos para las Imágenes

- ✅ Usa **fondo transparente** (PNG con alpha)
- ✅ Centra la pieza y deja ~10% de margen alrededor
- ✅ Las piezas blancas y negras deben ser visualmente distintas
- ✅ La cara `_back` puede ser la misma imagen rotada 180° si no tienes versión alternativa
- ❌ Evita bordes duros en transparencias (usa anti-aliasing)
- ❌ No uses JPG/JPEG (no soporta transparencia)
