/* Общие признаки фракции; спецификации могут содержать тег армии после .json. */
var legion = window.dynastiyaLegion || (window.dynastiyaLegion = {});
legion.specPath = function (spec) { return typeof spec === 'string' ? spec.replace(/\.json\..*$/, '.json') : ''; };
legion.isUnit = function (spec) { return /\/l_[^/]+\//.test(legion.specPath(spec)); };
// Тема HUD, значок игрока, лобби и вкладки подключаются к общему модулю фракций.
// Красный вариант — только Legion, фиолетовый — Legion вместе с другими фракциями.
if (window.dynastiyaFactionTheme) dynastiyaFactionTheme.register({
    id: 'legion',
    isUnit: legion.isUnit,
    classes: { army: ['legionui', 'mixedui'], selection: ['legion', 'mixed'] },
    image: function (source, folder, mixed) {
        return 'coui://ui/mods/dynastiya.legion/img/' + folder + '/' + (mixed ? 'purple' : 'red') + '/' + source.split('/').pop();
    },
    player: {
        classes: ['legcom', 'mixcom'],
        icons: ['coui://ui/mods/dynastiya.legion/img/icon_player_outline_l.png',
            'coui://ui/mods/dynastiya.legion/img/icon_player_outline_m.png']
    },
    lobby: {
        commanders: ['overwatch', 'cyclops', 'cataphract', 'raptor', 'quad', 'tank'].map(function (name) {
            return '/pa/units/commanders/l_' + name + '/l_' + name + '.json';
        }),
        frame: 'dyn-legion',
        title: '!LOC:Legion',
        hint: '!LOC:To play as the Legion, choose a Commander with a red frame.'
    },
    tabs: [
        ['L_factory', 'factory', true],
        ['L_combat', 'combat', true],
        ['L_utility', 'utility', true],
        ['L_vehicle', 'vehicle'],
        ['L_bot', 'bot'],
        ['L_air', 'air'],
        ['L_sea', 'sea'],
        ['L_orbital', 'orbital', true],
        ['L_orbital_structure', 'orbital_structure', true],
        ['L_ammo', 'ammo', true]
    ]
});
