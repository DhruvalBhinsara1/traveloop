import { Ionicons } from '@expo/vector-icons';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import type { ReactNode } from 'react';
import { useCallback } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../../context/AuthContext';
import { useTrips } from '../../hooks/useTrips';
import type { MainTabParamList } from '../../navigation/types';
import { colors, fonts, radii, spacing } from '../../utils/theme';

type Props = BottomTabScreenProps<MainTabParamList, 'Profile'>;

export function ProfileScreen(_props: Props) {
  const { user, logout } = useAuth();
  const { stats, loadTrips } = useTrips();

  useFocusEffect(
    useCallback(() => {
      loadTrips(true);
    }, [loadTrips])
  );

  const initials =
    user?.name
      ?.split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'TL';

  const confirmLogout = () => {
    Alert.alert('Log out?', 'You can log back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout }
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{user?.name ?? 'Traveler'}</Text>
          <Text style={styles.email}>{user?.email ?? 'Signed in'}</Text>
        </View>

        <View style={styles.statRow}>
          <ProfileStat label="Trips" value={`${stats.totalTrips}`} />
          <ProfileStat label="Countries" value={`${stats.countries}`} />
          <ProfileStat label="Soon" value={`${stats.upcoming}`} />
        </View>

        <Section title="Account">
          <Row icon="person-outline" label="Edit Name" />
          <Row icon="key-outline" label="Change Password" />
        </Section>

        <Section title="Travel">
          <Row icon="globe-outline" label="Public Trips" />
          <Row icon="download-outline" label="Export Plans" />
        </Section>

        <Pressable style={styles.logoutButton} onPress={confirmLogout}>
          <Ionicons name="log-out-outline" size={20} color={colors.white} />
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function Row({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <Pressable style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={19} color={colors.primary} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={19} color={colors.gray400} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: spacing.lg,
    paddingBottom: 110
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8
  },
  avatarText: {
    fontFamily: fonts.heading,
    color: colors.white,
    fontSize: 30
  },
  name: {
    marginTop: spacing.md,
    fontFamily: fonts.heading,
    color: colors.charcoal,
    fontSize: 26
  },
  email: {
    marginTop: spacing.xs,
    fontFamily: fonts.body,
    color: colors.gray500,
    fontSize: 14
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg
  },
  profileStat: {
    flex: 1,
    borderRadius: radii.lg,
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.gray100,
    paddingVertical: spacing.md,
    alignItems: 'center'
  },
  profileStatValue: {
    fontFamily: fonts.heading,
    color: colors.charcoal,
    fontSize: 23
  },
  profileStatLabel: {
    marginTop: spacing.xs,
    fontFamily: fonts.body,
    color: colors.gray500,
    fontSize: 12
  },
  section: {
    marginTop: spacing.lg
  },
  sectionTitle: {
    fontFamily: fonts.label,
    color: colors.charcoal,
    fontSize: 17,
    marginBottom: spacing.sm
  },
  sectionCard: {
    borderRadius: radii.lg,
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.gray100,
    overflow: 'hidden'
  },
  row: {
    minHeight: 62,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray200
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight
  },
  rowLabel: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    color: colors.charcoal,
    fontSize: 15
  },
  logoutButton: {
    marginTop: spacing.xl,
    minHeight: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.charcoal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm
  },
  logoutText: {
    fontFamily: fonts.label,
    color: colors.white,
    fontSize: 16
  }
});
