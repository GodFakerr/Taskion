import React from 'react';
import { ScrollView, Pressable, Text, View, StyleSheet } from 'react-native';
import { useAppTheme } from '../theme/useAppTheme';

export interface FilterChipItem {
  key: string;
  label: string;
  count?: number;
  dotColor?: string;
}

interface FilterChipsProps {
  chips: FilterChipItem[];
  selectedKey: string;
  onSelect: (key: string) => void;
}

export const FilterChips: React.FC<FilterChipsProps> = ({
  chips,
  selectedKey,
  onSelect,
}) => {
  const { colors, radii } = useAppTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContainer}
      style={styles.scrollView}
    >
      {chips.map((chip) => {
        const isSelected = chip.key === selectedKey;

        return (
          <Pressable
            key={chip.key}
            onPress={() => onSelect(chip.key)}
            style={({ pressed }) => [
              styles.chip,
              {
                borderRadius: radii.pill,
                backgroundColor: isSelected
                  ? colors.secondaryContainer
                  : colors.surfaceContainerLow,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            {chip.dotColor && (
              <View
                style={[styles.dot, { backgroundColor: chip.dotColor }]}
              />
            )}
            <Text
              style={[
                styles.chipLabel,
                {
                  color: isSelected
                    ? colors.onSecondaryContainer
                    : colors.onSurfaceVariant,
                  fontWeight: isSelected ? '700' : '500',
                },
              ]}
            >
              {chip.label}
            </Text>
            {chip.count !== undefined && chip.count > 0 && (
              <View
                style={[
                  styles.countBadge,
                  {
                    backgroundColor: isSelected
                      ? colors.primary
                      : colors.surfaceContainerHighest,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.countText,
                    {
                      color: isSelected
                        ? colors.onPrimary
                        : colors.onSurfaceVariant,
                    },
                  ]}
                >
                  {chip.count}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    marginVertical: 8,
  },
  scrollContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipLabel: {
    fontSize: 13,
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 2,
  },
  countText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
