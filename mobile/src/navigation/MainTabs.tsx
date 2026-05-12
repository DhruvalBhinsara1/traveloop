import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, shadows } from '../theme';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { TripListScreen } from '../screens/trips/TripListScreen';
import { PeopleScreen } from '../screens/people/PeopleScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { MainTabsParamList } from './types';

const Tab = createBottomTabNavigator<MainTabsParamList>();

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabBarItem,
        tabBarIconStyle: styles.tabIconSlot,
        tabBarIcon: ({ focused }) => {
          const icons = {
            Home: focused ? 'home' : 'home-outline',
            Trips: focused ? 'map' : 'map-outline',
            People: focused ? 'people' : 'people-outline',
            Profile: focused ? 'person' : 'person-outline'
          } as const;
          return (
            <View style={[styles.tabPill, focused && styles.tabPillActive]}>
              <View style={[styles.tabIconShell, focused && styles.tabIconShellActive]}>
                <Ionicons name={icons[route.name]} size={focused ? 18 : 23} color={focused ? colors.white : colors.gray600} />
              </View>
              <Text numberOfLines={1} style={[styles.tabLabel, focused && styles.tabLabelActive]}>{route.name}</Text>
            </View>
          );
        }
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Trips" component={TripListScreen} />
      <Tab.Screen name="People" component={PeopleScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 18,
    height: 78,
    borderRadius: 39,
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
    ...shadows.card
  },
  tabBarItem: {
    height: 62,
    borderRadius: 31,
    padding: 0
  },
  tabIconSlot: {
    flex: 1,
    width: '100%'
  },
  tabPill: {
    height: 60,
    minWidth: 76,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2
  },
  tabPillActive: {
    backgroundColor: colors.charcoal
  },
  tabIconShell: {
    width: 30,
    height: 28,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  tabIconShellActive: {
    backgroundColor: colors.surfaceOnDark
  },
  tabLabel: {
    color: colors.gray600,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 11,
    lineHeight: 15
  },
  tabLabelActive: {
    color: colors.white,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    lineHeight: 16
  }
});
