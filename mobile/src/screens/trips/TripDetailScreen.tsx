import { Ionicons } from '@expo/vector-icons';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { GlassView } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ImageBackground, Platform, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { activitiesApi } from '../../api/activities';
import { billsApi } from '../../api/bills';
import { checklistApi } from '../../api/checklist';
import { getErrorMessage } from '../../api/client';
import { socialApi } from '../../api/social';
import { stopsApi } from '../../api/stops';
import { tripsApi } from '../../api/trips';
import { Activity, ActivityCategory, ActivityInput, BillExpense, BillParticipant, BillSplit, ChecklistItem, PublicUser, Stop, StopInput, Trip } from '../../api/types';
import { Button } from '../../components/Button';
import { ProgressBar } from '../../components/ProgressBar';
import { useAuth } from '../../context/AuthContext';
import { useFocusedAutoRefresh } from '../../hooks/useFocusedAutoRefresh';
import { colors, fontFamily, radius, shadows, typography } from '../../theme';
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  calcByCategory,
  calcSharedExpenseTotal,
  calcStopSubtotal,
  calcTotal,
  calcTripTotal,
  formatMoney,
  sortActivitiesByDate
} from '../../utils/budgetCalc';
import { formatDate, formatDateRange, getTripDays, nightsBetween } from '../../utils/dateHelpers';
import { pickImageFromDevice } from '../../utils/mediaPicker';
import { getDestinationImage } from '../../utils/photos';
import { shareTrip } from '../../utils/shareHelpers';
import { RootStackParamList, TripDetailTabParamList } from '../../navigation/types';
import { AddActivitySheet } from './AddActivitySheet';
import { AddStopSheet } from './AddStopSheet';

type Props = NativeStackScreenProps<RootStackParamList, 'TripDetail'>;

const Tab = createMaterialTopTabNavigator<TripDetailTabParamList>();

const starterChecklist = [
  { label: 'Passport', category: 'documents' },
  { label: 'Travel insurance', category: 'documents' },
  { label: 'Comfortable shoes', category: 'clothing' },
  { label: 'Rain jacket', category: 'clothing' },
  { label: 'Phone charger', category: 'electronics' },
  { label: 'Medication', category: 'health' }
];

const chartColors = [colors.primary, colors.warning, colors.success, colors.gray600, colors.danger, colors.gray400];

export function TripDetailScreen({ route, navigation }: Props) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [stopSheetVisible, setStopSheetVisible] = useState(false);
  const [activityStop, setActivityStop] = useState<Stop | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [privacyUpdating, setPrivacyUpdating] = useState(false);
  const loadingTripRef = useRef<Promise<void> | null>(null);

  const loadTrip = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (loadingTripRef.current) return loadingTripRef.current;

    const request = tripsApi
      .get(route.params.tripId)
      .then((data) => {
        setTrip(sortTrip(data));
      })
      .catch((error) => {
        if (!silent) {
          Toast.show({ type: 'error', text1: 'Could not load trip', text2: getErrorMessage(error) });
        }
      })
      .finally(() => {
        setLoading(false);
        loadingTripRef.current = null;
      });

    loadingTripRef.current = request;
    return request;
  }, [route.params.tripId]);

  useEffect(() => {
    loadTrip();
  }, [loadTrip]);

  useFocusedAutoRefresh(() => loadTrip({ silent: true }), {
    enabled: Boolean(trip) && !coverUploading && !privacyUpdating && !stopSheetVisible && !activityStop
  });

  const addStop = async (payload: StopInput) => {
    if (!trip) return;
    await tripsApi.addStop(trip.id, { ...payload, order: trip.stops.length });
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await loadTrip();
  };

  const addActivity = async (payload: ActivityInput) => {
    if (!activityStop) return;
    await tripsApi.addActivity(activityStop.id, payload);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await loadTrip();
  };

  const moveStop = async (stop: Stop, direction: -1 | 1) => {
    if (!trip) return;
    const stops = [...trip.stops].sort((a, b) => a.order - b.order);
    const currentIndex = stops.findIndex((item) => item.id === stop.id);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= stops.length) return;

    const [moved] = stops.splice(currentIndex, 1);
    stops.splice(nextIndex, 0, moved);

    try {
      const updated = await tripsApi.reorderStops(trip.id, stops.map((item) => item.id));
      setTrip(sortTrip(updated));
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Could not reorder stops', text2: getErrorMessage(error) });
    }
  };

  const deleteStop = async (stop: Stop) => {
    Alert.alert('Delete stop?', `${stop.cityName} and its activities will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await stopsApi.remove(stop.id);
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            await loadTrip();
          } catch (error) {
            Toast.show({ type: 'error', text1: 'Could not delete stop', text2: getErrorMessage(error) });
          }
        }
      }
    ]);
  };

  const deleteActivity = async (activity: Activity) => {
    try {
      await activitiesApi.remove(activity.id);
      await loadTrip();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Could not delete activity', text2: getErrorMessage(error) });
    }
  };

  const addChecklistItem = async (label: string, category: string) => {
    if (!trip || !label.trim()) return;
    await tripsApi.addChecklistItem(trip.id, { label: label.trim(), category });
    await loadTrip();
  };

  const toggleChecklistItem = async (item: ChecklistItem) => {
    try {
      await tripsApi.toggleChecklistItem(item.id, !item.isPacked);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await loadTrip();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Could not update checklist', text2: getErrorMessage(error) });
    }
  };

  const deleteChecklistItem = async (item: ChecklistItem) => {
    try {
      await checklistApi.remove(item.id);
      await loadTrip();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Could not delete checklist item', text2: getErrorMessage(error) });
    }
  };

  const saveNote = async (content: string) => {
    if (!trip) return;
    const existing = trip.notes[0];
    if (existing) {
      await tripsApi.updateNote(existing.id, content);
    } else {
      await tripsApi.addNote(trip.id, content);
    }
    await loadTrip();
  };

  const share = async () => {
    if (!trip) return;

    try {
      const shareState = trip.isPublic && trip.shareToken
        ? { id: trip.id, isPublic: trip.isPublic, shareToken: trip.shareToken }
        : await tripsApi.share(trip.id, true);
      const publicTrip = { ...trip, isPublic: shareState.isPublic, shareToken: shareState.shareToken };
      setTrip(publicTrip);
      await shareTrip(publicTrip);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Could not share trip', text2: getErrorMessage(error) });
    }
  };

  const updateVisibility = async (isPublic: boolean) => {
    if (!trip || privacyUpdating || trip.isPublic === isPublic) return;

    setPrivacyUpdating(true);
    try {
      const shareState = await tripsApi.share(trip.id, isPublic);
      setTrip((current) =>
        current
          ? {
              ...current,
              isPublic: shareState.isPublic,
              shareToken: shareState.shareToken
            }
          : current
      );
      Toast.show({ type: 'success', text1: isPublic ? 'Trip is public' : 'Trip is private' });
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Could not update privacy', text2: getErrorMessage(error) });
    } finally {
      setPrivacyUpdating(false);
    }
  };

  const syncBillExpenses = useCallback((expenses: BillExpense[]) => {
    setTrip((current) => (current ? { ...current, billExpenses: expenses } : current));
  }, []);

  const changeCover = async () => {
    if (!trip || coverUploading) return;

    const result = await pickImageFromDevice({
      title: 'Update Trip Thumbnail',
      aspect: [16, 9],
      quality: 0.86
    });

    if (result.status === 'permission-denied') {
      Toast.show({
        type: 'error',
        text1: result.source === 'camera' ? 'Camera access needed' : 'Photo access needed',
        text2: result.source === 'camera' ? 'Allow camera access to take a trip thumbnail.' : 'Allow photo access to update this trip thumbnail.'
      });
      return;
    }

    if (result.status !== 'selected') return;

    setCoverUploading(true);
    try {
      const updated = await tripsApi.updateCover(trip.id, result.image);
      setTrip(sortTrip(updated));
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Toast.show({ type: 'success', text1: 'Trip thumbnail updated' });
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Could not update thumbnail', text2: getErrorMessage(error) });
    } finally {
      setCoverUploading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!trip) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.title}>Trip not found</Text>
        <Button label="Go Back" variant="secondary" onPress={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  const sortedStops = [...trip.stops].sort((a, b) => a.order - b.order);
  const coverImage = trip.coverImage ?? getDestinationImage(sortedStops[0]?.cityName ?? trip.title);
  const activityCount = trip.stops.reduce((count, stop) => count + stop.activities.length, 0);
  const canManageTrip = trip.userId === user?.id;
  const heroActionTop = Math.max((Platform.OS === 'android' ? StatusBar.currentHeight ?? insets.top : insets.top) + 12, 18);

  return (
    <View style={styles.safeArea}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <ImageBackground source={{ uri: coverImage }} resizeMode="cover" style={styles.detailHero}>
        <LinearGradient
          colors={['rgba(15,23,20,0.54)', 'rgba(15,23,20,0.12)', 'rgba(15,23,20,0.50)']}
          pointerEvents="none"
          style={styles.detailHeroScrim}
        />
        <Pressable
          accessibilityLabel="Change trip thumbnail"
          accessibilityRole="button"
          accessibilityState={{ disabled: !canManageTrip || coverUploading, busy: coverUploading }}
          disabled={!canManageTrip || coverUploading}
          onPress={changeCover}
          style={styles.heroPressLayer}
        />
        <View style={[styles.heroActions, { top: heroActionTop }]}>
          <Pressable accessibilityLabel="Go back" accessibilityRole="button" style={styles.heroIconButton} onPress={() => navigation.goBack()}>
            <GlassView colorScheme="light" glassEffectStyle="regular" tintColor="rgba(255,255,255,0.58)" style={styles.heroGlassFill} />
            <Ionicons name="chevron-back" size={24} color={colors.charcoal} />
          </Pressable>
          <View style={styles.heroRightActions}>
            {canManageTrip ? (
              <>
                <Pressable
                  accessibilityLabel="Change trip thumbnail"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: coverUploading, busy: coverUploading }}
                  disabled={coverUploading}
                  style={[styles.heroIconButton, coverUploading && styles.disabled]}
                  onPress={changeCover}
                >
                  <GlassView colorScheme="light" glassEffectStyle="regular" tintColor="rgba(255,255,255,0.58)" style={styles.heroGlassFill} />
                  {coverUploading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="camera-outline" size={21} color={colors.primary} />}
                </Pressable>
                <Pressable accessibilityLabel="Share trip" accessibilityRole="button" style={styles.heroIconButton} onPress={share}>
                  <GlassView colorScheme="light" glassEffectStyle="regular" tintColor="rgba(255,255,255,0.58)" style={styles.heroGlassFill} />
                  <Ionicons name={trip.isPublic ? 'globe-outline' : 'share-social-outline'} size={21} color={colors.charcoal} />
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      </ImageBackground>

      <View style={styles.detailCard}>
        <View style={styles.detailTitleRow}>
          <Text numberOfLines={1} style={styles.detailTitle}>{trip.title}</Text>
          {canManageTrip ? (
            <Pressable
              accessibilityLabel="Change trip thumbnail"
              accessibilityRole="button"
              accessibilityState={{ disabled: coverUploading, busy: coverUploading }}
              disabled={coverUploading}
              hitSlop={10}
              onPress={changeCover}
              style={[styles.titleEditButton, coverUploading && styles.disabled]}
            >
              <Ionicons name="pencil" size={16} color={colors.primary} />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.detailMetaGrid}>
          <DetailMeta icon="calendar-outline" label={`${formatDateRange(trip.startDate, trip.endDate)} · ${getTripDays(trip.startDate, trip.endDate)} days`} />
          <DetailMeta icon="map-outline" label={`${trip.stops.length} ${trip.stops.length === 1 ? 'city' : 'cities'}`} />
          <DetailMeta icon="sparkles-outline" label={`${activityCount} ${activityCount === 1 ? 'activity' : 'activities'}`} />
          <DetailMeta icon={trip.isPublic ? 'globe-outline' : 'lock-closed-outline'} label={trip.isPublic ? 'Public' : 'Private'} />
        </View>
        {canManageTrip ? (
          <PrivacySegment isPublic={trip.isPublic} loading={privacyUpdating} onChange={updateVisibility} />
        ) : (
          <View style={styles.collaboratorNotice}>
            <Ionicons name="people-outline" size={16} color={colors.primary} />
            <Text style={styles.collaboratorNoticeText}>Shared trip editor</Text>
          </View>
        )}
      </View>

      <Tab.Navigator
        key={`${trip.id}-${route.params.initialTab ?? 'Itinerary'}`}
        initialRouteName={route.params.initialTab ?? 'Itinerary'}
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.gray600,
          tabBarIndicatorStyle: styles.tabIndicator,
          tabBarItemStyle: styles.tabItem,
          tabBarLabelStyle: styles.tabLabel,
          tabBarScrollEnabled: true,
          tabBarStyle: styles.tabBar
        }}
      >
        <Tab.Screen name="Itinerary">
          {() => (
            <ItineraryTab
              trip={trip}
              onAddStop={() => setStopSheetVisible(true)}
              onAddActivity={setActivityStop}
              onMoveStop={moveStop}
              onDeleteStop={deleteStop}
              onDeleteActivity={deleteActivity}
            />
          )}
        </Tab.Screen>
        <Tab.Screen name="Budget">{() => <BudgetTab trip={trip} />}</Tab.Screen>
        <Tab.Screen name="Split">{() => <SplitTab tripId={trip.id} onExpensesChange={syncBillExpenses} />}</Tab.Screen>
        <Tab.Screen name="Crew">
          {() => <CrewTab trip={trip} canManage={canManageTrip} onTripChange={(updated) => setTrip(sortTrip(updated))} />}
        </Tab.Screen>
        <Tab.Screen name="Checklist">
          {() => (
            <ChecklistTab
              trip={trip}
              onAdd={addChecklistItem}
              onToggle={toggleChecklistItem}
              onDelete={deleteChecklistItem}
            />
          )}
        </Tab.Screen>
        <Tab.Screen name="Notes">{() => <NotesTab trip={trip} onSave={saveNote} />}</Tab.Screen>
      </Tab.Navigator>

      <AddStopSheet visible={stopSheetVisible} trip={trip} onClose={() => setStopSheetVisible(false)} onSubmit={addStop} />
      <AddActivitySheet
        visible={Boolean(activityStop)}
        onClose={() => setActivityStop(null)}
        onSubmit={async (payload) => {
          await addActivity(payload);
          setActivityStop(null);
        }}
      />
    </View>
  );
}

function DetailMeta({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.detailMetaItem}>
      <Ionicons name={icon} size={14} color={colors.gray600} />
      <Text numberOfLines={1} style={styles.detailMetaText}>{label}</Text>
    </View>
  );
}

function PrivacySegment({
  isPublic,
  loading,
  onChange
}: {
  isPublic: boolean;
  loading: boolean;
  onChange: (isPublic: boolean) => void;
}) {
  return (
    <View style={styles.privacySegment}>
      {[
        { label: 'Private', value: false, icon: 'lock-closed-outline' },
        { label: 'Public', value: true, icon: 'globe-outline' }
      ].map((item) => {
        const active = isPublic === item.value;
        return (
          <Pressable
            key={item.label}
            accessibilityRole="button"
            accessibilityState={{ selected: active, disabled: loading }}
            disabled={loading}
            onPress={() => onChange(item.value)}
            style={[styles.privacyOption, active && styles.privacyOptionActive]}
          >
            {loading && active ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={15} color={active ? colors.white : colors.gray600} />
            )}
            <Text style={[styles.privacyOptionText, active && styles.privacyOptionTextActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ItineraryTab({
  trip,
  onAddStop,
  onAddActivity,
  onMoveStop,
  onDeleteStop,
  onDeleteActivity
}: {
  trip: Trip;
  onAddStop: () => void;
  onAddActivity: (stop: Stop) => void;
  onMoveStop: (stop: Stop, direction: -1 | 1) => void;
  onDeleteStop: (stop: Stop) => void;
  onDeleteActivity: (activity: Activity) => void;
}) {
  const stops = [...trip.stops].sort((a, b) => a.order - b.order);
  const [managedStopId, setManagedStopId] = useState<number | null>(null);

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      {trip.description ? (
        <View style={styles.itineraryNote}>
          <Ionicons name="reader-outline" size={18} color={colors.primary} />
          <Text style={styles.body}>{trip.description}</Text>
        </View>
      ) : null}

      {stops.length ? (
        <View style={styles.itineraryTimeline}>
          {stops.map((stop, index) => (
            <StopTimelineItem
              index={index}
              isLast={false}
              isManaged={managedStopId === stop.id}
              key={stop.id}
              onAddActivity={() => onAddActivity(stop)}
              onDeleteActivity={onDeleteActivity}
              onDeleteStop={() => onDeleteStop(stop)}
              onMoveDown={() => onMoveStop(stop, 1)}
              onMoveUp={() => onMoveStop(stop, -1)}
              onToggleManage={() => setManagedStopId((current) => (current === stop.id ? null : stop.id))}
              stop={stop}
              canMoveDown={index < stops.length - 1}
              canMoveUp={index > 0}
            />
          ))}
          <Pressable onPress={onAddStop} style={({ pressed }) => [styles.addTimelineItem, pressed && styles.pressedRow]}>
            <View style={styles.timelineMarkerColumn}>
              <View style={styles.addTimelineMarker}>
                <Ionicons name="add" size={18} color={colors.primary} />
              </View>
            </View>
            <View style={styles.addTimelineCard}>
              <Text style={styles.itemTitle}>Add next stop</Text>
              <Text style={styles.meta}>Extend the route with another city.</Text>
            </View>
          </Pressable>
        </View>
      ) : (
        <EmptyPanel title="No stops yet" body="Add a city stop to start building your timeline." actionLabel="Add Stop" onAction={onAddStop} />
      )}
    </ScrollView>
  );
}

function StopTimelineItem({
  stop,
  index,
  isLast,
  isManaged,
  canMoveUp,
  canMoveDown,
  onAddActivity,
  onDeleteActivity,
  onDeleteStop,
  onMoveDown,
  onMoveUp,
  onToggleManage
}: {
  stop: Stop;
  index: number;
  isLast: boolean;
  isManaged: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onAddActivity: () => void;
  onDeleteActivity: (activity: Activity) => void;
  onDeleteStop: () => void;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onToggleManage: () => void;
}) {
  const activities = sortActivitiesByDate(stop.activities ?? []);
  const subtotal = calcStopSubtotal(stop);

  return (
    <View style={styles.timelineStopItem}>
      <View style={styles.timelineMarkerColumn}>
        {!isLast ? <View style={styles.timelineConnector} /> : null}
        <View style={styles.stopNumberMarker}>
          <Text style={styles.stopNumberText}>{String(index + 1).padStart(2, '0')}</Text>
        </View>
      </View>

      <View style={styles.stopTimelineCard}>
        <View style={styles.stopCardTop}>
          <View style={styles.grow}>
            <Text numberOfLines={1} style={styles.stopTimelineTitle}>{stop.cityName}</Text>
            <Text numberOfLines={1} style={styles.stopTimelineMeta}>
              {stop.country} · {formatDateRange(stop.arrivalDate, stop.departDate)} · {nightsBetween(stop.arrivalDate, stop.departDate)} nights
            </Text>
          </View>
          <View style={styles.stopSummary}>
            <Text style={styles.stopSubtotal}>{subtotal ? formatMoney(subtotal) : 'Open'}</Text>
            <Pressable accessibilityRole="button" onPress={onToggleManage} style={styles.manageButton}>
              <Ionicons name="ellipsis-horizontal" size={18} color={colors.charcoal} />
            </Pressable>
          </View>
        </View>

        <View style={styles.stopStatsRow}>
          <View style={styles.stopStatChip}>
            <Ionicons name="sparkles-outline" size={13} color={colors.primary} />
            <Text style={styles.stopStatText}>{activities.length} {activities.length === 1 ? 'activity' : 'activities'}</Text>
          </View>
          <View style={styles.stopStatChip}>
            <Ionicons name="moon-outline" size={13} color={colors.primary} />
            <Text style={styles.stopStatText}>{nightsBetween(stop.arrivalDate, stop.departDate)} nights</Text>
          </View>
        </View>

        {isManaged ? (
          <View style={styles.managePanel}>
            <ManageAction icon="arrow-up-outline" label="Move up" disabled={!canMoveUp} onPress={onMoveUp} />
            <ManageAction icon="arrow-down-outline" label="Move down" disabled={!canMoveDown} onPress={onMoveDown} />
            <ManageAction icon="trash-outline" label="Delete" danger onPress={onDeleteStop} />
          </View>
        ) : null}

        <View style={styles.activityTimelineList}>
          {activities.length ? (
            activities.map((activity) => (
              <ActivityTimelineRow key={activity.id} activity={activity} onDelete={() => onDeleteActivity(activity)} />
            ))
          ) : (
            <View style={styles.emptyActivityRow}>
              <Text style={styles.meta}>No activities yet</Text>
            </View>
          )}
        </View>

        <Pressable onPress={onAddActivity} style={({ pressed }) => [styles.addActivityInline, pressed && styles.pressedRow]}>
          <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
          <Text style={styles.inlineAddText}>Add Activity</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ActivityTimelineRow({ activity, onDelete }: { activity: Activity; onDelete: () => void }) {
  const meta = getActivityMeta(activity.category);
  const detail = [
    meta.label,
    activity.date ? formatDate(activity.date) : null,
    activity.duration ? `${activity.duration} min` : null
  ].filter(Boolean).join(' · ');

  return (
    <View style={styles.activityTimelineRow}>
      <View style={[styles.activityTimelineIcon, { backgroundColor: withAlpha(meta.color, 0.12) }]}>
        <Ionicons name={meta.icon} size={16} color={meta.color} />
      </View>
      <View style={styles.grow}>
        <Text numberOfLines={1} style={styles.activityTimelineTitle}>{activity.name}</Text>
        <Text numberOfLines={1} style={styles.activityTimelineMeta}>{detail}</Text>
      </View>
      <Text style={styles.activityTimelineCost}>{Number(activity.cost) ? formatMoney(activity.cost) : 'Free'}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${activity.name}`} onPress={onDelete} hitSlop={10}>
        <Ionicons name="close-circle" size={19} color={colors.gray400} />
      </Pressable>
    </View>
  );
}

function ManageAction({
  icon,
  label,
  onPress,
  danger,
  disabled
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.manageAction, disabled && styles.disabled]}>
      <Ionicons name={icon} size={15} color={danger ? colors.danger : colors.gray600} />
      <Text style={[styles.manageActionText, danger && styles.manageActionDanger]}>{label}</Text>
    </Pressable>
  );
}

function BudgetTab({ trip }: { trip: Trip }) {
  const itineraryTotal = calcTotal(trip.stops);
  const sharedTotal = calcSharedExpenseTotal(trip.billExpenses ?? []);
  const total = calcTripTotal(trip);
  const budget = Number(trip.budget ?? 0);
  const percent = budget ? Math.min(100, Math.round((total / budget) * 100)) : 0;
  const budgetDelta = budget - total;
  const budgetLine = budget
    ? budgetDelta >= 0
      ? `${formatMoney(budgetDelta)} remaining - ${percent}% used`
      : `${formatMoney(Math.abs(budgetDelta))} over budget`
    : 'No trip budget set';
  const byCategory = calcByCategory(trip.stops);
  const chartData = Object.entries(byCategory)
    .filter(([, value]) => value > 0)
    .map(([label, value], index) => ({ text: label, value, color: chartColors[index % chartColors.length] }));
  const fullChartData = sharedTotal > 0
    ? [...chartData, { text: 'Shared expenses', value: sharedTotal, color: colors.primaryDark }]
    : chartData;

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <View style={styles.budgetCard}>
        <Text style={styles.meta}>Estimated spend</Text>
        <Text style={[styles.budgetTotal, budget > 0 && total > budget && styles.dangerText]}>{formatMoney(total)}</Text>
        <Text style={styles.body}>{budgetLine}</Text>
        <ProgressBar value={budget ? total : 0} max={budget || 1} danger={budget > 0 && total > budget} />
      </View>

      <View style={styles.budgetSplitRow}>
        <View style={styles.budgetMiniCard}>
          <Text style={styles.meta}>Itinerary</Text>
          <Text style={styles.budgetMiniValue}>{formatMoney(itineraryTotal)}</Text>
        </View>
        <View style={styles.budgetMiniCard}>
          <Text style={styles.meta}>Shared bills</Text>
          <Text style={styles.budgetMiniValue}>{formatMoney(sharedTotal)}</Text>
        </View>
      </View>

      <View style={styles.chartCard}>
        {fullChartData.length ? (
          <PieChart data={fullChartData} donut radius={88} innerRadius={55} />
        ) : (
          <EmptyPanel title="No costs yet" body="Add itinerary costs or shared expenses to see the chart." compact />
        )}
      </View>

      {fullChartData.map((item) => (
        <View key={item.text} style={styles.breakdownRow}>
          <View style={[styles.legendDot, { backgroundColor: item.color }]} />
          <Text style={styles.itemTitle}>{item.text}</Text>
          <Text style={styles.cost}>{formatMoney(item.value)}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

function SplitTab({ tripId, onExpensesChange }: { tripId: number; onExpensesChange: (expenses: BillExpense[]) => void }) {
  const [split, setSplit] = useState<BillSplit | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [participantName, setParticipantName] = useState('');
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [selectedPayerId, setSelectedPayerId] = useState<number | null>(null);

  const loadSplit = useCallback(async () => {
    try {
      const data = await billsApi.get(tripId);
      setSplit(data);
      onExpensesChange(data.expenses);
      setSelectedPayerId((current) => current ?? data.participants[0]?.id ?? null);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Could not load split', text2: getErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  }, [onExpensesChange, tripId]);

  useEffect(() => {
    loadSplit();
  }, [loadSplit]);

  useEffect(() => {
    if (!split?.participants.length) {
      setSelectedPayerId(null);
      return;
    }

    if (!selectedPayerId || !split.participants.some((participant) => participant.id === selectedPayerId)) {
      setSelectedPayerId(split.participants[0].id);
    }
  }, [selectedPayerId, split?.participants]);

  const addParticipant = async () => {
    const name = participantName.trim();
    if (!name || saving) return;

    setSaving(true);
    try {
      const data = await billsApi.addParticipant(tripId, { name });
      setSplit(data);
      onExpensesChange(data.expenses);
      setParticipantName('');
      setSelectedPayerId((current) => current ?? data.participants[0]?.id ?? null);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Could not add traveler', text2: getErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const removeParticipant = (participant: BillParticipant) => {
    if (participant.userId) {
      Toast.show({ type: 'info', text1: 'Trip members stay in split', text2: 'Remove them from Crew if they should lose trip access.' });
      return;
    }

    Alert.alert('Remove traveler?', `${participant.name} and expenses they paid will be removed from this split.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            const data = await billsApi.removeParticipant(participant.id);
            setSplit(data);
            onExpensesChange(data.expenses);
          } catch (error) {
            Toast.show({ type: 'error', text1: 'Could not remove traveler', text2: getErrorMessage(error) });
          }
        }
      }
    ]);
  };

  const addExpense = async () => {
    const amount = Number(expenseAmount.replace(/,/g, '').trim());
    const title = expenseTitle.trim();

    if (!title || !selectedPayerId || !Number.isFinite(amount) || amount <= 0 || saving) return;

    setSaving(true);
    try {
      const data = await billsApi.addExpense(tripId, { title, amount, paidById: selectedPayerId });
      setSplit(data);
      onExpensesChange(data.expenses);
      setExpenseTitle('');
      setExpenseAmount('');
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Could not add expense', text2: getErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const removeExpense = async (expense: BillExpense) => {
    try {
      const data = await billsApi.removeExpense(expense.id);
      setSplit(data);
      onExpensesChange(data.expenses);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Could not remove expense', text2: getErrorMessage(error) });
    }
  };

  if (loading) {
    return (
      <View style={styles.splitLoading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const participants = split?.participants ?? [];
  const expenses = split?.expenses ?? [];
  const summary = split?.summary;
  const canAddExpense = Boolean(expenseTitle.trim() && Number(expenseAmount.replace(/,/g, '').trim()) > 0 && selectedPayerId);

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <View style={styles.splitHeroCard}>
        <View style={styles.splitHeroTop}>
          <View>
            <Text style={styles.meta}>Shared spending</Text>
            <Text style={styles.splitHeroTotal}>{formatMoney(summary?.total ?? 0)}</Text>
          </View>
          <View style={styles.splitIconBadge}>
            <Ionicons name="receipt-outline" size={22} color={colors.primary} />
          </View>
        </View>
        <View style={styles.splitMetrics}>
          <SplitMetric label="Travelers" value={String(participants.length)} />
          <SplitMetric label="Expenses" value={String(expenses.length)} />
          <SplitMetric label="Each" value={formatMoney(summary?.perPerson ?? 0)} />
        </View>
      </View>

      <View style={styles.splitSection}>
        <View style={styles.splitSectionHeader}>
          <Text style={styles.stopTitle}>Travelers</Text>
          <Text style={styles.meta}>Who is splitting costs · tap to remove</Text>
        </View>

        {participants.length ? (
          <View style={styles.participantGrid}>
            {participants.map((participant) => (
              <Pressable
                accessibilityRole="button"
                key={participant.id}
                onPress={() => removeParticipant(participant)}
                style={styles.participantChip}
              >
                <Text numberOfLines={1} style={styles.participantChipText}>{participant.name}</Text>
                <Ionicons name={participant.userId ? 'person-circle-outline' : 'close-circle'} size={16} color={colors.gray400} />
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.body}>Add the people traveling together before entering expenses.</Text>
        )}

        <View style={styles.inlineFormRow}>
          <TextInput
            value={participantName}
            onChangeText={setParticipantName}
            placeholder="Traveler name"
            placeholderTextColor={colors.gray400}
            style={[styles.input, styles.inlineInput]}
          />
          <Pressable
            accessibilityRole="button"
            disabled={!participantName.trim() || saving}
            onPress={addParticipant}
            style={[styles.smallPrimaryButton, (!participantName.trim() || saving) && styles.disabled]}
          >
            <Ionicons name="add" size={21} color={colors.white} />
          </Pressable>
        </View>
      </View>

      <View style={styles.splitSection}>
        <View style={styles.splitSectionHeader}>
          <Text style={styles.stopTitle}>Add Expense</Text>
          <Text style={styles.meta}>Split equally across all travelers</Text>
        </View>
        <TextInput
          value={expenseTitle}
          onChangeText={setExpenseTitle}
          placeholder="Dinner, taxi, hotel..."
          placeholderTextColor={colors.gray400}
          style={styles.input}
        />
        <TextInput
          value={expenseAmount}
          keyboardType="decimal-pad"
          onChangeText={setExpenseAmount}
          placeholder="Amount"
          placeholderTextColor={colors.gray400}
          style={styles.input}
        />
        <View style={styles.payerRow}>
          {participants.map((participant) => (
            <Pressable
              accessibilityRole="button"
              key={participant.id}
              onPress={() => setSelectedPayerId(participant.id)}
              style={[styles.payerPill, selectedPayerId === participant.id && styles.payerPillActive]}
            >
              <Text style={[styles.payerPillText, selectedPayerId === participant.id && styles.payerPillTextActive]}>
                Paid by {participant.name}
              </Text>
            </Pressable>
          ))}
        </View>
        <Button label="Add Expense" icon="add-circle-outline" disabled={!canAddExpense || saving} onPress={addExpense} />
      </View>

      <View style={styles.splitSection}>
        <View style={styles.splitSectionHeader}>
          <Text style={styles.stopTitle}>Settle Up</Text>
          <Text style={styles.meta}>Suggested payments</Text>
        </View>
        {summary?.settlements.length ? (
          summary.settlements.map((settlement) => <SettlementRow key={`${settlement.fromParticipantId}-${settlement.toParticipantId}`} settlement={settlement} />)
        ) : (
          <View style={styles.settledState}>
            <Ionicons name="checkmark-circle-outline" size={22} color={colors.success} />
            <Text style={styles.itemTitle}>Everyone is settled</Text>
          </View>
        )}
      </View>

      <View style={styles.splitSection}>
        <View style={styles.splitSectionHeader}>
          <Text style={styles.stopTitle}>Expenses</Text>
          <Text style={styles.meta}>{expenses.length ? 'Shared costs entered for this trip' : 'No expenses yet'}</Text>
        </View>
        {expenses.length ? (
          expenses.map((expense) => <ExpenseRow expense={expense} key={expense.id} onDelete={() => removeExpense(expense)} />)
        ) : (
          <EmptyPanel title="No shared costs yet" body="Add the first group expense to see who owes what." compact />
        )}
      </View>
    </ScrollView>
  );
}

function SplitMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.splitMetric}>
      <Text numberOfLines={1} style={styles.splitMetricValue}>{value}</Text>
      <Text numberOfLines={1} style={styles.splitMetricLabel}>{label}</Text>
    </View>
  );
}

function SettlementRow({ settlement }: { settlement: BillSplit['summary']['settlements'][number] }) {
  return (
    <View style={styles.settlementRow}>
      <View style={styles.settlementIcon}>
        <Ionicons name="arrow-forward" size={16} color={colors.primary} />
      </View>
      <Text numberOfLines={1} style={styles.itemTitle}>{settlement.from} pays {settlement.to}</Text>
      <Text style={styles.cost}>{formatMoney(settlement.amount)}</Text>
    </View>
  );
}

function ExpenseRow({ expense, onDelete }: { expense: BillExpense; onDelete: () => void }) {
  return (
    <View style={styles.expenseRow}>
      <View style={styles.expenseIcon}>
        <Ionicons name="receipt-outline" size={18} color={colors.primary} />
      </View>
      <View style={styles.grow}>
        <Text numberOfLines={1} style={styles.itemTitle}>{expense.title}</Text>
        <Text numberOfLines={1} style={styles.meta}>Paid by {expense.paidBy?.name ?? 'Traveler'}</Text>
      </View>
      <Text style={styles.cost}>{formatMoney(expense.amount)}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${expense.title}`} hitSlop={10} onPress={onDelete}>
        <Ionicons name="trash-outline" size={18} color={colors.gray400} />
      </Pressable>
    </View>
  );
}

function CrewTab({
  trip,
  canManage,
  onTripChange
}: {
  trip: Trip;
  canManage: boolean;
  onTripChange: (trip: Trip) => void;
}) {
  const [friends, setFriends] = useState<PublicUser[]>([]);
  const [selectedFriendId, setSelectedFriendId] = useState<number | null>(null);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!canManage) return;

    let mounted = true;
    setLoadingFriends(true);
    socialApi.friends()
      .then((nextFriends) => {
        if (mounted) setFriends(nextFriends);
      })
      .catch((error) => Toast.show({ type: 'error', text1: 'Could not load friends', text2: getErrorMessage(error) }))
      .finally(() => {
        if (mounted) setLoadingFriends(false);
      });

    return () => {
      mounted = false;
    };
  }, [canManage, trip.id]);

  const directMemberIds = new Set((trip.members ?? []).map((member) => member.userId));
  const groupMemberIds = new Set((trip.group?.members ?? []).map((member) => member.userId));
  const unavailableIds = new Set([trip.userId, ...directMemberIds, ...groupMemberIds].filter(Boolean) as number[]);
  const availableFriends = friends.filter((friend) => !unavailableIds.has(friend.id));
  const owner = trip.user;
  const crewUsers = buildCrewUsers(trip);

  const invite = async () => {
    if (!selectedFriendId || saving) return;

    setSaving(true);
    try {
      const updated = await tripsApi.addMember(trip.id, selectedFriendId);
      setSelectedFriendId(null);
      onTripChange(updated);
      Toast.show({ type: 'success', text1: 'Friend added to trip' });
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Could not invite friend', text2: getErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const removeDirectMember = (friend: PublicUser) => {
    Alert.alert('Remove from trip?', `${friend.name} will lose access to this private trip.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            const updated = await tripsApi.removeMember(trip.id, friend.id);
            onTripChange(updated);
            Toast.show({ type: 'success', text1: 'Crew updated' });
          } catch (error) {
            Toast.show({ type: 'error', text1: 'Could not remove friend', text2: getErrorMessage(error) });
          }
        }
      }
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <View style={styles.crewHero}>
        <View style={styles.crewHeroIcon}>
          <Ionicons name="people-outline" size={22} color={colors.primary} />
        </View>
        <View style={styles.grow}>
          <Text style={styles.stopTitle}>Trip Crew</Text>
          <Text style={styles.meta}>
            {crewUsers.length} {crewUsers.length === 1 ? 'traveler' : 'travelers'} can edit itinerary, budget, notes, checklist, and split bills.
          </Text>
        </View>
      </View>

      {trip.group ? (
        <View style={styles.crewGroupCard}>
          <View style={styles.crewGroupTop}>
            <View>
              <Text style={styles.meta}>Group trip</Text>
              <Text style={styles.itemTitle}>{trip.group.name}</Text>
            </View>
            <View style={styles.groupCountPill}>
              <Text style={styles.groupCountText}>{trip.group.members.length}</Text>
            </View>
          </View>
          <Text style={styles.meta}>Group access updates whenever the group owner changes members.</Text>
        </View>
      ) : null}

      {canManage ? (
        <View style={styles.crewInviteCard}>
          <View style={styles.splitSectionHeader}>
            <Text style={styles.stopTitle}>Invite Friend</Text>
            <Text style={styles.meta}>Friends must accept your request before they can join trips.</Text>
          </View>
          {loadingFriends ? (
            <ActivityIndicator color={colors.primary} />
          ) : availableFriends.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.crewPickerRow}>
              {availableFriends.map((friend) => {
                const selected = selectedFriendId === friend.id;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={friend.id}
                    onPress={() => setSelectedFriendId(selected ? null : friend.id)}
                    style={[styles.crewPickerChip, selected && styles.crewPickerChipActive]}
                  >
                    <CrewAvatar user={friend} size={28} />
                    <Text numberOfLines={1} style={[styles.crewPickerText, selected && styles.crewPickerTextActive]}>
                      {friend.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <Text style={styles.meta}>No available friends to invite. Add friends from People first.</Text>
          )}
          <Button label="Add to Trip" icon="person-add-outline" disabled={!selectedFriendId || saving} loading={saving} onPress={invite} />
        </View>
      ) : null}

      <View style={styles.splitSection}>
        <View style={styles.splitSectionHeader}>
          <Text style={styles.stopTitle}>Members</Text>
          <Text style={styles.meta}>Owner, direct collaborators, and group members.</Text>
        </View>
        {owner ? <CrewRow user={owner} role="Owner" /> : null}
        {(trip.members ?? []).map((member) => (
          <CrewRow
            key={`direct-${member.id}`}
            user={member.user}
            role="Editor"
            removable={canManage}
            onRemove={() => removeDirectMember(member.user)}
          />
        ))}
        {(trip.group?.members ?? []).map((member) => (
          <CrewRow key={`group-${member.id}`} user={member.user} role="Group" />
        ))}
      </View>
    </ScrollView>
  );
}

function CrewRow({
  user,
  role,
  removable,
  onRemove
}: {
  user: PublicUser;
  role: string;
  removable?: boolean;
  onRemove?: () => void;
}) {
  return (
    <View style={styles.crewRow}>
      <CrewAvatar user={user} size={42} />
      <View style={styles.grow}>
        <Text numberOfLines={1} style={styles.itemTitle}>{user.name}</Text>
        <Text numberOfLines={1} style={styles.meta}>@{user.username} · {role}</Text>
      </View>
      {removable && onRemove ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${user.name}`} onPress={onRemove} hitSlop={10}>
          <Ionicons name="close-circle" size={20} color={colors.gray400} />
        </Pressable>
      ) : null}
    </View>
  );
}

function CrewAvatar({ user, size }: { user: PublicUser; size: number }) {
  const initials = user.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || user.username.slice(0, 1).toUpperCase();

  if (user.avatarUrl) {
    return <ImageBackground source={{ uri: user.avatarUrl }} style={{ width: size, height: size }} imageStyle={{ borderRadius: size / 2 }} />;
  }

  return (
    <View style={[styles.crewAvatarFallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.crewAvatarText, { fontSize: Math.max(11, size * 0.34), lineHeight: Math.max(14, size * 0.42) }]}>
        {initials}
      </Text>
    </View>
  );
}

function buildCrewUsers(trip: Trip) {
  const users = new Map<number, PublicUser>();
  if (trip.user) users.set(trip.user.id, trip.user);
  (trip.members ?? []).forEach((member) => users.set(member.userId, member.user));
  (trip.group?.members ?? []).forEach((member) => users.set(member.userId, member.user));
  return [...users.values()];
}

function ChecklistTab({
  trip,
  onAdd,
  onToggle,
  onDelete
}: {
  trip: Trip;
  onAdd: (label: string, category: string) => Promise<void>;
  onToggle: (item: ChecklistItem) => Promise<void>;
  onDelete: (item: ChecklistItem) => Promise<void>;
}) {
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState('clothing');
  const packed = trip.checklist.filter((item) => item.isPacked).length;

  const addStarter = async () => {
    try {
      await Promise.all(starterChecklist.map((item) => onAdd(item.label, item.category)));
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Could not add starter items', text2: getErrorMessage(error) });
    }
  };

  const submit = async () => {
    if (!label.trim()) return;
    try {
      await onAdd(label, category);
      setLabel('');
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Could not add item', text2: getErrorMessage(error) });
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <View style={styles.summary}>
        <Text style={styles.stopTitle}>{packed} / {trip.checklist.length} packed</Text>
        <ProgressBar value={packed} max={trip.checklist.length || 1} tone="success" />
      </View>

      {!trip.checklist.length ? <Button label="Add Starter Checklist" icon="bag-check-outline" variant="secondary" onPress={addStarter} /> : null}

      <View style={styles.addCard}>
        <TextInput value={label} onChangeText={setLabel} placeholder="Add item" placeholderTextColor={colors.gray400} style={styles.input} />
        <View style={styles.categoryRow}>
          {['clothing', 'documents', 'electronics', 'other'].map((item) => (
            <Pressable key={item} onPress={() => setCategory(item)} style={[styles.pill, category === item && styles.pillActive]}>
              <Text style={[styles.pillText, category === item && styles.pillTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </View>
        <Button label="Add Item" icon="add" onPress={submit} />
      </View>

      {trip.checklist.map((item) => (
        <View key={item.id} style={styles.checkRow}>
          <Pressable onPress={() => onToggle(item)} style={styles.checkPress}>
            <Ionicons name={item.isPacked ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={item.isPacked ? colors.success : colors.gray400} />
          </Pressable>
          <Text style={[styles.itemTitle, item.isPacked && styles.packed]}>{item.label}</Text>
          <Text style={styles.meta}>{item.category}</Text>
          <Pressable onPress={() => onDelete(item)} hitSlop={10}>
            <Ionicons name="trash-outline" size={19} color={colors.gray400} />
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

function NotesTab({ trip, onSave }: { trip: Trip; onSave: (content: string) => Promise<void> }) {
  const initial = trip.notes[0]?.content ?? '';
  const [content, setContent] = useState(initial);
  const lastSaved = useRef(initial);

  useEffect(() => {
    if (content !== lastSaved.current) return;
    setContent(initial);
    lastSaved.current = initial;
  }, [content, initial, trip.id]);

  useEffect(() => {
    if (content === lastSaved.current) return;
    const timeout = setTimeout(() => {
      onSave(content)
        .then(() => {
          lastSaved.current = content;
        })
        .catch((error) => Toast.show({ type: 'error', text1: 'Could not save note', text2: getErrorMessage(error) }));
    }, 1500);

    return () => clearTimeout(timeout);
  }, [content, onSave]);

  return (
    <View style={styles.notesWrap}>
      <TextInput
        value={content}
        onChangeText={setContent}
        onBlur={() => onSave(content)}
        multiline
        textAlignVertical="top"
        placeholder="Hotel confirmations, day plans, journal notes..."
        placeholderTextColor={colors.gray400}
        style={styles.notesInput}
      />
      <Text style={styles.meta}>Auto-saving</Text>
    </View>
  );
}

function EmptyPanel({
  title,
  body,
  compact,
  actionLabel,
  onAction
}: {
  title: string;
  body: string;
  compact?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={[styles.emptyPanel, compact && styles.compactEmpty]}>
      <Ionicons name="sparkles-outline" size={28} color={colors.primary} />
      <Text style={styles.stopTitle}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {actionLabel && onAction ? (
        <Button label={actionLabel} icon="location-outline" onPress={onAction} style={styles.emptyAction} />
      ) : null}
    </View>
  );
}

function sortTrip(trip: Trip): Trip {
  return {
    ...trip,
    stops: [...trip.stops].sort((a, b) => a.order - b.order),
    checklist: trip.checklist ?? [],
    notes: trip.notes ?? []
  };
}

function getActivityMeta(category: string) {
  const key = (category in CATEGORY_LABELS ? category : 'other') as ActivityCategory;
  return {
    color: CATEGORY_COLORS[key],
    icon: CATEGORY_ICONS[key],
    label: CATEGORY_LABELS[key]
  };
}

function withAlpha(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return colors.primaryLight;

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    padding: 24,
    gap: 16
  },
  detailHero: {
    height: Platform.OS === 'ios' ? 284 : 250,
    backgroundColor: colors.charcoal,
    position: 'relative'
  },
  detailHeroScrim: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0
  },
  heroPressLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1
  },
  heroActions: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  heroRightActions: {
    flexDirection: 'row',
    gap: 10
  },
  heroIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.76)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.68)'
  },
  heroGlassFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22
  },
  detailCard: {
    marginTop: -30,
    borderTopLeftRadius: radius.bottomSheet,
    borderTopRightRadius: radius.bottomSheet,
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 16,
    gap: 12
  },
  detailTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  titleEditButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight
  },
  detailTitle: {
    ...typography.h2,
    flex: 1
  },
  detailMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  detailMetaItem: {
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '48%'
  },
  detailMetaText: {
    ...typography.caption,
    color: colors.gray600,
    flexShrink: 1
  },
  privacySegment: {
    minHeight: 44,
    borderRadius: radius.pill,
    padding: 4,
    flexDirection: 'row',
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.border
  },
  privacyOption: {
    flex: 1,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  privacyOptionActive: {
    backgroundColor: colors.primary
  },
  privacyOptionText: {
    ...typography.bodyMedium,
    color: colors.gray600,
    fontSize: 13,
    lineHeight: 17
  },
  privacyOptionTextActive: {
    color: colors.white
  },
  collaboratorNotice: {
    minHeight: 42,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.border
  },
  collaboratorNoticeText: {
    color: colors.primary,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    lineHeight: 17
  },
  header: {
    minHeight: 70,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray100,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray100
  },
  headerCopy: {
    flex: 1
  },
  headerTitle: {
    ...typography.label
  },
  headerMeta: {
    ...typography.caption
  },
  tabBar: {
    backgroundColor: colors.white
  },
  tabItem: {
    width: 92
  },
  tabIndicator: {
    backgroundColor: colors.primary,
    height: 3,
    borderRadius: 2
  },
  tabLabel: {
    fontFamily: 'Nunito_700Bold',
    textTransform: 'none',
    fontSize: 13
  },
  tabContent: {
    padding: 20,
    paddingBottom: 36,
    gap: 16,
    backgroundColor: colors.background
  },
  title: {
    ...typography.h1
  },
  body: {
    ...typography.body
  },
  meta: {
    ...typography.caption
  },
  itineraryNote: {
    minHeight: 54,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10
  },
  itineraryTimeline: {
    gap: 14
  },
  timelineStopItem: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'stretch'
  },
  timelineMarkerColumn: {
    width: 38,
    alignItems: 'center',
    position: 'relative'
  },
  timelineConnector: {
    position: 'absolute',
    top: 24,
    bottom: -14,
    width: 2,
    borderRadius: 1,
    backgroundColor: colors.border
  },
  stopNumberMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.background
  },
  stopNumberText: {
    color: colors.white,
    fontFamily: fontFamily.headingBold,
    fontSize: 11,
    lineHeight: 14
  },
  stopTimelineCard: {
    flex: 1,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    gap: 12,
    ...shadows.subtle
  },
  stopCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12
  },
  stopTimelineTitle: {
    color: colors.charcoal,
    fontFamily: fontFamily.headingBold,
    fontSize: 18,
    lineHeight: 23
  },
  stopTimelineMeta: {
    ...typography.caption,
    color: colors.gray600,
    marginTop: 2
  },
  stopSummary: {
    alignItems: 'flex-end',
    gap: 6
  },
  stopSubtotal: {
    color: colors.charcoal,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    lineHeight: 17
  },
  manageButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray100
  },
  stopStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  stopStatChip: {
    minHeight: 28,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight
  },
  stopStatText: {
    color: colors.primary,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    lineHeight: 16
  },
  managePanel: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.gray50,
    padding: 6,
    flexDirection: 'row',
    gap: 6
  },
  manageAction: {
    flex: 1,
    minHeight: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
    backgroundColor: colors.surface
  },
  manageActionText: {
    color: colors.gray600,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 11,
    lineHeight: 14
  },
  manageActionDanger: {
    color: colors.danger
  },
  activityTimelineList: {
    borderTopWidth: 1,
    borderTopColor: colors.gray100
  },
  activityTimelineRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100
  },
  activityTimelineIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center'
  },
  activityTimelineTitle: {
    color: colors.charcoal,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 14,
    lineHeight: 18
  },
  activityTimelineMeta: {
    color: colors.gray600,
    fontFamily: fontFamily.body,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 1
  },
  activityTimelineCost: {
    color: colors.charcoal,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    lineHeight: 17
  },
  emptyActivityRow: {
    minHeight: 48,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100
  },
  addActivityInline: {
    minHeight: 44,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: colors.primaryLight
  },
  addTimelineItem: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'stretch'
  },
  addTimelineMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    borderWidth: 2,
    borderColor: colors.surface
  },
  addTimelineCard: {
    flex: 1,
    minHeight: 64,
    borderRadius: radius.card,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    justifyContent: 'center',
    gap: 2
  },
  stopCard: {
    borderRadius: 20,
    backgroundColor: colors.white,
    padding: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4
  },
  stopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12
  },
  stopTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    gap: 10
  },
  grow: {
    flex: 1
  },
  stopTitle: {
    ...typography.label
  },
  rowActions: {
    flexDirection: 'row',
    gap: 6
  },
  miniButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray100
  },
  disabled: {
    opacity: 0.4
  },
  activityList: {
    gap: 8
  },
  activityRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  activityIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center'
  },
  itemTitle: {
    ...typography.bodyMedium,
    flex: 1
  },
  cost: {
    ...typography.bodyMedium,
    color: colors.charcoal
  },
  stopFooter: {
    borderTopWidth: 1,
    borderColor: colors.gray100,
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12
  },
  inlineAdd: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  inlineAddText: {
    ...typography.bodyMedium,
    color: colors.primary
  },
  addStopRow: {
    minHeight: 68,
    borderRadius: 20,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.gray100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1
  },
  pressedRow: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }]
  },
  addStopIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight
  },
  emptyPanel: {
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    padding: 20,
    gap: 8,
    alignItems: 'center'
  },
  emptyAction: {
    alignSelf: 'stretch',
    marginTop: 8
  },
  compactEmpty: {
    backgroundColor: colors.gray100
  },
  budgetCard: {
    borderRadius: 20,
    backgroundColor: colors.charcoal,
    padding: 18,
    gap: 8
  },
  budgetTotal: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 34,
    color: colors.white
  },
  budgetSplitRow: {
    flexDirection: 'row',
    gap: 12
  },
  budgetMiniCard: {
    flex: 1,
    minHeight: 72,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
    justifyContent: 'center',
    gap: 3
  },
  budgetMiniValue: {
    color: colors.charcoal,
    fontFamily: fontFamily.headingBold,
    fontSize: 18,
    lineHeight: 23
  },
  dangerText: {
    color: '#FCA5A5'
  },
  chartCard: {
    minHeight: 220,
    borderRadius: 20,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16
  },
  breakdownRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    backgroundColor: colors.white,
    paddingHorizontal: 14
  },
  splitLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background
  },
  splitHeroCard: {
    borderRadius: radius.card,
    backgroundColor: colors.charcoal,
    padding: 16,
    gap: 16
  },
  splitHeroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12
  },
  splitHeroTotal: {
    color: colors.white,
    fontFamily: fontFamily.headingExtraBold,
    fontSize: 34,
    lineHeight: 40
  },
  splitIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.frostedWhite
  },
  splitMetrics: {
    flexDirection: 'row',
    gap: 8
  },
  splitMetric: {
    flex: 1,
    minHeight: 58,
    borderRadius: radius.lg,
    paddingHorizontal: 10,
    justifyContent: 'center',
    backgroundColor: colors.surfaceOnDark
  },
  splitMetricValue: {
    color: colors.white,
    fontFamily: fontFamily.headingBold,
    fontSize: 16,
    lineHeight: 21
  },
  splitMetricLabel: {
    color: colors.textOnDarkMuted,
    fontFamily: fontFamily.body,
    fontSize: 11,
    lineHeight: 15
  },
  splitSection: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    gap: 12,
    ...shadows.subtle
  },
  splitSectionHeader: {
    gap: 2
  },
  crewHero: {
    minHeight: 78,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...shadows.subtle
  },
  crewHeroIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight
  },
  crewGroupCard: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    gap: 8
  },
  crewGroupTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12
  },
  groupCountPill: {
    minWidth: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight
  },
  groupCountText: {
    color: colors.primary,
    fontFamily: fontFamily.headingBold,
    fontSize: 14,
    lineHeight: 18
  },
  crewInviteCard: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    gap: 12,
    ...shadows.subtle
  },
  crewPickerRow: {
    gap: 8,
    paddingRight: 20
  },
  crewPickerChip: {
    maxWidth: 180,
    minHeight: 42,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.gray50,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  crewPickerChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight
  },
  crewPickerText: {
    color: colors.gray600,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    maxWidth: 122
  },
  crewPickerTextActive: {
    color: colors.primary
  },
  crewRow: {
    minHeight: 62,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.gray50
  },
  crewAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary
  },
  crewAvatarText: {
    color: colors.white,
    fontFamily: fontFamily.headingBold
  },
  participantGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  participantChip: {
    maxWidth: '100%',
    minHeight: 36,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.gray100
  },
  participantChipActive: {
    backgroundColor: colors.primary
  },
  participantChipText: {
    color: colors.gray800,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    lineHeight: 17,
    maxWidth: 180
  },
  participantChipTextActive: {
    color: colors.white
  },
  inlineFormRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center'
  },
  inlineInput: {
    flex: 1
  },
  smallPrimaryButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    ...shadows.button
  },
  payerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  payerPill: {
    minHeight: 34,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray100
  },
  payerPillActive: {
    backgroundColor: colors.primaryLight
  },
  payerPillText: {
    color: colors.gray600,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    lineHeight: 16
  },
  payerPillTextActive: {
    color: colors.primary
  },
  settlementRow: {
    minHeight: 54,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primaryLight
  },
  settlementIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white
  },
  settledState: {
    minHeight: 54,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.gray50
  },
  expenseRow: {
    minHeight: 60,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.gray50
  },
  expenseIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6
  },
  summary: {
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    padding: 16,
    gap: 10
  },
  addCard: {
    borderRadius: 20,
    backgroundColor: colors.gray100,
    padding: 14,
    gap: 12
  },
  input: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    ...typography.bodyMedium
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  pill: {
    minHeight: 34,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white
  },
  pillActive: {
    backgroundColor: colors.primary
  },
  pillText: {
    ...typography.caption,
    textTransform: 'capitalize'
  },
  pillTextActive: {
    color: colors.white
  },
  checkRow: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1
  },
  checkPress: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center'
  },
  packed: {
    color: colors.gray400,
    textDecorationLine: 'line-through'
  },
  notesWrap: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.white
  },
  notesInput: {
    flex: 1,
    minHeight: 360,
    borderRadius: 20,
    backgroundColor: colors.gray100,
    padding: 18,
    textAlignVertical: 'top',
    ...typography.bodyMedium
  }
});
