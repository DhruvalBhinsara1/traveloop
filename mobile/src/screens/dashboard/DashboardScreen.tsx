import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useMemo, useState } from 'react';
import {
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  StatusBar,
  Text,
  useWindowDimensions,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Stop, Trip } from '../../api/types';
import { HapticPressable as Pressable } from '../../components/HapticPressable';
import { colors, fontFamily, layout, radius, shadows, typography } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { useStagedRefreshControl } from '../../hooks/useStagedRefreshControl';
import { useTrips } from '../../hooks/useTrips';
import { calcStopSubtotal, calcTripTotal, formatMoney } from '../../utils/budgetCalc';
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

type PlanningToolKey = 'new' | 'itinerary' | 'budget' | 'checklist';

const CONTENT_PADDING = 20;
const MAX_TIMELINE_STOPS = 3;

export function DashboardScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { trips, refreshing, refresh, createTrip } = useTrips({ autoRefresh: true });
  const [createVisible, setCreateVisible] = useState(false);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const contentWidth = Math.max(0, width - CONTENT_PADDING * 2);
  const placeCardWidth = Math.min(158, contentWidth * 0.43);
  const topEdgeFill = Math.max(insets.top + 154, 190);
  const bottomEdgeFill = Math.max(insets.bottom + 92, 118);
  const scrollTopInset = Math.max(insets.top, 0);
  const stagedRefresh = useStagedRefreshControl({ refreshing, onRefresh: refresh });

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
  const firstName = user?.name?.split(' ')[0] ?? 'Traveler';

  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle('light-content', true);

      return () => {
        StatusBar.setBarStyle('dark-content', true);
      };
    }, [])
  );

  const openTrip = (trip: Trip, initialTab?: keyof TripDetailTabParamList) => {
    navigation.navigate('TripDetail', { tripId: trip.id, initialTab });
  };

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
    <View style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <LinearGradient
        colors={[colors.heroBlue, colors.heroBlueDeep]}
        end={{ x: 1, y: 1 }}
        pointerEvents="none"
        start={{ x: 0, y: 0 }}
        style={[styles.topEdgeFill, { height: topEdgeFill }]}
      />
      <View pointerEvents="none" style={[styles.bottomEdgeFill, { height: bottomEdgeFill }]} />

      <ScrollView
        alwaysBounceVertical
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={[
          styles.screenContent,
          { paddingBottom: bottomEdgeFill + 24, paddingTop: 12 }
        ]}
        keyboardShouldPersistTaps="handled"
        onMomentumScrollEnd={stagedRefresh.onMomentumScrollEnd}
        onScroll={stagedRefresh.onScroll}
        refreshControl={stagedRefresh.refreshControl}
        scrollEventThrottle={stagedRefresh.scrollEventThrottle}
        showsVerticalScrollIndicator={false}
        style={[styles.scroll, { marginTop: scrollTopInset }]}
      >
        <LinearGradient
          colors={[colors.heroBlue, colors.heroBlueDeep]}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={styles.heroPanel}
        >
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <View style={styles.greetingRow}>
                <Text numberOfLines={1} style={styles.greeting}>
                  Hi, {firstName}
                </Text>
                <Image
                  accessibilityIgnoresInvertColors
                  resizeMode="cover"
                  source={require('../../assets/wave.png')}
                  style={styles.waveIcon}
                />
              </View>
              <Text numberOfLines={1} style={styles.subtitle}>Where to next?</Text>
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
        </LinearGradient>

        <View style={styles.bodySurface}>
          <View style={styles.section}>
            <DashboardSectionHeader title="Planning Tools" />
            <PlanningTools activeTrip={nextTrip} onPress={openPlanningTool} />
          </View>

          <TimelineSection trip={nextTrip} onPress={() => (nextTrip ? openTrip(nextTrip, 'Itinerary') : setCreateVisible(true))} />

          <View style={styles.section}>
            <DashboardSectionHeader title="Places From Your Trips" />
            {places.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                {places.slice(0, 8).map(({ stop, trip }) => (
                  <View key={`${trip.id}-${stop.id}`} style={[styles.placeCardWrap, { width: placeCardWidth }]}>
                    <PlaceCard place={stop} trip={trip} onPress={() => openTrip(trip)} />
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.placesEmpty}>
                <Ionicons name="images-outline" size={20} color={colors.primary} />
                <Text style={styles.placesEmptyText}>Your trip places will appear here after you add stops.</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <CreateTripSheet
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onSubmit={createTrip}
        onCreated={(trip) => navigation.navigate('TripDetail', { tripId: trip.id, initialTab: 'Itinerary' })}
      />
    </View>
  );
}

function NextTripCard({ trip, onPress }: { trip: Trip; onPress: () => void }) {
  const stops = [...(trip.stops ?? [])].sort((a, b) => a.order - b.order);
  const activityCount = stops.reduce((count, stop) => count + (stop.activities?.length ?? 0), 0);
  const cityCount = stops.length;
  const total = calcTripTotal(trip);
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
          colors={['rgba(15,23,20,0.08)', 'rgba(15,23,20,0.34)', 'rgba(15,23,20,0.86)']}
          locations={[0, 0.5, 1]}
          style={styles.nextOverlay}
        >
          <View style={styles.nextCopy}>
            <Text numberOfLines={1} style={styles.nextTitle}>{trip.title}</Text>
            <Text numberOfLines={1} style={styles.nextMeta}>
              {formatDateRange(trip.startDate, trip.endDate)} · {getTripDays(trip.startDate, trip.endDate)} days
            </Text>
            <View style={styles.nextMetricRow}>
              <MetricColumn value={`${cityCount}`} label={cityCount === 1 ? 'city' : 'cities'} />
              <MetricColumn value={`${activityCount}`} label={activityCount === 1 ? 'activity' : 'activities'} />
              <MetricColumn value={budget ? `${budgetPercent}%` : '0%'} label="budget" />
            </View>
          </View>

          <View style={styles.continuePill}>
            <Text style={styles.continueText}>Continue Planning</Text>
            <Ionicons name="arrow-forward" size={24} color={colors.heroBlue} />
          </View>
        </LinearGradient>
      </ImageBackground>
    </Pressable>
  );
}

function MetricColumn({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.metricColumn}>
      <Text numberOfLines={1} style={styles.metricValue}>{value}</Text>
      <Text numberOfLines={1} style={styles.metricLabel}>{label}</Text>
    </View>
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
      <DashboardSectionHeader title="Itinerary Timeline" onAction={onPress} />
      <TimelinePreview trip={trip} onPress={onPress} />
    </View>
  );
}

function TimelinePreview({ trip, onPress }: { trip: Trip; onPress: () => void }) {
  const stops = [...(trip.stops ?? [])].sort((a, b) => a.order - b.order);
  const featuredStop = stops[0];

  if (!featuredStop) {
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
          <Text style={styles.timelineEmptyTitle}>No stops yet</Text>
          <Text style={styles.timelineEmptyBody}>Add cities to preview this itinerary.</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
      </Pressable>
    );
  }

  const activities = featuredStop.activities ?? [];
  const subtotal = calcStopSubtotal(featuredStop);
  const dots = stops.slice(0, MAX_TIMELINE_STOPS);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${trip.title} itinerary`}
      onPress={onPress}
      style={({ pressed }) => [styles.timelinePreview, pressed && styles.pressedCard]}
    >
      <View style={styles.timelineRailWrap}>
        <View style={styles.timelineRail} />
        {dots.map((stop, index) => (
          <View
            key={stop.id}
            style={[
              styles.timelineDot,
              index === 1 && styles.timelineDotCoral,
              index === 2 && styles.timelineDotAqua
            ]}
          />
        ))}
      </View>

      <ImageBackground
        source={{ uri: getDestinationImage(featuredStop.cityName) }}
        resizeMode="cover"
        style={styles.timelineFeatureCard}
      >
        <LinearGradient
          colors={['rgba(15,23,20,0.12)', 'rgba(15,23,20,0.72)']}
          style={styles.timelineFeatureOverlay}
        >
          <Text numberOfLines={1} style={styles.timelineFeatureCity}>{featuredStop.cityName}</Text>
          <Text numberOfLines={1} style={styles.timelineFeatureDates}>
            {formatDateRange(featuredStop.arrivalDate, featuredStop.departDate)}
          </Text>
          <View style={styles.timelineFeatureMeta}>
            <Text style={styles.timelineFeatureText}>{plural(activities.length, 'activity')}</Text>
            {activities.slice(0, 2).map((activity) => (
              <Ionicons key={activity.id} name={categoryIcon(activity.category)} size={17} color={colors.white} />
            ))}
          </View>
          <Text style={styles.timelineFeatureCost}>{subtotal ? formatMoney(subtotal) : 'Plan costs'}</Text>
        </LinearGradient>
      </ImageBackground>
    </Pressable>
  );
}

function PlanningTools({
  activeTrip,
  onPress
}: {
  activeTrip?: Trip;
  onPress: (tool: PlanningToolKey) => void;
}) {
  const tools: Array<{ key: PlanningToolKey; label: string; icon: keyof typeof Ionicons.glyphMap; color: string; surface: string }> = [
    { key: 'new', label: 'New Trip', icon: 'add', color: colors.primary, surface: colors.primaryLight },
    { key: 'itinerary', label: 'Itinerary', icon: 'map', color: colors.coral, surface: colors.coralSoft },
    { key: 'budget', label: 'Budget', icon: 'wallet', color: colors.gold, surface: colors.goldSoft },
    { key: 'checklist', label: 'Checklist', icon: 'checkmark-circle', color: colors.aqua, surface: colors.aquaSoft }
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
          style={({ pressed }) => [styles.toolButton, pressed && styles.pressed]}
        >
          <View style={[styles.toolCircle, { backgroundColor: tool.surface }]}>
            <Ionicons name={tool.icon} size={25} color={tool.color} />
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
      <ImageBackground source={{ uri: getDestinationImage(place.cityName) }} resizeMode="cover" style={styles.placeImage}>
        <LinearGradient colors={['rgba(15,23,20,0.08)', 'rgba(15,23,20,0.62)']} style={styles.placeOverlay}>
          <Text numberOfLines={1} style={styles.placeTitle}>{place.cityName}</Text>
        </LinearGradient>
      </ImageBackground>
    </Pressable>
  );
}

function DashboardSectionHeader({
  onAction,
  title
}: {
  onAction?: () => void;
  title: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}>
          <Ionicons name="arrow-forward" size={18} color={colors.primary} />
        </Pressable>
      ) : null}
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
  root: {
    flex: 1,
    backgroundColor: colors.background
  },
  scroll: {
    flex: 1,
    zIndex: 1
  },
  screenContent: {
    alignSelf: 'center',
    maxWidth: layout.contentMaxWidth,
    paddingHorizontal: CONTENT_PADDING,
    position: 'relative',
    width: '100%'
  },
  topEdgeFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0
  },
  bottomEdgeFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background
  },
  heroPanel: {
    borderRadius: 30,
    backgroundColor: colors.heroBlue,
    padding: 18,
    paddingTop: 24,
    paddingBottom: 18,
    overflow: 'hidden',
    ...shadows.card
  },
  bodySurface: {
    marginHorizontal: -CONTENT_PADDING,
    marginTop: 18,
    paddingHorizontal: CONTENT_PADDING,
    paddingTop: 1,
    backgroundColor: colors.background
  },
  header: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12
  },
  headerCopy: {
    flex: 1,
    minWidth: 0
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  greeting: {
    color: colors.white,
    flexShrink: 1,
    fontFamily: fontFamily.headingExtraBold,
    fontSize: 29,
    fontWeight: typography.weight.extrabold,
    lineHeight: 35
  },
  waveIcon: {
    width: 38,
    height: 38,
    borderRadius: 19
  },
  subtitle: {
    color: 'rgba(255,255,255,0.74)',
    fontFamily: fontFamily.bodyMedium,
    fontSize: 16,
    lineHeight: 21,
    marginTop: 1
  },
  avatarButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.38)'
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28
  },
  avatarInitial: {
    color: colors.white,
    fontFamily: fontFamily.headingBold,
    fontSize: 24,
    lineHeight: 30
  },
  nextCard: {
    height: 214,
    marginTop: 8,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: colors.gray100,
    ...shadows.card
  },
  nextCardImage: {
    flex: 1
  },
  nextOverlay: {
    flex: 1,
    padding: 17,
    justifyContent: 'flex-end'
  },
  nextCopy: {
    marginBottom: 62
  },
  nextTitle: {
    color: colors.white,
    fontFamily: fontFamily.headingExtraBold,
    fontSize: 28,
    fontWeight: typography.weight.extrabold,
    lineHeight: 34,
    textShadowColor: 'rgba(0,0,0,0.28)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5
  },
  nextMeta: {
    color: 'rgba(255,255,255,0.9)',
    fontFamily: fontFamily.bodyMedium,
    fontSize: 15,
    lineHeight: 20,
    marginTop: 2
  },
  nextMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    maxWidth: 236
  },
  metricColumn: {
    minWidth: 58
  },
  metricValue: {
    color: colors.white,
    fontFamily: fontFamily.headingExtraBold,
    fontSize: 20,
    lineHeight: 24
  },
  metricLabel: {
    color: 'rgba(255,255,255,0.88)',
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    lineHeight: 16
  },
  continuePill: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 15,
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    backgroundColor: colors.white,
    ...shadows.subtle
  },
  continueText: {
    color: colors.heroBlue,
    fontFamily: fontFamily.headingExtraBold,
    fontSize: 16,
    lineHeight: 21
  },
  emptyJourneyCard: {
    minHeight: 190,
    marginTop: 6,
    borderRadius: 20,
    backgroundColor: colors.frostedWhite,
    padding: 16,
    justifyContent: 'space-between'
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    fontSize: 22,
    lineHeight: 27
  },
  emptyBody: {
    color: colors.textMuted,
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 18
  },
  emptyAction: {
    height: 40,
    borderRadius: 20,
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
    marginTop: 26,
    gap: 12
  },
  sectionHeader: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  sectionTitle: {
    color: colors.charcoal,
    flex: 1,
    fontFamily: fontFamily.headingExtraBold,
    fontSize: 19,
    lineHeight: 25
  },
  toolRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8
  },
  toolButton: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    minHeight: 96
  },
  toolCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.white,
    ...shadows.subtle
  },
  toolLabel: {
    color: colors.charcoal,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    lineHeight: 15,
    textAlign: 'center'
  },
  timelinePreview: {
    minHeight: 174,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
    ...shadows.subtle
  },
  timelineRailWrap: {
    width: 34,
    height: 140,
    alignItems: 'center',
    justifyContent: 'space-around'
  },
  timelineRail: {
    position: 'absolute',
    top: 9,
    bottom: 9,
    width: 2,
    borderRadius: 2,
    backgroundColor: colors.gray200
  },
  timelineDot: {
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.surface
  },
  timelineDotCoral: {
    backgroundColor: colors.coral
  },
  timelineDotAqua: {
    backgroundColor: colors.aqua
  },
  timelineFeatureCard: {
    flex: 1,
    height: 150,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.gray100,
    ...shadows.card
  },
  timelineFeatureOverlay: {
    flex: 1,
    padding: 16,
    justifyContent: 'flex-end'
  },
  timelineFeatureCity: {
    color: colors.white,
    fontFamily: fontFamily.headingExtraBold,
    fontSize: 23,
    lineHeight: 29
  },
  timelineFeatureDates: {
    color: 'rgba(255,255,255,0.9)',
    fontFamily: fontFamily.bodyMedium,
    fontSize: 14,
    lineHeight: 19,
    marginTop: 2
  },
  timelineFeatureMeta: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  timelineFeatureText: {
    color: colors.white,
    fontFamily: fontFamily.headingBold,
    fontSize: 14,
    lineHeight: 19
  },
  timelineFeatureCost: {
    color: colors.white,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 14,
    lineHeight: 19,
    marginTop: 4
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
  timelineEmptyTitle: {
    color: colors.charcoal,
    fontFamily: fontFamily.headingBold,
    fontSize: 14,
    lineHeight: 18
  },
  timelineEmptyBody: {
    color: colors.textMuted,
    fontFamily: fontFamily.body,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 1
  },
  horizontalList: {
    gap: 14,
    paddingRight: CONTENT_PADDING
  },
  placeCardWrap: {
    height: 124
  },
  placeCard: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.gray100,
    ...shadows.subtle
  },
  placeImage: {
    flex: 1
  },
  placeOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 12
  },
  placeTitle: {
    color: colors.white,
    fontFamily: fontFamily.headingBold,
    fontSize: 15,
    lineHeight: 19
  },
  placesEmpty: {
    minHeight: 72,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  placesEmptyText: {
    color: colors.textMuted,
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 18
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
