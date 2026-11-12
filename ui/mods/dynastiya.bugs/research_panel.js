/* Research indicators use the owner's state and the shared modal component. */
(function () {
    'use strict';
    var research = dynastiyaResearch;
    handlers['dynastiya.research'] = research.accept;
    api.Panel.query(api.Panel.parentId, 'panel.invoke', ['dynastiyaResearchState']).then(research.accept);
    var button = document.createElement('button');
    button.className = 'btn_std_ix dyn-bugs-research';
    button.textContent = loc('!LOC:Research');
    button.style.cssText = 'pointer-events:auto;';
    button.addEventListener('click', function () { api.Panel.message(api.Panel.parentId, 'dynastiya.research.open'); });
    var target = document.querySelector('.body-dock') || document.body;
    target.appendChild(button);
    var visible = ko.computed(function () {
        button.style.display = research.state().enabled ? '' : 'none';
        api.Panel.onBodyResize();
    });
    window.addEventListener('unload', function () { visible.dispose(); });
}());
