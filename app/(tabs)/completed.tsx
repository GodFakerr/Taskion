import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../../src/theme/useAppTheme';
import {
  Task,
  getCompletedTasks,
  toggleTaskCompleted,
  deleteTask,
  clearAllCompleted,
} from '../../src/db/tasksRepo';
import { scheduleTaskNotification } from '../../src/services/notifications';
import { exportMarkdownArchive, exportJsonBackup } from '../../src/services/backup';
import { TaskCard } from '../../src/components/TaskCard';
import { FilterChips, FilterChipItem } from '../../src/components/FilterChips';

export default function CompletedScreen() {
  const { colors, typography, radii } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const list = await getCompletedTasks();
      setTasks(list);
    } catch (err) {
      console.warn('[Taskion] Error loading completed tasks:', err);
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

  const handleRestore = async (task: Task) => {
    try {
      // Restore task back to active (is_completed = 0)
      await toggleTaskCompleted(task.id, false);
      if (task.due_at && task.due_at > Date.now()) {
        await scheduleTaskNotification({ ...task, is_completed: 0 });
      }
      await loadData();
    } catch (err) {
      console.warn('[Taskion] Error restoring task:', err);
    }
  };

  const handleDelete = (task: Task) => {
    Alert.alert(
      'Delete Task',
      `Permanently delete "${task.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteTask(task.id);
            await loadData();
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    if (tasks.length === 0) return;
    Alert.alert(
      'Clear All Completed',
      `Permanently delete all ${tasks.length} completed tasks? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await clearAllCompleted();
            await loadData();
          },
        },
      ]
    );
  };

  const handleExportMarkdown = async () => {
    try {
      await exportMarkdownArchive();
    } catch (err) {
      Alert.alert('Export Failed', 'Could not generate markdown archive.');
    }
  };

  const handleExportJson = async () => {
    try {
      await exportJsonBackup();
    } catch (err) {
      Alert.alert('Export Failed', 'Could not export JSON backup.');
    }
  };

  // Filter chips
  const filterChips: FilterChipItem[] = useMemo(() => {
    return [
      { key: 'all', label: 'All Completed', count: tasks.length },
      { key: 'today', label: 'Today' },
      { key: 'week', label: 'This Week' },
      { key: 'older', label: 'Older' },
    ];
  }, [tasks.length]);

  // Filter tasks based on completed_at timestamp
  const filteredTasks = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekStart = todayStart - 6 * 24 * 60 * 60 * 1000;

    if (selectedFilter === 'today') {
      return tasks.filter((t) => t.completed_at && t.completed_at >= todayStart);
    }
    if (selectedFilter === 'week') {
      return tasks.filter((t) => t.completed_at && t.completed_at >= weekStart);
    }
    if (selectedFilter === 'older') {
      return tasks.filter((t) => !t.completed_at || t.completed_at < weekStart);
    }
    return tasks;
  }, [tasks, selectedFilter]);

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
            Completed
          </Text>
          <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
            {tasks.length} task{tasks.length === 1 ? '' : 's'} archived
          </Text>
        </View>

        {/* Summary Card with Clear Action */}
        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: colors.surfaceContainerLow,
              borderRadius: radii.card,
            },
          ]}
        >
          <View style={styles.summaryLeft}>
            <View
              style={[
                styles.summaryIconBox,
                { backgroundColor: colors.primaryContainer },
              ]}
            >
              <MaterialCommunityIcons
                name="check-circle"
                size={22}
                color={colors.onPrimaryContainer}
              />
            </View>
            <View>
              <Text style={[styles.summaryTitle, { color: colors.onSurface }]}>
                {tasks.length} Completed
              </Text>
              <Text style={[styles.summarySub, { color: colors.onSurfaceVariant }]}>
                Tap check to restore
              </Text>
            </View>
          </View>

          {tasks.length > 0 && (
            <Pressable
              onPress={handleClearAll}
              style={[
                styles.clearBtn,
                { backgroundColor: colors.surfaceContainerHigh },
              ]}
            >
              <MaterialCommunityIcons
                name="delete-sweep-outline"
                size={18}
                color={colors.error}
              />
              <Text style={[styles.clearBtnText, { color: colors.error }]}>
                Clear All
              </Text>
            </Pressable>
          )}
        </View>

        {/* Filter Chips */}
        <FilterChips
          chips={filterChips}
          selectedKey={selectedFilter}
          onSelect={setSelectedFilter}
        />

        {/* Export Buttons */}
        <View style={styles.exportRow}>
          <Pressable
            onPress={handleExportMarkdown}
            style={[
              styles.exportBtn,
              { backgroundColor: colors.surfaceContainerHigh, borderRadius: radii.md },
            ]}
          >
            <MaterialCommunityIcons
              name="file-document-outline"
              size={18}
              color={colors.primary}
            />
            <Text style={[styles.exportBtnText, { color: colors.onSurface }]}>
              Export Markdown
            </Text>
          </Pressable>

          <Pressable
            onPress={handleExportJson}
            style={[
              styles.exportBtn,
              { backgroundColor: colors.surfaceContainerHigh, borderRadius: radii.md },
            ]}
          >
            <MaterialCommunityIcons
              name="code-json"
              size={18}
              color={colors.secondary}
            />
            <Text style={[styles.exportBtnText, { color: colors.onSurface }]}>
              Export JSON
            </Text>
          </Pressable>
        </View>

        {/* Task List */}
        <View style={styles.taskListContainer}>
          {filteredTasks.length === 0 ? (
            <View style={[styles.emptyContainer, { backgroundColor: colors.surfaceContainerLow }]}>
              <MaterialCommunityIcons
                name="archive-outline"
                size={42}
                color={colors.outline}
              />
              <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>
                Archive is empty
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.onSurfaceVariant }]}>
                Tasks you mark as completed will be safely archived here for your records.
              </Text>
            </View>
          ) : (
            filteredTasks.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                onToggleComplete={handleRestore}
                onPress={(item) =>
                  router.push({
                    pathname: '/task/[id]',
                    params: { id: item.id },
                  })
                }
                onDelete={handleDelete}
                showDelete={true}
              />
            ))
          )}
        </View>

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
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginVertical: 10,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  summarySub: {
    fontSize: 12,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  exportRow: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 8,
  },
  exportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  exportBtnText: {
    fontSize: 13,
    fontWeight: '600',
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
});
