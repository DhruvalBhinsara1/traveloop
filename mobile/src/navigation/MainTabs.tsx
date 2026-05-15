import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GlassView } from 'expo-glass-effect';
import { useCallback, useMemo, useRef } from 'react';
import { LayoutChangeEvent, Platform, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticPressable as Pressable } from '../components/HapticPressable';
import { colors, fontFamily, radius, shadows } from '../theme';
import { playLongPressHaptic, playSelectionHaptic } from '../utils/haptics';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { TripListScreen } from '../screens/trips/TripListScreen';
import { PeopleScreen } from '../screens/people/PeopleScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { MainTabsParamList } from './types';

const Tab = createBottomTabNavigator<MainTabsParamList>();
const SLIDE_LONG_PRESS_MS = 260;
const SLIDE_VERTICAL_TOLERANCE = 16;

type TabBarBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        sceneStyle: { backgroundColor: colors.background }
      }}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Trips" component={TripListScreen} />
      <Tab.Screen name="People" component={PeopleScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomOffset = Platform.OS === 'ios' ? 8 : Math.max(insets.bottom - 2, 12);
  const tabBarRef = useRef<View>(null);
  const tabBarBoundsRef = useRef<TabBarBounds>({ x: 0, y: 0, width: 0, height: 0 });
  const slideArmedRef = useRef(false);
  const hoveredIndexRef = useRef(state.index);
  const suppressPressUntilRef = useRef(0);
  const routesRef = useRef(state.routes);
  const activeIndexRef = useRef(state.index);

  routesRef.current = state.routes;
  activeIndexRef.current = state.index;
  if (!slideArmedRef.current) {
    hoveredIndexRef.current = state.index;
  }

  const measureTabBar = useCallback(() => {
    tabBarRef.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) {
        tabBarBoundsRef.current = { x, y, width, height };
      }
    });
  }, []);

  const handleTabBarLayout = useCallback((_event: LayoutChangeEvent) => {
    requestAnimationFrame(measureTabBar);
  }, [measureTabBar]);

  const getIndexForAbsoluteX = useCallback((absoluteX: number) => {
    const routes = routesRef.current;
    const bounds = tabBarBoundsRef.current;

    if (!routes.length) {
      return 0;
    }

    if (!bounds.width || !Number.isFinite(absoluteX)) {
      return activeIndexRef.current;
    }

    const localX = Math.min(Math.max(absoluteX - bounds.x, 0), Math.max(bounds.width - 0.01, 0));
    return Math.min(routes.length - 1, Math.max(0, Math.floor((localX / bounds.width) * routes.length)));
  }, []);

  const isWithinSlideY = useCallback((absoluteY: number) => {
    const bounds = tabBarBoundsRef.current;

    if (!bounds.height || !Number.isFinite(absoluteY)) {
      return true;
    }

    return (
      absoluteY >= bounds.y - SLIDE_VERTICAL_TOLERANCE &&
      absoluteY <= bounds.y + bounds.height + SLIDE_VERTICAL_TOLERANCE
    );
  }, []);

  const activateTab = useCallback((index: number, source: 'press' | 'slide') => {
    const route = routesRef.current[index];

    if (!route) {
      return false;
    }

    const wasFocused = activeIndexRef.current === index;
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true
    });

    if (event.defaultPrevented) {
      return false;
    }

    if (!wasFocused) {
      navigation.navigate(route.name as never);
      activeIndexRef.current = index;
    }

    if (source === 'slide' && !wasFocused) {
      playSelectionHaptic();
    }

    return true;
  }, [navigation]);

  const beginSlideNavigation = useCallback((absoluteX: number, absoluteY: number) => {
    if (!isWithinSlideY(absoluteY)) {
      return;
    }

    const index = getIndexForAbsoluteX(absoluteX);
    const route = routesRef.current[index];

    if (!route) {
      return;
    }

    slideArmedRef.current = true;
    suppressPressUntilRef.current = Date.now() + 5000;
    hoveredIndexRef.current = index;
    navigation.emit({
      type: 'tabLongPress',
      target: route.key
    });
    playLongPressHaptic();
  }, [getIndexForAbsoluteX, isWithinSlideY, navigation]);

  const updateSlideNavigation = useCallback((absoluteX: number, absoluteY: number) => {
    if (!slideArmedRef.current || !isWithinSlideY(absoluteY)) {
      return;
    }

    const nextIndex = getIndexForAbsoluteX(absoluteX);

    if (nextIndex === hoveredIndexRef.current) {
      return;
    }

    if (activateTab(nextIndex, 'slide')) {
      hoveredIndexRef.current = nextIndex;
    }
  }, [activateTab, getIndexForAbsoluteX, isWithinSlideY]);

  const endSlideNavigation = useCallback(() => {
    slideArmedRef.current = false;
    hoveredIndexRef.current = activeIndexRef.current;
    suppressPressUntilRef.current = Date.now() + 140;
  }, []);

  const slideGesture = useMemo(() => {
    const longPressGesture = Gesture.LongPress()
      .minDuration(SLIDE_LONG_PRESS_MS)
      .maxDistance(10000)
      .shouldCancelWhenOutside(false)
      .onStart((event) => {
        beginSlideNavigation(event.absoluteX, event.absoluteY);
      })
      .onFinalize(() => {
        endSlideNavigation();
      })
      .runOnJS(true);

    const panGesture = Gesture.Pan()
      .minDistance(0)
      .activateAfterLongPress(SLIDE_LONG_PRESS_MS)
      .shouldCancelWhenOutside(false)
      .onUpdate((event) => {
        updateSlideNavigation(event.absoluteX, event.absoluteY);
      })
      .onFinalize(() => {
        endSlideNavigation();
      })
      .runOnJS(true);

    return Gesture.Simultaneous(longPressGesture, panGesture);
  }, [beginSlideNavigation, endSlideNavigation, updateSlideNavigation]);

  return (
    <View pointerEvents="box-none" style={[styles.tabBarWrap, { bottom: bottomOffset }]}>
      <GestureDetector gesture={slideGesture}>
        <View
          collapsable={false}
          onLayout={handleTabBarLayout}
          ref={tabBarRef}
          style={styles.tabBarFrame}
        >
          <GlassView
            colorScheme="light"
            glassEffectStyle="regular"
            isInteractive
            tintColor="rgba(255,255,255,0.62)"
            style={styles.tabBarGlass}
          >
            <View style={styles.tabBarContent}>
              {state.routes.map((route, index) => {
                const focused = state.index === index;
                const options = descriptors[route.key]?.options;
                const label =
                  typeof options?.tabBarLabel === 'string'
                    ? options.tabBarLabel
                    : options?.title ?? route.name;
                const icons = {
                  Home: focused ? 'home' : 'home-outline',
                  Trips: focused ? 'map' : 'map-outline',
                  People: focused ? 'people' : 'people-outline',
                  Profile: focused ? 'person' : 'person-outline'
                } as const;

                const onPress = () => {
                  if (Date.now() < suppressPressUntilRef.current) {
                    return;
                  }

                  activateTab(index, 'press');
                };

                return (
                  <Pressable
                    accessibilityLabel={options?.tabBarAccessibilityLabel}
                    accessibilityRole="button"
                    accessibilityState={focused ? { selected: true } : {}}
                    hapticOnLongPress={false}
                    key={route.key}
                    onPress={onPress}
                    style={({ pressed }) => [
                      styles.tabPill,
                      focused && styles.tabPillActive,
                      pressed && styles.tabPillPressed
                    ]}
                  >
                    <View style={[styles.tabIconShell, focused && styles.tabIconShellActive]}>
                      <Ionicons name={icons[route.name as keyof typeof icons]} size={focused ? 21 : 22} color={focused ? colors.primary : colors.gray600} />
                    </View>
                    <Text numberOfLines={1} style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </GlassView>
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 20
  },
  tabBarFrame: {
    minHeight: 78,
    borderRadius: 39,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(221,227,224,0.86)',
    ...shadows.card
  },
  tabBarGlass: {
    minHeight: 78,
    borderRadius: 39,
    overflow: 'hidden'
  },
  tabBarContent: {
    minHeight: 78,
    borderRadius: 39,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.34)'
  },
  tabPill: {
    flex: 1,
    minHeight: 62,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    paddingHorizontal: 4
  },
  tabPillActive: {
    backgroundColor: 'rgba(255,255,255,0.72)'
  },
  tabPillPressed: {
    opacity: 0.82
  },
  tabIconShell: {
    width: 34,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  tabIconShellActive: {
    backgroundColor: colors.primaryLight
  },
  tabLabel: {
    color: colors.gray600,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 11,
    lineHeight: 15
  },
  tabLabelActive: {
    color: colors.primary,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    lineHeight: 16
  }
});
