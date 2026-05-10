import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { StopInput, Trip } from '../../api/types';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/Button';
import { InputField } from '../../components/InputField';
import { colors, typography } from '../../theme';
import { formatShortDate } from '../../utils/dateHelpers';
import { requireText, validateTripDates } from '../../utils/validation';

export function AddStopSheet({
  visible,
  trip,
  onClose,
  onSubmit
}: {
  visible: boolean;
  trip: Trip;
  onClose: () => void;
  onSubmit: (payload: StopInput) => Promise<void>;
}) {
  const [cityName, setCityName] = useState('');
  const [country, setCountry] = useState('');
  const [arrivalDate, setArrivalDate] = useState(trip.startDate.slice(0, 10));
  const [departDate, setDepartDate] = useState(trip.endDate.slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const validation =
      requireText(cityName, 'City is required') ?? requireText(country, 'Country is required') ?? validateTripDates(arrivalDate, departDate);
    const arrival = new Date(arrivalDate);
    const depart = new Date(departDate);
    const tripStart = new Date(trip.startDate);
    const tripEnd = new Date(trip.endDate);

    if (validation) {
      setError(validation);
      return;
    }

    if (arrival < tripStart || depart > tripEnd) {
      setError(`Stop must fit inside ${formatShortDate(trip.startDate)} - ${formatShortDate(trip.endDate)}`);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({ cityName: cityName.trim(), country: country.trim(), arrivalDate, departDate });
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setCityName('');
      setCountry('');
      setError(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add stop');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomSheet visible={visible} title="Add a Stop" onClose={onClose}>
      <InputField label="City Name *" value={cityName} onChangeText={setCityName} placeholder="Tokyo" />
      <InputField label="Country *" value={country} onChangeText={setCountry} placeholder="Japan" />
      <View style={styles.row}>
        <InputField label="Arrival" value={arrivalDate} onChangeText={setArrivalDate} containerStyle={styles.dateField} />
        <InputField label="Departure" value={departDate} onChangeText={setDepartDate} containerStyle={styles.dateField} />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label="Add Stop" icon="location-outline" onPress={submit} loading={submitting} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12
  },
  dateField: {
    flex: 1,
    minWidth: 0
  },
  error: {
    ...typography.caption,
    color: colors.danger
  }
});
