(function () {
    'use strict';
    if (model.dynastiyaStart) return;
    model.dynastiyaStart = true;

    // Keep the stock readiness gate, but do not hold a ready screen for two seconds.
    if (typeof SPLASH_DELAY_SECONDS !== 'undefined') SPLASH_DELAY_SECONDS = 0;

    var regionRequest;
    model.requestRegions = function () {
        if (regionRequest) return regionRequest;
        regionRequest = engine.asyncCall('ubernet.getGameServerRegions');
        regionRequest.done(function (payload) {
            var data = JSON.parse(payload);
            if (data.Regions && !_.isEqual(model.uberNetRegions(), data.Regions))
                model.uberNetRegions(data.Regions);
        }).always(function () { regionRequest = null; });
        return regionRequest;
    };

    // The stock one-second update creates fresh objects. Keep unchanged rows so
    // foreach preserves their DOM, and update only the countdown text in place.
    var events = model.activeEvents;
    model.activeEvents = ko.pureComputed({
        read: events,
        write: function (incoming) {
            var previous = events();
            var next = incoming.map(function (event, index) {
                var old = previous[index];
                if (old && ko.isObservable(old.timer) && Object.keys(event).every(function (key) {
                    return key === 'timer' || old[key] === event[key];
                })) {
                    old.timer(event.timer);
                    return old;
                }
                event.timer = ko.observable(event.timer);
                return event;
            });
            if (next.length !== previous.length || next.some(function (row, i) { return row !== previous[i]; }))
                events(next);
        }
    });
    model.updateActiveEvents();

    // A computed can rerun several times before its timeout fires. Use one
    // scene-local clock instead of notifying (and persisting) reconnect data.
    model.canDirectReconnect.dispose();
    var reconnectClock = ko.observable(0);
    var reconnectTimer;
    model.canDirectReconnect = ko.computed(function () {
        clearTimeout(reconnectTimer);
        reconnectClock();
        var info = model.reconnectToGameInfo();
        if (!info) return false;
        if (info.game === 'Galactic War' || info.setup === 'replay' || info.setup === 'loadsave') return false;
        if (!model.allowUbernetActions() && info.type === 'uber') return false;
        if (info.uberId && model.uberId() != info.uberId) return false;
        if (info.timestamp && info.timestamp < Date.now() - model.reconnectToGameInfoMaxAge()) {
            model.reconnectToGameInfo(undefined);
            return false;
        }
        reconnectTimer = setTimeout(function () { reconnectClock(reconnectClock() + 1); }, 5000);
        return true;
    });

    var streamRequest;
    model.fetchLiveStreams = function () {
        // Preserve the minute refresh while a slow request is still in flight.
        if (streamRequest) return streamRequest;
        streamRequest = $.getJSON('https://ggleaderboards.com/api/v1/stream/list');
        streamRequest.done(function (response) {
            var streams = response && response.data;
            if (!_.isArray(streams)) streams = [];
            streams = streams.filter(function (stream) { return stream && typeof stream.thumbnail_url === 'string'; });
            streams.forEach(function (stream) {
                stream.channel_display_name = stream.user_name;
                stream.stream_title = stream.title;
                stream.channel_url = stream.stream_url;
                stream.preview_url_large = stream.thumbnail_url.replace('{width}', '440').replace('{height}', '248');
            });
            if (!_.isEqual(model.liveStreams(), streams)) model.liveStreams(streams);
        }).fail(function () {
            if (model.liveStreams().length) model.liveStreams([]);
        }).always(function () {
            streamRequest = null;
            model.liveStreamsReady(true);
        });
        return streamRequest;
    };
    model.fetchTwitchChannels = model.fetchLiveStreams;

    $(window).on('unload', function () {
        clearTimeout(reconnectTimer);
        model.canDirectReconnect.dispose();
    });
}());
