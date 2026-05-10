import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text } from 'react-native';

import { getErrorMessage } from '../../api/client';
import { Button } from '../../components/Button';
import { InputField } from '../../components/InputField';
import { Screen } from '../../components/Screen';
import { colors, typography } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { validateEmail } from '../../utils/validation';
import { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

export function SignupScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
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
      await signUp(name.trim(), email.trim(), password);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scrollable={false}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.wrap}>
        <Text style={styles.logo}>Traveloop</Text>
        <Text style={styles.title}>Create your travel loop</Text>
        <InputField label="Name" value={name} onChangeText={setName} placeholder="Riya Sharma" />
        <InputField label="Email" value={email} onChangeText={setEmail} placeholder="riya@email.com" keyboardType="email-address" />
        <InputField label="Password" value={password} onChangeText={setPassword} placeholder="8+ characters" secureTextEntry />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button label="Sign Up" onPress={submit} loading={loading} icon="person-add-outline" />
        <Pressable onPress={() => navigation.navigate('Login')} style={styles.switcher}>
          <Text style={styles.switchText}>Already have an account? Login</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 16
  },
  logo: {
    fontFamily: 'Nunito_900Black',
    fontSize: 24,
    color: colors.primary
  },
  title: {
    ...typography.h1,
    marginBottom: 14
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
