/* Реестр фракций: тема HUD, значок игрока, лобби и вкладки билдбара. Общий для
 * всех сцен; фракция регистрируется из своего common.js, необязательные части
 * указывает, только если они у неё есть.
 *
 *   dynastiyaFactionTheme.register({
 *       id: 'legion',
 *       isUnit: function (spec) { ... },            // спецификация без тега армии
 *       // Тема HUD (panel.js): классы body для чистой и смешанной темы.
 *       classes: { army: ['legionui', 'mixedui'], selection: ['legion', 'mixed'] },
 *       image: function (source, folder, mixed) { ... }, // вариант штатной картинки
 *       // Список игроков (players.js): классы маски и значки, [чистый, смешанный].
 *       player: { classes: ['legcom', 'mixcom'], icons: [pure, mixed] },
 *       // Лобби (lobby.js): класс рамки командира и подсказка в чате.
 *       lobby: { commanders: [...], frame: 'dyn-legion', title: '!LOC:Legion', hint: '!LOC:...' },
 *       // Билдбар (build_bar.js): [вкладка, штатная вкладка того же типа, постройки].
 *       tabs: [['L_factory', 'factory', true], ['L_bot', 'bot'], ...]
 *   });
 *
 * Тема HUD — строка: 'vanilla', '<id>' (все юниты фракции) или '<id>-mixed'
 * (фракция вместе с другими). Её задают только фракции с классами: юниты фракции
 * без своего оформления считаются чужими, как юниты MLA. Правила оформления
 * остаются в CSS фракции.
 */
var dynastiyaFactionTheme = window.dynastiyaFactionTheme || (window.dynastiyaFactionTheme = (function () {
    'use strict';
    var factions = [];
    function themed(faction) { return !!faction.classes; }
    var self = {
        factions: factions,
        register: function (faction) {
            if (!self.find(faction.id)) factions.push(faction);
        },
        find: function (id) {
            return _.find(factions, function (faction) { return faction.id === id; });
        },
        specPath: function (spec) {
            return typeof spec === 'string' ? spec.replace(/\.json\..*$/, '.json') : '';
        },
        factionOf: function (spec) {
            var path = self.specPath(spec);
            return _.find(factions, function (faction) { return faction.isUnit(path); });
        },
        // specs — массив или объект спецификаций (берутся значения).
        of: function (specs) {
            var list = _.isArray(specs) ? specs : _.values(specs || {});
            var counts = {};
            var own = 0;
            list.forEach(function (spec) {
                var faction = self.factionOf(spec);
                if (!faction || !themed(faction)) return;
                own++;
                counts[faction.id] = (counts[faction.id] || 0) + 1;
            });
            if (!own) return 'vanilla';
            // При нескольких фракциях тему задаёт самая многочисленная, порядок
            // регистрации разрешает равенство.
            var main = _.max(factions.filter(themed), function (faction) { return counts[faction.id] || 0; });
            return own === list.length && counts[main.id] === own ? main.id : main.id + '-mixed';
        },
        // Значок игрока по его командирам: чистый, если все командиры одной фракции
        // со значком; смешанный у первой присутствующей фракции со смешанным вариантом.
        player: function (specs) {
            var owners = (_.isArray(specs) ? specs : _.values(specs || {})).map(self.factionOf);
            if (!owners.length) return null;
            var first = owners[0];
            if (first && first.player && _.every(owners, function (owner) { return owner === first; }))
                return { faction: first, mixed: false };
            var mixed = _.find(factions, function (faction) {
                return faction.player && faction.player.classes[1] && owners.indexOf(faction) >= 0;
            });
            return mixed ? { faction: mixed, mixed: true } : null;
        },
        parse: function (value) {
            var match = /^(.*?)(-mixed)?$/.exec(value || '');
            var faction = self.find(match[1]);
            return faction && themed(faction) ? { faction: faction, mixed: !!match[2] } : { faction: null, mixed: false };
        },
        valid: function (value) {
            return value === 'vanilla' || !!self.parse(value).faction;
        }
    };
    return self;
}()));
