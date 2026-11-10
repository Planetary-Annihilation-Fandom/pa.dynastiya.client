var legionLiveGameEconLoaded;

function legionLiveGameEcon() {
  if (legionLiveGameEconLoaded) {
    return;
  }
  legionLiveGameEconLoaded = true;

  try {
    var themeSetting =
      "ON";

    if (themeSetting !== "ON") {
      return;
    }

    loadCSS("coui://ui/mods/dynastiya.legion/css/legion_econ.css");

    handlers.legionui = function (payload) {
      require([
        "coui://ui/mods/dynastiya.legion/common_functions.js",
      ], function (common) {
        common.bodyPanelClass(payload);
      });
    };
  } catch (e) {
    console.error(e);
    console.error(JSON.stringify(e));
  }
}
legionLiveGameEcon();
