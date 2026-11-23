// Group the PA Legends portraits without moving Knockout-managed commander tiles.
(function () {
    var portraits = '.profile-commander';
    var picker = '#commander-picker .div-commander-picker, #ai-commander-picker .div-commander-picker';

    loadCSS('coui://ui/mods/dynastiya.legends/commander-classes.css');

    // Class portraits use their own art in both the pickers and the roster.
    function isLegendary(container) {
        var image = container.querySelector(portraits);
        return !!image && DynastiyaCommanderClasses.isSuperformIcon(image.getAttribute('src'));
    }

    // Mark the four class tiles and the current selections, including AI and remote players.
    function updateRoster() {
        $(picker).each(function () {
            var hasClasses = false;
            $(this).children('.div-commander-picker-item').each(function () {
                var legendary = !!isLegendary(this);
                $(this).toggleClass('palegends-class', legendary);
                hasClasses = hasClasses || legendary;
            });
            $(this).toggleClass('palegends-picker', hasClasses);
        });

        $('.slot-player-commander').each(function () {
            var legendary = !!isLegendary(this);
            $(this).toggleClass('palegends-slot', legendary)
                .closest('.slot-player').toggleClass('palegends-slot-row', legendary);
        });
    }

    // Watch for portraits being added, removed or loaded. Ignore unrelated roster changes.
    function containsPortrait(node) {
        return node.nodeType === 1 && (node.matches(portraits) || node.querySelector(portraits));
    }

    // The catalogue may arrive after the first roster render.
    DynastiyaCommanderClasses.loaded.done(updateRoster);

    // Put the labels outside the Knockout loops and use flex order for the visual grouping.
    $(function () {
        var roster = document.querySelector('.game_roster');
        if (!roster) return;

        $(picker).prepend(
            $('<div class="palegends-picker-label palegends-picker-title">').text(loc('!LOC:Commander Classes')),
            $('<div class="palegends-picker-label palegends-picker-divider">').text(loc('!LOC:Other Commanders'))
        );

        var observer = new MutationObserver(function (records) {
            var changed = _.some(records, function (record) {
                if (record.type === 'attributes') return record.target.matches(portraits);
                return _.some(record.addedNodes, containsPortrait) || _.some(record.removedNodes, containsPortrait);
            });
            if (changed) updateRoster();
        });
        observer.observe(roster, { subtree: true, childList: true, attributes: true, attributeFilter: ['src'] });
        updateRoster();
    });
})();
