(function () {
    'use strict';
    var modal;
    model.showDynastiyaBugs = function () {
        if (modal && modal.isOpen()) return;
        if (!api.dynastiyaUi || !api.dynastiyaUi.text) loadScript('coui://ui/mods/dynastiya.components/text.js');
        if (!api.dynastiyaUi.modal) loadScript('coui://ui/mods/dynastiya.components/modal.js');
        modal = api.dynastiyaUi.modal({
            title: loc('!LOC:Bugs'), size: 'lg',
            content: function (body) {
                var banner = document.createElement('img');
                banner.src = 'coui://ui/mods/bugs_faction/img/Bug_Menu.png';
                banner.style.cssText = 'display:block;width:100%;max-height:260px;object-fit:cover;';
                body.appendChild(banner);
                body.appendChild(api.dynastiyaUi.text('text', loc('!LOC:A biological faction with evolving swarms and research upgrades.'), {expressive: true}));
                body.appendChild(api.dynastiyaUi.text('text', loc('!LOC:To play as Bugs, choose a Commander with a green frame.'), {expressive: true}));
            },
            actions: [{label: loc('!LOC:Close'), cancel: true}]
        });
    };
    var tabs = document.getElementById('left-panel-tabs');
    if (!tabs) return;
    var button = document.createElement('button');
    button.type = 'button'; button.className = 'left-tab btn_std_ix';
    button.textContent = loc('!LOC:Bugs');
    button.addEventListener('click', model.showDynastiyaBugs);
    tabs.appendChild(button);
}());
