(function () {
    'use strict';
    if (model.showDynastiyaExiles) return;
    var modal;
    model.showDynastiyaExiles = function () {
        if (modal && modal.isOpen()) return;
        if (!api.dynastiyaUi || !api.dynastiyaUi.text) loadScript('coui://ui/mods/dynastiya.components/text.js');
        if (!api.dynastiyaUi.modal) loadScript('coui://ui/mods/dynastiya.components/modal.js');
        modal = api.dynastiyaUi.modal({
            title: loc('!LOC:Exiles'),
            content: function (body) {
                var banner = document.createElement('div');
                banner.className = 'dyn-exiles-overview-banner';
                body.appendChild(banner);
                body.appendChild(api.dynastiyaUi.text('text', loc('!LOC:A high-tech faction with mastery over teleportation and arc weaponry.'), {expressive: true}));
                var list = document.createElement('ul');
                list.className = 'dyn-modal__list';
                [loc('!LOC:More than 100 units, with full AI support.'),
                 loc('!LOC:EMP, blink teleportation, invisibility and mass transports.'),
                 loc('!LOC:Choose an Exiles Commander with a blue frame in the lobby.')].forEach(function (text) {
                    list.appendChild(api.dynastiyaUi.text('text', text, {tag: 'li', expressive: true}));
                });
                body.appendChild(list);
                var links = document.createElement('div');
                links.className = 'dyn-exiles-overview-links';
                [[loc('!LOC:View Exiles Units'), 'https://pa-pedia.com/faction/exiles'],
                 [loc('!LOC:Join Exiles Discord'), 'https://discord.gg/4f2nqDkQz9'],
                 [loc('!LOC:Support the Exiles creators'), 'https://www.patreon.com/hauntedmayhem']].forEach(function (entry) {
                    var link = document.createElement('a');
                    link.href = '#';
                    link.textContent = entry[0];
                    link.addEventListener('click', function (event) { event.preventDefault(); openExternalLink(entry[1]); });
                    links.appendChild(link);
                });
                body.appendChild(links);
            },
            actions: [{label: loc('!LOC:Close'), cancel: true}]
        });
    };
    var tabs = document.getElementById('left-panel-tabs');
    if (!tabs) return;
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'left-tab btn_std_ix';
    button.id = 'dynastiya-exiles-overview';
    button.textContent = loc('!LOC:Exiles');
    button.setAttribute('aria-haspopup', 'dialog');
    button.addEventListener('click', model.showDynastiyaExiles);
    tabs.appendChild(button);
}());
