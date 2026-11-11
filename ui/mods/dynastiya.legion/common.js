/* Общие признаки фракции; спецификации могут содержать тег армии после .json. */
var legion = window.dynastiyaLegion || (window.dynastiyaLegion = {});
legion.commanders = ['overwatch', 'cyclops', 'cataphract', 'raptor', 'quad', 'tank'].map(function (name) {
    return '/pa/units/commanders/l_' + name + '/l_' + name + '.json';
});
legion.specPath = function (spec) { return typeof spec === 'string' ? spec.replace(/\.json\..*$/, '.json') : ''; };
legion.isUnit = function (spec) { return /\/l_[^/]+\//.test(legion.specPath(spec)); };
legion.faction = function (specs) {
    var list = _.values(specs || {});
    var count = list.filter(legion.isUnit).length;
    return count ? (count === list.length ? 'legion' : 'mixed') : 'vanilla';
};
// Тема HUD: классы и картинки Legion подключаются к общему модулю фракционных тем.
// Красный вариант — только Legion, фиолетовый — Legion вместе с другими фракциями.
if (window.dynastiyaFactionTheme) dynastiyaFactionTheme.register({
    id: 'legion',
    isUnit: legion.isUnit,
    classes: { army: ['legionui', 'mixedui'], selection: ['legion', 'mixed'] },
    image: function (source, folder, mixed) {
        return 'coui://ui/mods/dynastiya.legion/img/' + folder + '/' + (mixed ? 'purple' : 'red') + '/' + source.split('/').pop();
    }
});
