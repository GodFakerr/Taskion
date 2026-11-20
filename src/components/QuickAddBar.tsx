import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, TextInput, Pressable, Text, StyleSheet, Keyboard } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../theme/useAppTheme';
import { parseReminderInput, ParsedReminder } from '../services/nlp';

interface QuickAddBarProps {
  onSubmit: (parsed: ParsedReminder) => void;
  placeholder?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

export const QuickAddBar: React.FC<QuickAddBarProps> = ({
  onSubmit,
  placeholder = 'Remind me to...',
  onFocus,
  onBlur,
}) => {
  const { colors, radii } = useAppTheme();
  const [text, setText] = useState('');
  const inputRef = useRef<any>(null);

  useEffect(() => {
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      inputRef.current?.blur();
      onBlur?.();
    });
    return () => hideSub.remove();
  }, [onBlur]);

  const parsed = useMemo(() => {
    if (!text.trim()) return null;
    return parseReminderInput(text);
  }, [text]);

  const hasContent = text.trim().length > 0;

  const handleSubmit = () => {
    if (!hasContent || !parsed) return;
    onSubmit(parsed);
    setText('');
    Keyboard.dismiss();
  };

  const formattedParsedDate = useMemo(() => {
    if (!parsed?.dueAt) return null;
    const date = new Date(parsed.dueAt);
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }, [parsed?.dueAt]);

  return (
    <View style={styles.container}>
      {/* Live NLP Preview Chips (Rendered Above Input so they float nicely above thumb bar) */}
      {hasContent && parsed && (parsed.dueAt || parsed.tag || parsed.priority !== 'none') && (
        <View style={styles.liveChipsRow}>
          {formattedParsedDate && (
            <View
              style={[
                styles.liveChip,
                { backgroundColor: colors.surfaceContainerHighest },
              ]}
            >
              <MaterialCommunityIcons
                name="clock-outline"
                size={12}
                color={colors.primary}
              />
              <Text style={[styles.liveChipText, { color: colors.primary }]}>
                {formattedParsedDate}
              </Text>
            </View>
          )}

          {parsed.tag ? (
            <View
              style={[
                styles.liveChip,
                { backgroundColor: colors.surfaceContainerHighest },
              ]}
            >
              <MaterialCommunityIcons
                name="pound"
                size={12}
                color={colors.secondary}
              />
              <Text style={[styles.liveChipText, { color: colors.secondary }]}>
                {parsed.tag}
              </Text>
            </View>
          ) : null}

          {parsed.priority !== 'none' && (
            <View
              style={[
                styles.liveChip,
                {
                  backgroundColor:
                    parsed.priority === 'high'
                      ? colors.highPriorityContainer
                      : colors.surfaceContainerHighest,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="flag"
                size={12}
                color={
                  parsed.priority === 'high'
                    ? colors.highPriority
                    : colors.onSurfaceVariant
                }
              />
              <Text
                style={[
                  styles.liveChipText,
                  {
                    color:
                      parsed.priority === 'high'
                        ? colors.highPriority
                        : colors.onSurfaceVariant,
                    textTransform: 'capitalize',
                  },
                ]}
              >
                {parsed.priority}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Input Row */}
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: colors.surfaceContainerHigh,
            borderRadius: radii.card,
          },
        ]}
      >
        <MaterialCommunityIcons
          name="plus-circle-outline"
          size={22}
          color={colors.onSurfaceVariant}
          style={styles.leadingIcon}
        />

        <TextInput
          ref={inputRef}
          value={text}
          onChangeText={setText}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          placeholderTextColor={colors.outline}
          style={[styles.input, { color: colors.onSurface }]}
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />

        <Pressable
          disabled={!hasContent}
          onPress={handleSubmit}
          style={({ pressed }) => [
            styles.submitBtn,
            {
              backgroundColor: hasContent ? colors.primary : colors.surfaceContainerHighest,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="arrow-up"
            size={18}
            color={hasContent ? colors.onPrimary : colors.outline}
          />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 56,
  },
  leadingIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 4,
  },
  submitBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  liveChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  liveChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
