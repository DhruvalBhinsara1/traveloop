import { Ionicons } from '@expo/vector-icons';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useMemo, useState } from 'react';
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

export function ProfileScreen({ navigation }: Props) {
  const { user, signOut, updateAvatar, updateProfile } = useAuth();
  const { stats } = useTrips({ autoRefresh: true });
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [usernameDraft, setUsernameDraft] = useState('');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);

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
    <Screen backgroundColor={colors.white} contentContainerStyle={styles.content}>
      <View style={styles.identity}>
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
        <Text numberOfLines={1} style={styles.email}>{user?.email ?? 'Signed in'}</Text>
        <Text numberOfLines={1} style={styles.username}>@{user?.username ?? 'traveler'}</Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit profile"
          onPress={openEditProfile}
          style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}
        >
          <Text style={styles.editButtonText}>Edit profile</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Travel</Text>
        <View style={styles.groupCard}>
          <ProfileRow
            icon="map-outline"
            label="My trips"
            badge={`${stats.totalTrips}`}
            onPress={() => navigation.navigate('Trips')}
          />
          <ProfileRow
            icon="people-outline"
            label="Friends & groups"
            onPress={() => navigation.navigate('People')}
            isLast
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.groupCard}>
          <ProfileRow icon="camera-outline" label="Profile photo" value="Change" onPress={changeAvatar} loading={avatarUploading} />
          <ProfileRow icon="log-out-outline" label="Logout" onPress={confirmLogout} danger isLast />
        </View>
      </View>

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

function ProfileRow({
  icon,
  label,
  onPress,
  loading,
  value,
  badge,
  danger,
  isLast
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  loading?: boolean;
  value?: string;
  badge?: string;
  danger?: boolean;
  isLast?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [styles.row, isLast && styles.rowLast, pressed && styles.pressed, loading && styles.disabled]}
    >
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Ionicons name={icon} size={19} color={danger ? colors.danger : colors.charcoal} />
        )}
      </View>
      <Text style={[styles.rowLabel, styles.rowLabelGrow, danger && styles.rowLabelDanger]}>{label}</Text>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      {value ? <Text numberOfLines={1} style={styles.rowInlineValue}>{value}</Text> : null}
      {!danger ? <Ionicons name="chevron-forward" size={18} color={colors.gray400} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 42,
    paddingBottom: 118,
    gap: spacing.lg
  },
  identity: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 18
  },
  avatarWrap: {
    width: 98,
    height: 98,
    borderRadius: 49,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: colors.primaryLight
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44
  },
  avatarFallback: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight
  },
  avatarText: {
    color: colors.primary,
    fontFamily: fontFamily.headingExtraBold,
    fontSize: 28,
    lineHeight: 34
  },
  cameraBadge: {
    position: 'absolute',
    right: 1,
    bottom: 1,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.white
  },
  name: {
    marginTop: 18,
    color: colors.charcoal,
    fontFamily: fontFamily.headingExtraBold,
    fontSize: 26,
    lineHeight: 32,
    textAlign: 'center'
  },
  email: {
    color: colors.textMuted,
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
    textAlign: 'center'
  },
  username: {
    color: colors.primary,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
    textAlign: 'center'
  },
  editButton: {
    minHeight: 48,
    marginTop: 18,
    borderRadius: radius.pill,
    paddingHorizontal: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.charcoal,
    ...shadows.subtle
  },
  editButtonText: {
    color: colors.white,
    fontFamily: fontFamily.label,
    fontSize: 15,
    lineHeight: 20
  },
  section: {
    gap: 9
  },
  sectionTitle: {
    color: colors.textMuted,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 1
  },
  groupCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.gray100,
    ...shadows.subtle
  },
  row: {
    minHeight: 66,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray200
  },
  rowLast: {
    borderBottomWidth: 0
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border
  },
  rowIconDanger: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.dangerSoft
  },
  rowLabel: {
    color: colors.charcoal,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 16,
    lineHeight: 22
  },
  rowLabelGrow: {
    flex: 1
  },
  rowLabelDanger: {
    color: colors.danger
  },
  rowInlineValue: {
    maxWidth: 132,
    color: colors.textMuted,
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 18
  },
  badge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary
  },
  badgeText: {
    color: colors.white,
    fontFamily: fontFamily.label,
    fontSize: 13,
    lineHeight: 18
  },
  pressed: {
    opacity: 0.82
  },
  disabled: {
    opacity: 0.6
  },
  errorText: {
    ...typography.caption,
    color: colors.danger
  }
});
