/* Реестр фракций и расчёт темы по набору юнитов. Общий для live_game и панелей HUD.
 *
 * Фракция регистрируется из своего common.js:
 *   dynastiyaFactionTheme.register({
 *       id: 'legion',
 *       isUnit: function (spec) { ... },          // спецификация без тега армии
 *       classes: { army: ['legionui', 'mixedui'], // классы body: чистая тема, смешанная
 *                  selection: ['legion', 'mixed'] },
 *       image: function (source, folder, mixed) { ... } // вариант штатной картинки
 *   });
 *
 * Тема — строка: 'vanilla', '<id>' (все юниты фракции) или '<id>-mixed'
 * (фракция вместе с другими). Правила оформления остаются в CSS фракции.
 */
var dynastiyaFactionTheme = window.dynastiyaFactionTheme || (window.dynastiyaFactionTheme = (function () {
    'use strict';
    var factions = [];
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
                if (!faction) return;
                own++;
                counts[faction.id] = (counts[faction.id] || 0) + 1;
            });
            if (!own) return 'vanilla';
            // При нескольких фракциях тему задаёт самая многочисленная, порядок
            // регистрации разрешает равенство.
            var main = _.max(factions, function (faction) { return counts[faction.id] || 0; });
            return own === list.length && counts[main.id] === own ? main.id : main.id + '-mixed';
        },
        parse: function (value) {
            var match = /^(.*?)(-mixed)?$/.exec(value || '');
            var faction = self.find(match[1]);
            return faction ? { faction: faction, mixed: !!match[2] } : { faction: null, mixed: false };
        },
        valid: function (value) {
            return value === 'vanilla' || !!self.parse(value).faction;
        }
    };
    return self;
}()));
