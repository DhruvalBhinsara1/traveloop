import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet } from 'react-native';

import { colors } from '../theme';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { TripListScreen } from '../screens/trips/TripListScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { MainTabsParamList } from './types';

const Tab = createBottomTabNavigator<MainTabsParamList>();

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray400,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ color, focused }) => {
          const icons = {
            Home: focused ? 'home' : 'home-outline',
            Trips: focused ? 'map' : 'map-outline',
            Profile: focused ? 'person' : 'person-outline'
          } as const;
          return <Ionicons name={icons[route.name]} size={26} color={color} />;
        }
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Trips" component={TripListScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    minHeight: 64,
    borderTopColor: colors.gray100,
    backgroundColor: colors.white,
    paddingTop: 8
  },
  tabLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 11
  }
});
