// script.js
// Простая логика: два режима 'euclid' и 'minkowski'.
// Минковский: рисуем оси t (вверх) и x (вправо) и семейство гипербол (ct^2 - x^2 = s^2)

(() => {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const toggleBtn = document.getElementById('toggleGeomBtn');
  const modeLabel = document.getElementById('modeLabel');
  const clearBtn = document.getElementById('clearBtn');
  const info = document.getElementById('info');

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

  // Coordinate helpers for Minkowski: center is canvas center; convert pixel to (x,t)
  function center() { return {cx: canvas.clientWidth/2, cy: canvas.clientHeight/2}; }

  function draw() {
    const w = canvas.clientWidth; const h = canvas.clientHeight;
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle = '#fff'; ctx.fillRect(0,0,w,h);

    if (mode === 'euclid') {
      drawEuclid();
    } else {
      drawMinkowski();
    }
  }

  function drawEuclid() {
    // draw points and simple circles
    for (let p of points) {
      ctx.beginPath(); ctx.fillStyle = (p === nearest) ? '#e34' : '#165'; ctx.arc(p.x, p.y, (p === nearest) ? 6 : 4, 0, Math.PI*2); ctx.fill();
    }
  }

  function drawMinkowski() {
    const {cx, cy} = center();
    // Draw axes: x to right, t upward
    ctx.save();
    ctx.translate(cx, cy);

    // background grid
    ctx.strokeStyle = '#f0f0f0'; ctx.lineWidth = 1;
    const step = 40;
    for (let gx = -Math.ceil(cx/step); gx <= Math.ceil(cx/step); gx++) {
      ctx.beginPath(); ctx.moveTo(gx*step, -cy); ctx.lineTo(gx*step, cy); ctx.stroke();
    }
    for (let gy = -Math.ceil(cy/step); gy <= Math.ceil(cy/step); gy++) {
      ctx.beginPath(); ctx.moveTo(-cx, gy*step); ctx.lineTo(cx, gy*step); ctx.stroke();
    }

    // axes
    ctx.beginPath(); ctx.strokeStyle = '#222'; ctx.lineWidth = 2; // x axis
    ctx.moveTo(-cx, 0); ctx.lineTo(cx, 0); ctx.stroke();
    ctx.beginPath(); // t axis (up)
    ctx.moveTo(0, cy); ctx.lineTo(0, -cy); ctx.stroke();

    // labels
    ctx.fillStyle = '#000'; ctx.font = '14px Arial'; ctx.fillText('x', cx-20, -6); ctx.fillText('ct', 6, -cy+18);

    // Draw hyperbolas ct^2 - x^2 = s^2 for several s values
    const sValues = [40, 80, 140, 220]; // pixel units represent ct and x
    for (let s of sValues) {
      // timelike branch: t = +sqrt( (x)^2 + s^2 )
      ctx.beginPath(); ctx.strokeStyle = 'rgba(200,50,50,0.9)'; ctx.lineWidth = 1.5;
      let first = true;
      for (let px = -cx; px <= cx; px += 1) {
        const t = Math.sqrt(px*px + s*s);
        const sx = px; const sy = -t; // -t because canvas y grows downwards, we want t upward
        if (first) { ctx.moveTo(sx, sy); first = false; } else ctx.lineTo(sx, sy);
      }
      ctx.stroke();

      // negative t branch
      ctx.beginPath(); first = true;
      for (let px = -cx; px <= cx; px += 1) {
        const t = -Math.sqrt(px*px + s*s);
        const sx = px; const sy = -t;
        if (first) { ctx.moveTo(sx, sy); first = false; } else ctx.lineTo(sx, sy);
      }
      ctx.stroke();

      // spacelike branch (open left/right) for negative s^2: x = +/- sqrt(t^2 + a)
      // draw as green curves representing constant spacelike interval (we pick same s but plot x for given t)
      ctx.beginPath(); ctx.strokeStyle = 'rgba(50,120,50,0.9)'; ctx.lineWidth = 1.2;
      first = true;
      for (let py = -cy; py <= cy; py += 1) {
        const t = -py;
        const val = t*t - s*s;
        if (val >= 0) {
          const x1 = Math.sqrt(val);
          const sx1 = x1; const sy1 = -t;
          if (first) { ctx.moveTo(sx1, sy1); first = false; } else ctx.lineTo(sx1, sy1);
        }
      }
      ctx.stroke();

      ctx.beginPath(); ctx.strokeStyle = 'rgba(50,120,50,0.9)'; ctx.lineWidth = 1.2; first = true;
      for (let py = -cy; py <= cy; py += 1) {
        const t = -py;
        const val = t*t - s*s;
        if (val >= 0) {
          const x2 = -Math.sqrt(val);
          const sx2 = x2; const sy2 = -t;
          if (first) { ctx.moveTo(sx2, sy2); first = false; } else ctx.lineTo(sx2, sy2);
        }
      }
      ctx.stroke();
    }

    // draw origin marker
    ctx.beginPath(); ctx.fillStyle = '#000'; ctx.arc(0,0,4,0,Math.PI*2); ctx.fill();

    ctx.restore();

    // If there are points (in euclid coordinates), show their invariant s^2 relative to origin in Minkowski metric
    if (points.length > 0) {
      // compute nearest to mouse? We'll show a table of s^2 for all points
      let lines = ['Таблица инвариантов (s^2 = t^2 - x^2), предположим t = y - cy, x = x - cx:'];
      const {cx, cy} = center();
      for (let i=0;i<points.length;i++) {
        const p = points[i];
        const x = p.x - cx; const t = -(p.y - cy); // t up
        const s2 = t*t - x*x;
        lines.push(`#${i+1}: s^2 = ${s2.toFixed(1)} (t=${t.toFixed(1)}, x=${x.toFixed(1)})`);
      }
      info.innerText = lines.join('\n');
    }
  }

  canvas.addEventListener('mousemove', e => {
    const m = getMousePos(e);
    if (mode === 'euclid') {
      const res = findNearest(m);
      nearest = res ? res.p : null;
      info.innerText = res ? `Ближайшая точка: (${nearest.x.toFixed(0)}, ${nearest.y.toFixed(0)}), расстояние = ${res.d.toFixed(2)}` : 'Нет точек';
    } else {
      // show invariant for nearest point to mouse
      if (points.length === 0) { info.innerText = 'Нет точек'; return; }
      const {cx, cy} = center();
      let best = null; let bestD = Infinity;
      for (let p of points) {
        const dx = p.x - m.x; const dy = p.y - m.y; const d = Math.hypot(dx, dy);
        if (d < bestD) { bestD = d; best = p; }
      }
      if (best) {
        const x = best.x - cx; const t = -(best.y - cy); const s2 = t*t - x*x;
        info.innerText = `Точка #${points.indexOf(best)+1}: s^2 = ${s2.toFixed(2)} (t=${t.toFixed(1)}, x=${x.toFixed(1)})`;
      }
    }
    draw();
  });

  canvas.addEventListener('click', e => {
    const m = getMousePos(e);
    if (mode === 'euclid') {
      points.push({x:m.x, y:m.y});
      draw();
    } else {
      // in Minkowski mode, clicking also adds a point (for measuring invariants)
      points.push({x:m.x, y:m.y}); draw();
    }
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

  // initial sample points
  points = [ {x:100, y:120}, {x:240, y:200}, {x:400, y:90} ];
  draw();
})();
