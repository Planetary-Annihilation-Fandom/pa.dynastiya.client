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
