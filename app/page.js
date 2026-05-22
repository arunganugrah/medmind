"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

/* MedMind — murid + akses voucher per-kategori + PROGRES & ANALITIK (localStorage) */

const LIGHT = { paper:"#F6F1E7", paperDeep:"#ECE3D2", ink:"#1C2826", inkSoft:"#5A6B68", teal:"#0E3D3A", tealSoft:"#2C6B63", amber:"#D9952F", line:"#DCD3C2", card:"#FFFFFF", good:"#2C7A55", bad:"#B23A2E" };
const DARK  = { paper:"#10201D", paperDeep:"#16302B", ink:"#EAF0EE", inkSoft:"#9DB3AE", teal:"#7FC9B8", tealSoft:"#9BD6C7", amber:"#E8B04B", line:"#26433D", card:"#16302B", good:"#7FCBA0", bad:"#E08A7E" };
const serif = { fontFamily:"'Fraunces', Georgia, serif" };
const sans  = { fontFamily:"'Hanken Grotesk', system-ui, sans-serif" };

function Logo({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <rect width="64" height="64" rx="16" fill="#0E3D3A"/>
      <path d="M24 18c-4.5 0-8 3.4-8 7.6 0 1.6.5 3 1.4 4.2-.9 1.1-1.4 2.5-1.4 4 0 3.6 2.8 6.5 6.4 6.9.6 2.9 3.2 5.1 6.2 5.1V18.2c-1.4-.1-3-.2-4.6-.2Z" fill="#E8B04B"/>
      <path d="M40 18c4.5 0 8 3.4 8 7.6 0 1.6-.5 3-1.4 4.2.9 1.1 1.4 2.5 1.4 4 0 3.6-2.8 6.5-6.4 6.9-.6 2.9-3.2 5.1-6.2 5.1V18.2c1.4-.1 3-.2 4.6-.2Z" fill="#F6F1E7"/>
      <circle cx="32" cy="32" r="2.5" fill="#0E3D3A"/>
      <path d="M32 14v6M32 44v6" stroke="#E8B04B" strokeWidth="2.4" strokeLinecap="round"/>
    </svg>
  );
}

function canAccess(access, catId) {
  if (access === "all") return true;
  if (Array.isArray(access)) return access.includes(catId);
  return false;
}

/* ---------- Lapisan progres (localStorage) ---------- */
const PKEY = "medmind_progress_v1";
function loadProgress() {
  try { const r = localStorage.getItem(PKEY); return r ? JSON.parse(r) : { topics: {}, wrong: {} }; }
  catch { return { topics: {}, wrong: {} }; }
}
function saveProgress(p) { try { localStorage.setItem(PKEY, JSON.stringify(p)); } catch {} }
// catat hasil kuis 1 topik. wrongList = array {q, picked, correct}
function recordQuiz(topicId, score, total, wrongList) {
  const p = loadProgress();
  const pct = Math.round((score / total) * 100);
  const prev = p.topics[topicId];
  p.topics[topicId] = {
    best: Math.max(pct, prev?.best || 0),
    last: pct,
    attempts: (prev?.attempts || 0) + 1,
    mastered: (prev?.mastered || false) || pct >= 70,
    lastAt: Date.now(),
  };
  // simpan kesalahan terakhir untuk topik ini (maks 50)
  p.wrong[topicId] = (wrongList || []).slice(0, 50);
  saveProgress(p);
  return p;
}

export default function Page() {
  const router = useRouter();
  const [dark, setDark] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [access, setAccess] = useState("all");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ categories: [], subcategories: [], topics: [], quizzes: {} });
  const [view, setView] = useState({ name: "home" });
  const [progress, setProgress] = useState({ topics: {}, wrong: {} });
  const C = dark ? DARK : LIGHT;

  useEffect(() => {
    const v = localStorage.getItem("medmind_voucher");
    if (!v) { router.replace("/login"); return; }
    try { const a = localStorage.getItem("medmind_access"); setAccess(a ? JSON.parse(a) : "all"); } catch { setAccess("all"); }
    setProgress(loadProgress());
    setAuthed(true);
  }, [router]);

  useEffect(() => {
    if (!document.getElementById("medmind-fonts")) {
      const l = document.createElement("link");
      l.id = "medmind-fonts"; l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Hanken+Grotesk:wght@400;500;600;700&display=swap";
      document.head.appendChild(l);
    }
  }, []);
  useEffect(() => { document.body.style.background = C.paper; }, [C.paper]);

  useEffect(() => {
    if (!authed) return;
    (async () => {
      try {
        const [catsS, subsS, topsS, quizS] = await Promise.all([
          getDocs(collection(db, "categories")), getDocs(collection(db, "subcategories")),
          getDocs(collection(db, "topics")), getDocs(collection(db, "quizzes")),
        ]);
        const quizzes = {};
        quizS.docs.forEach((d) => { quizzes[d.id] = d.data().items || []; });
        setData({
          categories: catsS.docs.map((d) => ({ id: d.id, ...d.data() })),
          subcategories: subsS.docs.map((d) => ({ id: d.id, ...d.data() })),
          topics: topsS.docs.map((d) => ({ id: d.id, ...d.data() })),
          quizzes,
        });
      } catch (e) { console.error(e); alert("Gagal memuat konten."); }
      finally { setLoading(false); }
    })();
  }, [authed]);

  const go = (v) => { setView(v); window.scrollTo(0, 0); };
  const onQuizDone = (topicId, score, total, wrongList) => { setProgress(recordQuiz(topicId, score, total, wrongList)); };
  const logout = () => { localStorage.removeItem("medmind_voucher"); localStorage.removeItem("medmind_access"); router.replace("/login"); };
  if (!authed) return null;

  return (
    <div style={{ ...sans, background:C.paper, color:C.ink, minHeight:"100vh" }}>
      <header style={{ position:"sticky", top:0, zIndex:20, borderBottom:`1px solid ${C.line}`, background:C.paper+"E6", backdropFilter:"blur(10px)" }}>
        <div style={{ maxWidth:980, margin:"0 auto", padding:"12px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <button onClick={() => go({ name:"home" })} style={{ display:"flex", alignItems:"center", gap:10, background:"none", border:"none", cursor:"pointer" }}>
            <Logo size={30} /><span style={{ ...serif, color:C.teal, fontSize:20, fontWeight:700, letterSpacing:"-.01em" }}>MedMind</span>
          </button>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={() => go({ name:"progress" })} style={{ background:C.card, border:`1px solid ${C.line}`, color:C.ink, borderRadius:10, padding:"6px 12px", cursor:"pointer", fontSize:14 }}>📊 Progres</button>
            <button onClick={() => setDark(!dark)} style={{ background:C.card, border:`1px solid ${C.line}`, color:C.ink, borderRadius:10, padding:"6px 12px", cursor:"pointer", fontSize:14 }}>{dark ? "☀️" : "🌙"}</button>
            <button onClick={logout} style={{ background:"none", border:`1px solid ${C.line}`, color:C.inkSoft, borderRadius:10, padding:"6px 12px", cursor:"pointer", fontSize:14 }}>Keluar</button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth:980, margin:"0 auto", padding:"0 20px 96px" }}>
        {loading ? (
          <p style={{ color:C.inkSoft, padding:"60px 0", textAlign:"center" }} className="mm-fade">Memuat konten…</p>
        ) : (
          <div className="mm-page" key={view.name + (view.catId||"") + (view.topicId||"")}>
            {view.name === "home" && <Home C={C} data={data} access={access} progress={progress} go={go} />}
            {view.name === "category" && <CategoryView C={C} data={data} access={access} progress={progress} catId={view.catId} go={go} />}
            {view.name === "topic" && <TopicView C={C} data={data} access={access} progress={progress} topicId={view.topicId} go={go} />}
            {view.name === "quiz" && <QuizView C={C} data={data} topicId={view.topicId} go={go} onDone={onQuizDone} />}
            {view.name === "progress" && <ProgressView C={C} data={data} access={access} progress={progress} go={go} setProgress={setProgress} />}
          </div>
        )}
      </main>
    </div>
  );
}

function Badge({ C, st }) {
  if (!st) return null;
  if (st.mastered) return <span style={{ background:C.good+"22", color:C.good, fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:999 }}>✓ Dikuasai</span>;
  return <span style={{ background:C.amber+"22", color:C.amber, fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:999 }}>Terbaik {st.best}%</span>;
}

function Home({ C, data, access, progress, go }) {
  return (
    <div>
      <section style={{ padding:"52px 0 40px" }}>
        <p style={{ color:C.amber, fontSize:13, fontWeight:600, letterSpacing:".14em", textTransform:"uppercase", margin:0 }}>Belajar lewat peta pikiran &amp; kuis</p>
        <h1 style={{ ...serif, color:C.teal, fontSize:46, fontWeight:700, lineHeight:1.08, letterSpacing:"-.02em", maxWidth:640, margin:"14px 0 0" }}>Pahami konsep medis secara visual, lalu uji dengan kuis.</h1>
        <p style={{ color:C.inkSoft, fontSize:18, maxWidth:520, marginTop:16 }}>Pilih kategori untuk mulai menjelajah materi.</p>
      </section>
      {data.categories.length === 0 && <Empty C={C} text="Belum ada konten. Tambahkan lewat /admin." />}
      <div className="mm-stagger" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:16 }}>
        {data.categories.map((cat) => {
          const allowed = canAccess(access, cat.id);
          const catTopics = data.topics.filter((t) => data.subcategories.some((s) => s.categoryId === cat.id && s.id === t.subcategoryId));
          const mastered = catTopics.filter((t) => progress.topics[t.id]?.mastered).length;
          const subCount = data.subcategories.filter((s) => s.categoryId === cat.id).length;
          return (
            <button key={cat.id} onClick={() => allowed ? go({ name:"category", catId:cat.id }) : alert("Kategori ini terkunci. Voucher Anda tidak mencakup " + cat.name + ".")}
              className={allowed ? "mm-lift" : ""}
              style={{ textAlign:"left", padding:24, borderRadius:18, border:`1px solid ${C.line}`, background:C.card, cursor:"pointer", position:"relative", opacity: allowed ? 1 : .62 }}>
              {!allowed && <span style={{ position:"absolute", top:16, right:16, background:C.paperDeep, color:C.inkSoft, fontSize:12, fontWeight:600, padding:"4px 10px", borderRadius:999 }}>🔒 Terkunci</span>}
              <div style={{ fontSize:30 }}>{cat.emoji || "📘"}</div>
              <h3 style={{ ...serif, color:C.ink, fontSize:24, fontWeight:600, margin:"12px 0 0" }}>{cat.name}</h3>
              {cat.desc && <p style={{ color:C.inkSoft, fontSize:14, margin:"4px 0 0" }}>{cat.desc}</p>}
              <p style={{ color: allowed ? C.tealSoft : C.inkSoft, fontSize:12, fontWeight:600, marginTop:12 }}>
                {allowed ? `${subCount} sub-bab · ${mastered}/${catTopics.length} topik dikuasai` : "Butuh voucher untuk membuka"}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CategoryView({ C, data, access, progress, catId, go }) {
  const cat = data.categories.find((c) => c.id === catId);
  if (!cat) return <Empty C={C} text="Kategori tidak ditemukan." />;
  if (!canAccess(access, catId)) return <Locked C={C} catName={cat.name} go={go} />;
  const subs = data.subcategories.filter((s) => s.categoryId === catId);
  return (
    <div style={{ padding:"32px 0" }}>
      <Crumb C={C} go={go} items={[{ label:"Beranda", to:{ name:"home" } }, { label:cat.name }]} />
      <div style={{ display:"flex", alignItems:"center", gap:12, margin:"16px 0 32px" }}>
        <span style={{ fontSize:36 }}>{cat.emoji || "📘"}</span>
        <h2 style={{ ...serif, color:C.teal, fontSize:32, fontWeight:700, margin:0, letterSpacing:"-.01em" }}>{cat.name}</h2>
      </div>
      {subs.map((sub) => {
        const topics = data.topics.filter((t) => t.subcategoryId === sub.id);
        return (
          <div key={sub.id} style={{ marginBottom:32 }}>
            <h3 style={{ color:C.amber, fontSize:13, fontWeight:600, letterSpacing:".14em", textTransform:"uppercase", marginBottom:12 }}>{sub.name}</h3>
            <div className="mm-stagger" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))", gap:12 }}>
              {topics.map((t) => {
                const st = progress.topics[t.id];
                return (
                  <button key={t.id} onClick={() => go({ name:"topic", topicId:t.id })} className="mm-lift"
                    style={{ textAlign:"left", padding:16, borderRadius:14, border:`1px solid ${C.line}`, background:C.card, cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
                    <span style={{ fontWeight:500 }}>{st?.mastered ? "✓ " : ""}{t.name}</span>
                    <Badge C={C} st={st} />
                  </button>
                );
              })}
              {topics.length === 0 && <p style={{ color:C.inkSoft, fontSize:14 }}>Belum ada topik.</p>}
            </div>
          </div>
        );
      })}
      {subs.length === 0 && <Empty C={C} text="Belum ada sub-bab." />}
    </div>
  );
}

function TopicView({ C, data, access, progress, topicId, go }) {
  const topic = data.topics.find((t) => t.id === topicId);
  if (!topic) return <Empty C={C} text="Topik tidak ditemukan." />;
  const sub = data.subcategories.find((s) => s.id === topic.subcategoryId);
  const cat = sub && data.categories.find((c) => c.id === sub.categoryId);
  if (cat && !canAccess(access, cat.id)) return <Locked C={C} catName={cat.name} go={go} />;
  const quiz = data.quizzes[topicId] || [];
  const st = progress.topics[topicId];
  return (
    <div style={{ padding:"32px 0" }}>
      <Crumb C={C} go={go} items={[{ label:"Beranda", to:{ name:"home" } }, cat && { label:cat.name, to:{ name:"category", catId:cat.id } }, { label:topic.name }].filter(Boolean)} />
      <div style={{ display:"flex", alignItems:"center", gap:12, margin:"16px 0" }}>
        <h2 style={{ ...serif, color:C.teal, fontSize:38, fontWeight:700, margin:0, letterSpacing:"-.02em" }}>{topic.name}</h2>
        <Badge C={C} st={st} />
      </div>
      {topic.mindmapUrl ? (
        <div style={{ borderRadius:18, border:`1px solid ${C.line}`, background:C.card, overflow:"hidden", marginBottom:24 }}>
          <img src={topic.mindmapUrl} alt={`Mind map ${topic.name}`} style={{ width:"100%", display:"block" }} />
        </div>
      ) : (
        <div style={{ borderRadius:18, border:`1px dashed ${C.line}`, background:C.paperDeep, color:C.inkSoft, padding:40, textAlign:"center", marginBottom:24 }}>🗺️ Belum ada mind map.</div>
      )}
      {topic.desc && (
        <div style={{ borderRadius:18, border:`1px solid ${C.line}`, background:C.card, padding:22, marginBottom:24 }}>
          <p style={{ color:C.ink, lineHeight:1.7, margin:0, whiteSpace:"pre-wrap", fontSize:16 }}>{topic.desc}</p>
        </div>
      )}
      {quiz.length > 0 ? (
        <button onClick={() => go({ name:"quiz", topicId })} style={{ background:C.amber, color:"#1C2826", padding:"13px 26px", borderRadius:13, fontWeight:700, border:"none", cursor:"pointer", fontSize:16 }}>
          {st ? "Kerjakan Ulang Kuis" : "Mulai Kuis"} ({quiz.length} soal) →
        </button>
      ) : (<p style={{ color:C.inkSoft, fontSize:14 }}>Belum ada kuis.</p>)}
    </div>
  );
}

function Locked({ C, catName, go }) {
  return (
    <div className="mm-pop" style={{ padding:"60px 0", maxWidth:460, margin:"0 auto", textAlign:"center" }}>
      <div style={{ fontSize:48, marginBottom:12 }}>🔒</div>
      <h2 style={{ ...serif, color:C.teal, fontSize:28, fontWeight:700, margin:"0 0 8px" }}>Kategori terkunci</h2>
      <p style={{ color:C.inkSoft, fontSize:16, lineHeight:1.6, marginBottom:24 }}>Voucher Anda belum mencakup <b>{catName}</b>. Hubungi admin untuk membuka akses.</p>
      <button onClick={() => go({ name:"home" })} style={{ background:C.teal, color:"#fff", padding:"11px 22px", borderRadius:13, fontWeight:600, border:"none", cursor:"pointer" }}>← Kembali ke beranda</button>
    </div>
  );
}

function QuizView({ C, data, topicId, go, onDone }) {
  const topic = data.topics.find((t) => t.id === topicId);
  const quiz = data.quizzes[topicId] || [];
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState([]);
  const [done, setDone] = useState(false);
  const [saved, setSaved] = useState(false);
  if (quiz.length === 0) return <Empty C={C} text="Kuis tidak tersedia." />;
  const q = quiz[idx];

  const choose = (i) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === q.answer) setScore((s) => s + 1);
    else setWrong((w) => [...w, { q: q.question, picked: q.options[i], correct: q.options[q.answer] }]);
  };
  const next = () => {
    setPicked(null);
    if (idx + 1 < quiz.length) setIdx(idx + 1);
    else setDone(true);
  };
  // simpan progres sekali saat selesai
  useEffect(() => {
    if (done && !saved) { onDone(topicId, score, quiz.length, wrong); setSaved(true); }
  }, [done]);

  if (done) {
    const pct = Math.round((score / quiz.length) * 100);
    return (
      <div className="mm-pop" style={{ padding:"40px 0", maxWidth:520, margin:"0 auto" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:52, marginBottom:16 }}>{pct >= 70 ? "🎉" : pct >= 40 ? "👍" : "📚"}</div>
          <h2 style={{ ...serif, color:C.teal, fontSize:32, fontWeight:700, margin:"0 0 8px" }}>Selesai!</h2>
          <p style={{ color:C.inkSoft, marginBottom:24 }}>{topic?.name}</p>
          <div style={{ borderRadius:20, border:`1px solid ${C.line}`, background:C.card, padding:36, marginBottom:24 }}>
            <div style={{ color:C.amber, fontSize:52, fontWeight:700 }}>{score}/{quiz.length}</div>
            <div style={{ color:C.inkSoft, marginTop:4 }}>benar ({pct}%) {pct>=70 && "· Topik dikuasai ✓"}</div>
          </div>
        </div>

        {wrong.length > 0 && (
          <div style={{ borderRadius:16, border:`1px solid ${C.line}`, background:C.card, padding:20, marginBottom:24, textAlign:"left" }}>
            <h3 style={{ ...serif, color:C.bad, fontSize:18, fontWeight:600, margin:"0 0 12px" }}>Yang perlu diperbaiki ({wrong.length})</h3>
            {wrong.map((w, i) => (
              <div key={i} style={{ marginBottom:14, paddingBottom:14, borderBottom: i < wrong.length-1 ? `1px solid ${C.line}` : "none" }}>
                <p style={{ margin:"0 0 4px", fontWeight:600, fontSize:14 }}>{w.q}</p>
                <p style={{ margin:0, fontSize:13.5, color:C.bad }}>Jawaban Anda: {w.picked}</p>
                <p style={{ margin:"2px 0 0", fontSize:13.5, color:C.good }}>Seharusnya: {w.correct}</p>
              </div>
            ))}
          </div>
        )}

        <div style={{ display:"flex", gap:12, justifyContent:"center" }}>
          <button onClick={() => { setIdx(0); setPicked(null); setScore(0); setWrong([]); setDone(false); setSaved(false); }} style={{ background:C.teal, color:"#fff", padding:"11px 22px", borderRadius:13, fontWeight:600, border:"none", cursor:"pointer" }}>Ulangi</button>
          <button onClick={() => go({ name:"progress" })} style={{ background:C.amber, color:"#1C2826", padding:"11px 22px", borderRadius:13, fontWeight:700, border:"none", cursor:"pointer" }}>Lihat Progres 📊</button>
          <button onClick={() => go({ name:"topic", topicId })} style={{ background:C.card, color:C.ink, padding:"11px 22px", borderRadius:13, border:`1px solid ${C.line}`, cursor:"pointer" }}>Kembali</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding:"32px 0", maxWidth:640, margin:"0 auto" }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
        <span style={{ color:C.tealSoft, fontSize:14, fontWeight:600 }}>Soal {idx + 1} dari {quiz.length}</span>
        <button onClick={() => go({ name:"topic", topicId })} style={{ background:"none", border:"none", color:C.inkSoft, fontSize:14, cursor:"pointer" }}>Keluar</button>
      </div>
      <div style={{ background:C.paperDeep, height:6, borderRadius:999, marginBottom:32, overflow:"hidden" }}>
        <div style={{ background:C.amber, width:`${(idx / quiz.length) * 100}%`, height:"100%", transition:"width .4s cubic-bezier(.22,.61,.36,1)" }} />
      </div>
      <h2 style={{ ...serif, color:C.ink, fontSize:25, fontWeight:600, marginBottom:24, lineHeight:1.35 }}>{q.question}</h2>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {q.options.map((opt, i) => {
          let st = { background:C.card, border:`1px solid ${C.line}`, color:C.ink };
          if (picked !== null) {
            if (i === q.answer) st = { background:C.good + "22", border:`1.5px solid ${C.good}`, color:C.good };
            else if (i === picked) st = { background:C.bad + "22", border:`1.5px solid ${C.bad}`, color:C.bad };
          }
          return (
            <button key={i} onClick={() => choose(i)} disabled={picked !== null}
              style={{ ...st, textAlign:"left", padding:"13px 16px", borderRadius:13, fontWeight:500, cursor:picked === null ? "pointer" : "default", fontSize:16, transition:"all .15s" }}>
              <span style={{ opacity:0.5, marginRight:8 }}>{String.fromCharCode(65 + i)}.</span>{opt}
            </button>
          );
        })}
      </div>
      {picked !== null && q.discussion && (
        <div className="mm-fade" style={{ marginTop:20, borderRadius:14, border:`1px solid ${C.line}`, background:C.paperDeep, padding:18 }}>
          <div style={{ color:C.amber, fontSize:12, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", marginBottom:6 }}>Pembahasan</div>
          <p style={{ color:C.ink, lineHeight:1.7, margin:0 }}>{q.discussion}</p>
        </div>
      )}
      {picked !== null && (
        <button onClick={next} className="mm-fade" style={{ marginTop:24, width:"100%", padding:15, background:C.teal, color:"#fff", borderRadius:14, fontWeight:600, border:"none", cursor:"pointer", fontSize:16 }}>
          {idx + 1 < quiz.length ? "Soal berikutnya →" : "Lihat hasil"}
        </button>
      )}
    </div>
  );
}

/* ---------- Halaman Progres & Analitik ---------- */
function ProgressView({ C, data, access, progress, go, setProgress }) {
  const accessibleTopics = data.topics.filter((t) => {
    const s = data.subcategories.find((x) => x.id === t.subcategoryId);
    return s && canAccess(access, s.categoryId);
  });
  const studied = accessibleTopics.filter((t) => progress.topics[t.id]);
  const mastered = studied.filter((t) => progress.topics[t.id].mastered);
  const totalAttempts = studied.reduce((a, t) => a + (progress.topics[t.id].attempts || 0), 0);
  const avgBest = studied.length ? Math.round(studied.reduce((a, t) => a + progress.topics[t.id].best, 0) / studied.length) : 0;

  // topik yang masih lemah (sudah dicoba tapi belum dikuasai)
  const weak = studied.filter((t) => !progress.topics[t.id].mastered).sort((a, b) => progress.topics[a.id].best - progress.topics[b.id].best);

  // kumpulkan semua soal yang pernah salah (dari semua topik)
  const allWrong = [];
  Object.entries(progress.wrong || {}).forEach(([tid, list]) => {
    const t = accessibleTopics.find((x) => x.id === tid);
    if (!t) return;
    (list || []).forEach((w) => allWrong.push({ ...w, topic: t.name }));
  });

  const reset = () => {
    if (!confirm("Hapus semua data progres Anda? Tidak bisa dibatalkan.")) return;
    localStorage.removeItem(PKEY);
    const empty = { topics: {}, wrong: {} };
    setProgress(empty);
  };

  return (
    <div style={{ padding:"32px 0" }}>
      <Crumb C={C} go={go} items={[{ label:"Beranda", to:{ name:"home" } }, { label:"Progres Saya" }]} />
      <h2 style={{ ...serif, color:C.teal, fontSize:36, fontWeight:700, margin:"16px 0 8px", letterSpacing:"-.02em" }}>Progres Saya</h2>
      <p style={{ color:C.inkSoft, fontSize:15, marginBottom:28 }}>Ringkasan belajar Anda. Data tersimpan di perangkat ini.</p>

      {studied.length === 0 ? (
        <Empty C={C} text="Belum ada data. Kerjakan kuis dulu untuk melihat progres Anda." />
      ) : (
        <>
          <div className="mm-stagger" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:14, marginBottom:32 }}>
            <Stat C={C} big={`${mastered.length}/${accessibleTopics.length}`} label="Topik dikuasai" />
            <Stat C={C} big={`${avgBest}%`} label="Rata-rata skor terbaik" />
            <Stat C={C} big={studied.length} label="Topik dipelajari" />
            <Stat C={C} big={totalAttempts} label="Total percobaan kuis" />
          </div>

          {weak.length > 0 && (
            <div style={{ marginBottom:32 }}>
              <h3 style={{ ...serif, color:C.amber, fontSize:20, fontWeight:600, margin:"0 0 12px" }}>Perlu diperkuat</h3>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {weak.map((t) => {
                  const st = progress.topics[t.id];
                  return (
                    <button key={t.id} onClick={() => go({ name:"topic", topicId:t.id })}
                      style={{ display:"flex", justifyContent:"space-between", alignItems:"center", border:`1px solid ${C.line}`, borderRadius:12, padding:"12px 16px", background:C.card, cursor:"pointer", textAlign:"left" }}>
                      <span style={{ fontWeight:500 }}>{t.name}</span>
                      <span style={{ display:"flex", alignItems:"center", gap:12 }}>
                        <span style={{ width:90, height:7, background:C.paperDeep, borderRadius:999, overflow:"hidden" }}>
                          <span style={{ display:"block", height:"100%", width:`${st.best}%`, background:C.amber }} />
                        </span>
                        <span style={{ fontSize:13, color:C.inkSoft, minWidth:36, textAlign:"right" }}>{st.best}%</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {allWrong.length > 0 && (
            <div style={{ marginBottom:32 }}>
              <h3 style={{ ...serif, color:C.bad, fontSize:20, fontWeight:600, margin:"0 0 4px" }}>Analitik kesalahan</h3>
              <p style={{ color:C.inkSoft, fontSize:13.5, margin:"0 0 12px" }}>Soal yang Anda jawab salah pada percobaan terakhir tiap topik.</p>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {allWrong.map((w, i) => (
                  <div key={i} style={{ border:`1px solid ${C.line}`, borderRadius:12, padding:"14px 16px", background:C.card }}>
                    <div style={{ fontSize:11.5, color:C.tealSoft, fontWeight:700, letterSpacing:".06em", textTransform:"uppercase", marginBottom:4 }}>{w.topic}</div>
                    <p style={{ margin:"0 0 6px", fontWeight:600, fontSize:14.5 }}>{w.q}</p>
                    <p style={{ margin:0, fontSize:13.5, color:C.bad }}>✗ Jawaban Anda: {w.picked}</p>
                    <p style={{ margin:"2px 0 0", fontSize:13.5, color:C.good }}>✓ Seharusnya: {w.correct}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={reset} style={{ background:"none", border:`1px solid ${C.line}`, color:C.inkSoft, borderRadius:10, padding:"8px 16px", cursor:"pointer", fontSize:13 }}>Reset data progres</button>
        </>
      )}
    </div>
  );
}

function Stat({ C, big, label }) {
  return (
    <div style={{ background:C.card, border:`1px solid ${C.line}`, borderRadius:16, padding:"20px 16px", textAlign:"center" }}>
      <div style={{ ...serif, color:C.teal, fontSize:30, fontWeight:700 }}>{big}</div>
      <div style={{ color:C.inkSoft, fontSize:12.5, marginTop:4 }}>{label}</div>
    </div>
  );
}

function Crumb({ C, items, go }) {
  return (
    <nav style={{ color:C.inkSoft, fontSize:14, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
      {items.map((it, i) => (
        <span key={i} style={{ display:"flex", alignItems:"center", gap:8 }}>
          {it.to ? <button onClick={() => go(it.to)} style={{ background:"none", border:"none", color:C.tealSoft, cursor:"pointer", fontSize:14, padding:0 }}>{it.label}</button>
                 : <span style={{ color:C.ink, fontWeight:500 }}>{it.label}</span>}
          {i < items.length - 1 && <span>›</span>}
        </span>
      ))}
    </nav>
  );
}
function Empty({ C, text }) {
  return <div style={{ borderRadius:18, border:`1px dashed ${C.line}`, color:C.inkSoft, background:C.paperDeep, padding:32, textAlign:"center", fontSize:14, marginTop:32 }}>{text}</div>;
}
