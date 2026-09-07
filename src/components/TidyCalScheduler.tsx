import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  bookerTimezone,
  createBooking,
  fetchBookingTypes,
  fetchTimeslots,
  formatLongDayLabel,
  formatTimeLabel,
  localDayKey,
  meetingLabel,
  monthMatrix,
  resolveBookingType,
  shortTimezone,
  timeslotWindow,
  MONTH_LABELS,
  WEEKDAY_LABELS,
  type TidyCalBooking,
  type TidyCalBookingType,
  type TidyCalSlot,
} from "../lib/tidycal";
import { tidycalUrl } from "../lib/api";

type Status = "loading" | "ready" | "error";

type Props = {
  bookingTypeId?: number;
  path?: string;
  className?: string;
};

const VIDEO_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      fill="currentColor"
      d="M4 5h11a2 2 0 0 1 2 2v2.2l4.3-2.6a.6.6 0 0 1 .9.5v9.8a.6.6 0 0 1-.9.5L17 14.8V17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
    />
  </svg>
);

function plainText(html?: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Custom booking widget backed by the TidyCal REST API (via the /api/tidycal.php
 * proxy) — not an iframe. Event info in a header, a compact month picker, then
 * the selected day's times in a full-width grid, then a details form.
 */
export function TidyCalScheduler({ bookingTypeId, path, className }: Props) {
  const [status, setStatus] = useState<Status>("loading");
  const [mock, setMock] = useState(false);
  const [bookingType, setBookingType] = useState<TidyCalBookingType | null>(null);
  const [slots, setSlots] = useState<TidyCalSlot[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [view, setView] = useState<{ year: number; month: number }>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<TidyCalBooking | null>(null);
  const tz = useRef(bookerTimezone());

  const loadSlots = async (typeId: number) => {
    const { startsAt, endsAt } = timeslotWindow(60);
    const res = await fetchTimeslots(typeId, startsAt, endsAt);
    const list = Array.isArray(res.data) ? res.data.filter((s) => s.available_bookings > 0) : [];
    setSlots(list);
    return list;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const typesRes = await fetchBookingTypes();
        if (!typesRes.ok) throw new Error(typesRes.error || "Unable to load availability");
        if (typesRes.mock) setMock(true);
        const type = resolveBookingType(typesRes.data, { id: bookingTypeId, path });
        if (!type) throw new Error("No booking type available");
        if (cancelled) return;
        setBookingType(type);
        const list = await loadSlots(type.id);
        if (cancelled) return;
        if (list.length) {
          const firstIso = list[0].starts_at;
          const first = new Date(firstIso);
          setView({ year: first.getFullYear(), month: first.getMonth() });
          setSelectedDay(localDayKey(firstIso));
        }
        setStatus("ready");
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load availability");
          setStatus("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingTypeId, path]);

  const dayMap = useMemo(() => {
    const map = new Map<string, TidyCalSlot[]>();
    for (const s of slots) {
      const key = localDayKey(s.starts_at);
      const bucket = map.get(key);
      if (bucket) bucket.push(s);
      else map.set(key, [s]);
    }
    return map;
  }, [slots]);

  const daySlots = useMemo(
    () => (selectedDay ? dayMap.get(selectedDay) ?? [] : []),
    [dayMap, selectedDay],
  );

  const cells = useMemo(() => monthMatrix(view.year, view.month), [view]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!bookingType || !selectedSlot) return;
    setSubmitting(true);
    setError("");
    const res = await createBooking({
      bookingTypeId: bookingType.id,
      startsAt: selectedSlot,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      timezone: tz.current,
    });
    setSubmitting(false);
    if (res.ok && res.data) {
      setConfirmation(res.data);
      return;
    }
    if (res.status === 409) {
      setError(res.error || "That time was just taken. Please pick another slot.");
      setSelectedSlot(null);
      const list = await loadSlots(bookingType.id);
      if (list.length && !list.some((s) => localDayKey(s.starts_at) === selectedDay)) {
        setSelectedDay(localDayKey(list[0].starts_at));
      }
      return;
    }
    setError(res.error || "Could not create the booking.");
  };

  const hostedUrl = tidycalUrl(path) || bookingType?.booking_page_url || bookingType?.url || "";
  const meeting = meetingLabel(bookingType);

  if (status === "loading") {
    return (
      <div className={`tc ${className ?? ""}`.trim()}>
        <p className="tc-muted">Loading available times…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className={`tc ${className ?? ""}`.trim()}>
        <p className="tc-muted">We couldn’t load live availability right now.</p>
        {hostedUrl ? (
          <a className="btn btn-primary" href={hostedUrl} target="_blank" rel="noreferrer">
            Open the booking page
          </a>
        ) : null}
      </div>
    );
  }

  if (confirmation) {
    return (
      <div className={`tc tc-confirmed ${className ?? ""}`.trim()}>
        <div className="tc-check" aria-hidden="true">✓</div>
        <p className="tc-kicker">Booked</p>
        <h3 className="tc-title">You’re on the calendar.</h3>
        <p className="tc-when-line">
          {formatLongDayLabel(confirmation.starts_at)} · {formatTimeLabel(confirmation.starts_at)} ({shortTimezone()})
        </p>
        <p className="tc-muted">
          {bookingType?.title}{confirmation.location ? ` · ${confirmation.location}` : ` · ${meeting}`}. A confirmation is on its way to {email || confirmation.contact?.email}.
        </p>
        {confirmation.meeting_url ? (
          <a className="btn btn-primary" href={confirmation.meeting_url} target="_blank" rel="noreferrer">
            {VIDEO_ICON} Join link
          </a>
        ) : null}
      </div>
    );
  }

  const description = plainText(bookingType?.description);

  return (
    <div className={`tc tc-cal-layout ${className ?? ""}`.trim()}>
      <aside className="tc-info">
        <div className="tc-info-top">
          <p className="tc-kicker">{bookingType?.title ?? "Book a call"}</p>
          <ul className="tc-meta">
            <li>
              <span aria-hidden="true">🕑</span>
              {bookingType?.duration_minutes ? `${bookingType.duration_minutes} min` : "Pick a time"}
            </li>
            <li>
              <span className="tc-video">{VIDEO_ICON}</span>
              {meeting}
            </li>
            <li>
              <span aria-hidden="true">🌐</span>
              {shortTimezone()}
            </li>
          </ul>
        </div>
        {description ? <p className="tc-desc">{description}</p> : null}
        {mock ? <span className="tc-badge" title="Add your TidyCal token to go live">Preview times</span> : null}
      </aside>

      {selectedSlot ? (
        <form className="tc-form" onSubmit={(e) => void onSubmit(e)}>
          <button type="button" className="tc-back" onClick={() => setSelectedSlot(null)}>
            ← Back to times
          </button>
          <p className="tc-selected">
            <strong>{formatLongDayLabel(selectedSlot)}</strong>
            <br />
            {formatTimeLabel(selectedSlot)} ({shortTimezone()}) · {meeting}
          </p>
          <label>
            <span className="tc-label">Name</span>
            <input
              type="text"
              placeholder="Your name"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            <span className="tc-label">Email</span>
            <input
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            <span className="tc-label">Phone</span>
            <input
              type="tel"
              placeholder="+1 (202) 555-0142"
              autoComplete="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
          {error ? <p className="tc-error">{error}</p> : null}
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? "Booking…" : "Confirm booking"}
          </button>
        </form>
      ) : (
        <div className="tc-when">
        <div className="tc-cal">
            <div className="tc-cal-head">
              <button
                type="button"
                className="tc-nav"
                aria-label="Previous month"
                onClick={() =>
                  setView((v) => (v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 }))
                }
              >
                ‹
              </button>
              <span className="tc-cal-title">
                {MONTH_LABELS[view.month]} {view.year}
              </span>
              <button
                type="button"
                className="tc-nav"
                aria-label="Next month"
                onClick={() =>
                  setView((v) => (v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 }))
                }
              >
                ›
              </button>
            </div>
            <div className="tc-weekdays">
              {WEEKDAY_LABELS.map((w) => (
                <span key={w}>{w}</span>
              ))}
            </div>
            <div className="tc-grid">
              {cells.map((cell) => {
                const has = dayMap.has(cell.key);
                const isSelected = cell.key === selectedDay;
                return (
                  <button
                    key={cell.key}
                    type="button"
                    className={`tc-cell ${cell.inMonth ? "" : "is-out"} ${has ? "has-slots" : ""} ${isSelected ? "is-active" : ""}`.trim()}
                    disabled={!has}
                    aria-pressed={isSelected}
                    onClick={() => {
                      setSelectedDay(cell.key);
                      setError("");
                    }}
                  >
                    {cell.date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="tc-slots">
            {selectedDay ? (
              <>
                <p className="tc-slots-head">{formatLongDayLabel(`${selectedDay}T12:00:00`)}</p>
                <div className="tc-times">
                  {daySlots.map((s) => (
                    <button
                      key={s.starts_at}
                      type="button"
                      className="tc-time"
                      onClick={() => {
                        setSelectedSlot(s.starts_at);
                        setError("");
                      }}
                    >
                      {formatTimeLabel(s.starts_at)}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="tc-muted tc-slots-hint">Select a highlighted day to see open times.</p>
            )}
            {dayMap.size === 0 ? (
              <p className="tc-muted">
                No open times in the next few weeks.{" "}
                {hostedUrl ? (
                  <a href={hostedUrl} target="_blank" rel="noreferrer">
                    See the full calendar →
                  </a>
                ) : null}
              </p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
