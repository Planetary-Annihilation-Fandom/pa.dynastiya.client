/* Typed identifiers of the current game context. Every value is an object with
 * `type` and `key`, so a match, an army and a player cannot be confused when
 * they scope stored data or are compared. A missing context returns null.
 *
 * Sources: session values written by the stock scenes (lobbyId, invite_uuid,
 * uberId, displayName) and the live_game army. live_game mirrors its context to
 * localStorage for its panels, whose own session storage is empty. */
(function () {
    'use strict';
    if (window.dynastiyaIds) return;
    var mirrorKey = 'dynastiya.ids';

    function session(name) {
        try {
            var raw = sessionStorage[name];
            if (raw !== undefined && raw !== 'undefined') return JSON.parse(raw);
        } catch (e) {}
        return window.gSessionBackup ? gSessionBackup[name] : undefined;
    }
    function mirror() {
        try { return JSON.parse(localStorage[mirrorKey] || 'null') || {}; } catch (e) { return {}; }
    }
    // The scene that owns the game state; its panels read the mirror instead.
    function owner() { return window.model && ko.isObservable(model.armyIndex); }
    function fromSession() { return session('invite_uuid') !== undefined || session('lobbyId') !== undefined; }

    var ids = {
        // A new server (local game, save, replay) gets a fresh invite_uuid in
        // connect_to_game; joins take the host's uuid, reconnects restore both.
        match: function () {
            if (!owner() && !fromSession()) return mirror().match || null;
            var lobby = session('lobbyId') || '', server = session('invite_uuid') || '';
            if (!lobby && !server) return null;
            return { type: 'match', key: lobby + '/' + server, lobby: lobby || null, server: server || null };
        },
        lobby: function () {
            if (!owner() && !fromSession()) return mirror().lobby || null;
            var lobby = session('lobbyId');
            return lobby ? { type: 'lobby', key: String(lobby) } : null;
        },
        player: function () {
            var uber = session('uberId'), name = session('displayName');
            if (uber === undefined && !owner()) return mirror().player || null;
            if (!uber && !name) return null;
            return { type: 'player', key: String(uber || name), uberId: uber || null, name: name || null };
        },
        // Spectators and replays have no army of their own.
        army: function () {
            if (!owner()) return mirror().army || null;
            var index = model.armyIndex();
            if (index === undefined || index === null || index < 0) return null;
            return { type: 'army', key: String(index), index: index, id: ko.unwrap(model.armyId) };
        },
        key: function (id) { return id ? id.type + ':' + id.key : null; },
        same: function (a, b) { return ids.key(a) === ids.key(b); },
        // Changes when the owner's match or army changes.
        revision: ko.observable(0)
    };
    window.dynastiyaIds = ids;

    if (!owner()) return;
    var last;
    function update() {
        var value = { match: ids.match(), lobby: ids.lobby(), player: ids.player(), army: ids.army() };
        var text = JSON.stringify(value);
        if (text === last) return;
        last = text;
        try { localStorage[mirrorKey] = text; } catch (e) {}
        ids.revision(ids.revision() + 1);
    }
    [model.armyIndex, model.armyId, model.lobbyId].forEach(function (source) {
        if (ko.isObservable(source)) source.subscribe(update);
    });
    update();
}());
