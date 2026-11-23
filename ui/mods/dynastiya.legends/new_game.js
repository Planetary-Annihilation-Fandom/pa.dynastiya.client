// Arrange the existing Knockout tiles by the server's commander-class catalogue.
(function () {
    var catalogue = DynastiyaCommanderClasses;
    var pickerSelector = '#commander-picker .div-commander-picker, #ai-commander-picker .div-commander-picker';
    var classes = [];
    loadCSS('coui://ui/mods/dynastiya.legends/commander-classes.css');

    // The old Dynastiya modal used an explicit close button and a scrollable body.
    function showClass(entry) {
        // The lobby closes pickers on body clicks, including clicks inside a dialog.
        var backdrop = $('<div class="dyn-class-modal-backdrop">').on('click', function (event) {
            event.stopPropagation();
        });
        // Keep Escape from reaching the lobby while the explicit-close dialog is open.
        function blockEscape(event) {
            if (event.keyCode !== 27) return;
            event.preventDefault();
            event.stopImmediatePropagation();
        }
        window.addEventListener('keydown', blockEscape, true);
        window.addEventListener('keyup', blockEscape, true);
        var dialog = $('<div class="dyn-class-modal" role="dialog" aria-modal="true">');
        var header = $('<div class="dyn-class-modal-header">');
        var close = $('<button type="button" class="dyn-class-modal-close">').text('×')
            .attr('aria-label', loc('!LOC:Close')).on('click', function (event) {
                event.stopPropagation();
                window.removeEventListener('keydown', blockEscape, true);
                window.removeEventListener('keyup', blockEscape, true);
                backdrop.remove();
            });
        header.append($('<div class="dyn-class-modal-title">').text(loc('!LOC:' + entry.name)), close);
        dialog.append(header, $('<div class="dyn-class-modal-body">')
            .append($('<img>').attr('src', 'coui://' + entry.icon),
                $('<p>').text(loc('!LOC:' + entry.description))));
        backdrop.append(dialog).appendTo(document.body);
    }

    // Keep the game's Knockout tiles intact; the visible tiles forward clicks to them.
    function preparePicker(picker) {
        var container = $(picker);
        if (container.data('dyn-classes-ready')) return;
        container.data('dyn-classes-ready', true).addClass('dyn-class-picker');
        var rows = $('<div class="dyn-class-rows">').prependTo(container);
        classes.forEach(function (item) {
            var row = $('<div class="dyn-class-row">').attr('data-class-id', item.id);
            var button = $('<button type="button" class="dyn-class-button">')
                .attr('data-class-id', item.id).attr('title', loc('!LOC:Class information'))
                .append($('<img>').attr('src', 'coui://' + item.entry.icon),
                    $('<span>').text(loc('!LOC:' + item.entry.name)))
                .on('click', function (event) { event.stopPropagation(); showClass(item.entry); });
            var frame = $('<div class="dyn-class-frame">');
            var scroll = $('<div class="dyn-class-scroll">').attr('tabindex', '0');
            frame.append(scroll, $('<div class="dyn-overflow-start">'), $('<div class="dyn-overflow-end">'));
            scroll.on('scroll', function () { updateOverflow(frame[0], this); });
            row.append(button, frame);
            rows.append(row);
        });
    }

    // Show a light edge only where content remains hidden, above the scrollbar.
    function updateOverflow(frame, area) {
        if (!area.clientWidth) return;
        $(frame).toggleClass('has-start', area.scrollLeft > 1)
            .toggleClass('has-end', area.scrollLeft + area.clientWidth < area.scrollWidth - 1);
        $(frame).children('.dyn-overflow-start, .dyn-overflow-end')
            .css('bottom', (area.offsetHeight - area.clientHeight) + 'px');
    }

    // Hidden pickers have no dimensions until after Knockout makes them visible.
    function updateAllOverflow() {
        $('.dyn-class-frame').each(function () {
            updateOverflow(this, $(this).children('.dyn-class-scroll')[0]);
        });
    }

    // The faction compatibility model does not classify Exiles, so include its known specs too.
    function isNonMla(spec) {
        return model.isCustomFaction(spec) || spec.indexOf('/pa/units/commanders/exiles_') === 0;
    }

    // Rebuild only when the game's available tiles change, preserving horizontal scroll otherwise.
    function updatePickerTiles(picker) {
        var tiles = [];
        picker.children('.div-commander-picker-item').each(function () {
            var spec = ko.dataFor(this);
            var entry = catalogue.getClass(spec);
            if (entry && spec !== entry.superform) tiles.push({ node: this, spec: spec, id: catalogue.getClassId(spec) });
        });
        var signature = tiles.map(function (tile) { return tile.spec + ':' + tile.node.className; }).join('|');
        if (picker.data('dyn-tile-signature') === signature) return;
        picker.data('dyn-tile-signature', signature);
        classes.forEach(function (item) {
            var scroll = picker.find('.dyn-class-row[data-class-id="' + item.id + '"] .dyn-class-scroll');
            var matching = tiles.filter(function (tile) { return tile.id === item.id; });
            matching = matching.filter(function (tile) { return isNonMla(tile.spec); })
                .concat(matching.filter(function (tile) { return !isNonMla(tile.spec); }));
            scroll.empty();
            var column;
            matching.forEach(function (tile, index) {
                if (index % 2 === 0) column = $('<div class="dyn-class-column">').appendTo(scroll);
                var copy = $(tile.node.cloneNode(true));
                copy.removeAttr('data-bind').removeAttr('style').attr('data-commander-spec', tile.spec);
                copy.find('[data-bind]').removeAttr('data-bind');
                copy.on('click', function () { tile.node.click(); });
                column.append(copy);
            });
        });
    }

    // Selection comes from the actual roster slot for the player or the chosen AI.
    function updatePickers() {
        $(pickerSelector).each(function () {
            var picker = $(this);
            preparePicker(this);
            updatePickerTiles(picker);
            var selected = null;
            var aiPicker = !!picker.closest('#ai-commander-picker').length;
            $('.slot-player-commander').each(function () {
                var slot = ko.dataFor(this);
                if (!slot) return;
                if (aiPicker ? slot.ai() && slot.playerId() === model.selectedAI() : slot.containsThisPlayer()) {
                    selected = slot.commander();
                }
            });
            var selectedClass = catalogue.getClassId(selected);
            picker.find('.dyn-class-button').each(function () {
                $(this).toggleClass('selected', this.getAttribute('data-class-id') === selectedClass);
            });
        });
    }

    // Resolve each roster slot from its bound commander, including remote players and AI.
    function updateRoster() {
        $('.slot-player-commander').each(function () {
            var slot = ko.dataFor(this);
            if (!slot || !slot.commander) return;
            var entry = catalogue.getClass(slot.commander());
            var icon = $(this).siblings('.dyn-slot-class');
            if (!icon.length) icon = $('<div class="dyn-slot-class">').insertAfter(this);
            icon.empty().attr('title', entry ? loc('!LOC:' + entry.name) : loc('!LOC:Unknown class'));
            if (entry) icon.append($('<img>').attr('src', 'coui://' + entry.icon));
            else icon.text('?');
        });
    }

    // Reconcile when Knockout replaces tiles or changes a portrait; ignore our own nodes.
    function refresh() { updatePickers(); updateRoster(); setTimeout(updateAllOverflow, 0); }
    catalogue.loaded.done(function (data) {
        classes = Object.keys(data.classes).map(function (id) { return { id: id, entry: data.classes[id] }; });
        $(function () {
            var roster = document.querySelector('.game_roster');
            if (!roster) return;
            var observer = new MutationObserver(function (records) {
                var changed = records.some(function (record) {
                    if ($(record.target).closest('.dyn-class-rows').length) return false;
                    if (record.type === 'attributes') return $(record.target).hasClass('profile-commander');
                    return Array.prototype.some.call(record.addedNodes, function (node) {
                        return node.nodeType === 1 && !$(node).is('.dyn-class-rows') && ($(node).is('.profile-commander, .div-commander-picker-item, .slot-player-commander') || $(node).find('.profile-commander').length);
                    });
                });
                if (changed) refresh();
            });
            observer.observe(roster, { subtree: true, childList: true, attributes: true, attributeFilter: ['src'] });
            window.addEventListener('resize', updateAllOverflow);
            model.showCommanderPicker.subscribe(refresh);
            model.showAICommanderPicker.subscribe(refresh);
            refresh();
        });
    });
})();
