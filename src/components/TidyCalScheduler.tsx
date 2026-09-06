import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  bookerTimezone,
  createBooking,
  fetchBookingTypes,
  fetchTimeslots,
  formatDayLabel,
  formatTimeLabel,
  localDayKey,
  resolveBookingType,
  shortTimezone,
  timeslotWindow,
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

/**
 * Custom booking widget backed by the TidyCal REST API (via the /api/tidycal.php
 * proxy) — not an iframe. Loads availability, lets the visitor pick a slot, and
 * creates the booking through the API.
 */
export function TidyCalScheduler({ bookingTypeId, path, className }: Props) {
  const [status, setStatus] = useState<Status>("loading");
  const [mock, setMock] = useState(false);
  const [bookingType, setBookingType] = useState<TidyCalBookingType | null>(null);
  const [slots, setSlots] = useState<TidyCalSlot[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<TidyCalBooking | null>(null);
  const tz = useRef(bookerTimezone());

  const loadSlots = async (typeId: number) => {
    const { startsAt, endsAt } = timeslotWindow(35);
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
        const firstDay = list.length ? localDayKey(list[0].starts_at) : null;
        setSelectedDay(firstDay);
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

  const days = useMemo(() => {
    const map = new Map<string, TidyCalSlot[]>();
    for (const s of slots) {
      const key = localDayKey(s.starts_at);
      const bucket = map.get(key);
      if (bucket) bucket.push(s);
      else map.set(key, [s]);
    }
    return Array.from(map.entries()).sort(([a], [b]) => (a < b ? -1 : 1));
  }, [slots]);

  const daySlots = useMemo(
    () => days.find(([key]) => key === selectedDay)?.[1] ?? [],
    [days, selectedDay],
  );

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

  const hostedUrl = tidycalUrl(path) || bookingType?.url || "";

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
        <p className="tc-kicker">Booked</p>
        <h3 className="tc-title">You’re on the calendar.</h3>
        <p className="tc-when">
          {formatDayLabel(confirmation.starts_at)} · {formatTimeLabel(confirmation.starts_at)} ({shortTimezone()})
        </p>
        <p className="tc-muted">
          {bookingType?.title} — a confirmation is on its way to {email || confirmation.contact?.email}.
        </p>
        {confirmation.meeting_url ? (
          <a className="btn btn-primary" href={confirmation.meeting_url} target="_blank" rel="noreferrer">
            Join link
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`tc ${className ?? ""}`.trim()}>
      <div className="tc-head">
        <div>
          <p className="tc-kicker">{bookingType?.title ?? "Book a call"}</p>
          <p className="tc-muted">
            {bookingType?.duration_minutes ? `${bookingType.duration_minutes} min` : "Pick a time"} · times in {shortTimezone()}
          </p>
        </div>
        {mock ? <span className="tc-badge" title="Add your TidyCal token to go live">Preview times</span> : null}
      </div>

      {days.length === 0 ? (
        <p className="tc-muted">No open times in the next few weeks.{hostedUrl ? " " : ""}
          {hostedUrl ? (
            <a href={hostedUrl} target="_blank" rel="noreferrer">See the full calendar →</a>
          ) : null}
        </p>
      ) : (
        <>
          <div className="tc-days" role="tablist" aria-label="Available days">
            {days.map(([key, list]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={key === selectedDay}
                className={`tc-day ${key === selectedDay ? "is-active" : ""}`}
                onClick={() => {
                  setSelectedDay(key);
                  setSelectedSlot(null);
                }}
              >
                {formatDayLabel(list[0].starts_at)}
              </button>
            ))}
          </div>

          <div className="tc-times">
            {daySlots.map((s) => (
              <button
                key={s.starts_at}
                type="button"
                className={`tc-time ${selectedSlot === s.starts_at ? "is-active" : ""}`}
                onClick={() => {
                  setSelectedSlot(s.starts_at);
                  setError("");
                }}
              >
                {formatTimeLabel(s.starts_at)}
              </button>
            ))}
          </div>

          {selectedSlot ? (
            <form className="tc-form" onSubmit={(e) => void onSubmit(e)}>
              <p className="tc-selected">
                {formatDayLabel(selectedSlot)} · {formatTimeLabel(selectedSlot)} ({shortTimezone()})
              </p>
              <label>
                <span className="sr-only">Your name</span>
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
                <span className="sr-only">Email</span>
                <input
                  type="email"
                  placeholder="you@company.com"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              {error ? <p className="tc-error">{error}</p> : null}
              <button className="btn btn-primary" type="submit" disabled={submitting}>
                {submitting ? "Booking…" : "Confirm booking"}
              </button>
            </form>
          ) : (
            error && <p className="tc-error">{error}</p>
          )}
        </>
      )}
    </div>
  );
}
