"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowDown, ArrowDownRight, ArrowRight, ArrowUpRight, BadgeCheck, Briefcase,
  Building2, CheckCircle2, ChevronDown, Clock3, Factory, FileText, Globe,
  HardHat, Hotel, Instagram, Linkedin, Mail, MapPin, Menu, Play, Search,
  ShieldCheck, UploadCloud, Users, Warehouse, Wrench, X, Zap
} from "lucide-react";
import type { PublicContent } from "@/lib/content";
import SafeMediaImage from "@/components/media/SafeMediaImage";

type JobSample = {
  id: string;
  title: string;
  country: string;
  category: string;
  summary: string;
  image: string;
  flag: string;
};

const jobSamples: JobSample[] = [
  {
    id: "pl-welder",
    title: "Welder / Juru Las",
    country: "Poland",
    category: "Welding",
    summary: "Contoh posisi untuk tenaga kerja terampil di bidang pengelasan dan fabrikasi.",
    image: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1000&q=82",
    flag: "🇵🇱",
  },
  {
    id: "pl-warehouse",
    title: "Warehouse Operator",
    country: "Poland",
    category: "Warehouse",
    summary: "Contoh peran untuk operasional gudang, penataan barang, dan proses logistik.",
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1000&q=82",
    flag: "🇵🇱",
  },
  {
    id: "de-electrician",
    title: "Electrician",
    country: "Germany",
    category: "Electrical",
    summary: "Contoh posisi teknis untuk instalasi dan pemeliharaan kelistrikan.",
    image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1000&q=82",
    flag: "🇩🇪",
  },
  {
    id: "cz-production",
    title: "Production Operator",
    country: "Czech Republic",
    category: "Manufacturing",
    summary: "Contoh peran untuk kegiatan produksi dan pengoperasian proses manufaktur.",
    image: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=1000&q=82",
    flag: "🇨🇿",
  },
  {
    id: "nl-hospitality",
    title: "Hospitality Crew",
    country: "Netherlands",
    category: "Hospitality",
    summary: "Contoh peran layanan dan operasional hospitality dengan orientasi pelayanan.",
    image: "https://images.unsplash.com/photo-1551218808-94e220e084d2?auto=format&fit=crop&w=1000&q=82",
    flag: "🇳🇱",
  },
  {
    id: "de-construction",
    title: "Construction Worker",
    country: "Germany",
    category: "Construction",
    summary: "Contoh posisi pendukung proyek konstruksi dan pekerjaan lapangan.",
    image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1000&q=82",
    flag: "🇩🇪",
  },
];

const workAreas = [
  { name: "Hospitality", detail: "Hotel, layanan, dan operasional hospitality.", icon: Hotel, number: "01" },
  { name: "Manufacturing", detail: "Produksi, perakitan, dan proses manufaktur.", icon: Factory, number: "02" },
  { name: "Electrical", detail: "Instalasi dan pekerjaan teknis kelistrikan.", icon: Zap, number: "03" },
  { name: "Warehouse", detail: "Gudang, distribusi, dan dukungan logistik.", icon: Warehouse, number: "04" },
  { name: "Construction", detail: "Pekerjaan lapangan dan dukungan konstruksi.", icon: HardHat, number: "05" },
  { name: "Welding", detail: "Pengelasan, fabrikasi, dan pekerjaan logam.", icon: Wrench, number: "06" },
];

const countries = [
  { name: "Poland", flag: "🇵🇱", note: "Contoh negara tujuan" },
  { name: "Germany", flag: "🇩🇪", note: "Contoh negara tujuan" },
  { name: "Netherlands", flag: "🇳🇱", note: "Contoh negara tujuan" },
  { name: "Czech Republic", flag: "🇨🇿", note: "Contoh negara tujuan" },
];

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [countryFilter, setCountryFilter] = useState("Semua negara");
  const [categoryFilter, setCategoryFilter] = useState("Semua bidang");
  const [selectedPosition, setSelectedPosition] = useState("");
  const [targetCountry, setTargetCountry] = useState("Poland");
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

  const filteredJobs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return jobSamples.filter((job) => {
      const matchesQuery = !query || [job.title, job.country, job.category, job.summary].some((value) => value.toLowerCase().includes(query));
      const matchesCountry = countryFilter === "Semua negara" || job.country === countryFilter;
      const matchesCategory = categoryFilter === "Semua bidang" || job.category === categoryFilter;
      return matchesQuery && matchesCountry && matchesCategory;
    });
  }, [searchTerm, countryFilter, categoryFilter]);

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
      gsap.fromTo(".hero__photo", { scale: 1.08 }, { scale: 1, duration: 1.8, ease: "power2.out" });
      gsap.utils.toArray<HTMLElement>(".reveal").forEach((element) => {
        gsap.fromTo(element, { y: 28, autoAlpha: 0 }, {
          y: 0, autoAlpha: 1, duration: 0.7, ease: "power2.out",
          scrollTrigger: { trigger: element, start: "top 90%", once: true },
        });
      });
    }, root);
    return () => context.revert();
  }, []);

  function chooseJob(job: JobSample) {
    setSelectedPosition(job.title);
    setTargetCountry(job.country);
    document.getElementById("daftar")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function submitInterest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormMessage("Ini masih pratinjau desain. Data dan CV belum dikirim atau disimpan. Integrasi backend pendaftaran perlu diselesaikan sebelum formulir digunakan oleh publik.");
  }

  return (
    <main ref={rootRef} id="top" className="sg-site">
      <div className="preview-ribbon"><span className="preview-dot" /> PRATINJAU DESAIN · DATA POSISI MASIH CONTOH</div>
      <header className="site-header">
        <a className="sg-brand" href="#top" aria-label="Sinergi Global, kembali ke atas">
          <span className="sg-brand__mark">SG<span>.</span></span>
          <span className="sg-brand__name">SINERGI GLOBAL<small>CAREER OPPORTUNITIES</small></span>
        </a>
        <nav className={"site-nav" + (menuOpen ? " is-open" : "")} aria-label="Navigasi utama">
          <a onClick={() => setMenuOpen(false)} href="#tentang">Tentang</a>
          <a onClick={() => setMenuOpen(false)} href="#bidang">Bidang kerja</a>
          <a onClick={() => setMenuOpen(false)} href="#peluang">Peluang kerja</a>
          <a onClick={() => setMenuOpen(false)} href="#proses">Alur proses</a>
          <a onClick={() => setMenuOpen(false)} href="#berita">Berita</a>
        </nav>
        <a className="header-cta" href="#daftar">Mulai pendaftaran <ArrowUpRight size={16} /></a>
        <button type="button" className="menu-toggle" aria-label={menuOpen ? "Tutup menu" : "Buka menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}>
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
            <div className="hero-side__number">01<span>/</span>06</div>
            <div className="hero-side__rule" />
            <p>Enam bidang kerja untuk membantu Anda menemukan jalur yang sesuai dengan keterampilan dan pengalaman.</p>
            <a href="#bidang" aria-label="Lihat bidang kerja">Lihat bidang kerja <ArrowUpRight size={17} /></a>
          </div>
          <a className="hero-scroll" href="#tentang" aria-label="Gulir ke bagian tentang"><ArrowDown size={17} /></a>
        </div>
      </section>

      <div className="sector-ticker" aria-label="Bidang pekerjaan">
        <div className="sector-ticker__label"><span className="ticker-dot" /> BIDANG KERJA</div>
        <div className="sector-ticker__viewport"><div className="sector-ticker__track">
          {Array.from({ length: 2 }).map((_, index) => (
            <span className="sector-ticker__set" key={index}>HOSPITALITY <b>✳</b> MANUFACTURING <b>✳</b> ELECTRICAL <b>✳</b> WAREHOUSE <b>✳</b> CONSTRUCTION <b>✳</b> WELDING <b>✳</b></span>
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
            <p className="section-intro reveal">Jelajahi bidang yang relevan dengan pengalaman dan keterampilan Anda. Daftar ini adalah kategori awal untuk desain dan dapat disesuaikan dengan kebutuhan resmi perusahaan.</p>
          </div>
          <div className="work-grid">
            {workAreas.map((area) => {
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
            })}
          </div>
        </div>
      </section>

      <section className="jobs-section section-space" id="peluang">
        <div className="container">
          <div className="section-kicker reveal"><span>03</span><span className="section-kicker__line" /> JELAJAHI POSISI <span className="section-kicker__right">FIND YOUR NEXT STEP</span></div>
          <div className="section-heading-row jobs-heading">
            <div><h2 className="display-title reveal">CARI PELUANG<br /><span>ANDA.</span></h2><p className="jobs-disclaimer reveal"><BadgeCheck size={17} /> Contoh data untuk pratinjau. Ini bukan daftar lowongan aktif.</p></div>
            <p className="section-intro reveal">Cari berdasarkan kata kunci, negara, atau bidang pekerjaan. Daftar ini nantinya akan terhubung dengan data posisi yang telah disetujui perusahaan.</p>
          </div>
          <div className="job-search reveal">
            <label className="job-search__keyword"><Search size={20} /><span className="sr-only">Cari posisi</span><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Cari posisi, keterampilan, atau negara..." /></label>
            <label className="job-search__select"><MapPin size={18} /><span className="sr-only">Filter negara</span><select value={countryFilter} onChange={(event) => setCountryFilter(event.target.value)}><option>Semua negara</option>{countries.map((country) => <option key={country.name}>{country.name}</option>)}</select><ChevronDown size={15} /></label>
            <label className="job-search__select"><Briefcase size={18} /><span className="sr-only">Filter bidang</span><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option>Semua bidang</option>{workAreas.map((area) => <option key={area.name}>{area.name}</option>)}</select><ChevronDown size={15} /></label>
            <button className="button button--navy job-search__button" type="button" onClick={() => document.getElementById("daftar")?.scrollIntoView({ behavior: "smooth" })}>Daftar minat <ArrowUpRight size={17} /></button>
          </div>
          <div className="job-results-meta"><span>{filteredJobs.length} contoh posisi</span><span>DATA ILUSTRASI · PERLU KONFIRMASI</span></div>
          {filteredJobs.length > 0 ? (
            <div className="jobs-grid">
              {filteredJobs.map((job, index) => (
                <article className="job-card reveal" key={job.id}>
                  <div className="job-card__image"><SafeMediaImage src={job.image} alt={"Ilustrasi bidang " + job.category} /><span className="job-card__flag">{job.flag} {job.country}</span><span className="job-card__sample">CONTOH</span></div>
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
            <div className="empty-results"><Search size={26} /><h3>Belum ada contoh yang cocok</h3><p>Coba kata kunci atau filter lain untuk melihat contoh posisi.</p><button type="button" className="text-link" onClick={() => { setSearchTerm(""); setCountryFilter("Semua negara"); setCategoryFilter("Semua bidang"); }}>Reset pencarian <ArrowRight size={16} /></button></div>
          )}
        </div>
      </section>

      <section className="countries-section section-space" id="negara">
        <div className="container countries-layout">
          <div className="countries-copy">
            <div className="section-kicker section-kicker--light reveal"><span>04</span><span className="section-kicker__line" /> NEGARA TUJUAN</div>
            <h2 className="display-title reveal">LANGKAH ANDA.<br /><span>CAKRAWALA BARU.</span></h2>
            <p className="reveal">Negara di bawah ini merupakan contoh untuk rancangan pencarian. Tujuan, kuota, persyaratan, dan posisi yang benar-benar tersedia harus dikonfirmasi sebelum publikasi.</p>
            <a className="button button--lime reveal" href="#peluang">Lihat contoh posisi <ArrowRight size={17} /></a>
          </div>
          <div className="country-list">
            {countries.map((country, index) => (
              <button className="country-row reveal" type="button" key={country.name} onClick={() => { setCountryFilter(country.name); document.getElementById("peluang")?.scrollIntoView({ behavior: "smooth" }); }}>
                <span className="country-row__index">0{index + 1}</span><span className="country-row__flag" aria-hidden="true">{country.flag}</span><span className="country-row__name">{country.name}<small>{country.note}</small></span><ArrowUpRight size={19} />
              </button>
            ))}
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

      <section className="news-section section-space" id="berita">
        <div className="container">
          <div className="section-kicker reveal"><span>07</span><span className="section-kicker__line" /> KABAR & PANDUAN <span className="section-kicker__right">KNOW BEFORE YOU GO</span></div>
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
            <div className="section-kicker section-kicker--light reveal"><span>08</span><span className="section-kicker__line" /> FORM MINAT KANDIDAT</div>
            <h2 className="display-title reveal">MULAI DARI<br /><span>LANGKAH PERTAMA.</span></h2>
            <p className="reveal">Isi informasi awal agar tim dapat memahami minat bidang dan negara tujuan Anda. Formulir ini masih berupa pratinjau dan belum menyimpan atau mengirim data.</p>
            <div className="registration-points reveal"><span><CheckCircle2 size={17} /> Informasi dasar kandidat</span><span><CheckCircle2 size={17} /> Bidang dan negara tujuan</span><span><CheckCircle2 size={17} /> Slot unggah CV</span></div>
            <div className="registration-security reveal"><ShieldCheck size={20} /><span>Data pribadi dan CV harus diproses dengan izin, penyimpanan aman, serta pemberitahuan privasi yang jelas sebelum formulir diaktifkan.</span></div>
          </div>
          <form className="registration-form reveal" onSubmit={submitInterest}>
            <div className="registration-form__head"><span>FORMULIR AWAL</span><span>PRATINJAU / 01</span></div>
            <div className="form-field"><label htmlFor="candidate-name">Nama lengkap</label><input id="candidate-name" name="name" autoComplete="name" required placeholder="Masukkan nama lengkap" /></div>
            <div className="form-row">
              <div className="form-field"><label htmlFor="candidate-phone">Nomor WhatsApp</label><input id="candidate-phone" name="phone" type="tel" autoComplete="tel" required placeholder="08xx xxxx xxxx" /></div>
              <div className="form-field"><label htmlFor="candidate-email">Email</label><input id="candidate-email" name="email" type="email" autoComplete="email" placeholder="nama@email.com" /></div>
            </div>
            <div className="form-row">
              <div className="form-field"><label htmlFor="candidate-country">Negara tujuan</label><select id="candidate-country" name="country" value={targetCountry} onChange={(event) => setTargetCountry(event.target.value)} required>{countries.map((country) => <option key={country.name} value={country.name}>{country.flag} {country.name}</option>)}</select></div>
              <div className="form-field"><label htmlFor="candidate-position">Bidang / posisi</label><select id="candidate-position" name="position" value={selectedPosition} onChange={(event) => setSelectedPosition(event.target.value)} required><option value="">Pilih contoh posisi</option>{jobSamples.map((job) => <option key={job.id} value={job.title}>{job.title}</option>)}</select></div>
            </div>
            <div className="form-field"><label htmlFor="candidate-cv">Unggah CV <span>PDF / DOC / DOCX · Maks. 5 MB</span></label><label className="file-drop" htmlFor="candidate-cv"><UploadCloud size={23} /><strong>{cvName || "Pilih file CV Anda"}</strong><small>{cvName ? "File dipilih untuk pratinjau" : "Klik untuk memilih file dari perangkat"}</small><input id="candidate-cv" name="cv" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required onChange={(event) => { const file = event.currentTarget.files?.[0]; if (!file) { setCvName(""); return; } if (file.size > 5 * 1024 * 1024) { setFormMessage("Ukuran file melebihi 5 MB. Pilih CV yang lebih kecil."); event.currentTarget.value = ""; setCvName(""); return; } setCvName(file.name); setFormMessage(""); }} /></label></div>
            <label className="consent-check"><input type="checkbox" required /><span>Saya memahami bahwa ini formulir pratinjau dan data belum dikirim.</span></label>
            <button className="button button--lime registration-submit" type="submit">Tinjau pendaftaran <ArrowRight size={18} /></button>
            {formMessage && <p className="form-message" role="status">{formMessage}</p>}
            <p className="form-footnote"><ShieldCheck size={14} /> Jangan unggah CV asli sebelum sistem penyimpanan dan kebijakan privasi resmi tersedia.</p>
          </form>
        </div>
      </section>

      <section className="contact-section section-space" id="kontak">
        <div className="container contact-layout">
          <div><div className="section-kicker reveal"><span>09</span><span className="section-kicker__line" /> HUBUNGI SINERGI GLOBAL</div><h2 className="display-title reveal">TERHUBUNG.<br /><span>SIAP MELANGKAH.</span></h2></div>
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
            <div className="footer-links"><span>JELAJAHI</span><a href="#bidang">Bidang kerja</a><a href="#peluang">Contoh posisi</a><a href="#proses">Alur proses</a><a href="#berita">Berita & panduan</a></div>
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
