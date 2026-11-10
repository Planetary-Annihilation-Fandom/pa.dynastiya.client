// Exercise stock CSS and mounted overrides in PA's Coherent, including hit testing.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const cdp = require(path.resolve(__dirname, '../../../../docs/En/Modding/Debug/cdp.js'));
const port = Number(process.argv[2] || 9881);
const media = process.argv[3] || 'C:/workroot/software/steam/steamapps/common/Planetary Annihilation Titans/media';
const target = 'game/start/start.html';
async function read(body) {
    await cdp.sleep(200);
    const value = await cdp.evaluate(port, target, body);
    if (value.startsWith('THROW:')) throw Error(value);
    return JSON.parse(value);
}
async function main() {
    const tabs = await read(`var saved=model.communityTabGroup(),results=[];
        try {
            model.communityTabGroup('news');
            results.push(model.liveStreamsTimer===undefined && model.miniboardTimer===undefined);
            model.toggleLiveStreamsTab();
            results.push(model.liveStreamsTimer!==undefined && model.miniboardTimer===undefined);
            model.toggleLiveStreamsTab();
            results.push(model.liveStreamsTimer===undefined);
            model.toggleLeaderboardTab();
            results.push(model.miniboardTimer!==undefined && model.liveStreamsTimer===undefined);
            model.toggleLeaderboardTab();
            results.push(model.miniboardTimer===undefined);
            return results;
        } finally { model.communityTabGroup(saved); }`);
    assert.deepEqual(tabs, [true, true, true, true, true]);
    for (const [scene, selector, openClass, html] of [
        ['live_game_action_bar', '.div_command_bar_top_cont', 'show', '<div class="div_command_bar_top_cont"><div class="div_command_bar receiveMouse"><div class="div_command_item show"><a id="hit">Command</a></div></div></div>'],
        ['live_game_action_bar', '.div_orders_bar_top_cont', 'show', '<div class="div_orders_bar_top_cont"><div class="div_orders_bar receiveMouse"><div class="div_order_item_menu show"><a id="hit">Order</a></div></div></div>'],
        ['live_game_action_bar', '.div_order_item_menu', 'show', '<div class="div_order_item_menu"><a id="hit" class="receiveMouse">Submenu</a></div>'],
        ['live_game_action_bar', '.div_command_item', 'show', '<div class="div_command_item"><a id="hit" class="receiveMouse">Item</a></div>'],
        ['live_game_econ', '.div-econ-bar', 'show-econ', '<div class="div-econ-bar ignoreMouse"><div class="div-metal receiveMouse"><a id="hit" class="receiveMouse">Metal</a></div></div>']
    ]) {
        const stock = fs.readFileSync(path.join(media, 'ui/main/game/live_game', scene + '.css'), 'utf8');
        await read(`var frame=document.createElement('iframe');frame.id='dynastiya-hidden-check';
            frame.style.cssText='position:fixed;left:0;top:100px;width:600px;height:300px;z-index:99999';
            document.body.appendChild(frame);var d=frame.contentDocument;d.open();d.write('<html><head></head><body></body></html>');d.close();
            var style=d.createElement('style');style.textContent=${JSON.stringify(stock + '\n* { -webkit-transition: none !important; transition: none !important; }')};d.head.appendChild(style);
            var link=d.createElement('link');link.rel='stylesheet';link.href='coui://ui/mods/dynastiya.layout/${scene}.css';d.head.appendChild(link);
            d.body.innerHTML=${JSON.stringify('<div id="behind" style="position:fixed;inset:0;left:0;top:0;width:100%;height:100%"></div>' + html)};
            var root=d.querySelector(${JSON.stringify(selector)});root.style.cssText='position:absolute;left:40px;top:40px;width:150px;height:120px;margin:0;opacity:1';
            var hit=d.getElementById('hit');hit.style.cssText='display:block;position:absolute;left:0;top:0;width:100px;height:30px;pointer-events:all';return true;`);
        try {
            await cdp.waitFor(port, target, `var d=document.getElementById('dynastiya-hidden-check').contentDocument;return d.styleSheets.length===2 && d.styleSheets[1].cssRules.length>0;`, 10, 100);
            const result = await read(`var d=document.getElementById('dynastiya-hidden-check').contentDocument,w=d.defaultView,
                root=d.querySelector(${JSON.stringify(selector)}),hit=d.getElementById('hit');
                function check(open) {
                    root.classList.toggle(${JSON.stringify(openClass)},open);
                    var r=hit.getBoundingClientRect();return {visible:w.getComputedStyle(hit).visibility,
                        pointer:w.getComputedStyle(hit).pointerEvents,hit:d.elementFromPoint(r.left+5,r.top+5)===hit,
                        width:root.offsetWidth,height:root.offsetHeight};
                }
                return [check(false),check(true),check(false),check(true)];`);
            for (let i = 0; i < 4; i++) {
                assert.equal(result[i].visible, i % 2 ? 'visible' : 'hidden', selector);
                assert.equal(result[i].hit, !!(i % 2), selector + ' hit testing');
                if (!(i % 2)) assert.equal(result[i].pointer, 'none');
                assert.equal(result[i].width, result[0].width, 'retain preparation geometry');
                assert.equal(result[i].height, result[0].height, 'retain preparation geometry');
            }
        } finally {
            await read(`document.getElementById('dynastiya-hidden-check').remove();return true;`);
        }
    }
    console.log('Coherent: optional feed timers stop/restart; closed HUD controls reject hits, reopen and retain geometry');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
