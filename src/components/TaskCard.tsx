import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Task, Priority } from '../db/tasksRepo';
import { useAppTheme } from '../theme/useAppTheme';

interface TaskCardProps {
  task: Task;
  onToggleComplete: (task: Task) => void;
  onPress?: (task: Task) => void;
  onSnooze?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  showDelete?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onToggleComplete,
  onPress,
  onSnooze,
  onDelete,
  showDelete = false,
}) => {
  const { colors, radii } = useAppTheme();
  const cardScale = useSharedValue(1);
  const checkScale = useSharedValue(1);

  const isCompleted = task.is_completed === 1;

  // Priority color mapping
  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'high':
        return colors.highPriority;
      case 'medium':
        return colors.mediumPriority;
      case 'low':
        return colors.lowPriority;
      default:
        return colors.outline;
    }
  };

  const priorityColor = getPriorityColor(task.priority);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const handlePressIn = () => {
    cardScale.value = withSpring(0.98, { damping: 15, stiffness: 250 });
  };

  const handlePressOut = () => {
    cardScale.value = withSpring(1, { damping: 15, stiffness: 250 });
  };

  const handleCheckPress = () => {
    checkScale.value = withSpring(1.25, { damping: 8, stiffness: 300 }, () => {
      checkScale.value = withSpring(1, { damping: 12, stiffness: 250 });
    });
    onToggleComplete(task);
  };

  // Format time/date pill
  const formatDue = (ms: number | null): string | null => {
    if (!ms) return null;
    const date = new Date(ms);
    const now = new Date();

    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow =
      date.getDate() === tomorrow.getDate() &&
      date.getMonth() === tomorrow.getMonth() &&
      date.getFullYear() === tomorrow.getFullYear();

    const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    if (isToday) return `Today, ${timeStr}`;
    if (isTomorrow) return `Tomorrow, ${timeStr}`;

    const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return `${dateStr}, ${timeStr}`;
  };

  const dueLabel = formatDue(task.due_at);

  return (
    <Animated.View style={[cardAnimatedStyle, { width: '100%' }]}>
      <Pressable
        onPress={() => onPress?.(task)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.card,
          {
            backgroundColor: colors.surfaceContainer,
            borderRadius: radii.card,
            opacity: isCompleted ? 0.6 : 1,
          },
        ]}
      >
        <View style={styles.contentRow}>
          {/* Checkbox */}
          <Pressable
            hitSlop={8}
            onPress={handleCheckPress}
            style={styles.checkTouchTarget}
          >
            <Animated.View
              style={[
                styles.checkbox,
                checkAnimatedStyle,
                {
                  borderColor: isCompleted ? colors.primary : priorityColor,
                  backgroundColor: isCompleted
                    ? colors.primary
                    : colors.surfaceContainerHigh,
                },
              ]}
            >
              {isCompleted ? (
                <MaterialCommunityIcons
                  name="check"
                  size={16}
                  color={colors.onPrimary}
                />
              ) : task.priority === 'high' ? (
                <View
                  style={[
                    styles.priorityDot,
                    { backgroundColor: colors.highPriority },
                  ]}
                />
              ) : null}
            </Animated.View>
          </Pressable>

          {/* Title & Metadata */}
          <View style={styles.infoCol}>
            <Text
              numberOfLines={2}
              style={[
                styles.title,
                {
                  color: isCompleted ? colors.onSurfaceVariant : colors.onSurface,
                  textDecorationLine: isCompleted ? 'line-through' : 'none',
                },
              ]}
            >
              {task.title}
            </Text>

            {/* Single Compact Metadata Row */}
            {(dueLabel || task.tag || task.repeat_rule !== 'none') && (
              <View style={styles.metadataRow}>
                {/* Due Time Pill */}
                {dueLabel && (
                  <View
                    style={[
                      styles.pill,
                      {
                        backgroundColor:
                          task.due_at && task.due_at < Date.now() && !isCompleted
                            ? colors.highPriorityContainer
                            : colors.surfaceContainerHigh,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={
                        task.due_at && task.due_at < Date.now() && !isCompleted
                          ? 'alert-circle-outline'
                          : 'clock-outline'
                      }
                      size={13}
                      color={
                        task.due_at && task.due_at < Date.now() && !isCompleted
                          ? colors.highPriority
                          : colors.onSurfaceVariant
                      }
                    />
                    <Text
                      style={[
                        styles.pillText,
                        {
                          color:
                            task.due_at && task.due_at < Date.now() && !isCompleted
                              ? colors.highPriority
                              : colors.onSurfaceVariant,
                        },
                      ]}
                    >
                      {dueLabel}
                    </Text>
                  </View>
                )}

                {/* Tag Pill */}
                {task.tag ? (
                  <View
                    style={[
                      styles.pill,
                      { backgroundColor: colors.surfaceContainerHigh },
                    ]}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        { color: colors.secondary, fontWeight: '600' },
                      ]}
                    >
                      #{task.tag}
                    </Text>
                  </View>
                ) : null}

                {/* Repeat Rule Icon */}
                {task.repeat_rule !== 'none' && (
                  <View style={styles.repeatBadge}>
                    <MaterialCommunityIcons
                      name="repeat"
                      size={14}
                      color={colors.primary}
                    />
                  </View>
                )}

                {/* Sticky Notification Indicator */}
                {task.is_sticky === 1 && !isCompleted && (
                  <View style={styles.repeatBadge}>
                    <MaterialCommunityIcons
                      name="pin"
                      size={14}
                      color={colors.tertiary}
                    />
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Action icon: Snooze for active with due time, Delete for completed */}
          {showDelete ? (
            <Pressable
              hitSlop={10}
              onPress={() => onDelete?.(task)}
              style={[
                styles.actionBtn,
                { backgroundColor: colors.surfaceContainerHigh },
              ]}
            >
              <MaterialCommunityIcons
                name="delete-outline"
                size={18}
                color={colors.error}
              />
            </Pressable>
          ) : onSnooze && task.due_at && !isCompleted ? (
            <Pressable
              hitSlop={10}
              onPress={() => onSnooze(task)}
              style={[
                styles.actionBtn,
                { backgroundColor: colors.surfaceContainerHigh },
              ]}
            >
              <MaterialCommunityIcons
                name="clock-plus-outline"
                size={18}
                color={colors.onSurfaceVariant}
              />
            </Pressable>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 18,
    marginVertical: 6,
    width: '100%',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkTouchTarget: {
    paddingRight: 14,
    paddingTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '500',
  },
  repeatBadge: {
    paddingHorizontal: 2,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    alignSelf: 'center',
  },
});
