"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";

// ─── WebGL Shader Background ──────────────────────────────────────────────────
function ShaderCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function syncSize() {
      if (!canvas) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width  = w;
        canvas.height = h;
      }
    }
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(syncSize) : null;
    ro?.observe(canvas);
    syncSize();

    const gl =
      canvas.getContext("webgl") ||
      (canvas.getContext as (id: string) => WebGLRenderingContext | null)("experimental-webgl");
    if (!gl) return;

    const vs = `attribute vec2 a_position;varying vec2 v_texCoord;void main(){v_texCoord=a_position*0.5+0.5;gl_Position=vec4(a_position,0.0,1.0);}`;
    const fs = `precision highp float;
uniform float u_time;uniform vec2 u_resolution;varying vec2 v_texCoord;
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);float a=hash(i),b=hash(i+vec2(1,0)),c=hash(i+vec2(0,1)),d=hash(i+vec2(1,1));vec2 u=f*f*(3.0-2.0*f);return mix(a,b,u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.x*u.y;}
void main(){vec2 uv=v_texCoord;vec2 p=uv*3.0;float n=noise(p+u_time*0.1);
vec3 c1=vec3(0.08,0.07,0.11);vec3 c2=vec3(0.55,0.36,0.96);vec3 c3=vec3(0.13,0.77,0.88);
float mask=smoothstep(0.4,0.6,n);vec3 col=mix(c1,c2,mask*0.15);
col+=c3*(1.0-smoothstep(0.0,0.1,abs(n-0.5)))*0.05;gl_FragColor=vec4(col,1.0);}`;

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
      syncSize();
      gl.viewport(0, 0, canvas!.width, canvas!.height);
      if (uTime) gl.uniform1f(uTime, t * 0.001);
      if (uRes)  gl.uniform2f(uRes, canvas!.width, canvas!.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(render);
    }
    raf = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(raf); ro?.disconnect(); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="landing-shader"
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
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

    import("three").then((THREE) => {
      const w = container.clientWidth || 400;
      const h = container.clientHeight || 400;
      const scene    = new THREE.Scene();
      const camera   = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.appendChild(renderer.domElement);

      const geo = new THREE.IcosahedronGeometry(2, 2);
      const mat = new THREE.MeshPhongMaterial({
        color: 0x8b5cf6, wireframe: true, transparent: true, opacity: 0.55,
        emissive: new THREE.Color(0x8b5cf6), emissiveIntensity: 0.4,
      });
      const globe = new THREE.Mesh(geo, mat);
      scene.add(globe);

      const coreGeo = new THREE.SphereGeometry(1.2, 32, 32);
      const coreMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.15 });
      scene.add(new THREE.Mesh(coreGeo, coreMat));

      [[1,0.5,1.5],[-1,-0.8,1.2],[0.5,1.2,-1],[-1.5,0.2,-0.5]].forEach(([x,y,z]) => {
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.05,8,8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        dot.position.set(x,y,z);
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
        const nw = container.clientWidth, nh = container.clientHeight;
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
        renderer.setSize(nw, nh);
      };
      window.addEventListener("resize", onResize);

      (container as HTMLDivElement & { _cleanup?: () => void })._cleanup = () => {
        cancelAnimationFrame(animId);
        window.removeEventListener("resize", onResize);
        renderer.dispose();
        if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      };
    });

    return () => { (container as HTMLDivElement & { _cleanup?: () => void })._cleanup?.(); };
  }, []);

  return <div ref={containerRef} className="w-full h-full" />;
}

// ─── Static Data ─────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: "Home",      href: "#",          active: true  },
  { label: "Fitur",     href: "#fitur",     active: false },
  { label: "Teknologi", href: "#teknologi", active: false },
  { label: "Tentang",   href: "#tentang",   active: false },
];

const FITUR_CARDS = [
  {
    icon:  "radar",
    title: "Analisis Rute Real-time",
    desc:  "Pemantauan dan kalkulasi lintasan penerbangan secara langsung dari berbagai sumber data telemetri yang terintegrasi.",
    color: "primary" as const,
  },
  {
    icon:  "psychology",
    title: "Optimasi AI",
    desc:  "Algoritma kecerdasan buatan untuk meramalkan cuaca, menghindari turbulensi, dan menentukan jalur paling hemat bahan bakar.",
    color: "secondary" as const,
  },
  {
    icon:  "3d_rotation",
    title: "Visualisasi 3D",
    desc:  "Representasi grafis ruang udara dalam bentuk tiga dimensi yang interaktif, memberikan perspektif komprehensif bagi operator.",
    color: "primary" as const,
  },
];

const TECH_ITEMS = [
  { icon: "layers",  title: "WebGL Shaders",     desc: "Rendering visual tingkat rendah",          color: "secondary" as const },
  { icon: "route",   title: "Neural Pathfinding", desc: "Algoritma rute adaptif",                   color: "primary"   as const },
  { icon: "sensors", title: "Edge Telemetry",     desc: "Pemrosesan data sensor terdistribusi",     color: "secondary" as const },
];

const FOOTER_LINKS = [
  {
    heading: "Produk",
    items: [
      { label: "Fitur",      href: "#fitur"     },
      { label: "Teknologi",  href: "#teknologi" },
      { label: "Dashboard",  href: "/dashboard" },
    ],
  },
  {
    heading: "Perusahaan",
    items: [
      { label: "Tentang Kami", href: "#tentang" },
      { label: "Karir",        href: "#"        },
      { label: "Blog",         href: "#"        },
    ],
  },
  {
    heading: "Bantuan",
    items: [
      { label: "FAQ",     href: "#" },
      { label: "Kontak",  href: "#" },
      { label: "Support", href: "#" },
    ],
  },
];

const PATH_NODES = [
  { top: "30%", left: "42%", delay: "0s"   },
  { top: "62%", left: "68%", delay: "0.5s" },
  { top: "46%", left: "22%", delay: "1s"   },
];
const PATH_LINES = [
  { top: "30%", left: "42%", width: "28%", rotate: "44deg",  delay: "0s"   },
  { top: "46%", left: "22%", width: "23%", rotate: "-18deg", delay: "0.7s" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function iconBg(color: "primary" | "secondary") {
  return color === "primary"
    ? "rgba(208, 188, 255, 0.13)"
    : "rgba(76, 215, 246, 0.13)";
}

// ─── Landing Page ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  const router  = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted,        setMounted]        = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = !mounted || resolvedTheme === "dark";

  return (
    <div
      className="min-h-screen relative overflow-x-hidden flex flex-col antialiased"
      style={{ background: "var(--background)", color: "var(--on-surface)" }}
    >
      {/* WebGL Shader */}
      <ShaderCanvas />

      {/* Grid */}
      <div className="fixed inset-0 bg-grid-pattern pointer-events-none opacity-20" style={{ zIndex: 0 }} />

      {/* Orbs */}
      <div className="fixed pointer-events-none" style={{ top: "15%", left: "8%", zIndex: 1 }}>
        <div className="orb-purple" style={{ width: "500px", height: "500px" }} />
      </div>
      <div className="fixed pointer-events-none" style={{ bottom: "8%", right: "4%", zIndex: 1 }}>
        <div className="orb-cyan" style={{ width: "580px", height: "580px" }} />
      </div>

      {/* ── Fixed Navigation ── */}
      <nav
        className="glass-panel fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 lg:px-8"
        style={{ height: "64px", borderLeft: "none", borderRight: "none", borderTop: "none", boxShadow: "0 0 15px rgba(208,188,255,0.08)" }}
      >
        {/* Logo + desktop links */}
        <div className="flex items-center">
          <div className="flex items-center gap-2 mr-6">
            <span className="material-symbols-outlined" style={{ fontSize: "22px", color: "var(--primary)", fontVariationSettings: "'FILL' 1" }}>
              flight_takeoff
            </span>
            <span className="text-lg font-bold tracking-tight" style={{ fontFamily: "var(--font-sora), Sora, sans-serif", color: "var(--primary)" }}>
              SkyRoute
            </span>
          </div>

          <div className="hidden md:flex items-center h-16">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="h-full flex items-center px-4 text-sm font-medium transition-colors duration-200"
                style={{
                  fontFamily: "Inter, sans-serif",
                  color: link.active ? "var(--secondary)" : "var(--on-surface-variant)",
                  fontWeight: link.active ? 600 : 400,
                  borderBottom: link.active ? "2px solid var(--secondary)" : "2px solid transparent",
                }}
                onMouseEnter={(e) => {
                  if (!link.active) {
                    (e.currentTarget as HTMLAnchorElement).style.color = "var(--secondary)";
                    (e.currentTarget as HTMLAnchorElement).style.background = "rgba(128,128,128,0.05)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!link.active) {
                    (e.currentTarget as HTMLAnchorElement).style.color = "var(--on-surface-variant)";
                    (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                  }
                }}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1">
          {/* Notifications */}
          <button
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{ color: "var(--primary)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(128,128,128,0.08)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px", fontVariationSettings: "'FILL' 0" }}>notifications</span>
          </button>

          {/* Theme toggle */}
          {mounted && (
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
              style={{ color: "var(--primary)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(128,128,128,0.08)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              title={isDark ? "Mode Terang" : "Mode Gelap"}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "20px", fontVariationSettings: "'FILL' 0" }}>
                {isDark ? "light_mode" : "dark_mode"}
              </span>
            </button>
          )}

          {/* Help */}
          <button
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{ color: "var(--primary)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(128,128,128,0.08)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px", fontVariationSettings: "'FILL' 0" }}>help</span>
          </button>

          {/* Launch button */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push("/dashboard")}
            className="hidden sm:flex items-center gap-1.5 ml-2 px-4 py-2 rounded-full text-sm font-semibold text-white"
            style={{
              background: "linear-gradient(135deg, #a078ff 0%, #6d3bd7 100%)",
              fontFamily: "Inter, sans-serif",
              boxShadow: "0 0 16px rgba(208,188,255,0.22)",
              border: "1px solid rgba(255,255,255,0.14)",
            }}
          >
            Buka Dashboard
            <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>arrow_forward</span>
          </motion.button>

          {/* Avatar */}
          <div
            className="hidden sm:flex w-8 h-8 rounded-full items-center justify-center text-xs font-bold ml-1 cursor-pointer shrink-0 hover:ring-2 transition-all"
            style={{
              background: "linear-gradient(135deg, #d0bcff 0%, #6d3bd7 100%)",
              color: "#3c0091",
              fontFamily: "Sora, sans-serif",
            }}
          >
            SR
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen((p) => !p)}
            className="md:hidden w-9 h-9 rounded-full flex items-center justify-center ml-1"
            style={{ color: "var(--on-surface-variant)" }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>
              {mobileMenuOpen ? "close" : "menu"}
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="fixed top-16 left-0 right-0 z-40 glass-panel-solid"
            style={{ borderTop: "none", borderLeft: "none", borderRight: "none" }}
          >
            <div className="flex flex-col py-2">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors"
                  style={{
                    fontFamily: "Inter, sans-serif",
                    color: link.active ? "var(--secondary)" : "var(--on-surface-variant)",
                    background: link.active ? "rgba(76,215,246,0.06)" : "transparent",
                    borderLeft: link.active ? "3px solid var(--secondary)" : "3px solid transparent",
                  }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="px-5 py-3" style={{ borderTop: "1px solid rgba(128,128,128,0.1)" }}>
                <button
                  onClick={() => { router.push("/dashboard"); setMobileMenuOpen(false); }}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 text-white"
                  style={{ background: "linear-gradient(135deg, #a078ff 0%, #6d3bd7 100%)", fontFamily: "Inter, sans-serif" }}
                >
                  Buka Dashboard
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>arrow_forward</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ Main ══════════════════════════════════════════════════════════════ */}
      <main className="flex-grow pt-16 relative z-10 flex flex-col items-center w-full pb-24">

        {/* ── Hero ── */}
        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center min-h-[calc(100vh-4rem)] px-4 sm:px-6 lg:px-8 py-12">
          {/* Left: text */}
          <div className="flex flex-col gap-5 text-center lg:text-left z-20 order-2 lg:order-1">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel w-fit mx-auto lg:mx-0"
            >
              <span className="material-symbols-outlined" style={{ fontSize: "15px", color: "var(--secondary)" }}>flight_takeoff</span>
              <span className="text-xs uppercase tracking-widest" style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--primary)" }}>
                Sistem Navigasi Cerdas
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="font-bold"
              style={{ fontFamily: "var(--font-sora), Sora, sans-serif", fontSize: "clamp(30px,5vw,54px)", lineHeight: 1.15, color: "var(--on-surface)" }}
            >
              Navigasi Masa Depan <br />
              <span className="text-gradient">Aviasi Indonesia</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.35 }}
              className="max-w-lg mx-auto lg:mx-0 leading-relaxed"
              style={{ fontFamily: "Inter, sans-serif", fontSize: "clamp(14px,2.5vw,17px)", color: "var(--on-surface-variant)" }}
            >
              Analisis rute penerbangan dengan AI dan visualisasi algoritma pathfinding
              tercanggih untuk efisiensi maksimum di wilayah udara nusantara.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="flex flex-col sm:flex-row gap-3 mt-1 justify-center lg:justify-start"
            >
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => router.push("/dashboard")}
                className="flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-base font-semibold text-white group transition-all"
                style={{
                  background: "linear-gradient(135deg, #a078ff 0%, #6d3bd7 100%)",
                  boxShadow: "0 0 24px rgba(160,120,255,0.35)",
                  fontFamily: "Inter, sans-serif",
                  border: "1px solid rgba(255,255,255,0.16)",
                }}
              >
                Buka Dashboard
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform" style={{ fontSize: "18px" }}>arrow_forward</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => router.push("/dashboard?tab=ROUTE_PLAN")}
                className="flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-base font-semibold glass-panel transition-all"
                style={{ fontFamily: "Inter, sans-serif", color: "var(--secondary)", borderColor: "rgba(76,215,246,0.35)" }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>play_circle</span>
                Lihat Demo
              </motion.button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex items-center gap-4 flex-wrap justify-center lg:justify-start mt-1"
            >
              {[
                { icon: "check_circle", label: "Real-time Data" },
                { icon: "check_circle", label: "AI Pathfinding" },
                { icon: "check_circle", label: "NFZ Support"    },
              ].map(({ icon, label }) => (
                <div key={label} className="flex items-center gap-1.5" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "11px", color: "var(--on-surface-variant)", opacity: 0.85 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "14px", color: "var(--secondary)" }}>{icon}</span>
                  {label}
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right: vis card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full glass-panel rounded-2xl overflow-hidden glow-effect order-1 lg:order-2"
            style={{ height: "clamp(320px,45vw,580px)" }}
          >
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            <div className="absolute top-0 left-0 w-px h-14 bg-gradient-to-b from-secondary/50 to-transparent" />
            <div className="absolute bottom-0 right-0 w-px h-14 bg-gradient-to-t from-primary/50 to-transparent" />

            <div className="absolute top-4 left-4 z-20 flex gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded" style={{ background: "rgba(21,18,27,0.82)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(8px)", fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "var(--secondary)", letterSpacing: "0.05em" }}>
                <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                LIVE TRAFFIC
              </div>
              <div className="px-3 py-1.5 rounded" style={{ background: "rgba(21,18,27,0.82)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(8px)", fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "var(--primary)", letterSpacing: "0.05em" }}>
                ALT: 35,000 FT
              </div>
            </div>

            <div className="absolute inset-0 opacity-80 mix-blend-screen">
              <GlobeCanvas />
            </div>

            {PATH_NODES.map((node, i) => (
              <div key={i} className="absolute w-2 h-2 rounded-full bg-secondary z-10 animate-pulse-node" style={{ top: node.top, left: node.left, animationDelay: node.delay, boxShadow: "0 0 8px rgba(76,215,246,0.7)" }} />
            ))}
            {PATH_LINES.map((line, i) => (
              <div key={i} className="absolute h-px z-10 animate-draw-line" style={{ top: line.top, left: line.left, width: line.width, transform: `rotate(${line.rotate})`, transformOrigin: "left center", background: "linear-gradient(90deg, var(--primary), var(--secondary))", animationDelay: line.delay, opacity: 0.65 }} />
            ))}

            <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to top, var(--background) 0%, transparent 28%, transparent 72%, var(--background) 100%)", opacity: 0.55 }} />
            <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to right, var(--background) 0%, transparent 22%, transparent 78%, var(--background) 100%)", opacity: 0.45 }} />

            <div className="absolute bottom-4 right-5 z-20 text-right">
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "var(--on-surface-variant)", marginBottom: "4px", letterSpacing: "0.05em" }}>OPTIMIZATION STATUS</div>
              <div className="flex items-center justify-end gap-1.5" style={{ fontFamily: "var(--font-sora), Sora, sans-serif", fontSize: "22px", fontWeight: 700, color: "var(--primary)" }}>
                98.4%
                <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "var(--secondary)" }}>trending_up</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            Section: Fitur
        ════════════════════════════════════════════════════════════════════ */}
        <section id="fitur" className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24 flex flex-col gap-12 relative z-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-center"
          >
            <h2
              className="font-bold mb-4"
              style={{ fontFamily: "var(--font-sora), Sora, sans-serif", fontSize: "clamp(26px,4vw,40px)", color: "var(--on-surface)" }}
            >
              Fitur Unggulan
            </h2>
            <p
              className="max-w-2xl mx-auto"
              style={{ fontFamily: "Inter, sans-serif", fontSize: "17px", lineHeight: "1.7", color: "var(--on-surface-variant)" }}
            >
              Sistem cerdas yang dirancang untuk mendukung operasional navigasi penerbangan yang presisi dan efisien.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {FITUR_CARDS.map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="glass-panel p-7 rounded-2xl flex flex-col gap-4 group transition-all duration-300"
                style={{ cursor: "default" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = card.color === "primary" ? "rgba(208,188,255,0.4)" : "rgba(76,215,246,0.4)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.08)"; }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"
                  style={{ background: iconBg(card.color) }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "24px", color: `var(--${card.color})` }}>
                    {card.icon}
                  </span>
                </div>
                <h3
                  className="font-bold"
                  style={{ fontFamily: "var(--font-sora), Sora, sans-serif", fontSize: "18px", color: "var(--on-surface)" }}
                >
                  {card.title}
                </h3>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", lineHeight: "1.65", color: "var(--on-surface-variant)" }}>
                  {card.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            Section: Teknologi
        ════════════════════════════════════════════════════════════════════ */}
        <section id="teknologi" className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24 flex flex-col gap-12 relative z-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-center"
          >
            <h2
              className="font-bold mb-4"
              style={{ fontFamily: "var(--font-sora), Sora, sans-serif", fontSize: "clamp(26px,4vw,40px)", color: "var(--on-surface)" }}
            >
              Teknologi Terdepan
            </h2>
            <p
              className="max-w-2xl mx-auto"
              style={{ fontFamily: "Inter, sans-serif", fontSize: "17px", lineHeight: "1.7", color: "var(--on-surface-variant)" }}
            >
              Infrastruktur modern yang menenagai performa tinggi tanpa kompromi.
            </p>
          </motion.div>

          <div className="flex flex-col md:flex-row justify-center items-center gap-10 lg:gap-20 mt-4">
            {TECH_ITEMS.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.12 }}
                className="flex flex-col items-center text-center gap-3"
              >
                <div
                  className="w-16 h-16 rounded-full glass-panel glow-effect flex items-center justify-center"
                  style={{ color: `var(--${item.color})` }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "28px" }}>{item.icon}</span>
                </div>
                <h4 className="font-semibold" style={{ fontFamily: "var(--font-sora), Sora, sans-serif", fontSize: "17px", color: "var(--on-surface)" }}>
                  {item.title}
                </h4>
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "12px", color: "var(--on-surface-variant)" }}>
                  {item.desc}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Connector lines (decorative, desktop only) */}
          <div className="hidden md:flex justify-center items-center gap-10 lg:gap-20 -mt-[120px] pointer-events-none select-none" aria-hidden>
            <div className="w-16" />
            <div className="h-px flex-1 max-w-[100px]" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)" }} />
            <div className="w-16" />
            <div className="h-px flex-1 max-w-[100px]" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)" }} />
            <div className="w-16" />
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            Section: Tentang
        ════════════════════════════════════════════════════════════════════ */}
        <section
          id="tentang"
          className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-28 flex flex-col items-center text-center gap-8 relative z-20"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel"
          >
            <span className="text-xs uppercase tracking-widest" style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--primary)" }}>
              Misi Kami
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="font-bold leading-tight"
            style={{ fontFamily: "var(--font-sora), Sora, sans-serif", fontSize: "clamp(26px,4.5vw,46px)", color: "var(--on-surface)" }}
          >
            Membawa <span className="text-gradient">Standar Baru</span> ke Langit Indonesia
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="max-w-3xl leading-relaxed"
            style={{ fontFamily: "Inter, sans-serif", fontSize: "clamp(15px,2.5vw,18px)", color: "var(--on-surface-variant)" }}
          >
            SkyRoute berdedikasi untuk memodernisasi infrastruktur aviasi nasional melalui penerapan
            kecerdasan buatan dan visualisasi data tingkat lanjut. Kami percaya bahwa teknologi yang tepat
            dapat menciptakan ruang udara yang lebih aman, efisien, dan ramah lingkungan.
          </motion.p>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push("/dashboard")}
            className="mt-4 flex items-center gap-3 px-10 py-4 rounded-xl text-lg font-semibold text-white group transition-all"
            style={{
              background: "linear-gradient(135deg, #a078ff 0%, #6d3bd7 100%)",
              boxShadow: "0 0 28px rgba(160,120,255,0.4)",
              fontFamily: "Inter, sans-serif",
              border: "1px solid rgba(255,255,255,0.16)",
            }}
          >
            Eksplorasi Dashboard Sekarang
            <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform" style={{ fontSize: "22px" }}>
              rocket_launch
            </span>
          </motion.button>
        </section>
      </main>

      {/* ══ Footer ════════════════════════════════════════════════════════════ */}
      <footer
        className="relative z-20 px-4 sm:px-6 lg:px-12 pt-16 pb-8"
        style={{ background: "rgba(15,13,21,0.8)", backdropFilter: "blur(16px)", borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-14">
          {/* Brand */}
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: "22px", color: "var(--primary)", fontVariationSettings: "'FILL' 1" }}>flight_takeoff</span>
              <span className="text-lg font-bold tracking-tight" style={{ fontFamily: "var(--font-sora), Sora, sans-serif", color: "var(--primary)" }}>SkyRoute</span>
            </div>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", lineHeight: "1.65", color: "var(--on-surface-variant)" }}>
              Memodernisasi infrastruktur aviasi nasional melalui penerapan kecerdasan buatan dan visualisasi data tingkat lanjut untuk langit Indonesia yang lebih aman.
            </p>
            <div className="flex gap-3">
              {[
                { icon: "public",  href: "#" },
                { icon: "share",   href: "#" },
                { icon: "groups",  href: "#" },
              ].map(({ icon, href }) => (
                <a
                  key={icon}
                  href={href}
                  className="w-10 h-10 rounded-full glass-panel flex items-center justify-center transition-all duration-200"
                  style={{ color: "var(--on-surface-variant)" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.color = "var(--secondary)";
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(76,215,246,0.4)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.color = "var(--on-surface-variant)";
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.08)";
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>{icon}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {FOOTER_LINKS.map((col) => (
            <div key={col.heading} className="flex flex-col gap-5">
              <h4 className="font-bold" style={{ fontFamily: "var(--font-sora), Sora, sans-serif", fontSize: "16px", color: "var(--on-surface)" }}>
                {col.heading}
              </h4>
              <ul className="flex flex-col gap-2.5">
                {col.items.map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      className="transition-colors"
                      style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", color: "var(--on-surface-variant)" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--secondary)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--on-surface-variant)"; }}
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          className="max-w-6xl mx-auto pt-6 flex flex-col sm:flex-row justify-between items-center gap-3"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "12px", color: "var(--on-surface-variant)" }}>
            © 2024 SkyRoute Analytics. Hak Cipta Dilindungi.
          </span>
          <div className="flex gap-6">
            {["Kebijakan Privasi", "Syarat & Ketentuan"].map((label) => (
              <a
                key={label}
                href="#"
                className="transition-colors"
                style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "12px", color: "var(--on-surface-variant)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--primary)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--on-surface-variant)"; }}
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
