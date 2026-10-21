/* 方曦 · lab-type — the AI lens: raymarched ceramic eye that turns toward the cursor */
(function () {
  'use strict';
  var cv = document.getElementById('eye'); if (!cv) return;
  var html = document.documentElement;
  var RM = html.classList.contains('rm');
  function err(m) { html.dataset.glError = (html.dataset.glError || '') + ' eye:' + m; }
  var gl = null;
  try { gl = cv.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: true }); } catch (e) { }
  if (!gl) { cv.classList.add('no-gl'); return; }

  var VS = 'attribute vec2 p;varying vec2 v;void main(){v=p;gl_Position=vec4(p,0.,1.);}';
  var FS = [
    'precision highp float;',
    'varying vec2 v;uniform vec2 uLook;uniform float uT;uniform float uPx;',
    'vec3 ry(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(c*p.x+s*p.z,p.y,-s*p.x+c*p.z);}',
    'vec3 rx(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(p.x,c*p.y-s*p.z,s*p.y+c*p.z);}',
    'float smax(float a,float b,float k){float h=clamp(.5-.5*(b-a)/k,0.,1.);return mix(b,a,h)+k*h*(1.-h);}',
    'float cylZ(vec3 p,float r,float z0,float z1){vec2 d=vec2(length(p.xy)-r,max(z0-p.z,p.z-z1));return min(max(d.x,d.y),0.)+length(max(d,0.));}',
    'float cylX(vec3 p,float r,float x0,float x1){vec2 d=vec2(length(p.yz)-r,max(x0-p.x,p.x-x1));return min(max(d.x,d.y),0.)+length(max(d,0.));}',
    'float ell(vec3 p,vec3 r){float k0=length(p/r);float k1=length(p/(r*r));return k0*(k0-1.)/k1;}',
    'vec2 map(vec3 p){',
    ' vec3 g=ry(p,-uLook.x);vec3 q=rx(g,-uLook.y);float r=length(q.xy);',
    ' float sh=smax(length(q)-1.,q.z-.6,.1);',
    ' sh=smax(sh,-max(r-.68,.16-q.z),.014);',
    ' sh=max(sh,-(abs(q.z+.03)-.007));',
    ' sh=max(sh,-max(abs(q.x)-.006,q.y-.0));',
    ' vec2 m=vec2(sh,1.);',
    ' float b=cylZ(q,.655,.0,.5);',
    ' b=min(b,cylZ(q,.555,.0,.56)-.003);',
    ' b=min(b,cylZ(q,.445,.0,.6)-.003);',
    ' b+=.0016*sin(r*190.)*step(.345,r)*step(r,.44);',
    ' if(b<m.x)m=vec2(b,2.);',
    ' float o=length(vec2(r-.605,q.z-.515))-.026;',
    ' if(o<m.x)m=vec2(o,4.);',
    ' float dm=ell(q-vec3(0.,0.,.6),vec3(.34,.34,.12));',
    ' if(dm<m.x)m=vec2(dm,3.);',
    ' vec3 a=vec3(abs(q.x),q.y,q.z);',
    ' float pod=cylX(a,.2,.8,1.08)-.025;',
    ' if(pod<m.x)m=vec2(pod,1.);',
    ' float ax=cylX(a,.105,.98,1.2);',
    ' ax=min(ax,cylX(a,.16,1.085,1.115));',
    ' if(ax<m.x)m=vec2(ax,2.);',
    ' vec2 t=vec2(length(g.xy)-1.2,g.z);',
    ' float gr=length(max(abs(t)-vec2(.02,.062),0.))-.01;',
    ' if(gr<m.x)m=vec2(gr,5.);',
    ' return m;}',
    'vec3 nor(vec3 p){vec2 e=vec2(.0012,-.0012);return normalize(e.xyy*map(p+e.xyy).x+e.yyx*map(p+e.yyx).x+e.yxy*map(p+e.yxy).x+e.xxx*map(p+e.xxx).x);}',
    'vec3 irr(vec3 n){vec3 c=mix(vec3(.26,.23,.2),vec3(.95,.95,.93),smoothstep(-.7,.75,n.y));c+=vec3(.75,.3,.06)*smoothstep(.05,-.9,n.y)*.55;return c;}',
    'vec3 env(vec3 d){vec3 c=mix(vec3(.07,.065,.06),vec3(.8,.8,.78),smoothstep(-.28,.32,d.y));',
    ' c+=vec3(.75,.3,.05)*smoothstep(-.05,-.65,d.y)*.8;',
    ' float key=smoothstep(.3,.16,abs(d.x+.42))*smoothstep(.26,.14,abs(d.y-.44))*step(0.,d.z);c+=vec3(2.6)*key;',
    ' float rim=smoothstep(.07,.012,abs(d.x-.74))*smoothstep(.7,.45,abs(d.y-.05));c+=vec3(1.7,1.65,1.6)*rim;',
    ' c+=vec3(.9)*smoothstep(.82,.97,d.y);return c;}',
    'float ao(vec3 p,vec3 n){float o=0.,s=1.;for(int i=1;i<=3;i++){float h=.035*float(i);o+=(h-map(p+n*h).x)*s;s*=.6;}return clamp(1.-2.4*o,0.,1.);}',
    'float shd(vec3 ro,vec3 rd){float res=1.,t=.02;for(int i=0;i<14;i++){float h=map(ro+rd*t).x;res=min(res,10.*h/t);t+=clamp(h,.02,.2);if(res<.02||t>2.5)break;}return clamp(res,0.,1.);}',
    'void main(){',
    ' vec2 uv=v;vec3 ro=vec3(0.,0.,6.);vec3 rd=normalize(vec3(uv*.235,-1.));',
    ' float B=dot(ro,rd),C=dot(ro,ro)-1.27*1.27,h=B*B-C;float hit=0.,mat=0.,t=0.,dmin=9.;',
    ' if(h>0.){h=sqrt(h);t=-B-h;float tf=-B+h;for(int i=0;i<64;i++){vec2 m=map(ro+rd*t);dmin=min(dmin,m.x);if(m.x<.0011){hit=1.;mat=m.y;break;}t+=m.x;if(t>tf)break;}}',
    ' vec2 sp=(uv-vec2(.07,-.1))/vec2(.95,.92);float sa=.15*smoothstep(1.02,.66,length(sp))*smoothstep(1.,.92,max(abs(uv.x),abs(uv.y)));',
    ' if(hit<.5){gl_FragColor=vec4(vec3(.12,.09,.07)*sa,sa);return;}',
    ' vec3 p=ro+rd*t;vec3 n=nor(p);vec3 g=ry(p,-uLook.x);vec3 q=rx(g,-uLook.y);float r=length(q.xy);',
    ' vec3 L=normalize(vec3(-.55,.65,.55));float dif=clamp(dot(n,L),0.,1.);float fre=pow(1.-clamp(dot(n,-rd),0.,1.),5.);',
    ' vec3 rf=reflect(rd,n);float a=ao(p,n);float spk=pow(clamp(dot(rf,L),0.,1.),70.);',
    ' vec3 core=vec3(1.,.42,.06);float pulse=.9+.1*sin(uT*1.7);vec3 col;',
    ' if(mat<1.5){',
    '  float s=dif>0.?shd(p+n*.004,L):0.;',
    '  vec3 alb=vec3(.88,.87,.85);',
    '  col=alb*(vec3(1.05,1.,.95)*dif*s*.9+irr(n)*.62)*a;',
    '  col+=env(rf)*(.04+.55*fre)*a+vec3(1.)*spk*.55*s;',
    '  col+=core*.3*pulse*smoothstep(.84,.66,r)*smoothstep(.3,.56,q.z)*a;',
    ' }else if(mat<2.5){',
    '  col=vec3(.022)*irr(n)*a+env(rf)*(.05+.85*fre)*a*.85+vec3(1.)*pow(clamp(dot(rf,L),0.,1.),140.)*1.3;',
    '  col+=core*.5*pulse*exp(-(r-.34)*16.)*step(.34,r)*smoothstep(.0,.6,n.z)*step(.2,q.z);',
    ' }else if(mat<3.5){',
    '  float rq=r/.34;float ang=atan(q.y,q.x);',
    '  vec3 c=mix(vec3(1.,.9,.62)*2.3,vec3(1.,.42,.05)*1.4,smoothstep(.0,.3,rq));',
    '  c=mix(c,vec3(.45,.05,.01)*.7,smoothstep(.5,.78,rq));',
    '  c=mix(c,vec3(.012),smoothstep(.76,.93,rq));',
    '  c*=.84+.16*sin(rq*26.-uT*1.8)*smoothstep(.16,.3,rq)*(1.-smoothstep(.62,.74,rq));',
    '  c*=.9+.1*sin(ang*24.)*smoothstep(.25,.5,rq);',
    '  col=c*pulse+env(rf)*(.04+.9*fre)+vec3(1.)*pow(clamp(dot(rf,L),0.,1.),200.)*2.;',
    ' }else if(mat<4.5){',
    '  vec3 alb=vec3(1.,.42,.08);col=alb*irr(n)*.3*a+env(rf)*alb*.8*a+alb*.35*pulse;',
    ' }else{',
    '  col=vec3(.05)*irr(n)*a+env(rf)*(.07+.8*fre)*a*.8+vec3(1.)*spk*.9;',
    ' }',
    ' col=pow(clamp(col,0.,1.),vec3(.4545));',
    ' gl_FragColor=vec4(col,1.);}'
  ].join('\n');

  function sh(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) err(gl.getShaderInfoLog(s));
    return s;
  }
  var pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { err(gl.getProgramInfoLog(pr)); cv.classList.add('no-gl'); return; }
  gl.useProgram(pr);
  var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var uLook = gl.getUniformLocation(pr, 'uLook'), uT = gl.getUniformLocation(pr, 'uT');

  var phone = Math.min(screen.width, window.innerWidth) <= 760;
  var dprCap = phone ? 1 : 1.25;
  var size = 0;
  function resize() {
    var r = cv.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, dprCap);
    var w = Math.max(2, Math.round(r.width * d)), h = Math.max(2, Math.round(r.height * d));
    if (w !== cv.width || h !== cv.height) { cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); }
    size = r.width; draw(now());
  }
  new ResizeObserver(resize).observe(cv);

  // look target: cursor, or a slow ghost path until the visitor moves
  var yaw = -0.38, pitch = 0.1, ty = yaw, tp = pitch, moved = false, mx = 0, my = 0;
  window.addEventListener('pointermove', function (e) { if (e.pointerType === 'touch') return; moved = true; mx = e.clientX; my = e.clientY; }, { passive: true });
  window.addEventListener('touchstart', function (e) { var t = e.touches[0]; if (!t) return; moved = true; mx = t.clientX; my = t.clientY; }, { passive: true });
  var t0 = performance.now();
  function now() { return (performance.now() - t0) / 1000; }
  window.__eyeGhost = function (t) { return { x: Math.sin(t * 0.55) * 0.42 - 0.05, y: Math.sin(t * 0.37 + 1.2) * 0.16 + 0.04 }; };

  function draw(t) {
    gl.uniform2f(uLook, yaw, pitch); gl.uniform1f(uT, t);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  var visible = true;
  new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(cv);

  function frame() {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) return;
    var t = now();
    if (moved) {
      var r = cv.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      ty = Math.max(-1, Math.min(1, (mx - cx) / (window.innerWidth * 0.5))) * 0.72;
      tp = Math.max(-1, Math.min(1, (my - cy) / (window.innerHeight * 0.55))) * 0.5;
    } else { var gp = window.__eyeGhost(t); ty = gp.x; tp = gp.y; }
    yaw += (ty - yaw) * 0.06; pitch += (tp - pitch) * 0.06;
    draw(t);
  }
  if (RM) { draw(1.0); } else requestAnimationFrame(frame);
})();
