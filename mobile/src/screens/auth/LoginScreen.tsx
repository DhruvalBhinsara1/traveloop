import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ImageBackground, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { getErrorMessage } from '../../api/client';
import { Button } from '../../components/Button';
import { InputField } from '../../components/InputField';
import { colors, typography } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { photos } from '../../utils/photos';
import { validateEmail } from '../../utils/validation';
import { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!validateEmail(email)) {
      setError('Enter a valid email');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground source={{ uri: photos.default }} style={styles.bg}>
      <LinearGradient colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.65)']} style={styles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.wrap}>
          <View style={styles.brand}>
            <Text style={styles.wordmark}>Traveloop</Text>
            <Text style={styles.display}>Journeys Made Simple</Text>
          </View>
          <View style={styles.sheet}>
            <InputField label="Email" value={email} onChangeText={setEmail} placeholder="riya@email.com" keyboardType="email-address" />
            <InputField label="Password" value={password} onChangeText={setPassword} placeholder="8+ characters" secureTextEntry />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button label="Login" onPress={submit} loading={loading} icon="log-in-outline" />
            <Pressable onPress={() => navigation.navigate('Signup')} style={styles.switcher}>
              <Text style={styles.switchText}>Don't have an account? Sign up</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1
  },
  overlay: {
    flex: 1
  },
  wrap: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 70
  },
  brand: {
    gap: 12
  },
  wordmark: {
    fontFamily: 'Nunito_900Black',
    fontSize: 24,
    color: colors.white
  },
  display: {
    ...typography.display,
    maxWidth: 280,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4
  },
  sheet: {
    borderRadius: 28,
    backgroundColor: colors.frostedWhite,
    padding: 18,
    gap: 14
  },
  error: {
    ...typography.caption,
    color: colors.danger
  },
  switcher: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center'
  },
  switchText: {
    ...typography.bodyMedium,
    color: colors.primary
  }
});
