import { Ionicons } from '@expo/vector-icons';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';

import { getErrorMessage } from '../../api/client';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/Button';
import { InputField } from '../../components/InputField';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import { useTrips } from '../../hooks/useTrips';
import type { MainTabParamList } from '../../navigation/types';
import { colors, fontFamily, radius, shadows, spacing, typography } from '../../theme';
import { pickImageFromDevice } from '../../utils/mediaPicker';
import { normalizeUsername, validateUsername } from '../../utils/validation';

type Props = BottomTabScreenProps<MainTabParamList, 'Profile'>;

export function ProfileScreen(_props: Props) {
  const { user, signOut, updateAvatar, updateProfile } = useAuth();
  const { stats, loadTrips } = useTrips();
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [usernameDraft, setUsernameDraft] = useState('');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadTrips();
    }, [loadTrips])
  );

  const initials = useMemo(() => {
    return (
      user?.name
        ?.split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('') || 'TL'
    );
  }, [user?.name]);

  const changeAvatar = async () => {
    if (avatarUploading) return;

    const result = await pickImageFromDevice({
      title: 'Update Profile Photo',
      aspect: [1, 1],
      quality: 0.82
    });

    if (result.status === 'permission-denied') {
      Toast.show({
        type: 'error',
        text1: result.source === 'camera' ? 'Camera access needed' : 'Photo access needed',
        text2: result.source === 'camera' ? 'Allow camera access to take a profile photo.' : 'Allow photo access to update your profile photo.'
      });
      return;
    }

    if (result.status !== 'selected') return;

    setAvatarUploading(true);
    try {
      await updateAvatar(result.image);
      Toast.show({ type: 'success', text1: 'Profile photo updated' });
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Could not update photo', text2: getErrorMessage(error) });
    } finally {
      setAvatarUploading(false);
    }
  };

  const confirmLogout = () => {
    Alert.alert('Log out?', 'You can log back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: signOut }
    ]);
  };

  const copyUsername = async () => {
    if (!user?.username) return;
    await Clipboard.setStringAsync(user.username);
    Toast.show({ type: 'success', text1: 'Username copied' });
  };

  const openEditProfile = () => {
    setNameDraft(user?.name ?? '');
    setUsernameDraft(user?.username ?? '');
    setProfileError(null);
    setEditVisible(true);
  };

  const saveProfile = async () => {
    const nextName = nameDraft.trim();
    const nextUsername = normalizeUsername(usernameDraft);

    if (!nextName) {
      setProfileError('Name is required');
      return;
    }

    if (nextName.length > 60) {
      setProfileError('Name must be 60 characters or fewer');
      return;
    }

    if (!validateUsername(nextUsername)) {
      setProfileError('Username must be 3-24 letters, numbers, or underscores');
      return;
    }

    setProfileSaving(true);
    try {
      await updateProfile({ name: nextName, username: nextUsername });
      setEditVisible(false);
      Toast.show({ type: 'success', text1: 'Profile updated' });
    } catch (error) {
      setProfileError(getErrorMessage(error));
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <Screen backgroundColor={colors.background} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Account</Text>
          <Text style={styles.title}>Profile</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Log out" onPress={confirmLogout} style={styles.headerAction}>
          <Ionicons name="log-out-outline" size={20} color={colors.charcoal} />
        </Pressable>
      </View>

      <View style={styles.profileCard}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change profile photo"
          accessibilityState={{ disabled: avatarUploading, busy: avatarUploading }}
          disabled={avatarUploading}
          onPress={changeAvatar}
          style={({ pressed }) => [styles.avatarWrap, pressed && styles.pressed]}
        >
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
          <View style={styles.cameraBadge}>
            {avatarUploading ? <ActivityIndicator size="small" color={colors.white} /> : <Ionicons name="camera-outline" size={17} color={colors.white} />}
          </View>
        </Pressable>

        <Text numberOfLines={1} style={styles.name}>{user?.name ?? 'Traveler'}</Text>
        <Text numberOfLines={1} style={styles.username}>@{user?.username ?? 'traveler'}</Text>
        <Text numberOfLines={1} style={styles.email}>{user?.email ?? 'Signed in'}</Text>
      </View>

      <View style={styles.statRow}>
        <ProfileStat label="Trips" value={`${stats.totalTrips}`} />
        <ProfileStat label="Countries" value={`${stats.countries}`} />
        <ProfileStat label="Soon" value={`${stats.upcoming}`} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.sectionCard}>
          <ActionRow icon="create-outline" label="Edit name and username" onPress={openEditProfile} />
          <ActionRow icon="camera-outline" label="Change profile photo" onPress={changeAvatar} loading={avatarUploading} />
          <ActionRow icon="copy-outline" label="Copy username" onPress={copyUsername} />
          <InfoRow icon="at-outline" label="Username" value={`@${user?.username ?? 'traveler'}`} />
          <InfoRow icon="mail-outline" label="Email" value={user?.email ?? 'Signed in'} />
        </View>
      </View>

      <Pressable style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]} onPress={confirmLogout}>
        <Ionicons name="log-out-outline" size={20} color={colors.white} />
        <Text style={styles.logoutText}>Log Out</Text>
      </Pressable>

      <BottomSheet visible={editVisible} title="Edit Profile" onClose={() => setEditVisible(false)}>
        <InputField label="Name" value={nameDraft} onChangeText={setNameDraft} placeholder="Your name" />
        <InputField
          label="Username"
          value={usernameDraft}
          onChangeText={setUsernameDraft}
          placeholder="your_username"
          helperText="Usernames are unique and used by friends to find you."
          autoCapitalize="none"
          autoCorrect={false}
        />
        {profileError ? <Text style={styles.errorText}>{profileError}</Text> : null}
        <Button label="Save Profile" icon="checkmark-circle-outline" onPress={saveProfile} loading={profileSaving} />
      </BottomSheet>
    </Screen>
  );
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.profileStat}>
      <Text style={styles.profileStatValue}>{value}</Text>
      <Text style={styles.profileStatLabel}>{label}</Text>
    </View>
  );
}

function ActionRow({
  icon,
  label,
  onPress,
  loading
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  loading?: boolean;
}) {
  return (
    <Pressable disabled={loading} onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed, loading && styles.disabled]}>
      <View style={styles.rowIcon}>
        {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name={icon} size={19} color={colors.primary} />}
      </View>
      <Text style={[styles.rowLabel, styles.rowLabelGrow]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
    </Pressable>
  );
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={19} color={colors.primary} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text numberOfLines={1} style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 10,
    paddingBottom: 118,
    gap: 18
  },
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  eyebrow: {
    color: colors.textMuted,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    textTransform: 'uppercase'
  },
  title: {
    color: colors.charcoal,
    fontFamily: fontFamily.headingExtraBold,
    fontSize: 28,
    lineHeight: 34
  },
  headerAction: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  profileCard: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 18,
    alignItems: 'center',
    ...shadows.subtle
  },
  avatarWrap: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  avatarImage: {
    width: 104,
    height: 104,
    borderRadius: 52
  },
  avatarFallback: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary
  },
  avatarText: {
    color: colors.white,
    fontFamily: fontFamily.headingExtraBold,
    fontSize: 30,
    lineHeight: 36
  },
  cameraBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.surface
  },
  name: {
    marginTop: 14,
    color: colors.charcoal,
    fontFamily: fontFamily.headingExtraBold,
    fontSize: 24,
    lineHeight: 30
  },
  email: {
    color: colors.textMuted,
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2
  },
  username: {
    color: colors.primary,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 14,
    lineHeight: 18,
    marginTop: 2
  },
  statRow: {
    flexDirection: 'row',
    gap: 10
  },
  profileStat: {
    flex: 1,
    minHeight: 78,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center'
  },
  profileStatValue: {
    color: colors.charcoal,
    fontFamily: fontFamily.headingExtraBold,
    fontSize: 24,
    lineHeight: 30
  },
  profileStatLabel: {
    color: colors.textMuted,
    fontFamily: fontFamily.body,
    fontSize: 12,
    lineHeight: 16
  },
  section: {
    gap: 8
  },
  sectionTitle: {
    ...typography.label,
    color: colors.charcoal
  },
  sectionCard: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.surface
  },
  row: {
    minHeight: 64,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight
  },
  rowCopy: {
    flex: 1,
    minWidth: 0
  },
  rowLabel: {
    color: colors.charcoal,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 14,
    lineHeight: 18
  },
  rowLabelGrow: {
    flex: 1
  },
  rowValue: {
    color: colors.textMuted,
    fontFamily: fontFamily.body,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2
  },
  logoutButton: {
    minHeight: 54,
    borderRadius: radius.pill,
    backgroundColor: colors.charcoal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm
  },
  logoutText: {
    color: colors.white,
    fontFamily: fontFamily.label,
    fontSize: 15,
    lineHeight: 20
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }]
  },
  disabled: {
    opacity: 0.6
  },
  errorText: {
    ...typography.caption,
    color: colors.danger
  }
});
