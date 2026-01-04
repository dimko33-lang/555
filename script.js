// script.js
// Два режима: 'euclid' и 'minkowski'.
// Euclid: обычные точки, окружности; Minkowski: оси ct/x и семейство гипербол.

(() => {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const toggleBtn = document.getElementById('toggleGeomBtn');
  const modeLabel = document.getElementById('modeLabel');
  const clearBtn = document.getElementById('clearBtn');
  const info = document.getElementById('info');
  const showCircles = document.getElementById('showCircles');

  let dpr = window.devicePixelRatio || 1;
  let mode = 'euclid'; // 'euclid' или 'minkowski'
  let points = [];
  let nearest = null;

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    draw();
  }
  window.addEventListener('resize', resize);
  resize();

  function clear() { points = []; nearest = null; info.innerText = ''; draw(); }
  clearBtn.addEventListener('click', clear);

  function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left);
    const y = (e.clientY - rect.top);
    return {x,y};
  }

  function findNearest(pt) {
    if (points.length === 0) return null;
    let best = null; let bestD = Infinity;
    for (let p of points) {
      const dx = p.x - pt.x; const dy = p.y - pt.y; const d = Math.hypot(dx, dy);
      if (d < bestD) { bestD = d; best = p; }
    }
    return {p: best, d: bestD};
  }

  function center() { return {cx: canvas.clientWidth/2, cy: canvas.clientHeight/2}; }

  function draw() {
    const w = canvas.clientWidth; const h = canvas.clientHeight;
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle = '#fff'; ctx.fillRect(0,0,w,h);

    if (mode === 'euclid') drawEuclid(); else drawMinkowski();
  }

  function drawEuclid() {
    // фон сетки лёгкая
    ctx.strokeStyle = '#fafafa'; ctx.lineWidth = 1;
    const step = 40;
    for (let gx = 0; gx <= canvas.clientWidth; gx += step) { ctx.beginPath(); ctx.moveTo(gx,0); ctx.lineTo(gx,canvas.clientHeight); ctx.stroke(); }
    for (let gy = 0; gy <= canvas.clientHeight; gy += step) { ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(canvas.clientWidth,gy); ctx.stroke(); }

    // окружности, если включено
    if (showCircles.checked) {
      for (let p of points) {
        ctx.beginPath(); ctx.strokeStyle = 'rgba(100,100,255,0.12)'; ctx.lineWidth = 1;
        const r = p.r || 50; ctx.arc(p.x, p.y, r, 0, Math.PI*2); ctx.stroke();
      }
    }

    // точки
    for (let p of points) {
      ctx.beginPath(); ctx.fillStyle = (p === nearest) ? '#e34' : '#165'; ctx.arc(p.x, p.y, (p === nearest) ? 6 : 4, 0, Math.PI*2); ctx.fill();
    }
  }

  function drawMinkowski() {
    const {cx, cy} = center();
    ctx.save(); ctx.translate(cx, cy);

    // light grid
    ctx.strokeStyle = '#f0f0f0'; ctx.lineWidth = 1;
    const step = 40;
    for (let gx = -Math.ceil(cx/step); gx <= Math.ceil(cx/step); gx++) {
      ctx.beginPath(); ctx.moveTo(gx*step, -cy); ctx.lineTo(gx*step, cy); ctx.stroke(); }
    for (let gy = -Math.ceil(cy/step); gy <= Math.ceil(cy/step); gy++) {
      ctx.beginPath(); ctx.moveTo(-cx, gy*step); ctx.lineTo(cx, gy*step); ctx.stroke(); }

    // axes
    ctx.beginPath(); ctx.strokeStyle = '#222'; ctx.lineWidth = 2; ctx.moveTo(-cx,0); ctx.lineTo(cx,0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,cy); ctx.lineTo(0,-cy); ctx.stroke();

    ctx.fillStyle = '#000'; ctx.font = '14px Arial'; ctx.fillText('x', cx-20, -6); ctx.fillText('ct', 6, -cy+18);

    // hyperbolas
    const sValues = [40, 80, 140, 220];
    for (let s of sValues) {
      ctx.beginPath(); ctx.strokeStyle = 'rgba(200,50,50,0.9)'; ctx.lineWidth = 1.5;
      let first=true;
      for (let px = -cx; px <= cx; px += 1) {
        const t = Math.sqrt(px*px + s*s);
        const sx = px; const sy = -t;
        if (first) { ctx.moveTo(sx,sy); first=false; } else ctx.lineTo(sx,sy);
      }
      ctx.stroke();

      ctx.beginPath(); first=true;
      for (let px = -cx; px <= cx; px += 1) {
        const t = -Math.sqrt(px*px + s*s);
        const sx = px; const sy = -t;
        if (first) { ctx.moveTo(sx,sy); first=false; } else ctx.lineTo(sx,sy);
      }
      ctx.stroke();

      // spacelike branches
      ctx.beginPath(); ctx.strokeStyle = 'rgba(50,120,50,0.9)'; ctx.lineWidth = 1.2; first=true;
      for (let py = -cy; py <= cy; py += 1) {
        const t = -py; const val = t*t - s*s; if (val >= 0) {
          const x1 = Math.sqrt(val); const sx1 = x1; const sy1 = -t;
          if (first) { ctx.moveTo(sx1,sy1); first=false; } else ctx.lineTo(sx1,sy1);
        }
      }
      ctx.stroke();

      ctx.beginPath(); ctx.strokeStyle='rgba(50,120,50,0.9)'; ctx.lineWidth=1.2; first=true;
      for (let py = -cy; py <= cy; py += 1) {
        const t = -py; const val = t*t - s*s; if (val >= 0) {
          const x2 = -Math.sqrt(val); const sx2 = x2; const sy2 = -t;
          if (first) { ctx.moveTo(sx2,sy2); first=false; } else ctx.lineTo(sx2,sy2);
        }
      }
      ctx.stroke();
    }

    // origin
    ctx.beginPath(); ctx.fillStyle = '#000'; ctx.arc(0,0,4,0,Math.PI*2); ctx.fill();
    ctx.restore();

    if (points.length > 0) {
      const {cx, cy} = center();
      // show invariant for nearest to mouse stored in nearestM (we compute in mousemove)
      // if nearest exists, show its s^2
      if (nearest) {
        const p = nearest;
        const x = p.x - cx; const t = -(p.y - cy); const s2 = t*t - x*x;
        info.innerText = `Точка #${points.indexOf(p)+1}: s^2 = ${s2.toFixed(2)} (t=${t.toFixed(1)}, x=${x.toFixed(1)})`;
      } else {
        // show table
        let lines = ['Таблица инвариантов (s^2 = t^2 - x^2):'];
        for (let i=0;i<points.length;i++) {
          const p = points[i]; const x = p.x - cx; const t = -(p.y - cy); const s2 = t*t - x*x;
          lines.push(`#${i+1}: s^2=${s2.toFixed(1)} (t=${t.toFixed(1)}, x=${x.toFixed(1)})`);
        }
        info.innerText = lines.join('\n');
      }
    }
  }

  canvas.addEventListener('mousemove', e => {
    const m = getMousePos(e);
    if (mode === 'euclid') {
      const res = findNearest(m);
      nearest = res ? res.p : null;
      info.innerText = res ? `Ближайшая точка: (${nearest.x.toFixed(0)}, ${nearest.y.toFixed(0)}), расстояние = ${res.d.toFixed(2)}` : 'Нет точек';
    } else {
      if (points.length === 0) { info.innerText = 'Нет точек'; nearest = null; draw(); return; }
      let best=null; let bestD=Infinity;
      for (let p of points) { const dx=p.x-m.x; const dy=p.y-m.y; const d=Math.hypot(dx,dy); if (d<bestD) {bestD=d; best=p;} }
      nearest = best;
      if (best) {
        const {cx, cy} = center(); const x = best.x - cx; const t = -(best.y - cy); const s2 = t*t - x*x;
        info.innerText = `Точка #${points.indexOf(best)+1}: s^2 = ${s2.toFixed(2)} (t=${t.toFixed(1)}, x=${x.toFixed(1)})`;
      }
    }
    draw();
  });

  canvas.addEventListener('click', e => {
    const m = getMousePos(e);
    points.push({x:m.x, y:m.y}); draw();
  });

  canvas.addEventListener('dblclick', e => {
    const m = getMousePos(e); const res = findNearest(m);
    if (res && res.d < 30) { points = points.filter(p => p !== res.p); nearest = null; draw(); }
  });

  toggleBtn.addEventListener('click', () => {
    if (mode === 'euclid') { mode = 'minkowski'; toggleBtn.innerText = 'Показать Евклида'; modeLabel.innerText = 'Режим: Минковский'; }
    else { mode = 'euclid'; toggleBtn.innerText = 'Показать Минковского'; modeLabel.innerText = 'Режим: Евклид'; info.innerText = ''; }
    draw();
  });

  // initial points
  points = [ {x:100, y:120}, {x:240, y:200}, {x:400, y:90} ];
  draw();
})();
