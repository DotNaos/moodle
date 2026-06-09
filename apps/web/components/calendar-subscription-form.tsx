"use client";

import { ArrowUpRight, Check, Link2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { readStoredCalendarUrl } from "@/lib/calendar-storage";
import {
  isLikelyCalendarUrl,
  loadCalendarSubscription,
  resolveFhgrCalendarHelpUrl,
  saveCalendarSubscription,
} from "@/lib/calendar-subscription";
import { getErrorMessage } from "@/lib/moodle-api";
import { cn } from "@/lib/utils";

const FHGR_HELP_URL = resolveFhgrCalendarHelpUrl();

export function CalendarSubscriptionSettings({
  onSaved,
}: {
  onSaved: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    setConfigured(Boolean(readStoredCalendarUrl()));
  }, [open]);

  return (
    <>
      <Button
        aria-label="Kalender verbinden"
        className="relative"
        size="icon-sm"
        type="button"
        variant="ghost"
        onClick={() => setOpen(true)}
      >
        <Link2 aria-hidden />
        {configured ? (
          <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-emerald-500" aria-hidden />
        ) : null}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-5 sm:max-w-lg">
          <DialogHeader className="gap-3 pr-8">
            <DialogTitle>Schulkalender verbinden</DialogTitle>
            <p className="text-sm leading-relaxed text-muted-foreground">
              iCal-URL aus dem FHGR-Portal einfügen. Wird nur lokal gespeichert und zum Laden der Termine verwendet.
            </p>
          </DialogHeader>

          <a
            className="inline-flex w-fit items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-sm font-medium transition-colors hover:bg-secondary/80"
            href={FHGR_HELP_URL}
            rel="noopener noreferrer"
            target="_blank"
          >
            iCal-URL auf my.fhgr.ch finden
            <ArrowUpRight className="size-3.5" aria-hidden />
          </a>

          <CalendarSubscriptionForm
            onConfiguredChange={setConfigured}
            onSaved={async () => {
              await onSaved();
              setOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

export function CalendarSubscriptionForm({
  onSaved,
  onConfiguredChange,
}: {
  onSaved: () => Promise<void> | void;
  onConfiguredChange?: (configured: boolean) => void;
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
      const isConfigured = state.configured || Boolean(storedUrl);
      setConfigured(isConfigured);
      onConfiguredChange?.(isConfigured);
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
      onConfiguredChange?.(state.configured);
      await onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const saveLabel = configured ? "Aktualisieren" : "Speichern";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Input
          autoCapitalize="none"
          autoCorrect="off"
          className="min-w-0 flex-1"
          disabled={loading || saving}
          placeholder="https://my.fhgr.ch/ics/.../basic.ics"
          spellCheck={false}
          type="url"
          value={calendarUrl}
          onChange={(event) => setCalendarUrl(event.target.value)}
        />
        <Button
          aria-label={saveLabel}
          className="h-11 shrink-0 rounded-full px-4"
          disabled={loading || saving || calendarUrl.trim().length === 0}
          type="button"
          onClick={() => void handleSave()}
        >
          {saving ? <Spinner aria-hidden className="size-4" /> : <Check aria-hidden className="size-4" />}
          <span className="hidden sm:inline">{saveLabel}</span>
        </Button>
      </div>

      {loading ? (
        <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <Spinner aria-hidden className="size-3.5" />
          Wird geladen
        </p>
      ) : null}
      {error ? <Alert>{error}</Alert> : null}
      {!loading && !error && configured ? (
        <p className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
          <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
          Verbunden
        </p>
      ) : null}
    </div>
  );
}
