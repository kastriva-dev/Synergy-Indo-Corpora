"use client";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

type Job = { id:string; slug:string; title:string; country:string; category:string; summary:string; description:string; requirements:string; application_deadline:string|null; is_published:boolean };
type Application = { id:string; full_name:string; phone:string|null; email:string|null; target_country:string|null; job_title_snapshot:string|null; status:string; cv_original_name:string|null; created_at:string; retention_due_at:string|null };
type JobForm = { title:string; country:string; category:string; summary:string; description:string; requirements:string; application_deadline:string; is_published:boolean };
const emptyJob: JobForm = { title:"", country:"", category:"", summary:"", description:"", requirements:"", application_deadline:"", is_published:false };
const statuses = [["received","Masuk"],["reviewing","Ditinjau"],["shortlisted","Kandidat lanjutan"],["rejected","Ditolak"],["hired","Diterima"]];

async function readJson(response: Response): Promise<Record<string, unknown>> { return response.json().catch(() => ({} as Record<string, unknown>)); }

export default function RecruitmentAdmin() {
  const [tab,setTab] = useState<"jobs"|"applications">("applications");
  const [jobs,setJobs] = useState<Job[]>([]);
  const [applications,setApplications] = useState<Application[]>([]);
  const [jobForm,setJobForm] = useState<JobForm>(emptyJob);
  const [editingJobId,setEditingJobId] = useState("");
  const [busy,setBusy] = useState(false);
  const [notice,setNotice] = useState("");
  const [failure,setFailure] = useState("");
  const [filter,setFilter] = useState("all");

  async function loadJobs() {
    const response = await fetch("/api/admin/recruitment/jobs",{cache:"no-store"});
    const data = await readJson(response);
    if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Lowongan tidak dapat dimuat.");
    setJobs(Array.isArray(data.jobs) ? data.jobs as Job[] : []);
  }
  async function loadApplications() {
    const url = filter === "all" ? "/api/admin/recruitment/applications" : "/api/admin/recruitment/applications?status=" + encodeURIComponent(filter);
    const response = await fetch(url,{cache:"no-store"});
    const data = await readJson(response);
    if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Data kandidat tidak dapat dimuat.");
    setApplications(Array.isArray(data.applications) ? data.applications as Application[] : []);
  }
  async function refreshAll() {
    setFailure("");
    try { await Promise.all([loadJobs(),loadApplications()]); }
    catch (error) { setFailure(error instanceof Error ? error.message : "Data rekrutmen belum dapat dimuat."); }
  }
  useEffect(() => { void refreshAll(); }, [filter]);

  async function saveJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice(""); setFailure("");
    try {
      const response = await fetch(editingJobId ? "/api/admin/recruitment/jobs/" + encodeURIComponent(editingJobId) : "/api/admin/recruitment/jobs",{
        method:editingJobId ? "PATCH" : "POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({...jobForm,application_deadline:jobForm.application_deadline || null}),
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Lowongan gagal disimpan.");
      setNotice("Lowongan tersimpan.");setJobForm(emptyJob);setEditingJobId("");await loadJobs();
    } catch (error) { setFailure(error instanceof Error ? error.message : "Lowongan gagal disimpan."); }
    finally { setBusy(false); }
  }
  async function changeStatus(application: Application,status: string) {
    setBusy(true);setNotice("");setFailure("");
    try {
      const response = await fetch("/api/admin/recruitment/applications/" + encodeURIComponent(application.id),{
        method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status}),
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Status tidak dapat diperbarui.");
      setNotice("Status lamaran diperbarui.");await loadApplications();
    } catch (error) { setFailure(error instanceof Error ? error.message : "Status tidak dapat diperbarui."); }
    finally { setBusy(false); }
  }
  async function eraseApplication(application: Application) {
    if (!window.confirm("Hapus CV dan anonimisasi data kandidat ini? Tindakan ini tidak dapat dibatalkan.")) return;
    setBusy(true);setNotice("");setFailure("");
    try {
      const response = await fetch("/api/admin/recruitment/applications/" + encodeURIComponent(application.id),{method:"DELETE"});
      const data = await readJson(response);
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Penghapusan belum selesai.");
      setNotice("CV dihapus dan data kandidat dianonimkan.");await loadApplications();
    } catch (error) { setFailure(error instanceof Error ? error.message : "Penghapusan belum selesai."); }
    finally { setBusy(false); }
  }
  function editJob(job: Job) {
    setEditingJobId(job.id);
    setJobForm({title:job.title,country:job.country,category:job.category,summary:job.summary,description:job.description,requirements:job.requirements,application_deadline:job.application_deadline || "",is_published:job.is_published});
    setTab("jobs");
  }

  return <div className="admin-app">
    <aside className="admin-sidebar">
      <a href="/" className="admin-brand"><span className="admin-monogram">SG<span>.</span></span><div><b>SINERGI GLOBAL</b><small>RECRUITMENT ADMIN</small></div></a>
      <div className="sidebar-caption">RECRUITMENT CONTROL</div>
      <nav aria-label="Menu rekrutmen">
        <button type="button" className={"admin-nav-link " + (tab==="applications" ? "selected" : "")} onClick={() => setTab("applications")}>Pelamar</button>
        <button type="button" className={"admin-nav-link " + (tab==="jobs" ? "selected" : "")} onClick={() => setTab("jobs")}>Lowongan</button>
        <a className="admin-nav-link" href="/admin">Kembali ke CMS</a>
      </nav>
      <div className="sidebar-bottom"><button type="button" className="admin-nav-link" onClick={() => { void fetch("/api/admin/logout",{method:"POST"}).finally(() => window.location.replace("/admin/login")); }}>Keluar</button></div>
    </aside>
    <main className="admin-main">
      <div className="admin-topbar"><span>SINERGI GLOBAL / RECRUITMENT</span><a href="/" target="_blank" rel="noreferrer">LIHAT WEBSITE</a></div>
      <header className="admin-main-head"><span className="admin-eyebrow">RECRUITMENT OPERATIONS</span><h1>{tab==="applications" ? "MANAJEMEN PELAMAR" : "PENGELOLAAN LOWONGAN"}<em>.</em></h1><p>Data kandidat dan CV tersimpan pada backend privat. Unduh CV hanya jika diperlukan untuk peninjauan.</p></header>
      <div className="admin-status"><span>{jobs.length} lowongan tersimpan · {applications.length} lamaran pada daftar ini</span></div>
      {notice && <div className="admin-alert success" role="status">{notice}</div>}
      {failure && <div className="admin-alert danger" role="alert">{failure}</div>}

      {tab==="applications" && <section className="admin-panel">
        <div className="admin-panel-head"><div><span className="admin-eyebrow">CANDIDATE PIPELINE</span><h2>Daftar Lamaran</h2></div>
          <label className="admin-field"><span>Status</span><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">Semua status</option>{statuses.map(([value,label]) => <option key={value} value={value}>{label}</option>)}<option value="deleted">Dianonimkan</option></select></label>
        </div>
        {applications.length===0 ? <p className="admin-footnote">Belum ada lamaran pada filter ini, atau backend belum siap. Periksa pesan di atas.</p> :
          <div className="admin-card-list">{applications.map((app) => <article className="admin-list-item" key={app.id}>
            <div className="admin-list-description"><span>{new Date(app.created_at).toLocaleString("id-ID")} · {app.target_country || "Negara belum diisi"}</span><h3>{app.full_name}</h3>
              <p>{app.job_title_snapshot || "Posisi tidak tersedia"} · {app.phone || "Tanpa telepon"} · {app.email || "Tanpa email"}</p><p>Masa retensi: {app.retention_due_at || "Tidak tersedia"}</p>
              {app.status!=="deleted" && <a className="admin-ghost" href={"/api/admin/recruitment/applications/" + encodeURIComponent(app.id) + "/cv"}>Unduh CV PDF</a>}
            </div>
            <div className="admin-form-actions"><label className="admin-field"><span>Proses</span><select disabled={busy || app.status==="deleted"} value={app.status} onChange={(event) => void changeStatus(app,event.target.value)}>{statuses.map(([value,label]) => <option key={value} value={value}>{label}</option>)}{app.status==="deleted" && <option value="deleted">Dianonimkan</option>}</select></label>
              <button type="button" className="admin-ghost" disabled={busy || app.status==="deleted"} onClick={() => void eraseApplication(app)}>Hapus & anonimisasi</button></div>
          </article>)}</div>}
      </section>}

      {tab==="jobs" && <section className="admin-panel">
        <div className="admin-panel-head"><div><span className="admin-eyebrow">VERIFIED OPENINGS</span><h2>{editingJobId ? "Ubah Lowongan" : "Buat Lowongan"}</h2></div>
          <button type="button" className="admin-ghost" onClick={() => {setEditingJobId("");setJobForm(emptyJob);}}>Form baru</button></div>
        <form onSubmit={saveJob}><div className="admin-form-grid">
          <label className="admin-field"><span>Judul posisi</span><input maxLength={160} required value={jobForm.title} onChange={(e) => setJobForm((old) => ({...old,title:e.target.value}))}/></label>
          <label className="admin-field"><span>Negara</span><input maxLength={100} required value={jobForm.country} onChange={(e) => setJobForm((old) => ({...old,country:e.target.value}))}/></label>
          <label className="admin-field"><span>Bidang</span><input maxLength={80} required value={jobForm.category} onChange={(e) => setJobForm((old) => ({...old,category:e.target.value}))}/></label>
          <label className="admin-field"><span>Ringkasan</span><input maxLength={400} required value={jobForm.summary} onChange={(e) => setJobForm((old) => ({...old,summary:e.target.value}))}/></label>
          <label className="admin-field wide"><span>Deskripsi pekerjaan</span><textarea rows={4} maxLength={4000} required value={jobForm.description} onChange={(e) => setJobForm((old) => ({...old,description:e.target.value}))}/></label>
          <label className="admin-field wide"><span>Persyaratan</span><textarea rows={4} maxLength={4000} required value={jobForm.requirements} onChange={(e) => setJobForm((old) => ({...old,requirements:e.target.value}))}/></label>
          <label className="admin-field"><span>Batas akhir lamaran</span><input type="date" value={jobForm.application_deadline} onChange={(e) => setJobForm((old) => ({...old,application_deadline:e.target.value}))}/></label>
          <label className="admin-checkbox"><input type="checkbox" checked={jobForm.is_published} onChange={(e) => setJobForm((old) => ({...old,is_published:e.target.checked}))}/> Publikasikan lowongan</label>
        </div><div className="admin-form-actions"><span>Publikasi wajib memakai lowongan resmi yang disetujui perusahaan.</span><button type="submit" className="admin-primary" disabled={busy}>{busy ? "MENYIMPAN..." : "SIMPAN LOWONGAN"}</button></div></form>
        <div className="admin-card-list">{jobs.map((job) => <article className="admin-list-item" key={job.id}><div className="admin-list-description"><span>{job.country} · {job.category} · {job.is_published ? "PUBLIK" : "DRAFT"}</span><h3>{job.title}</h3><p>{job.summary}</p></div><button type="button" className="admin-ghost" disabled={busy} onClick={() => editJob(job)}>Ubah</button></article>)}</div>
      </section>}
    </main>
  </div>;
}
