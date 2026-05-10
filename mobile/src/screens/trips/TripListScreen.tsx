import * as Haptics from 'expo-haptics';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { TripCard } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { colors, typography } from '../../theme';
import { useMemo, useState } from 'react';
import { useTrips } from '../../hooks/useTrips';
import { isUpcoming } from '../../utils/dateHelpers';
import { CreateTripSheet } from './CreateTripSheet';

type Props = {
  navigation: any;
};
type Filter = 'All' | 'Upcoming' | 'Past';

export function TripListScreen({ navigation }: Props) {
  const { trips, refreshing, refresh, createTrip, deleteTrip } = useTrips();
  const [filter, setFilter] = useState<Filter>('All');
  const [createVisible, setCreateVisible] = useState(false);

  const visibleTrips = useMemo(() => {
    if (filter === 'Upcoming') return trips.filter((trip) => isUpcoming(trip.startDate));
    if (filter === 'Past') return trips.filter((trip) => !isUpcoming(trip.startDate));
    return trips;
  }, [filter, trips]);

  const confirmDelete = (id: number) => {
    Alert.alert('Delete trip?', 'This removes the itinerary, stops, activities, checklist, and notes.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          await deleteTrip(id);
        }
      }
    ]);
  };

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <View style={styles.header}>
        <Text style={styles.title}>My Trips</Text>
        <Button label="New" icon="add" onPress={() => setCreateVisible(true)} style={styles.newButton} />
      </View>

      <View style={styles.filters}>
        {(['All', 'Upcoming', 'Past'] as Filter[]).map((item) => (
          <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filter, filter === item && styles.filterActive]}>
            <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.list}>
        {visibleTrips.length ? (
          visibleTrips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              onPress={() => navigation.navigate('TripDetail', { tripId: trip.id })}
              onDelete={() => confirmDelete(trip.id)}
            />
          ))
        ) : (
          <EmptyState
            title="No trips yet"
            body="Start planning your first adventure."
            action="Plan a Trip"
            onAction={() => setCreateVisible(true)}
          />
        )}
      </View>

      <CreateTripSheet
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onSubmit={createTrip}
        onCreated={(trip) => navigation.navigate('TripDetail', { tripId: trip.id })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  title: {
    ...typography.h1
  },
  newButton: {
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 16
  },
  filters: {
    marginTop: 20,
    flexDirection: 'row',
    gap: 10
  },
  filter: {
    minHeight: 44,
    borderRadius: 999,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray100
  },
  filterActive: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.primary
  },
  filterText: {
    ...typography.bodyMedium,
    color: colors.gray600
  },
  filterTextActive: {
    color: colors.primary
  },
  list: {
    marginTop: 20,
    gap: 16
  }
});
