"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

// ─── WebGL Shader Background ──────────────────────────────────────────────────
function ShaderCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function syncSize() {
      if (!canvas) return;
      const w = canvas.clientWidth || 1280;
      const h = canvas.clientHeight || 720;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }

    const ro = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(syncSize)
      : null;
    ro?.observe(canvas);
    syncSize();

    const gl =
      canvas.getContext("webgl") ||
      (canvas.getContext as (id: string) => WebGLRenderingContext | null)("experimental-webgl");
    if (!gl) return;

    const vs = `attribute vec2 a_position;
varying vec2 v_texCoord;
void main(){v_texCoord=a_position*0.5+0.5;gl_Position=vec4(a_position,0.0,1.0);}`;

    const fs = `precision highp float;
uniform float u_time;uniform vec2 u_resolution;varying vec2 v_texCoord;
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);float a=hash(i),b=hash(i+vec2(1,0)),c=hash(i+vec2(0,1)),d=hash(i+vec2(1,1));vec2 u=f*f*(3.0-2.0*f);return mix(a,b,u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.x*u.y;}
void main(){
  vec2 uv=v_texCoord;vec2 p=uv*3.0;float n=noise(p+u_time*0.1);
  vec3 c1=vec3(0.08,0.07,0.11);vec3 c2=vec3(0.55,0.36,0.96);vec3 c3=vec3(0.13,0.77,0.88);
  float mask=smoothstep(0.4,0.6,n);
  vec3 col=mix(c1,c2,mask*0.15);
  col+=c3*(1.0-smoothstep(0.0,0.1,abs(n-0.5)))*0.05;
  gl_FragColor=vec4(col,1.0);
}`;

    function cs(type: number, src: string) {
      const s = gl!.createShader(type)!;
      gl!.shaderSource(s, src);
      gl!.compileShader(s);
      return s;
    }
    const prog = gl.createProgram()!;
    gl.attachShader(prog, cs(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, cs(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(prog, "a_position");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
    const uTime = gl.getUniformLocation(prog, "u_time");
    const uRes  = gl.getUniformLocation(prog, "u_resolution");

    let raf: number;
    function render(t: number) {
      if (!gl) return;
      if (typeof ResizeObserver === "undefined") syncSize();
      gl.viewport(0, 0, canvas!.width, canvas!.height);
      if (uTime) gl.uniform1f(uTime, t * 0.001);
      if (uRes)  gl.uniform2f(uRes, canvas!.width, canvas!.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(render);
    }
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full opacity-50"
      style={{ zIndex: 0, display: "block" }}
    />
  );
}

// ─── Three.js Globe ───────────────────────────────────────────────────────────
function GlobeCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animId: number;
    let THREE: typeof import("three");

    import("three").then((mod) => {
      THREE = mod;
      const w = container.clientWidth || 400;
      const h = container.clientHeight || 400;

      const scene    = new THREE.Scene();
      const camera   = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.appendChild(renderer.domElement);

      // Wireframe icosahedron globe
      const geo  = new THREE.IcosahedronGeometry(2, 2);
      const mat  = new THREE.MeshPhongMaterial({
        color: 0x8b5cf6, wireframe: true,
        transparent: true, opacity: 0.55,
        emissive: new THREE.Color(0x8b5cf6), emissiveIntensity: 0.4,
      });
      const globe = new THREE.Mesh(geo, mat);
      scene.add(globe);

      // Glowing inner core
      const coreGeo = new THREE.SphereGeometry(1.2, 32, 32);
      const coreMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.15 });
      scene.add(new THREE.Mesh(coreGeo, coreMat));

      // City dots
      [
        [1, 0.5, 1.5], [-1, -0.8, 1.2], [0.5, 1.2, -1], [-1.5, 0.2, -0.5],
      ].forEach(([x, y, z]) => {
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.05, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        dot.position.set(x, y, z);
        globe.add(dot);
      });

      const light = new THREE.PointLight(0xffffff, 1, 100);
      light.position.set(5, 5, 5);
      scene.add(light);
      scene.add(new THREE.AmbientLight(0x404040));
      camera.position.z = 5;

      function animate() {
        animId = requestAnimationFrame(animate);
        globe.rotation.y += 0.004;
        globe.rotation.x += 0.001;
        renderer.render(scene, camera);
      }
      animate();

      const onResize = () => {
        const nw = container.clientWidth;
        const nh = container.clientHeight;
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
        renderer.setSize(nw, nh);
      };
      window.addEventListener("resize", onResize);

      // cleanup stored on the div for the return fn
      (container as HTMLDivElement & { _cleanup?: () => void })._cleanup = () => {
        cancelAnimationFrame(animId);
        window.removeEventListener("resize", onResize);
        renderer.dispose();
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      };
    });

    return () => {
      (container as HTMLDivElement & { _cleanup?: () => void })._cleanup?.();
    };
  }, []);

  return <div ref={containerRef} className="w-full h-full" />;
}

// ─── Feature Cards ────────────────────────────────────────────────────────────
const features = [
  {
    icon: "map",
    title: "Strategic Mapping",
    desc: "Multi-layered geospatial overlays with great-circle arc routing and airline-grade cartographic precision.",
    accent: "primary",
  },
  {
    icon: "route",
    title: "Vector Optimization",
    desc: "Dijkstra, A*, and Bidirectional Dijkstra with Yen's K-Shortest Paths — computed via FastAPI Python backend.",
    accent: "secondary",
  },
  {
    icon: "flight",
    title: "Fleet Telemetry",
    desc: "High-bandwidth data stream with animated aircraft traversal along calculated routes and NFZ constraints.",
    accent: "tertiary",
  },
];

// ─── Landing Page ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter();

  return (
    <div
      className="min-h-screen text-on-surface relative overflow-hidden flex flex-col"
      style={{ background: "#15121b" }}
    >
      {/* WebGL Shader background */}
      <ShaderCanvas />

      {/* Background orbs */}
      <div
        className="fixed pointer-events-none"
        style={{ top: "-100px", left: "-100px", zIndex: 1 }}
      >
        <div className="orb-purple" />
      </div>
      <div
        className="fixed pointer-events-none"
        style={{ bottom: "-100px", right: "-100px", zIndex: 1 }}
      >
        <div className="orb-cyan" />
      </div>

      {/* ── Navigation ── */}
      <header
        className="relative flex items-center justify-between px-8 py-4 glass-panel"
        style={{ zIndex: 20, borderLeft: "none", borderRight: "none", borderTop: "none" }}
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: "24px" }}>
            flight_takeoff
          </span>
          <span
            className="text-xl font-bold tracking-tight text-gradient"
            style={{ fontFamily: "var(--font-sora), Sora, sans-serif" }}
          >
            SkyRoute
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          {["Map", "Route", "Fleet", "Terminal"].map((item, i) => (
            <button
              key={item}
              onClick={() => {
                if (i === 1) router.push("/dashboard?tab=ROUTE_PLAN");
                else if (i === 2) router.push("/dashboard?tab=FLEET_ALT");
              }}
              className="text-sm font-medium transition-colors hover:text-primary"
              style={{ color: i === 0 ? "#d0bcff" : "#958ea0", fontFamily: "Inter, sans-serif" }}
            >
              {item}
            </button>
          ))}
        </nav>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push("/dashboard")}
          className="px-5 py-2.5 rounded-full text-sm font-semibold text-on-primary transition-all"
          style={{
            background: "linear-gradient(135deg, #d0bcff 0%, #6d3bd7 100%)",
            fontFamily: "Inter, sans-serif",
          }}
        >
          Launch System
        </motion.button>
      </header>

      {/* ── Hero ── */}
      <main className="relative flex-1 flex flex-col items-center justify-center px-6 py-16" style={{ zIndex: 10 }}>
        {/* Status pill */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="glass-panel rounded-full px-4 py-2 mb-8 flex items-center gap-2"
        >
          <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
          <span
            className="text-xs text-on-surface-variant"
            style={{ fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.05em" }}
          >
            System Nominal — Alpha 9 Online
          </span>
        </motion.div>

        {/* Hero title */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="text-display-lg text-gradient text-center mb-6"
          style={{ fontFamily: "var(--font-sora), Sora, sans-serif" }}
        >
          Navigasi Masa
          <br />
          Depan Aviasi
        </motion.h1>

        {/* Sub-headline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="max-w-xl text-center text-body-lg text-on-surface-variant mb-10"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          Optimisasi rute penerbangan berbasis Dijkstra, A*, dan Bidirectional search
          pada jaringan bandara Indonesia — dengan dukungan No-Fly Zone real-time.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex flex-col sm:flex-row items-center gap-4 mb-20"
        >
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push("/dashboard")}
            className="px-8 py-4 rounded-full text-base font-semibold text-on-primary transition-all"
            style={{
              background: "linear-gradient(135deg, #d0bcff 0%, #6d3bd7 100%)",
              boxShadow: "0 0 30px rgba(208, 188, 255, 0.3)",
              fontFamily: "Inter, sans-serif",
            }}
          >
            Buka Dashboard
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push("/dashboard?tab=ROUTE_PLAN")}
            className="px-8 py-4 rounded-full text-base font-semibold text-on-surface glass-panel transition-all"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            Lihat Peta Rute
          </motion.button>
        </motion.div>

        {/* ── Feature Cards + Globe ── */}
        <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-6 items-start">
          {/* Cards */}
          <div className="flex-1 grid grid-cols-1 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="glass-panel rounded-xl p-6 flex gap-4 items-start"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: f.accent === "secondary"
                      ? "rgba(76,215,246,0.12)"
                      : f.accent === "tertiary"
                      ? "rgba(196,193,251,0.12)"
                      : "rgba(208,188,255,0.12)",
                  }}
                >
                  <span
                    className="material-symbols-outlined text-lg"
                    style={{
                      color: f.accent === "secondary" ? "#4cd7f6" : f.accent === "tertiary" ? "#c4c1fb" : "#d0bcff",
                      fontSize: "20px",
                    }}
                  >
                    {f.icon}
                  </span>
                </div>
                <div>
                  <h3
                    className="text-headline-md text-on-surface mb-1"
                    style={{ fontFamily: "var(--font-sora), Sora, sans-serif", fontSize: "16px", lineHeight: "24px" }}
                  >
                    {f.title}
                  </h3>
                  <p
                    className="text-body-md text-on-surface-variant"
                    style={{ fontFamily: "Inter, sans-serif", fontSize: "14px" }}
                  >
                    {f.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Globe */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="w-full lg:w-80 h-80 glass-panel rounded-2xl overflow-hidden flex items-center justify-center shrink-0"
          >
            <GlobeCanvas />
          </motion.div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer
        className="glass-panel px-8 py-5 flex flex-col md:flex-row justify-between items-center gap-3"
        style={{ zIndex: 20, borderLeft: "none", borderRight: "none", borderBottom: "none" }}
      >
        <span
          className="text-on-surface-variant text-sm"
          style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "11px", letterSpacing: "0.05em" }}
        >
          SkyRoute Analytics — Strategic Flight Intelligence
        </span>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
          <span className="text-secondary text-xs" style={{ fontFamily: "JetBrains Mono, monospace" }}>
            System Online
          </span>
        </div>
      </footer>
    </div>
  );
}
