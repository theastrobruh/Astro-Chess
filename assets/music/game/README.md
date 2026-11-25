# Astro~Chess — Game Music

Coloca aqui tus archivos de musica para las partidas activas de ajedrez.

## Instrucciones

1. Agrega tus archivos de musica en esta carpeta.
   - Formatos soportados: `.mp3`, `.ogg`, `.wav`
   - Recomendado: `.mp3` (mejor compatibilidad)

2. Registra cada archivo en `js/music.js`, dentro del array `GAME_TRACKS`:

```js
const GAME_TRACKS = [
    "assets/music/game/batalla_01.mp3",
    "assets/music/game/batalla_02.mp3",
];
```

3. El sistema cambia automaticamente al contexto "game" al iniciar una partida.

## Tips

- Musica mas intensa, epica o de concentracion funciona mejor en partidas.
- Duracion recomendada: 3-6 minutos por pista.
- Al terminar la partida y volver al menu, el sistema vuelve a musica de lobby.
