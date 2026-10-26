"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Briefcase, ChevronRight, Database, ImageIcon, LayoutDashboard, LogOut, Plus, Save, Upload, ShieldCheck, SquarePen, X } from "lucide-react";
import type { GalleryItem, JobListing, Program, PublicContent, SiteContent } from "@/lib/content";
import SafeMediaImage from "@/components/media/SafeMediaImage";

type Tab = "overview" | "site" | "jobs" | "programs" | "gallery";
const config: { key: keyof SiteContent; label: string; multiline?: boolean }[] = [
  { key: "hero_eyebrow", label: "Teks kecil hero" },
  { key: "hero_title_1", label: "Judul hero — baris 1" },
  { key: "hero_title_2", label: "Judul hero — baris 2" },
  { key: "hero_title_accent", label: "Judul aksen hero" },
  { key: "hero_description", label: "Deskripsi hero", multiline: true },
  { key: "about_description", label: "Tentang perusahaan", multiline: true },
  { key: "contact_whatsapp", label: "WhatsApp resmi (format 62...)" },
  { key: "contact_email", label: "Email resmi" },
  { key: "contact_address", label: "Alamat perusahaan", multiline: true },
];
const blankProgram: Program = { id: "", title: "", category: "PELATIHAN", description: "", duration: "", image_url: "", published: false, order: 1 };
const blankGallery: GalleryItem = { id: "", title: "", category: "KEGIATAN", image_url: "", published: false, order: 1 };
const blankJob: JobListing = { id: "", title: "", country: "", category: "", summary: "", image_url: "", published: false, order: 1 };

export default function AdminDashboard({ email, initial, backendReady }: { email: string; initial: PublicContent; backendReady: boolean }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [site, setSite] = useState<SiteContent>({ ...initial.site });
  const [programs, setPrograms] = useState<Program[]>(initial.programs);
  const [gallery, setGallery] = useState<GalleryItem[]>(initial.gallery);
  const [jobs, setJobs] = useState<JobListing[]>(initial.jobs);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [editingGallery, setEditingGallery] = useState<GalleryItem | null>(null);
  const [editingJob, setEditingJob] = useState<JobListing | null>(null);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState("");
  const [failure, setFailure] = useState("");
  // Never allow mutations on the basis of environment variables alone.
  // Only a successful, validated admin API read unlocks the editor.
  const backendConfigured = backendReady && initial.source === "gas";
  const [adminLoad, setAdminLoad] = useState<"loading" | "ready" | "failed">(
    backendConfigured ? "loading" : "failed"
  );
  const canWrite = backendConfigured && adminLoad === "ready";

  useEffect(() => {
    if (!backendConfigured) {
      setAdminLoad("failed");
      return;
    }
    setAdminLoad("loading");
    let cancelled = false;
    fetch("/api/admin/content", { cache: "no-store" }).then(async (res) => {
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.ok) throw new Error(result.error || "Tidak dapat membaca data admin.");
      if (!result.data || !result.data.site || typeof result.data.site !== "object" ||
          Array.isArray(result.data.site) || !Array.isArray(result.data.programs) ||
          !Array.isArray(result.data.gallery) || !Array.isArray(result.data.jobs)) {
        throw new Error("Format data admin tidak valid.");
      }
      if (!cancelled) {
        if (result.data.site) setSite(prev => ({ ...prev, ...result.data.site }));
        if (Array.isArray(result.data.programs)) setPrograms(result.data.programs);
        if (Array.isArray(result.data.gallery)) setGallery(result.data.gallery);
        if (Array.isArray(result.data.jobs)) setJobs(result.data.jobs);
        setAdminLoad("ready");
      }
    }).catch((error: unknown) => {
      if (!cancelled) {
        setAdminLoad("failed");
        const reason = error instanceof Error ? error.message : "Terjadi kesalahan jaringan.";
        setFailure(`Koneksi API Admin gagal diverifikasi: ${reason} Tombol simpan dinonaktifkan.`);
      }
    });
    return () => { cancelled = true; };
  }, [backendConfigured]);

  async function save(action: "update_site" | "upsert_program" | "upsert_gallery" | "upsert_job", data: unknown): Promise<boolean> {
    if (!canWrite) { setFailure("Koneksi API Admin belum berhasil diverifikasi. Penyimpanan diblokir."); return false; }
    setNotice(""); setFailure(""); setWorking(true);
    try {
      const res = await fetch("/api/admin/content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, data }) });
      const reply = await res.json();
      if (!res.ok || !reply.ok) throw new Error(reply.error || "Gagal menyimpan perubahan.");
      setNotice(reply.message || "Tersimpan. Tunggu cache publik diperbarui.");
      return true;
    } catch (err) { setFailure(err instanceof Error ? err.message : "Terjadi kesalahan."); return false; }
    finally { setWorking(false); }
  }

  async function uploadImage(file: File, target: "program" | "gallery" | "job") {
    if (!canWrite) { setFailure("Koneksi API Admin belum berhasil diverifikasi. Upload diblokir."); return; }
    setFailure(""); setNotice(""); setWorking(true);
    try {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 2_200_000) throw new Error("Gunakan JPG, PNG, atau WEBP maksimal 2,2 MB.");
      const data = new FormData(); data.set("image",file);
      const res = await fetch("/api/admin/upload",{method:"POST",body:data});
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Gagal upload foto.");
      if (target === "program") setEditingProgram(prev=>prev&&({...prev,image_url:json.image_url}));
      else if (target === "gallery") setEditingGallery(prev=>prev&&({...prev,image_url:json.image_url}));
      else setEditingJob(prev=>prev&&({...prev,image_url:json.image_url}));
      setNotice("Foto sudah terunggah ke Drive. Klik Simpan untuk mengaitkannya dengan konten.");
    } catch(err) { setFailure(err instanceof Error ? err.message : "Upload gagal"); }
    finally { setWorking(false); }
  }

  async function logout() { await fetch("/api/admin/logout", { method: "POST" }); window.location.replace("/admin/login"); }
  const nav: { key: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { key: "overview", label: "Ringkasan", icon: LayoutDashboard }, { key: "site", label: "Profil Perusahaan", icon: SquarePen },
    { key: "jobs", label: "Lowongan", icon: Briefcase }, { key: "programs", label: "Program / Materi", icon: Database }, { key: "gallery", label: "Galeri Kegiatan", icon: ImageIcon },
  ];

  return <div className="admin-app">
    <aside className="admin-sidebar">
      <a href="/" className="admin-brand"><span className="admin-monogram">SG<span>.</span></span><div><b>SINERGI</b><small>GLOBAL</small></div></a>
      <div className="sidebar-caption">CONTENT CONTROL CENTER</div>
      <nav aria-label="Menu administrator">
        {nav.map(item => <button type="button" className={`admin-nav-link ${tab===item.key ? "selected" : ""}`} key={item.key} onClick={() => {setTab(item.key); setNotice(""); setFailure("");}}><item.icon size={18}/>{item.label}<ChevronRight size={16} className="nav-chevron"/></button>)}
      </nav>
      <div className="sidebar-bottom"><div className="sidebar-user"><span className="sidebar-avatar">{email.slice(0,1).toUpperCase()}</span><div><strong>Administrator</strong><small>{email}</small></div></div><button type="button" className="admin-nav-link" onClick={logout}><LogOut size={17}/> Keluar</button><span className="sidebar-credit">BY KASTRIVA · PREMIUM CMS</span></div>
    </aside>
    <main className="admin-main">
      <div className="admin-topbar"><span>SINERGI GLOBAL / ADMIN PANEL <b>/</b> {nav.find(n=>n.key===tab)?.label.toUpperCase()}</span><a href="/" target="_blank" rel="noreferrer">LIHAT WEBSITE <ArrowUpRight size={16}/></a></div>
      <header className="admin-main-head"><span className="admin-eyebrow">✳ &nbsp; SITE MANAGEMENT / 2026</span><h1>{({overview:"CONTROL CENTER",site:"COMPANY PROFILE",jobs:"JOB LISTINGS",programs:"PROGRAM / MATERI",gallery:"MEDIA GALLERY"} as Record<Tab,string>)[tab]}<em>.</em></h1><p>Kelola profil, lowongan, program, dan galeri Sinergi Global tanpa mengubah source code atau animasi.</p></header>
      <div className={`admin-status ${canWrite ? "good" : "bad"}`}><ShieldCheck size={18}/><span>{canWrite ? "Koneksi GAS Admin sudah diuji dan editor siap menyimpan." : adminLoad === "loading" ? "Memverifikasi koneksi dan data privat GAS Admin — tombol Simpan dikunci." : "Mode baca saja — API Admin belum terverifikasi. Periksa login, konfigurasi GAS, dan status database."}</span></div>
      {notice && <div className="admin-alert success" role="status">{notice}</div>}
      {failure && <div className="admin-alert danger" role="alert">{failure}</div>}
      {tab === "overview" && <section className="admin-overview"><div className="admin-stat"><small>01 / LOWONGAN</small><strong>{jobs.filter(job=>job.published).length.toString().padStart(2,"0")}</strong><span>Lowongan terpublikasi</span></div><div className="admin-stat"><small>02 / MEDIA</small><strong>{gallery.filter(g=>g.published).length.toString().padStart(2,"0")}</strong><span>Foto galeri terpublikasi</span></div><div className="admin-stat"><small>03 / DATA SOURCE</small><strong className="admin-source">{initial.source.toUpperCase()}</strong><span>Sumber halaman saat ini</span></div><div className="admin-intro"><span className="admin-eyebrow">WORKSPACE / SYNERGY</span><h2>Konten perusahaan.<br/><em>Di satu tempat.</em></h2><p>Perbarui profil, lowongan, dan dokumentasi. Konten publik memerlukan beberapa menit untuk memperbarui cache. Pendaftaran kandidat dan unggah CV tetap nonaktif.</p><button className="admin-primary" onClick={()=>setTab("site")}>MULAI KELOLA KONTEN <ArrowUpRight size={17}/></button></div></section>}
      {tab === "site" && <section className="admin-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">EDIT / GLOBAL CONTENT</span><h2>Identitas & Profil Website</h2></div><span className="admin-chip">9 FIELD</span></div><form onSubmit={async e=>{e.preventDefault(); await save("update_site",site);}}><div className="admin-form-grid">{config.map(field=><label className={field.multiline?"admin-field wide":"admin-field"} key={field.key}><span>{field.label}</span>{field.multiline?<textarea rows={3} maxLength={600} value={site[field.key]} onChange={e=>setSite(s=>({...s,[field.key]:e.target.value}))}/>:<input maxLength={600} value={site[field.key]} onChange={e=>setSite(s=>({...s,[field.key]:e.target.value}))}/>}</label>)}</div><div className="admin-form-actions"><span>Perubahan hanya berlaku setelah Anda menekan simpan.</span><button className="admin-primary" disabled={!canWrite||working}><Save size={17}/> {working?"MENYIMPAN...":"SIMPAN PERUBAHAN"}</button></div></form></section>}
      {tab === "jobs" && <section className="admin-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">EDIT / PUBLISHED POSITIONS</span><h2>Lowongan Kerja</h2></div><button className="admin-primary" onClick={()=>setEditingJob({...blankJob,id:"job-"+Date.now(),order:jobs.length+1})} disabled={!canWrite}><Plus size={18}/> TAMBAH LOWONGAN</button></div>{jobs.length ? <div className="admin-card-list">{jobs.map(item=><div className="admin-list-item" key={item.id}><div className="admin-list-image"><SafeMediaImage src={item.image_url} alt={"Foto "+item.title} showDriveLink/></div><div className="admin-list-description"><span>{item.country} · {item.category} · #{item.order} · {item.published ? "PUBLIK" : "DRAFT"}</span><h3>{item.title}</h3><p>{item.summary}</p></div><button className="admin-ghost" disabled={!canWrite} onClick={()=>setEditingJob({...item})}><SquarePen size={16}/> UBAH</button></div>)}</div> : <p className="admin-footnote">Belum ada data lowongan. Tambahkan posisi yang sudah dikonfirmasi perusahaan; simpan sebagai draft sampai siap dipublikasikan.</p>}<p className="admin-footnote">Hanya lowongan dengan status publik yang dikirim oleh endpoint GAS publik. Form minat kandidat dan unggah CV tetap nonaktif.</p></section>}
      {tab === "programs" && <section className="admin-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">EDIT / TRAINING PROGRAMS</span><h2>Program Pelatihan</h2></div><button className="admin-primary" onClick={()=>setEditingProgram({...blankProgram,id:`program-${Date.now()}`,order:programs.length+1})} disabled={!canWrite}><Plus size={18}/> TAMBAH PROGRAM</button></div><div className="admin-card-list">{programs.map(item=><div className="admin-list-item" key={item.id}><div className="admin-list-image"><SafeMediaImage src={item.image_url} alt={`Foto ${item.title}`} showDriveLink/></div><div className="admin-list-description"><span>{item.category} · #{item.order} · {item.published ? "PUBLIK" : "DRAFT"}</span><h3>{item.title}</h3><p>{item.description}</p></div><button className="admin-ghost" disabled={!canWrite} onClick={()=>setEditingProgram({...item})}><SquarePen size={16}/> UBAH</button></div>)}</div><p className="admin-footnote">Daftar menampilkan program aktif dan nonaktif ketika backend admin sudah terhubung. Program dengan status nonaktif tetap tersimpan di Sheets, tetapi tidak tampil di website publik.</p></section>}
      {tab === "gallery" && <section className="admin-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">EDIT / IMAGE LIBRARY</span><h2>Galeri Kegiatan</h2></div><button className="admin-primary" disabled={!canWrite} onClick={()=>setEditingGallery({...blankGallery,id:`gallery-${Date.now()}`,order:gallery.length+1})}><Plus size={18}/> TAMBAH FOTO</button></div><div className="admin-gallery-list">{gallery.map(item=><div className="admin-gallery-tile" key={item.id}><div className="admin-gallery-thumb"><SafeMediaImage src={item.image_url} alt={`Foto ${item.title}`} showDriveLink/></div><div><small>{item.category} · {item.published ? "PUBLIK" : "DRAFT"}</small><h3>{item.title}</h3></div><button className="admin-ghost" disabled={!canWrite} onClick={()=>setEditingGallery({...item})}><SquarePen size={16}/> UBAH</button></div>)}</div><p className="admin-footnote">Foto baru diunggah dari komputer ke folder Google Drive khusus website ini.</p></section>}
    </main>
    {editingJob && <div className="admin-modal-backdrop" role="presentation"><div className="admin-modal" role="dialog" aria-modal="true" aria-label="Edit lowongan"><div className="admin-modal-head"><h2>Kelola Lowongan</h2><button type="button" onClick={()=>setEditingJob(null)} aria-label="Tutup"><X size={23}/></button></div><form onSubmit={async e=>{e.preventDefault();const ok=await save("upsert_job",editingJob);if(ok){setJobs(old=>[...old.filter(x=>x.id!==editingJob.id),editingJob].sort((a,b)=>a.order-b.order));setEditingJob(null);}}}><div className="admin-form-grid">{(["title","country","category"] as const).map(k=><label className="admin-field" key={k}><span>{k==="title"?"JUDUL POSISI":k==="country"?"NEGARA":"BIDANG"}</span><input required maxLength={k==="title"?160:100} value={editingJob[k]} onChange={e=>setEditingJob(s=>s&&({...s,[k]:e.target.value}))}/></label>)}<label className="admin-field wide"><span>RINGKASAN POSISI</span><textarea rows={4} required maxLength={600} value={editingJob.summary} onChange={e=>setEditingJob(s=>s&&({...s,summary:e.target.value}))}/></label><label className="admin-field wide"><span>FOTO LOWONGAN — UPLOAD KE GOOGLE DRIVE</span><input type="file" accept="image/jpeg,image/png,image/webp" disabled={working} onChange={e=>{const file=e.currentTarget.files?.[0];if(file) void uploadImage(file,"job");}}/>{editingJob.image_url&&<SafeMediaImage className="admin-upload-preview" src={editingJob.image_url} alt="Pratinjau foto lowongan" showDriveLink/>}</label><label className="admin-field"><span>URUTAN</span><input type="number" min="0" max="9999" value={editingJob.order} onChange={e=>setEditingJob(s=>s&&({...s,order:Number(e.target.value)}))}/></label><label className="admin-checkbox"><input type="checkbox" checked={editingJob.published} onChange={e=>setEditingJob(s=>s&&({...s,published:e.target.checked}))}/> Publikasikan lowongan</label></div><button className="admin-primary admin-save-full" disabled={!canWrite||working}><Save size={17}/> SIMPAN LOWONGAN</button></form></div></div>}
      {editingProgram && <div className="admin-modal-backdrop" role="presentation"><div className="admin-modal" role="dialog" aria-modal="true" aria-label="Edit program"><div className="admin-modal-head"><h2>Kelola Program</h2><button onClick={()=>setEditingProgram(null)} aria-label="Tutup"><X size={23}/></button></div><form onSubmit={async e=>{e.preventDefault();const ok=await save("upsert_program",editingProgram);if(ok){setPrograms(old=>[...old.filter(x=>x.id!==editingProgram.id),editingProgram].sort((a,b)=>a.order-b.order));setEditingProgram(null);}}}><div className="admin-form-grid">{(["title","category","duration"] as const).map(k=><label className="admin-field" key={k}><span>{k.toUpperCase()}</span><input required={k==="title"} value={editingProgram[k]} onChange={e=>setEditingProgram(s=>s&&({...s,[k]:e.target.value}))}/></label>)}<label className="admin-field wide"><span>FOTO PROGRAM — UPLOAD KE GOOGLE DRIVE</span><input type="file" accept="image/jpeg,image/png,image/webp" disabled={working} onChange={e=>{const file=e.currentTarget.files?.[0];if(file) void uploadImage(file,"program");}}/>{editingProgram.image_url&&<SafeMediaImage className="admin-upload-preview" src={editingProgram.image_url} alt="Pratinjau foto program" showDriveLink/>}</label><label className="admin-field wide"><span>DESKRIPSI</span><textarea rows={3} maxLength={600} value={editingProgram.description} onChange={e=>setEditingProgram(s=>s&&({...s,description:e.target.value}))}/></label><label className="admin-field"><span>URUTAN</span><input type="number" min="0" max="9999" value={editingProgram.order} onChange={e=>setEditingProgram(s=>s&&({...s,order:Number(e.target.value)}))}/></label><label className="admin-checkbox"><input type="checkbox" checked={editingProgram.published} onChange={e=>setEditingProgram(s=>s&&({...s,published:e.target.checked}))}/> Publikasikan program</label></div><button className="admin-primary admin-save-full" disabled={!canWrite||working}><Save size={17}/> SIMPAN PROGRAM</button></form></div></div>}
    {editingGallery && <div className="admin-modal-backdrop" role="presentation"><div className="admin-modal" role="dialog" aria-modal="true" aria-label="Edit galeri"><div className="admin-modal-head"><h2>Kelola Foto</h2><button onClick={()=>setEditingGallery(null)} aria-label="Tutup"><X size={23}/></button></div><form onSubmit={async e=>{e.preventDefault();const ok=await save("upsert_gallery",editingGallery);if(ok){setGallery(old=>[...old.filter(x=>x.id!==editingGallery.id),editingGallery].sort((a,b)=>a.order-b.order));setEditingGallery(null);}}}><div className="admin-form-grid">{(["title","category"] as const).map(k=><label className="admin-field" key={k}><span>{k.toUpperCase()}</span><input required={k==="title"} value={editingGallery[k]} onChange={e=>setEditingGallery(s=>s&&({...s,[k]:e.target.value}))}/></label>)}<label className="admin-field wide"><span>FOTO GALERI — UPLOAD KE GOOGLE DRIVE</span><input type="file" accept="image/jpeg,image/png,image/webp" disabled={working} onChange={e=>{const file=e.currentTarget.files?.[0];if(file) void uploadImage(file,"gallery");}}/>{editingGallery.image_url&&<SafeMediaImage className="admin-upload-preview" src={editingGallery.image_url} alt="Pratinjau foto galeri" showDriveLink/>}</label><label className="admin-field"><span>URUTAN</span><input type="number" min="0" max="9999" value={editingGallery.order} onChange={e=>setEditingGallery(s=>s&&({...s,order:Number(e.target.value)}))}/></label><label className="admin-checkbox"><input type="checkbox" checked={editingGallery.published} onChange={e=>setEditingGallery(s=>s&&({...s,published:e.target.checked}))}/> Publikasikan foto</label></div><button className="admin-primary admin-save-full" disabled={!canWrite||working}><Save size={17}/> SIMPAN FOTO</button></form></div></div>}
  </div>;
}
