const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const cdp = require(path.resolve(__dirname, '../../../../docs/En/Modding/Debug/cdp.js'));
const port = Number(process.argv[2] || 9881);
const media = process.argv[3] || 'C:/workroot/software/steam/steamapps/common/Planetary Annihilation Titans/media';
const target = 'game/start/start.html';
async function read(body) {
    await cdp.sleep(200);
    const result = await cdp.evaluate(port, target, body);
    if (result.startsWith('THROW:')) throw Error(result);
    return JSON.parse(result);
}
// Fixtures exercise stock selectors and the mounted mod in the same old
// Coherent engine, without starting a match or changing player settings.
async function fixture(scene, html) {
    const stock = fs.readFileSync(path.join(media, 'ui/main/game', scene.startsWith('live_game_') ? 'live_game' : scene, scene + '.css'), 'utf8');
    await read(`var old=document.getElementById('dynastiya-layout-check');if(old)old.remove();
        var frame=document.createElement('iframe');frame.id='dynastiya-layout-check';
        frame.style.cssText='position:fixed;left:0;top:100px;width:1000px;height:500px;z-index:99999;background:#111';
        document.body.appendChild(frame);
        var doc=frame.contentDocument;doc.open();doc.write('<html><head></head><body></body></html>');doc.close();
        var style=doc.createElement('style');style.textContent=${JSON.stringify(stock)};
        var link=doc.createElement('link');link.rel='stylesheet';link.href='coui://ui/mods/dynastiya.layout/${scene}.css';doc.head.appendChild(link);doc.head.appendChild(style);
        doc.body.innerHTML=${JSON.stringify(html)};return true;`);
    await cdp.sleep(200);
    await cdp.waitFor(port, target, `var d=document.getElementById('dynastiya-layout-check').contentDocument;return d.styleSheets.length===2 && d.styleSheets[0].cssRules.length>0;`, 10, 100);
}
async function inFrame(body) {
    return read(`var doc=document.getElementById('dynastiya-layout-check').contentDocument;var win=doc.defaultView;${body}`);
}
async function main() {
    const menu = await read(`var root=document.getElementById('content-wrapper'),saved=root.style.width,results=[];
        try { [1280,1920].forEach(function(width){root.style.width=width+'px';
            var nav=document.getElementById('top-bar-nav').getBoundingClientRect(),
                build=document.getElementById('build-info').getBoundingClientRect(),
                social=document.getElementById('top-bar-right').getBoundingClientRect();
            results.push(nav.left>=build.right && nav.right<=social.left);
        });var tab=document.querySelector('.left-tab'),classes=tab.className,h=tab.parentNode.offsetHeight;
        tab.classList.toggle('left-tab-active');results.push(h===tab.parentNode.offsetHeight);tab.className=classes;
        return results;}finally{root.style.width=saved;}`);
    assert.deepEqual(menu, [true,true,true]);
    console.log('Main menu: 1280/1920 navigation does not overlap; active tab keeps panel height');
    try {
        await fixture('live_game_econ', '<div class="div-metal"><div class="div_rate_ctr_cont"><div class="div_rate_ctr_overall">0</div></div><div class="div_status_bar_display">Storage</div><div class="category_icon_metal"><img></div></div>');
        const rates = await inFrame(`var e=doc.querySelector('.div_rate_ctr_overall'),bar=doc.querySelector('.div_status_bar_display'),positions=[];
            ['0','+999.9K','(999%)','-999.9M'].forEach(function(t){e.textContent=t;positions.push(bar.getBoundingClientRect().left);});
            var img=doc.querySelector('img'),r=img.getBoundingClientRect();return {positions:positions,icon:[r.width,r.height]};`);
        assert.equal(new Set(rates.positions).size, 1);
        assert.deepEqual(rates.icon, [20,16]);
        console.log('Economy HUD: short/long rates and percentages keep storage position; unloaded icon reserves native size');
        await fixture('live_game_planets', '<div class="div_planet_list_item div_planet_list_item_wrap" style="width:260px"><div class="div_planet_list_item_left"><img class="img_planet_list_thumb"></div><div class="div_planet_list_item_center"><div class="planet_title">ОченьДлинноеНазваниеПланетыБезПробеловДляПроверкиПереноса</div><div class="engine_detail_cont"></div></div><div class="div_planet_list_item_right"><div class="div_planet_list_item_right_wrap"><div class="planet_radius">500</div><div class="planet_metal">9</div></div></div></div>');
        const planets = await inFrame(`var row=doc.querySelector('.div_planet_list_item_wrap'),name=doc.querySelector('.planet_title'),metal=doc.querySelector('.planet_metal'),engines=doc.querySelector('.engine_detail_cont');
            for(var i=0;i<20;i++){var img=doc.createElement('img');img.className='icon_engine_status';engines.appendChild(img);}
            var r=row.getBoundingClientRect(),n=name.getBoundingClientRect(),before=metal.getBoundingClientRect().left;metal.textContent='9999';
            return {inside:n.right<=r.right && row.scrollWidth<=row.clientWidth,stable:before===metal.getBoundingClientRect().left,
                engine:engines.firstChild.getBoundingClientRect().width,wrapped:engines.lastChild.offsetTop>engines.firstChild.offsetTop};`);
        assert.deepEqual(planets, {inside:true,stable:true,engine:10,wrapped:true});
        console.log('Planet HUD: long unbroken name, 9 to 9999 metal, and 20 unloaded engine icons fit without moving the numeric column');
        await fixture('live_game_options_bar', '<div class="div_ingame_options_bar_cont"><div class="btn_ingame_options"><img></div><div class="btn_ingame_options"><img></div></div><div class="div_pip_toggle_cont"><img class="img_pip"></div><div class="div_ingame_stats"><div class="div_ingame_timer">0:00</div><span>Server</span></div>');
        const options = await inFrame(`var clock=doc.querySelector('.div_ingame_timer'),next=clock.nextSibling,before=next.getBoundingClientRect().left;clock.textContent='12:59:59';
            var icon=doc.querySelector('.btn_ingame_options img'),pip=doc.querySelector('.img_pip');
            return {stable:before===next.getBoundingClientRect().left,icon:[icon.offsetWidth,icon.offsetHeight],pip:[pip.offsetWidth,pip.offsetHeight]};`);
        assert.deepEqual(options, {stable:true,icon:[28,16],pip:[31,26]});
        console.log('Options HUD: unloaded toggle/PiP icons reserve native sizes; clock growth keeps adjacent status in place');
        await fixture('new_game', '<div id="system"><div class="all-planets" style="width:100px"></div></div>');
        const tiles = await inFrame(`var row=doc.querySelector('.all-planets');for(var i=0;i<12;i++){var e=doc.createElement('div');e.className='div_planet';row.appendChild(e);}
            return {width:row.firstChild.getBoundingClientRect().width,wrap:row.lastChild.offsetTop>row.firstChild.offsetTop,inside:row.scrollWidth<=row.clientWidth};`);
        assert.deepEqual(tiles, {width:20,wrap:true,inside:true});
        console.log('Lobby: twelve planet tiles wrap without shrinking or horizontal overflow');
        await fixture('settings', '<div class="option-list"><div class="warn-group" style="width:400px"><div class="option">Server control</div><div class="warning">ОченьДлинноеЛокализованноеПредупреждениеОбОтсутствииЛокальногоСервера</div></div></div>');
        const warning = await inFrame(`var e=doc.querySelector('.warn-group');return {inside:e.scrollWidth<=e.clientWidth,wrap:win.getComputedStyle(e).flexWrap};`);
        assert.deepEqual(warning, {inside:true,wrap:'wrap'});
        console.log('Settings: server warning wraps inside its group');
    } finally {
        await read(`var f=document.getElementById('dynastiya-layout-check');if(f)f.remove();return true;`);
    }
}
main().catch(error => { console.error(error);process.exitCode=1; });
