import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black
} from '@expo-google-fonts/nunito';
import {
  DMSans_400Regular,
  DMSans_500Medium
} from '@expo-google-fonts/dm-sans';
import { ActivityIndicator, View } from 'react-native';
import Toast from 'react-native-toast-message';

import { AuthProvider } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { RootStackParamList } from './src/navigation/types';
import { colors } from './src/theme/colors';

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['traveloop://'],
  config: {
    screens: {
      PublicTrip: 'public/:shareToken'
    }
  }
};

export default function App() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
    DMSans_400Regular,
    DMSans_500Medium
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      <AuthProvider>
        <AppNavigator />
        <Toast />
      </AuthProvider>
    </NavigationContainer>
  );
}
