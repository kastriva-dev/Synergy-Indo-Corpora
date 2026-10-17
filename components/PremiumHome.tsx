"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowDown, ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, Menu, MousePointer2, MoveUpRight, X } from "lucide-react";
import type { PublicContent } from "@/lib/content";

const heroPhoto = "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=2100&q=85";
const steps = [
  { num: "01", title: "KENALI POTENSI", body: "Menemukan arah belajar berdasarkan kebutuhan dan tujuan yang ingin dicapai." },
  { num: "02", title: "BANGUN KETERAMPILAN", body: "Memperkuat pemahaman dan kemampuan melalui proses belajar yang terarah." },
  { num: "03", title: "SIAP MELANGKAH", body: "Menghubungkan pembelajaran dengan kesiapan menghadapi tantangan dunia kerja." },
];

function arrowLink(href: string, text: string, className: string) {
  return <a className={className} href={href} data-cursor="OPEN">{text}<ArrowUpRight size={17} strokeWidth={1.8}/></a>;
}

export default function PremiumHome({ content }: { content: PublicContent }) {
  const rootRef = useRef<HTMLElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const wa = content.site.contact_whatsapp.replace(/\D/g, "");
  const whatsAppUrl = /^62\d{8,13}$/.test(wa) ? `https://wa.me/${wa}` : "";
  const email = content.site.contact_email.includes("@") ? content.site.contact_email : "";

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      if (reduce) return;
      gsap.fromTo(".hero-animate", { y: 70, opacity: 0 }, { y: 0, opacity: 1, duration: 1.25, ease: "power3.out", stagger: .12, delay: .16 });
      gsap.fromTo(".hero-media", { scale: 1.17 }, { scale: 1, duration: 2.2, ease: "power2.out" });
      gsap.to(".hero-media", { yPercent: 10, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) => {
        gsap.fromTo(element, { y: 66, autoAlpha: 0 }, {
          y: 0, autoAlpha: 1, duration: 1.05, ease: "power3.out", clearProps: "transform,visibility,opacity",
          scrollTrigger: { trigger: element, start: "top 89%", once: true },
        });
      });
      gsap.utils.toArray<HTMLElement>("[data-line]").forEach((element) => {
        gsap.fromTo(element, { scaleX: 0, transformOrigin: "left center" }, { scaleX: 1, duration: 1.3, ease: "power3.out", scrollTrigger: { trigger: element, start: "top 92%", once: true } });
      });
    }, root);

    // Pointer khusus desktop. Cursor tetap native pada touch device.
    const isFine = window.matchMedia("(pointer: fine)").matches && !reduce;
    const cursor = cursorRef.current;
    let cleanupCursor = () => {};
    if (isFine && cursor) {
      const x = gsap.quickTo(cursor, "x", { duration: .22, ease: "power3.out" });
      const y = gsap.quickTo(cursor, "y", { duration: .22, ease: "power3.out" });
      const onMove = (event: PointerEvent) => { x(event.clientX); y(event.clientY); cursor.classList.add("visible"); };
      const onOver = (event: PointerEvent) => {
        const target = event.target instanceof Element ? event.target.closest("[data-cursor],a,button,.tilt-card,.gallery-card") : null;
        if (!target) return;
        cursor.classList.add("is-active");
        const label = target.getAttribute("data-cursor") || "VIEW";
        const inner = cursor.querySelector("span");
        if (inner) inner.textContent = label;
      };
      const onOut = (event: PointerEvent) => {
        const related = event.relatedTarget instanceof Element ? event.relatedTarget.closest("[data-cursor],a,button,.tilt-card,.gallery-card") : null;
        if (!related) cursor.classList.remove("is-active");
      };
      const onLeave = () => cursor.classList.remove("visible");
      window.addEventListener("pointermove", onMove);
      document.addEventListener("pointerover", onOver);
      document.addEventListener("pointerout", onOut);
      document.addEventListener("pointerleave", onLeave);
      cleanupCursor = () => { window.removeEventListener("pointermove", onMove); document.removeEventListener("pointerover", onOver); document.removeEventListener("pointerout", onOut); document.removeEventListener("pointerleave", onLeave); };
    }

    // Tilt interaktif di dalam kartu, tanpa membuat seluruh halaman re-render.
    const tiltNodes = Array.from(root.querySelectorAll<HTMLElement>(".tilt-card"));
    const tiltCleanups = tiltNodes.map((node) => {
      if (!isFine) return () => {};
      const move = (event: MouseEvent) => {
        const r = node.getBoundingClientRect();
        const dx = ((event.clientX - r.left) / r.width - .5) * 2;
        const dy = ((event.clientY - r.top) / r.height - .5) * 2;
        gsap.to(node, { rotateX: -dy * 6, rotateY: dx * 9, y: -8, transformPerspective: 900, duration: .35, ease: "power2.out" });
        node.style.setProperty("--mx", `${((dx + 1) / 2) * 100}%`);
        node.style.setProperty("--my", `${((dy + 1) / 2) * 100}%`);
      };
      const leave = () => gsap.to(node, { rotateX: 0, rotateY: 0, y: 0, duration: .65, ease: "elastic.out(1,.5)" });
      node.addEventListener("mousemove", move);
      node.addEventListener("mouseleave", leave);
      return () => { node.removeEventListener("mousemove", move); node.removeEventListener("mouseleave", leave); };
    });

    // Wheel mouse: geser horizontal selama kartu masih dapat digeser.
    const track = trackRef.current;
    let cleanupTrack = () => {};
    if (track) {
      const wheel = (event: WheelEvent) => {
        if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
        const max = track.scrollWidth - track.clientWidth;
        if (max <= 0) return;
        const canMove = (event.deltaY > 0 && track.scrollLeft < max - 2) || (event.deltaY < 0 && track.scrollLeft > 2);
        if (canMove) { event.preventDefault(); track.scrollLeft += event.deltaY; }
      };
      let held = false; let startX = 0; let startLeft = 0; let pointerId = -1;
      const down = (event: PointerEvent) => {
        if (event.pointerType === "touch") return;
        held = true; pointerId = event.pointerId; startX = event.clientX; startLeft = track.scrollLeft;
        track.classList.add("is-dragging");
      };
      const move = (event: PointerEvent) => { if (held && event.pointerId === pointerId) track.scrollLeft = startLeft - (event.clientX - startX); };
      const up = () => { held = false; track.classList.remove("is-dragging"); };
      track.addEventListener("wheel", wheel, { passive: false });
      track.addEventListener("pointerdown", down);
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
      cleanupTrack = () => { track.removeEventListener("wheel", wheel); track.removeEventListener("pointerdown", down); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); };
    }

    return () => { ctx.revert(); cleanupCursor(); tiltCleanups.forEach((fn) => fn()); cleanupTrack(); };
  }, [content]);

  return (
    <main ref={rootRef} id="atas">
      <div className="custom-cursor" aria-hidden="true" ref={cursorRef}><span>VIEW</span></div>
      <div className="top-progress" aria-hidden="true"/>
      <header className="site-header">
        <a className="brand" href="#atas" aria-label="Synergy Indo Corpora, kembali ke atas" data-cursor="TOP">
          <span className="brand-mark">S<span>.</span></span>
          <span className="brand-text">SYNERGY <small>INDO CORPORA</small></span>
        </a>
        <nav className={`site-nav ${menuOpen ? "open" : ""}`} aria-label="Navigasi utama">
          <a onClick={() => setMenuOpen(false)} href="#tentang">TENTANG</a>
          <a onClick={() => setMenuOpen(false)} href="#program">PROGRAM</a>
          <a onClick={() => setMenuOpen(false)} href="#perjalanan">PENDEKATAN</a>
          <a onClick={() => setMenuOpen(false)} href="#galeri">GALERI</a>
          <a onClick={() => setMenuOpen(false)} href="#hubungi">KONTAK</a>
        </nav>
        <a className="header-action" href="#hubungi" data-cursor="GO">HUBUNGI KAMI <ArrowUpRight size={17}/></a>
        <button type="button" className="menu-toggle" aria-label={menuOpen ? "Tutup menu" : "Buka menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}>{menuOpen ? <X/> : <Menu/>}</button>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-media" style={{ backgroundImage: `linear-gradient(90deg,rgba(7,10,16,.84) 0%,rgba(7,10,16,.48) 47%,rgba(7,10,16,.28) 100%),url('${heroPhoto}')` }}/>
        <div className="hero-grid"/>
        <div className="hero-vignette"/>
        <div className="hero-orb orb-one" aria-hidden="true"/><div className="hero-orb orb-two" aria-hidden="true"/>
        <div className="hero-content container">
          <div className="eyebrow hero-animate"><span className="eyebrow-rule"/>{content.site.hero_eyebrow}</div>
          <h1 id="hero-title" className="hero-title" aria-label={`${content.site.hero_title_1} ${content.site.hero_title_2} ${content.site.hero_title_accent}`}>
            <span className="hero-animate">{content.site.hero_title_1}</span>
            <span className="hero-animate">{content.site.hero_title_2}</span>
            <em className="hero-animate">{content.site.hero_title_accent}</em>
          </h1>
          <div className="hero-bottom hero-animate">
            <p>{content.site.hero_description}</p>
            {arrowLink("#program", "JELAJAHI PROGRAM", "pill-button pill-primary")}
          </div>
          <div className="hero-kicker hero-animate"><span className="hero-smallline"/> GROW · LEARN · EVOLVE</div>
        </div>
        <div className="hero-rail" aria-hidden="true"><span>01 / 06</span><span>SCROLL TO EXPLORE <ArrowDown size={14}/></span></div>
        <a className="hero-scroll" href="#tentang" data-cursor="SCROLL" aria-label="Scroll ke bagian tentang kami"><ArrowDown size={18}/></a>
      </section>

      <div className="ticker-shell"><div className="ticker-label"><span className="live-dot"/> OUR MINDSET</div><div className="ticker-viewport"><div className="ticker-content" aria-label="Learning, Growth, Transformation">
        {Array.from({length: 4}).map((_, i) => <span className="ticker-set" key={i}>LEARNING <b>✳</b> GROWTH <b>✳</b> TRANSFORMATION <b>✳</b> FUTURE-READY <b>✳</b></span>)}
      </div></div><span className="ticker-hint">HOVER TO PAUSE</span></div>

      <section className="about section-pad container" id="tentang">
        <div className="section-head" data-reveal><div className="section-overline"><span>01 — TENTANG KAMI</span><span className="overline-right">BUILT FOR WHAT'S NEXT</span></div><div className="line-rule" data-line/></div>
        <div className="about-layout">
          <div data-reveal className="about-left"><div className="tiny-label"><span className="asterisk">✳</span> WHO WE ARE</div><div className="about-stamp"><span>SYNERGY</span><strong>PROGRESS<br/>IN MOTION.</strong><small>EVOLVING TOGETHER — EST. / —</small></div></div>
          <div className="about-right"><h2 data-reveal className="display-heading">KAMI PERCAYA<br/>PADA <span className="accent">PROSES</span><br/>YANG MEMBAWA<br/>PERUBAHAN.</h2><p data-reveal>{content.site.about_description}</p><a href="#perjalanan" className="text-link" data-reveal data-cursor="GO">KENALI PENDEKATAN KAMI <ArrowUpRight size={18}/></a></div>
        </div>
      </section>

      <section className="programs-section" id="program">
        <div className="container"><div className="section-head" data-reveal><div className="section-overline"><span>02 — PROGRAM & KEGIATAN</span><span className="overline-right">WHAT WE DO</span></div><div className="line-rule" data-line/></div>
          <div className="section-top-row"><h2 className="display-heading" data-reveal>BUKAN SEKADAR<br/><span className="accent">BELAJAR.</span></h2><div className="section-top-aside" data-reveal><p>Ruang untuk tumbuh melalui program dan pengalaman belajar yang relevan dengan kebutuhan masa depan.</p><div className="drag-indicator"><MousePointer2 size={17}/> SCROLL / DRAG TO EXPLORE</div></div></div>
        </div>
        <div className="cards-track" ref={trackRef} aria-label="Daftar program pelatihan, bisa digeser horizontal">
          {content.programs.map((program, index) => (
            <article className="program-card tilt-card" key={program.id} data-cursor="EXPLORE">
              <div className="program-image"><img src={program.image_url || "/hero-grid.svg"} alt={`Ilustrasi ${program.title}`} loading="lazy"/><div className="program-image-overlay"/></div>
              <div className="card-upper"><span>{String(index+1).padStart(2,"0")} / {String(content.programs.length).padStart(2,"0")}</span><MoveUpRight size={19}/></div>
              <div className="card-lower"><div className="card-category"><span className="live-dot"/>{program.category}</div><h3>{program.title}</h3><p>{program.description}</p><div className="card-footer">{program.duration}<ArrowUpRight size={17}/></div></div>
              <div className="tilt-shine"/>
            </article>
          ))}
          <div className="end-card"><span>KEEP EXPLORING</span><strong>YOUR NEXT<br/>CHAPTER<br/><i>STARTS HERE.</i></strong><ArrowRight size={34}/></div>
        </div>
        <div className="container track-bottom"><span>GESTURE INTERACTIVE</span><div className="track-arrow-group"><button type="button" onClick={() => trackRef.current?.scrollBy({left:-390,behavior:"smooth"})} aria-label="Geser program ke kiri"><ArrowLeft size={20}/></button><button type="button" onClick={() => trackRef.current?.scrollBy({left:390,behavior:"smooth"})} aria-label="Geser program ke kanan"><ArrowRight size={20}/></button></div></div>
      </section>

      <section className="statement-section"><div className="statement-glow"/><div className="container statement-inner"><span className="tiny-label" data-reveal>THE SYNERGY PHILOSOPHY</span><h2 data-reveal>EVERY SKILL<br/>IS A <em>NEW</em> <span>BEGINNING.</span></h2><div className="statement-foot" data-reveal><span>GROW BEYOND LIMITS</span><span>✳ &nbsp; 03 / 06</span></div></div></section>

      <section className="journey section-pad container" id="perjalanan"><div className="section-head" data-reveal><div className="section-overline"><span>03 — PENDEKATAN KAMI</span><span className="overline-right">HOW WE MOVE FORWARD</span></div><div className="line-rule" data-line/></div>
        <div className="journey-header"><h2 className="display-heading" data-reveal>SETIAP LANGKAH<br/><span className="accent">BERARTI.</span></h2><p data-reveal>Perjalanan pembelajaran dirancang untuk membantu peserta bergerak dari potensi menuju kesiapan yang lebih baik.</p></div>
        <div className="journey-steps">{steps.map(step => <div className="step" key={step.num} data-reveal><span className="step-number">{step.num}</span><div className="step-body"><h3>{step.title}</h3><p>{step.body}</p></div><ArrowDownRight size={28} strokeWidth={1.3}/></div>)}</div>
      </section>

      <section className="gallery-section" id="galeri"><div className="container"><div className="section-head" data-reveal><div className="section-overline"><span>04 — GALERI KEGIATAN</span><span className="overline-right">MOMENTS THAT MATTER</span></div><div className="line-rule" data-line/></div><div className="gallery-heading"><h2 className="display-heading" data-reveal>MOMEN KECIL.<br/><span className="accent">DAMPAK BESAR.</span></h2><p data-reveal>Setiap langkah layak diceritakan. Galeri ini masih menggunakan foto ilustrasi dan akan diganti dengan dokumentasi resmi LPK.</p></div></div>
        <div className="gallery-grid container" data-reveal>{content.gallery.map((item, index) => <div className="gallery-card" key={item.id} data-cursor="VIEW"><img src={item.image_url || "/hero-grid.svg"} alt={`Ilustrasi ${item.title}`} loading="lazy"/><div className="gallery-shade"/><span className="gallery-index">0{index + 1}</span><div className="gallery-caption"><small>{item.category}</small><h3>{item.title}</h3></div><div className="gallery-cross">+</div></div>)}</div>
      </section>

      <section className="contact-section" id="hubungi"><div className="contact-backdrop"/><div className="container contact-content"><div className="section-head" data-reveal><div className="section-overline"><span>05 — HUBUNGI KAMI</span><span className="overline-right">LET'S BUILD YOUR NEXT STEP</span></div><div className="line-rule" data-line/></div><div className="contact-main"><span className="tiny-label" data-reveal>YOUR JOURNEY STARTS HERE.</span><h2 data-reveal>WAKTUNYA<br/><em>MELANGKAH.</em></h2><div className="contact-action" data-reveal>{whatsAppUrl ? arrowLink(whatsAppUrl, "MULAI PERCAKAPAN", "pill-button pill-primary") : <span className="contact-awaiting">Informasi WhatsApp resmi segera tersedia.</span>}{email ? <a className="contact-email" href={`mailto:${email}`}>{email}</a> : <span className="contact-email">Kontak resmi akan dilengkapi.</span>}</div></div></div></section>

      <footer className="site-footer"><div className="container"><div className="footer-main"><a className="footer-logo" href="#atas">SYNERGY<span>.</span><small>INDO CORPORA</small></a><p>Lembaga pelatihan kerja yang berorientasi pada pengembangan kompetensi dan kesiapan masa depan.</p><div className="footer-address">{content.site.contact_address}</div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} SYNERGY INDO CORPORA.</span><span>CRAFTED WITH PURPOSE <b>·</b> <strong>BY KASTRIVA</strong></span><a href="#atas" data-cursor="TOP">BACK TO TOP ↑</a></div></div></footer>
      {content.source === "demo" && <div className="demo-flag" role="note">DEMO CONTENT — GANTI DENGAN DATA RESMI LPK</div>}
    </main>
  );
}
