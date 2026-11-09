// Diagnostic only: injected explicitly through CDP, not loaded by modinfo.
(function () {
    if (window.dynLatencyProbe) window.dynLatencyProbe.stop();
    var frames = [], eventFrames = [], moves = 0, last = 0, raf, active = true;
    var pending = [];
    function move() { moves++; pending.push(performance.now()); }
    function frame(t) {
        if (!active) return;
        if (last) frames.push(t-last);
        last=t;
        while(pending.length) eventFrames.push(performance.now()-pending.shift());
        raf=requestAnimationFrame(frame);
    }
    function stats(values) {
        var a=values.slice().sort(function(a,b){return a-b;});
        return {n:a.length,median:a.length?a[Math.floor(a.length*.5)]:null,p95:a.length?a[Math.floor(a.length*.95)]:null,max:a.length?a[a.length-1]:null,over50ms:a.filter(function(x){return x>50;}).length};
    }
    document.addEventListener('mousemove',move,true);
    raf=requestAnimationFrame(frame);
    window.dynLatencyProbe={stop:function(){active=false;cancelAnimationFrame(raf);document.removeEventListener('mousemove',move,true);return {frames:stats(frames),eventToRaf:stats(eventFrames),moves:moves,visibility:document.visibilityState};}};
    return true;
}());
