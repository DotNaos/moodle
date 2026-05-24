import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    Text,
    View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

import { CourseArtwork } from '../components/CourseArtwork';
import { EmptyState, ScreenSection, SecondaryButton } from '../components/ui';
import {
    fetchCalendarEvents,
    formatCalendarDateRange,
    upcomingCalendarEvents,
    type CalendarEvent,
} from '../calendar';
import { findEventCourse } from '../courseMatching';
import { sanitizeCourseName, stripHtml } from '../format';
import { CalendarDays, ChevronLeft, ChevronRight, FileText, RefreshCw, Video } from '../icons';
import type {
    MoodleConnection,
    MoodleCourse,
    MoodleCourseFile,
    MoodleCourseModule,
    MoodleCourseSection,
} from '../moodle';
import { loadCalendarUrl } from '../storage';
import { palette, styles } from '../styles';

type CoursesScreenProps = {
    readonly connection: MoodleConnection | null;
    readonly courses: MoodleCourse[];
    readonly sections: MoodleCourseSection[];
    readonly currentCourse: MoodleCourse | null;
    readonly loadingDashboard: boolean;
    readonly loadingCourseId: number | null;
    readonly courseIdsWithVideos: ReadonlySet<number>;
    readonly onOpenConnect: () => void;
    readonly onSelectCourse: (courseId: number) => void;
    readonly onBackToCourses: () => void;
    readonly onOpenCourseVideos: (courseId: number) => void;
    readonly onOpenFile: (file: MoodleCourseFile) => void;
};

type CourseDetailProps = {
    readonly course: MoodleCourse;
    readonly sections: MoodleCourseSection[];
    readonly loading: boolean;
    readonly hasVideos: boolean;
    readonly onBack: () => void;
    readonly onOpenVideos: () => void;
    readonly onOpenFile: (file: MoodleCourseFile) => void;
};

type CourseSectionProps = {
    readonly section: MoodleCourseSection;
    readonly index: number;
    readonly onOpenFile: (file: MoodleCourseFile) => void;
};

type ModuleFilesProps = {
    readonly module: MoodleCourseModule;
    readonly onOpenFile: (file: MoodleCourseFile) => void;
};

type CourseListRowProps = {
    readonly course: MoodleCourse;
    readonly onPress: () => void;
};

type FileRowProps = {
    readonly moduleName?: string;
    readonly file: MoodleCourseFile;
    readonly onPress: () => void;
};

export function CoursesScreen(props: CoursesScreenProps) {
    const groupedCourses = useMemo(
        () => groupCourses(props.courses),
        [props.courses],
    );

    if (!props.connection) {
        return (
            <ScreenSection>
                <EmptyState
                    title="Courses are locked"
                    body="Connect Moodle first."
                    actionLabel="Connect Moodle"
                    onPress={props.onOpenConnect}
                />
            </ScreenSection>
        );
    }

    if (props.currentCourse) {
        const course = props.currentCourse;
        return (
            <CourseDetail
                course={course}
                sections={props.sections}
                loading={props.loadingCourseId === course.id}
                hasVideos={props.courseIdsWithVideos.has(course.id)}
                onBack={props.onBackToCourses}
                onOpenVideos={() => props.onOpenCourseVideos(course.id)}
                onOpenFile={props.onOpenFile}
            />
        );
    }

    let courseListContent: React.ReactNode;

    if (props.loadingDashboard) {
        courseListContent = (
            <View style={styles.loadingPanel}>
                <ActivityIndicator color={palette.text} />
            </View>
        );
    } else if (groupedCourses.length > 0) {
        courseListContent = (
            <View style={styles.courseListOuter}>
                {groupedCourses.map((group) => (
                    <View key={group.name} style={styles.courseGroup}>
                        <Text style={styles.groupTitlePlain}>
                            {group.name}
                        </Text>
                        <View style={styles.plainList}>
                            {group.courses.map((course) => (
                                <CourseListRow
                                    key={course.id}
                                    course={course}
                                    onPress={() =>
                                        props.onSelectCourse(course.id)
                                    }
                                />
                            ))}
                        </View>
                    </View>
                ))}
            </View>
        );
    } else {
        courseListContent = (
            <EmptyState
                title="No courses"
                body="Refresh Moodle once the session is connected."
            />
        );
    }

    return (
        <ScreenSection>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <HomeCalendarPreview
                    courses={props.courses}
                    onOpenCourse={props.onSelectCourse}
                />
                {courseListContent}
            </ScrollView>
        </ScreenSection>
    );
}

function CourseDetail(props: CourseDetailProps) {
    const x = useSharedValue(0);

    const panGesture = Gesture.Pan()
        .activeOffsetX(20)
        .failOffsetY([-20, 20])
        .onUpdate((e) => {
            if (e.translationX > 0) {
                x.value = e.translationX;
            }
        })
        .onEnd((e) => {
            // If swiped far enough or fast enough, go back
            if (e.translationX > 100 || e.velocityX > 500) {
                x.value = withSpring(300, { velocity: e.velocityX }, () => {
                    runOnJS(props.onBack)();
                });
            } else {
                x.value = withSpring(0);
            }
        });

    const animatedStyle = useAnimatedStyle(() => ({
        flex: 1,
        transform: [{ translateX: x.value }],
    }));

    let detailContent: React.ReactNode;

    if (props.loading) {
        detailContent = (
            <View style={styles.loadingPanel}>
                <ActivityIndicator color={palette.text} />
            </View>
        );
    } else if (props.sections.length > 0) {
        detailContent = (
            <View style={styles.courseList}>
                {props.sections.map((section, index) => (
                    <CourseSection
                        key={`${props.course.id}-${section.id ?? index}`}
                        section={section}
                        index={index}
                        onOpenFile={props.onOpenFile}
                    />
                ))}
            </View>
        );
    } else {
        detailContent = (
            <EmptyState
                title="No content loaded"
                body="Refresh this course or try again later."
            />
        );
    }

    return (
        <GestureDetector gesture={panGesture}>
            <Animated.View
                style={[
                    { flex: 1, backgroundColor: palette.background },
                    animatedStyle,
                ]}>
                <View style={styles.courseHeader}>
                    <Pressable
                        onPress={props.onBack}
                        style={({ pressed }) => [
                            styles.backButton,
                            pressed && styles.pressed,
                        ]}>
                        <ChevronLeft color={palette.text} size={24} />
                    </Pressable>
                    <View style={styles.courseHeaderContent}>
                        <Text style={styles.courseHeaderLabel}>
                            {props.course.categoryName}
                        </Text>
                        <Text
                            style={styles.courseHeaderTitle}
                            numberOfLines={3}>
                            {sanitizeCourseName(props.course.fullName)}
                        </Text>
                        {props.hasVideos ? (
                            <View style={styles.courseHeaderActions}>
                                <SecondaryButton
                                    label="Videos"
                                    icon={Video}
                                    fullWidth={false}
                                    onPress={props.onOpenVideos}
                                />
                            </View>
                        ) : null}
                    </View>
                </View>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {detailContent}
                </ScrollView>
            </Animated.View>
        </GestureDetector>
    );
}

function HomeCalendarPreview(props: {
    readonly courses: MoodleCourse[];
    readonly onOpenCourse: (courseId: number) => void;
}) {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasCalendar, setHasCalendar] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        let mounted = true;
        void loadHomeCalendar();

        async function loadHomeCalendar() {
            setLoading(true);
            setErrorMessage('');
            try {
                const calendarUrl = await loadCalendarUrl();
                if (!mounted) {
                    return;
                }
                setHasCalendar(Boolean(calendarUrl));
                if (!calendarUrl) {
                    setEvents([]);
                    return;
                }
                const nextEvents = await fetchCalendarEvents(calendarUrl);
                if (mounted) {
                    setEvents(nextEvents);
                }
            } catch (error) {
                if (mounted) {
                    setEvents([]);
                    setErrorMessage(
                        error instanceof Error
                            ? error.message
                            : 'Calendar could not be loaded.',
                    );
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        return () => {
            mounted = false;
        };
    }, []);

    const upcomingEvents = upcomingCalendarEvents(events).slice(0, 3);

    return (
        <View style={styles.homeCalendarPanel}>
            <View style={styles.homeCalendarHeader}>
                <View style={styles.homeCalendarTitleRow}>
                    <CalendarDays color={palette.text} size={18} />
                    <Text style={styles.sectionTitle}>Calendar</Text>
                </View>
                <RefreshCw color={palette.subtle} size={16} />
            </View>

            {loading ? (
                <Text style={styles.cardBody}>Loading calendar...</Text>
            ) : null}

            {!loading && !hasCalendar ? (
                <Text style={styles.cardBody}>
                    Add your FHGR calendar in the Calendar tab.
                </Text>
            ) : null}

            {!loading && errorMessage ? (
                <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}

            {!loading && hasCalendar && upcomingEvents.length === 0 ? (
                <Text style={styles.cardBody}>No upcoming events.</Text>
            ) : null}

            {!loading && upcomingEvents.length > 0 ? (
                <View style={styles.homeCalendarList}>
                    {upcomingEvents.map((event) => (
                        <HomeCalendarEventRow
                            key={event.uid}
                            event={event}
                            course={findEventCourse(event, props.courses)}
                            onOpenCourse={props.onOpenCourse}
                        />
                    ))}
                </View>
            ) : null}
        </View>
    );
}

function HomeCalendarEventRow(props: {
    readonly event: CalendarEvent;
    readonly course: MoodleCourse | null;
    readonly onOpenCourse: (courseId: number) => void;
}) {
    return (
        <Pressable
            disabled={!props.course}
            onPress={() => {
                if (props.course) {
                    props.onOpenCourse(props.course.id);
                }
            }}
            style={({ pressed }) => [
                styles.homeCalendarRow,
                pressed && styles.pressed,
            ]}>
            <View style={styles.calendarDateBlock}>
                <Text style={styles.calendarDateDay}>
                    {dayLabel(props.event.startsAt)}
                </Text>
                <Text style={styles.calendarDateMonth}>
                    {monthLabel(props.event.startsAt)}
                </Text>
            </View>
            <View style={styles.calendarEventBody}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                    {props.event.title}
                </Text>
                <Text style={styles.rowSubtitle} numberOfLines={1}>
                    {formatCalendarDateRange(props.event)}
                </Text>
            </View>
            {props.course ? <ChevronRight color={palette.subtle} size={18} /> : null}
        </Pressable>
    );
}

function CourseSection(props: CourseSectionProps) {
    const modulesWithFiles = props.section.modules.filter(
        (module) => module.contents.length > 0,
    );

    if (modulesWithFiles.length === 0 && !props.section.summary) {
        return null; // Skip completely empty sections to keep UI clean
    }

    return (
        <View style={styles.courseSection}>
            <Text style={styles.courseSectionTitle} numberOfLines={2}>
                {props.section.name || `Section ${props.index + 1}`}
            </Text>
            {props.section.summary ? (
                <Text style={styles.sectionSummary} numberOfLines={3}>
                    {stripHtml(props.section.summary)}
                </Text>
            ) : null}

            {modulesWithFiles.length > 0 ? (
                <View style={styles.courseFileList}>
                    {modulesWithFiles.map((module, moduleIndex) => (
                        <ModuleFiles
                            key={`${module.id ?? moduleIndex}-${module.name}`}
                            module={module}
                            onOpenFile={props.onOpenFile}
                        />
                    ))}
                </View>
            ) : null}
        </View>
    );
}

function ModuleFiles(props: ModuleFilesProps) {
    // Determine the label to show. Often, the resource 'name' and the 'filename' are
    // functionally the same or we only want to show the resource name to avoid nesting.
    return (
        <View>
            {props.module.contents.map((file, i) => (
                <FileRow
                    key={`${file.fileUrl}-${file.filename}`}
                    file={file}
                    moduleName={i === 0 ? props.module.name : undefined}
                    onPress={() => props.onOpenFile(file)}
                />
            ))}
        </View>
    );
}

function CourseListRow(props: CourseListRowProps) {
    return (
        <Pressable
            onPress={props.onPress}
            style={({ pressed }) => [
                styles.courseListRowPlain,
                pressed ? [styles.pressed, { opacity: 0.8 }] : null,
            ]}>
            <CourseArtwork
                imageUrl={props.course.courseImage}
                title={props.course.fullName || props.course.shortName}
                style={styles.courseImagePreview}
            />
            <View style={styles.courseListRowContent}>
                <Text style={styles.rowTitle} numberOfLines={2}>
                    {sanitizeCourseName(props.course.fullName)}
                </Text>
            </View>
            <ChevronRight color={palette.subtle} size={18} />
        </Pressable>
    );
}

function FileRow(props: FileRowProps) {
    const isPdf =
        props.file.mimeType === 'application/pdf' ||
        props.file.filename.toLowerCase().endsWith('.pdf');

    // Use moduleName if provided, otherwise fall back to filename
    // Typically the filename is redundant or less clean than the module label
    const displayName = props.moduleName || props.file.filename;

    return (
        <Pressable
            onPress={props.onPress}
            style={({ pressed }) => [
                styles.courseListRowPlain,
                pressed ? [styles.pressed, { opacity: 0.8 }] : null,
            ]}>
            <FileText color={isPdf ? palette.red : palette.text} size={22} />
            <View style={styles.courseListRowContent}>
                <Text style={styles.rowTitle} numberOfLines={2}>
                    {stripHtml(displayName)}
                </Text>
            </View>
            <ChevronRight color={palette.subtle} size={18} />
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

function groupCourses(
    courses: MoodleCourse[],
): Array<{ name: string; courses: MoodleCourse[] }> {
    const groups = new Map<string, MoodleCourse[]>();
    courses.forEach((course) => {
        const name =
            course.categoryName || course.rawCategory || 'Other courses';
        groups.set(name, [...(groups.get(name) ?? []), course]);
    });

    return Array.from(groups.entries())
        .sort(([left], [right]) => compareSemesterGroups(left, right))
        .map(([name, grouped]) => ({
            name,
            courses: [...grouped].sort((left, right) =>
                left.fullName.localeCompare(right.fullName),
            ),
        }));
}

function compareSemesterGroups(left: string, right: string): number {
    return (
        semesterRank(right) - semesterRank(left) || left.localeCompare(right)
    );
}

function semesterRank(value: string): number {
    const match = /^(HS|FS)(\d{2})$/i.exec(value);
    if (!match) {
        return 0;
    }

    const year = Number.parseInt(match[2] ?? '0', 10);
    const season = match[1]?.toUpperCase() === 'HS' ? 2 : 1;
    return year * 10 + season;
}
