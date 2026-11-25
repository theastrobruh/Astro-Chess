# Astro~Chess — Avatar Image Guide

This guide tells you exactly what files to create and where to place them so the avatar system loads correctly.

---

## Player Avatars — `assets/avatars/players/`

These are the 6 avatars the human player can choose in the profile modal.

| Filename       | Description / Theme Suggestion                                  |
|----------------|-----------------------------------------------------------------|
| `avatar_1.png` | **Knight** — A medieval space-knight with a visor helmet        |
| `avatar_2.png` | **Queen** — A regal astronaut queen with a glowing crown        |
| `avatar_3.png` | **Bishop** — A mystical mage/bishop with astral robes           |
| `avatar_4.png` | **Rook** — A futuristic armored tower-knight                    |
| `avatar_5.png` | **Pawn** — A heroic young warrior, scrappy and determined       |
| `avatar_6.png` | **King** — An epic cosmic king with stellar armour              |

### Specifications
- **Format:** PNG with **transparent background**
- **Resolution:** `256 × 256 px` (recommended), minimum `128 × 128 px`
- **Style:** Torso-up silhouette (like a chess piece character portrait)
- **Color palette:** Space/astral theme — deep purples, indigos, cyans, golds
- The game displays these at ~`56px` in the info panel and ~`48px` in the profile card

---

## NPC / CPU Avatars — `assets/avatars/npc/`

These are the avatars shown for CPU opponents during a match.

| Filename          | When it's used                              |
|-------------------|---------------------------------------------|
| `cpu_easy.png`    | When playing vs CPU on **Easy** difficulty  |
| `cpu_medium.png`  | When playing vs CPU on **Medium** difficulty|
| `cpu_default.png` | Generic fallback if a specific one is missing |

### Suggestions
- `cpu_easy.png` — A friendly, slightly comedic robot / old chess tutor look
- `cpu_medium.png` — A sharper, more menacing mechanical chess engine
- `cpu_default.png` — A neutral robot face

### Specifications
- **Format:** PNG with **transparent background**
- **Resolution:** `256 × 256 px` (recommended)
- **Same style** as player avatars: torso-up portrait

---

## Notes
- If an avatar file is missing, the game falls back gracefully to the initial-letter circle avatar.
- The avatar selection grid in the Profile modal loads images from `assets/avatars/players/avatar_1.png` through `avatar_6.png`.
- CPU avatars are resolved by difficulty in `js/ui.js` → `updatePlayerNames()`.
