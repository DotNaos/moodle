import { StyleSheet } from "react-native";

import { palette } from "./palette";

export const calendarStyles = StyleSheet.create({
  calendarHero: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 24,
    flexDirection: "row",
    gap: 14,
    padding: 16,
  },
  calendarHeroIcon: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 18,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  calendarSettings: {
    gap: 12,
  },
  calendarLoading: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 4,
    paddingVertical: 10,
  },
  calendarList: {
    gap: 8,
  },
  calendarMonthPanel: {
    backgroundColor: palette.surface,
    borderRadius: 24,
    gap: 12,
    padding: 14,
  },
  calendarMonthHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  calendarMonthButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 9999,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  calendarMonthTitle: {
    color: palette.text,
    flex: 1,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
    textTransform: "capitalize",
  },
  calendarWeekdayRow: {
    flexDirection: "row",
  },
  calendarWeekdayLabel: {
    color: palette.subtle,
    flex: 1,
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 18,
    textAlign: "center",
    textTransform: "uppercase",
  },
  calendarMonthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarDayButton: {
    alignItems: "center",
    aspectRatio: 1,
    borderRadius: 9999,
    justifyContent: "center",
    minHeight: 42,
    position: "relative",
    width: "14.285%",
  },
  calendarDayButtonMuted: {
    opacity: 0.32,
  },
  calendarDayButtonToday: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  calendarDayButtonSelected: {
    backgroundColor: palette.text,
  },
  calendarDayText: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 18,
  },
  calendarDayTextMuted: {
    color: palette.subtle,
  },
  calendarDayTextSelected: {
    color: palette.ink,
  },
  calendarDayDot: {
    backgroundColor: palette.text,
    borderRadius: 9999,
    bottom: 7,
    height: 4,
    position: "absolute",
    width: 4,
  },
  calendarDayDotSelected: {
    backgroundColor: palette.ink,
  },
  homeCalendarPanel: {
    backgroundColor: palette.surface,
    borderRadius: 24,
    gap: 12,
    padding: 14,
  },
  homeCalendarHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  homeCalendarTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  homeCalendarList: {
    gap: 4,
  },
  homeCalendarRow: {
    alignItems: "center",
    borderRadius: 18,
    flexDirection: "row",
    gap: 12,
    minHeight: 62,
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  calendarEventRow: {
    alignItems: "center",
    borderBottomColor: palette.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 14,
    minHeight: 76,
    paddingHorizontal: 4,
    paddingVertical: 12,
  },
  calendarDateBlock: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    height: 52,
    justifyContent: "center",
    width: 54,
  },
  calendarDateDay: {
    color: palette.text,
    fontSize: 19,
    fontWeight: "900",
    lineHeight: 22,
  },
  calendarDateMonth: {
    color: palette.subtle,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  calendarEventBody: {
    flex: 1,
    gap: 3,
  },
  calendarCourseHint: {
    color: palette.blue,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
  },
});
