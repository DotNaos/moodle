import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import {
    fetchCalendarEvents,
    formatCalendarDateRange,
    getCalendarDayKey,
    mergeConsecutiveCalendarEvents,
    upcomingCalendarEvents,
    type CalendarEvent,
} from '../calendar';
import {
    EmptyState,
    PrimaryButton,
    ScreenSection,
    SecondaryButton,
    TextField,
} from '../components/ui';
import { findEventCourse } from '../courseMatching';
import { CalendarDays, ChevronLeft, ChevronRight, RefreshCw } from '../icons';
import type { MoodleCourse } from '../moodle';
import { loadCalendarUrl, storeCalendarUrl } from '../storage';
import { palette, styles } from '../styles';

type CalendarScreenProps = {
    readonly courses: MoodleCourse[];
    readonly onOpenCourse: (courseId: number) => void;
};

export function CalendarScreen(props: CalendarScreenProps) {
    const [calendarUrl, setCalendarUrl] = useState('');
    const [savedUrl, setSavedUrl] = useState('');
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [selectedDayKey, setSelectedDayKey] = useState(() =>
        localDayKey(new Date()),
    );
    const [visibleMonth, setVisibleMonth] = useState(() =>
        startOfMonth(new Date()),
    );

    useEffect(() => {
        let mounted = true;
        void loadCalendarUrl()
            .then((storedUrl) => {
                if (!mounted) {
                    return;
                }
                if (!storedUrl) {
                    setLoading(false);
                    return;
                }
                setCalendarUrl(storedUrl);
                setSavedUrl(storedUrl);
                return loadEvents(storedUrl);
            })
            .catch((error) => {
                if (mounted) {
                    setErrorMessage(getMessage(error));
                    setLoading(false);
                }
            });

        return () => {
            mounted = false;
        };
    }, []);

    const upcomingEvents = useMemo(
        () => mergeConsecutiveCalendarEvents(upcomingCalendarEvents(events)),
        [events],
    );
    const selectedDayEvents = useMemo(
        () =>
            upcomingEvents.filter(
                (event) => getCalendarDayKey(event.startsAt) === selectedDayKey,
            ),
        [selectedDayKey, upcomingEvents],
    );
    const visibleMonthDays = useMemo(
        () => buildCalendarMonth(visibleMonth, upcomingEvents, selectedDayKey),
        [selectedDayKey, upcomingEvents, visibleMonth],
    );
    const changed = calendarUrl.trim() !== savedUrl.trim();

    useEffect(() => {
        const firstEvent = upcomingEvents[0];
        if (!firstEvent) {
            return;
        }

        const firstEventDayKey = getCalendarDayKey(firstEvent.startsAt);
        if (!upcomingEvents.some((event) => getCalendarDayKey(event.startsAt) === selectedDayKey)) {
            setSelectedDayKey(firstEventDayKey);
            setVisibleMonth(startOfMonth(new Date(firstEvent.startsAt)));
        }
    }, [selectedDayKey, upcomingEvents]);

    async function loadEvents(url = savedUrl) {
        const nextUrl = url.trim();
        if (!nextUrl) {
            setEvents([]);
            setErrorMessage('');
            setLoading(false);
            return;
        }

        setLoading(true);
        setErrorMessage('');
        try {
            const nextEvents = await fetchCalendarEvents(nextUrl);
            setEvents(nextEvents);
        } catch (error) {
            setEvents([]);
            setErrorMessage(getMessage(error));
        } finally {
            setLoading(false);
        }
    }

    async function saveAndReload() {
        const nextUrl = calendarUrl.trim();
        if (!isLikelyCalendarUrl(nextUrl)) {
            setErrorMessage('Enter a valid calendar URL.');
            return;
        }

        setSaving(true);
        setErrorMessage('');
        try {
            await storeCalendarUrl(nextUrl);
            setSavedUrl(nextUrl);
            await loadEvents(nextUrl);
        } finally {
            setSaving(false);
        }
    }

    return (
        <ScrollView contentContainerStyle={styles.scrollContent}>
            <ScreenSection>
                {!savedUrl ? (
                    <View style={styles.calendarHero}>
                    <View style={styles.calendarHeroIcon}>
                        <CalendarDays color={palette.blue} size={24} />
                    </View>
                    <View style={styles.brandCopy}>
                        <Text style={styles.heroLabel}>Schedule</Text>
                        <Text style={styles.heroTitle}>FHGR Calendar</Text>
                        <Text style={styles.heroBody}>
                            Paste your personal FHGR ICS link. The URL stays on
                            this device and the app reads the calendar directly.
                        </Text>
                    </View>
                    </View>
                ) : null}

                {errorMessage ? (
                    <EmptyState
                        title="Calendar unavailable"
                        body={errorMessage}
                        actionLabel="Retry"
                        onPress={() => loadEvents()}
                    />
                ) : null}

                {loading ? (
                    <View style={styles.calendarLoading}>
                        <ActivityIndicator color={palette.text} />
                        <Text style={styles.cardBody}>Loading calendar...</Text>
                    </View>
                ) : null}

                {!loading && !errorMessage && !savedUrl ? (
                    <EmptyState
                        title="No calendar connected"
                        body="Add your personal FHGR calendar link to show your schedule here."
                    />
                ) : null}

                {!loading &&
                !errorMessage &&
                savedUrl &&
                upcomingEvents.length === 0 ? (
                    <EmptyState
                        title="No upcoming events"
                        body="The calendar loaded, but it has no upcoming entries."
                        actionLabel="Refresh"
                        onPress={() => loadEvents()}
                    />
                ) : null}

                {!loading && upcomingEvents.length > 0 ? (
                    <>
                        <View style={styles.calendarMonthPanel}>
                            <View style={styles.calendarMonthHeader}>
                                <Pressable
                                    style={({ pressed }) => [
                                        styles.calendarMonthButton,
                                        pressed && styles.pressed,
                                    ]}
                                    onPress={() =>
                                        setVisibleMonth(
                                            addMonths(visibleMonth, -1),
                                        )
                                    }>
                                    <ChevronLeft
                                        color={palette.text}
                                        size={20}
                                    />
                                </Pressable>
                                <Text style={styles.calendarMonthTitle}>
                                    {formatMonthTitle(visibleMonth)}
                                </Text>
                                <Pressable
                                    style={({ pressed }) => [
                                        styles.calendarMonthButton,
                                        pressed && styles.pressed,
                                    ]}
                                    onPress={() =>
                                        setVisibleMonth(
                                            addMonths(visibleMonth, 1),
                                        )
                                    }>
                                    <ChevronRight
                                        color={palette.text}
                                        size={20}
                                    />
                                </Pressable>
                            </View>

                            <View style={styles.calendarWeekdayRow}>
                                {weekdayLabels.map((label) => (
                                    <Text
                                        key={label}
                                        style={styles.calendarWeekdayLabel}>
                                        {label}
                                    </Text>
                                ))}
                            </View>

                            <View style={styles.calendarMonthGrid}>
                                {visibleMonthDays.map((day) => (
                                    <Pressable
                                        key={day.key}
                                        style={({ pressed }) => [
                                            styles.calendarDayButton,
                                            day.outsideMonth &&
                                                styles.calendarDayButtonMuted,
                                            day.today &&
                                                styles.calendarDayButtonToday,
                                            day.selected &&
                                                styles.calendarDayButtonSelected,
                                            pressed && styles.pressed,
                                        ]}
                                        onPress={() => {
                                            setSelectedDayKey(day.key);
                                        }}>
                                        <Text
                                            style={[
                                                styles.calendarDayText,
                                                day.outsideMonth &&
                                                    styles.calendarDayTextMuted,
                                                day.selected &&
                                                    styles.calendarDayTextSelected,
                                            ]}>
                                            {day.label}
                                        </Text>
                                        {day.hasEvents ? (
                                            <View
                                                style={[
                                                    styles.calendarDayDot,
                                                    day.selected &&
                                                        styles.calendarDayDotSelected,
                                                ]}
                                            />
                                        ) : null}
                                    </Pressable>
                                ))}
                            </View>
                        </View>

                        <View style={styles.calendarList}>
                            <Text style={styles.groupTitle}>
                                {formatSelectedDayTitle(selectedDayKey)}
                            </Text>
                            {selectedDayEvents.length > 0 ? (
                                selectedDayEvents.map((event) => (
                                    <CalendarEventRow
                                        key={event.uid}
                                        event={event}
                                        course={findEventCourse(
                                            event,
                                            props.courses,
                                        )}
                                        onOpenCourse={props.onOpenCourse}
                                    />
                                ))
                            ) : (
                                <Text style={styles.cardBody}>
                                    No classes on this day.
                                </Text>
                            )}
                        </View>
                    </>
                ) : null}

                <View style={styles.calendarSettings}>
                    <TextField
                        value={calendarUrl}
                        onChangeText={setCalendarUrl}
                        autoCapitalize="none"
                        keyboardType="url"
                        placeholder="https://my.fhgr.ch/ics/.../basic.ics"
                        returnKeyType="done"
                    />
                    <View style={styles.actionRow}>
                        <PrimaryButton
                            label={saving ? 'Saving...' : 'Save calendar'}
                            onPress={saveAndReload}
                            disabled={saving || loading || !changed}
                            fullWidth={false}
                        />
                        <SecondaryButton
                            label={loading ? 'Refreshing...' : 'Refresh'}
                            icon={RefreshCw}
                            onPress={() => loadEvents()}
                            disabled={loading || saving}
                            fullWidth={false}
                        />
                    </View>
                </View>
            </ScreenSection>
        </ScrollView>
    );
}

type CalendarMonthDay = {
    readonly key: string;
    readonly label: string;
    readonly outsideMonth: boolean;
    readonly today: boolean;
    readonly selected: boolean;
    readonly hasEvents: boolean;
};

const weekdayLabels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function buildCalendarMonth(
    visibleMonth: Date,
    events: readonly CalendarEvent[],
    selectedDayKey: string,
): CalendarMonthDay[] {
    const monthStart = startOfMonth(visibleMonth);
    const firstWeekdayOffset = (monthStart.getDay() + 6) % 7;
    const gridStart = addDays(monthStart, -firstWeekdayOffset);
    const eventDays = new Set(
        events.map((event) => getCalendarDayKey(event.startsAt)),
    );
    const todayKey = localDayKey(new Date());

    return Array.from({ length: 42 }, (_, index) => {
        const date = addDays(gridStart, index);
        const key = localDayKey(date);
        return {
            key,
            label: String(date.getDate()),
            outsideMonth: date.getMonth() !== monthStart.getMonth(),
            today: key === todayKey,
            selected: key === selectedDayKey,
            hasEvents: eventDays.has(key),
        };
    });
}

function startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number): Date {
    return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function addDays(date: Date, amount: number): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function localDayKey(date: Date): string {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
    ].join('-');
}

function formatMonthTitle(date: Date): string {
    return new Intl.DateTimeFormat('de-CH', {
        month: 'long',
        year: 'numeric',
    }).format(date);
}

function formatSelectedDayTitle(dayKey: string): string {
    const [year, month, day] = dayKey.split('-').map(Number);
    if (!year || !month || !day) {
        return 'Selected day';
    }

    return new Intl.DateTimeFormat('de-CH', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    }).format(new Date(year, month - 1, day));
}

function CalendarEventRow(props: {
    readonly event: CalendarEvent;
    readonly course: MoodleCourse | null;
    readonly onOpenCourse: (courseId: number) => void;
}) {
    return (
        <Pressable
            style={({ pressed }) => [
                styles.calendarEventRow,
                pressed && styles.pressed,
            ]}
            disabled={!props.course}
            onPress={() => {
                if (props.course) {
                    props.onOpenCourse(props.course.id);
                }
            }}
            accessibilityLabel={
                props.course
                    ? `Open course for ${props.event.title}`
                    : props.event.title
            }
            accessibilityRole="button">
            <View style={styles.calendarDateBlock}>
                <Text style={styles.calendarDateDay}>
                    {dayLabel(props.event.startsAt)}
                </Text>
                <Text style={styles.calendarDateMonth}>
                    {monthLabel(props.event.startsAt)}
                </Text>
            </View>
            <View style={styles.calendarEventBody}>
                <Text style={styles.rowTitle} numberOfLines={2}>
                    {props.event.title}
                </Text>
                <Text style={styles.rowSubtitle}>
                    {formatCalendarDateRange(props.event)}
                </Text>
                {props.event.location ? (
                    <Text style={styles.rowSubtitle} numberOfLines={1}>
                        {props.event.location}
                    </Text>
                ) : null}
                {props.course ? (
                    <Text style={styles.calendarCourseHint} numberOfLines={1}>
                        {props.course.fullName}
                    </Text>
                ) : null}
            </View>
            {props.course ? (
                <ChevronRight color={palette.red} size={22} />
            ) : null}
        </Pressable>
    );
}

function dayLabel(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '--';
    }
    return new Intl.DateTimeFormat('de-CH', { day: '2-digit' }).format(date);
}

function monthLabel(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '';
    }
    return new Intl.DateTimeFormat('de-CH', { month: 'short' })
        .format(date)
        .replace('.', '');
}

function isLikelyCalendarUrl(value: string): boolean {
    try {
        const url = new URL(value);
        return /^https?:$/.test(url.protocol);
    } catch {
        return false;
    }
}

function getMessage(error: unknown): string {
    return error instanceof Error
        ? error.message
        : 'The calendar could not be loaded.';
}
