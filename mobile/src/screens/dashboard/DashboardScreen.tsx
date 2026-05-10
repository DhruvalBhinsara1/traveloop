import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import {
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from 'react-native';

import { Stop, Trip } from '../../api/types';
import { TripCard } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { colors, fontFamily, radius, shadows, typography } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { useTrips } from '../../hooks/useTrips';
import { calcStopSubtotal, calcTotal, formatMoney } from '../../utils/budgetCalc';
import { categoryIcon, getDestinationImage } from '../../utils/photos';
import { formatDateRange, getTripDays, isUpcoming } from '../../utils/dateHelpers';
import { CreateTripSheet } from '../trips/CreateTripSheet';
import { TripDetailTabParamList } from '../../navigation/types';

type Props = {
  navigation: any;
};

type PlacePreview = {
  stop: Stop;
  trip: Trip;
};

const CONTENT_PADDING = 20;
const TOOL_GAP = 10;
const MAX_TIMELINE_STOPS = 3;

export function DashboardScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { trips, refreshing, refresh, createTrip } = useTrips();
  const [createVisible, setCreateVisible] = useState(false);
  const { width } = useWindowDimensions();
  const contentWidth = Math.max(0, width - CONTENT_PADDING * 2);
  const recentCardWidth = Math.min(270, contentWidth * 0.76);
  const placeCardWidth = Math.min(190, contentWidth * 0.5);

  const sortedTrips = useMemo(() => {
    return [...trips].sort((a, b) => getTripTime(b) - getTripTime(a));
  }, [trips]);

  const nextTrip = useMemo(() => {
    const upcoming = [...trips]
      .filter((trip) => isUpcoming(trip.startDate))
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    return upcoming[0] ?? sortedTrips[0];
  }, [sortedTrips, trips]);

  const places = useMemo(() => getRealPlaces(sortedTrips), [sortedTrips]);
  const recentTrips = sortedTrips.filter((trip) => trip.id !== nextTrip?.id).slice(0, 4);
  const firstName = user?.name?.split(' ')[0] ?? 'Traveler';

  const openTrip = (trip: Trip, initialTab?: keyof TripDetailTabParamList) => navigation.navigate('TripDetail', { tripId: trip.id, initialTab });
  const openPlanningTool = (tool: PlanningToolKey) => {
    if (tool === 'new' || !nextTrip) {
      setCreateVisible(true);
      return;
    }

    const tabMap: Record<Exclude<PlanningToolKey, 'new'>, keyof TripDetailTabParamList> = {
      itinerary: 'Itinerary',
      budget: 'Budget',
      checklist: 'Checklist'
    };

    openTrip(nextTrip, tabMap[tool]);
  };

  return (
    <Screen
      backgroundColor={colors.background}
      contentContainerStyle={styles.screenContent}
      onRefresh={refresh}
      refreshing={refreshing}
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text numberOfLines={1} style={styles.greeting}>
            Hi, {firstName} 👋
          </Text>
          <Text numberOfLines={1} style={styles.subtitle}>Where are we planning next?</Text>
        </View>
        <Pressable
          accessibilityLabel="Open profile"
          accessibilityRole="button"
          hitSlop={2}
          onPress={() => navigation.navigate('Profile')}
          style={({ pressed }) => [styles.avatarButton, pressed && styles.pressed]}
        >
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarInitial}>{firstName.charAt(0).toUpperCase()}</Text>
          )}
        </Pressable>
      </View>

      {nextTrip ? (
        <NextTripCard trip={nextTrip} onPress={() => openTrip(nextTrip)} />
      ) : (
        <EmptyJourneyCard onCreate={() => setCreateVisible(true)} />
      )}

      <TimelineSection trip={nextTrip} onPress={() => (nextTrip ? openTrip(nextTrip) : setCreateVisible(true))} />

      <View style={styles.section}>
        <DashboardSectionHeader title="Planning Tools" />
        <PlanningTools activeTrip={nextTrip} onPress={openPlanningTool} />
      </View>

      {recentTrips.length ? (
        <View style={styles.section}>
          <DashboardSectionHeader title="Recent Trips" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          >
            {recentTrips.map((trip) => (
              <View key={trip.id} style={[styles.recentCard, { width: recentCardWidth }]}>
                <TripCard trip={trip} height={132} onPress={() => openTrip(trip)} />
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {places.length ? (
        <View style={styles.section}>
          <DashboardSectionHeader title="Places From Your Trips" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          >
            {places.slice(0, 8).map(({ stop, trip }) => (
              <View key={`${trip.id}-${stop.id}`} style={[styles.placeCardWrap, { width: placeCardWidth }]}>
                <PlaceCard place={stop} trip={trip} onPress={() => openTrip(trip)} />
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <CreateTripSheet
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onSubmit={createTrip}
        onCreated={(trip) => navigation.navigate('TripDetail', { tripId: trip.id, initialTab: 'Itinerary' })}
      />
    </Screen>
  );
}

function NextTripCard({ trip, onPress }: { trip: Trip; onPress: () => void }) {
  const stops = [...(trip.stops ?? [])].sort((a, b) => a.order - b.order);
  const activityCount = stops.reduce((count, stop) => count + (stop.activities?.length ?? 0), 0);
  const cityCount = stops.length;
  const total = calcTotal(stops);
  const budget = Number(trip.budget ?? 0);
  const budgetPercent = budget ? Math.min(100, Math.round((total / budget) * 100)) : 0;
  const coverImage = trip.coverImage ?? getDestinationImage(stops[0]?.cityName ?? trip.title);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Continue planning ${trip.title}`}
      onPress={onPress}
      style={({ pressed }) => [styles.nextCard, pressed && styles.pressedCard]}
    >
      <ImageBackground source={{ uri: coverImage }} resizeMode="cover" style={styles.nextCardImage}>
        <LinearGradient
          colors={['rgba(15,23,20,0.08)', 'rgba(15,23,20,0.28)', 'rgba(15,23,20,0.82)']}
          locations={[0, 0.46, 1]}
          style={styles.nextOverlay}
        >
          <View style={styles.nextTopRow}>
            <View style={styles.nextAction}>
              <Ionicons name="ellipsis-horizontal" size={18} color={colors.charcoal} />
            </View>
          </View>

          <View style={styles.nextCopy}>
            <Text numberOfLines={1} style={styles.nextTitle}>{trip.title}</Text>
            <View style={styles.nextMetaRow}>
              <Ionicons name="calendar-clear-outline" size={13} color="rgba(255,255,255,0.86)" />
              <Text numberOfLines={1} style={styles.nextMeta}>
                {formatDateRange(trip.startDate, trip.endDate)} · {getTripDays(trip.startDate, trip.endDate)} days
              </Text>
            </View>
            <View style={styles.nextChipRow}>
              <MetricChip icon="map-outline" label={plural(cityCount, 'city')} />
              <MetricChip icon="sparkles-outline" label={plural(activityCount, 'activity')} />
              <MetricChip icon="wallet-outline" label={budget ? `${budgetPercent}% budget` : 'Budget open'} />
            </View>
          </View>

          <View style={styles.continuePill}>
            <Text style={styles.continueText}>Continue Planning</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.charcoal} />
          </View>
        </LinearGradient>
      </ImageBackground>
    </Pressable>
  );
}

function EmptyJourneyCard({ onCreate }: { onCreate: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Create your first trip"
      onPress={onCreate}
      style={({ pressed }) => [styles.emptyJourneyCard, pressed && styles.pressedCard]}
    >
      <View style={styles.emptyIcon}>
        <Ionicons name="map-outline" size={22} color={colors.primary} />
      </View>
      <View style={styles.emptyCopy}>
        <Text style={styles.emptyTitle}>Plan your first journey</Text>
        <Text style={styles.emptyBody}>Create a trip, add stops, and your timeline will appear here.</Text>
      </View>
      <View style={styles.emptyAction}>
        <Text style={styles.emptyActionText}>New Trip</Text>
        <Ionicons name="arrow-forward" size={16} color={colors.primary} />
      </View>
    </Pressable>
  );
}

function TimelineSection({ trip, onPress }: { trip?: Trip; onPress: () => void }) {
  if (!trip) return null;

  return (
    <View style={styles.section}>
      <DashboardSectionHeader
        actionLabel="View All"
        onAction={onPress}
        title="Itinerary Timeline"
        titleSuffix="Preview"
      />
      <TimelinePreview trip={trip} onPress={onPress} />
    </View>
  );
}

function TimelinePreview({ trip, onPress }: { trip: Trip; onPress: () => void }) {
  const stops = [...(trip.stops ?? [])].sort((a, b) => a.order - b.order).slice(0, MAX_TIMELINE_STOPS);

  if (!stops.length) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open trip to add itinerary stops"
        onPress={onPress}
        style={({ pressed }) => [styles.timelineEmpty, pressed && styles.pressedCard]}
      >
        <View style={styles.timelineEmptyIcon}>
          <Ionicons name="map-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.grow}>
          <Text style={styles.timelineCity}>No stops yet</Text>
          <Text style={styles.timelineDates}>Add cities to preview this itinerary.</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${trip.title} itinerary`}
      onPress={onPress}
      style={({ pressed }) => [styles.timelineCard, pressed && styles.pressedCard]}
    >
      <View style={styles.timelineRail} />
      {stops.map((stop, index) => {
        const activities = stop.activities ?? [];
        const subtotal = calcStopSubtotal(stop);

        return (
          <View key={stop.id} style={[styles.timelineRow, index === stops.length - 1 && styles.timelineRowLast]}>
            <View style={styles.timelineDot} />
            <Image source={{ uri: getDestinationImage(stop.cityName) }} style={styles.timelineImage} />
            <View style={styles.timelineText}>
              <Text numberOfLines={1} style={styles.timelineCity}>{stop.cityName}</Text>
              <Text numberOfLines={1} style={styles.timelineDates}>
                {formatDateRange(stop.arrivalDate, stop.departDate)}
              </Text>
              <View style={styles.timelineActivityRow}>
                <Text numberOfLines={1} style={styles.timelineActivityText}>
                  {plural(activities.length, 'activity')}
                </Text>
                {activities.slice(0, 3).map((activity) => (
                  <View key={activity.id} style={styles.timelineActivityIcon}>
                    <Ionicons name={categoryIcon(activity.category)} size={10} color={colors.primary} />
                  </View>
                ))}
              </View>
            </View>
            <Text numberOfLines={1} style={styles.timelineCost}>
              {subtotal ? formatMoney(subtotal) : 'Open'}
            </Text>
          </View>
        );
      })}
    </Pressable>
  );
}

type PlanningToolKey = 'new' | 'itinerary' | 'budget' | 'checklist';

function PlanningTools({
  activeTrip,
  onPress
}: {
  activeTrip?: Trip;
  onPress: (tool: PlanningToolKey) => void;
}) {
  const tools: Array<{ key: PlanningToolKey; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
    { key: 'new', label: 'New Trip', icon: 'add' },
    { key: 'itinerary', label: 'Itinerary', icon: 'map-outline' },
    { key: 'budget', label: 'Budget', icon: 'wallet-outline' },
    { key: 'checklist', label: 'Checklist', icon: 'checkbox-outline' }
  ];

  return (
    <View style={styles.toolRow}>
      {tools.map((tool) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            tool.key === 'new'
              ? 'Create a new trip'
              : activeTrip
                ? `Open ${tool.label.toLowerCase()} for ${activeTrip.title}`
                : `Create a trip to use ${tool.label.toLowerCase()}`
          }
          key={tool.key}
          onPress={() => onPress(tool.key)}
          style={({ pressed }) => [styles.toolTile, pressed && styles.pressed]}
        >
          <View style={[styles.toolIcon, tool.key === 'new' && styles.toolIconActive]}>
            <Ionicons name={tool.icon} size={22} color={tool.key === 'new' ? colors.white : colors.primary} />
          </View>
          <Text numberOfLines={1} style={styles.toolLabel}>{tool.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function PlaceCard({ place, trip, onPress }: { place: Stop; trip: Trip; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${trip.title} from ${place.cityName}`}
      onPress={onPress}
      style={({ pressed }) => [styles.placeCard, pressed && styles.pressed]}
    >
      <Image source={{ uri: getDestinationImage(place.cityName) }} style={styles.placeImage} />
      <View style={styles.placeCardCopy}>
        <Text numberOfLines={1} style={styles.placeTitle}>{place.cityName}</Text>
        <Text numberOfLines={1} style={styles.placeMeta}>
          {place.country} · {trip.title}
        </Text>
      </View>
      <View style={styles.placeArrow}>
        <Ionicons name="arrow-forward" size={15} color={colors.primary} />
      </View>
    </Pressable>
  );
}

function DashboardSectionHeader({
  actionLabel,
  onAction,
  title,
  titleSuffix
}: {
  actionLabel?: string;
  onAction?: () => void;
  title: string;
  titleSuffix?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>
        {title}
        {titleSuffix ? <Text style={styles.sectionTitleSuffix}> ({titleSuffix})</Text> : null}
      </Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}>
          <Text style={styles.viewAll}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function MetricChip({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.metricChip}>
      <Ionicons name={icon} size={12} color={colors.white} />
      <Text numberOfLines={1} style={styles.metricChipText}>{label}</Text>
    </View>
  );
}

function getTripTime(trip: Trip) {
  return new Date(trip.updatedAt ?? trip.createdAt ?? trip.startDate).getTime();
}

function getRealPlaces(trips: Trip[]): PlacePreview[] {
  const seen = new Set<string>();
  const places: PlacePreview[] = [];

  trips.forEach((trip) => {
    [...(trip.stops ?? [])]
      .sort((a, b) => a.order - b.order)
      .forEach((stop) => {
        const key = `${stop.cityName.trim().toLowerCase()}-${stop.country.trim().toLowerCase()}`;
        if (!key || seen.has(key)) return;
        seen.add(key);
        places.push({ stop, trip });
      });
  });

  return places;
}

function plural(count: number, label: string) {
  const pluralLabel = label.endsWith('y') ? `${label.slice(0, -1)}ies` : `${label}s`;
  return `${count} ${count === 1 ? label : pluralLabel}`;
}

const styles = StyleSheet.create({
  screenContent: {
    paddingTop: 8,
    paddingBottom: 104
  },
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  headerCopy: {
    flex: 1,
    minWidth: 0
  },
  greeting: {
    color: colors.charcoal,
    fontFamily: fontFamily.headingExtraBold,
    fontSize: 24,
    fontWeight: typography.weight.extrabold,
    lineHeight: 30
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 1
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  avatarImage: {
    width: 38,
    height: 38,
    borderRadius: 19
  },
  avatarInitial: {
    color: colors.charcoal,
    fontFamily: fontFamily.headingBold,
    fontSize: 16,
    lineHeight: 20
  },
  nextCard: {
    height: 204,
    marginTop: 18,
    borderRadius: radius.card,
    overflow: 'hidden',
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card
  },
  nextCardImage: {
    flex: 1
  },
  nextOverlay: {
    flex: 1,
    padding: 16
  },
  nextTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end'
  },
  nextBadge: {
    minHeight: 24,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.frostedDark
  },
  nextBadgeText: {
    color: colors.white,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 11,
    lineHeight: 14
  },
  nextAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.frostedWhite
  },
  nextCopy: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 70,
    gap: 6
  },
  nextTitle: {
    color: colors.white,
    fontFamily: fontFamily.headingExtraBold,
    fontSize: 24,
    fontWeight: typography.weight.extrabold,
    lineHeight: 30,
    textShadowColor: 'rgba(0,0,0,0.22)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5
  },
  nextMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5
  },
  nextMeta: {
    color: 'rgba(255,255,255,0.88)',
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: 12,
    lineHeight: 16
  },
  nextChipRow: {
    flexDirection: 'row',
    gap: 6
  },
  metricChip: {
    flexShrink: 1,
    maxWidth: 150,
    minHeight: 25,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.24)'
  },
  metricChipText: {
    color: colors.white,
    flexShrink: 1,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 11,
    lineHeight: 14
  },
  continuePill: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    height: 46,
    borderRadius: 23,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.frostedWhite
  },
  continueText: {
    color: colors.charcoal,
    fontFamily: fontFamily.headingBold,
    fontSize: 15,
    lineHeight: 20
  },
  emptyJourneyCard: {
    minHeight: 166,
    marginTop: 14,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    justifyContent: 'space-between',
    ...shadows.subtle
  },
  emptyIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight
  },
  emptyCopy: {
    gap: 4
  },
  emptyTitle: {
    color: colors.charcoal,
    fontFamily: fontFamily.headingExtraBold,
    fontSize: 21,
    lineHeight: 26
  },
  emptyBody: {
    color: colors.textMuted,
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 18
  },
  emptyAction: {
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primaryLight
  },
  emptyActionText: {
    color: colors.primary,
    fontFamily: fontFamily.headingBold,
    fontSize: 13,
    lineHeight: 17
  },
  section: {
    marginTop: 18,
    gap: 10
  },
  sectionHeader: {
    minHeight: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  sectionTitle: {
    color: colors.charcoal,
    flex: 1,
    fontFamily: fontFamily.headingBold,
    fontSize: 16,
    lineHeight: 22
  },
  sectionTitleSuffix: {
    color: colors.textMuted,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    lineHeight: 18
  },
  viewAll: {
    color: colors.primary,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    lineHeight: 18
  },
  timelineCard: {
    minHeight: 188,
    position: 'relative',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...shadows.subtle
  },
  timelineRail: {
    position: 'absolute',
    left: 22,
    top: 28,
    bottom: 28,
    width: 2,
    borderRadius: 1,
    backgroundColor: colors.primaryLight
  },
  timelineRow: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100
  },
  timelineRowLast: {
    borderBottomWidth: 0
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 6,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.surface
  },
  timelineImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight
  },
  timelineText: {
    flex: 1,
    minWidth: 0,
    gap: 1
  },
  timelineCity: {
    color: colors.charcoal,
    fontFamily: fontFamily.headingBold,
    fontSize: 14,
    lineHeight: 18
  },
  timelineDates: {
    color: colors.textMuted,
    fontFamily: fontFamily.body,
    fontSize: 11,
    lineHeight: 15
  },
  timelineActivityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  timelineActivityText: {
    color: colors.textMuted,
    fontFamily: fontFamily.body,
    fontSize: 11,
    lineHeight: 15
  },
  timelineActivityIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight
  },
  timelineCost: {
    width: 58,
    color: colors.charcoal,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'right'
  },
  timelineEmpty: {
    minHeight: 84,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...shadows.subtle
  },
  timelineEmptyIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight
  },
  toolRow: {
    flexDirection: 'row',
    gap: TOOL_GAP
  },
  toolTile: {
    flex: 1,
    height: 72,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  toolIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight
  },
  toolIconActive: {
    backgroundColor: colors.primary
  },
  toolLabel: {
    color: colors.charcoal,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 11,
    lineHeight: 14
  },
  horizontalList: {
    gap: 12,
    paddingRight: CONTENT_PADDING
  },
  recentCard: {
    height: 132
  },
  placeCardWrap: {
    height: 148
  },
  placeCard: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 8,
    position: 'relative',
    ...shadows.subtle
  },
  placeImage: {
    width: '100%',
    height: 78,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight
  },
  placeCardCopy: {
    marginTop: 8,
    paddingRight: 30,
    gap: 1
  },
  placeTitle: {
    color: colors.charcoal,
    fontFamily: fontFamily.headingBold,
    fontSize: 14,
    lineHeight: 18
  },
  placeMeta: {
    color: colors.textMuted,
    fontFamily: fontFamily.body,
    fontSize: 12,
    lineHeight: 16
  },
  placeArrow: {
    position: 'absolute',
    right: 8,
    bottom: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight
  },
  grow: {
    flex: 1,
    minWidth: 0
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }]
  },
  pressedCard: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }]
  }
});
