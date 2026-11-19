# ASHENHEIM

Vertical slice playable demo of a browser-based 3D isometric survival-ARPG fusing Valheim atmosphere with Diablo II loot/combat.

## Run

```bash
npm install
npm run dev
```

Open the printed URL. Choose an archetype on the title screen.

## Controls

Desktop: WASD move, mouse click move/attack, Space dodge, 1-3 skills, E interact/gather, B build mode, arrow keys rotate camera.
Mobile: floating joystick, context action button, skill arc, dodge. Toggle UI mode in settings via "Toggle UI Mode".

## Structure

- src/engine - Babylon engine, camera, rendering pipeline
- src/world - terrain, props
- src/entities - player, enemies, ground items
- src/systems - loot, inventory, crafting, audio
- src/ui - title screen, HUD (mobile + desktop)
