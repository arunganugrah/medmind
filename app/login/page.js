"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const C = { paper:"#F6F1E7", ink:"#1C2826", inkSoft:"#5A6B68", teal:"#0E3D3A", tealSoft:"#2C6B63", amber:"#D9952F", line:"#DCD3C2", card:"#FFFFFF" };
const serif = { fontFamily:"'Fraunces', Georgia, serif" };
const sans  = { fontFamily:"'Hanken Grotesk', system-ui, sans-serif" };

export default function LoginPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.body.style.background = C.paper;
    if (!document.getElementById("medmind-fonts")) {
      const l = document.createElement("link");
      l.id = "medmind-fonts"; l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Hanken+Grotesk:wght@400;500;600&display=swap";
      document.head.appendChild(l);
    }
  }, []);

  const submit = async () => {
    const c = code.trim().toUpperCase();
    if (!c) return alert("Masukkan kode voucher.");
    setBusy(true);
    try {
      const snap = await getDoc(doc(db, "vouchers", c));
      if (snap.exists() && snap.data().active === true) {
        const d = snap.data();
        // categories bisa: "all" (akses penuh), array id kategori, atau tidak ada (voucher lama -> dianggap akses penuh)
        const cats = d.categories === undefined ? "all" : d.categories;
        localStorage.setItem("medmind_voucher", c);
        localStorage.setItem("medmind_access", JSON.stringify(cats));
        router.replace("/");
      } else alert("Voucher tidak valid atau sudah nonaktif.");
    } catch (e) {
      console.error(e); alert("Terjadi kesalahan. Cek koneksi & konfigurasi Firebase.");
    } finally { setBusy(false); }
  };

  return (
    <div style={{ ...sans, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:20,
      background:`radial-gradient(1200px 600px at 50% -10%, #ECF3F0 0%, ${C.paper} 55%)` }}>
      <div className="mm-pop" style={{ width:"100%", maxWidth:400 }}>
        <div style={{ display:"flex", justifyContent:"center", marginBottom:20 }}><Logo /></div>
        <div style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:24, padding:"36px 32px", boxShadow:"0 24px 60px -28px rgba(14,61,58,.35)" }}>
          <h1 style={{ ...serif, color:C.teal, fontSize:28, fontWeight:700, textAlign:"center", margin:"0 0 4px", letterSpacing:"-.02em" }}>MedMind &amp; Quiz</h1>
          <p style={{ color:C.inkSoft, textAlign:"center", fontSize:14.5, margin:"0 0 28px" }}>Masukkan kode voucher untuk mulai belajar.</p>
          <label style={{ fontSize:12, fontWeight:600, color:C.tealSoft, letterSpacing:".08em", textTransform:"uppercase" }}>Kode Voucher</label>
          <input value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="MMQ-MATA-001"
            style={{ width:"100%", padding:"13px 16px", borderRadius:14, border:`1.5px solid ${C.line}`, fontSize:16, outline:"none",
              margin:"8px 0 18px", textTransform:"uppercase", letterSpacing:".04em", boxSizing:"border-box", background:"#FCFAF5", fontFamily:"'Hanken Grotesk', monospace" }}
            onFocus={(e) => e.target.style.borderColor = C.amber} onBlur={(e) => e.target.style.borderColor = C.line} />
          <button onClick={submit} disabled={busy}
            style={{ width:"100%", padding:15, background:C.teal, color:"#fff", borderRadius:14, fontWeight:600, border:"none", cursor:"pointer", fontSize:16, transition:"opacity .2s, transform .1s", opacity: busy ? .7 : 1 }}
            onMouseDown={(e) => e.currentTarget.style.transform = "scale(.985)"} onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}>
            {busy ? "Memeriksa…" : "Masuk"}
          </button>
          <p style={{ color:C.inkSoft, textAlign:"center", fontSize:13, marginTop:20, marginBottom:0 }}>
            <a href="/about" style={{ color:C.tealSoft, textDecoration:"none" }}>Apa itu MedMind?</a>
            <span style={{ opacity:.4, margin:"0 8px" }}>·</span>
            <a href="/admin-login" style={{ color:C.amber, textDecoration:"none" }}>Masuk Admin</a>
          </p>
        </div>
      </div>
    </div>
  );
}

function Logo({ size = 56 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" style={{ filter:"drop-shadow(0 8px 16px rgba(14,61,58,.25))" }}>
      <rect width="64" height="64" rx="16" fill="#0E3D3A"/>
      <path d="M24 18c-4.5 0-8 3.4-8 7.6 0 1.6.5 3 1.4 4.2-.9 1.1-1.4 2.5-1.4 4 0 3.6 2.8 6.5 6.4 6.9.6 2.9 3.2 5.1 6.2 5.1V18.2c-1.4-.1-3-.2-4.6-.2Z" fill="#E8B04B"/>
      <path d="M40 18c4.5 0 8 3.4 8 7.6 0 1.6-.5 3-1.4 4.2.9 1.1 1.4 2.5 1.4 4 0 3.6-2.8 6.5-6.4 6.9-.6 2.9-3.2 5.1-6.2 5.1V18.2c1.4-.1 3-.2 4.6-.2Z" fill="#F6F1E7"/>
      <circle cx="32" cy="32" r="2.5" fill="#0E3D3A"/>
      <path d="M32 14v6M32 44v6" stroke="#E8B04B" strokeWidth="2.4" strokeLinecap="round"/>
    </svg>
  );
}
