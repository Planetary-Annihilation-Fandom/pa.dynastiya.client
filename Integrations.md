# Integrations

The original mods listed here conflict with Dynastiya. When adding an integration, add the original mod's identifier to `ui/mods/dynastiya.mod_conflicts/conflicts.js`: Dynastiya then offers to disable it.

## Godblessed Map Generator

The lobby generator is adapted from version 5.0.0-up0 by tatapstar, TT and MaréchalGryzzly. Its interface and code live in `ui/mods/dynastiya.map_generator`; the RequireJS text plugin retains its own license. JavaScript syntax and resource paths were adapted for Dynastiya and the game's browser.

## Biomes Lite

The biome definitions and editor images are from Biomes Lite 1.2.2-up0 by TATAPSTAR. The server repository also contains the definitions used for generation. The desert and lava Lite definitions use the visual settings described below.

## Ferret’s Better Biome Visuals

Biome textures and visual settings are from version 1.0.0 by ferretmaster: https://github.com/Ferret-Master/Ferrets-Better-Biome-Visuals. The author states that the assets are modified from Planetary Annihilation and that the game's licenses apply.

## Lobby System Preview

The lobby preview is adapted from Lobby System Preview 1.1.4 by mikeyh. Its interface and code live in `ui/mods/dynastiya.lobby_preview`; the original mod is available at https://forums.planetaryannihilation.com/threads/wip-server-lobby-lobby-system-preview.69144/.

## Legion Expansion

The Legion faction is from Legion Expansion 1.33.1-124674 by nicb1, Crembels, KillerKiwiJuice, Anonemous2, mgmetal13, zx0, Luther, Alpha2546, PRoeleert, wondible, mikeyh, Quitch, Stuart98, dom314, CptConundrum, Elodea, AndreasG, Clopse, Graushwein, N30N, Qzipco, WPMarshall and xankar: https://github.com/Legion-Expansion/Legion-Expansion. It is used under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License (https://creativecommons.org/licenses/by-nc-sa/4.0/), with JavaScript under the MIT License; this integration is distributed under the same terms.

Models, textures, effects, shaders, strategic icons and commander images are unchanged. The build bar layout and icon registration live in `ui/mods/dynastiya.legion`. The welcome screen, intro video button and theme setting were removed. The original HUD appearance, styles and assets are retained. The HUD scripts now share one reactive theme source for the controlled army, including panels opened later; builder and action panels follow the selection. Existing image getters and Knockout bindings are preserved, with theme adapters created once instead of on every message. Dynastiya panel presentation handles geometry and ordinary theme updates stay visible. Interface strings use Dynastiya localization.
