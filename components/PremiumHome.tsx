"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowDown, ArrowDownRight, ArrowRight, ArrowUpRight, BadgeCheck, Briefcase,
  Building2, CheckCircle2, ChevronDown, Factory, Globe,
  HardHat, Hotel, Instagram, Linkedin, Mail, MapPin, Menu, Play, Search,
  ShieldCheck, UploadCloud, Users, Warehouse, Wrench, X, Zap
} from "lucide-react";
import type { JobListing, PublicContent } from "@/lib/content";
import SafeMediaImage from "@/components/media/SafeMediaImage";
import WalkingApplicant from "@/components/WalkingApplicant";

const countryFlagByName: Record<string, string> = {
  poland: "🇵🇱", germany: "🇩🇪", netherlands: "🇳🇱", "czech republic": "🇨🇿",
  france: "🇫🇷", italy: "🇮🇹", spain: "🇪🇸", austria: "🇦🇹", belgium: "🇧🇪",
  denmark: "🇩🇰", norway: "🇳🇴", sweden: "🇸🇪", finland: "🇫🇮", switzerland: "🇨🇭",
  romania: "🇷🇴", hungary: "🇭🇺", croatia: "🇭🇷", japan: "🇯🇵", "south korea": "🇰🇷",
  singapore: "🇸🇬", "saudi arabia": "🇸🇦", "united arab emirates": "🇦🇪", "united kingdom": "🇬🇧",
};
const areaIconByName: Record<string, typeof Briefcase> = {
  hospitality: Hotel, manufacturing: Factory, electrical: Zap, warehouse: Warehouse,
  construction: HardHat, welding: Wrench, logistics: Warehouse, automotive: Wrench,
  maintenance: Wrench, engineering: Factory, healthcare: Users, caregiving: Users,
  agriculture: Globe, cleaning: Building2, "food production": Factory,
};

const articles = [
  {
    title: "Persiapan dokumen sebelum melamar kerja ke luar negeri",
    category: "PANDUAN CALON PEKERJA",
    readTime: "Panduan",
    image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=900&q=82",
  },
  {
    title: "Mengenal budaya kerja dan komunikasi lintas negara",
    category: "PERSIAPAN KARIER",
    readTime: "Insight",
    image: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=900&q=82",
  },
  {
    title: "Keterampilan teknis yang perlu disiapkan sejak awal",
    category: "PENGEMBANGAN KOMPETENSI",
    readTime: "Tips",
    image: "https://images.unsplash.com/photo-1581092334651-ddf26d9a09d0?auto=format&fit=crop&w=900&q=82",
  },
];

const processSteps = [
  { number: "01", title: "Daftarkan minat", body: "Isi informasi dasar dan bidang kerja yang ingin dijajaki." },
  { number: "02", title: "Pemeriksaan awal", body: "Tim akan memeriksa kelengkapan dan kecocokan informasi sesuai proses resmi." },
  { number: "03", title: "Persiapan kandidat", body: "Informasi mengenai dokumen, kompetensi, dan tahapan berikutnya dijelaskan sesuai kebutuhan." },
  { number: "04", title: "Informasi lanjutan", body: "Kandidat menerima arahan berikutnya setelah proses dan peluang yang relevan dikonfirmasi." },
];

export default function PremiumHome({ content }: { content: PublicContent }) {
  const rootRef = useRef<HTMLElement>(null);
  const galleryTrackRef = useRef<HTMLDivElement>(null);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const sectorTickerRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [galleryCanScrollPrev, setGalleryCanScrollPrev] = useState(false);
  const [galleryCanScrollNext, setGalleryCanScrollNext] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [countryFilter, setCountryFilter] = useState("Semua negara");
  const [categoryFilter, setCategoryFilter] = useState("Semua bidang");
  const [selectedPosition, setSelectedPosition] = useState("");
  const [targetCountry, setTargetCountry] = useState("");
  const [cvName, setCvName] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [videoNotice, setVideoNotice] = useState("");
  const [articleNotice, setArticleNotice] = useState("");

  const wa = content.site.contact_whatsapp.replace(/\D/g, "");
  const whatsAppUrl = /^62\d{8,13}$/.test(wa) ? "https://wa.me/" + wa : "";
  const email = content.site.contact_email.includes("@") ? content.site.contact_email : "";
  const address = /akan|belum|informasi alamat/i.test(content.site.contact_address)
    ? ""
    : content.site.contact_address;

  const jobItems = content.jobs;
  const workAreas = useMemo(() => {
    const categories = Array.from(new Set(jobItems.map((job) => job.category.trim()).filter(Boolean)));
    return categories.map((name, index) => ({
      name,
      detail: "Lowongan terbit pada bidang " + name + ".",
      icon: areaIconByName[name.toLowerCase()] ?? Briefcase,
      number: String(index + 1).padStart(2, "0"),
    }));
  }, [jobItems]);
  const countries = useMemo(() => {
    const names = Array.from(new Set(jobItems.map((job) => job.country.trim()).filter(Boolean)));
    return names.map((name) => ({
      name,
      flag: countryFlagByName[name.toLowerCase()] ?? "🌍",
      note: content.source === "demo" ? "Contoh negara tujuan" : jobItems.filter((job) => job.country === name).length + " lowongan terbit",
    }));
  }, [jobItems, content.source]);
  const filteredJobs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return jobItems.filter((job) => {
      const matchesQuery = !query || [job.title, job.country, job.category, job.summary].some((value) => value.toLowerCase().includes(query));
      const matchesCountry = countryFilter === "Semua negara" || job.country === countryFilter;
      const matchesCategory = categoryFilter === "Semua bidang" || job.category === categoryFilter;
      return matchesQuery && matchesCountry && matchesCategory;
    });
  }, [jobItems, searchTerm, countryFilter, categoryFilter]);

  useEffect(() => {
    const track = galleryTrackRef.current;
    if (!track) {
      setGalleryCanScrollPrev(false);
      setGalleryCanScrollNext(false);
      return;
    }

    const updateControls = () => {
      const maxScrollLeft = Math.max(0, track.scrollWidth - track.clientWidth);
      setGalleryCanScrollPrev(track.scrollLeft > 4);
      setGalleryCanScrollNext(maxScrollLeft - track.scrollLeft > 4);
    };

    updateControls();
    track.addEventListener("scroll", updateControls, { passive: true });
    window.addEventListener("resize", updateControls);
    return () => {
      track.removeEventListener("scroll", updateControls);
      window.removeEventListener("resize", updateControls);
    };
  }, [content.gallery.length]);

  useEffect(() => {
    const ticker = sectorTickerRef.current;
    if (!ticker) return;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!finePointer.matches || reducedMotion.matches) return;

    let frame = 0;
    const updateProximity = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const rect = ticker.getBoundingClientRect();
        const nearestX = Math.max(rect.left, Math.min(event.clientX, rect.right));
        const nearestY = Math.max(rect.top, Math.min(event.clientY, rect.bottom));
        const distance = Math.hypot(event.clientX - nearestX, event.clientY - nearestY);
        ticker.toggleAttribute("data-pointer-near", distance <= 96);
      });
    };
    const resetProximity = () => ticker.removeAttribute("data-pointer-near");

    document.addEventListener("pointermove", updateProximity, { passive: true });
    document.documentElement.addEventListener("pointerleave", resetProximity);
    window.addEventListener("blur", resetProximity);
    return () => {
      document.removeEventListener("pointermove", updateProximity);
      document.documentElement.removeEventListener("pointerleave", resetProximity);
      window.removeEventListener("blur", resetProximity);
      if (frame) window.cancelAnimationFrame(frame);
      resetProximity();
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gsap.registerPlugin(ScrollTrigger);
    const context = gsap.context(() => {
      if (reducedMotion) return;
      gsap.fromTo(".hero-reveal", { y: 32, autoAlpha: 0 }, {
        y: 0, autoAlpha: 1, duration: 0.9, ease: "power3.out", stagger: 0.1, delay: 0.12,
      });
      gsap.fromTo(".hero__photo", { scale: 1.12 }, { scale: 1.06, duration: 1.8, ease: "power2.out" });
      gsap.to(".hero__photo", {
        yPercent: 7,
        ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 0.7 },
      });
      gsap.to(".hero__grid", {
        yPercent: -5,
        ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 0.7 },
      });

      const depthImages = gsap.utils.toArray<HTMLElement>(
        ".job-card__image img, .news-card__image img, .gallery-card__image img, .ceo-media > img",
      );
      depthImages.forEach((image) => {
        const trigger = image.closest<HTMLElement>(".job-card, .news-card, .gallery-card, .ceo-media") ?? image;
        gsap.fromTo(
          image,
          { "--image-parallax-y": "3%" },
          {
            "--image-parallax-y": "-3%",
            ease: "none",
            scrollTrigger: { trigger, start: "top bottom", end: "bottom top", scrub: 0.65 },
          },
        );
      });

      gsap.utils.toArray<HTMLElement>(".section-kicker.reveal .section-kicker__line").forEach((line) => {
        const trigger = line.closest<HTMLElement>(".section-kicker") ?? line;
        gsap.fromTo(line, { scaleX: 0, transformOrigin: "left center" }, {
          scaleX: 1,
          duration: 0.75,
          ease: "power2.out",
          scrollTrigger: { trigger, start: "top 90%", once: true },
        });
      });

      const staggerGroups = gsap.utils.toArray<HTMLElement>(
        ".about-values, .work-grid, .jobs-grid, .country-list, .process-list, .news-grid, .gallery-track",
      );
      const groupedRevealElements = new Set<HTMLElement>();
      staggerGroups.forEach((group) => {
        const items = Array.from(group.children).filter(
          (child): child is HTMLElement =>
            child instanceof HTMLElement && child.classList.contains("reveal"),
        );
        if (!items.length) return;
        items.forEach((item) => groupedRevealElements.add(item));
        gsap.fromTo(items, { y: 26, autoAlpha: 0 }, {
          y: 0, autoAlpha: 1, duration: 0.72, stagger: 0.11, ease: "power3.out",
          scrollTrigger: { trigger: group, start: "top 88%", once: true },
        });
      });
      gsap.utils.toArray<HTMLElement>(".reveal").forEach((element) => {
        if (groupedRevealElements.has(element)) return;
        const isDisplayTitle = element.classList.contains("display-title");
        gsap.fromTo(
          element,
          isDisplayTitle
            ? { clipPath: "inset(0 0 100% 0)", y: 24, autoAlpha: 0 }
            : { y: 28, autoAlpha: 0 },
          isDisplayTitle
            ? {
                clipPath: "inset(0 0 0 0)",
                y: 0,
                autoAlpha: 1,
                duration: 0.95,
                ease: "power3.out",
                scrollTrigger: { trigger: element, start: "top 90%", once: true },
              }
            : {
                y: 0,
                autoAlpha: 1,
                duration: 0.7,
                ease: "power2.out",
                scrollTrigger: { trigger: element, start: "top 90%", once: true },
              },
        );
      });
    }, root);
    return () => context.revert();
  }, []);

  function chooseJob(job: JobListing) {
    setSelectedPosition(job.title);
    setTargetCountry(job.country);
    setFormMessage(`Pendaftaran belum dibuka. Posisi ${job.title} di ${job.country} hanya untuk informasi; pilihan ini tidak mengirim data atau CV.`);
    document.getElementById("daftar")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function submitInterest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormMessage("Pendaftaran kandidat belum dibuka. Data dan CV tidak dikirim atau disimpan.");
  }

  function scrollGallery(direction: -1 | 1) {
    const track = galleryTrackRef.current;
    if (!track) return;
    const firstCard = track.querySelector<HTMLElement>(".gallery-card");
    const cardWidth = firstCard?.getBoundingClientRect().width ?? track.clientWidth * 0.82;
    const gap = Number.parseFloat(window.getComputedStyle(track).columnGap) || 18;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollBy({ left: direction * (cardWidth + gap), behavior: reducedMotion ? "auto" : "smooth" });
  }

  return (
    <main ref={rootRef} id="top" className="sg-site">
      <div className="preview-ribbon"><span className="preview-dot" /> {content.source === "gas" ? "CMS GOOGLE SHEETS · PENDAFTARAN DAN UNGGAH CV NONAKTIF" : "PRATINJAU DESAIN · DATA POSISI MASIH CONTOH"}</div>
      <header
        className="site-header"
        onKeyDown={(event) => {
          if (event.key === "Escape" && menuOpen) {
            setMenuOpen(false);
            menuToggleRef.current?.focus();
          }
        }}
      >
        <a className="sg-brand" href="#top" aria-label="Sinergi Global, kembali ke atas">
          <span className="sg-brand__mark">SG<span>.</span></span>
          <span className="sg-brand__name">SINERGI GLOBAL<small>CAREER OPPORTUNITIES</small></span>
        </a>
        <nav id="primary-navigation" className={"site-nav" + (menuOpen ? " is-open" : "")} aria-label="Navigasi utama">
          <a onClick={() => setMenuOpen(false)} href="#tentang">Tentang</a>
          <a onClick={() => setMenuOpen(false)} href="#bidang">Bidang kerja</a>
          <a onClick={() => setMenuOpen(false)} href="#peluang">Peluang kerja</a>
          <a onClick={() => setMenuOpen(false)} href="#proses">Alur proses</a>
          <a onClick={() => setMenuOpen(false)} href="#galeri">Galeri</a>
          <a onClick={() => setMenuOpen(false)} href="#berita">Berita</a>
        </nav>
        <a className="header-cta" href="#daftar">Informasi pendaftaran <ArrowUpRight size={16} /></a>
        <button ref={menuToggleRef} type="button" className="menu-toggle" aria-label={menuOpen ? "Tutup menu" : "Buka menu"} aria-expanded={menuOpen} aria-controls="primary-navigation" onClick={() => setMenuOpen((value) => !value)}>
          {menuOpen ? <X size={23} /> : <Menu size={23} />}
        </button>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero__photo" aria-hidden="true" style={{ backgroundImage: "linear-gradient(90deg, rgba(5, 21, 34, .97) 0%, rgba(5, 21, 34, .84) 42%, rgba(5, 21, 34, .34) 100%), url('https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=2200&q=88')" }} />
        <div className="hero__grid" aria-hidden="true" />
        <div className="container hero__layout">
          <div className="hero__copy">
            <div className="eyebrow hero-reveal"><span className="eyebrow__line" /> MEMBUKA PELUANG KARIER INTERNASIONAL</div>
            <h1 id="hero-title" className="hero-title">
              <span className="hero-reveal">KETERAMPILAN</span>
              <span className="hero-reveal">ANDA, PELUANG</span>
              <em className="hero-reveal">DUNIA.</em>
            </h1>
            <p className="hero-description hero-reveal">Temukan arah karier global dengan informasi yang jelas, persiapan yang terarah, dan pendampingan sesuai proses resmi perusahaan.</p>
            <div className="hero-actions hero-reveal">
              <a className="button button--lime" href="#peluang">Jelajahi peluang <ArrowRight size={18} /></a>
              <a className="button button--outline" href="#tentang">Kenali Sinergi Global <ArrowDownRight size={17} /></a>
            </div>
            <div className="hero-note hero-reveal"><ShieldCheck size={17} /> Informasi peluang dan proses akan dikonfirmasi sebelum dipublikasikan.</div>
          </div>
          <div className="hero-side reveal">
            <div className="hero-side__label"><span className="hero-side__dot" /> YOUR NEXT CHAPTER</div>
            <div className="hero-side__number">01<span>/</span>{String(workAreas.length).padStart(2, "0")}</div>
            <div className="hero-side__rule" />
            <p>{workAreas.length ? workAreas.length + " bidang kerja mengikuti kategori lowongan yang diterbitkan." : "Bidang kerja akan ditampilkan setelah lowongan resmi diterbitkan."}</p>
            <a href="#bidang" aria-label="Lihat bidang kerja">Lihat bidang kerja <ArrowUpRight size={17} /></a>
          </div>
          <a className="hero-scroll" href="#tentang" aria-label="Gulir ke bagian tentang"><ArrowDown size={17} /></a>
        </div>
      </section>

      <div className="sector-ticker" ref={sectorTickerRef} role="region" aria-label="Bidang pekerjaan">
        <div className="sector-ticker__label"><span className="ticker-dot" /> BIDANG KERJA</div>
        <div className="sector-ticker__viewport" tabIndex={0} aria-label="Daftar bidang pekerjaan; dapat digulir dengan keyboard"><div className="sector-ticker__track">
          {Array.from({ length: 2 }).map((_, index) => (
            <span className="sector-ticker__set" key={index} aria-hidden={index === 1}>
              {workAreas.length ? workAreas.map((area) => <span key={area.name}>{area.name.toUpperCase()} <b>✳</b> </span>) : <span>LOWONGAN RESMI MENYUSUL <b>✳</b></span>}
            </span>
          ))}
        </div></div>
        <span className="sector-ticker__hint">EXPLORE YOUR SKILLS</span>
      </div>

      <section className="group-strip" aria-label="Ekosistem perusahaan">
        <div className="container group-strip__inner">
          <span className="group-strip__eyebrow">EKOSISTEM GRUP</span>
          <div className="group-logo group-logo--primary"><span className="group-logo__mark">SG</span><span>Sinergi Global<small>Recruitment & Career</small></span></div>
          <div className="group-divider" />
          <div className="group-logo"><span className="group-logo__initial">SC</span><span>PT Sinergi<small>Corpora Group</small></span></div>
          <div className="group-divider" />
          <div className="group-logo"><span className="group-logo__initial">JI</span><span>Java Indo<small>Corpora</small></span></div>
          <span className="group-strip__note">Logo teks sementara · aset resmi menyusul</span>
        </div>
      </section>

      <section className="about-section section-space" id="tentang">
        <div className="container">
          <div className="section-kicker reveal"><span>01</span><span className="section-kicker__line" /> TENTANG SINERGI GLOBAL <span className="section-kicker__right">CAREER WITH PURPOSE</span></div>
          <div className="about-grid">
            <div className="about-heading reveal">
              <h2 className="display-title">JALAN MENUJU<br /><span>KARIER GLOBAL.</span></h2>
              <div className="about-badge"><Globe size={22} /><span>INDONESIA <b>↗</b> GLOBAL</span></div>
            </div>
            <div className="about-copy reveal">
              <p className="lead-copy">Kami hadir untuk membantu calon pekerja mengenali peluang kerja internasional dan memahami langkah persiapan yang dibutuhkan.</p>
              <p>Sinergi Global merupakan brand dalam ekosistem PT Sinergi Corpora Group. Informasi perusahaan, legalitas, posisi yang tersedia, serta tahapan rekrutmen akan ditampilkan berdasarkan data resmi yang sudah diverifikasi.</p>
              <a className="text-link" href="#proses">Kenali alur proses <ArrowUpRight size={17} /></a>
            </div>
          </div>
          <div className="about-values">
            <article className="value-card reveal"><span className="value-card__icon"><ShieldCheck size={21} /></span><span className="value-card__number">01 / TRANSPARAN</span><h3>Informasi yang jelas</h3><p>Ruang untuk menjelaskan persyaratan, tahapan, dan informasi penting secara terbuka.</p></article>
            <article className="value-card reveal"><span className="value-card__icon"><Users size={21} /></span><span className="value-card__number">02 / TERARAH</span><h3>Persiapan kandidat</h3><p>Membantu kandidat memahami kesiapan dokumen, keterampilan, dan kebutuhan posisi.</p></article>
            <article className="value-card reveal"><span className="value-card__icon"><Globe size={21} /></span><span className="value-card__number">03 / GLOBAL</span><h3>Peluang lintas negara</h3><p>Informasi bidang kerja dan negara tujuan disusun sesuai peluang yang terkonfirmasi.</p></article>
          </div>
        </div>
      </section>

      <section className="work-section section-space" id="bidang">
        <div className="container">
          <div className="section-kicker reveal"><span>02</span><span className="section-kicker__line" /> BIDANG PEKERJAAN <span className="section-kicker__right">SKILLS MEET OPPORTUNITY</span></div>
          <div className="section-heading-row">
            <h2 className="display-title reveal">KETERAMPILAN<br /><span>PUNYA ARAH.</span></h2>
            <p className="section-intro reveal">Kategori bidang mengikuti lowongan yang diterbitkan melalui CMS. Posisi dan negara baru akan muncul setelah data resmi dimasukkan dan dipublikasikan.</p>
          </div>
          <div className="work-grid">
            {workAreas.length ? workAreas.map((area) => {
              const Icon = area.icon;
              return (
                <a className="work-card reveal" href="#peluang" key={area.name} onClick={() => setCategoryFilter(area.name)}>
                  <div className="work-card__top"><span>{area.number}</span><ArrowUpRight size={18} /></div>
                  <div className="work-card__icon"><Icon size={25} strokeWidth={1.7} /></div>
                  <h3>{area.name}</h3>
                  <p>{area.detail}</p>
                  <span className="work-card__link">Lihat posisi <ArrowRight size={15} /></span>
                </a>
              );
            }) : <div className="empty-results reveal" style={{ gridColumn: "1 / -1" }}><Briefcase size={24} /><h3>Belum ada bidang kerja terbit</h3><p>Bidang akan muncul otomatis ketika perusahaan menerbitkan lowongan melalui CMS.</p></div>}
          </div>
        </div>
      </section>

      <section className="jobs-section section-space" id="peluang">
        <div className="container">
          <div className="section-kicker reveal"><span>03</span><span className="section-kicker__line" /> JELAJAHI POSISI <span className="section-kicker__right">FIND YOUR NEXT STEP</span></div>
          <div className="section-heading-row jobs-heading">
            <div><h2 className="display-title reveal">CARI PELUANG<br /><span>ANDA.</span></h2><p className="jobs-disclaimer reveal"><BadgeCheck size={17} /> {content.source === "demo" ? "Contoh data pratinjau; ini bukan daftar lowongan aktif." : jobItems.length ? "Lowongan yang tampil berasal dari CMS dan berstatus publik." : "Belum ada lowongan resmi yang dipublikasikan."}</p></div>
            <p className="section-intro reveal">Cari lowongan berdasarkan kata kunci, negara, atau bidang. Data di bagian ini mengikuti daftar yang diterbitkan oleh admin perusahaan.</p>
          </div>
          <div className="job-search reveal">
            <label className="job-search__keyword"><Search size={20} /><span className="sr-only">Cari posisi</span><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Cari posisi, keterampilan, atau negara..." /></label>
            <label className="job-search__select"><MapPin size={18} /><span className="sr-only">Filter negara</span><select value={countryFilter} onChange={(event) => setCountryFilter(event.target.value)}><option>Semua negara</option>{countries.map((country) => <option key={country.name}>{country.name}</option>)}</select><ChevronDown size={15} /></label>
            <label className="job-search__select"><Briefcase size={18} /><span className="sr-only">Filter bidang</span><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option>Semua bidang</option>{workAreas.map((area) => <option key={area.name}>{area.name}</option>)}</select><ChevronDown size={15} /></label>
            <button className="button button--navy job-search__button" type="button" onClick={() => { setFormMessage("Pendaftaran kandidat belum dibuka. Saat ini Anda dapat melihat lowongan, tetapi belum bisa mengirim minat atau CV."); document.getElementById("daftar")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>Status pendaftaran <ArrowUpRight size={17} /></button>
          </div>
          <div className="job-results-meta"><span>{filteredJobs.length} {content.source === "demo" ? "contoh posisi" : "lowongan terbit"}</span><span>{content.source === "demo" ? "DATA ILUSTRASI · PERLU KONFIRMASI" : "DATA CMS · STATUS PUBLIK"}</span></div>
          {filteredJobs.length > 0 ? (
            <div className="jobs-grid">
              {filteredJobs.map((job, index) => (
                <article className="job-card reveal" key={job.id}>
                  <div className="job-card__image"><SafeMediaImage src={job.image_url} alt={"Foto lowongan " + job.title} /><span className="job-card__flag">{countryFlagByName[job.country.toLowerCase()] ?? "🌍"} {job.country}</span><span className="job-card__sample">{content.source === "demo" ? "CONTOH" : "TERBIT"}</span></div>
                  <div className="job-card__body">
                    <span className="job-card__category">{job.category.toUpperCase()} <span>·</span> POSISI {String(index + 1).padStart(2, "0")}</span>
                    <h3>{job.title}</h3>
                    <p>{job.summary}</p>
                    <div className="job-card__footer"><span><MapPin size={14} /> {job.country}</span><button type="button" onClick={() => chooseJob(job)}>Pilih posisi <ArrowUpRight size={16} /></button></div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-results"><Search size={26} /><h3>{jobItems.length === 0 && content.source === "gas" ? "Belum ada lowongan resmi" : "Tidak ada lowongan yang cocok"}</h3><p>{jobItems.length === 0 && content.source === "gas" ? "Tim Sinergi Global belum menerbitkan posisi melalui CMS. Silakan kembali untuk melihat pembaruan." : "Coba kata kunci atau filter lain untuk melihat posisi yang tersedia pada daftar ini."}</p>{jobItems.length > 0 && <button type="button" className="text-link" onClick={() => { setSearchTerm(""); setCountryFilter("Semua negara"); setCategoryFilter("Semua bidang"); }}>Reset pencarian <ArrowRight size={16} /></button>}</div>
          )}
          <WalkingApplicant />
        </div>
      </section>

      <section className="countries-section section-space" id="negara">
        <div className="container countries-layout">
          <div className="countries-copy">
            <div className="section-kicker section-kicker--light reveal"><span>04</span><span className="section-kicker__line" /> NEGARA TUJUAN</div>
            <h2 className="display-title reveal">LANGKAH ANDA.<br /><span>CAKRAWALA BARU.</span></h2>
            <p className="reveal">{content.source === "demo" ? "Negara di bawah ini merupakan contoh untuk rancangan pencarian. Tujuan, kuota, persyaratan, dan posisi yang benar-benar tersedia harus dikonfirmasi sebelum publikasi." : "Negara yang tampil mengikuti lowongan terbit di CMS. Kuota, persyaratan, dan ketersediaan posisi tetap perlu dikonfirmasi melalui kanal resmi."}</p>
            <a className="button button--lime reveal" href="#peluang">{content.source === "demo" ? "Lihat contoh posisi" : "Lihat lowongan"} <ArrowRight size={17} /></a>
          </div>
          <div className="country-list">
            {countries.length ? countries.map((country, index) => (
              <button className="country-row reveal" type="button" key={country.name} onClick={() => { setCountryFilter(country.name); document.getElementById("peluang")?.scrollIntoView({ behavior: "smooth" }); }}>
                <span className="country-row__index">{String(index + 1).padStart(2, "0")}</span><span className="country-row__flag" aria-hidden="true">{country.flag}</span><span className="country-row__name">{country.name}<small>{country.note}</small></span><ArrowUpRight size={19} />
              </button>
            )) : <p className="country-empty">Negara tujuan akan ditampilkan setelah perusahaan menerbitkan lowongan resmi.</p>}
          </div>
        </div>
      </section>

      <section className="process-section section-space" id="proses">
        <div className="container">
          <div className="section-kicker reveal"><span>05</span><span className="section-kicker__line" /> ALUR PENDAFTARAN <span className="section-kicker__right">CLARITY AT EVERY STEP</span></div>
          <div className="section-heading-row">
            <h2 className="display-title reveal">LANGKAH YANG<br /><span>LEBIH TERARAH.</span></h2>
            <p className="section-intro reveal">Gambaran umum untuk membantu kandidat memahami alur. Proses sebenarnya akan mengikuti prosedur dan ketentuan resmi perusahaan.</p>
          </div>
          <div className="process-list">
            {processSteps.map((step) => (
              <article className="process-row reveal" key={step.number}>
                <span className="process-row__number">{step.number}</span><div><h3>{step.title}</h3><p>{step.body}</p></div><ArrowDownRight size={23} />
              </article>
            ))}
          </div>
          <div className="process-note reveal"><ShieldCheck size={20} /><p><strong>Informasi penting:</strong> persyaratan, biaya, kontrak, visa, dan status pekerjaan harus dijelaskan melalui kanal resmi sebelum kandidat mengambil keputusan.</p></div>
        </div>
      </section>

      <section className="ceo-section">
        <div className="container ceo-layout">
          <div className="ceo-media reveal">
            <SafeMediaImage src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1400&q=85" alt="Ilustrasi suasana kerja profesional" loading="lazy" />
            <div className="ceo-media__overlay" />
            <div className="ceo-media__label"><span className="ticker-dot" /> PESAN DARI PIMPINAN</div>
            <button className="ceo-play" type="button" aria-label="Pratinjau video perkenalan CEO" onClick={() => setVideoNotice("Slot video sudah disiapkan. Tambahkan video resmi CEO berdurasi sekitar 15–30 detik sebelum website diluncurkan.")}><Play size={24} fill="currentColor" /></button>
            <span className="ceo-media__duration">VIDEO PROFIL · 15–30 DETIK</span>
          </div>
          <div className="ceo-copy">
            <div className="section-kicker reveal"><span>06</span><span className="section-kicker__line" /> SAMBUTAN PIMPINAN</div>
            <h2 className="display-title reveal">MELANGKAH<br /><span>DENGAN YAKIN.</span></h2>
            <p className="lead-copy reveal">Perkenalan singkat dari pimpinan akan membantu pengunjung mengenal visi, nilai, dan komitmen perusahaan secara langsung.</p>
            <p className="reveal">Bagian ini disiapkan untuk video resmi berdurasi 15–30 detik. Nama pimpinan, naskah, dan video akan dimasukkan setelah materi dari perusahaan diterima.</p>
            {videoNotice && <p className="inline-notice" role="status">{videoNotice}</p>}
            <button className="text-link text-link--button reveal" type="button" onClick={() => setVideoNotice("Video profil belum ditambahkan. Kirim file video resmi dan persetujuan publikasi untuk melengkapi bagian ini.")}>Siapkan video profil <ArrowUpRight size={17} /></button>
          </div>
        </div>
      </section>

      <section className="gallery-section section-space" id="galeri" aria-labelledby="gallery-title">
        <div className="container">
          <div className="section-kicker reveal"><span>07</span><span className="section-kicker__line" /> GALERI AKTIVITAS <span className="section-kicker__right">BEHIND EVERY JOURNEY</span></div>
          <div className="gallery-heading-row">
            <div className="gallery-heading-row__copy">
              <h2 id="gallery-title" className="display-title reveal">DI BALIK SETIAP<br /><span>LANGKAH BESAR.</span></h2>
              <p className="section-intro reveal">Cuplikan kegiatan, kolaborasi, dan pengembangan kompetensi yang menggambarkan perjalanan kandidat. Materi final mengikuti konten yang disetujui perusahaan.</p>
            </div>
            <div className="gallery-controls reveal" role="group" aria-label="Navigasi galeri aktivitas">
              <button type="button" className="gallery-control gallery-control--prev" aria-label="Geser galeri ke kiri" disabled={!galleryCanScrollPrev} onClick={() => scrollGallery(-1)}><ArrowRight size={18} /></button>
              <button type="button" className="gallery-control gallery-control--next" aria-label="Geser galeri ke kanan" disabled={!galleryCanScrollNext} onClick={() => scrollGallery(1)}><ArrowRight size={18} /></button>
            </div>
          </div>
          {content.gallery.length ? (
            <div className="gallery-track" id="sinergi-gallery-track" ref={galleryTrackRef} tabIndex={0} role="list" aria-label="Galeri aktivitas Sinergi Global. Geser horizontal untuk melihat foto lainnya.">
              {content.gallery.map((item, index) => (
                <article className="gallery-card reveal" key={item.id} role="listitem" data-cursor="EXPLORE">
                  <div className="gallery-card__image">
                    <SafeMediaImage src={item.image_url} alt={(content.source === "demo" ? "Ilustrasi pratinjau: " : "") + item.title} loading="lazy" />
                    <span className="gallery-card__index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                    <span className="gallery-card__category">{content.source === "demo" ? "ILUSTRASI PRATINJAU" : item.category}</span>
                  </div>
                  <div className="gallery-card__caption">
                    <div><h3>{item.title}</h3><p>{content.source === "demo" ? "Aset ilustrasi untuk pratinjau desain." : "Materi galeri yang dikelola melalui CMS."}</p></div>
                    <span className="gallery-card__arrow" aria-hidden="true"><ArrowUpRight size={19} /></span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="gallery-empty reveal"><span className="gallery-empty__index">07 / GALERI</span><p>Galeri aktivitas sedang disiapkan. Foto resmi akan ditampilkan setelah materi publikasi diterima dari perusahaan.</p></div>
          )}
          <p className="gallery-note reveal"><ShieldCheck size={16} /> {content.source === "demo" ? "Foto yang terlihat merupakan ilustrasi pratinjau. Ganti dengan foto resmi dan keterangan yang telah disetujui sebelum peluncuran." : "Pastikan setiap foto dan keterangannya telah diverifikasi serta disetujui perusahaan sebelum publikasi."}</p>
        </div>
      </section>

      <section className="news-section section-space" id="berita">
        <div className="container">
          <div className="section-kicker reveal"><span>08</span><span className="section-kicker__line" /> KABAR & PANDUAN <span className="section-kicker__right">KNOW BEFORE YOU GO</span></div>
          <div className="section-heading-row">
            <h2 className="display-title reveal">BEKAL INFORMASI.<br /><span>LANGKAH LEBIH SIAP.</span></h2>
            <p className="section-intro reveal">Ruang untuk berita perusahaan, panduan kandidat, dan informasi terbaru. Artikel di bawah adalah contoh tampilan, bukan publikasi resmi.</p>
          </div>
          <div className="news-grid">
            {articles.map((article, index) => (
              <article className="news-card reveal" key={article.title}>
                <div className="news-card__image"><SafeMediaImage src={article.image} alt={"Ilustrasi artikel " + article.title} /><span>0{index + 1}</span></div>
                <div className="news-card__meta"><span>{article.category}</span><span>{article.readTime}</span></div>
                <h3>{article.title}</h3>
                <button type="button" className="text-link text-link--button" onClick={() => setArticleNotice("Artikel ini masih berupa contoh desain. Konten berita dan pencatatan kunjungan akan dihubungkan setelah CMS berita disiapkan.")}>Lihat artikel <ArrowUpRight size={16} /></button>
              </article>
            ))}
          </div>
          {articleNotice && <p className="inline-notice news-notice" role="status">{articleNotice}</p>}
        </div>
      </section>

      <section className="registration-section section-space" id="daftar">
        <div className="container registration-layout">
          <div className="registration-copy">
            <div className="section-kicker section-kicker--light reveal"><span>09</span><span className="section-kicker__line" /> FORM MINAT KANDIDAT</div>
            <h2 className="display-title reveal">MULAI DARI<br /><span>LANGKAH PERTAMA.</span></h2>
            <p className="reveal">Pendaftaran kandidat belum dibuka. Formulir dan unggah CV dinonaktifkan sampai backend, konten resmi, dan pemberitahuan privasi disetujui. Tidak ada data yang dikirim atau disimpan.</p>
            <div className="registration-points reveal"><span><CheckCircle2 size={17} /> Informasi kandidat</span><span><CheckCircle2 size={17} /> Bidang dan negara tujuan</span><span><CheckCircle2 size={17} /> CV belum diterima</span></div>
            <div className="registration-security reveal"><ShieldCheck size={20} /><span>Data pribadi dan CV harus diproses dengan izin, penyimpanan aman, serta pemberitahuan privasi yang jelas sebelum formulir diaktifkan.</span></div>
          </div>
          <form className="registration-form reveal" onSubmit={submitInterest}>
            <div className="registration-form__head"><span>PENDAFTARAN BELUM DIBUKA</span><span>INFORMASI / 01</span></div>
            <div className="form-field"><label htmlFor="candidate-name">Nama lengkap</label><input id="candidate-name" name="name" autoComplete="name" required disabled placeholder="Pendaftaran belum dibuka" /></div>
            <div className="form-row">
              <div className="form-field"><label htmlFor="candidate-phone">Nomor WhatsApp</label><input id="candidate-phone" name="phone" type="tel" autoComplete="tel" required disabled placeholder="Pendaftaran belum dibuka" /></div>
              <div className="form-field"><label htmlFor="candidate-email">Email</label><input id="candidate-email" name="email" type="email" autoComplete="email" disabled placeholder="Pendaftaran belum dibuka" /></div>
            </div>
            <div className="form-row">
              <div className="form-field"><label htmlFor="candidate-country">Negara tujuan</label><select id="candidate-country" name="country" value={targetCountry} onChange={(event) => setTargetCountry(event.target.value)} required disabled><option value="">Pilih negara</option>{countries.map((country) => <option key={country.name} value={country.name}>{country.flag} {country.name}</option>)}</select></div>
              <div className="form-field"><label htmlFor="candidate-position">Bidang / posisi</label><select id="candidate-position" name="position" value={selectedPosition} onChange={(event) => setSelectedPosition(event.target.value)} required disabled><option value="">Pilih contoh posisi</option>{jobItems.map((job) => <option key={job.id} value={job.title}>{job.title}</option>)}</select></div>
            </div>
            <div className="form-field"><label htmlFor="candidate-cv">Unggah CV <span>PDF / DOC / DOCX · Maks. 5 MB</span></label><label className="file-drop" htmlFor="candidate-cv"><UploadCloud size={23} /><strong>{cvName || "Pilih file CV Anda"}</strong><small>Unggah CV belum tersedia</small><input id="candidate-cv" name="cv" type="file" disabled accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required onChange={(event) => { const file = event.currentTarget.files?.[0]; if (!file) { setCvName(""); return; } if (file.size > 5 * 1024 * 1024) { setFormMessage("Ukuran file melebihi 5 MB. Pilih CV yang lebih kecil."); event.currentTarget.value = ""; setCvName(""); return; } setCvName(file.name); setFormMessage(""); }} /></label></div>
            <label className="consent-check"><input type="checkbox" required disabled /><span>Pemberitahuan privasi resmi belum disetujui; formulir belum dapat digunakan.</span></label>
            <button className="button button--lime registration-submit" type="submit" disabled>Pendaftaran belum dibuka <ArrowRight size={18} /></button>
            {formMessage && <p className="form-message" role="status">{formMessage}</p>}
            <p className="form-footnote"><ShieldCheck size={14} /> Jangan unggah CV asli sebelum sistem penyimpanan dan kebijakan privasi resmi tersedia.</p>
          </form>
        </div>
      </section>

      <section className="contact-section section-space" id="kontak">
        <div className="container contact-layout">
          <div><div className="section-kicker reveal"><span>10</span><span className="section-kicker__line" /> HUBUNGI SINERGI GLOBAL</div><h2 className="display-title reveal">TERHUBUNG.<br /><span>SIAP MELANGKAH.</span></h2></div>
          <div className="contact-card reveal">
            <p>Untuk pertanyaan resmi, gunakan kontak perusahaan yang sudah diverifikasi.</p>
            {whatsAppUrl ? <a href={whatsAppUrl} target="_blank" rel="noreferrer" className="contact-item"><span><Globe size={18} /></span><div><small>WHATSAPP RESMI</small><strong>Mulai percakapan</strong></div><ArrowUpRight size={17} /></a> : <div className="contact-item contact-item--muted"><span><Globe size={18} /></span><div><small>WHATSAPP</small><strong>Kontak resmi menyusul</strong></div></div>}
            {email ? <a href={"mailto:" + email} className="contact-item"><span><Mail size={18} /></span><div><small>EMAIL</small><strong>{email}</strong></div><ArrowUpRight size={17} /></a> : <div className="contact-item contact-item--muted"><span><Mail size={18} /></span><div><small>EMAIL</small><strong>Alamat email menyusul</strong></div></div>}
            <div className="contact-item contact-item--muted"><span><MapPin size={18} /></span><div><small>ALAMAT</small><strong>{address || "Alamat resmi menyusul"}</strong></div></div>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container">
          <div className="footer-main">
            <a className="sg-brand sg-brand--footer" href="#top"><span className="sg-brand__mark">SG<span>.</span></span><span className="sg-brand__name">SINERGI GLOBAL<small>CAREER OPPORTUNITIES</small></span></a>
            <p>Menghubungkan keterampilan, persiapan, dan informasi peluang karier internasional dengan lebih terarah.</p>
            <div className="footer-links"><span>JELAJAHI</span><a href="#bidang">Bidang kerja</a><a href="#peluang">Peluang kerja</a><a href="#proses">Alur proses</a><a href="#galeri">Galeri aktivitas</a><a href="#berita">Berita & panduan</a></div>
            <div className="footer-social"><span>MEDIA SOSIAL</span><div><span aria-label="Instagram, tautan resmi menyusul"><Instagram size={18} /></span><span aria-label="LinkedIn, tautan resmi menyusul"><Linkedin size={18} /></span><span aria-label="Informasi grup perusahaan"><Building2 size={18} /></span></div><small>Tautan resmi menyusul</small></div>
          </div>
          <div className="footer-group-note">PT SINERGI CORPORA GROUP · JAVA INDO CORPORA <span>Logo dan hubungan grup perlu disesuaikan dengan aset resmi.</span></div>
          <div className="footer-bottom"><span>© {new Date().getFullYear()} SINERGI GLOBAL. Semua hak dilindungi.</span><span>DESAIN WEBSITE · BY KASTRIVA</span><a href="#top">Kembali ke atas ↑</a></div>
        </div>
      </footer>
      {content.source === "demo" && <div className="demo-status" role="note"><span className="ticker-dot" /> DATA KONTEN DEMO</div>}
    </main>
  );
}
