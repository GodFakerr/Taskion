import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Keyboard } from 'react-native';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../src/theme/useAppTheme';

interface CustomTabBarProps {
  state: any;
  descriptors?: any;
  navigation?: any;
  navigateToTab?: (routeKey: string) => void;
  emitter?: any;
  insets?: any;
}

function CustomM3TabBar({ state, descriptors, navigation, navigateToTab, emitter }: CustomTabBarProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setIsKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  if (isKeyboardVisible) {
    return null;
  }

  const tabsConfig = [
    {
      name: 'index',
      label: 'Today',
      icon: 'calendar-today',
      activeIcon: 'calendar-check',
    },
    {
      name: 'scheduled',
      label: 'Scheduled',
      icon: 'clock-outline',
      activeIcon: 'clock',
    },
    {
      name: 'completed',
      label: 'Completed',
      icon: 'check-circle-outline',
      activeIcon: 'check-circle',
    },
  ];

  return (
    <View
      style={[
        styles.tabBarContainer,
        {
          backgroundColor: colors.surfaceContainer,
          paddingBottom: Math.max(insets.bottom, 12),
          borderTopColor: colors.surfaceContainerHigh,
        },
      ]}
    >
      <View style={styles.tabsRow}>
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;
          const config = tabsConfig.find((t) => t.name === route.name) || {
            name: route.name,
            label: route.name,
            icon: 'circle-outline',
            activeIcon: 'circle',
          };

          const onPress = () => {
            if (navigation?.emit) {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event?.defaultPrevented) {
                navigation.navigate(route.name);
              }
            } else if (emitter?.emit) {
              const event = emitter.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event?.defaultPrevented) {
                if (navigateToTab) {
                  navigateToTab(route.key);
                }
              }
            } else if (!isFocused) {
              if (navigateToTab) {
                navigateToTab(route.key);
              } else if (navigation?.navigate) {
                navigation.navigate(route.name);
              }
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.tabItem}
              hitSlop={8}
              android_ripple={{ color: 'transparent', borderless: true }}
            >
              <View
                style={[
                  styles.iconPill,
                  {
                    backgroundColor: isFocused
                      ? colors.secondaryContainer
                      : 'transparent',
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={(isFocused ? config.activeIcon : config.icon) as any}
                  size={22}
                  color={
                    isFocused
                      ? colors.onSecondaryContainer
                      : colors.onSurfaceVariant
                  }
                />
              </View>

              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isFocused
                      ? colors.onSurface
                      : colors.onSurfaceVariant,
                    fontWeight: isFocused ? '700' : '500',
                  },
                ]}
              >
                {config.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  const { colors, radii } = useAppTheme();
  const router = useRouter();
  const pathname = usePathname();

  // On Scheduled screen, show the floating FAB (on Today screen, the FAB is integrated into the bottom dock beside QuickAdd)
  const showStandaloneFab = pathname === '/scheduled';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Tabs
        tabBar={(props) => <CustomM3TabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Today' }} />
        <Tabs.Screen name="scheduled" options={{ title: 'Scheduled' }} />
        <Tabs.Screen name="completed" options={{ title: 'Completed' }} />
      </Tabs>

      {/* Standalone Material 3 Expressive Squircle FAB for Scheduled screen */}
      {showStandaloneFab && (
        <Pressable
          onPress={() => router.push('/new-reminder')}
          style={({ pressed }) => [
            styles.fab,
            {
              backgroundColor: colors.primary,
              borderRadius: radii.fab,
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.95 : 1 }],
            },
          ]}
          accessibilityLabel="Add new reminder"
        >
          <MaterialCommunityIcons
            name="plus"
            size={32}
            color={colors.onPrimary}
          />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    height: 76,
    borderTopWidth: 1,
    justifyContent: 'center',
    paddingTop: 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 2,
  },
  iconPill: {
    width: 64,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
    letterSpacing: 0.2,
  },
  fab: {
    position: 'absolute',
    bottom: 92,
    right: 20,
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
});
