import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { socialApi } from '../../api/social';
import { FriendGroup, PublicUser, Trip, TripInput } from '../../api/types';
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
  const [friends, setFriends] = useState<PublicUser[]>([]);
  const [groups, setGroups] = useState<FriendGroup[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<number[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;

    let mounted = true;
    Promise.all([socialApi.friends(), socialApi.groups()])
      .then(([nextFriends, nextGroups]) => {
        if (!mounted) return;
        setFriends(nextFriends);
        setGroups(nextGroups);
      })
      .catch(() => {
        if (mounted) {
          setFriends([]);
          setGroups([]);
        }
      });

    return () => {
      mounted = false;
    };
  }, [visible]);

  const toggleFriend = (friendId: number) => {
    setSelectedGroupId(null);
    setSelectedFriendIds((current) =>
      current.includes(friendId) ? current.filter((id) => id !== friendId) : [...current, friendId]
    );
  };

  const toggleGroup = (groupId: number) => {
    setSelectedFriendIds([]);
    setSelectedGroupId((current) => (current === groupId ? null : groupId));
  };

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
        isPublic,
        memberIds: selectedGroupId ? [] : selectedFriendIds,
        groupId: selectedGroupId
      });
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setTitle('');
      setBudget('');
      setDescription('');
      setIsPublic(false);
      setSelectedFriendIds([]);
      setSelectedGroupId(null);
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
      <View style={styles.travelersField}>
        <Text style={styles.privacyLabel}>Travelers</Text>
        <Text style={styles.travelersHint}>Invite friends now, or attach one of your groups.</Text>
        {groups.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {groups.map((group) => (
              <TravelOption
                key={group.id}
                icon="people-outline"
                label={group.name}
                selected={selectedGroupId === group.id}
                onPress={() => toggleGroup(group.id)}
              />
            ))}
          </ScrollView>
        ) : null}
        {friends.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {friends.map((friend) => (
              <TravelOption
                key={friend.id}
                icon="person-outline"
                label={friend.name}
                selected={selectedFriendIds.includes(friend.id)}
                onPress={() => toggleFriend(friend.id)}
              />
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.travelersEmpty}>Add friends from the People tab to invite them into trips.</Text>
        )}
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

function TravelOption({
  icon,
  label,
  selected,
  onPress
}: {
  icon: 'people-outline' | 'person-outline';
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.travelOption, selected && styles.travelOptionActive]}
    >
      <Ionicons name={icon} size={15} color={selected ? colors.primary : colors.gray600} />
      <Text numberOfLines={1} style={[styles.travelOptionText, selected && styles.travelOptionTextActive]}>{label}</Text>
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
  },
  travelersField: {
    gap: 8
  },
  travelersHint: {
    ...typography.caption,
    color: colors.gray600,
    marginTop: -2
  },
  chipRow: {
    gap: 8,
    paddingRight: 20
  },
  travelOption: {
    maxWidth: 170,
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.gray50
  },
  travelOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight
  },
  travelOptionText: {
    ...typography.caption,
    color: colors.gray600,
    maxWidth: 130
  },
  travelOptionTextActive: {
    color: colors.primary
  },
  travelersEmpty: {
    ...typography.caption,
    color: colors.textMuted
  }
});
