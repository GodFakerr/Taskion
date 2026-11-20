import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../../src/theme/useAppTheme';
import { useDialog } from '../../src/context/DialogContext';
import {
  Task,
  Subtask,
  getTaskById,
  updateTask,
  toggleTaskCompleted,
  deleteTask,
  createSubtask,
  toggleSubtask,
  deleteSubtask,
  getAllDistinctTags,
  Priority,
  RepeatRule,
} from '../../src/db/tasksRepo';
import {
  scheduleTaskNotification,
  cancelTaskNotification,
} from '../../src/services/notifications';
import { DateTimePickerRow } from '../../src/components/DateTimePickerRow';

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, radii } = useAppTheme();
  const { showAlert, showConfirm } = useDialog();

  const [task, setTask] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueAt, setDueAt] = useState<number | null>(null);
  const [priority, setPriority] = useState<Priority>('none');
  const [tag, setTag] = useState('');
  const [repeatRule, setRepeatRule] = useState<RepeatRule>('none');
  const [isSticky, setIsSticky] = useState(false);

  const [availableTags, setAvailableTags] = useState<string[]>([
    'Personal',
    'Work',
    'Health',
    'Finance',
  ]);
  const [newTagInput, setNewTagInput] = useState('');
  const [showNewTagInput, setShowNewTagInput] = useState(false);

  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  const loadTask = useCallback(async () => {
    if (!id) return;
    try {
      const [data, dbTags] = await Promise.all([
        getTaskById(id),
        getAllDistinctTags(),
      ]);

      if (data) {
        setTask(data);
        setTitle(data.title);
        setNotes(data.notes || '');
        setDueAt(data.due_at);
        setPriority(data.priority);
        setTag(data.tag || '');
        setRepeatRule(data.repeat_rule);
        setIsSticky(data.is_sticky === 1);
        setSubtasks(data.subtasks || []);
        setHasChanges(false);
      }

      const mergedTags = Array.from(
        new Set(['Personal', 'Work', 'Health', 'Finance', ...dbTags])
      );
      setAvailableTags(mergedTags);
    } catch (err) {
      console.warn('[Taskion] Error loading task detail:', err);
    }
  }, [id]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  const handleSaveAllChanges = async () => {
    if (!task) return;
    const cleanTitle = title.trim() || task.title;

    try {
      await updateTask(task.id, {
        title: cleanTitle,
        notes: notes.trim(),
        due_at: dueAt,
        priority,
        tag: tag.trim(),
        repeat_rule: repeatRule,
        is_sticky: isSticky ? 1 : 0,
      });

      // Update notifications if schedule or priority changed
      if (task.notification_id) {
        await cancelTaskNotification(task.notification_id);
      }

      if (dueAt && dueAt > Date.now() && task.is_completed === 0) {
        await scheduleTaskNotification({
          ...task,
          title: cleanTitle,
          notes: notes.trim(),
          due_at: dueAt,
          priority,
          tag: tag.trim(),
          repeat_rule: repeatRule,
          is_sticky: isSticky ? 1 : 0,
        });
      }

      setHasChanges(false);
      showAlert({
        title: 'Saved',
        message: 'Reminder updated successfully.',
        onConfirm: () => {
          router.back();
        },
      });
    } catch (err) {
      console.warn('[Taskion] Error updating task:', err);
      showAlert({
        title: 'Error',
        message: 'Could not save changes.',
      });
    }
  };

  const handleToggleTask = async () => {
    if (!task) return;
    try {
      const isNowCompleted = task.is_completed === 0;
      if (isNowCompleted && task.notification_id) {
        await cancelTaskNotification(task.notification_id);
      }
      const result = await toggleTaskCompleted(task.id, isNowCompleted);
      if (result.nextTaskCreated?.due_at) {
        await scheduleTaskNotification(result.nextTaskCreated);
      }
      await loadTask();
    } catch (err) {
      console.warn('[Taskion] Error toggling complete in detail:', err);
    }
  };

  const handleDeleteTask = () => {
    if (!task) return;
    showConfirm({
      title: 'Delete Task',
      message: `Permanently delete "${task.title}"?`,
      confirmText: 'Delete',
      isDestructive: true,
      onConfirm: async () => {
        if (task.notification_id) {
          await cancelTaskNotification(task.notification_id);
        }
        await deleteTask(task.id);
        router.back();
      },
    });
  };

  const handleAddSubtask = async () => {
    if (!task || !newSubtaskTitle.trim()) return;
    try {
      const created = await createSubtask(task.id, newSubtaskTitle.trim());
      setSubtasks([...subtasks, created]);
      setNewSubtaskTitle('');
    } catch (err) {
      console.warn('[Taskion] Error creating subtask:', err);
    }
  };

  const handleToggleSubtask = async (st: Subtask) => {
    try {
      const nextVal = st.is_completed === 0;
      await toggleSubtask(st.id, nextVal);
      setSubtasks(
        subtasks.map((s) => (s.id === st.id ? { ...s, is_completed: nextVal ? 1 : 0 } : s))
      );
    } catch (err) {
      console.warn('[Taskion] Error toggling subtask:', err);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    try {
      await deleteSubtask(subtaskId);
      setSubtasks(subtasks.filter((s) => s.id !== subtaskId));
    } catch (err) {
      console.warn('[Taskion] Error deleting subtask:', err);
    }
  };

  const handleAddNewTag = () => {
    const trimmed = newTagInput.trim();
    if (!trimmed) return;
    if (!availableTags.includes(trimmed)) {
      setAvailableTags([...availableTags, trimmed]);
    }
    setTag(trimmed);
    setNewTagInput('');
    setShowNewTagInput(false);
    setHasChanges(true);
  };

  if (!task) {
    return (
      <View
        style={[
          styles.screen,
          { backgroundColor: colors.background, paddingTop: insets.top },
        ]}
      >
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.onSurface} />
          </Pressable>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={{ color: colors.onSurfaceVariant }}>Loading task details...</Text>
        </View>
      </View>
    );
  }

  const isCompleted = task.is_completed === 1;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Pressable
          hitSlop={8}
          onPress={() => router.back()}
          style={[styles.iconBtn, { backgroundColor: colors.surfaceContainerHigh }]}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={22}
            color={colors.onSurface}
          />
        </Pressable>

        <Text style={[styles.topBarTitle, { color: colors.onSurface }]}>
          Edit Reminder
        </Text>

        <View style={styles.topBarActions}>
          {hasChanges && (
            <Pressable
              onPress={handleSaveAllChanges}
              style={[styles.topSaveBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.topSaveBtnText, { color: colors.onPrimary }]}>
                Save
              </Text>
            </Pressable>
          )}

          <Pressable
            hitSlop={8}
            onPress={handleDeleteTask}
            style={[styles.iconBtn, { backgroundColor: colors.surfaceContainerHigh }]}
          >
            <MaterialCommunityIcons
              name="delete-outline"
              size={22}
              color={colors.error}
            />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title & Notes Card */}
        <View
          style={[
            styles.cardSection,
            { backgroundColor: colors.surfaceContainer, borderRadius: radii.card },
          ]}
        >
          <TextInput
            value={title}
            onChangeText={(t) => {
              setTitle(t);
              setHasChanges(true);
            }}
            placeholder="Task Title"
            placeholderTextColor={colors.outline}
            style={[
              styles.titleInput,
              {
                color: isCompleted ? colors.onSurfaceVariant : colors.onSurface,
                textDecorationLine: isCompleted ? 'line-through' : 'none',
              },
            ]}
          />

          <View style={[styles.divider, { backgroundColor: colors.surfaceContainerHigh }]} />

          <TextInput
            value={notes}
            onChangeText={(n) => {
              setNotes(n);
              setHasChanges(true);
            }}
            placeholder="Add notes, URLs, or details..."
            placeholderTextColor={colors.outline}
            style={[styles.notesInput, { color: colors.onSurfaceVariant }]}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Schedule & Alert Section with Custom Date & Time Picker */}
        <View
          style={[
            styles.cardSection,
            { backgroundColor: colors.surfaceContainer, borderRadius: radii.card },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={20}
                color={colors.primary}
              />
              <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
                Schedule & Alert
              </Text>
            </View>
          </View>

          <DateTimePickerRow
            dueAt={dueAt}
            onChangeDueAt={(val) => {
              setDueAt(val);
              setHasChanges(true);
            }}
          />
        </View>

        {/* Priority Selector */}
        <View
          style={[
            styles.cardSection,
            { backgroundColor: colors.surfaceContainer, borderRadius: radii.card },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <MaterialCommunityIcons
                name="flag-outline"
                size={20}
                color={colors.primary}
              />
              <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
                Priority Level
              </Text>
            </View>
            <Text
              style={[
                styles.sectionMeta,
                {
                  color:
                    priority === 'high'
                      ? colors.highPriority
                      : priority === 'medium'
                      ? colors.mediumPriority
                      : priority === 'low'
                      ? colors.lowPriority
                      : colors.outline,
                  textTransform: 'capitalize',
                  fontWeight: '700',
                },
              ]}
            >
              {priority}
            </Text>
          </View>

          <View style={[styles.segmentedRow, { backgroundColor: colors.surfaceContainerLowest }]}>
            {(['none', 'low', 'medium', 'high'] as Priority[]).map((p) => {
              const isSelected = priority === p;
              let activeBg = colors.secondaryContainer;
              let activeText = colors.onSecondaryContainer;

              if (p === 'high') {
                activeBg = colors.highPriorityContainer;
                activeText = colors.highPriority;
              } else if (p === 'medium') {
                activeBg = colors.mediumPriorityContainer;
                activeText = colors.mediumPriority;
              } else if (p === 'low') {
                activeBg = colors.lowPriorityContainer;
                activeText = colors.lowPriority;
              }

              return (
                <Pressable
                  key={p}
                  onPress={() => {
                    setPriority(p);
                    setHasChanges(true);
                  }}
                  style={[
                    styles.segmentBtn,
                    {
                      backgroundColor: isSelected ? activeBg : 'transparent',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      {
                        color: isSelected ? activeText : colors.onSurfaceVariant,
                        fontWeight: isSelected ? '700' : '500',
                        textTransform: 'capitalize',
                      },
                    ]}
                  >
                    {p === 'none' ? 'None' : p}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Category Tag Selector */}
        <View
          style={[
            styles.cardSection,
            { backgroundColor: colors.surfaceContainer, borderRadius: radii.card },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <MaterialCommunityIcons
                name="tag-outline"
                size={20}
                color={colors.primary}
              />
              <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
                Category Tag
              </Text>
            </View>

            <Pressable
              onPress={() => setShowNewTagInput(!showNewTagInput)}
              hitSlop={8}
            >
              <Text style={[styles.addTagLink, { color: colors.primary }]}>
                {showNewTagInput ? 'Cancel' : '+ New Tag'}
              </Text>
            </Pressable>
          </View>

          {showNewTagInput && (
            <View style={styles.inlineTagInputRow}>
              <TextInput
                value={newTagInput}
                onChangeText={setNewTagInput}
                placeholder="Enter new tag..."
                placeholderTextColor={colors.outline}
                style={[
                  styles.inlineTagInput,
                  {
                    backgroundColor: colors.surfaceContainerHigh,
                    color: colors.onSurface,
                  },
                ]}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleAddNewTag}
              />
              <Pressable
                onPress={handleAddNewTag}
                style={[styles.addTagBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.addTagBtnText, { color: colors.onPrimary }]}>
                  Add
                </Text>
              </Pressable>
            </View>
          )}

          <View style={styles.tagsWrapRow}>
            {availableTags.map((t) => {
              const isSelected = tag.toLowerCase() === t.toLowerCase();

              return (
                <Pressable
                  key={t}
                  onPress={() => {
                    setTag(isSelected ? '' : t);
                    setHasChanges(true);
                  }}
                  style={[
                    styles.chip,
                    {
                      borderRadius: radii.pill,
                      backgroundColor: isSelected
                        ? colors.secondaryContainer
                        : colors.surfaceContainerHigh,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: isSelected
                          ? colors.onSecondaryContainer
                          : colors.onSurfaceVariant,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    #{t}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Repeat Selector */}
        <View
          style={[
            styles.cardSection,
            { backgroundColor: colors.surfaceContainer, borderRadius: radii.card },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <MaterialCommunityIcons
                name="repeat"
                size={20}
                color={colors.primary}
              />
              <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
                Repeat Schedule
              </Text>
            </View>
          </View>

          <View style={[styles.segmentedRow, { backgroundColor: colors.surfaceContainerLowest }]}>
            {(['none', 'daily', 'weekly', 'monthly'] as RepeatRule[]).map((r) => {
              const isSelected = repeatRule === r;
              return (
                <Pressable
                  key={r}
                  onPress={() => {
                    setRepeatRule(r);
                    setHasChanges(true);
                  }}
                  style={[
                    styles.segmentBtn,
                    {
                      backgroundColor: isSelected
                        ? colors.secondaryContainer
                        : 'transparent',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      {
                        color: isSelected
                          ? colors.onSecondaryContainer
                          : colors.onSurfaceVariant,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {r === 'none'
                      ? 'Never'
                      : r === 'daily'
                      ? 'Daily'
                      : r === 'weekly'
                      ? 'Weekly'
                      : 'Monthly'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Sticky Alert Switch */}
        <View
          style={[
            styles.cardSection,
            styles.switchCardRow,
            { backgroundColor: colors.surfaceContainer, borderRadius: radii.card },
          ]}
        >
          <View style={styles.switchInfo}>
            <View style={styles.sectionHeaderLeft}>
              <MaterialCommunityIcons
                name="pin-outline"
                size={20}
                color={colors.tertiary}
              />
              <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
                Sticky Alert
              </Text>
            </View>
            <Text style={[styles.switchSubtitle, { color: colors.onSurfaceVariant }]}>
              Pins persistent notification on Android lock screen until marked done
            </Text>
          </View>

          <Switch
            value={isSticky}
            onValueChange={(val) => {
              setIsSticky(val);
              setHasChanges(true);
            }}
            trackColor={{ false: colors.surfaceContainerHighest, true: colors.primary }}
            thumbColor={isSticky ? colors.onPrimary : colors.outline}
          />
        </View>

        {/* Subtasks Checklist Section */}
        <View
          style={[
            styles.cardSection,
            { backgroundColor: colors.surfaceContainer, borderRadius: radii.card },
          ]}
        >
          <View style={styles.subtasksHeaderRow}>
            <Text style={[styles.sectionHeading, { color: colors.onSurfaceVariant }]}>
              Subtasks ({subtasks.filter((s) => s.is_completed === 1).length}/{subtasks.length})
            </Text>
          </View>

          {/* Subtasks List */}
          {subtasks.map((st) => {
            const isSubDone = st.is_completed === 1;

            return (
              <View key={st.id} style={styles.subtaskItemRow}>
                <Pressable
                  hitSlop={8}
                  onPress={() => handleToggleSubtask(st)}
                  style={[
                    styles.subtaskCheckbox,
                    {
                      borderColor: isSubDone ? colors.primary : colors.outline,
                      backgroundColor: isSubDone ? colors.primary : 'transparent',
                    },
                  ]}
                >
                  {isSubDone && (
                    <MaterialCommunityIcons
                      name="check"
                      size={14}
                      color={colors.onPrimary}
                    />
                  )}
                </Pressable>

                <Text
                  style={[
                    styles.subtaskTitle,
                    {
                      color: isSubDone ? colors.onSurfaceVariant : colors.onSurface,
                      textDecorationLine: isSubDone ? 'line-through' : 'none',
                    },
                  ]}
                >
                  {st.title}
                </Text>

                <Pressable
                  hitSlop={8}
                  onPress={() => handleDeleteSubtask(st.id)}
                  style={styles.deleteSubtaskBtn}
                >
                  <MaterialCommunityIcons
                    name="close"
                    size={16}
                    color={colors.outline}
                  />
                </Pressable>
              </View>
            );
          })}

          {/* Add Subtask Input */}
          <View
            style={[
              styles.addSubtaskRow,
              { backgroundColor: colors.surfaceContainerHigh, borderRadius: radii.md },
            ]}
          >
            <MaterialCommunityIcons
              name="plus"
              size={18}
              color={colors.outline}
              style={{ marginRight: 6 }}
            />
            <TextInput
              value={newSubtaskTitle}
              onChangeText={setNewSubtaskTitle}
              placeholder="Add a subtask..."
              placeholderTextColor={colors.outline}
              style={[styles.addSubtaskInput, { color: colors.onSurface }]}
              returnKeyType="done"
              onSubmitEditing={handleAddSubtask}
            />
            {newSubtaskTitle.trim().length > 0 && (
              <Pressable
                onPress={handleAddSubtask}
                style={[
                  styles.addSubtaskSubmit,
                  { backgroundColor: colors.primary },
                ]}
              >
                <Text style={[styles.addSubtaskSubmitText, { color: colors.onPrimary }]}>
                  Add
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Bottom Completion Action CTA */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.background,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        {hasChanges ? (
          <Pressable
            onPress={handleSaveAllChanges}
            style={({ pressed }) => [
              styles.primaryBtn,
              {
                backgroundColor: colors.primary,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="check"
              size={22}
              color={colors.onPrimary}
            />
            <Text style={[styles.primaryBtnText, { color: colors.onPrimary }]}>
              Save Changes
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleToggleTask}
            style={({ pressed }) => [
              styles.primaryBtn,
              {
                backgroundColor: isCompleted
                  ? colors.surfaceContainerHigh
                  : colors.primary,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <MaterialCommunityIcons
              name={isCompleted ? 'restore' : 'check'}
              size={22}
              color={isCompleted ? colors.primary : colors.onPrimary}
            />
            <Text
              style={[
                styles.primaryBtnText,
                { color: isCompleted ? colors.primary : colors.onPrimary },
              ]}
            >
              {isCompleted ? 'Restore to Active' : 'Mark as Completed'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topSaveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  topSaveBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 12,
  },
  cardSection: {
    padding: 16,
  },
  titleInput: {
    fontSize: 20,
    fontWeight: '700',
    paddingVertical: 4,
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  notesInput: {
    fontSize: 15,
    minHeight: 60,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionMeta: {
    fontSize: 13,
    fontWeight: '500',
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  segmentedRow: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 14,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: 13,
  },
  addTagLink: {
    fontSize: 13,
    fontWeight: '700',
  },
  inlineTagInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  inlineTagInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    fontSize: 14,
  },
  addTagBtn: {
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTagBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  tagsWrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 13,
  },
  switchCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchInfo: {
    flex: 1,
    marginRight: 16,
  },
  switchSubtitle: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  subtasksHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subtaskItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  subtaskCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  subtaskTitle: {
    flex: 1,
    fontSize: 15,
  },
  deleteSubtaskBtn: {
    padding: 6,
  },
  addSubtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
  },
  addSubtaskInput: {
    flex: 1,
    fontSize: 14,
  },
  addSubtaskSubmit: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  addSubtaskSubmitText: {
    fontSize: 12,
    fontWeight: '700',
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: 28,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
