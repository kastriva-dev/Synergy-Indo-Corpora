import "server-only";
import { firestoreGetDocument, firestoreListDocuments, firestoreSetDocument, isFirebaseConfigured } from "@/lib/firebase/server";

export type CmsSnapshot = {
  site: Record<string, unknown>;
  programs: Record<string, unknown>[];
  gallery: Record<string, unknown>[];
};

function publicItems(records: { id: string; data: Record<string, unknown> }[], includeUnpublished: boolean): Record<string, unknown>[] {
  const items: Record<string, unknown>[] = records.map(record =>
    ({ ...(record.data as Record<string, unknown>), id: record.id }) as Record<string, unknown>
  );
  return items
    .filter((item: Record<string, unknown>) => includeUnpublished || item.published === true)
    .sort((a: Record<string, unknown>, b: Record<string, unknown>) => Number(a.order || 0) - Number(b.order || 0));
}

export async function readCmsSnapshot(includeUnpublished = false): Promise<CmsSnapshot> {
  if (!isFirebaseConfigured()) throw new Error("Firebase has not been configured.");
  const [site, programs, gallery] = await Promise.all([
    firestoreGetDocument("site_content", "public"),
    firestoreListDocuments("programs", 300),
    firestoreListDocuments("gallery", 300),
  ]);
  return {
    site: site?.data || {},
    programs: publicItems(programs, includeUnpublished),
    gallery: publicItems(gallery, includeUnpublished),
  };
}

export async function saveCmsSite(partial: Record<string, unknown>, actorEmail: string): Promise<void> {
  const existing = await firestoreGetDocument("site_content", "public");
  await firestoreSetDocument("site_content", "public", {
    ...(existing?.data || {}),
    ...partial,
    updated_at: new Date().toISOString(),
    updated_by: actorEmail,
  });
}

export async function saveCmsItem(
  collection: "programs" | "gallery",
  item: Record<string, unknown>,
  actorEmail: string,
): Promise<string> {
  const id = typeof item.id === "string" ? item.id : "";
  if (!/^[A-Za-z0-9-]{3,80}$/.test(id)) throw new Error("CMS item identifier is invalid.");
  await firestoreSetDocument(collection, id, {
    ...item,
    id,
    updated_at: new Date().toISOString(),
    updated_by: actorEmail,
  });
  return id;
}
