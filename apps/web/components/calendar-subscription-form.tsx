"use client";

import { Link2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { readStoredCalendarUrl } from "@/lib/calendar-storage";
import {
  isLikelyCalendarUrl,
  loadCalendarSubscription,
  saveCalendarSubscription,
} from "@/lib/calendar-subscription";
import { getErrorMessage } from "@/lib/moodle-api";

export function CalendarSubscriptionForm({
  onSaved,
}: {
  onSaved: () => Promise<void> | void;
}) {
  const [calendarUrl, setCalendarUrl] = useState("");
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadSubscription();
  }, []);

  async function loadSubscription() {
    setLoading(true);
    setError(null);
    try {
      const storedUrl = readStoredCalendarUrl();
      if (storedUrl) {
        setCalendarUrl(storedUrl);
      }
      const state = await loadCalendarSubscription();
      setConfigured(state.configured || Boolean(storedUrl));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    const nextUrl = calendarUrl.trim();
    if (!isLikelyCalendarUrl(nextUrl)) {
      setError("Bitte eine gültige http(s)-Kalender-URL eingeben.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const state = await saveCalendarSubscription(nextUrl);
      setConfigured(state.configured);
      await onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-3xl bg-secondary/50 p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-background">
          <Link2 aria-hidden className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">FHGR-Kalender verbinden</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Füge hier deine persönliche iCal-URL von der Schule ein. Sie wird verschlüsselt gespeichert und nur zum
            Laden deiner Termine verwendet.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <Input
          autoCapitalize="none"
          autoCorrect="off"
          disabled={loading || saving}
          placeholder="https://my.fhgr.ch/ics/.../basic.ics"
          spellCheck={false}
          type="url"
          value={calendarUrl}
          onChange={(event) => setCalendarUrl(event.target.value)}
        />
        <Button
          className="shrink-0 rounded-full px-5"
          disabled={loading || saving || calendarUrl.trim().length === 0}
          type="button"
          onClick={() => void handleSave()}
        >
          {saving ? <Spinner aria-hidden /> : null}
          {configured ? "Aktualisieren" : "Speichern"}
        </Button>
      </div>

      {loading ? (
        <p className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner aria-hidden />
          Kalender-Einstellungen werden geladen
        </p>
      ) : null}
      {error ? (
        <Alert className="mt-3">{error}</Alert>
      ) : configured ? (
        <p className="mt-3 text-sm text-muted-foreground">Kalender verbunden. Termine werden automatisch geladen.</p>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Noch kein Kalender hinterlegt.</p>
      )}
    </section>
  );
}
