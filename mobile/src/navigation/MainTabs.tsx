import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GlassView } from 'expo-glass-effect';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fontFamily, radius, shadows } from '../theme';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { TripListScreen } from '../screens/trips/TripListScreen';
import { PeopleScreen } from '../screens/people/PeopleScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { MainTabsParamList } from './types';

const Tab = createBottomTabNavigator<MainTabsParamList>();

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

  return (
    <View pointerEvents="box-none" style={[styles.tabBarWrap, { bottom: bottomOffset }]}>
      <View style={styles.tabBarFrame}>
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
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true
                });

                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name as never);
                }
              };

              const onLongPress = () => {
                navigation.emit({
                  type: 'tabLongPress',
                  target: route.key
                });
              };

              return (
                <Pressable
                  accessibilityLabel={options?.tabBarAccessibilityLabel}
                  accessibilityRole="button"
                  accessibilityState={focused ? { selected: true } : {}}
                  key={route.key}
                  onLongPress={onLongPress}
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
