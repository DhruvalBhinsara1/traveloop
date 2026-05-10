import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { tripsApi } from '../../api/trips';
import { Trip } from '../../api/types';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { ActivityItem } from '../../components/TripBuilding';
import { colors, typography } from '../../theme';
import { calcTotal } from '../../utils/budgetCalc';
import { formatDateRange, nightsBetween } from '../../utils/dateHelpers';
import { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PublicTrip'>;

export function PublicTripScreen({ route, navigation }: Props) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tripsApi
      .publicTrip(route.params.shareToken)
      .then(setTrip)
      .finally(() => setLoading(false));
  }, [route.params.shareToken]);

  const total = useMemo(() => (trip ? calcTotal(trip.stops) : 0), [trip]);

  if (loading) {
    return (
      <Screen scrollable={false}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (!trip) {
    return (
      <Screen>
        <Text style={styles.title}>Public trip not found</Text>
        <Button label="Plan your own trip" onPress={() => navigation.navigate('Login')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.logo}>Traveloop</Text>
      <Text style={styles.title}>{trip.title}</Text>
      <Text style={styles.body}>
        by {trip.user?.name ?? 'Traveler'} - {formatDateRange(trip.startDate, trip.endDate)} - {nightsBetween(trip.startDate, trip.endDate)} days
      </Text>
      <View style={styles.list}>
        {trip.stops.map((stop) => (
          <View key={stop.id} style={styles.stop}>
            <Text style={styles.stopTitle}>
              {stop.cityName}, {stop.country}
            </Text>
            {stop.activities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </View>
        ))}
      </View>
      <Text style={styles.total}>Total estimated: ${total.toLocaleString()}</Text>
      <Button label="Plan your own trip" icon="airplane-outline" onPress={() => navigation.navigate('Login')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  logo: {
    paddingTop: 16,
    fontFamily: 'Nunito_900Black',
    fontSize: 22,
    color: colors.primary
  },
  title: {
    ...typography.h1,
    marginTop: 24
  },
  body: {
    ...typography.body,
    marginTop: 8
  },
  list: {
    marginTop: 28,
    gap: 16
  },
  stop: {
    gap: 8
  },
  stopTitle: {
    ...typography.label
  },
  total: {
    ...typography.price,
    marginVertical: 28
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
