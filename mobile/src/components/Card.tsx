import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ImageBackground, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadows, typography } from '../theme';
import { formatDateRange } from '../utils/dateHelpers';
import { Trip } from '../api/types';
import { IconButton } from './Button';
import { HapticPressable as Pressable } from './HapticPressable';
import { getDestinationImage } from './photoUtils';

type DestinationCardProps = {
  city: string;
  country: string;
  rating?: string;
  image?: string;
  height?: number;
  onPress?: () => void;
};

export function DestinationCard({ city, country, rating = '5.0', image, height = 220, onPress }: DestinationCardProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.photoCard, { height }, pressed && styles.pressed]}>
      <ImageBackground source={{ uri: image ?? getDestinationImage(city) }} resizeMode="cover" style={styles.image}>
        <View style={styles.cardTopRow}>
          <View style={styles.rating}>
            <Ionicons name="star" size={12} color={colors.warning} />
            <Text style={styles.ratingText}>{rating}</Text>
          </View>
          <IconButton icon="heart-outline" onPress={() => undefined} />
        </View>
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={styles.gradient}>
          <Text style={styles.country}>{country}</Text>
          <View style={styles.titleRow}>
            <Text style={styles.city}>{city}</Text>
            <IconButton icon="arrow-forward" variant="primary" onPress={onPress ?? (() => undefined)} />
          </View>
        </LinearGradient>
      </ImageBackground>
    </Pressable>
  );
}

export function TripCard({
  trip,
  onPress,
  onDelete,
  height = 190
}: {
  trip: Trip;
  onPress: () => void;
  onDelete?: () => void;
  height?: number;
}) {
  const cityCount = trip.stops?.length ?? 0;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.tripCard, { height }, pressed && styles.pressed]}>
      <ImageBackground source={{ uri: trip.coverImage ?? getDestinationImage(trip.stops?.[0]?.cityName ?? trip.title) }} style={styles.image}>
        <LinearGradient colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.72)']} style={styles.tripOverlay}>
          <View style={styles.tripHeader}>
            <View style={styles.badge}>
              <Ionicons name={trip.isPublic ? 'globe-outline' : 'lock-closed-outline'} size={14} color={colors.white} />
              <Text style={styles.badgeText}>{trip.isPublic ? 'Public' : 'Private'}</Text>
            </View>
            {onDelete ? <IconButton icon="trash-outline" variant="danger" onPress={onDelete} /> : null}
          </View>
          <View>
            <Text style={styles.tripTitle}>{trip.title}</Text>
            <Text style={styles.tripMeta}>
              {formatDateRange(trip.startDate, trip.endDate)} - {cityCount} {cityCount === 1 ? 'city' : 'cities'} -{' '}
              {trip.budget ? `$${trip.budget.toLocaleString()}` : 'Budget open'}
            </Text>
          </View>
        </LinearGradient>
      </ImageBackground>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  photoCard: {
    borderRadius: radius.card,
    overflow: 'hidden',
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card
  },
  image: {
    flex: 1
  },
  cardTopRow: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    zIndex: 2,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.30)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  ratingText: {
    fontFamily: 'Nunito_700Bold',
    color: colors.white,
    fontSize: 13
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    minHeight: 110,
    padding: 14,
    justifyContent: 'flex-end'
  },
  country: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.86)',
    textTransform: 'uppercase'
  },
  city: {
    ...typography.h3OnPhoto,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end'
  },
  tripCard: {
    borderRadius: radius.card,
    overflow: 'hidden',
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card
  },
  tripOverlay: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between'
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.frostedDark,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  badgeText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: colors.white
  },
  tripTitle: {
    ...typography.h3OnPhoto
  },
  tripMeta: {
    ...typography.body,
    color: 'rgba(255,255,255,0.84)',
    marginTop: 3
  },
  pressed: {
    opacity: 0.93,
    transform: [{ scale: 0.99 }]
  }
});
