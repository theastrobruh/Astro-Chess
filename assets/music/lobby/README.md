# Astro~Chess — Lobby Music

Coloca aqui tus archivos de musica para el lobby (menu principal, La Plaza, pantallas de inicio).

## Instrucciones

1. Agrega tus archivos de musica en esta carpeta.
   - Formatos soportados: `.mp3`, `.ogg`, `.wav`
   - Recomendado: `.mp3` (mejor compatibilidad)

2. Registra cada archivo en `js/music.js`, dentro del array `LOBBY_TRACKS`:

```js
const LOBBY_TRACKS = [
    "assets/music/lobby/mi_cancion_01.mp3",
    "assets/music/lobby/mi_cancion_02.mp3",
];
```

3. El sistema las reproducira en orden aleatorio automaticamente.

## Tips

- Musica ambiental, suave, instrumental funciona mejor para el lobby.
- Duracion recomendada: 2-5 minutos por pista.
- Las canciones hacen loop automatico al terminar toda la lista.
