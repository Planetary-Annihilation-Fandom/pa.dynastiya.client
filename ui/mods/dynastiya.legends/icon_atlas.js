/** Регистрирует стратегические значки отдельных суперформ для карты. */
(function () {
    var icons = ['palegends_zeus', 'palegends_atlas', 'palegends_ares', 'palegends_helios', 'palegends_uran'];
    model.strategicIcons(model.strategicIcons().concat(icons.filter(function (icon) {
        return model.strategicIcons().indexOf(icon) === -1;
    })));
}());
