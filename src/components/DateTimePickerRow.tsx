import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useAppTheme } from '../theme/useAppTheme';

interface DateTimePickerRowProps {
  dueAt: number | null;
  onChangeDueAt: (newDueAt: number | null) => void;
}

export const DateTimePickerRow: React.FC<DateTimePickerRowProps> = ({
  dueAt,
  onChangeDueAt,
}) => {
  const { colors, radii } = useAppTheme();

  const currentDate = dueAt ? new Date(dueAt) : new Date();

  // Android Native Date Picker Dialog
  const openDatePicker = () => {
    if (Platform.OS === 'android') {
      const now = new Date();
      DateTimePickerAndroid.open({
        value: dueAt ? new Date(dueAt) : now,
        onChange: (event, selectedDate) => {
          if (event.type === 'set' && selectedDate) {
            // Preserve the time from existing dueAt or default to current time
            const updated = new Date(selectedDate);
            if (dueAt) {
              const prev = new Date(dueAt);
              updated.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
            } else {
              const currentTime = new Date();
              updated.setHours(currentTime.getHours(), currentTime.getMinutes(), 0, 0);
            }
            onChangeDueAt(updated.getTime());
          }
        },
        mode: 'date',
      });
    }
  };

  // Android Native Time Picker Dialog
  const openTimePicker = () => {
    if (Platform.OS === 'android') {
      const now = new Date();
      DateTimePickerAndroid.open({
        value: dueAt ? new Date(dueAt) : now,
        onChange: (event, selectedTime) => {
          if (event.type === 'set' && selectedTime) {
            // Preserve the date (or use today), update hour and minute
            const base = dueAt ? new Date(dueAt) : new Date();
            const updated = new Date(base);
            updated.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
            onChangeDueAt(updated.getTime());
          }
        },
        mode: 'time',
        is24Hour: false,
      });
    }
  };

  // Presets
  const applyPreset = (preset: 'today_9pm' | 'tomorrow_9am' | 'weekend' | 'next_mon') => {
    const now = new Date();
    if (preset === 'today_9pm') {
      const d = new Date();
      d.setHours(21, 0, 0, 0);
      if (d.getTime() <= now.getTime()) {
        d.setDate(d.getDate() + 1);
      }
      onChangeDueAt(d.getTime());
    } else if (preset === 'tomorrow_9am') {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      onChangeDueAt(d.getTime());
    } else if (preset === 'weekend') {
      const d = new Date();
      const daysUntilSat = (6 - d.getDay() + 7) % 7 || 7;
      d.setDate(d.getDate() + daysUntilSat);
      d.setHours(10, 0, 0, 0);
      onChangeDueAt(d.getTime());
    } else if (preset === 'next_mon') {
      const d = new Date();
      const daysUntilMon = (8 - d.getDay()) % 7 || 7;
      d.setDate(d.getDate() + daysUntilMon);
      d.setHours(9, 0, 0, 0);
      onChangeDueAt(d.getTime());
    }
  };

  const formattedDate = dueAt
    ? new Date(dueAt).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const formattedTime = dueAt
    ? new Date(dueAt).toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

  return (
    <View style={styles.container}>
      {/* Pick Date & Pick Time Action Buttons */}
      <View style={styles.buttonsRow}>
        {/* Date Picker Button */}
        <Pressable
          onPress={openDatePicker}
          style={({ pressed }) => [
            styles.pickerButton,
            {
              backgroundColor: dueAt
                ? colors.secondaryContainer
                : colors.surfaceContainerHigh,
              borderRadius: radii.md,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="calendar-month-outline"
            size={18}
            color={dueAt ? colors.onSecondaryContainer : colors.primary}
          />
          <View style={styles.buttonTextCol}>
            <Text style={[styles.buttonLabel, { color: colors.onSurfaceVariant }]}>
              Date
            </Text>
            <Text
              numberOfLines={1}
              style={[
                styles.buttonValue,
                {
                  color: dueAt
                    ? colors.onSecondaryContainer
                    : colors.onSurface,
                  fontWeight: dueAt ? '700' : '500',
                },
              ]}
            >
              {formattedDate || 'Choose Date'}
            </Text>
          </View>
        </Pressable>

        {/* Time Picker Button */}
        <Pressable
          onPress={openTimePicker}
          style={({ pressed }) => [
            styles.pickerButton,
            {
              backgroundColor: dueAt
                ? colors.secondaryContainer
                : colors.surfaceContainerHigh,
              borderRadius: radii.md,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="clock-time-four-outline"
            size={18}
            color={dueAt ? colors.onSecondaryContainer : colors.primary}
          />
          <View style={styles.buttonTextCol}>
            <Text style={[styles.buttonLabel, { color: colors.onSurfaceVariant }]}>
              Time
            </Text>
            <Text
              numberOfLines={1}
              style={[
                styles.buttonValue,
                {
                  color: dueAt
                    ? colors.onSecondaryContainer
                    : colors.onSurface,
                  fontWeight: dueAt ? '700' : '500',
                },
              ]}
            >
              {formattedTime || 'Choose Time'}
            </Text>
          </View>
        </Pressable>

        {/* Clear Button (if set) */}
        {dueAt !== null && (
          <Pressable
            onPress={() => onChangeDueAt(null)}
            hitSlop={8}
            style={[
              styles.clearBtn,
              { backgroundColor: colors.surfaceContainerHigh },
            ]}
          >
            <MaterialCommunityIcons
              name="close"
              size={18}
              color={colors.error}
            />
          </Pressable>
        )}
      </View>

      {/* Quick Presets Row */}
      <View style={styles.presetsRow}>
        <Pressable
          onPress={() => applyPreset('today_9pm')}
          style={[styles.presetChip, { backgroundColor: colors.surfaceContainerHigh }]}
        >
          <Text style={[styles.presetText, { color: colors.onSurfaceVariant }]}>
            Today 9 PM
          </Text>
        </Pressable>

        <Pressable
          onPress={() => applyPreset('tomorrow_9am')}
          style={[styles.presetChip, { backgroundColor: colors.surfaceContainerHigh }]}
        >
          <Text style={[styles.presetText, { color: colors.onSurfaceVariant }]}>
            Tomorrow 9 AM
          </Text>
        </Pressable>

        <Pressable
          onPress={() => applyPreset('weekend')}
          style={[styles.presetChip, { backgroundColor: colors.surfaceContainerHigh }]}
        >
          <Text style={[styles.presetText, { color: colors.onSurfaceVariant }]}>
            This Weekend
          </Text>
        </Pressable>

        <Pressable
          onPress={() => applyPreset('next_mon')}
          style={[styles.presetChip, { backgroundColor: colors.surfaceContainerHigh }]}
        >
          <Text style={[styles.presetText, { color: colors.onSurfaceVariant }]}>
            Next Mon 9 AM
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 10,
    marginTop: 6,
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  buttonTextCol: {
    flex: 1,
  },
  buttonLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  buttonValue: {
    fontSize: 13,
    marginTop: 1,
  },
  clearBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
