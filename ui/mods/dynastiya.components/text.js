(function () {
    'use strict';
    // Текстовые роли «Династии» (см. text.css). Элемент создаётся с классом роли,
    // поэтому размеры шрифта не задаются на месте.
    //
    //   api.dynastiyaUi.text('heading-03', 'Conflicting mods');
    //   api.dynastiyaUi.text('text', message, { expressive: true });
    //   api.dynastiyaUi.text('helper', note, { tag: 'div' });
    //
    // Роли: text, heading-01..heading-05, label, helper. Параметры: tag (по умолчанию p
    // для text, div для заголовков, span для подписей), expressive, strong.
    api.dynastiyaUi = api.dynastiyaUi || {};
    if (api.dynastiyaUi.text) return;

    loadCSS('coui://ui/mods/dynastiya.components/text.css');

    var defaultTags = { text: 'p', label: 'span', helper: 'span' };

    api.dynastiyaUi.text = function (role, content, options) {
        options = options || {};
        var node = document.createElement(options.tag || defaultTags[role] || 'div');
        node.className = 'dyn-' + role +
            (options.expressive ? ' dyn-expressive' : '') +
            (options.strong ? ' dyn-strong' : '');
        if (content !== undefined) node.textContent = content;
        return node;
    };
}());
