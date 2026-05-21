"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const C = { paper:"#F6F1E7", ink:"#26221C", inkSoft:"#5C564B", green:"#13463D", terra:"#C8553D", line:"#D9CFBC", card:"#FFFFFF" };
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
      l.href = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Hanken+Grotesk:wght@400;500;600&display=swap";
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
        localStorage.setItem("medmind_voucher", c);
        router.replace("/");
      } else {
        alert("Voucher tidak valid atau sudah nonaktif.");
      }
    } catch (e) {
      console.error(e);
      alert("Terjadi kesalahan. Cek koneksi & konfigurasi Firebase.");
    } finally { setBusy(false); }
  };

  return (
    <div style={{ ...sans, background:C.paper, color:C.ink, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ width:"100%", maxWidth:380, background:C.card, border:`1px solid ${C.line}`, borderRadius:20, padding:32 }}>
        <div style={{ fontSize:32, textAlign:"center" }}>🧠</div>
        <h1 style={{ ...serif, color:C.green, fontSize:26, fontWeight:700, textAlign:"center", margin:"8px 0 4px" }}>MedMind & Quiz</h1>
        <p style={{ color:C.inkSoft, textAlign:"center", fontSize:14, marginBottom:24 }}>Masukkan kode voucher untuk masuk.</p>
        <input value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="MMQ-MATA-001"
          style={{ width:"100%", padding:"12px 14px", borderRadius:12, border:`1px solid ${C.line}`, fontSize:16, outline:"none", marginBottom:12, textTransform:"uppercase", boxSizing:"border-box" }} />
        <button onClick={submit} disabled={busy} style={{ width:"100%", padding:14, background:C.green, color:"#fff", borderRadius:12, fontWeight:600, border:"none", cursor:"pointer", fontSize:16 }}>
          {busy ? "Memeriksa…" : "Masuk"}
        </button>
        <p style={{ color:C.inkSoft, textAlign:"center", fontSize:12, marginTop:16 }}>
          Admin? <a href="/admin-login" style={{ color:C.terra }}>Masuk di sini</a>
        </p>
      </div>
    </div>
  );
}
