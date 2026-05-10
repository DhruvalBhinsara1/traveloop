import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { ActivityInput } from '../../api/types';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/Button';
import { InputField } from '../../components/InputField';
import { colors, typography } from '../../theme';
import { requireText } from '../../utils/validation';

export function AddActivitySheet({
  visible,
  onClose,
  onSubmit
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (payload: ActivityInput) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('food');
  const [cost, setCost] = useState('0');
  const [duration, setDuration] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const parsedCost = Number(cost || 0);
    const validation = requireText(name, 'Activity name is required') ?? requireText(category, 'Category is required');

    if (validation) {
      setError(validation);
      return;
    }

    if (Number.isNaN(parsedCost) || parsedCost < 0) {
      setError('Cost must be a non-negative number');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        category: category.trim().toLowerCase(),
        cost: parsedCost,
        duration: duration ? Number(duration) : null
      });
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setName('');
      setCost('0');
      setDuration('');
      setError(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add activity');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomSheet visible={visible} title="Add Activity" onClose={onClose}>
      <InputField label="Activity Name *" value={name} onChangeText={setName} placeholder="Ramen at Ichiran" />
      <InputField label="Category" value={category} onChangeText={setCategory} placeholder="food" />
      <InputField label="Cost" value={cost} onChangeText={setCost} keyboardType="numeric" />
      <InputField label="Duration" value={duration} onChangeText={setDuration} placeholder="60 min" keyboardType="numeric" />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label="Add Activity" icon="add-circle-outline" onPress={submit} loading={submitting} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  error: {
    ...typography.caption,
    color: colors.danger
  }
});
