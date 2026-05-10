import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
  const [isPublic, setIsPublic] = useState(false);
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
        coverImage: getDestinationImage(title),
        isPublic
      });
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setTitle('');
      setBudget('');
      setDescription('');
      setIsPublic(false);
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
        <InputField label="Start Date" value={startDate} onChangeText={setStartDate} containerStyle={styles.dateField} />
        <InputField label="End Date" value={endDate} onChangeText={setEndDate} containerStyle={styles.dateField} />
      </View>
      <InputField label="Budget" value={budget} onChangeText={setBudget} placeholder="$3000" keyboardType="numeric" />
      <InputField
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="Cherry blossoms, ramen, and temples"
        multiline
      />
      <View style={styles.privacyField}>
        <Text style={styles.privacyLabel}>Visibility</Text>
        <View style={styles.privacySegment}>
          <VisibilityOption label="Private" active={!isPublic} onPress={() => setIsPublic(false)} />
          <VisibilityOption label="Public" active={isPublic} onPress={() => setIsPublic(true)} />
        </View>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label="Create Trip" icon="add-circle-outline" onPress={submit} loading={submitting} />
    </BottomSheet>
  );
}

function VisibilityOption({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.privacyOption, active && styles.privacyOptionActive]}>
      <Text style={[styles.privacyOptionText, active && styles.privacyOptionTextActive]}>{label}</Text>
    </Pressable>
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
  },
  privacyField: {
    gap: 8
  },
  privacyLabel: {
    ...typography.bodyMedium,
    color: colors.charcoal
  },
  privacySegment: {
    minHeight: 44,
    borderRadius: 999,
    padding: 4,
    flexDirection: 'row',
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.border
  },
  privacyOption: {
    flex: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center'
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
  }
});
