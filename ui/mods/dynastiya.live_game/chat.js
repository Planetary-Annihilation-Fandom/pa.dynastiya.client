(function () {
    'use strict';
    if (model.dynastiyaChat) return;
    model.dynastiyaChat = true;

    model.removeOldChatMessages = function () {
        var cutoff = Date.now() - 15000;
        var messages = model.visibleChat();
        var expired = 0;
        while (expired < messages.length && messages[expired].time_stamp < cutoff) expired++;
        // One KO/DOM update for a burst, keeping the stock lifetime and timer.
        if (expired) model.visibleChat.splice(0, expired);
    };
}());
