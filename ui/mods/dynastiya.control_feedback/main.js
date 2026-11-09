(function () {
    'use strict';
    if (model.dynastiyaInstantSceneSwitch) return;
    model.dynastiyaInstantSceneSwitch = true;

    // Called by the existing hide_splash handler after scene/mod readiness.
    // Switch input here instead of waiting for the splash's animationend.
    model.hideSplash = function () {
        if (model.splashHidden) return;
        model.splashHidden = true;
        $('#community-mods-status-container').hide();
        $('#splash_overlay').hide();
        if (DEV_MODE || model.hasPlayedIntroOnce()) setLayoutMode(true);
        else model.playIntroVideo();
    };

    model.finishVideo = function () {
        if (!model.showPlayer()) return;
        api.panels.player.blur();
        model.showPlayer(false);
        model.playerUrl('');
        model.markIntroAsPlayed();
        if (!model.isPlayingGWIntro()) UIMediaUtility.startMusic();
        model.isPlayingGWIntro(false);
        $('#black_splash').removeClass();
        model.showGame();
    };
}());
