/* ============================================================
 * flux.js — 移植自 KTBOY/shuke-lab-flux
 * WebGL 流动烟雾（域扭曲 FBM 噪声 + 三色混合）
 * 仅保留"静止流动"：固定流速，去掉鼠标悬停/搅动交互。
 * 配色改为淡紫 + 粉。
 * ============================================================ */

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2  uRes;
uniform float uTime;
uniform float uSeed;
uniform vec3  uC1;  /* 主色1 */
uniform vec3  uC2;  /* 主色2 */
uniform vec3  uC3;  /* 深色 */

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21) + uSeed);
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, amp = 0.55;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 4; i++) {   /* 4 阶：真机性能折中 */
    v += amp * noise(p);
    p = rot * p * 2.0 + 3.7;
    amp *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = uv * vec2(uRes.x / uRes.y, 1.0) * 1.6;
  float t = uTime;

  vec2 q = vec2(fbm(p + t * vec2(0.6, 0.2)),
                fbm(p + t * vec2(-0.4, 0.5) + 5.2));
  vec2 r = vec2(fbm(p + 2.2 * q + t * vec2(0.3, -0.4) + 1.7),
                fbm(p + 2.2 * q + t * vec2(-0.2, 0.3) + 8.3));
  float f = fbm(p + 2.4 * r);

  vec3 col = mix(uC1, uC2, smoothstep(0.15, 0.62, f));
  col = mix(col, uC3, smoothstep(0.60, 0.95, clamp(q.x * 1.3, 0.0, 1.0)));

  /* 左侧留白给文字，颜色向右渐浓 */
  float colorZone = smoothstep(0.55, 1.00, uv.x + 0.15 * (q.y - 0.5));
  float whiteT = smoothstep(0.50, 1.05, uv.y) * 0.55;
  float density = smoothstep(0.32, 0.85, f + 0.22 * r.x);
  vec3 base = vec3(1.0);       /* 白底 */
  float mask = clamp(colorZone * density + colorZone * 0.15, 0.0, 1.0);
  vec3 outCol = mix(base, col, mask);
  outCol = mix(outCol, base, whiteT * (1.0 - mask * 0.55));

  gl_FragColor = vec4(outCol, 1.0);
}
`;

/* 默认配色：淡紫 + 粉（index 菜单页原配色） */
const DEFAULT_THEME = {
  c1: [1.00, 0.55, 0.75],   // 粉
  c2: [0.70, 0.55, 1.00],   // 淡紫
  c3: [0.55, 0.35, 0.85],   // 深紫
  seed: 7.3
}

/* 建立并编译 webgl 程序；返回渲染器或 null（失败时调用方应清掉 canvas 并降级） */
function makeFlux(canvas, theme) {
  const t = theme || DEFAULT_THEME
  const gl = canvas.getContext('webgl', { antialias: true });
  if (!gl) return null;

  function sh(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('flux shader 编译失败', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  const vs = sh(gl.VERTEX_SHADER, VERT);
  const fs = sh(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('flux program 链接失败', gl.getProgramInfoLog(prog));
    return null;
  }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  gl.uniform3fv(gl.getUniformLocation(prog, 'uC1'), t.c1 || DEFAULT_THEME.c1);
  gl.uniform3fv(gl.getUniformLocation(prog, 'uC2'), t.c2 || DEFAULT_THEME.c2);
  gl.uniform3fv(gl.getUniformLocation(prog, 'uC3'), t.c3 || DEFAULT_THEME.c3);
  gl.uniform1f(gl.getUniformLocation(prog, 'uSeed'),
    (typeof t.seed === 'number') ? t.seed : DEFAULT_THEME.seed);

  return {
    gl, prog,
    uRes: gl.getUniformLocation(prog, 'uRes'),
    uTime: gl.getUniformLocation(prog, 'uTime'),
    flowTime: Math.random() * 100
  };
}

/* 打开/更新：canvas 元素节点 + 画布尺寸 px；出错不抛出，避免中断渲染循环 */
function render(renderer, width, height) {
  if (!renderer || !renderer.gl) return
  try {
    const { gl, uRes, uTime } = renderer;
    gl.viewport(0, 0, width, height);
    renderer.flowTime += 0.01;   /* 恒定流速：静止流动 */
    gl.uniform2f(uRes, width, height);
    gl.uniform1f(uTime, renderer.flowTime);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  } catch (e) {
    /* GL 抖动/上下文暂失：跳过本帧，不中断循环 */
  }
}

/* 便捷绑定：在页面 onReady 调用，自动初始化 canvas 渲染循环
   返回 { stop }，页面 onUnload 时调用 stop() 释放 */
function initFlux(page, theme) {
  let renderer = null
  let timer = null
  let w = 0, h = 0
  let stopped = false

  const q = wx.createSelectorQuery()
  q.select('#nb-flux').fields({ node: true, size: true })
  q.exec((res) => {
    if (stopped || !res || !res[0] || !res[0].node) return
    const { node, width, height } = res[0]
    renderer = makeFlux(node, theme)
    if (!renderer) return
    w = width; h = height
    const loop = () => {
      if (stopped || !renderer) return
      render(renderer, w, h)
      /* 用 finally 语义：无论 render 是否抛错都先排下一帧，循环不会因单帧异常而中断 */
      timer = setTimeout(loop, 33)   /* ~30fps 省电 */
    }
    loop()
  })

  return {
    stop() {
      stopped = true
      if (timer) { clearTimeout(timer); timer = null }
      renderer = null
    }
  }
}

module.exports = {
  VERT,
  FRAG,
  makeFlux,
  render,
  initFlux,
  DEFAULT_THEME
}
