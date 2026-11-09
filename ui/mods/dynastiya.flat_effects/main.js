/* Each source sheet gets its own overrides, so selectors cannot leak between scenes. */
(function () {
    'use strict';
    var base = 'coui://ui/mods/dynastiya.flat_effects/';
    var installed = {};
    $.getJSON(base + 'inventory.json', function (inventory) {
        function update() {
            var links = document.querySelectorAll('link[href]');
            Array.prototype.forEach.call(links, function (link) {
                var href = link.href.split('?')[0];
                inventory.forEach(function (entry) {
                    if (installed[entry.source]) return;
                    if (href.slice(-entry.source.length) !== entry.source && !(entry.bundled && href === 'bundle://boot/boot.css')) return;
                    installed[entry.source] = true;
                    var override = document.createElement('link');
                    override.rel = 'stylesheet';
                    override.href = base + entry.override;
                    document.head.appendChild(override);
                });
            });
        }
        new MutationObserver(update).observe(document.head, {childList:true, subtree:true, attributes:true, attributeFilter:['href']});
        update();
    });
}());
