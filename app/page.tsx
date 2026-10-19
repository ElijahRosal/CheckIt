"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

type Vote = "ai" | "real";
type ImageItem = {
  id: string;
  title: string;
  creator: string;
  src: string;
  ai: number;
  real: number;
  createdAt: string;
  voted?: Vote;
};

const sessionKey = "checkit-session";

const seed: ImageItem[] = [
  { id: "aurora", title: "Aurora over the quiet pines", creator: "Maya Chen", src: "https://images.unsplash.com/photo-1483347756197-71ef80e95f73?auto=format&fit=crop&w=1200&q=85", ai: 18, real: 7, createdAt: "2h ago" },
  { id: "studio", title: "Sunday studio light", creator: "Jordan Bell", src: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1200&q=85", ai: 4, real: 21, createdAt: "5h ago" },
  { id: "coast", title: "The last blue hour", creator: "Theo Martins", src: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=85", ai: 14, real: 11, createdAt: "1d ago" },
  { id: "market", title: "Saturday market", creator: "Sam Rivera", src: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1200&q=85", ai: 2, real: 23, createdAt: "1d ago" }
];

function Icon({ name }: { name: "spark" | "arrow" | "upload" | "grid" | "info" | "check" }) {
  const paths = {
    spark: <><path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Z"/><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z"/></>,
    arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    upload: <><path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M5 20h14"/></>,
    grid: <><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/></>,
    check: <><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></>
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

function PercentBar({ item }: { item: ImageItem }) {
  const total = item.ai + item.real;
  const aiPct = Math.round((item.ai / total) * 100);
  return <div className="bar-wrap"><div className="bar"><span className="bar-ai" style={{ width: `${aiPct}%` }} /><span className="bar-real" /></div><div className="bar-labels"><span><i className="dot ai-dot" />AI-generated <b>{aiPct}%</b></span><span><i className="dot real-dot" />Real <b>{100 - aiPct}%</b></span></div></div>;
}

export default function Home() {
  const [images, setImages] = useState<ImageItem[]>(seed);
  const [activeId, setActiveId] = useState(seed[0].id);
  const [view, setView] = useState<"judge" | "library">("judge");
  const [notice, setNotice] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const active = images.find((item) => item.id === activeId) ?? images[0];

  useEffect(() => {
    const loadImages = async () => {
      if (isSupabaseConfigured && supabase) {
        const sessionId = window.localStorage.getItem(sessionKey);
        const [{ data, error }, { data: judgements }] = await Promise.all([
          supabase.from("images").select("*").order("created_at", { ascending: false }),
          sessionId
            ? supabase.from("judgements").select("image_id, vote").eq("session_id", sessionId)
            : Promise.resolve({ data: [] as { image_id: string; vote: Vote }[] })
        ]);
        if (error) {
          setNotice(`Could not load Supabase images: ${error.message}`);
          return;
        }
        const voted = new Map((judgements ?? []).map((item) => [item.image_id, item.vote as Vote]));
        const remoteImages: ImageItem[] = (data ?? []).map((item) => ({
          id: item.id,
          title: item.title,
          creator: item.creator,
          src: item.image_url,
          ai: item.ai_votes,
          real: item.real_votes,
          createdAt: new Date(item.created_at).toLocaleDateString(),
          voted: voted.get(item.id)
        }));
        if (remoteImages.length) {
          setImages(remoteImages);
          setActiveId(remoteImages[0].id);
        }
        return;
      }
      const saved = window.localStorage.getItem("checkit-images");
      if (saved) setImages(JSON.parse(saved));
    };
    void loadImages();
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      window.localStorage.setItem("checkit-images", JSON.stringify(images));
    }
  }, [images]);

  const totalJudgements = useMemo(() => images.reduce((sum, item) => sum + item.ai + item.real, 0), [images]);
  const vote = async (choice: Vote) => {
    if (!active || active.voted) return;
    if (isSupabaseConfigured && supabase) {
      const sessionId = window.localStorage.getItem(sessionKey) ?? crypto.randomUUID();
      window.localStorage.setItem(sessionKey, sessionId);
      const { error: judgementError } = await supabase.from("judgements").insert({
        image_id: active.id,
        session_id: sessionId,
        vote: choice
      });
      if (judgementError) {
        setNotice(judgementError.code === "23505" ? "You have already judged this image." : judgementError.message);
        return;
      }
      const column = choice === "ai" ? "ai_votes" : "real_votes";
      const nextCount = active[choice] + 1;
      const { error: updateError } = await supabase.from("images").update({ [column]: nextCount }).eq("id", active.id);
      if (updateError) {
        setNotice(`Vote saved, but the total could not update: ${updateError.message}`);
        return;
      }
    }
    setImages((current) => current.map((item) => item.id === active.id ? { ...item, [choice]: item[choice] + 1, voted: choice } : item));
    setNotice("Thanks — your judgement has been added to the community signal.");
  };

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      void (async () => {
        const id = crypto.randomUUID();
        const title = file.name.replace(/\.[^/.]+$/, "");
        if (isSupabaseConfigured && supabase) {
          const path = `${id}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
          const { error: uploadError } = await supabase.storage.from("images").upload(path, file, { contentType: file.type, upsert: false });
          if (uploadError) {
            setNotice(`Upload failed: ${uploadError.message}`);
            return;
          }
          const { data: urlData } = supabase.storage.from("images").getPublicUrl(path);
          const { error: insertError } = await supabase.from("images").insert({ id, title, creator: "Anonymous", image_url: urlData.publicUrl });
          if (insertError) {
            setNotice(`Image record failed: ${insertError.message}`);
            return;
          }
          const next: ImageItem = { id, title, creator: "Anonymous", src: urlData.publicUrl, ai: 0, real: 0, createdAt: "just now" };
          setImages((current) => [next, ...current]);
          setActiveId(next.id);
          setView("judge");
          setNotice("Image uploaded to Supabase. Ask the community what they think.");
          return;
        }
        const next: ImageItem = { id, title, creator: "You", src: String(reader.result), ai: 0, real: 0, createdAt: "just now" };
        setImages((current) => [next, ...current]);
        setActiveId(next.id);
        setView("judge");
        setNotice("Image uploaded. Ask the community what they think.");
      })();
    };
    reader.readAsDataURL(file);
  };

  return <main>
    <header className="topbar"><div className="brand"><span className="brand-mark"><Icon name="spark" /></span><span>check<span className="brand-dot">.</span>it</span></div><nav><button className={view === "judge" ? "nav-active" : ""} onClick={() => setView("judge")}>Judge images</button><button className={view === "library" ? "nav-active" : ""} onClick={() => setView("library")}><Icon name="grid" />Library</button></nav><button className="upload-btn" onClick={() => fileRef.current?.click()}><Icon name="upload" />Upload an image</button><input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={upload} /></header>

    <section className="hero"><div className="hero-copy"><p className="eyebrow"><Icon name="spark" /> HUMAN SIGNAL, NOT A BLACK BOX</p><h1>Can you tell<br /><em>what&apos;s real?</em></h1><p className="hero-text">The internet is filling up with images. Help build a clearer picture, one human judgement at a time.</p><button className="primary-btn" onClick={() => document.getElementById("judge-card")?.scrollIntoView({ behavior: "smooth" })}>Start judging <Icon name="arrow" /></button></div><div className="hero-orbit"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit-center"><Icon name="spark" /></div><span className="orbit-tag tag-one">human perspective</span><span className="orbit-tag tag-two">community signal</span></div></section>

    <div className="stats"><div><strong>{images.length}</strong><span>images in the library</span></div><div><strong>{totalJudgements}</strong><span>judgements made</span></div><div><strong>100%</strong><span>human powered</span></div><p><Icon name="info" /> Consensus is based on community votes, not automated detection.</p></div>

    {notice && <div className="notice"><Icon name="check" />{notice}<button onClick={() => setNotice("")}>×</button></div>}

    {view === "judge" && active ? <section className="judge-section" id="judge-card"><div className="section-heading"><div><p className="eyebrow">THE JUDGEMENT DESK</p><h2>What&apos;s your read?</h2></div><span className="counter">{images.findIndex((item) => item.id === active.id) + 1} <i>/</i> {images.length}</span></div><div className="judge-layout"><div className="image-card"><img src={active.src} alt={active.title} /><div className="image-meta"><div><span className="image-number">IMAGE {String(images.findIndex((item) => item.id === active.id) + 1).padStart(2, "0")}</span><h3>{active.title}</h3><p>submitted by {active.creator} · {active.createdAt}</p></div><button className="more">•••</button></div></div><aside className="vote-panel"><p className="vote-kicker">MAKE YOUR CALL</p><h3>Does this image feel<br />AI-generated?</h3><p className="vote-help">Trust your instinct. You&apos;ll see the community consensus after you vote.</p><div className="vote-buttons"><button className={`vote-card ai ${active.voted === "ai" ? "selected" : ""}`} onClick={() => vote("ai")} disabled={!!active.voted}><span>✦</span><div><b>AI-generated</b><small>Something feels synthetic</small></div><i>→</i></button><button className={`vote-card real ${active.voted === "real" ? "selected" : ""}`} onClick={() => vote("real")} disabled={!!active.voted}><span>◒</span><div><b>Looks real</b><small>Feels captured, not created</small></div><i>→</i></button></div>{active.voted && <div className="consensus"><div className="consensus-head"><span>COMMUNITY CONSENSUS</span><b>{active.ai + active.real} votes</b></div><PercentBar item={active} /></div>}<button className="skip" onClick={() => { const next = images[(images.findIndex((item) => item.id === active.id) + 1) % images.length]; setActiveId(next.id); setNotice(""); }}>Skip for now <Icon name="arrow" /></button></aside></div></section> : view === "judge" ? <div className="empty"><h2>Your library is empty</h2><p>Upload an image to start the first judgement.</p></div> : null}

    {view === "library" && <section className="library-section"><div className="section-heading"><div><p className="eyebrow">THE COMMUNITY LIBRARY</p><h2>Signals in the wild.</h2></div><button className="secondary-btn" onClick={() => fileRef.current?.click()}><Icon name="upload" /> Add image</button></div><div className="library-grid">{images.map((item) => <button className="library-card" key={item.id} onClick={() => { setActiveId(item.id); setView("judge"); }}><img src={item.src} alt={item.title} /><div className="library-card-body"><div><span>{item.createdAt}</span><h3>{item.title}</h3></div><PercentBar item={item} /></div></button>)}</div></section>}

    <footer><div className="brand"><span className="brand-mark"><Icon name="spark" /></span><span>check<span className="brand-dot">.</span>it</span></div><p>Built for better questions about the images we see.</p><span>© 2026 CHECKIT</span></footer>
  </main>;
}
