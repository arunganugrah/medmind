"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, getDocs, setDoc, deleteDoc, doc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const C = { paper:"#F6F1E7", paperDeep:"#EFE7D6", ink:"#26221C", inkSoft:"#5C564B", green:"#13463D", greenSoft:"#2C6357", terra:"#C8553D", line:"#D9CFBC", card:"#FFFFFF", good:"#2C7A55", bad:"#B23A2E" };
const serif = { fontFamily:"'Fraunces', Georgia, serif" };
const sans  = { fontFamily:"'Hanken Grotesk', system-ui, sans-serif" };

// Ubah gambar -> WebP base64 (teks), dikecilkan agar muat di 1 dokumen Firestore (~1 MB).
function toWebpDataUrl(file, maxW = 1000) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        const LIMIT = 700 * 1024; // ~700KB teks, aman di bawah batas 1MB Firestore
        let q = 0.8;
        let url = canvas.toDataURL("image/webp", q);
        while (url.length > LIMIT && q > 0.3) { q -= 0.1; url = canvas.toDataURL("image/webp", q); }
        if (url.length > LIMIT) reject(new Error("Gambar terlalu besar walau sudah dikompres. Coba gambar lebih sederhana/kecil."));
        else resolve(url);
      };
      img.onerror = reject; img.src = e.target.result;
    };
    reader.onerror = reject; reader.readAsDataURL(file);
  });
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState(undefined);
  const [tab, setTab] = useState("konten");
  const [data, setData] = useState({ categories: [], subcategories: [], topics: [], quizzes: {}, vouchers: [] });

  useEffect(() => {
    document.body.style.background = C.paper;
    if (!document.getElementById("medmind-fonts")) {
      const l = document.createElement("link");
      l.id = "medmind-fonts"; l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Hanken+Grotesk:wght@400;500;600&display=swap";
      document.head.appendChild(l);
    }
    const unsub = onAuthStateChanged(auth, (u) => { setUser(u || null); if (!u) router.replace("/admin-login"); });
    return () => unsub();
  }, [router]);

  const reload = async () => {
    const [catsS, subsS, topsS, quizS, vouS] = await Promise.all([
      getDocs(collection(db, "categories")),
      getDocs(collection(db, "subcategories")),
      getDocs(collection(db, "topics")),
      getDocs(collection(db, "quizzes")),
      getDocs(collection(db, "vouchers")),
    ]);
    const quizzes = {};
    quizS.docs.forEach((d) => { quizzes[d.id] = d.data().items || []; });
    setData({
      categories: catsS.docs.map((d) => ({ id: d.id, ...d.data() })),
      subcategories: subsS.docs.map((d) => ({ id: d.id, ...d.data() })),
      topics: topsS.docs.map((d) => ({ id: d.id, ...d.data() })),
      quizzes,
      vouchers: vouS.docs.map((d) => ({ id: d.id, ...d.data() })),
    });
  };
  useEffect(() => { if (user) reload(); }, [user]);

  if (user === undefined) return <div style={{ ...sans, padding:60, textAlign:"center", color:C.inkSoft }}>Memeriksa akses…</div>;
  if (!user) return null;

  return (
    <div style={{ ...sans, background:C.paper, color:C.ink, minHeight:"100vh" }}>
      <header style={{ borderBottom:`1px solid ${C.line}`, background:C.card }}>
        <div style={{ maxWidth:900, margin:"0 auto", padding:"14px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ ...serif, color:C.green, fontSize:20, fontWeight:700 }}>🧠 MedMind · Admin</span>
          <div style={{ display:"flex", gap:8 }}>
            <a href="/" style={{ fontSize:14, color:C.greenSoft, textDecoration:"none", padding:"6px 10px" }}>Lihat situs</a>
            <button onClick={() => signOut(auth)} style={{ fontSize:14, background:"none", border:`1px solid ${C.line}`, color:C.inkSoft, borderRadius:10, padding:"6px 12px", cursor:"pointer" }}>Keluar</button>
          </div>
        </div>
      </header>
      <main style={{ maxWidth:900, margin:"0 auto", padding:"24px 20px 80px" }}>
        <div style={{ display:"flex", gap:8, marginBottom:24, flexWrap:"wrap" }}>
          {[["konten","Kategori & Topik"],["kuis","Kuis"],["voucher","Voucher"]].map(([k,label]) => (
            <button key={k} onClick={() => setTab(k)}
              style={ tab === k ? { background:C.green, color:"#fff", border:`1px solid ${C.green}`, borderRadius:10, padding:"8px 16px", cursor:"pointer", fontWeight:500, fontSize:14 }
                                : { background:C.card, color:C.ink, border:`1px solid ${C.line}`, borderRadius:10, padding:"8px 16px", cursor:"pointer", fontWeight:500, fontSize:14 } }>
              {label}
            </button>
          ))}
        </div>
        {tab === "konten" && <Konten data={data} reload={reload} />}
        {tab === "kuis" && <Kuis data={data} reload={reload} />}
        {tab === "voucher" && <Voucher data={data} reload={reload} />}
      </main>
    </div>
  );
}

function Box({ title, children }) {
  return <div style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:18, padding:20, marginBottom:20 }}>
    <h3 style={{ color:C.green, fontWeight:600, margin:"0 0 16px" }}>{title}</h3>{children}</div>;
}
function Inp(props) { return <input {...props} style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:`1px solid ${C.line}`, fontSize:15, outline:"none", marginBottom:10, boxSizing:"border-box" }} />; }
function Sel(props) { return <select {...props} style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:`1px solid ${C.line}`, fontSize:15, marginBottom:10, boxSizing:"border-box", background:"#fff" }} />; }
function Btn({ children, onClick, danger, disabled }) {
  return <button onClick={onClick} disabled={disabled} style={{ background: danger ? C.bad : C.green, color:"#fff", border:"none", borderRadius:10, padding:"9px 16px", cursor:"pointer", fontWeight:500, fontSize:14, opacity: disabled ? 0.6 : 1 }}>{children}</button>;
}
const slug = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function Konten({ data, reload }) {
  const [catName, setCatName] = useState(""); const [catEmoji, setCatEmoji] = useState(""); const [catDesc, setCatDesc] = useState("");
  const [subName, setSubName] = useState(""); const [subCat, setSubCat] = useState("");
  const [tName, setTName] = useState(""); const [tSub, setTSub] = useState(""); const [tDesc, setTDesc] = useState("");
  const [imgUrl, setImgUrl] = useState(""); const [busy, setBusy] = useState(false);
  const fileRef = useRef();

  const addCat = async () => {
    if (!catName.trim()) return alert("Isi nama kategori.");
    await setDoc(doc(db, "categories", slug(catName)), { name: catName.trim(), emoji: catEmoji.trim(), desc: catDesc.trim() });
    setCatName(""); setCatEmoji(""); setCatDesc(""); reload();
  };
  const delCat = async (id) => { if (!confirm("Hapus kategori ini?")) return; await deleteDoc(doc(db, "categories", id)); reload(); };
  const addSub = async () => {
    if (!subCat) return alert("Pilih kategori.");
    if (!subName.trim()) return alert("Isi nama sub-bab.");
    await setDoc(doc(db, "subcategories", slug(subName) + "-" + subCat), { name: subName.trim(), categoryId: subCat });
    setSubName(""); reload();
  };
  const onFile = async (e) => {
    const f = e.target.files[0];
    if (!f) { setImgUrl(""); return; }
    setBusy(true);
    try { setImgUrl(await toWebpDataUrl(f)); }
    catch (err) { console.error(err); alert(err.message || "Gagal memproses gambar."); setImgUrl(""); if (fileRef.current) fileRef.current.value = ""; }
    finally { setBusy(false); }
  };
  const addTopic = async () => {
    if (!tSub) return alert("Pilih sub-bab.");
    if (!tName.trim()) return alert("Isi nama topik.");
    setBusy(true);
    try {
      await setDoc(doc(db, "topics", slug(tName) + "-" + tSub), { name: tName.trim(), subcategoryId: tSub, desc: tDesc.trim(), mindmapUrl: imgUrl });
      setTName(""); setTDesc(""); setImgUrl(""); if (fileRef.current) fileRef.current.value = ""; reload();
    } catch (e) { console.error(e); alert("Gagal menambah topik."); }
    finally { setBusy(false); }
  };
  const delTopic = async (id) => { if (!confirm("Hapus topik ini?")) return; await deleteDoc(doc(db, "topics", id)); reload(); };

  return (
    <div>
      <Box title="Tambah Kategori">
        <Inp placeholder="Nama (mis. Mata)" value={catName} onChange={(e) => setCatName(e.target.value)} />
        <Inp placeholder="Emoji (mis. 👁️)" value={catEmoji} onChange={(e) => setCatEmoji(e.target.value)} />
        <Inp placeholder="Deskripsi singkat" value={catDesc} onChange={(e) => setCatDesc(e.target.value)} />
        <Btn onClick={addCat}>+ Tambah Kategori</Btn>
        <div style={{ marginTop:14, display:"flex", flexWrap:"wrap", gap:8 }}>
          {data.categories.map((c) => (
            <span key={c.id} style={{ background:C.paperDeep, padding:"6px 12px", borderRadius:999, fontSize:14, display:"flex", gap:8, alignItems:"center" }}>
              {c.emoji} {c.name}<button onClick={() => delCat(c.id)} style={{ background:"none", border:"none", color:C.bad, cursor:"pointer", fontWeight:700 }}>×</button>
            </span>
          ))}
        </div>
      </Box>

      <Box title="Tambah Sub-bab">
        <Sel value={subCat} onChange={(e) => setSubCat(e.target.value)}>
          <option value="">— pilih kategori —</option>
          {data.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Sel>
        <Inp placeholder="Nama sub-bab (mis. Kelainan Refraksi)" value={subName} onChange={(e) => setSubName(e.target.value)} />
        <Btn onClick={addSub}>+ Tambah Sub-bab</Btn>
      </Box>

      <Box title="Tambah Topik + Mind Map">
        <Sel value={tSub} onChange={(e) => setTSub(e.target.value)}>
          <option value="">— pilih sub-bab —</option>
          {data.subcategories.map((s) => { const c = data.categories.find((x) => x.id === s.categoryId); return <option key={s.id} value={s.id}>{c?.name} › {s.name}</option>; })}
        </Sel>
        <Inp placeholder="Nama topik (mis. Miopia)" value={tName} onChange={(e) => setTName(e.target.value)} />
        <textarea placeholder="Penjelasan singkat" value={tDesc} onChange={(e) => setTDesc(e.target.value)} rows={3}
          style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:`1px solid ${C.line}`, fontSize:15, outline:"none", marginBottom:10, boxSizing:"border-box", fontFamily:"inherit" }} />
        <p style={{ fontSize:13, color:C.inkSoft, margin:"4px 0" }}>Mind map (otomatis dikecilkan ke WebP, disimpan di Firestore):</p>
        <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ marginBottom:12, fontSize:14 }} />
        {imgUrl && <img src={imgUrl} alt="pratinjau" style={{ maxHeight:160, borderRadius:10, border:`1px solid ${C.line}`, display:"block", marginBottom:12 }} />}
        <div><Btn onClick={addTopic} disabled={busy}>{busy ? "Memproses…" : "+ Tambah Topik"}</Btn></div>
      </Box>

      <Box title="Daftar Topik">
        {data.topics.length === 0 && <p style={{ color:C.inkSoft, fontSize:14 }}>Belum ada topik.</p>}
        {data.topics.map((t) => {
          const s = data.subcategories.find((x) => x.id === t.subcategoryId);
          const c = s && data.categories.find((x) => x.id === s.categoryId);
          const qn = (data.quizzes[t.id] || []).length;
          return (
            <div key={t.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", border:`1px solid ${C.line}`, borderRadius:10, padding:"10px 12px", marginBottom:8 }}>
              <span style={{ fontSize:14 }}><b>{t.name}</b> <span style={{ color:C.inkSoft }}>· {c?.name} › {s?.name} · {qn} soal</span></span>
              <button onClick={() => delTopic(t.id)} style={{ background:"none", border:"none", color:C.bad, cursor:"pointer", fontSize:14 }}>Hapus</button>
            </div>
          );
        })}
      </Box>
    </div>
  );
}

function Kuis({ data, reload }) {
  const [topicId, setTopicId] = useState("");
  const [q, setQ] = useState(""); const [opts, setOpts] = useState(["","","",""]);
  const [ans, setAns] = useState(0); const [disc, setDisc] = useState("");
  const quiz = topicId ? (data.quizzes[topicId] || []) : [];
  const save = async (items) => { await setDoc(doc(db, "quizzes", topicId), { items }); reload(); };
  const addQ = async () => {
    if (!topicId) return alert("Pilih topik dulu.");
    if (!q.trim() || !opts[0].trim() || !opts[1].trim()) return alert("Lengkapi pertanyaan & minimal 2 opsi.");
    if (!opts[ans] || !opts[ans].trim()) return alert("Opsi jawaban benar masih kosong.");
    const cleanOpts = opts.map((o) => o.trim()).filter((o) => o);
    const item = { question: q.trim(), options: cleanOpts, answer: Math.min(ans, cleanOpts.length - 1), discussion: disc.trim() };
    await save([...quiz, item]);
    setQ(""); setOpts(["","","",""]); setAns(0); setDisc("");
  };
  const delQ = async (i) => { await save(quiz.filter((_, idx) => idx !== i)); };

  return (
    <div>
      <Box title="Pilih Topik">
        <Sel value={topicId} onChange={(e) => setTopicId(e.target.value)}>
          <option value="">— pilih topik —</option>
          {data.topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </Sel>
      </Box>
      {topicId && (
        <>
          <Box title="Tambah Soal">
            <Inp placeholder="Pertanyaan" value={q} onChange={(e) => setQ(e.target.value)} />
            {opts.map((o, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                <input type="radio" name="ans" checked={ans === i} onChange={() => setAns(i)} title="Tandai jawaban benar" />
                <input value={o} onChange={(e) => { const n = [...opts]; n[i] = e.target.value; setOpts(n); }}
                  placeholder={`Opsi ${String.fromCharCode(65 + i)}${i < 2 ? " (wajib)" : " (opsional)"}`}
                  style={{ flex:1, padding:"10px 12px", borderRadius:10, border:`1px solid ${C.line}`, fontSize:15, outline:"none", boxSizing:"border-box" }} />
              </div>
            ))}
            <p style={{ fontSize:12, color:C.inkSoft, margin:"4px 0 10px" }}>Klik lingkaran di kiri untuk menandai jawaban benar.</p>
            <textarea placeholder="Pembahasan (muncul setelah murid menjawab)" value={disc} onChange={(e) => setDisc(e.target.value)} rows={3}
              style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:`1px solid ${C.line}`, fontSize:15, outline:"none", marginBottom:12, boxSizing:"border-box", fontFamily:"inherit" }} />
            <Btn onClick={addQ}>+ Tambah Soal</Btn>
          </Box>
          <Box title={`Soal Tersimpan (${quiz.length})`}>
            {quiz.length === 0 && <p style={{ color:C.inkSoft, fontSize:14 }}>Belum ada soal.</p>}
            {quiz.map((item, i) => (
              <div key={i} style={{ border:`1px solid ${C.line}`, borderRadius:10, padding:12, marginBottom:8 }}>
                <div style={{ display:"flex", justifyContent:"space-between", gap:8 }}>
                  <b style={{ fontSize:14 }}>{i + 1}. {item.question}</b>
                  <button onClick={() => delQ(i)} style={{ background:"none", border:"none", color:C.bad, cursor:"pointer", fontSize:14 }}>Hapus</button>
                </div>
                <div style={{ fontSize:13, color:C.inkSoft, marginTop:4 }}>
                  {item.options.map((o, oi) => (
                    <span key={oi} style={oi === item.answer ? { color:C.good, fontWeight:600 } : {}}>{String.fromCharCode(65 + oi)}. {o}{oi < item.options.length - 1 ? "  ·  " : ""}</span>
                  ))}
                </div>
              </div>
            ))}
          </Box>
        </>
      )}
    </div>
  );
}

function Voucher({ data, reload }) {
  const [code, setCode] = useState("");
  const add = async () => { const c = code.trim().toUpperCase(); if (!c) return alert("Isi kode voucher."); await setDoc(doc(db, "vouchers", c), { active: true }); setCode(""); reload(); };
  const toggle = async (v) => { await setDoc(doc(db, "vouchers", v.id), { active: !v.active }); reload(); };
  const del = async (id) => { if (!confirm("Hapus voucher?")) return; await deleteDoc(doc(db, "vouchers", id)); reload(); };
  return (
    <div>
      <Box title="Tambah Voucher">
        <Inp placeholder="MMQ-MATA-001" value={code} onChange={(e) => setCode(e.target.value)} />
        <Btn onClick={add}>+ Tambah Voucher</Btn>
      </Box>
      <Box title={`Daftar Voucher (${data.vouchers.length})`}>
        {data.vouchers.length === 0 && <p style={{ color:C.inkSoft, fontSize:14 }}>Belum ada voucher.</p>}
        {data.vouchers.map((v) => (
          <div key={v.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", border:`1px solid ${C.line}`, borderRadius:10, padding:"10px 12px", marginBottom:8 }}>
            <span style={{ fontSize:14, fontFamily:"monospace" }}>{v.id} <span style={{ color: v.active ? C.good : C.bad, fontSize:12, fontWeight:600 }}>{v.active ? "AKTIF" : "NONAKTIF"}</span></span>
            <span style={{ display:"flex", gap:12 }}>
              <button onClick={() => toggle(v)} style={{ background:"none", border:"none", color:C.greenSoft, cursor:"pointer", fontSize:14 }}>{v.active ? "Nonaktifkan" : "Aktifkan"}</button>
              <button onClick={() => del(v.id)} style={{ background:"none", border:"none", color:C.bad, cursor:"pointer", fontSize:14 }}>Hapus</button>
            </span>
          </div>
        ))}
      </Box>
    </div>
  );
}
