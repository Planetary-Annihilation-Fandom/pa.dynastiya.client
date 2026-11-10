# Loading indicators

`animation.css` is loaded through `global_mod_list` and stops `img.working` rotation, including hidden instances. The mod replaces `ui/main/shared/img/working.svg` with an original, static hourglass; existing visibility bindings, dimensions, localized status text and tooltips remain in control of each scene.

This applies to every stock scene using that resource and class. It does not disable other SVGs, shadows, transitions or animations. Background: [issue #7](https://github.com/Planetary-Annihilation-Fandom/pa.dynastiya.server/issues/7).
