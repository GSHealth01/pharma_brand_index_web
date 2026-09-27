// A port of pdfplumber's default table extraction ("lines" strategy) onto pdf.js,
// so the Borderline / Cosmetics PDFs parse the same way the Python backend parsed them.
//
// Pipeline (mirrors pdfplumber/table.py + pdfminer's path classification):
//   drawn paths -> lines / rects / curves -> edges -> snap + join -> intersections
//   -> cells -> tables -> rows -> text of the chars whose centre falls in each cell.
import { OPS } from "pdfjs-dist/legacy/build/pdf.mjs";

const SNAP = 3;
const JOIN = 3;
const EDGE_MIN = 3;
const INTERSECT = 3;
const X_TOL = 3;
const Y_TOL = 3;

// ---------- clustering helpers (pdfplumber/utils/clustering.py) ----------
function clusterList(xs, tol) {
  const sorted = [...xs].sort((a, b) => a - b);
  if (tol === 0 || sorted.length < 2) return sorted.map((x) => [x]);
  const groups = [];
  let cur = [sorted[0]];
  let last = sorted[0];
  for (const x of sorted.slice(1)) {
    if (x <= last + tol) cur.push(x);
    else {
      groups.push(cur);
      cur = [x];
    }
    last = x;
  }
  groups.push(cur);
  return groups;
}

function clusterObjects(objs, keyFn, tol) {
  const clusters = clusterList([...new Set(objs.map(keyFn))], tol);
  const idOf = new Map();
  clusters.forEach((c, i) => c.forEach((v) => idOf.set(v, i)));
  const tagged = objs.map((o, i) => ({ o, c: idOf.get(keyFn(o)), i }));
  tagged.sort((a, b) => a.c - b.c || a.i - b.i); // Python's sort is stable
  const out = [];
  let prev = -1;
  for (const t of tagged) {
    if (t.c !== prev) {
      out.push([]);
      prev = t.c;
    }
    out[out.length - 1].push(t.o);
  }
  return out;
}

// ---------- graphics -> pdfminer-style objects ----------
function pathObjects(opList, H) {
  const lines = [];
  const rects = [];
  const curves = [];
  const bboxOf = (pts) => {
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    return { x0, x1, top: H - y1, bottom: H - y0, width: x1 - x0, height: y1 - y0 };
  };

  for (let i = 0; i < opList.fnArray.length; i++) {
    if (opList.fnArray[i] !== OPS.constructPath) continue;
    const [paintOp, [data]] = opList.argsArray[i];
    if (paintOp === OPS.endPath) continue; // "n": clip-only path, never an object in pdfminer
    if (!data) continue;

    // Decode pdf.js path data into pdfminer-style ops: [kind, x, y]
    const path = [];
    for (let k = 0; k < data.length; ) {
      const op = data[k];
      if (op === 0) path.push(["m", data[k + 1], data[k + 2]]), (k += 3);
      else if (op === 1) path.push(["l", data[k + 1], data[k + 2]]), (k += 3);
      else if (op === 2) path.push(["c", data[k + 5], data[k + 6]]), (k += 7);
      else if (op === 3) path.push(["v", data[k + 3], data[k + 4]]), (k += 5);
      else if (op === 4) path.push(["h"]), (k += 1);
      else break;
    }

    // Split into subpaths at each "m" (pdfminer paint_path recursion)
    const subpaths = [];
    for (const seg of path) {
      if (seg[0] === "m" || !subpaths.length) subpaths.push([]);
      subpaths[subpaths.length - 1].push(seg);
    }
    for (const sp of subpaths) {
      const shape = sp.map((s) => s[0]).join("");
      if (shape[0] !== "m") continue;
      const pts = sp.map((s) => (s[0] === "h" ? [sp[0][1], sp[0][2]] : [s[1], s[2]]));
      if (shape === "ml" || shape === "mlh") {
        lines.push(bboxOf([pts[0], pts[1]]));
      } else if (shape === "mlllh" || shape === "mllll") {
        const [[x0, y0], [x1, y1], [x2, y2], [x3, y3], [x4, y4]] = pts;
        const closed = x0 === x4 && y0 === y4;
        const square = (x0 === x1 && y1 === y2 && x2 === x3 && y3 === y0) || (y0 === y1 && x1 === x2 && y2 === y3 && x3 === x0);
        if (closed && square) rects.push(bboxOf(pts));
        else curves.push(pts.map(([x, y]) => [x, H - y]));
      } else {
        curves.push(pts.map(([x, y]) => [x, H - y]));
      }
    }
  }
  return { lines, rects, curves };
}

function pageEdges({ lines, rects, curves }) {
  const edges = [];
  for (const l of lines) edges.push({ ...l, orientation: l.top === l.bottom ? "h" : "v" });
  for (const r of rects) {
    edges.push({ x0: r.x0, x1: r.x1, top: r.top, bottom: r.top, width: r.width, height: 0, orientation: "h" });
    edges.push({ x0: r.x0, x1: r.x1, top: r.bottom, bottom: r.bottom, width: r.width, height: 0, orientation: "h" });
    edges.push({ x0: r.x0, x1: r.x0, top: r.top, bottom: r.bottom, width: 0, height: r.height, orientation: "v" });
    edges.push({ x0: r.x1, x1: r.x1, top: r.top, bottom: r.bottom, width: 0, height: r.height, orientation: "v" });
  }
  for (const pts of curves) {
    for (let i = 0; i + 1 < pts.length; i++) {
      const [p0, p1] = [pts[i], pts[i + 1]];
      edges.push({
        x0: Math.min(p0[0], p1[0]),
        x1: Math.max(p0[0], p1[0]),
        top: Math.min(p0[1], p1[1]),
        bottom: Math.max(p0[1], p1[1]),
        width: Math.abs(p0[0] - p1[0]),
        height: Math.abs(p0[1] - p1[1]),
        orientation: p0[0] === p1[0] ? "v" : p0[1] === p1[1] ? "h" : null,
      });
    }
  }
  return edges;
}

const edgeLen = (e) => (e.orientation === "v" ? e.height : e.width);

function snapObjects(objs, attr, tol) {
  const clusters = clusterObjects(objs, (o) => o[attr], tol);
  const out = [];
  for (const cluster of clusters) {
    const avg = cluster.reduce((s, o) => s + o[attr], 0) / cluster.length;
    for (const o of cluster) {
      const d = avg - o[attr];
      out.push(attr === "x0" ? { ...o, x0: o.x0 + d, x1: o.x1 + d } : { ...o, top: o.top + d, bottom: o.bottom + d });
    }
  }
  return out;
}

function joinEdgeGroup(edges, orientation, tol) {
  const [minP, maxP] = orientation === "h" ? ["x0", "x1"] : ["top", "bottom"];
  const sorted = edges.map((e, i) => [e, i]).sort((a, b) => a[0][minP] - b[0][minP] || a[1] - b[1]).map((x) => x[0]);
  const joined = [sorted[0]];
  for (const e of sorted.slice(1)) {
    const last = joined[joined.length - 1];
    if (e[minP] <= last[maxP] + tol) {
      if (e[maxP] > last[maxP]) {
        const r = { ...last, [maxP]: e[maxP] };
        if (maxP === "x1") r.width = r.x1 - r.x0;
        else r.height = r.bottom - r.top;
        joined[joined.length - 1] = r;
      }
    } else joined.push(e);
  }
  return joined;
}

function mergeEdges(edges) {
  const snapped = [
    ...snapObjects(edges.filter((e) => e.orientation === "v"), "x0", SNAP),
    ...snapObjects(edges.filter((e) => e.orientation === "h"), "top", SNAP),
  ];
  const groupKey = (e) => (e.orientation === "h" ? ["h", e.top] : ["v", e.x0]);
  const sorted = snapped
    .map((e, i) => [e, i])
    .sort((a, b) => {
      const [ka, kb] = [groupKey(a[0]), groupKey(b[0])];
      return ka[0] < kb[0] ? -1 : ka[0] > kb[0] ? 1 : ka[1] - kb[1] || a[1] - b[1];
    })
    .map((x) => x[0]);
  const out = [];
  let group = [];
  let key = null;
  const flush = () => group.length && out.push(...joinEdgeGroup(group, key[0], JOIN));
  for (const e of sorted) {
    const k = groupKey(e);
    if (!key || k[0] !== key[0] || k[1] !== key[1]) {
      flush();
      group = [];
      key = k;
    }
    group.push(e);
  }
  flush();
  return out;
}

const bboxKey = (e) => `${e.x0},${e.top},${e.x1},${e.bottom}`;

function findTables(edgesRaw) {
  const base = edgesRaw.filter((e) => (e.orientation === "v" || e.orientation === "h") && edgeLen(e) >= 1);
  const v0 = base.filter((e) => e.orientation === "v");
  const h0 = base.filter((e) => e.orientation === "h");
  const edges = mergeEdges([...v0, ...h0]).filter((e) => edgeLen(e) >= EDGE_MIN);

  // Intersections
  const vs = edges.filter((e) => e.orientation === "v").sort((a, b) => a.x0 - b.x0 || a.top - b.top);
  const hs = edges.filter((e) => e.orientation === "h").sort((a, b) => a.top - b.top || a.x0 - b.x0);
  const inter = new Map();
  for (const v of vs) {
    for (const h of hs) {
      if (v.top <= h.top + INTERSECT && v.bottom >= h.top - INTERSECT && v.x0 >= h.x0 - INTERSECT && v.x0 <= h.x1 + INTERSECT) {
        const k = `${v.x0},${h.top}`;
        if (!inter.has(k)) inter.set(k, { x: v.x0, y: h.top, v: new Set(), h: new Set() });
        inter.get(k).v.add(bboxKey(v));
        inter.get(k).h.add(bboxKey(h));
      }
    }
  }

  // Cells: smallest rectangle from each intersection (pdfplumber intersections_to_cells)
  const points = [...inter.values()].sort((a, b) => a.x - b.x || a.y - b.y);
  const shares = (a, b) => [...a].some((x) => b.has(x));
  const connects = (p1, p2) => (p1.x === p2.x && shares(p1.v, p2.v)) || (p1.y === p2.y && shares(p1.h, p2.h));
  const cells = [];
  for (let i = 0; i < points.length - 1; i++) {
    const pt = points[i];
    const rest = points.slice(i + 1);
    const below = rest.filter((p) => p.x === pt.x);
    const right = rest.filter((p) => p.y === pt.y);
    let found = null;
    outer: for (const b of below) {
      if (!connects(pt, b)) continue;
      for (const r of right) {
        if (!connects(pt, r)) continue;
        const br = inter.get(`${r.x},${b.y}`);
        if (br && connects(br, r) && connects(br, b)) {
          found = [pt.x, pt.y, br.x, br.y];
          break outer;
        }
      }
    }
    if (found) cells.push(found);
  }

  // Group cells sharing corners into tables (pdfplumber cells_to_tables)
  const corners = (c) => [`${c[0]},${c[1]}`, `${c[0]},${c[3]}`, `${c[2]},${c[1]}`, `${c[2]},${c[3]}`];
  let remaining = [...cells];
  let curCorners = new Set();
  let curCells = [];
  const tables = [];
  while (remaining.length) {
    const before = curCells.length;
    for (const cell of [...remaining]) {
      const cc = corners(cell);
      if (!curCells.length || cc.some((c) => curCorners.has(c))) {
        cc.forEach((c) => curCorners.add(c));
        curCells.push(cell);
        remaining.splice(remaining.indexOf(cell), 1);
      }
    }
    if (curCells.length === before) {
      tables.push([...curCells]);
      curCorners = new Set();
      curCells = [];
    }
  }
  if (curCells.length) tables.push(curCells);
  const topLeft = (t) => t.reduce((m, c) => (c[1] < m[0] || (c[1] === m[0] && c[0] < m[1]) ? [c[1], c[0]] : m), [Infinity, Infinity]);
  return tables
    .map((t, i) => [t, i])
    .sort((a, b) => {
      const [ta, tb] = [topLeft(a[0]), topLeft(b[0])];
      return ta[0] - tb[0] || ta[1] - tb[1] || a[1] - b[1];
    })
    .map((x) => x[0])
    .filter((t) => t.length > 1);
}

function tableRows(cells) {
  const sorted = cells.map((c, i) => [c, i]).sort((a, b) => a[0][1] - b[0][1] || a[0][0] - b[0][0] || a[1] - b[1]).map((x) => x[0]);
  const xs = [...new Set(cells.map((c) => c[0]))].sort((a, b) => a - b);
  const rows = [];
  let cur = [];
  let y = null;
  const flush = () => {
    if (!cur.length) return;
    const byX = new Map(cur.map((c) => [c[0], c]));
    const rowCells = xs.map((x) => byX.get(x) ?? null);
    const real = rowCells.filter(Boolean);
    rows.push({
      cells: rowCells,
      bbox: [Math.min(...real.map((c) => c[0])), Math.min(...real.map((c) => c[1])), Math.max(...real.map((c) => c[2])), Math.max(...real.map((c) => c[3]))],
    });
  };
  for (const c of sorted) {
    if (c[1] !== y) {
      flush();
      cur = [];
      y = c[1];
    }
    cur.push(c);
  }
  flush();
  return rows;
}

// ---------- text ----------
function pageChars(textContent, H) {
  const chars = [];
  for (const it of textContent.items) {
    if (!it.str) continue;
    const [a, b, c, d, e, f] = it.transform;
    const upright = b === 0 && c === 0;
    const size = Math.hypot(c, d) || Math.abs(d);
    const descent = textContent.styles[it.fontName]?.descent ?? -0.2;
    const bottomY = f + descent * size;
    const n = [...it.str].length;
    const w = it.width / n;
    let i = 0;
    for (const ch of it.str) {
      const x0 = e + i * w;
      chars.push({ text: ch, x0, x1: x0 + w, top: H - (bottomY + size), bottom: H - bottomY, upright });
      i++;
    }
    void a;
  }
  return chars;
}

const inBox = (ch, [x0, top, x1, bottom]) => {
  const v = (ch.top + ch.bottom) / 2;
  const h = (ch.x0 + ch.x1) / 2;
  return h >= x0 && h < x1 && v >= top && v < bottom;
};

/** pdfplumber extract_text (non-layout) for a set of chars. */
function extractText(chars) {
  if (!chars.length) return "";
  const words = [];
  for (const line of clusterObjects(chars, (c) => c.top, Y_TOL)) {
    const ordered = line.map((c, i) => [c, i]).sort((a, b) => a[0].x0 - b[0].x0 || a[0].x1 - b[0].x1 || a[1] - b[1]).map((x) => x[0]);
    let cur = [];
    const push = () => {
      if (cur.length)
        words.push({ text: cur.map((c) => c.text).join(""), x0: Math.min(...cur.map((c) => c.x0)), x1: Math.max(...cur.map((c) => c.x1)), top: Math.min(...cur.map((c) => c.top)) });
      cur = [];
    };
    for (const ch of ordered) {
      if (/^\s+$/.test(ch.text)) push();
      else if (cur.length) {
        const prev = cur[cur.length - 1];
        if (ch.x0 < prev.x0 || ch.x0 > prev.x1 + X_TOL || ch.top > prev.top + Y_TOL) push();
        cur.push(ch);
      } else cur.push(ch);
    }
    push();
  }
  return clusterObjects(words, (w) => w.top, Y_TOL)
    .map((line) => line.sort((a, b) => a.x0 - b.x0 || a.x1 - b.x1).map((w) => w.text).join(" "))
    .join("\n");
}

/** Equivalent of pdfplumber `page.extract_tables()` for one pdf.js page. */
export async function extractTables(page) {
  const [vx0, vy0, vx1, vy1] = page.view;
  void vx0;
  void vx1;
  const H = vy1 - vy0;
  const [opList, textContent] = await Promise.all([page.getOperatorList(), page.getTextContent()]);
  const chars = pageChars(textContent, H);
  return findTables(pageEdges(pathObjects(opList, H))).map((cells) =>
    tableRows(cells).map((row) => {
      const rowChars = chars.filter((ch) => inBox(ch, row.bbox));
      return row.cells.map((cell) => (cell ? extractText(rowChars.filter((ch) => inBox(ch, cell))) : null));
    }),
  );
}
