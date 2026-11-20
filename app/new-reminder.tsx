import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../src/theme/useAppTheme';
import { useDialog } from '../src/context/DialogContext';
import {
  createTask,
  getAllDistinctTags,
  Priority,
  RepeatRule,
} from '../src/db/tasksRepo';
import { scheduleTaskNotification } from '../src/services/notifications';
import { DateTimePickerRow } from '../src/components/DateTimePickerRow';

export default function NewReminderModal() {
  const { colors, radii } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showAlert } = useDialog();

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<Priority>('none');
  const [selectedTag, setSelectedTag] = useState('');
  const [availableTags, setAvailableTags] = useState<string[]>([
    'Personal',
    'Work',
    'Health',
    'Finance',
  ]);
  const [newTagInput, setNewTagInput] = useState('');
  const [showNewTagInput, setShowNewTagInput] = useState(false);
  const [repeatRule, setRepeatRule] = useState<RepeatRule>('none');
  const [isSticky, setIsSticky] = useState(false);

  // Due Date state (defaults to current date and current time)
  const [dueAt, setDueAt] = useState<number | null>(() => Date.now());

  useEffect(() => {
    getAllDistinctTags().then((tags) => {
      const merged = Array.from(
        new Set(['Personal', 'Work', 'Health', 'Finance', ...tags])
      );
      setAvailableTags(merged);
    });
  }, []);

  const handleAddTag = () => {
    const trimmed = newTagInput.trim();
    if (!trimmed) return;
    if (!availableTags.includes(trimmed)) {
      setAvailableTags([...availableTags, trimmed]);
    }
    setSelectedTag(trimmed);
    setNewTagInput('');
    setShowNewTagInput(false);
  };

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      showAlert({
        title: 'Required',
        message: 'Please enter a reminder title.',
        icon: 'alert-outline',
      });
      return;
    }

    try {
      const newTask = await createTask({
        title: trimmedTitle,
        notes: notes.trim(),
        due_at: dueAt,
        priority,
        tag: selectedTag,
        repeat_rule: repeatRule,
        is_sticky: isSticky,
      });

      if (newTask.due_at) {
        await scheduleTaskNotification(newTask);
      }

      router.back();
    } catch (err) {
      console.warn('[Taskion] Error saving reminder:', err);
      showAlert({
        title: 'Error',
        message: 'Could not save reminder. Please try again.',
        icon: 'alert-circle-outline',
      });
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Top Bar with Close X */}
      <View style={styles.topBar}>
        <Pressable
          hitSlop={12}
          onPress={() => router.back()}
          style={[styles.closeBtn, { backgroundColor: colors.surfaceContainerHigh }]}
        >
          <MaterialCommunityIcons
            name="close"
            size={22}
            color={colors.onSurface}
          />
        </Pressable>

        <Text style={[styles.topBarTitle, { color: colors.onSurface }]}>
          New Reminder
        </Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title and Notes Card */}
        <View
          style={[
            styles.cardSection,
            { backgroundColor: colors.surfaceContainer, borderRadius: radii.card },
          ]}
        >
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="What needs to be done?"
            placeholderTextColor={colors.outline}
            style={[styles.titleInput, { color: colors.onSurface }]}
            autoFocus
            multiline={false}
          />

          <View style={[styles.divider, { backgroundColor: colors.surfaceContainerHigh }]} />

          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Add details, URLs, or notes (optional)..."
            placeholderTextColor={colors.outline}
            style={[styles.notesInput, { color: colors.onSurfaceVariant }]}
            multiline
            numberOfLines={3}
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
            onChangeDueAt={setDueAt}
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
                  onPress={() => setPriority(p)}
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

        {/* Tags & Organization */}
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
                placeholder="Enter new tag name..."
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
                onSubmitEditing={handleAddTag}
              />
              <Pressable
                onPress={handleAddTag}
                style={[styles.addTagBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.addTagBtnText, { color: colors.onPrimary }]}>
                  Add
                </Text>
              </Pressable>
            </View>
          )}

          <View style={styles.tagsWrapRow}>
            {availableTags.map((tag) => {
              const isSelected = selectedTag.toLowerCase() === tag.toLowerCase();

              return (
                <Pressable
                  key={tag}
                  onPress={() => setSelectedTag(isSelected ? '' : tag)}
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
                    #{tag}
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
                  onPress={() => setRepeatRule(r)}
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

        {/* Sticky Alert Notification Switch */}
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
            onValueChange={setIsSticky}
            trackColor={{ false: colors.surfaceContainerHighest, true: colors.primary }}
            thumbColor={isSticky ? colors.onPrimary : colors.outline}
          />
        </View>

        {/* Spacer before bottom CTA */}
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Single Bottom Full-Width Rounded Pill CTA */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.background,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        <Pressable
          onPress={handleSave}
          disabled={!title.trim()}
          style={({ pressed }) => [
            styles.saveCtaBtn,
            {
              backgroundColor: title.trim() ? colors.primary : colors.surfaceContainerHigh,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="check"
            size={22}
            color={title.trim() ? colors.onPrimary : colors.outline}
          />
          <Text
            style={[
              styles.saveCtaText,
              { color: title.trim() ? colors.onPrimary : colors.outline },
            ]}
          >
            Save Reminder
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  closeBtn: {
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
    fontWeight: '600',
    paddingVertical: 6,
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  notesInput: {
    fontSize: 15,
    minHeight: 50,
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
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 13,
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
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  saveCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: 28,
  },
  saveCtaText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
