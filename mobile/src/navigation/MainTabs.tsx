import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarButtonProps, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '../theme';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { TripListScreen } from '../screens/trips/TripListScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { MainTabsParamList, RootStackParamList } from './types';

const Tab = createBottomTabNavigator<MainTabsParamList>();

function CreateTabButton(props: BottomTabBarButtonProps) {
  return (
    <Pressable {...props} style={styles.createButton}>
      <Ionicons name="add" size={30} color={colors.white} />
      <Text style={styles.createLabel}>New</Text>
    </Pressable>
  );
}

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
            Create: 'add',
            Profile: focused ? 'person' : 'person-outline'
          } as const;
          return <Ionicons name={icons[route.name]} size={26} color={color} />;
        }
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Trips" component={TripListScreen} />
      <Tab.Screen
        name="Create"
        component={TripListScreen}
        listeners={({ navigation }) => ({
          tabPress: (event) => {
            event.preventDefault();
            navigation.getParent<NativeStackNavigationProp<RootStackParamList>>()?.navigate('CreateTrip');
          }
        })}
        options={{ tabBarButton: (props) => <CreateTabButton {...props} /> }}
      />
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
  },
  createButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 7
  },
  createLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 10,
    color: colors.white,
    marginTop: -3
  }
});
