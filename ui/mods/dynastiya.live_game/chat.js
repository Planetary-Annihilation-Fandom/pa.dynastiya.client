(function () {
    'use strict';
    if (model.dynastiyaChat) return;
    model.dynastiyaChat = true;
    var timer;
    var closed = false;
    function stop() { clearTimeout(timer); timer = undefined; }
    function schedule() {
        stop();
        if (closed || model.chatSelected()) return;
        var messages = model.visibleChat.peek();
        if (messages.length) timer = setTimeout(model.removeOldChatMessages,
            Math.max(1, messages[0].time_stamp + 15001 - Date.now()));
    }

    model.removeOldChatMessages = function () {
        var cutoff = Date.now() - 15000;
        var messages = model.visibleChat();
        var expired = 0;
        while (expired < messages.length && messages[expired].time_stamp < cutoff) expired++;
        // One KO/DOM update for a burst, keeping the stock message lifetime.
        if (expired) model.visibleChat.splice(0, expired);
        schedule();
    };

    var cachedLog = [];
    model.dynastiyaChatLog = ko.pureComputed(function () {
        if (model.chatSelected()) cachedLog = model.chatLog().slice();
        return cachedLog;
    });
    // Retain history and its DOM while closed; append accumulated messages once
    // on opening rather than rebuilding an invisible log for every message.
    $('.div_chat_log_feed').attr('data-bind', 'foreach: dynastiyaChatLog');
    var subscriptions = [model.visibleChat.subscribe(schedule), model.chatSelected.subscribe(function (open) {
        if (open) stop();
        else model.removeOldChatMessages();
    })];
    model.setup = function () {
        $(window).focus(function () { model.active(true); });
        $(window).blur(function () { model.active(false); });
        api.Panel.query(api.Panel.parentId, 'panel.invoke', ['chatState']).then(model.state);
        schedule();
    };
    $(window).on('unload.dynastiyaChat', function () {
        closed = true;
        stop();
        subscriptions.forEach(function (subscription) { subscription.dispose(); });
        model.dynastiyaChatLog.dispose();
    });
}());
