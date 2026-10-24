"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";

type GIS = { accounts: { id: { initialize: (opts: { client_id: string; nonce: string; callback: (r: { credential: string }) => void; ux_mode: "popup" }) => void; renderButton: (el: HTMLElement, options: Record<string, string>) => void } } };
declare global { interface Window { google?: GIS } }

export default function GoogleLogin({ clientId }: { clientId: string }) {
  const holder = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [waiting, setWaiting] = useState(false);

  const initialize = useCallback(async () => {
    if (!window.google || !clientId || !holder.current || ready) return;
    try {
      const response = await fetch("/api/admin/nonce", { cache: "no-store" });
      const { nonce } = await response.json() as { nonce: string };
      if (!nonce) throw new Error("Tidak dapat membuat sesi login.");
      window.google.accounts.id.initialize({
        client_id: clientId, nonce, ux_mode: "popup",
        callback: async ({ credential }) => {
          setWaiting(true); setError("");
          try {
            const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ credential }) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? "Login gagal.");
            window.location.replace("/admin");
          } catch (err) { setError(err instanceof Error ? err.message : "Login gagal."); setWaiting(false); }
        },
      });
      holder.current.replaceChildren();
      window.google.accounts.id.renderButton(holder.current, { theme: "filled_black", size: "large", text: "signin_with", shape: "pill", width: "270", login_hint: "kastriva01@gmail.com" });
      setReady(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Tidak dapat memulai login Google."); }
  }, [clientId, ready]);

  useEffect(() => { void initialize(); }, [initialize]);

  return <div className="admin-login-page"><Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onLoad={() => { void initialize(); }} />
    <div className="admin-login-card">
      <div className="admin-brand"><span className="admin-monogram">S<span>.</span></span><div><b>SYNERGY</b><small>INDO CORPORA</small></div></div>
      <span className="admin-eyebrow">SECURE CONTENT MANAGEMENT</span>
      <h1>THE CONTROL<br/><em>ROOM.</em></h1>
      <p>Kelola cerita, program pelatihan, dan dokumentasi perusahaan dari satu dashboard. Hanya akun Google admin yang disetujui yang dapat masuk.</p>
      <div className="admin-login-button">{clientId ? <div ref={holder} /> : <p className="admin-warning">GOOGLE_CLIENT_ID belum dikonfigurasi pada server.</p>}</div>
      {waiting && <p className="admin-muted">Memverifikasi akun dengan Google...</p>}
      {error && <p role="alert" className="admin-error">{error}</p>}
      <div className="admin-login-foot"><span>PRIVATE ACCESS ONLY</span><a href="/">← KEMBALI KE WEBSITE</a></div>
    </div>
    <span className="admin-built">CRAFTED BY KASTRIVA</span>
  </div>;
}
