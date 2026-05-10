import { Ionicons } from '@expo/vector-icons';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import Toast from 'react-native-toast-message';

import { activitiesApi } from '../../api/activities';
import { checklistApi } from '../../api/checklist';
import { getErrorMessage } from '../../api/client';
import { stopsApi } from '../../api/stops';
import { tripsApi } from '../../api/trips';
import { Activity, ActivityInput, ChecklistItem, Stop, StopInput, Trip } from '../../api/types';
import { Button } from '../../components/Button';
import { ProgressBar } from '../../components/ProgressBar';
import { colors, typography } from '../../theme';
import { calcByCategory, calcStopSubtotal, calcTotal, formatMoney } from '../../utils/budgetCalc';
import { formatDateRange, nightsBetween } from '../../utils/dateHelpers';
import { shareTrip } from '../../utils/shareHelpers';
import { RootStackParamList } from '../../navigation/types';
import { AddActivitySheet } from './AddActivitySheet';
import { AddStopSheet } from './AddStopSheet';

type Props = NativeStackScreenProps<RootStackParamList, 'TripDetail'>;
type TripTabParamList = {
  Itinerary: undefined;
  Budget: undefined;
  Checklist: undefined;
  Notes: undefined;
};

const Tab = createMaterialTopTabNavigator<TripTabParamList>();

const starterChecklist = [
  { label: 'Passport', category: 'documents' },
  { label: 'Travel insurance', category: 'documents' },
  { label: 'Comfortable shoes', category: 'clothing' },
  { label: 'Rain jacket', category: 'clothing' },
  { label: 'Phone charger', category: 'electronics' },
  { label: 'Medication', category: 'health' }
];

const chartColors = ['#1B7FF0', '#F59E0B', '#10B981', '#4B5563', '#EF4444', '#9CA3AF'];

export function TripDetailScreen({ route, navigation }: Props) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [stopSheetVisible, setStopSheetVisible] = useState(false);
  const [activityStop, setActivityStop] = useState<Stop | null>(null);

  const loadTrip = useCallback(async () => {
    try {
      const data = await tripsApi.get(route.params.tripId);
      setTrip(sortTrip(data));
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Could not load trip', text2: getErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  }, [route.params.tripId]);

  useEffect(() => {
    loadTrip();
  }, [loadTrip]);

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
      const shareState = await tripsApi.share(trip.id, true);
      const publicTrip = { ...trip, isPublic: shareState.isPublic, shareToken: shareState.shareToken };
      setTrip(publicTrip);
      await shareTrip(publicTrip);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Could not share trip', text2: getErrorMessage(error) });
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.charcoal} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text numberOfLines={1} style={styles.headerTitle}>{trip.title}</Text>
          <Text style={styles.headerMeta}>{formatDateRange(trip.startDate, trip.endDate)}</Text>
        </View>
        <Pressable style={styles.iconButton} onPress={share}>
          <Ionicons name={trip.isPublic ? 'globe-outline' : 'share-social-outline'} size={21} color={colors.primary} />
        </Pressable>
      </View>

      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.gray600,
          tabBarIndicatorStyle: styles.tabIndicator,
          tabBarLabelStyle: styles.tabLabel,
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
    </SafeAreaView>
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

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      {trip.description ? <Text style={styles.body}>{trip.description}</Text> : null}

      {stops.length ? (
        stops.map((stop, index) => (
          <View key={stop.id} style={styles.stopCard}>
            <View style={styles.stopHeader}>
              <View style={styles.stopTitleWrap}>
                <Ionicons name="location-outline" size={20} color={colors.primary} />
                <View style={styles.grow}>
                  <Text style={styles.stopTitle}>{stop.cityName}, {stop.country}</Text>
                  <Text style={styles.meta}>
                    {formatDateRange(stop.arrivalDate, stop.departDate)} - {nightsBetween(stop.arrivalDate, stop.departDate)} nights
                  </Text>
                </View>
              </View>
              <View style={styles.rowActions}>
                <MiniButton icon="arrow-up-outline" disabled={index === 0} onPress={() => onMoveStop(stop, -1)} />
                <MiniButton icon="arrow-down-outline" disabled={index === stops.length - 1} onPress={() => onMoveStop(stop, 1)} />
                <MiniButton icon="trash-outline" danger onPress={() => onDeleteStop(stop)} />
              </View>
            </View>

            <View style={styles.activityList}>
              {stop.activities.map((activity) => (
                <View key={activity.id} style={styles.activityRow}>
                  <View style={styles.activityIcon}>
                    <Ionicons name="sparkles-outline" size={15} color={colors.primary} />
                  </View>
                  <View style={styles.grow}>
                    <Text style={styles.itemTitle}>{activity.name}</Text>
                    <Text style={styles.meta}>{activity.category}</Text>
                  </View>
                  <Text style={styles.cost}>{formatMoney(activity.cost)}</Text>
                  <Pressable onPress={() => onDeleteActivity(activity)} hitSlop={10}>
                    <Ionicons name="close-circle" size={20} color={colors.gray400} />
                  </Pressable>
                </View>
              ))}
            </View>

            <View style={styles.stopFooter}>
              <Pressable onPress={() => onAddActivity(stop)} style={styles.inlineAdd}>
                <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                <Text style={styles.inlineAddText}>Add Activity</Text>
              </Pressable>
              <Text style={styles.meta}>Subtotal: {formatMoney(calcStopSubtotal(stop))}</Text>
            </View>
          </View>
        ))
      ) : (
        <EmptyPanel title="No stops yet" body="Add a city stop to start building your timeline." />
      )}

      <Button label="Add Stop" icon="location-outline" onPress={onAddStop} />
    </ScrollView>
  );
}

function BudgetTab({ trip }: { trip: Trip }) {
  const total = calcTotal(trip.stops);
  const budget = Number(trip.budget ?? 0);
  const percent = budget ? Math.min(100, Math.round((total / budget) * 100)) : 0;
  const byCategory = calcByCategory(trip.stops);
  const chartData = Object.entries(byCategory)
    .filter(([, value]) => value > 0)
    .map(([label, value], index) => ({ text: label, value, color: chartColors[index % chartColors.length] }));

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <View style={styles.budgetCard}>
        <Text style={styles.meta}>Estimated</Text>
        <Text style={[styles.budgetTotal, budget > 0 && total > budget && styles.dangerText]}>{formatMoney(total)}</Text>
        <Text style={styles.body}>{budget ? `${formatMoney(budget)} budget - ${percent}% used` : 'No trip budget set'}</Text>
        <ProgressBar value={budget ? total : 0} max={budget || 1} danger={budget > 0 && total > budget} />
      </View>

      <View style={styles.chartCard}>
        {chartData.length ? (
          <PieChart data={chartData} donut radius={88} innerRadius={55} />
        ) : (
          <EmptyPanel title="No costs yet" body="Add activities with cost estimates to see the chart." compact />
        )}
      </View>

      {chartData.map((item) => (
        <View key={item.text} style={styles.breakdownRow}>
          <View style={[styles.legendDot, { backgroundColor: item.color }]} />
          <Text style={styles.itemTitle}>{item.text}</Text>
          <Text style={styles.cost}>{formatMoney(item.value)}</Text>
        </View>
      ))}
    </ScrollView>
  );
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
    setContent(initial);
    lastSaved.current = initial;
  }, [initial, trip.id]);

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

function MiniButton({
  icon,
  onPress,
  disabled,
  danger
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.miniButton, disabled && styles.disabled]}>
      <Ionicons name={icon} size={16} color={danger ? colors.danger : colors.gray600} />
    </Pressable>
  );
}

function EmptyPanel({ title, body, compact }: { title: string; body: string; compact?: boolean }) {
  return (
    <View style={[styles.emptyPanel, compact && styles.compactEmpty]}>
      <Ionicons name="sparkles-outline" size={28} color={colors.primary} />
      <Text style={styles.stopTitle}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    padding: 24,
    gap: 16
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
    gap: 16
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
  emptyPanel: {
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    padding: 20,
    gap: 8,
    alignItems: 'center'
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
