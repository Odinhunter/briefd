import { Redis } from "@upstash/redis";

const kv = new Redis({
  url: process.env.getbriefd_KV_REST_API_URL!,
  token: process.env.getbriefd_KV_REST_API_TOKEN!,
});

export type Interests = {
  description: string;
  keywords: string[];
  updatedAt: string;
};

const KEY = "briefd:interests";
const SEEN_URLS_KEY = "briefd:seen-urls";

const EMPTY: Interests = {
  description: "",
  keywords: [],
  updatedAt: new Date(0).toISOString(),
};

export async function getInterests(): Promise<Interests> {
  const data = await kv.get<Interests>(KEY);
  return data ?? EMPTY;
}

const SEEN_URLS_TTL = 60 * 60 * 24; // 24 hours

export async function getSeenUrls(): Promise<string[]> {
  const data = await kv.get<string[]>(SEEN_URLS_KEY);
  return data ?? [];
}

export async function markUrlsSeen(urls: string[]): Promise<void> {
  if (!urls.length) return;
  const existing = await getSeenUrls();
  const merged = Array.from(new Set([...existing, ...urls]));
  await kv.set(SEEN_URLS_KEY, merged, { ex: SEEN_URLS_TTL });
}

export async function saveInterests(
  input: Pick<Interests, "description" | "keywords">
): Promise<Interests> {
  const next: Interests = {
    description: input.description.trim(),
    keywords: input.keywords
      .map((k) => k.trim())
      .filter((k) => k.length > 0),
    updatedAt: new Date().toISOString(),
  };
  await kv.set(KEY, next);
  return next;
}
