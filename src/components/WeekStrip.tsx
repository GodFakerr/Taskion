import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useAppTheme } from '../theme/useAppTheme';

export interface DayInfo {
  date: Date;
  dateKey: string; // YYYY-MM-DD
  dayName: string; // THU, FRI, etc.
  dayNumber: number; // 24, 25, etc.
  isToday: boolean;
  hasTasks: boolean;
  highPriorityCount: number;
}

interface WeekStripProps {
  days: DayInfo[];
  selectedDateKey: string | null;
  onSelectDate: (dateKey: string | null) => void;
}

export const WeekStrip: React.FC<WeekStripProps> = ({
  days,
  selectedDateKey,
  onSelectDate,
}) => {
  const { colors, radii } = useAppTheme();

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {days.map((item) => {
          const isSelected = selectedDateKey === item.dateKey;

          return (
            <Pressable
              key={item.dateKey}
              onPress={() => onSelectDate(isSelected ? null : item.dateKey)}
              style={({ pressed }) => [
                styles.dayCard,
                {
                  borderRadius: radii.md,
                  backgroundColor: isSelected
                    ? colors.primary
                    : colors.surfaceContainerLow,
                  opacity: pressed ? 0.85 : 1,
                  transform: [{ scale: isSelected ? 1.05 : 1 }],
                },
              ]}
            >
              <Text
                style={[
                  styles.dayName,
                  {
                    color: isSelected
                      ? colors.onPrimary
                      : item.isToday
                      ? colors.primary
                      : colors.onSurfaceVariant,
                    fontWeight: isSelected || item.isToday ? '700' : '500',
                  },
                ]}
              >
                {item.dayName}
              </Text>

              <Text
                style={[
                  styles.dayNumber,
                  {
                    color: isSelected ? colors.onPrimary : colors.onSurface,
                    fontWeight: isSelected ? '800' : '600',
                  },
                ]}
              >
                {item.dayNumber}
              </Text>

              {/* Indicator Dots */}
              <View style={styles.dotsRow}>
                {item.hasTasks ? (
                  <View
                    style={[
                      styles.dot,
                      {
                        backgroundColor: isSelected
                          ? colors.onPrimary
                          : item.highPriorityCount > 0
                          ? colors.highPriority
                          : colors.primary,
                      },
                    ]}
                  />
                ) : (
                  <View style={styles.emptyDot} />
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  dayCard: {
    minWidth: 48,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayName: {
    fontSize: 11,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: 18,
    lineHeight: 22,
  },
  dotsRow: {
    height: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  emptyDot: {
    width: 5,
    height: 5,
    opacity: 0,
  },
});
