(function () {
    'use strict';
    // Модальное окно «Династии». Закрывается только явно: крестиком или кнопкой
    // с cancel: true. Щелчок по затемнению и Esc игнорируются, чтобы игрок не
    // пропустил предупреждение случайным нажатием.
    //
    //   var modal = api.dynastiyaUi.modal({
    //       title: 'Заголовок',
    //       size: 'lg', // необязательно: по умолчанию окно 720px, lg — по шкале Carbon
    //       content: function (body) { body.appendChild(...); },
    //       actions: [
    //           { label: 'Отмена', cancel: true },
    //           { label: 'Применить', primary: true, run: function (modal) { ... } }
    //       ],
    //       onClose: function () { ... } // крестик и cancel-кнопки
    //   });
    //   modal.update(options); modal.busy(true); modal.close();
    //
    // Кнопка без cancel не закрывает окно сама: run решает, что делать дальше.
    // Текст окна собирают из ролей api.dynastiyaUi.text: основной текст в окне — expressive.
    // Длинный список — <ul class="dyn-modal__list dyn-scroll">: он прокручивается сам, с тенями у краёв.
    api.dynastiyaUi = api.dynastiyaUi || {};
    if (api.dynastiyaUi.modal) return;
    if (!api.dynastiyaUi.text) loadScript('coui://ui/mods/dynastiya.components/text.js');

    var cssLoaded = false;
    var openCount = 0;

    // Перехват на window в фазе захвата срабатывает раньше обработчиков сцены
    // (Mousetrap, Esc лобби и меню), поэтому Esc не доходит ни до окна, ни до сцены.
    function swallowEscape(event) {
        if (!openCount || (event.keyCode !== 27 && event.key !== 'Escape')) return;
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
    }
    ['keydown', 'keypress', 'keyup'].forEach(function (type) {
        window.addEventListener(type, swallowEscape, true);
    });

    function element(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    api.dynastiyaUi.modal = function (options) {
        if (!cssLoaded) {
            loadCSS('coui://ui/mods/dynastiya.components/scroll.css');
            loadCSS('coui://ui/mods/dynastiya.components/modal.css');
            cssLoaded = true;
        }

        var backdrop = element('div', 'dyn-modal-backdrop');
        var dialog = element('div', 'dyn-modal');
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        backdrop.appendChild(dialog);

        var closed = false;
        var current;

        var self = {
            close: function () {
                if (closed) return;
                closed = true;
                openCount--;
                backdrop.parentNode && backdrop.parentNode.removeChild(backdrop);
            },
            busy: function (value) {
                dialog.classList.toggle('dyn-modal--busy', !!value);
                Array.prototype.forEach.call(dialog.querySelectorAll('button'), function (button) {
                    button.disabled = !!value;
                });
            },
            update: render,
            isOpen: function () { return !closed; }
        };

        function cancel() {
            self.close();
            if (current.onClose) current.onClose();
        }

        function render(next) {
            current = next;
            dialog.className = 'dyn-modal' + (next.size ? ' dyn-modal--' + next.size : '');
            dialog.innerHTML = '';

            var header = element('div', 'dyn-modal__header');
            var title = api.dynastiyaUi.text('heading-03', next.title || '');
            title.className += ' dyn-modal__title';
            header.appendChild(title);
            var cross = element('button', 'dyn-modal__close', '×');
            cross.type = 'button';
            cross.setAttribute('aria-label', loc('!LOC:Close'));
            cross.addEventListener('click', cancel);
            header.appendChild(cross);
            dialog.appendChild(header);

            var body = element('div', 'dyn-modal__body');
            if (next.content) next.content(body);
            dialog.appendChild(body);

            var footer = element('div', 'dyn-modal__footer');
            (next.actions || []).forEach(function (action) {
                var button = element('button', 'dyn-modal__action dyn-heading-01' +
                    (action.primary ? ' dyn-modal__action--primary' : ''), action.label);
                button.type = 'button';
                button.addEventListener('click', function () {
                    if (action.cancel) cancel();
                    else if (action.run) action.run(self);
                });
                footer.appendChild(button);
            });
            dialog.appendChild(footer);
        }

        render(options);
        openCount++;
        document.body.appendChild(backdrop);
        return self;
    };
}());
