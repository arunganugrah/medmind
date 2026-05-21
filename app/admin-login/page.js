"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

const C = { paper:"#F6F1E7", ink:"#26221C", inkSoft:"#5C564B", green:"#13463D", terra:"#C8553D", line:"#D9CFBC", card:"#FFFFFF" };
const serif = { fontFamily:"'Fraunces', Georgia, serif" };
const sans  = { fontFamily:"'Hanken Grotesk', system-ui, sans-serif" };

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
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
    if (!email.trim() || !pw) return alert("Lengkapi email & kata sandi.");
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pw);
      router.replace("/admin");
    } catch (e) {
      console.error(e);
      alert("Email atau kata sandi salah.");
    } finally { setBusy(false); }
  };

  return (
    <div style={{ ...sans, background:C.paper, color:C.ink, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ width:"100%", maxWidth:380, background:C.card, border:`1px solid ${C.line}`, borderRadius:20, padding:32 }}>
        <h1 style={{ ...serif, color:C.green, fontSize:24, fontWeight:700, textAlign:"center", margin:"0 0 4px" }}>Masuk Admin</h1>
        <p style={{ color:C.inkSoft, textAlign:"center", fontSize:14, marginBottom:24 }}>Khusus pengelola MedMind.</p>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email admin" type="email"
          style={{ width:"100%", padding:"12px 14px", borderRadius:12, border:`1px solid ${C.line}`, fontSize:16, outline:"none", marginBottom:12, boxSizing:"border-box" }} />
        <input value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Kata sandi" type="password"
          style={{ width:"100%", padding:"12px 14px", borderRadius:12, border:`1px solid ${C.line}`, fontSize:16, outline:"none", marginBottom:12, boxSizing:"border-box" }} />
        <button onClick={submit} disabled={busy} style={{ width:"100%", padding:14, background:C.green, color:"#fff", borderRadius:12, fontWeight:600, border:"none", cursor:"pointer", fontSize:16 }}>
          {busy ? "Memeriksa…" : "Masuk"}
        </button>
      </div>
    </div>
  );
}
