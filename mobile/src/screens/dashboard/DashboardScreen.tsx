import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { DestinationCard, TripCard } from '../../components/Card';
import { Button, IconButton } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { SectionHeader } from '../../components/SectionHeader';
import { StatPill } from '../../components/StatPill';
import { colors, typography } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { useTrips } from '../../hooks/useTrips';
import { inspiration } from '../../utils/photos';
import { isUpcoming } from '../../utils/dateHelpers';
import { CreateTripSheet } from '../trips/CreateTripSheet';

type Props = {
  navigation: any;
};

export function DashboardScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { trips, refreshing, refresh, createTrip } = useTrips();
  const [createVisible, setCreateVisible] = useState(false);

  const stats = useMemo(() => {
    const countries = new Set(trips.flatMap((trip) => trip.stops.map((stop) => stop.country))).size;
    return {
      trips: trips.length,
      countries,
      upcoming: trips.filter((trip) => isUpcoming(trip.startDate)).length
    };
  }, [trips]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <View style={styles.topBar}>
        <IconButton icon="menu-outline" variant="soft" onPress={() => undefined} />
        <View style={styles.topActions}>
          <IconButton icon="search-outline" variant="soft" onPress={() => undefined} />
          <View>
            <IconButton icon="notifications-outline" variant="soft" onPress={() => undefined} />
            <View style={styles.dot} />
          </View>
        </View>
      </View>

      <View style={styles.heroCopy}>
        <Text style={styles.title}>
          {greeting}, {user?.name?.split(' ')[0] ?? 'Traveler'}
        </Text>
        <Text style={styles.body}>Ready for your next trip?</Text>
      </View>

      <View style={styles.stats}>
        <StatPill value={stats.trips} label="Trips" icon="map-outline" />
        <StatPill value={stats.countries} label="Countries" icon="earth-outline" />
        <StatPill value={stats.upcoming} label="Soon" icon="calendar-outline" />
      </View>

      <Button label="Plan New Trip" icon="add-circle-outline" onPress={() => setCreateVisible(true)} />

      <View style={styles.section}>
        <SectionHeader title="Recent Trips" />
        {trips.slice(0, 3).length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontal}>
            {trips.slice(0, 3).map((trip) => (
              <View key={trip.id} style={styles.recentCard}>
                <TripCard trip={trip} onPress={() => navigation.navigate('TripDetail', { tripId: trip.id })} />
              </View>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.softBox}>
            <Ionicons name="sparkles-outline" size={22} color={colors.primary} />
            <Text style={styles.body}>Create your first itinerary and it will appear here.</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader title="Explore" />
        <View style={styles.destinationStack}>
          {inspiration.slice(0, 3).map((item) => (
            <DestinationCard key={item.city} city={item.city} country={item.country} rating={item.rating} image={item.image} height={190} />
          ))}
        </View>
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
  topBar: {
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  topActions: {
    flexDirection: 'row',
    gap: 10
  },
  dot: {
    position: 'absolute',
    top: 4,
    right: 3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger
  },
  heroCopy: {
    marginTop: 24,
    gap: 5
  },
  title: {
    ...typography.h1
  },
  body: {
    ...typography.body
  },
  stats: {
    marginTop: 20,
    flexDirection: 'row',
    gap: 10
  },
  section: {
    marginTop: 28,
    gap: 16
  },
  horizontal: {
    gap: 14,
    paddingRight: 20
  },
  recentCard: {
    width: 285
  },
  softBox: {
    minHeight: 92,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    padding: 16,
    gap: 8,
    justifyContent: 'center'
  },
  destinationStack: {
    gap: 16
  }
});
