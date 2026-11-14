# PF2e Scene Vision Range

A FoundryVTT module for the Pathfinder 2e system. It adds a **Player Vision Range** field to the **Pathfinder** tab of *Configure Scene*.

When the field is set (for example to 30 ft), player-owned tokens on that scene cannot see farther than 30 ft, even in bright light or with darkvision. Use it for fog, smoke, blizzards, underwater murk, and similar scenes.

- **It only caps.** Senses that are already shorter stay as they are. A PC without darkvision still can't see in the dark.
- **It only changes sight.** Hearing, tremorsense, and other non-visual senses are unchanged. That covers light perception, basic sight, darkvision, see invisibility, and any other sight-type detection mode.
- **It only affects player-owned tokens.** NPC vision is unchanged. Tokens count as player-owned when a non-GM user owns their actor, so PCs, companions, and familiars are all included.
- **Leave the field blank for no limit.** Blank, zero, and negative values all mean no limit.

It works with PF2e's rules-based vision turned on or off. If [libWrapper](https://github.com/ruipin/fvtt-lib-wrapper) is active, the module uses it.

## Install

**In Foundry:** *Add-on Modules → Install Module → Manifest URL*, paste:

```
https://github.com/Kantharr/pf2e-scene-vision-range/releases/latest/download/module.json
```

Then enable **PF2e Scene Vision Range** in the world's *Manage Modules*, open a scene's *Configure Scene → Pathfinder* tab, and set **Player Vision Range**.

## Compatibility

- Foundry VTT v14
- PF2e system 8.x (verified against 8.4.0)

## How it works

- The value is stored as the scene flag `flags.pf2e-scene-vision-range.visionRange`, in scene units.
- `TokenDocument#prepareData` is wrapped. That method already includes PF2e's rules-based vision and token active effects. After it runs, the wrapper caps `sight.range` and the `range` of every detection mode whose type is `SIGHT`.
- When the flag changes, the scene's tokens are re-prepared and vision is rebuilt for everyone viewing that scene.

## Development

```bash
npm install
npm run typecheck
npm test
npm run build      # -> dist/ is the installable module
npm run deploy     # build + copy dist/ into %LOCALAPPDATA%/FoundryVTT/Data/modules
npm run watch      # rebuild + deploy on every change
```

Set `FOUNDRY_MODULES_DIR` to deploy to a different Foundry data folder.

## Releasing

Push a `vX.Y.Z` tag. `.github/workflows/release.yml` builds the module, patches the version and download URL in `module.json`, and attaches `module.zip` and `module.json` to a GitHub release. `scripts/release.ps1` is git-ignored and handles the bump, commit, tag, and push in one step.
