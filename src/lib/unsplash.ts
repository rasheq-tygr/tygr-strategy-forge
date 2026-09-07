export type UnsplashPhoto = {
  id: string;
  alt: string;
  thumb: string;
  regular: string;
  credit: string;
  creditUrl: string;
};

type UnsplashSearchResponse = {
  results?: Array<{
    id: string;
    alt_description?: string | null;
    urls?: { thumb?: string; regular?: string };
    user?: { name?: string; links?: { html?: string } };
  }>;
  errors?: string[];
};

export async function searchUnsplash(query: string): Promise<UnsplashPhoto[]> {
  const key = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
  if (!key) {
    throw new Error("Add VITE_UNSPLASH_ACCESS_KEY to .env to search Unsplash.");
  }
  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", "12");
  url.searchParams.set("orientation", "landscape");
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Client-ID ${key}` },
  });
  const data = (await res.json()) as UnsplashSearchResponse;
  if (!res.ok) {
    throw new Error(data.errors?.[0] || "Unsplash search failed");
  }
  return (data.results || []).map((p) => ({
    id: p.id,
    alt: p.alt_description || query,
    thumb: p.urls?.thumb || "",
    regular: p.urls?.regular || "",
    credit: p.user?.name || "Unsplash",
    creditUrl: p.user?.links?.html || "https://unsplash.com",
  }));
}
