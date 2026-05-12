import { Ionicons } from '@expo/vector-icons';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { ReactNode, useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import Toast from 'react-native-toast-message';

import { getErrorMessage } from '../../api/client';
import { socialApi } from '../../api/social';
import { FriendGroup, FriendRequest, PublicUser, UserSearchResult } from '../../api/types';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/Button';
import { InputField } from '../../components/InputField';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../context/AuthContext';
import { useFocusedAutoRefresh } from '../../hooks/useFocusedAutoRefresh';
import { MainTabParamList } from '../../navigation/types';
import { colors, fontFamily, radius, shadows, spacing, typography } from '../../theme';
import { normalizeUsername } from '../../utils/validation';

type Props = BottomTabScreenProps<MainTabParamList, 'People'>;

export function PeopleScreen(_props: Props) {
  const { user } = useAuth();
  const [friends, setFriends] = useState<PublicUser[]>([]);
  const [groups, setGroups] = useState<FriendGroup[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [groupVisible, setGroupVisible] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [savingGroup, setSavingGroup] = useState(false);
  const peopleRequestRef = useRef<Promise<void> | null>(null);

  const loadPeople = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (peopleRequestRef.current) return peopleRequestRef.current;

    const request = Promise.all([
      socialApi.friends(),
      socialApi.requests(),
      socialApi.groups()
    ])
      .then(([nextFriends, requests, nextGroups]) => {
        setFriends(nextFriends);
        setIncoming(requests.incoming);
        setOutgoing(requests.outgoing);
        setGroups(nextGroups);
      })
      .catch((error) => {
        if (!silent) {
          Toast.show({ type: 'error', text1: 'Could not load people', text2: getErrorMessage(error) });
        }
      })
      .finally(() => {
        setLoading(false);
        peopleRequestRef.current = null;
      });

    peopleRequestRef.current = request;
    return request;
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPeople();
    }, [loadPeople])
  );

  useFocusedAutoRefresh(() => loadPeople({ silent: true }), {
    enabled: !searching && !groupVisible && !savingGroup
  });

  const outgoingUserIds = useMemo(() => new Set(outgoing.map((request) => request.recipientId)), [outgoing]);

  const search = async () => {
    const username = normalizeUsername(query);
    if (username.length < 2) {
      Toast.show({ type: 'info', text1: 'Search by username', text2: 'Type at least two characters.' });
      return;
    }

    setSearching(true);
    try {
      setResults(await socialApi.searchUsers(username));
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Search failed', text2: getErrorMessage(error) });
    } finally {
      setSearching(false);
    }
  };

  const sendRequest = async (result: UserSearchResult) => {
    try {
      await socialApi.sendFriendRequest({ userId: result.id });
      setResults((current) =>
        current.map((item) => (item.id === result.id ? { ...item, relationship: 'request_sent' } : item))
      );
      await loadPeople();
      Toast.show({ type: 'success', text1: 'Friend request sent' });
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Could not send request', text2: getErrorMessage(error) });
    }
  };

  const respond = async (request: FriendRequest, action: 'accept' | 'decline') => {
    try {
      await socialApi.respondFriendRequest(request.id, action);
      await loadPeople();
      Toast.show({ type: 'success', text1: action === 'accept' ? 'Friend added' : 'Request declined' });
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Could not update request', text2: getErrorMessage(error) });
    }
  };

  const toggleMember = (friendId: number) => {
    setSelectedMembers((current) =>
      current.includes(friendId) ? current.filter((id) => id !== friendId) : [...current, friendId]
    );
  };

  const createGroup = async () => {
    const name = groupName.trim();
    if (!name || savingGroup) return;

    setSavingGroup(true);
    try {
      await socialApi.createGroup({ name, memberIds: selectedMembers });
      setGroupName('');
      setSelectedMembers([]);
      setGroupVisible(false);
      await loadPeople();
      Toast.show({ type: 'success', text1: 'Group created' });
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Could not create group', text2: getErrorMessage(error) });
    } finally {
      setSavingGroup(false);
    }
  };

  const copyUsername = async () => {
    if (!user?.username) return;
    await Clipboard.setStringAsync(user.username);
    Toast.show({ type: 'success', text1: 'Username copied' });
  };

  return (
    <Screen backgroundColor={colors.background} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>People</Text>
          <Text style={styles.title}>Friends & Groups</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Copy username" onPress={copyUsername} style={styles.usernameBadge}>
          <Text numberOfLines={1} style={styles.usernameText}>@{user?.username ?? 'traveler'}</Text>
          <Ionicons name="copy-outline" size={15} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.searchCard}>
        <InputField
          label="Find a friend"
          value={query}
          onChangeText={setQuery}
          placeholder="Search username"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={search}
          rightAccessory={searching ? <ActivityIndicator color={colors.primary} /> : undefined}
        />
        <Button label="Search" icon="search-outline" onPress={search} loading={searching} />
      </View>

      {results.length ? (
        <View style={styles.section}>
          <SectionTitle title="Search Results" />
          {results.map((result) => (
            <PersonRow
              key={result.id}
              user={result}
              meta={`@${result.username}`}
              action={<SearchAction result={result} outgoingUserIds={outgoingUserIds} onSend={() => sendRequest(result)} />}
            />
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <SectionTitle title="Requests" badge={incoming.length ? String(incoming.length) : undefined} />
        {loading ? <LoadingRow /> : null}
        {!loading && incoming.length ? (
          incoming.map((request) => (
            <PersonRow
              key={request.id}
              user={request.requester}
              meta={`@${request.requester.username} wants to connect`}
              action={
                <View style={styles.requestActions}>
                  <SmallButton label="Decline" onPress={() => respond(request, 'decline')} />
                  <SmallButton label="Accept" primary onPress={() => respond(request, 'accept')} />
                </View>
              }
            />
          ))
        ) : !loading ? (
          <EmptyCard icon="mail-open-outline" title="No pending requests" body="Friend requests will appear here." />
        ) : null}
      </View>

      <View style={styles.section}>
        <SectionTitle title="Friends" badge={friends.length ? String(friends.length) : undefined} />
        {friends.length ? (
          friends.map((friend) => <PersonRow key={friend.id} user={friend} meta={`@${friend.username}`} />)
        ) : (
          <EmptyCard icon="person-add-outline" title="Add your first friend" body="Search by username to invite teammates into trips." />
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <SectionTitle title="Groups" badge={groups.length ? String(groups.length) : undefined} compact />
          <Pressable
            accessibilityRole="button"
            onPress={() => setGroupVisible(true)}
            style={({ pressed }) => [styles.createGroupButton, pressed && styles.pressed]}
          >
            <Ionicons name="add" size={18} color={colors.white} />
            <Text style={styles.createGroupText}>New</Text>
          </Pressable>
        </View>
        {groups.length ? (
          groups.map((group) => <GroupCard key={group.id} group={group} />)
        ) : (
          <EmptyCard icon="people-outline" title="No groups yet" body="Create groups for recurring travel crews." />
        )}
      </View>

      <BottomSheet visible={groupVisible} title="Create Group" onClose={() => setGroupVisible(false)}>
        <InputField label="Group Name" value={groupName} onChangeText={setGroupName} placeholder="Japan crew" />
        <View style={styles.friendPicker}>
          <Text style={styles.pickerLabel}>Members</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.memberChips}>
            {friends.length ? (
              friends.map((friend) => {
                const selected = selectedMembers.includes(friend.id);
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={friend.id}
                    onPress={() => toggleMember(friend.id)}
                    style={[styles.memberChip, selected && styles.memberChipActive]}
                  >
                    <Avatar user={friend} size={26} />
                    <Text style={[styles.memberChipText, selected && styles.memberChipTextActive]}>{friend.name}</Text>
                  </Pressable>
                );
              })
            ) : (
              <Text style={styles.emptyInlineText}>Add friends before creating a group.</Text>
            )}
          </ScrollView>
        </View>
        <Button
          label="Create Group"
          icon="people-outline"
          disabled={!groupName.trim() || savingGroup}
          loading={savingGroup}
          onPress={createGroup}
        />
      </BottomSheet>
    </Screen>
  );
}

function SearchAction({
  result,
  outgoingUserIds,
  onSend
}: {
  result: UserSearchResult;
  outgoingUserIds: Set<number>;
  onSend: () => void;
}) {
  const relationship = outgoingUserIds.has(result.id) ? 'request_sent' : result.relationship;

  if (relationship === 'friend') return <StatusPill label="Friend" icon="checkmark" />;
  if (relationship === 'request_sent') return <StatusPill label="Sent" icon="time-outline" />;
  if (relationship === 'request_received') return <StatusPill label="Pending" icon="mail-outline" />;

  return <SmallButton label="Add" primary onPress={onSend} />;
}

function PersonRow({
  user,
  meta,
  action
}: {
  user: PublicUser;
  meta: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.personRow}>
      <Avatar user={user} size={44} />
      <View style={styles.personCopy}>
        <Text numberOfLines={1} style={styles.personName}>{user.name}</Text>
        <Text numberOfLines={1} style={styles.personMeta}>{meta}</Text>
      </View>
      {action}
    </View>
  );
}

function GroupCard({ group }: { group: FriendGroup }) {
  const previewMembers = group.members.slice(0, 4);

  return (
    <View style={styles.groupCard}>
      <View style={styles.groupIcon}>
        <Ionicons name="people-outline" size={20} color={colors.primary} />
      </View>
      <View style={styles.groupCopy}>
        <Text numberOfLines={1} style={styles.groupName}>{group.name}</Text>
        <Text numberOfLines={1} style={styles.groupMeta}>
          {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
        </Text>
      </View>
      <View style={styles.avatarStack}>
        {previewMembers.map((member, index) => (
          <View key={member.id} style={[styles.stackedAvatar, { marginLeft: index ? -10 : 0 }]}>
            <Avatar user={member.user} size={30} />
          </View>
        ))}
      </View>
    </View>
  );
}

function Avatar({ user, size }: { user: PublicUser; size: number }) {
  const initials = user.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || user.username.slice(0, 1).toUpperCase();

  if (user.avatarUrl) {
    return <Image source={{ uri: user.avatarUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }

  return (
    <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: Math.max(10, size * 0.34), lineHeight: Math.max(13, size * 0.42) }]}>
        {initials}
      </Text>
    </View>
  );
}

function SectionTitle({ title, badge, compact }: { title: string; badge?: string; compact?: boolean }) {
  return (
    <View style={[styles.sectionTitleRow, compact && styles.sectionTitleCompact]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {badge ? <Text style={styles.sectionBadge}>{badge}</Text> : null}
    </View>
  );
}

function SmallButton({
  label,
  onPress,
  primary
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.smallButton, primary && styles.smallButtonPrimary, pressed && styles.pressed]}
    >
      <Text style={[styles.smallButtonText, primary && styles.smallButtonTextPrimary]}>{label}</Text>
    </Pressable>
  );
}

function StatusPill({ label, icon }: { label: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.statusPill}>
      <Ionicons name={icon} size={14} color={colors.primary} />
      <Text style={styles.statusText}>{label}</Text>
    </View>
  );
}

function LoadingRow() {
  return (
    <View style={styles.loadingRow}>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.personMeta}>Loading people...</Text>
    </View>
  );
}

function EmptyCard({ icon, title, body }: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }) {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.personCopy}>
        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={styles.emptyBody}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 10,
    paddingBottom: 118,
    gap: 18
  },
  header: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  eyebrow: {
    color: colors.textMuted,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    textTransform: 'uppercase'
  },
  title: {
    color: colors.charcoal,
    fontFamily: fontFamily.headingExtraBold,
    fontSize: 27,
    lineHeight: 33
  },
  usernameBadge: {
    maxWidth: 154,
    minHeight: 38,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  usernameText: {
    color: colors.charcoal,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    lineHeight: 17,
    flexShrink: 1
  },
  searchCard: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    gap: 12,
    ...shadows.subtle
  },
  section: {
    gap: 10
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  sectionTitleRow: {
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  sectionTitleCompact: {
    flex: 1
  },
  sectionTitle: {
    color: colors.charcoal,
    fontFamily: fontFamily.headingBold,
    fontSize: 19,
    lineHeight: 24
  },
  sectionBadge: {
    minWidth: 24,
    minHeight: 24,
    borderRadius: 12,
    overflow: 'hidden',
    textAlign: 'center',
    color: colors.primary,
    backgroundColor: colors.primaryLight,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    lineHeight: 24
  },
  personRow: {
    minHeight: 72,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  personCopy: {
    flex: 1,
    minWidth: 0
  },
  personName: {
    color: colors.charcoal,
    fontFamily: fontFamily.headingBold,
    fontSize: 15,
    lineHeight: 20
  },
  personMeta: {
    color: colors.textMuted,
    fontFamily: fontFamily.body,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 1
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8
  },
  smallButton: {
    minHeight: 34,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray100
  },
  smallButtonPrimary: {
    backgroundColor: colors.primary
  },
  smallButtonText: {
    color: colors.charcoal,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    lineHeight: 16
  },
  smallButtonTextPrimary: {
    color: colors.white
  },
  statusPill: {
    minHeight: 34,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primaryLight
  },
  statusText: {
    color: colors.primary,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    lineHeight: 16
  },
  groupCard: {
    minHeight: 76,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  groupIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight
  },
  groupCopy: {
    flex: 1,
    minWidth: 0
  },
  groupName: {
    color: colors.charcoal,
    fontFamily: fontFamily.headingBold,
    fontSize: 16,
    lineHeight: 21
  },
  groupMeta: {
    color: colors.textMuted,
    fontFamily: fontFamily.body,
    fontSize: 12,
    lineHeight: 16
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  stackedAvatar: {
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.surface
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary
  },
  avatarText: {
    color: colors.white,
    fontFamily: fontFamily.headingBold
  },
  createGroupButton: {
    minHeight: 36,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primary
  },
  createGroupText: {
    color: colors.white,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    lineHeight: 16
  },
  friendPicker: {
    gap: 8
  },
  pickerLabel: {
    ...typography.bodyMedium,
    color: colors.charcoal
  },
  memberChips: {
    gap: 8,
    paddingRight: 20
  },
  memberChip: {
    maxWidth: 180,
    minHeight: 40,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.border
  },
  memberChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight
  },
  memberChipText: {
    color: colors.charcoal,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    lineHeight: 16
  },
  memberChipTextActive: {
    color: colors.primary
  },
  emptyInlineText: {
    ...typography.caption,
    color: colors.textMuted
  },
  loadingRow: {
    minHeight: 60,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  emptyCard: {
    minHeight: 76,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  emptyIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight
  },
  emptyTitle: {
    color: colors.charcoal,
    fontFamily: fontFamily.headingBold,
    fontSize: 15,
    lineHeight: 20
  },
  emptyBody: {
    color: colors.textMuted,
    fontFamily: fontFamily.body,
    fontSize: 12,
    lineHeight: 16
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }]
  }
});
