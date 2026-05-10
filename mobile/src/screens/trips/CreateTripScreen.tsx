import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import Toast from 'react-native-toast-message';

import { getApiErrorMessage } from '../../api/client';
import { tripsApi } from '../../api/trips';
import type { RootStackParamList } from '../../navigation/types';
import { formatDate, toIsoDate } from '../../utils/dateHelpers';
import { colors, fonts, radii, spacing } from '../../utils/theme';
import {
  hasErrors,
  parseOptionalMoney,
  validateTrip,
  type ValidationErrors
} from '../../utils/validation';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateTrip'>;
type DateField = 'startDate' | 'endDate';

export function CreateTripScreen({ navigation }: Props) {
  const today = new Date();
  const defaultEnd = new Date();
  defaultEnd.setDate(today.getDate() + 7);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [pickerField, setPickerField] = useState<DateField | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors<'title' | 'startDate' | 'endDate' | 'budget'>>({});

  const submit = async () => {
    const parsedBudget = parseOptionalMoney(budget);
    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      startDate: toIsoDate(startDate),
      endDate: toIsoDate(endDate),
      budget: parsedBudget
    };
    const nextErrors = validateTrip(payload);
    setErrors(nextErrors);

    if (hasErrors(nextErrors)) return;

    setIsSubmitting(true);

    try {
      const trip = await tripsApi.create(payload);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Toast.show({ type: 'success', text1: 'Trip created', text2: trip.title });
      navigation.replace('TripDetail', { tripId: trip.id });
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Could not create trip', text2: getApiErrorMessage(error) });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS !== 'ios') {
      setPickerField(null);
    }

    if (!selected || !pickerField) return;

    if (pickerField === 'startDate') {
      setStartDate(selected);

      if (selected.getTime() > endDate.getTime()) {
        setEndDate(selected);
      }
    } else {
      setEndDate(selected);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.sheetHandle} />
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Create New Trip</Text>
              <Text style={styles.subtitle}>Sketch the route. Fill in magic later.</Text>
            </View>
            <Pressable style={styles.closeButton} onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={22} color={colors.charcoal} />
            </Pressable>
          </View>

          <Field
            label="Trip Name *"
            value={title}
            onChangeText={setTitle}
            placeholder="Japan Adventure"
            error={errors.title}
          />

          <View style={styles.dateRow}>
            <DateButton
              label="Start Date"
              value={formatDate(startDate, true)}
              onPress={() => setPickerField('startDate')}
              error={errors.startDate}
            />
            <DateButton
              label="End Date"
              value={formatDate(endDate, true)}
              onPress={() => setPickerField('endDate')}
              error={errors.endDate}
            />
          </View>

          {pickerField ? (
            <DateTimePicker
              value={pickerField === 'startDate' ? startDate : endDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={pickerField === 'endDate' ? startDate : undefined}
              onChange={onDateChange}
            />
          ) : null}

          <Field
            label="Budget"
            value={budget}
            onChangeText={setBudget}
            placeholder="$ 3000"
            keyboardType="numeric"
            error={errors.budget}
          />

          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Temples, ramen counters, mountain trains..."
              placeholderTextColor={colors.gray400}
              multiline
              style={[styles.inputShell, styles.textArea]}
            />
          </View>

          <Pressable
            onPress={submit}
            disabled={isSubmitting}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed, isSubmitting && styles.disabled]}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Ionicons name="sparkles-outline" size={18} color={colors.white} />
                <Text style={styles.primaryButtonText}>Create Trip</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  error?: string;
  keyboardType?: 'default' | 'numeric';
};

function Field({ label, value, onChangeText, placeholder, error, keyboardType = 'default' }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.gray400}
        keyboardType={keyboardType}
        style={[styles.inputShell, error && styles.inputError]}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

type DateButtonProps = {
  label: string;
  value: string;
  onPress: () => void;
  error?: string;
};

function DateButton({ label, value, onPress, error }: DateButtonProps) {
  return (
    <View style={styles.dateField}>
      <Text style={styles.label}>{label}</Text>
      <Pressable onPress={onPress} style={[styles.dateButton, error && styles.inputError]}>
        <Text style={styles.dateText}>{value}</Text>
        <Ionicons name="calendar-outline" size={18} color={colors.primary} />
      </Pressable>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white
  },
  keyboard: {
    flex: 1
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    gap: spacing.md
  },
  sheetHandle: {
    width: 48,
    height: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.gray200,
    alignSelf: 'center',
    marginBottom: spacing.sm
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 28,
    color: colors.charcoal
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.gray500,
    marginTop: spacing.xs
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center'
  },
  field: {
    gap: spacing.sm
  },
  label: {
    fontFamily: fonts.label,
    fontSize: 14,
    color: colors.charcoal
  },
  inputShell: {
    minHeight: 54,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gray200,
    backgroundColor: colors.gray50,
    paddingHorizontal: spacing.md,
    color: colors.charcoal,
    fontFamily: fonts.bodyMedium,
    fontSize: 15
  },
  inputError: {
    borderColor: colors.danger,
    backgroundColor: '#FFF7F7'
  },
  textArea: {
    minHeight: 112,
    paddingVertical: spacing.md,
    textAlignVertical: 'top'
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.md
  },
  dateField: {
    flex: 1,
    gap: spacing.sm
  },
  dateButton: {
    minHeight: 54,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gray200,
    backgroundColor: colors.gray50,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  dateText: {
    fontFamily: fonts.bodyMedium,
    color: colors.charcoal,
    fontSize: 14
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.danger
  },
  primaryButton: {
    minHeight: 58,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md
  },
  buttonPressed: {
    backgroundColor: colors.primaryDark
  },
  disabled: {
    opacity: 0.72
  },
  primaryButtonText: {
    fontFamily: fonts.label,
    color: colors.white,
    fontSize: 16
  }
});
