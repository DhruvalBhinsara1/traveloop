import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Activity, ChecklistItem, Stop } from '../api/types';
import { colors, shadows, typography } from '../theme';
import { formatDateRange, nightsBetween } from '../utils/dateHelpers';
import { IconButton } from './Button';
import { ProgressBar } from './ProgressBar';
import { categoryIcon } from './photoUtils';

export function ActivityItem({ activity }: { activity: Activity }) {
  return (
    <View style={styles.activity}>
      <View style={styles.activityIcon}>
        <Ionicons name={categoryIcon(activity.category)} size={16} color={colors.gray600} />
      </View>
      <View style={styles.grow}>
        <Text style={styles.itemTitle}>{activity.name}</Text>
        <Text style={styles.meta}>{activity.category}</Text>
      </View>
      <Text style={styles.cost}>${activity.cost.toLocaleString()}</Text>
    </View>
  );
}

export function StopCard({
  stop,
  onAddActivity,
  onMoveUp,
  onMoveDown
}: {
  stop: Stop;
  onAddActivity: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const subtotal = stop.activities.reduce((sum, activity) => sum + activity.cost, 0);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.stopTitleWrap}>
          <Ionicons name="location-outline" size={20} color={colors.primary} />
          <View>
            <Text style={styles.stopTitle}>
              {stop.cityName}, {stop.country}
            </Text>
            <Text style={styles.meta}>
              {formatDateRange(stop.arrivalDate, stop.departDate)} - {nightsBetween(stop.arrivalDate, stop.departDate)} nights
            </Text>
          </View>
        </View>
        <View style={styles.reorder}>
          <IconButton icon="arrow-up-outline" variant="soft" onPress={onMoveUp} />
          <IconButton icon="arrow-down-outline" variant="soft" onPress={onMoveDown} />
        </View>
      </View>
      <View style={styles.activityList}>
        {stop.activities.map((activity) => (
          <ActivityItem key={activity.id} activity={activity} />
        ))}
      </View>
      <View style={styles.footer}>
        <Pressable onPress={onAddActivity} style={styles.addInline}>
          <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
          <Text style={styles.addText}>Add Activity</Text>
        </Pressable>
        <Text style={styles.subtotal}>Subtotal: ${subtotal.toLocaleString()}</Text>
      </View>
    </View>
  );
}

export function ChecklistRow({ item, onToggle }: { item: ChecklistItem; onToggle: () => void }) {
  return (
    <Pressable onPress={onToggle} style={styles.checkRow}>
      <Ionicons
        name={item.isPacked ? 'checkmark-circle' : 'checkmark-circle-outline'}
        size={24}
        color={item.isPacked ? colors.success : colors.gray400}
      />
      <Text style={[styles.itemTitle, item.isPacked && styles.packed]}>{item.label}</Text>
      <Text style={styles.meta}>{item.category}</Text>
    </Pressable>
  );
}

export function PackedSummary({ packed, total }: { packed: number; total: number }) {
  const percent = total ? (packed / total) * 100 : 0;
  return (
    <View style={styles.summary}>
      <Text style={styles.stopTitle}>
        {packed} / {total} packed
      </Text>
      <ProgressBar value={percent} />
      <Text style={styles.meta}>{Math.round(percent)}% ready</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    backgroundColor: colors.white,
    padding: 16,
    gap: 14,
    ...shadows.card
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12
  },
  stopTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    gap: 10
  },
  stopTitle: {
    ...typography.label
  },
  meta: {
    ...typography.caption
  },
  reorder: {
    flexDirection: 'row',
    gap: 8
  },
  activityList: {
    gap: 8
  },
  activity: {
    minHeight: 48,
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
  grow: {
    flex: 1
  },
  itemTitle: {
    ...typography.bodyMedium
  },
  cost: {
    ...typography.bodyMedium,
    color: colors.charcoal
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: colors.gray100,
    paddingTop: 12
  },
  addInline: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  addText: {
    ...typography.bodyMedium,
    color: colors.primary
  },
  subtotal: {
    ...typography.caption,
    color: colors.gray600
  },
  checkRow: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...shadows.subtle
  },
  packed: {
    textDecorationLine: 'line-through',
    color: colors.gray400
  },
  summary: {
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    padding: 16,
    gap: 10
  }
});
