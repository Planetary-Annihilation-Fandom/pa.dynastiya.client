/* Each source sheet gets its own overrides, so selectors cannot leak between scenes. */
(function () {
    'use strict';
    if (window.dynastiyaFlatEffectsLoaded) return;
    window.dynastiyaFlatEffectsLoaded = true;
    // Coherent predates :focus-visible. Track Tab versus pointer input without
    // blurring controls or cancelling their normal click/keyboard actions.
    document.addEventListener('keydown', function (event) {
        if (event.keyCode === 9 && !event.altKey && !event.ctrlKey && !event.metaKey)
            document.documentElement.classList.add('dynastiya-keyboard-focus');
    }, true);
    document.addEventListener('mousedown', function () {
        document.documentElement.classList.remove('dynastiya-keyboard-focus');
    }, true);
    var base = 'coui://ui/mods/dynastiya.flat_effects/';
    var installed = {};
    // Generated with the CSS: panels need no separate inventory request before
    // installing styles. The JSON inventory remains available to build tools.
    /* resource-index:start */
    var inventory = [["main/game/community_mods/css/start.css","main__game__community_mods__css__start.css",0],["main/game/galactic_war/gw_play/gw_play.css","main__game__galactic_war__gw_play__gw_play.css",0],["main/game/game_over/game_over.css","main__game__game_over__game_over.css",0],["main/game/live_game/live_game.css","main__game__live_game__live_game.css",0],["main/game/live_game/live_game_celestial_control.css","main__game__live_game__live_game_celestial_control.css",0],["main/game/live_game/live_game_options_bar.css","main__game__live_game__live_game_options_bar.css",0],["main/game/live_game/live_game_paused_popup.css","main__game__live_game__live_game_paused_popup.css",0],["main/game/live_game/live_game_unit_alert.css","main__game__live_game__live_game_unit_alert.css",0],["main/game/matchmaking/matchmaking.css","main__game__matchmaking__matchmaking.css",0],["main/game/start/start.css","main__game__start__start.css",0],["main/shared/css/global.css","main__shared__css__global.css",1],["main/shared/css/landing_page.css","main__shared__css__landing_page.css",0],["main/shared/js/thirdparty/bootstrap-3.0.3/css/bootstrap.css","main__shared__js__thirdparty__bootstrap-3.0.3__css__bootstrap.css",1],["main/uberbar/uberbar.css","main__uberbar__uberbar.css",0],["mods/dynastiya.map_generator/map_generator.css","mods__dynastiya.map_generator__map_generator.css",0]];
    /* resource-index:end */
    function install(link) {
        if (link.tagName !== 'LINK' || !link.href) return;
        var href = link.href.split(/[?#]/)[0];
        inventory.forEach(function (entry) {
            if (installed[entry[0]]) return;
            if (href.slice(-entry[0].length) !== entry[0] && !(entry[2] && href === 'bundle://boot/boot.css')) return;
            installed[entry[0]] = true;
            var override = document.createElement('link');
            override.rel = 'stylesheet';
            override.href = base + entry[1];
            document.head.appendChild(override);
        });
    }
    function scan(node) {
        if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE') return;
        install(node);
        if (node.querySelectorAll) Array.prototype.forEach.call(node.querySelectorAll('link[href]'), install);
    }
    // Coherent can put parsed links in body, and the generator inserts one in
    // its fragment. Watch the document, but scan only newly added subtrees.
    new MutationObserver(function (changes) {
        changes.forEach(function (change) {
            if (change.type === 'attributes') install(change.target);
            else Array.prototype.forEach.call(change.addedNodes, scan);
        });
    }).observe(document.documentElement, {childList:true, subtree:true, attributes:true, attributeFilter:['href']});
    scan(document);
}());
