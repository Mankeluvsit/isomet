# ARCHITECTURE

## Module Map
- src/engine: Babylon engine, isometric camera, lighting, post-processing, Web Audio synth
- src/world: terrain heightmap, instanced foliage/rocks, snap-to-grid building pieces
- src/entities: player archetypes, enemies, champion affix packs, 3D loot drops
- src/systems: survival/food/stamina loop, crafting, procedural loot/affix roller, local save system
- src/ui: mobile touch HUD vs desktop mouse/keyboard HUD

## Data Schemas
- PlayerStats: hp, maxHp, stamina, maxStamina, mana, maxMana, archetype, food[3], buffs
- Item: id, name, type, rarity, stats, affixes, value
- Enemy: type, hp, damage, speed, affixes, isChampion

## Babylon.js Performance Contracts
- Use ThinInstance or InstancedMesh with freezeWorldMatrix() for props
- Reuse TmpVectors in onBeforeRenderObservable
- WebGPUEngine with WebGL2 fallback

## Dual-UI State Interfaces
- UIManager builds separate DOM trees for mobile/desktop
- Manual toggle for testing
