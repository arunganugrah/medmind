"use client";

import { useEffect } from "react";

const C = { paper:"#F6F1E7", ink:"#1C2826", inkSoft:"#5A6B68", teal:"#0E3D3A", tealSoft:"#2C6B63", amber:"#D9952F", line:"#DCD3C2", card:"#FFFFFF" };
const serif = { fontFamily:"'Fraunces', Georgia, serif" };
const sans  = { fontFamily:"'Hanken Grotesk', system-ui, sans-serif" };

export default function AboutPage() {
  useEffect(() => {
    document.body.style.background = C.paper;
    if (!document.getElementById("medmind-fonts")) {
      const l = document.createElement("link");
      l.id = "medmind-fonts"; l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Hanken+Grotesk:wght@400;500;600&display=swap";
      document.head.appendChild(l);
    }
  }, []);

  const steps = [
    { n:"01", t:"Pilih topik", d:"Telusuri materi yang tersusun rapi: kategori, sub-bab, lalu topik spesifik." },
    { n:"02", t:"Pahami secara visual", d:"Setiap topik punya peta pikiran (mind map) yang merangkum konsep inti dalam satu gambar." },
    { n:"03", t:"Uji dengan kuis", d:"Jawab soal interaktif dan langsung baca pembahasannya untuk memperkuat pemahaman." },
  ];

  return (
    <div style={{ ...sans, color:C.ink, minHeight:"100vh", background:`radial-gradient(1100px 500px at 80% -5%, #ECF3F0 0%, ${C.paper} 50%)` }}>
      <header style={{ maxWidth:860, margin:"0 auto", padding:"20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <a href="/" style={{ display:"flex", alignItems:"center", gap:10, textDecoration:"none" }}>
          <Logo size={34} />
          <span style={{ ...serif, color:C.teal, fontSize:20, fontWeight:700 }}>MedMind</span>
        </a>
        <a href="/login" style={{ background:C.teal, color:"#fff", textDecoration:"none", fontSize:14, fontWeight:600, padding:"9px 18px", borderRadius:12 }}>Masuk</a>
      </header>

      <main className="mm-page" style={{ maxWidth:760, margin:"0 auto", padding:"40px 20px 100px" }}>
        <p style={{ color:C.amber, fontSize:13, fontWeight:600, letterSpacing:".14em", textTransform:"uppercase", margin:0 }}>Tentang Platform</p>
        <h1 style={{ ...serif, color:C.teal, fontSize:46, fontWeight:700, lineHeight:1.08, letterSpacing:"-.02em", margin:"14px 0 0" }}>
          Belajar medis yang ringkas, visual, dan teruji.
        </h1>
        <p style={{ color:C.inkSoft, fontSize:19, lineHeight:1.6, maxWidth:560, marginTop:18 }}>
          MedMind &amp; Quiz membantu Anda menguasai konsep medis dengan cepat — lewat peta pikiran yang
          memadatkan inti materi, lalu kuis interaktif yang menguji dan menjelaskan.
        </p>

        <div className="mm-stagger" style={{ marginTop:48, display:"grid", gap:16 }}>
          {steps.map((s) => (
            <div key={s.n} style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:18, padding:"22px 24px", display:"flex", gap:20, alignItems:"flex-start" }}>
              <span style={{ ...serif, color:C.amber, fontSize:30, fontWeight:600, lineHeight:1, minWidth:48 }}>{s.n}</span>
              <div>
                <h3 style={{ ...serif, color:C.ink, fontSize:21, fontWeight:600, margin:"2px 0 4px" }}>{s.t}</h3>
                <p style={{ color:C.inkSoft, fontSize:15.5, lineHeight:1.6, margin:0 }}>{s.d}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop:48, background:C.teal, borderRadius:22, padding:"36px 32px", color:"#fff", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", right:-30, top:-30, opacity:.12 }}><Logo size={160} flat /></div>
          <h2 style={{ ...serif, fontSize:26, fontWeight:600, margin:"0 0 8px", position:"relative" }}>Siap mulai?</h2>
          <p style={{ color:"#CDE3DE", fontSize:16, lineHeight:1.6, margin:"0 0 22px", maxWidth:440, position:"relative" }}>
            Punya kode voucher? Masuk dan langsung akses seluruh materi.
          </p>
          <a href="/login" style={{ display:"inline-block", background:C.amber, color:"#1C2826", textDecoration:"none", fontWeight:700, padding:"13px 26px", borderRadius:13, fontSize:16, position:"relative" }}>
            Masuk dengan voucher →
          </a>
        </div>

        <p style={{ textAlign:"center", color:C.inkSoft, fontSize:13, marginTop:48 }}>
          🧠 MedMind &amp; Quiz — Belajar visual, uji dengan kuis.
        </p>
      </main>
    </div>
  );
}

function Logo({ size = 56, flat = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" style={ flat ? {} : { filter:"drop-shadow(0 6px 12px rgba(14,61,58,.2))" }}>
      {!flat && <rect width="64" height="64" rx="16" fill="#0E3D3A"/>}
      <path d="M24 18c-4.5 0-8 3.4-8 7.6 0 1.6.5 3 1.4 4.2-.9 1.1-1.4 2.5-1.4 4 0 3.6 2.8 6.5 6.4 6.9.6 2.9 3.2 5.1 6.2 5.1V18.2c-1.4-.1-3-.2-4.6-.2Z" fill="#E8B04B"/>
      <path d="M40 18c4.5 0 8 3.4 8 7.6 0 1.6-.5 3-1.4 4.2.9 1.1 1.4 2.5 1.4 4 0 3.6-2.8 6.5-6.4 6.9-.6 2.9-3.2 5.1-6.2 5.1V18.2c1.4-.1 3-.2 4.6-.2Z" fill={flat ? "#9BD6C7" : "#F6F1E7"}/>
      <circle cx="32" cy="32" r="2.5" fill="#0E3D3A"/>
      <path d="M32 14v6M32 44v6" stroke="#E8B04B" strokeWidth="2.4" strokeLinecap="round"/>
    </svg>
  );
}
