(function () {
    'use strict';
    if (model.dynastiyaServerBrowser) return;
    model.dynastiyaServerBrowser = true;
    var closed = false;
    var polls = [];

    function publish(target, games, compareDerived) {
        var previous = Object.create(null);
        function key(game) { return JSON.stringify([game.lobby_id, game.uuid, game.host, game.port]); }
        target.peek().forEach(function (game) { previous[key(game)] = game; });
        var next = games.map(function (game) {
            var old = previous[key(game)];
            // Filtering annotates rows in place. Those fields are not beacon data.
            return old && (compareDerived ? _.isEqual(old, game)
                : _.isEqual(_.omit(old, ['retired', 'sort']), _.omit(game, ['retired', 'sort']))) ? old : game;
        });
        var current = target.peek();
        if (current.length !== next.length || next.some(function (game, index) { return game !== current[index]; })) target(next);
    }

    var processBeacon = model.processGameBeacon;
    model.processGameBeacon = function (beacon) {
        // Stock pads these arrays with open slots. Do not mutate the discovery
        // payload: it can be reused by later LAN updates and by other handlers.
        var copy = _.assign({}, beacon, { game: _.assign({}, beacon.game) });
        if (_.isArray(beacon.player_names)) copy.player_names = beacon.player_names.slice();
        if (_.isArray(beacon.spectator_names)) copy.spectator_names = beacon.spectator_names.slice();
        var args = Array.prototype.slice.call(arguments);
        args[0] = copy;
        return processBeacon.apply(model, args);
    };

    var filter = model.filteredGameList;
    var displayed = ko.observableArray([]);
    model.filteredGameList = ko.computed(function () {
        // Stock/Community Mods filters mutate plain retired/sort fields. Keep a
        // snapshot so a changed retired class rebinds, while unchanged rows stay.
        publish(displayed, filter().map(function (game) {
            return _.assign({}, game);
        }), true);
        return displayed.peek();
    });

    function poll(request, accept, delay, failure, isCurrent) {
        var timer;
        var pending;
        function stop() { clearTimeout(timer); timer = undefined; }
        function update() {
            stop();
            if (closed || pending) return pending;
            var response = request();
            if (!response) return;
            pending = response;
            response.done(function (data) {
                if (!closed && (!isCurrent || isCurrent())) accept(data);
            }).fail(function () {
                if (!closed && (!isCurrent || isCurrent()) && failure) failure();
            }).always(function () {
                pending = null;
                if (!closed && model.autoRefresh()) timer = setTimeout(update, delay(response));
            });
            return response;
        }
        polls.push(stop);
        return update;
    }

    model.disableGameUpdates();
    model.disableGameUpdates = function () { polls.forEach(function (stop) { stop(); }); };
    model.updateServerData = poll(function () { return api.net.requestCurrentGames(); }, function (data) {
        var games = [];
        (data.Games || []).forEach(function (entry) {
            if (entry.BuildVersion !== model.buildVersion() || !entry.TitleData) return;
            try {
                var beacon = JSON.parse(entry.TitleData);
                beacon.server_type = 'uber';
                var game = model.processGameBeacon(beacon, entry.Region, entry.LobbyID);
                if (game) games.push(game);
            } catch (error) { console.log('failed to parse TitleData'); }
        });
        model.failedToRetrieveGameList(false);
        publish(model.gameList, games);
    }, function () { return 1000; }, function () {
        model.failedToRetrieveGameList(true);
        model.autoRefresh(false);
    });

    var requestedUrl;
    model.updateCustomServerGames = poll(function () {
        requestedUrl = model.customServersUrl();
        return requestedUrl ? $.getJSON(requestedUrl) : null;
    }, function (entries) {
        var games = [];
        entries.forEach(function (entry) {
            if (entry.version != model.buildVersion() || !entry.beacon) return;
            try {
                var beacon = JSON.parse(entry.beacon);
                beacon.server_type = 'custom';
                var game = model.processGameBeacon(beacon, 'Custom: ' + beacon.region, entry.id, entry.ip, entry.port);
                if (game) games.push(game);
            } catch (error) { console.log('failed to process custom game'); }
        });
        publish(model.customGameList, games);
    }, function (response) {
        if (requestedUrl !== model.customServersUrl()) return 0;
        return response.state() === 'resolved' ? model.customServersRefresh() || 5000 : model.customServersRetry() || 30000;
    }, null, function () { return requestedUrl === model.customServersUrl(); });

    handlers.update_beacon = handlers.new_beacon = function (payload) {
        if (!payload || !payload.beacon) return;
        var beacon = _.assign({}, payload.beacon, { server_type: 'local' });
        var game = payload.version == model.buildVersion()
            ? model.processGameBeacon(beacon, 'Local', beacon.uuid, payload.host, payload.port) : null;
        var games = model.lanGameList().slice();
        var index = _.findIndex(games, function (entry) { return entry.host == payload.host && entry.port == payload.port; });
        if (index !== -1) {
            if (game) games[index] = game;
            else games.splice(index, 1);
        } else if (game) games.push(game);
        publish(model.lanGameList, games);
    };
    handlers.lost_beacon = function (payload) {
        if (!payload || !payload.host) return;
        publish(model.lanGameList, model.lanGameList().filter(function (game) {
            // Older engine events only identify a host; newer ones may identify
            // its port too. Never remove unrelated hosts after the matching row.
            return game.host != payload.host || (payload.port !== undefined && game.port != payload.port);
        }));
    };

    if (model.loadGamesFilter) {
        // Community Mods schedules loadGameFilter (singular), but only defines
        // loadGamesFilter. Repair its existing minute refresh without a new fetch.
        clearTimeout(model.gameFilterTimeout);
        model.loadGameFilter = function () { if (!closed) model.loadGamesFilter(); };
        model.gameFilterTimeout = setTimeout(model.loadGameFilter, 60000);
    }

    $(window).on('unload.dynastiyaServerBrowser', function () {
        closed = true;
        model.disableGameUpdates();
        clearTimeout(model.gameFilterTimeout);
        model.filteredGameList.dispose();
        filter.dispose();
    });
}());
