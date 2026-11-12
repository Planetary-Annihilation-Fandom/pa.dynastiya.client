/* Offline games have no lobbyId. A fresh lobby supplies a local match identity;
 * reloading live_game keeps it, and the next lobby replaces it. */
(function () {
    'use strict';
    localStorage.dynastiya_research_match = 'local-' + Date.now() + '-' + Math.random();
    localStorage.removeItem('dynastiya_research');
}());
