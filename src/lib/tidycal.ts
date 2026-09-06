export type TidyCalBookingType = {
  id: number;
  title: string;
  duration_minutes: number;
  description?: string;
  price?: number;
  currency_code?: string;
  url?: string;
  url_slug?: string;
};

export type TidyCalSlot = {
  starts_at: string;
  ends_at: string;
  available_bookings: number;
};

export type TidyCalBooking = {
  id: number;
  starts_at: string;
  ends_at: string;
  timezone?: string;
  meeting_url?: string;
  contact?: { name?: string; email?: string };
};

type ApiResult<T> = { ok: boolean; data: T; mock?: boolean; error?: string; status: number };

const ENDPOINT = "/api/tidycal.php";

async function call<T>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
  const res = await fetch(url, init);
  const body = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    data?: T;
    mock?: boolean;
    error?: string;
  };
  return {
    ok: Boolean(body.ok),
    data: (body.data ?? ([] as unknown)) as T,
    mock: body.mock,
    error: body.error,
    status: res.status,
  };
}

/** The visitor's IANA timezone, used to convert/display slots and to book. */
export function bookerTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function fetchBookingTypes() {
  return call<TidyCalBookingType[]>(`${ENDPOINT}?action=booking-types`);
}

export function fetchTimeslots(bookingTypeId: number, startsAt: string, endsAt: string) {
  const qs = new URLSearchParams({
    action: "timeslots",
    booking_type_id: String(bookingTypeId),
    starts_at: startsAt,
    ends_at: endsAt,
  });
  return call<TidyCalSlot[]>(`${ENDPOINT}?${qs.toString()}`);
}

export function createBooking(input: {
  bookingTypeId: number;
  startsAt: string;
  name: string;
  email: string;
  timezone: string;
}) {
  return call<TidyCalBooking | null>(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "book",
      booking_type_id: input.bookingTypeId,
      starts_at: input.startsAt,
      name: input.name,
      email: input.email,
      timezone: input.timezone,
    }),
  });
}

/** Resolve which booking type to use: explicit id, then slug, then the first. */
export function resolveBookingType(
  types: TidyCalBookingType[],
  opts: { id?: number; path?: string },
): TidyCalBookingType | null {
  if (types.length === 0) return null;
  if (opts.id) {
    const byId = types.find((t) => t.id === opts.id);
    if (byId) return byId;
  }
  const slug = opts.path?.split("/").filter(Boolean).pop();
  if (slug) {
    const bySlug = types.find((t) => t.url_slug === slug);
    if (bySlug) return bySlug;
  }
  return types[0];
}

/** ISO window [now, now + days] as UTC strings for the timeslots query. */
export function timeslotWindow(days = 35) {
  const now = new Date();
  const end = new Date(now.getTime() + days * 24 * 3600 * 1000);
  return { startsAt: now.toISOString(), endsAt: end.toISOString() };
}

/** Local YYYY-MM-DD key for grouping UTC slots into the booker's days. */
export function localDayKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatTimeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function shortTimezone(): string {
  try {
    const parts = new Intl.DateTimeFormat(undefined, { timeZoneName: "short" }).formatToParts(new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value || bookerTimezone();
  } catch {
    return bookerTimezone();
  }
}
