import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../theme/useAppTheme';

export interface DialogButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void | Promise<void>;
}

export interface DialogOptions {
  title: string;
  message?: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor?: string;
  iconBgColor?: string;
  buttons?: DialogButton[];
  dismissable?: boolean;
  onDismiss?: () => void;
}

export interface ConfirmOptions {
  title: string;
  message?: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

export interface AlertOptions {
  title: string;
  message?: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  buttonText?: string;
  dismissable?: boolean;
  onConfirm?: () => void | Promise<void>;
  onDismiss?: () => void;
}

interface DialogContextValue {
  showDialog: (options: DialogOptions) => void;
  showAlert: (options: AlertOptions) => void;
  showConfirm: (options: ConfirmOptions) => void;
  hideDialog: () => void;
}

const DialogContext = createContext<DialogContextValue | undefined>(undefined);

export const DialogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { colors, radii, isDark } = useAppTheme();
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<DialogOptions | null>(null);

  const hideDialog = useCallback(() => {
    setVisible(false);
    setConfig(null);
  }, []);

  const handleDismiss = useCallback(() => {
    if (config?.dismissable !== false) {
      const dismissCb = config?.onDismiss;
      hideDialog();
      dismissCb?.();
    }
  }, [config, hideDialog]);

  const showDialog = useCallback((options: DialogOptions) => {
    setConfig(options);
    setVisible(true);
  }, []);

  const showAlert = useCallback(
    ({
      title,
      message,
      icon,
      buttonText = 'OK',
      dismissable = true,
      onConfirm,
      onDismiss,
    }: AlertOptions) => {
      // Auto-determine icon if not supplied
      let resolvedIcon = icon;
      let resolvedIconColor: string | undefined;
      let resolvedIconBg: string | undefined;

      const lowerTitle = title.toLowerCase();
      if (!resolvedIcon) {
        if (lowerTitle.includes('saved') || lowerTitle.includes('success')) {
          resolvedIcon = 'check-circle-outline';
          resolvedIconColor = colors.primary;
          resolvedIconBg = colors.primaryContainer;
        } else if (lowerTitle.includes('error') || lowerTitle.includes('failed')) {
          resolvedIcon = 'alert-circle-outline';
          resolvedIconColor = colors.error;
          resolvedIconBg = colors.errorContainer;
        } else if (lowerTitle.includes('required')) {
          resolvedIcon = 'alert-outline';
          resolvedIconColor = colors.tertiary;
          resolvedIconBg = colors.tertiaryContainer;
        } else {
          resolvedIcon = 'information-outline';
          resolvedIconColor = colors.primary;
          resolvedIconBg = colors.surfaceContainerHighest;
        }
      }

      showDialog({
        title,
        message,
        icon: resolvedIcon,
        iconColor: resolvedIconColor,
        iconBgColor: resolvedIconBg,
        buttons: [
          {
            text: buttonText,
            style: 'default',
            onPress: onConfirm,
          },
        ],
        dismissable,
        onDismiss: onDismiss ?? onConfirm,
      });
    },
    [colors, showDialog]
  );

  const showConfirm = useCallback(
    ({
      title,
      message,
      icon,
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      isDestructive = false,
      onConfirm,
      onCancel,
    }: ConfirmOptions) => {
      let resolvedIcon = icon;
      let resolvedIconColor: string | undefined;
      let resolvedIconBg: string | undefined;

      if (!resolvedIcon) {
        if (isDestructive || title.toLowerCase().includes('delete') || title.toLowerCase().includes('clear')) {
          resolvedIcon = 'trash-can-outline';
          resolvedIconColor = colors.error;
          resolvedIconBg = colors.errorContainer;
        } else {
          resolvedIcon = 'help-circle-outline';
          resolvedIconColor = colors.primary;
          resolvedIconBg = colors.surfaceContainerHighest;
        }
      }

      showDialog({
        title,
        message,
        icon: resolvedIcon,
        iconColor: resolvedIconColor,
        iconBgColor: resolvedIconBg,
        buttons: [
          {
            text: cancelText,
            style: 'cancel',
            onPress: onCancel,
          },
          {
            text: confirmText,
            style: isDestructive ? 'destructive' : 'default',
            onPress: onConfirm,
          },
        ],
        dismissable: false,
      });
    },
    [colors, showDialog]
  );

  return (
    <DialogContext.Provider value={{ showDialog, showAlert, showConfirm, hideDialog }}>
      {children}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleDismiss}
      >
        <Pressable
          style={styles.scrim}
          onPress={handleDismiss}
        >
          <Pressable
            style={[
              styles.dialogCard,
              {
                backgroundColor: colors.surfaceContainerHigh,
                borderColor: colors.outlineVariant,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Top Icon Badge */}
            {config?.icon && (
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: config.iconBgColor || colors.surfaceContainerHighest,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={config.icon}
                  size={28}
                  color={config.iconColor || colors.primary}
                />
              </View>
            )}

            {/* Title */}
            <Text
              style={[
                styles.title,
                { color: colors.onSurface },
                !config?.icon && { marginTop: 4 },
              ]}
            >
              {config?.title}
            </Text>

            {/* Message */}
            {config?.message ? (
              <Text style={[styles.message, { color: colors.onSurfaceVariant }]}>
                {config.message}
              </Text>
            ) : null}

            {/* Actions Bar */}
            <View style={styles.actionsRow}>
              {(config?.buttons && config.buttons.length > 0
                ? config.buttons
                : [{ text: 'OK', style: 'default' as const }]
              ).map((btn, idx) => {
                const isDestructive = btn.style === 'destructive';
                const isCancel = btn.style === 'cancel';

                let btnBg = colors.primary;
                let btnText = colors.onPrimary;

                if (isDestructive) {
                  btnBg = colors.error;
                  btnText = colors.onError;
                } else if (isCancel) {
                  btnBg = isDark ? colors.surfaceContainerHighest : colors.surfaceContainer;
                  btnText = colors.onSurfaceVariant;
                }

                return (
                  <Pressable
                    key={idx}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      {
                        backgroundColor: btnBg,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                    onPress={async () => {
                      hideDialog();
                      if (btn.onPress) {
                        await btn.onPress();
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.actionBtnText,
                        { color: btnText },
                      ]}
                      numberOfLines={1}
                    >
                      {btn.text}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </DialogContext.Provider>
  );
};

export const useDialog = (): DialogContextValue => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  dialogCard: {
    width: Math.min(width - 48, 360),
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    ...Platform.select({
      android: {
        elevation: 8,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
    }),
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.2,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
