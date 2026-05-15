import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Toast, { ToastConfig, ToastConfigParams } from 'react-native-toast-message';

import { AuthProvider } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { RootStackParamList } from './src/navigation/types';
import { colors, fontFamily, radius, shadows } from './src/theme';

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['traveloop://'],
  config: {
    screens: {
      PublicTrip: 'public/:shareToken'
    }
  }
};

const toastMeta = {
  success: {
    icon: 'checkmark-circle' as const,
    color: colors.success,
    backgroundColor: colors.successSoft
  },
  error: {
    icon: 'alert-circle' as const,
    color: colors.danger,
    backgroundColor: colors.dangerSoft
  },
  info: {
    icon: 'information-circle' as const,
    color: colors.primary,
    backgroundColor: colors.primaryLight
  }
};

const renderToast = ({ type, text1, text2 }: ToastConfigParams<unknown>) => {
  const meta = toastMeta[type as keyof typeof toastMeta] ?? toastMeta.info;

  return (
    <View style={styles.toastShell}>
      <View style={[styles.toastIcon, { backgroundColor: meta.backgroundColor }]}>
        <Ionicons name={meta.icon} size={20} color={meta.color} />
      </View>
      <View style={styles.toastCopy}>
        {text1 ? <Text numberOfLines={1} style={styles.toastTitle}>{text1}</Text> : null}
        {text2 ? <Text numberOfLines={2} style={styles.toastBody}>{text2}</Text> : null}
      </View>
    </View>
  );
};

const toastConfig: ToastConfig = {
  success: renderToast,
  error: renderToast,
  info: renderToast
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
    <GestureHandlerRootView style={styles.appRoot}>
      <NavigationContainer linking={linking}>
        <AuthProvider>
          <AppNavigator />
          <Toast config={toastConfig} position="top" topOffset={54} />
        </AuthProvider>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  appRoot: {
    flex: 1
  },
  toastShell: {
    width: '92%',
    minHeight: 64,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    ...shadows.card
  },
  toastIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center'
  },
  toastCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1
  },
  toastTitle: {
    color: colors.charcoal,
    fontFamily: fontFamily.label,
    fontSize: 14,
    lineHeight: 19
  },
  toastBody: {
    color: colors.gray600,
    fontFamily: fontFamily.body,
    fontSize: 12,
    lineHeight: 17
  }
});
