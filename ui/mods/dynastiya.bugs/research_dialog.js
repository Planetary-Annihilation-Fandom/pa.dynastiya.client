var model = {};
var handlers = {};
$(document).ready(function () {
    var research = dynastiyaResearch, modal, icons = [];
    function update() { var completed = research.state().completed; icons.forEach(function (entry) { entry.image.style.opacity = completed.indexOf(entry.spec) >= 0 ? '1' : '0.35'; }); }
    function open() {
        if (modal && modal.isOpen()) return;
        icons = [];
        modal = api.dynastiyaUi.modal({
            title: loc('!LOC:Research'),
            content: function (body) {
                bugs.research.unlocks.forEach(function (pair) {
                    var row = document.createElement('div');
                    row.style.cssText = 'display:flex;align-items:center;gap:12px;margin:4px 0;';
                    var image = document.createElement('img');
                    image.src = 'coui:/' + pair[0].replace('.json', '_icon_buildbar.png');
                    image.width = 48; image.height = 48;
                    row.appendChild(image);
                    row.appendChild(api.dynastiyaUi.text('text', loc(bugs.research.labels[pair[0]]), { expressive: true }));
                    icons.push({spec: pair[0], image: image});
                    body.appendChild(row);
                });
                update();
            },
            actions: [{label: loc('!LOC:Close'), cancel: true}],
            onClose: function () { api.Panel.message(api.Panel.parentId, 'dynastiya.research.close'); }
        });
    }
    handlers['dynastiya.research'] = research.accept;
    handlers['dynastiya.research.open'] = open;
    research.state.subscribe(update);
    app.registerWithCoherent(model, handlers);
    api.Panel.query(api.Panel.parentId, 'panel.invoke', ['dynastiyaResearchState']).then(function (value) { research.accept(value); open(); });
});
