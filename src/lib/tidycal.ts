export type TidyCalLocation = {
  location_link_source?: string;
  location_option?: string;
};

export type TidyCalBookingType = {
  id: number;
  title: string;
  duration_minutes: number;
  description?: string;
  price?: number;
  currency_code?: string;
  url?: string;
  url_slug?: string;
  booking_page_url?: string;
  locations?: TidyCalLocation[];
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
  location?: string;
  contact?: { name?: string; email?: string; phone_number?: string };
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
  phone: string;
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
      phone: input.phone,
      timezone: input.timezone,
    }),
  });
}

/** Describe the meeting method from the booking type's configured locations. */
export function meetingLabel(type: TidyCalBookingType | null): string {
  const src = type?.locations?.find((l) => l.location_link_source)?.location_link_source;
  switch (src) {
    case "google_meet":
      return "Google Meet";
    case "zoom":
      return "Zoom";
    case "ms_teams":
      return "Microsoft Teams";
    default:
      return "Video call";
  }
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

/** Full, human date heading for the selected day, e.g. "Wednesday, September 9". */
export function formatLongDayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export type CalendarCell = { key: string; date: Date; inMonth: boolean; iso: string };

/** Build a Monday-first month grid (6 weeks) for a Calendly-style date picker. */
export function monthMatrix(year: number, month: number): CalendarCell[] {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday = 0
  const start = new Date(year, month, 1 - startOffset);
  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    cells.push({ key, date: d, inMonth: d.getMonth() === month, iso: d.toISOString() });
  }
  return cells;
}

export const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function shortTimezone(): string {
  try {
    const parts = new Intl.DateTimeFormat(undefined, { timeZoneName: "short" }).formatToParts(new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value || bookerTimezone();
  } catch {
    return bookerTimezone();
  }
}
