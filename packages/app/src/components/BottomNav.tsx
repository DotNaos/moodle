import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
    Bot,
    CalendarDays,
    House,
    UserRound,
    type IconComponent,
} from '../icons';
import { palette, styles } from '../styles';
import type { AppView } from '../types';

const navItems: Array<{ id: AppView; label: string; icon: IconComponent }> = [
    { id: 'courses', label: 'Home', icon: House },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays },
    { id: 'codex', label: 'Codex', icon: Bot },
    { id: 'profile', label: 'Profile', icon: UserRound },
];

type BottomNavProps = {
    readonly activeView: AppView;
    readonly onChangeView: (view: AppView) => void;
};

export function BottomNav(props: BottomNavProps) {
    const insets = useSafeAreaInsets();
    const bottomPadding = Math.max(insets.bottom - 20, 14);
    const activeView =
        props.activeView === 'videos' ? 'courses' : props.activeView;

    return (
        <View style={[styles.bottomNav, { paddingBottom: bottomPadding }]}>
            {navItems.map((item) => {
                const active = activeView === item.id;
                const Icon = item.icon;

                return (
                    <Pressable
                        key={item.id}
                        style={({ pressed }) => [
                            styles.navItemButton,
                            active && styles.navItemButtonActive,
                            pressed && styles.navItemButtonPressed,
                        ]}
                        onPress={() => props.onChangeView(item.id)}
                        accessibilityLabel={item.label}
                        accessibilityRole="button">
                        <Icon
                            color={
                                active ? palette.ink : palette.subtle
                            }
                            size={21}
                        />
                        <Text
                            style={[
                                styles.navLabel,
                                active && styles.navLabelActive,
                            ]}
                            numberOfLines={1}>
                            {item.label}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}
