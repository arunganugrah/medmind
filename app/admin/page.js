"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, getDocs, setDoc, deleteDoc, doc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const C = { paper:"#F6F1E7", paperDeep:"#ECE3D2", ink:"#1C2826", inkSoft:"#5A6B68", teal:"#0E3D3A", tealSoft:"#2C6B63", amber:"#D9952F", line:"#DCD3C2", card:"#FFFFFF", good:"#2C7A55", bad:"#B23A2E" };
const serif = { fontFamily:"'Fraunces', Georgia, serif" };
const sans  = { fontFamily:"'Hanken Grotesk', system-ui, sans-serif" };

function toWebpDataUrl(file, maxW = 1400) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const LIMIT = 700 * 1024;

        const tryEncode = (width, quality) => {
          const scale = Math.min(1, width / img.width);
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          const canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, w, h);
          drawWatermark(ctx, w, h);
          const test = canvas.toDataURL("image/webp", 0.1);
          const fmt = test.startsWith("data:image/webp") ? "image/webp" : "image/jpeg";
          return canvas.toDataURL(fmt, quality);
        };

        // Tahap 1: coba kualitas tinggi dulu, turunkan pelan-pelan
        const qualities = [0.92, 0.85, 0.78, 0.70, 0.62, 0.54, 0.46];
        for (const q of qualities) {
          const url = tryEncode(maxW, q);
          if (url.length <= LIMIT) { resolve(url); return; }
        }

        // Tahap 2: kalau masih besar, kecilkan dimensi bertahap
        const widths = [1100, 900, 750, 600, 480];
        for (const w of widths) {
          const url = tryEncode(w, 0.72);
          if (url.length <= LIMIT) { resolve(url); return; }
        }

        // Tahap 3: paksa muat dengan kualitas minimum
        const url = tryEncode(400, 0.5);
        resolve(url); // selalu resolve, tidak pernah reject
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
const slug = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const drawWatermark = (ctx, w, h) => {
  const text = "© MedMind – Property of MedMind";
  const fontSize = Math.max(13, Math.round(w * 0.022));

  ctx.save();
  ctx.font = `600 ${fontSize}px sans-serif`;
  ctx.fillStyle = "rgba(14, 61, 58, 0.13)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const tileW = w * 0.55;
  const tileH = h * 0.22;

  for (let x = -tileW; x < w + tileW; x += tileW) {
    for (let y = -tileH; y < h + tileH; y += tileH) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-Math.PI / 6);
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }
  }
  ctx.restore();
};

function MindmapViewer({ src }) {
  const [zoomed, setZoomed] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef(null);
  const posRef = useRef({ x: 0, y: 0 });

  // Reset posisi setiap buka viewer
  const openViewer = () => {
    setPos({ x: 0, y: 0 });
    posRef.current = { x: 0, y: 0 };
    setZoomed(true);
  };

  // Mouse
  const onMouseDown = (e) => {
    e.preventDefault();
    dragStart.current = { mx: e.clientX, my: e.clientY, px: posRef.current.x, py: posRef.current.y };
    setDragging(true);
  };
  const onMouseMove = (e) => {
    if (!dragStart.current) return;
    const nx = dragStart.current.px + (e.clientX - dragStart.current.mx);
    const ny = dragStart.current.py + (e.clientY - dragStart.current.my);
    posRef.current = { x: nx, y: ny };
    setPos({ x: nx, y: ny });
  };
  const onMouseUp = () => { dragStart.current = null; setDragging(false); };

  // Touch (mobile)
  const onTouchStart = (e) => {
    const t = e.touches[0];
    dragStart.current = { mx: t.clientX, my: t.clientY, px: posRef.current.x, py: posRef.current.y };
  };
  const onTouchMove = (e) => {
    if (!dragStart.current) return;
    e.preventDefault();
    const t = e.touches[0];
    const nx = dragStart.current.px + (t.clientX - dragStart.current.mx);
    const ny = dragStart.current.py + (t.clientY - dragStart.current.my);
    posRef.current = { x: nx, y: ny };
    setPos({ x: nx, y: ny });
  };
  const onTouchEnd = () => { dragStart.current = null; };

  return (
    <>
      {/* Thumbnail — langsung bisa klik untuk buka */}
      <div
        style={{ cursor: "grab", position: "relative", borderRadius: 12, overflow: "hidden" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={() => { if (!dragging) openViewer(); }}
      >
        <img
        src={src}
        alt="Mind Map"
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          width: "100%",
          display: "block",
          borderRadius: 12,
          transform: `translate(${pos.x}px, ${pos.y}px)`,
          transition: dragging ? "none" : "transform 0.1s",
          userSelect: "none",
        }}
      />
        <div style={{
          position: "absolute", bottom: 10, right: 10,
          background: "rgba(14,61,58,0.7)", color: "#fff",
          fontSize: 12, padding: "4px 10px", borderRadius: 999,
          pointerEvents: "none"
        }}>
          🔍 Klik & geser untuk jelajahi
        </div>
      </div>

      {/* Fullscreen overlay dengan geser */}
      {zoomed && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 999,
            background: "rgba(0,0,0,0.88)",
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden",
          }}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          {/* Klik area gelap = tutup, tapi jangan tutup saat drag */}
          <div
            onClick={() => { if (!dragging) setZoomed(false); }}
            style={{ position: "absolute", inset: 0 }}
          />

          <img
            src={src}
            alt="Mind Map"
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{
              position: "relative",
              maxWidth: "92vw",
              maxHeight: "88vh",
              borderRadius: 12,
              objectFit: "contain",
              transform: `translate(${pos.x}px, ${pos.y}px)`,
              cursor: dragging ? "grabbing" : "grab",
              userSelect: "none",
              touchAction: "none",
              zIndex: 1,
            }}
          />

          {/* Tombol tutup */}
          <button
            onClick={() => setZoomed(false)}
            style={{
              position: "absolute", top: 16, right: 20,
              background: "rgba(255,255,255,0.15)", border: "none",
              color: "#fff", fontSize: 22, width: 40, height: 40,
              borderRadius: "50%", cursor: "pointer", zIndex: 2,
              display: "flex", alignItems: "center", justifyContent: "center"
            }}
          >✕</button>

          {/* Hint geser */}
          <div style={{
            position: "absolute", bottom: 20, left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(255,255,255,0.12)", color: "#fff",
            fontSize: 13, padding: "6px 16px", borderRadius: 999,
            pointerEvents: "none", zIndex: 2
          }}>
            Geser gambar · Klik area gelap untuk tutup
          </div>
        </div>
      )}
    </>
  );
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
      getDocs(collection(db, "categories")), getDocs(collection(db, "subcategories")),
      getDocs(collection(db, "topics")), getDocs(collection(db, "quizzes")), getDocs(collection(db, "vouchers")),
    ]);
    const quizzes = {};
    quizS.docs.forEach((d) => { quizzes[d.id] = d.data().items || []; });
    setData({
      categories: catsS.docs.map((d) => ({ id: d.id, ...d.data() })),
      subcategories: subsS.docs.map((d) => ({ id: d.id, ...d.data() })),
      topics: topsS.docs.map((d) => ({ id: d.id, ...d.data() })),
      quizzes, vouchers: vouS.docs.map((d) => ({ id: d.id, ...d.data() })),
    });
  };
  useEffect(() => { if (user) reload(); }, [user]);

  if (user === undefined) return <div style={{ ...sans, padding:60, textAlign:"center", color:C.inkSoft }}>Memeriksa akses…</div>;
  if (!user) return null;

  return (
    <div style={{ ...sans, background:C.paper, color:C.ink, minHeight:"100vh" }}>
      <header style={{ borderBottom:`1px solid ${C.line}`, background:C.card }}>
        <div style={{ maxWidth:900, margin:"0 auto", padding:"14px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ ...serif, color:C.teal, fontSize:20, fontWeight:700 }}>🧠 MedMind · Admin</span>
          <div style={{ display:"flex", gap:8 }}>
            <a href="/" style={{ fontSize:14, color:C.tealSoft, textDecoration:"none", padding:"6px 10px" }}>Lihat situs</a>
            <button onClick={() => signOut(auth)} style={{ fontSize:14, background:"none", border:`1px solid ${C.line}`, color:C.inkSoft, borderRadius:10, padding:"6px 12px", cursor:"pointer" }}>Keluar</button>
          </div>
        </div>
      </header>
      <main style={{ maxWidth:900, margin:"0 auto", padding:"24px 20px 80px" }}>
        <div style={{ display:"flex", gap:8, marginBottom:24, flexWrap:"wrap" }}>
          {[["konten","Kategori & Topik"],["kuis","Kuis"],["voucher","Voucher"]].map(([k,label]) => (
            <button key={k} onClick={() => setTab(k)}
              style={ tab === k ? { background:C.teal, color:"#fff", border:`1px solid ${C.teal}`, borderRadius:10, padding:"8px 16px", cursor:"pointer", fontWeight:500, fontSize:14 }
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

function Box({ title, children, sub }) {
  return <div style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:18, padding:20, marginBottom:20 }}>
    <h3 style={{ color:C.teal, fontWeight:600, margin:"0 0 4px" }}>{title}</h3>
    {sub && <p style={{ color:C.inkSoft, fontSize:13, margin:"0 0 14px" }}>{sub}</p>}
    {!sub && <div style={{ height:12 }} />}
    {children}</div>;
}
function Inp(props) { return <input {...props} style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:`1px solid ${C.line}`, fontSize:15, outline:"none", marginBottom:10, boxSizing:"border-box" }} />; }
function Area(props) { return <textarea {...props} style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:`1px solid ${C.line}`, fontSize:15, outline:"none", marginBottom:10, boxSizing:"border-box", fontFamily:"inherit" }} />; }
function Sel(props) { return <select {...props} style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:`1px solid ${C.line}`, fontSize:15, marginBottom:10, boxSizing:"border-box", background:"#fff" }} />; }
function Btn({ children, onClick, disabled, kind }) {
  const bg = kind === "ghost" ? C.card : kind === "amber" ? C.amber : C.teal;
  const col = kind === "ghost" ? C.ink : kind === "amber" ? "#1C2826" : "#fff";
  return <button onClick={onClick} disabled={disabled} style={{ background:bg, color:col, border: kind === "ghost" ? `1px solid ${C.line}` : "none", borderRadius:10, padding:"9px 16px", cursor:"pointer", fontWeight:600, fontSize:14, opacity: disabled ? 0.6 : 1 }}>{children}</button>;
}

/* ============================ KONTEN (dengan EDIT) ============================ */
function Konten({ data, reload }) {
  // kategori
  const [catName, setCatName] = useState(""); const [catEmoji, setCatEmoji] = useState(""); const [catDesc, setCatDesc] = useState("");
  const [editCat, setEditCat] = useState(null); // id sedang diedit
  // sub
  const [subName, setSubName] = useState(""); const [subCat, setSubCat] = useState("");
  const [editSub, setEditSub] = useState(null);
  // topik
  const [tName, setTName] = useState(""); const [tSub, setTSub] = useState(""); const [tDesc, setTDesc] = useState("");
  const [imgUrl, setImgUrl] = useState(""); const [busy, setBusy] = useState(false);
  const [editTopic, setEditTopic] = useState(null);
  const fileRef = useRef();

  // KATEGORI
  const saveCat = async () => {
    if (!catName.trim()) return alert("Isi nama kategori.");
    const id = editCat || slug(catName);
    await setDoc(doc(db, "categories", id), { name: catName.trim(), emoji: catEmoji.trim(), desc: catDesc.trim() });
    setCatName(""); setCatEmoji(""); setCatDesc(""); setEditCat(null); reload();
  };
  const startEditCat = (c) => { setEditCat(c.id); setCatName(c.name); setCatEmoji(c.emoji || ""); setCatDesc(c.desc || ""); window.scrollTo(0,0); };
  const delCat = async (id) => { if (!confirm("Hapus kategori ini?")) return; await deleteDoc(doc(db, "categories", id)); reload(); };

  // SUB
  const saveSub = async () => {
    if (!subCat) return alert("Pilih kategori.");
    if (!subName.trim()) return alert("Isi nama sub-bab.");
    const id = editSub || (slug(subName) + "-" + subCat);
    await setDoc(doc(db, "subcategories", id), { name: subName.trim(), categoryId: subCat });
    setSubName(""); setEditSub(null); reload();
  };
  const startEditSub = (s) => { setEditSub(s.id); setSubName(s.name); setSubCat(s.categoryId); window.scrollTo(0,0); };
  const delSub = async (id) => { if (!confirm("Hapus sub-bab ini?")) return; await deleteDoc(doc(db, "subcategories", id)); reload(); };

  // TOPIK
  const onFile = async (e) => {
    const f = e.target.files[0]; if (!f) { setImgUrl(""); return; }
    setBusy(true);
    try { setImgUrl(await toWebpDataUrl(f)); }
    catch (err) { alert(err.message || "Gagal memproses gambar."); setImgUrl(""); if (fileRef.current) fileRef.current.value=""; }
    finally { setBusy(false); }
  };
  const saveTopic = async () => {
    if (!tSub) return alert("Pilih sub-bab.");
    if (!tName.trim()) return alert("Isi nama topik.");
    setBusy(true);
    try {
      const id = editTopic ? editTopic.id : (slug(tName) + "-" + tSub);
      // saat edit & tidak ganti gambar, pertahankan gambar lama
      const mindmapUrl = imgUrl || (editTopic ? editTopic.mindmapUrl || "" : "");
      await setDoc(doc(db, "topics", id), { name: tName.trim(), subcategoryId: tSub, desc: tDesc.trim(), mindmapUrl });
      setTName(""); setTDesc(""); setImgUrl(""); setEditTopic(null); if (fileRef.current) fileRef.current.value=""; reload();
    } catch (e) { alert("Gagal menyimpan topik."); }
    finally { setBusy(false); }
  };
  const startEditTopic = (t) => { setEditTopic(t); setTName(t.name); setTSub(t.subcategoryId); setTDesc(t.desc || ""); setImgUrl(""); window.scrollTo(0,0); };
  const delTopic = async (id) => { if (!confirm("Hapus topik ini?")) return; await deleteDoc(doc(db, "topics", id)); reload(); };

  return (
    <div>
      <Box title={editCat ? "Edit Kategori" : "Tambah Kategori"}>
        <Inp placeholder="Nama (mis. Mata)" value={catName} onChange={(e) => setCatName(e.target.value)} />
        <Inp placeholder="Emoji (mis. 👁️)" value={catEmoji} onChange={(e) => setCatEmoji(e.target.value)} />
        <Inp placeholder="Deskripsi singkat" value={catDesc} onChange={(e) => setCatDesc(e.target.value)} />
        <div style={{ display:"flex", gap:8 }}>
          <Btn onClick={saveCat}>{editCat ? "Simpan Perubahan" : "+ Tambah Kategori"}</Btn>
          {editCat && <Btn kind="ghost" onClick={() => { setEditCat(null); setCatName(""); setCatEmoji(""); setCatDesc(""); }}>Batal</Btn>}
        </div>
        <div style={{ marginTop:14, display:"flex", flexDirection:"column", gap:8 }}>
          {data.categories.map((c) => (
            <div key={c.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", border:`1px solid ${C.line}`, borderRadius:10, padding:"8px 12px" }}>
              <span style={{ fontSize:14 }}>{c.emoji} <b>{c.name}</b></span>
              <span style={{ display:"flex", gap:12 }}>
                <button onClick={() => startEditCat(c)} style={{ background:"none", border:"none", color:C.tealSoft, cursor:"pointer", fontSize:14 }}>Edit</button>
                <button onClick={() => delCat(c.id)} style={{ background:"none", border:"none", color:C.bad, cursor:"pointer", fontSize:14 }}>Hapus</button>
              </span>
            </div>
          ))}
        </div>
      </Box>

      <Box title={editSub ? "Edit Sub-bab" : "Tambah Sub-bab"}>
        <Sel value={subCat} onChange={(e) => setSubCat(e.target.value)}>
          <option value="">— pilih kategori —</option>
          {data.categories.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
        </Sel>
        <Inp placeholder="Nama sub-bab (mis. Kelainan Refraksi)" value={subName} onChange={(e) => setSubName(e.target.value)} />
        <div style={{ display:"flex", gap:8 }}>
          <Btn onClick={saveSub}>{editSub ? "Simpan Perubahan" : "+ Tambah Sub-bab"}</Btn>
          {editSub && <Btn kind="ghost" onClick={() => { setEditSub(null); setSubName(""); setSubCat(""); }}>Batal</Btn>}
        </div>
        <div style={{ marginTop:14, display:"flex", flexDirection:"column", gap:8 }}>
          {data.subcategories.map((s) => {
            const c = data.categories.find((x) => x.id === s.categoryId);
            return (
              <div key={s.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", border:`1px solid ${C.line}`, borderRadius:10, padding:"8px 12px" }}>
                <span style={{ fontSize:14 }}><b>{s.name}</b> <span style={{ color:C.inkSoft }}>· {c?.name}</span></span>
                <span style={{ display:"flex", gap:12 }}>
                  <button onClick={() => startEditSub(s)} style={{ background:"none", border:"none", color:C.tealSoft, cursor:"pointer", fontSize:14 }}>Edit</button>
                  <button onClick={() => delSub(s.id)} style={{ background:"none", border:"none", color:C.bad, cursor:"pointer", fontSize:14 }}>Hapus</button>
                </span>
              </div>
            );
          })}
        </div>
      </Box>

      <Box title={editTopic ? "Edit Topik" : "Tambah Topik + Mind Map"}>
        <Sel value={tSub} onChange={(e) => setTSub(e.target.value)}>
          <option value="">— pilih sub-bab —</option>
          {data.subcategories.map((s) => { const c = data.categories.find((x) => x.id === s.categoryId); return <option key={s.id} value={s.id}>{c?.name} › {s.name}</option>; })}
        </Sel>
        <Inp placeholder="Nama topik (mis. Miopia)" value={tName} onChange={(e) => setTName(e.target.value)} />
        <Area placeholder="Penjelasan singkat" value={tDesc} onChange={(e) => setTDesc(e.target.value)} rows={3} />
        <p style={{ fontSize:13, color:C.inkSoft, margin:"4px 0" }}>
          Mind map (otomatis dikecilkan){editTopic ? " — kosongkan jika tidak ingin mengubah gambar lama" : ""}:
        </p>
        <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ marginBottom:12, fontSize:14 }} />
        {imgUrl && <img src={imgUrl} alt="pratinjau" style={{ maxHeight:160, borderRadius:10, border:`1px solid ${C.line}`, display:"block", marginBottom:12 }} />}
        <div style={{ display:"flex", gap:8 }}>
          <Btn onClick={saveTopic} disabled={busy}>{busy ? "Memproses…" : editTopic ? "Simpan Perubahan" : "+ Tambah Topik"}</Btn>
          {editTopic && <Btn kind="ghost" onClick={() => { setEditTopic(null); setTName(""); setTSub(""); setTDesc(""); setImgUrl(""); if (fileRef.current) fileRef.current.value=""; }}>Batal</Btn>}
        </div>
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
              <span style={{ display:"flex", gap:12, flexShrink:0 }}>
                <button onClick={() => startEditTopic(t)} style={{ background:"none", border:"none", color:C.tealSoft, cursor:"pointer", fontSize:14 }}>Edit</button>
                <button onClick={() => delTopic(t.id)} style={{ background:"none", border:"none", color:C.bad, cursor:"pointer", fontSize:14 }}>Hapus</button>
              </span>
            </div>
          );
        })}
      </Box>
    </div>
  );
}

/* ============================ KUIS (single + MASSAL + edit) ============================ */
function Kuis({ data, reload }) {
  const [topicId, setTopicId] = useState("");
  const [mode, setMode] = useState("satu"); // "satu" | "massal"
  // single
  const [q, setQ] = useState(""); const [opts, setOpts] = useState(["","","",""]);
  const [ans, setAns] = useState(0); const [disc, setDisc] = useState("");
  const [editIdx, setEditIdx] = useState(null);
  // massal
  const [bulk, setBulk] = useState("");

  const quiz = topicId ? (data.quizzes[topicId] || []) : [];
  const save = async (items) => { await setDoc(doc(db, "quizzes", topicId), { items }); reload(); };

  const resetSingle = () => { setQ(""); setOpts(["","","",""]); setAns(0); setDisc(""); setEditIdx(null); };
  const saveSingle = async () => {
    if (!topicId) return alert("Pilih topik dulu.");
    if (!q.trim() || !opts[0].trim() || !opts[1].trim()) return alert("Lengkapi pertanyaan & minimal 2 opsi.");
    if (!opts[ans] || !opts[ans].trim()) return alert("Opsi jawaban benar masih kosong.");
    const cleanOpts = opts.map((o) => o.trim()).filter((o) => o);
    const item = { question: q.trim(), options: cleanOpts, answer: Math.min(ans, cleanOpts.length - 1), discussion: disc.trim() };
    if (editIdx !== null) { const next = [...quiz]; next[editIdx] = item; await save(next); }
    else await save([...quiz, item]);
    resetSingle();
  };
  const startEdit = (i) => {
    const it = quiz[i]; setEditIdx(i); setQ(it.question);
    const o = [...it.options]; while (o.length < 4) o.push(""); setOpts(o.slice(0,4));
    setAns(it.answer); setDisc(it.discussion || ""); setMode("satu"); window.scrollTo(0,0);
  };
  const delQ = async (i) => { if (!confirm("Hapus soal ini?")) return; await save(quiz.filter((_, idx) => idx !== i)); };

  // Parser massal:
  // Format per soal, dipisah baris kosong:
  //   Pertanyaan?
  //   *Opsi benar (tanda * di depan = jawaban benar)
  //   Opsi lain
  //   Opsi lain
  //   # Pembahasan (baris diawali # = pembahasan, opsional)
  const parseBulk = (text) => {
    const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
    const items = []; const errors = [];
    blocks.forEach((b, bi) => {
      const lines = b.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length < 3) { errors.push(`Soal #${bi+1}: minimal butuh pertanyaan + 2 opsi.`); return; }
      const question = lines[0];
      let discussion = "";
      const optLines = [];
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].startsWith("#")) discussion = lines[i].replace(/^#\s?/, "").trim();
        else optLines.push(lines[i]);
      }
      let answer = optLines.findIndex((o) => o.startsWith("*"));
      if (answer === -1) answer = 0; // kalau lupa tandai, anggap opsi pertama
      const options = optLines.map((o) => o.replace(/^\*\s?/, "").trim()).filter(Boolean);
      if (options.length < 2) { errors.push(`Soal #${bi+1}: minimal 2 opsi.`); return; }
      items.push({ question, options, answer: Math.min(answer, options.length-1), discussion });
    });
    return { items, errors };
  };
  const importBulk = async () => {
    if (!topicId) return alert("Pilih topik dulu.");
    if (!bulk.trim()) return alert("Tempel soal di kotak dulu.");
    const { items, errors } = parseBulk(bulk);
    if (items.length === 0) return alert("Tidak ada soal valid terbaca.\n" + errors.join("\n"));
    let msg = `Akan menambah ${items.length} soal ke topik ini.`;
    if (errors.length) msg += `\n\nDilewati ${errors.length} blok bermasalah:\n` + errors.join("\n");
    if (!confirm(msg + "\n\nLanjut?")) return;
    await save([...quiz, ...items]);
    setBulk("");
  };

  return (
    <div>
      <Box title="Pilih Topik">
        <Sel value={topicId} onChange={(e) => { setTopicId(e.target.value); resetSingle(); }}>
          <option value="">— pilih topik —</option>
          {data.topics.map((t) => { const s = data.subcategories.find((x)=>x.id===t.subcategoryId); const c = s && data.categories.find((x)=>x.id===s.categoryId); return <option key={t.id} value={t.id}>{c?.name} › {t.name}</option>; })}
        </Sel>
      </Box>

      {topicId && (
        <>
          <div style={{ display:"flex", gap:8, marginBottom:16 }}>
            <button onClick={() => setMode("satu")} style={{ flex:1, padding:"8px", borderRadius:10, border:`1px solid ${mode==="satu"?C.teal:C.line}`, background: mode==="satu"?C.teal:C.card, color: mode==="satu"?"#fff":C.ink, cursor:"pointer", fontWeight:600, fontSize:14 }}>Satu per satu</button>
            <button onClick={() => setMode("massal")} style={{ flex:1, padding:"8px", borderRadius:10, border:`1px solid ${mode==="massal"?C.teal:C.line}`, background: mode==="massal"?C.teal:C.card, color: mode==="massal"?"#fff":C.ink, cursor:"pointer", fontWeight:600, fontSize:14 }}>Input massal ⚡</button>
          </div>

          {mode === "satu" && (
            <Box title={editIdx !== null ? `Edit Soal #${editIdx+1}` : "Tambah Soal"}>
              <Inp placeholder="Pertanyaan" value={q} onChange={(e) => setQ(e.target.value)} />
              {opts.map((o, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                  <input type="radio" name="ans" checked={ans === i} onChange={() => setAns(i)} title="Tandai jawaban benar" />
                  <input value={o} onChange={(e) => { const n=[...opts]; n[i]=e.target.value; setOpts(n); }}
                    placeholder={`Opsi ${String.fromCharCode(65+i)}${i<2?" (wajib)":" (opsional)"}`}
                    style={{ flex:1, padding:"10px 12px", borderRadius:10, border:`1px solid ${C.line}`, fontSize:15, outline:"none", boxSizing:"border-box" }} />
                </div>
              ))}
              <p style={{ fontSize:12, color:C.inkSoft, margin:"4px 0 10px" }}>Klik lingkaran di kiri untuk menandai jawaban benar.</p>
              <Area placeholder="Pembahasan (muncul setelah murid menjawab)" value={disc} onChange={(e) => setDisc(e.target.value)} rows={3} />
              <div style={{ display:"flex", gap:8 }}>
                <Btn onClick={saveSingle}>{editIdx !== null ? "Simpan Perubahan" : "+ Tambah Soal"}</Btn>
                {editIdx !== null && <Btn kind="ghost" onClick={resetSingle}>Batal</Btn>}
              </div>
            </Box>
          )}

          {mode === "massal" && (
            <Box title="Input Massal ⚡" sub="Tempel banyak soal sekaligus. Pisahkan tiap soal dengan SATU BARIS KOSONG.">
              <div style={{ background:C.paperDeep, borderRadius:12, padding:"12px 14px", marginBottom:12, fontSize:13, color:C.ink, lineHeight:1.6 }}>
                <b>Format tiap soal:</b><br/>
                • Baris 1 = pertanyaan<br/>
                • Baris berikut = opsi jawaban (beri tanda <b>*</b> di depan opsi yang BENAR)<br/>
                • Baris diawali <b>#</b> = pembahasan (opsional)<br/>
                • Pisahkan antar-soal dengan baris kosong
              </div>
              <div style={{ background:"#FCFAF5", border:`1px dashed ${C.line}`, borderRadius:12, padding:"12px 14px", marginBottom:12, fontSize:13, color:C.inkSoft, whiteSpace:"pre-wrap", fontFamily:"monospace" }}>
{`Pada miopia, bayangan jatuh di mana?
*Depan retina
Tepat di retina
Belakang retina
# Bola mata terlalu panjang, fokus di depan retina.

Lensa untuk koreksi miopia?
Cembung (plus)
*Cekung (minus)
Silindris
# Lensa cekung bersifat divergen.`}
              </div>
              <Area placeholder="Tempel soal Anda di sini…" value={bulk} onChange={(e) => setBulk(e.target.value)} rows={10} style={{ fontFamily:"monospace" }} />
              <Btn kind="amber" onClick={importBulk}>⚡ Proses & Tambahkan Semua</Btn>
            </Box>
          )}

          <Box title={`Soal Tersimpan (${quiz.length})`}>
            {quiz.length === 0 && <p style={{ color:C.inkSoft, fontSize:14 }}>Belum ada soal.</p>}
            {quiz.map((item, i) => (
              <div key={i} style={{ border:`1px solid ${C.line}`, borderRadius:10, padding:12, marginBottom:8 }}>
                <div style={{ display:"flex", justifyContent:"space-between", gap:8 }}>
                  <b style={{ fontSize:14 }}>{i + 1}. {item.question}</b>
                  <span style={{ display:"flex", gap:10, flexShrink:0 }}>
                    <button onClick={() => startEdit(i)} style={{ background:"none", border:"none", color:C.tealSoft, cursor:"pointer", fontSize:14 }}>Edit</button>
                    <button onClick={() => delQ(i)} style={{ background:"none", border:"none", color:C.bad, cursor:"pointer", fontSize:14 }}>Hapus</button>
                  </span>
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

/* ============================ VOUCHER (dengan per-kategori) ============================ */
function Voucher({ data, reload }) {
  const [code, setCode] = useState("");
  const [allAccess, setAllAccess] = useState(false);
  const [picked, setPicked] = useState([]);
  const toggleCat = (id) => setPicked((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const add = async () => {
    const c = code.trim().toUpperCase();
    if (!c) return alert("Isi kode voucher.");
    if (!allAccess && picked.length === 0) return alert("Pilih minimal 1 kategori, atau centang 'Semua kategori'.");
    await setDoc(doc(db, "vouchers", c), { active: true, categories: allAccess ? "all" : picked });
    setCode(""); setAllAccess(false); setPicked([]); reload();
  };
  const toggleActive = async (v) => { await setDoc(doc(db, "vouchers", v.id), { active: !v.active, categories: v.categories ?? "all" }); reload(); };
  const del = async (id) => { if (!confirm("Hapus voucher?")) return; await deleteDoc(doc(db, "vouchers", id)); reload(); };
  const catName = (id) => data.categories.find((c) => c.id === id)?.name || id;
  const describe = (v) => (v.categories === undefined || v.categories === "all") ? "Semua kategori" : Array.isArray(v.categories) ? (v.categories.map(catName).join(", ") || "(kosong)") : String(v.categories);

  return (
    <div>
      <Box title="Tambah Voucher">
        <Inp placeholder="MMQ-MATA-001" value={code} onChange={(e) => setCode(e.target.value)} />
        <label style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12, fontSize:14, fontWeight:600, color:C.teal }}>
          <input type="checkbox" checked={allAccess} onChange={(e) => setAllAccess(e.target.checked)} /> Akses SEMUA kategori
        </label>
        {!allAccess && (
          <div style={{ marginBottom:12 }}>
            <p style={{ fontSize:13, color:C.inkSoft, margin:"0 0 8px" }}>Pilih kategori yang dibuka voucher ini:</p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {data.categories.map((c) => {
                const on = picked.includes(c.id);
                return <button key={c.id} onClick={() => toggleCat(c.id)} style={{ border:`1.5px solid ${on?C.teal:C.line}`, background: on?C.teal:C.card, color: on?"#fff":C.ink, borderRadius:999, padding:"7px 14px", cursor:"pointer", fontSize:14, fontWeight:500 }}>{on?"✓ ":""}{c.emoji} {c.name}</button>;
              })}
              {data.categories.length === 0 && <span style={{ fontSize:13, color:C.inkSoft }}>Belum ada kategori.</span>}
            </div>
          </div>
        )}
        <Btn onClick={add}>+ Tambah Voucher</Btn>
      </Box>
      <Box title={`Daftar Voucher (${data.vouchers.length})`}>
        {data.vouchers.length === 0 && <p style={{ color:C.inkSoft, fontSize:14 }}>Belum ada voucher.</p>}
        {data.vouchers.map((v) => (
          <div key={v.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", border:`1px solid ${C.line}`, borderRadius:10, padding:"10px 12px", marginBottom:8, gap:12 }}>
            <span style={{ fontSize:14 }}>
              <b style={{ fontFamily:"monospace" }}>{v.id}</b>
              <span style={{ color: v.active ? C.good : C.bad, fontSize:12, fontWeight:600, marginLeft:8 }}>{v.active ? "AKTIF" : "NONAKTIF"}</span>
              <span style={{ display:"block", color:C.inkSoft, fontSize:12.5, marginTop:2 }}>🔑 {describe(v)}</span>
            </span>
            <span style={{ display:"flex", gap:12, flexShrink:0 }}>
              <button onClick={() => toggleActive(v)} style={{ background:"none", border:"none", color:C.tealSoft, cursor:"pointer", fontSize:14 }}>{v.active ? "Nonaktifkan" : "Aktifkan"}</button>
              <button onClick={() => del(v.id)} style={{ background:"none", border:"none", color:C.bad, cursor:"pointer", fontSize:14 }}>Hapus</button>
            </span>
          </div>
        ))}
      </Box>
    </div>
  );
}
