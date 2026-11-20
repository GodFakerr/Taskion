import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../../src/theme/useAppTheme';
import {
  Task,
  getAllScheduledTasks,
  toggleTaskCompleted,
} from '../../src/db/tasksRepo';
import {
  scheduleTaskNotification,
  cancelTaskNotification,
  snoozeTask,
} from '../../src/services/notifications';
import { TaskCard } from '../../src/components/TaskCard';
import { FilterChips, FilterChipItem } from '../../src/components/FilterChips';
import { WeekStrip, DayInfo } from '../../src/components/WeekStrip';

export default function ScheduledScreen() {
  const { colors, typography } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>('upcoming');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const list = await getAllScheduledTasks();
      // Only uncompleted tasks with due_at in the future or today
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const scheduled = list.filter(
        (t) => t.is_completed === 0 && t.due_at !== null && t.due_at >= startOfToday.getTime()
      );
      setTasks(scheduled);
    } catch (err) {
      console.warn('[Taskion] Error loading Scheduled tasks:', err);
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
      console.warn('[Taskion] Error toggling complete in scheduled:', err);
    }
  };

  const handleSnooze = async (task: Task) => {
    await snoozeTask(task.id, 15);
    await loadData();
  };

  // Generate 7-day strip data starting from today
  const weekDays: DayInfo[] = useMemo(() => {
    const list: DayInfo[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dayName = d.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase();
      const dayNumber = d.getDate();

      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);

      const dayTasks = tasks.filter(
        (t) => t.due_at !== null && t.due_at >= dayStart.getTime() && t.due_at <= dayEnd.getTime()
      );

      list.push({
        date: d,
        dateKey,
        dayName,
        dayNumber,
        isToday: i === 0,
        hasTasks: dayTasks.length > 0,
        highPriorityCount: dayTasks.filter((t) => t.priority === 'high').length,
      });
    }

    return list;
  }, [tasks]);

  // Preset filter chips
  const presetChips: FilterChipItem[] = useMemo(() => {
    return [
      { key: 'upcoming', label: 'Upcoming', count: tasks.length },
      { key: 'tomorrow', label: 'Tomorrow' },
      { key: 'weekend', label: 'This Weekend' },
      { key: 'next_week', label: 'Next Week' },
    ];
  }, [tasks.length]);

  // Filter tasks based on selected day or preset chip
  const filteredTasks = useMemo(() => {
    if (selectedDayKey) {
      return tasks.filter((t) => {
        if (!t.due_at) return false;
        const d = new Date(t.due_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return key === selectedDayKey;
      });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const tomorrowStart = todayStart + 24 * 60 * 60 * 1000;
    const tomorrowEnd = tomorrowStart + 24 * 60 * 60 * 1000 - 1;

    if (selectedPreset === 'tomorrow') {
      return tasks.filter(
        (t) => t.due_at !== null && t.due_at >= tomorrowStart && t.due_at <= tomorrowEnd
      );
    }

    if (selectedPreset === 'weekend') {
      // Find Saturday and Sunday of this week
      const dayOfWeek = now.getDay(); // 0 is Sunday, 6 is Saturday
      const daysUntilSat = (6 - dayOfWeek + 7) % 7;
      const saturday = new Date(now);
      saturday.setDate(now.getDate() + daysUntilSat);
      saturday.setHours(0, 0, 0, 0);

      const sunday = new Date(saturday);
      sunday.setDate(saturday.getDate() + 1);
      sunday.setHours(23, 59, 59, 999);

      return tasks.filter(
        (t) =>
          t.due_at !== null &&
          t.due_at >= saturday.getTime() &&
          t.due_at <= sunday.getTime()
      );
    }

    if (selectedPreset === 'next_week') {
      const nextMon = new Date(now);
      const daysUntilMon = (8 - now.getDay()) % 7 || 7;
      nextMon.setDate(now.getDate() + daysUntilMon);
      nextMon.setHours(0, 0, 0, 0);

      const nextSun = new Date(nextMon);
      nextSun.setDate(nextMon.getDate() + 6);
      nextSun.setHours(23, 59, 59, 999);

      return tasks.filter(
        (t) =>
          t.due_at !== null &&
          t.due_at >= nextMon.getTime() &&
          t.due_at <= nextSun.getTime()
      );
    }

    return tasks;
  }, [tasks, selectedDayKey, selectedPreset]);

  // Group filtered tasks into sections: Tomorrow, This Week, Later
  const groupedSections = useMemo(() => {
    if (selectedDayKey) {
      const dateParts = selectedDayKey.split('-');
      const d = new Date(
        parseInt(dateParts[0]),
        parseInt(dateParts[1]) - 1,
        parseInt(dateParts[2])
      );
      const headerTitle = d.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });
      return [{ title: headerTitle, tasks: filteredTasks }];
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const tomorrowStart = todayStart + 24 * 60 * 60 * 1000;
    const tomorrowEnd = tomorrowStart + 24 * 60 * 60 * 1000 - 1;
    const weekEnd = todayStart + 7 * 24 * 60 * 60 * 1000 - 1;

    const tomorrowGroup: Task[] = [];
    const thisWeekGroup: Task[] = [];
    const laterGroup: Task[] = [];

    for (const t of filteredTasks) {
      if (!t.due_at) {
        laterGroup.push(t);
      } else if (t.due_at >= tomorrowStart && t.due_at <= tomorrowEnd) {
        tomorrowGroup.push(t);
      } else if (t.due_at <= weekEnd) {
        thisWeekGroup.push(t);
      } else {
        laterGroup.push(t);
      }
    }

    const sections: { title: string; tasks: Task[] }[] = [];
    if (tomorrowGroup.length > 0) {
      sections.push({ title: 'Tomorrow', tasks: tomorrowGroup });
    }
    if (thisWeekGroup.length > 0) {
      sections.push({ title: 'This Week', tasks: thisWeekGroup });
    }
    if (laterGroup.length > 0) {
      sections.push({ title: 'Later', tasks: laterGroup });
    }

    return sections;
  }, [filteredTasks, selectedDayKey]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Editorial Header */}
        <View style={styles.headerLeft}>
          <Text style={[styles.screenTitle, typography.editorialHeader, { color: colors.onSurface }]}>
            Scheduled
          </Text>
          <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
            {tasks.length} upcoming reminder{tasks.length === 1 ? '' : 's'}
          </Text>
        </View>

        {/* 7-Day Precision Strip Selector */}
        <WeekStrip
          days={weekDays}
          selectedDateKey={selectedDayKey}
          onSelectDate={(key) => {
            setSelectedDayKey(key);
            if (key) setSelectedPreset('upcoming');
          }}
        />

        {/* Preset Filter Chips */}
        <FilterChips
          chips={presetChips}
          selectedKey={selectedDayKey ? '' : selectedPreset}
          onSelect={(key) => {
            setSelectedPreset(key);
            setSelectedDayKey(null);
          }}
        />

        {/* Grouped Scheduled Sections */}
        {groupedSections.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: colors.surfaceContainerLow }]}>
            <MaterialCommunityIcons
              name="calendar-blank-outline"
              size={42}
              color={colors.primary}
            />
            <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>
              No scheduled reminders
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.onSurfaceVariant }]}>
              Reminders scheduled for future dates will appear here organized by timeline.
            </Text>
          </View>
        ) : (
          groupedSections.map((section) => (
            <View key={section.title} style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
                  {section.title}
                </Text>
                <View
                  style={[
                    styles.sectionCountBadge,
                    { backgroundColor: colors.surfaceContainerHigh },
                  ]}
                >
                  <Text style={[styles.sectionCountText, { color: colors.secondary }]}>
                    {section.tasks.length}
                  </Text>
                </View>
              </View>

              {section.tasks.map((t) => (
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
              ))}
            </View>
          ))
        )}

        <View style={{ height: 110 }} />
      </ScrollView>
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
  headerLeft: {
    marginBottom: 12,
  },
  screenTitle: {
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  sectionContainer: {
    marginTop: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sectionCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sectionCountText: {
    fontSize: 12,
    fontWeight: '700',
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
});
