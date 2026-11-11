var legionLiveGameMenuLoaded;

function legionLiveGameMenu() {
  if (legionLiveGameMenuLoaded) {
    return;
  }
  legionLiveGameMenuLoaded = true;

  try {
    var themeSetting =
      "ON";

    if (themeSetting !== "ON") {
      return;
    }

    loadCSS("coui://ui/mods/dynastiya.legion/css/legion_menu.css");

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
legionLiveGameMenu();
