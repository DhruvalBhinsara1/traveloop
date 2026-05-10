import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Trip } from '../../api/types';
import { calcTotal, formatMoney } from '../../utils/budgetCalc';
import { formatDateRange, getTripDays } from '../../utils/dateHelpers';
import { colors, fonts, radii, spacing } from '../../utils/theme';

type TripCardProps = {
  trip: Trip;
  onPress: () => void;
  compact?: boolean;
};

const fallbackImages = [
  'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80'
];

export const getTripImage = (trip: Trip) => {
  if (trip.coverImage) return trip.coverImage;
  const index = Math.abs(trip.title.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)) % fallbackImages.length;
  return fallbackImages[index];
};

export function TripCard({ trip, onPress, compact = false }: TripCardProps) {
  const cityCount = trip.stops?.length ?? 0;
  const total = calcTotal(trip.stops ?? []);

  return (
    <Pressable onPress={onPress} style={[styles.card, compact && styles.compactCard]}>
      <ImageBackground source={{ uri: getTripImage(trip) }} style={styles.image} imageStyle={styles.imageRadius}>
        <LinearGradient colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.78)']} style={styles.gradient}>
          <View style={styles.topRow}>
            <View style={styles.badge}>
              <Ionicons name={trip.isPublic ? 'globe-outline' : 'lock-closed-outline'} size={13} color={colors.white} />
              <Text style={styles.badgeText}>{trip.isPublic ? 'Public' : 'Private'}</Text>
            </View>
            <View style={styles.iconBubble}>
              <Ionicons name="arrow-forward" size={18} color={colors.charcoal} />
            </View>
          </View>

          <View>
            <Text style={styles.dateText}>{formatDateRange(trip.startDate, trip.endDate)}</Text>
            <Text numberOfLines={1} style={[styles.title, compact && styles.compactTitle]}>
              {trip.title}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.meta}>{cityCount} {cityCount === 1 ? 'city' : 'cities'}</Text>
              <View style={styles.dot} />
              <Text style={styles.meta}>{getTripDays(trip.startDate, trip.endDate)} days</Text>
              <View style={styles.dot} />
              <Text style={styles.meta}>{formatMoney(total || trip.budget || 0)}</Text>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 210,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.gray100
  },
  compactCard: {
    width: 280,
    height: 190,
    marginRight: spacing.md
  },
  image: {
    flex: 1
  },
  imageRadius: {
    borderRadius: radii.lg
  },
  gradient: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'space-between'
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(0,0,0,0.34)'
  },
  badgeText: {
    color: colors.white,
    fontFamily: fonts.label,
    fontSize: 12
  },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center'
  },
  dateText: {
    color: 'rgba(255,255,255,0.86)',
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    marginBottom: spacing.xs
  },
  title: {
    color: colors.white,
    fontFamily: fonts.heading,
    fontSize: 25
  },
  compactTitle: {
    fontSize: 22
  },
  metaRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  meta: {
    color: 'rgba(255,255,255,0.9)',
    fontFamily: fonts.bodyMedium,
    fontSize: 13
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.7)'
  }
});
