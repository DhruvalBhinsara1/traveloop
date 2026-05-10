import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Trip, TripInput } from '../../api/types';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/Button';
import { InputField } from '../../components/InputField';
import { colors, typography } from '../../theme';
import { todayIso } from '../../utils/dateHelpers';
import { getDestinationImage } from '../../utils/photos';
import { requireText, validateTripDates } from '../../utils/validation';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (payload: TripInput) => Promise<Trip>;
  onCreated?: (trip: Trip) => void;
};

export function CreateTripSheet({ visible, onClose, onSubmit, onCreated }: Props) {
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState(todayIso());
  const [budget, setBudget] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const validation = requireText(title, 'Trip name is required') ?? validateTripDates(startDate, endDate);
    const parsedBudget = budget.trim() ? Number(budget) : null;

    if (validation) {
      setError(validation);
      return;
    }

    if (title.trim().length > 60) {
      setError('Trip name must be 60 characters or fewer');
      return;
    }

    if (parsedBudget !== null && (Number.isNaN(parsedBudget) || parsedBudget < 0)) {
      setError('Budget must be a non-negative number');
      return;
    }

    setSubmitting(true);
    try {
      const trip = await onSubmit({
        title: title.trim(),
        description: description.trim(),
        startDate,
        endDate,
        budget: parsedBudget,
        coverImage: getDestinationImage(title)
      });
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setTitle('');
      setBudget('');
      setDescription('');
      setError(null);
      onCreated?.(trip);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create trip');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomSheet visible={visible} title="Create New Trip" onClose={onClose}>
      <InputField label="Trip Name *" value={title} onChangeText={setTitle} placeholder="Japan 2026" />
      <View style={styles.row}>
        <InputField label="Start Date" value={startDate} onChangeText={setStartDate} style={styles.halfInput} />
        <InputField label="End Date" value={endDate} onChangeText={setEndDate} style={styles.halfInput} />
      </View>
      <InputField label="Budget" value={budget} onChangeText={setBudget} placeholder="$3000" keyboardType="numeric" />
      <InputField
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="Cherry blossoms, ramen, and temples"
        multiline
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label="Create Trip" icon="add-circle-outline" onPress={submit} loading={submitting} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12
  },
  halfInput: {
    minWidth: 112
  },
  error: {
    ...typography.caption,
    color: colors.danger
  }
});
