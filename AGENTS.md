# ASHENHEIM — Project Rules

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
2. Run `npm run build`.
3. Run headless Chromium / Playwright verification across both Desktop (1280x720) and Mobile Landscape (844x390, touch enabled) to confirm zero console/WebGL errors.

## Autonomous GitHub Orchestration Rules

### Session Boot Protocol (Before Touching Code)
1. Run `git fetch origin && git status`.
2. Read `docs/project/STATE.md` and open GitHub Issues (`gh issue list --state open`).
3. Claim the highest-priority open issue (or create one if starting new work) by assigning `status:in-progress` label, commenting a brief execution plan, and creating/checking out a feature branch (`feat/<issue-number>-<slug>` or `fix/<issue-number>-<slug>`).

### Continuous Issue & Bug Tracking
- Whenever a bug, performance regression, visual artifact, or improvement is discovered during coding or Playwright verification, immediately file a GitHub Issue (`gh issue create`) with reproduction steps, console logs, and appropriate `type:*` / `area:*` labels.
- Never leave `TODO` comments in code without a corresponding tracked GitHub Issue number (`// TODO(#12): ...`).

### Verification Gate & Automated GitHub Delivery (Before Ending Any Task)
1. Run `npx tsc --noEmit` and `npm run build`.
2. Run headless Chromium / Playwright verification across both Desktop (1280x720) and Mobile Landscape (844x390, touch enabled) to confirm zero console/WebGL errors.
3. Update `docs/project/STATE.md`, `docs/project/ROADMAP.md`, and `docs/project/CHANGELOG.md` to reflect exact current progress, next steps, and any newly discovered issues.
4. Commit with Conventional Commits (`feat(#N): ...`, `fix(#N): ...`, `docs: update project state`), push the branch to `origin`, open a PR (`gh pr create`), squash-merge it into `main` (`gh pr merge --squash --delete-branch`) once checks pass, and close the resolved GitHub Issue (`gh issue close <N>`).
