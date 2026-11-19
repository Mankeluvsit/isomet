---
name: babylon-arpg
description: Strict engineering rules for the ASHENHEIM Babylon.js + TypeScript survival-ARPG vertical slice.
---

# Babylon ARPG Engineering Rules

## 60 FPS Mobile Performance
- Never create individual Mesh clones for trees, rocks, grass, or props — always use ThinInstance or InstancedMesh with freezeWorldMatrix().
- Reuse pre-allocated scratch vectors (TmpVectors) inside onBeforeRenderObservable to avoid per-frame GC spikes.

## Engine & Self-Contained Assets
- Initialize WebGPUEngine with automatic fallback to Engine (WebGL2).
- Generate all PBR textures (DynamicTexture / RawTexture), low-poly flat-shaded meshes (convertToFlatShadedMesh()), and Web Audio API sound effects procedurally in TypeScript — zero external CDN URLs or missing asset files.

## Strict Dual-Platform UI
- Never shrink desktop CSS for mobile.
- Maintain two distinct DOM mount trees in src/ui/ (mobile touch-first landscape thumb ergonomics with floating left joystick, right-thumb skill arc, context-smart primary button, and full-screen touch drawers; desktop with Diablo II life/mana orbs, stamina bridge, WASD + click-to-move, and hover comparison tooltips), plus a manual UI mode toggle for testing.

## Automated Verification Loop
After implementing any feature or milestone:
1. Run `npx tsc --noEmit` to confirm zero TypeScript errors.
2. Start the Vite dev server and verify via headless Chromium / Playwright in both Desktop (1280x720) and Mobile Landscape (844x390, hasTouch: true) that the canvas renders cleanly with zero console or WebGL errors.
