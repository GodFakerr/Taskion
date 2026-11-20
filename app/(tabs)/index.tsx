import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  RefreshControl,
  Keyboard,
  KeyboardEvent,
  Platform,
} from 'react-native';
import Animated, {
  useAnimatedKeyboard,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../../src/theme/useAppTheme';
import {
  Task,
  getTodayTasks,
  getOverdueTasks,
  rescheduleOverdueTasksToToday,
  createTask,
  toggleTaskCompleted,
  getAllDistinctTags,
} from '../../src/db/tasksRepo';
import {
  scheduleTaskNotification,
  cancelTaskNotification,
  snoozeTask,
} from '../../src/services/notifications';
import { ParsedReminder } from '../../src/services/nlp';
import { TaskCard } from '../../src/components/TaskCard';
import { QuickAddBar } from '../../src/components/QuickAddBar';
import { FilterChips, FilterChipItem } from '../../src/components/FilterChips';

export default function TodayScreen() {
  const { colors, typography, radii } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Reanimated 60/120fps UI-thread keyboard tracking
  const keyboard = useAnimatedKeyboard();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [measuredKeyboardHeight, setMeasuredKeyboardHeight] = useState(0);
  const [isQuickAddFocused, setIsQuickAddFocused] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e: KeyboardEvent) => {
      setIsKeyboardVisible(true);
      if (e?.endCoordinates?.height) {
        setMeasuredKeyboardHeight(e.endCoordinates.height);
      }
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
      setIsQuickAddFocused(false);
      setMeasuredKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const animatedDockStyle = useAnimatedStyle(() => {
    // Primary: Reanimated hardware-synced UI-thread keyboard height
    // Fallback: Keyboard event measured height
    const activeHeight =
      keyboard.height.value > 0 ? keyboard.height.value : measuredKeyboardHeight;
    // When keyboard is closed (height 0), dock sits at resting bottom: 84 (above 76px tab bar).
    // When keyboard opens, translate upward by (activeHeight - 72) so the dock floats 12px above the keyboard.
    const translateY =
      activeHeight > 0 ? -Math.max(0, activeHeight - 72) : 0;
    return {
      transform: [{ translateY }],
    };
  });

  const loadData = useCallback(async () => {
    try {
      const [todayList, overdueList, tagList] = await Promise.all([
        getTodayTasks(),
        getOverdueTasks(),
        getAllDistinctTags(),
      ]);
      setTasks(todayList);
      setOverdueTasks(overdueList);
      setTags(tagList);
    } catch (err) {
      console.warn('[Taskion] Error loading Today data:', err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleQuickAdd = async (parsed: ParsedReminder) => {
    try {
      let dueAt = parsed.dueAt;
      if (!dueAt) {
        const todayEnd = new Date();
        todayEnd.setHours(18, 0, 0, 0);
        if (todayEnd.getTime() < Date.now()) {
          todayEnd.setHours(21, 0, 0, 0);
        }
        dueAt = todayEnd.getTime();
      }

      const newTask = await createTask({
        title: parsed.title,
        due_at: dueAt,
        tag: parsed.tag,
        priority: parsed.priority,
      });

      if (newTask.due_at) {
        await scheduleTaskNotification(newTask);
      }

      await loadData();
    } catch (err) {
      console.warn('[Taskion] Error creating task from QuickAdd:', err);
    }
  };

  const handleToggleComplete = async (task: Task) => {
    try {
      const isNowCompleted = task.is_completed === 0;
      if (isNowCompleted && task.notification_id) {
        await cancelTaskNotification(task.notification_id);
      }

      const result = await toggleTaskCompleted(task.id, isNowCompleted);
      if (result.nextTaskCreated?.due_at) {
        await scheduleTaskNotification(result.nextTaskCreated);
      }

      await loadData();
    } catch (err) {
      console.warn('[Taskion] Error toggling complete:', err);
    }
  };

  const handleSnooze = async (task: Task) => {
    await snoozeTask(task.id, 15);
    await loadData();
  };

  const handleRescheduleOverdue = async () => {
    await rescheduleOverdueTasksToToday();
    await loadData();
  };

  // Filter chips configuration
  const filterChips: FilterChipItem[] = useMemo(() => {
    const list: FilterChipItem[] = [
      { key: 'all', label: 'All', count: tasks.length },
      {
        key: 'high',
        label: 'High Priority',
        dotColor: colors.highPriority,
        count: tasks.filter((t) => t.priority === 'high').length,
      },
    ];

    for (const tag of tags) {
      list.push({
        key: `tag:${tag}`,
        label: `#${tag}`,
        count: tasks.filter((t) => t.tag.toLowerCase() === tag.toLowerCase()).length,
      });
    }

    return list;
  }, [tasks, tags, colors.highPriority]);

  // Filtered task list
  const filteredTasks = useMemo(() => {
    let result = tasks;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.notes.toLowerCase().includes(q) ||
          t.tag.toLowerCase().includes(q)
      );
    }

    if (selectedFilter === 'high') {
      result = result.filter((t) => t.priority === 'high');
    } else if (selectedFilter.startsWith('tag:')) {
      const tag = selectedFilter.replace('tag:', '').toLowerCase();
      result = result.filter((t) => t.tag.toLowerCase() === tag);
    }

    return result;
  }, [tasks, searchQuery, selectedFilter]);

  const dateSubtitle = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 160 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Editorial Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={[styles.screenTitle, typography.editorialHeader, { color: colors.onSurface }]}>
              Today
            </Text>
            <Text style={[styles.dateSubtitle, { color: colors.onSurfaceVariant }]}>
              {dateSubtitle}
              {tasks.length > 0
                ? ` · ${tasks.length} reminder${tasks.length === 1 ? '' : 's'}`
                : ' · All done'}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <Pressable
              hitSlop={8}
              onPress={() => setShowSearch(!showSearch)}
              style={[
                styles.iconBtn,
                {
                  backgroundColor: showSearch
                    ? colors.secondaryContainer
                    : colors.surfaceContainerHigh,
                },
              ]}
              accessibilityLabel="Search reminders"
            >
              <MaterialCommunityIcons
                name="magnify"
                size={22}
                color={showSearch ? colors.onSecondaryContainer : colors.onSurfaceVariant}
              />
            </Pressable>

            <Pressable
              hitSlop={8}
              onPress={() => router.push('/settings')}
              style={[styles.iconBtn, { backgroundColor: colors.surfaceContainerHigh }]}
              accessibilityLabel="Settings"
            >
              <MaterialCommunityIcons
                name="cog-outline"
                size={22}
                color={colors.onSurfaceVariant}
              />
            </Pressable>
          </View>
        </View>

        {/* Search Bar Toggle */}
        {showSearch && (
          <View style={[styles.searchBox, { backgroundColor: colors.surfaceContainerHigh }]}>
            <MaterialCommunityIcons
              name="magnify"
              size={20}
              color={colors.outline}
              style={{ marginRight: 8 }}
            />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search today's tasks..."
              placeholderTextColor={colors.outline}
              style={[styles.searchInput, { color: colors.onSurface }]}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <MaterialCommunityIcons
                  name="close-circle"
                  size={18}
                  color={colors.outline}
                />
              </Pressable>
            )}
          </View>
        )}

        {/* Conditional Overdue Section */}
        {overdueTasks.length > 0 && (
          <View
            style={[
              styles.overdueCard,
              {
                backgroundColor: colors.highPriorityContainer,
                borderColor: colors.highPriority,
              },
            ]}
          >
            <View style={styles.overdueHeaderRow}>
              <View style={styles.overdueTitleCol}>
                <View style={styles.overdueLabelRow}>
                  <MaterialCommunityIcons
                    name="alert-decagram"
                    size={20}
                    color={colors.highPriority}
                  />
                  <Text style={[styles.overdueTitle, { color: colors.onHighPriorityContainer }]}>
                    {overdueTasks.length} Overdue Reminder{overdueTasks.length === 1 ? '' : 's'}
                  </Text>
                </View>
                <Text style={[styles.overdueSubtitle, { color: colors.onHighPriorityContainer }]}>
                  Tasks from previous days that were not completed
                </Text>
              </View>

              <Pressable
                onPress={handleRescheduleOverdue}
                style={[
                  styles.rescheduleBtn,
                  { backgroundColor: colors.highPriority },
                ]}
              >
                <Text style={[styles.rescheduleBtnText, { color: colors.highPriorityContainer }]}>
                  Move to Today
                </Text>
              </Pressable>
            </View>

            {/* Overdue Task Items */}
            <View style={styles.overdueItemsList}>
              {overdueTasks.map((ot) => (
                <TaskCard
                  key={ot.id}
                  task={ot}
                  onToggleComplete={handleToggleComplete}
                  onPress={(t) => router.push({ pathname: '/task/[id]', params: { id: t.id } })}
                  onSnooze={handleSnooze}
                />
              ))}
            </View>
          </View>
        )}

        {/* Stadium Filter Chips */}
        <FilterChips
          chips={filterChips}
          selectedKey={selectedFilter}
          onSelect={setSelectedFilter}
        />

        {/* Task List */}
        <View style={styles.taskListContainer}>
          {filteredTasks.length === 0 ? (
            <View style={[styles.emptyContainer, { backgroundColor: colors.surfaceContainerLow }]}>
              <MaterialCommunityIcons
                name="check-all"
                size={42}
                color={colors.primary}
              />
              <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>
                {tasks.length === 0 ? 'Quiet night ahead' : 'No matching tasks'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.onSurfaceVariant }]}>
                {tasks.length === 0
                  ? 'All reminders completed or no tasks due today.'
                  : 'Try selecting a different filter or clearing search.'}
              </Text>
            </View>
          ) : (
            filteredTasks.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                onToggleComplete={handleToggleComplete}
                onPress={(item) =>
                  router.push({
                    pathname: '/task/[id]',
                    params: { id: item.id },
                  })
                }
                onSnooze={handleSnooze}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Floating Bottom Quick-Add & FAB Dock (Directly Above Bottom Navigation Bar or Soft Keyboard) */}
      <Animated.View
        style={[
          styles.keyboardDockWrapper,
          animatedDockStyle,
        ]}
      >
        <View style={styles.bottomDockRow}>
          {/* Natural Language Remind me to... Bar on the Left */}
          <View style={styles.quickAddDockWrapper}>
            <QuickAddBar
              onSubmit={handleQuickAdd}
              onFocus={() => setIsQuickAddFocused(true)}
              onBlur={() => setIsQuickAddFocused(false)}
            />
          </View>

          {/* Plus FAB on the Right (hidden only while keyboard is active to provide maximum text width) */}
          {!isKeyboardVisible && (
            <Pressable
              onPress={() => router.push('/new-reminder')}
              style={({ pressed }) => [
                styles.dockFab,
                {
                  backgroundColor: colors.primary,
                  borderRadius: radii.fab,
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                },
              ]}
              accessibilityLabel="Add new reminder"
            >
              <MaterialCommunityIcons
                name="plus"
                size={30}
                color={colors.onPrimary}
              />
            </Pressable>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  screenTitle: {
    marginBottom: 4,
  },
  dateSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  overdueCard: {
    padding: 16,
    borderRadius: 24,
    marginVertical: 10,
    borderWidth: 1,
  },
  overdueHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  overdueTitleCol: {
    flex: 1,
    marginRight: 8,
  },
  overdueLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  overdueTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  overdueSubtitle: {
    fontSize: 12,
    opacity: 0.85,
  },
  rescheduleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
  },
  rescheduleBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  overdueItemsList: {
    gap: 4,
  },
  taskListContainer: {
    marginTop: 6,
  },
  emptyContainer: {
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  keyboardDockWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 84,
    paddingHorizontal: 16,
    zIndex: 99,
  },
  bottomDockRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  quickAddDockWrapper: {
    flex: 1,
  },
  dockFab: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
});
