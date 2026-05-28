import { describe, expect, test } from 'bun:test';

import {
    formatCalendarDateRange,
    mergeConsecutiveCalendarEvents,
    parseCalendar,
    upcomingCalendarEvents,
} from '../src/calendar';

describe('calendar ICS parsing', () => {
    test('parses folded text, date ranges, and locations', () => {
        const events = parseCalendar(`BEGIN:VCALENDAR
BEGIN:VEVENT
UID:one
SUMMARY:Algorithmen des wissenschaftlichen Rechnens
DTSTART:20260521T081500Z
DTEND:20260521T100000Z
LOCATION:FHGR Raum 1
DESCRIPTION:Line one\\nline two
END:VEVENT
BEGIN:VEVENT
UID:two
SUMMARY:Long folded 
 title
DTSTART;VALUE=DATE:20260522
DTEND;VALUE=DATE:20260523
END:VEVENT
END:VCALENDAR`);

        expect(events).toHaveLength(2);
        expect(events[0]?.title).toBe(
            'Algorithmen des wissenschaftlichen Rechnens',
        );
        expect(events[0]?.location).toBe('FHGR Raum 1');
        expect(events[0]?.description).toBe('Line one\nline two');
        expect(events[1]?.title).toBe('Long folded title');
        expect(events[1]?.allDay).toBe(true);
        expect(formatCalendarDateRange(events[0]!)).toContain('21. Mai');
    });

    test('keeps today and future events', () => {
        const events = parseCalendar(`BEGIN:VCALENDAR
BEGIN:VEVENT
UID:past
SUMMARY:Past
DTSTART:20260520T081500Z
DTEND:20260520T100000Z
END:VEVENT
BEGIN:VEVENT
UID:future
SUMMARY:Future
DTSTART:20260521T081500Z
DTEND:20260521T100000Z
END:VEVENT
END:VCALENDAR`);

        const upcoming = upcomingCalendarEvents(
            events,
            new Date('2026-05-21T12:00:00+02:00'),
        );

        expect(upcoming.map((event) => event.uid)).toEqual(['future']);
    });

    test('merges consecutive blocks for the same course on the same day', () => {
        const events = parseCalendar(`BEGIN:VCALENDAR
BEGIN:VEVENT
UID:first
SUMMARY:Data Science und Informatik bei Banken
DTSTART:20260528T071500Z
DTEND:20260528T084500Z
END:VEVENT
BEGIN:VEVENT
UID:second
SUMMARY:Data Science und Informatik bei Banken
DTSTART:20260528T090000Z
DTEND:20260528T103000Z
END:VEVENT
BEGIN:VEVENT
UID:third
SUMMARY:High Performance Computing
DTSTART:20260528T113000Z
DTEND:20260528T130000Z
END:VEVENT
END:VCALENDAR`);

        const merged = mergeConsecutiveCalendarEvents(events);

        expect(merged.map((event) => event.title)).toEqual([
            'Data Science und Informatik bei Banken',
            'High Performance Computing',
        ]);
        expect(merged[0]?.startsAt).toBe(events[0]?.startsAt);
        expect(merged[0]?.endsAt).toBe(events[1]?.endsAt);
    });

    test('does not merge a course when another course is scheduled in between', () => {
        const events = parseCalendar(`BEGIN:VCALENDAR
BEGIN:VEVENT
UID:first
SUMMARY:Data Science und Informatik bei Banken
DTSTART:20260528T071500Z
DTEND:20260528T084500Z
END:VEVENT
BEGIN:VEVENT
UID:middle
SUMMARY:High Performance Computing
DTSTART:20260528T090000Z
DTEND:20260528T103000Z
END:VEVENT
BEGIN:VEVENT
UID:last
SUMMARY:Data Science und Informatik bei Banken
DTSTART:20260528T113000Z
DTEND:20260528T130000Z
END:VEVENT
END:VCALENDAR`);

        const merged = mergeConsecutiveCalendarEvents(events);

        expect(merged.map((event) => event.uid)).toEqual([
            'first',
            'middle',
            'last',
        ]);
    });
});
