import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';

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
  const { signUp, updateAvatar } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState<{ uri: string; fileName?: string | null; mimeType?: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Allow photo access to add a profile photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.82
    });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setAvatar({ uri: asset.uri, fileName: asset.fileName, mimeType: asset.mimeType });
    setError(null);
  };

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
      if (avatar) {
        try {
          await updateAvatar(avatar);
        } catch (avatarError) {
          Toast.show({ type: 'info', text1: 'Account created', text2: 'Profile photo can be added later.' });
        }
      }
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
        <Pressable accessibilityRole="button" accessibilityLabel="Add profile photo" onPress={pickAvatar} style={({ pressed }) => [styles.avatarPicker, pressed && styles.pressed]}>
          {avatar ? (
            <Image source={{ uri: avatar.uri }} style={styles.avatarPreview} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="camera-outline" size={22} color={colors.primary} />
            </View>
          )}
          <View style={styles.avatarCopy}>
            <Text style={styles.avatarTitle}>{avatar ? 'Profile photo selected' : 'Add profile photo'}</Text>
            <Text style={styles.avatarHint}>Optional, but it makes Traveloop feel yours.</Text>
          </View>
        </Pressable>
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
  },
  avatarPicker: {
    minHeight: 78,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  avatarPreview: {
    width: 54,
    height: 54,
    borderRadius: 27
  },
  avatarPlaceholder: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight
  },
  avatarCopy: {
    flex: 1,
    minWidth: 0
  },
  avatarTitle: {
    ...typography.bodyMedium,
    color: colors.charcoal
  },
  avatarHint: {
    ...typography.caption,
    color: colors.gray600,
    marginTop: 2
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }]
  }
});
