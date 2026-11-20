import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Notifications from 'expo-notifications';
import { useAppTheme } from '../src/theme/useAppTheme';
import {
  exportJsonBackup,
  importJsonBackup,
  exportMarkdownArchive,
} from '../src/services/backup';
import {
  requestNotificationPermissions,
  syncAllScheduledNotifications,
} from '../src/services/notifications';
import { getAllDataForBackup } from '../src/db/tasksRepo';

export default function SettingsScreen() {
  const { colors, radii, typography } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [notificationPermissionGranted, setNotificationPermissionGranted] = useState(false);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [stats, setStats] = useState({ totalTasks: 0, completedTasks: 0, subtasks: 0 });
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      // 1. Notification permissions
      const perm = await Notifications.getPermissionsAsync();
      setNotificationPermissionGranted(perm.status === 'granted');

      // 2. Active scheduled alarms
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      setScheduledCount(scheduled.length);

      // 3. Stats from DB
      const data = await getAllDataForBackup();
      const completed = data.tasks.filter((t) => t.is_completed === 1).length;
      setStats({
        totalTasks: data.tasks.length,
        completedTasks: completed,
        subtasks: data.subtasks.length,
      });
    } catch (err) {
      console.warn('[Taskion] Error loading settings status:', err);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermissions();
    setNotificationPermissionGranted(granted);
    if (!granted && Platform.OS === 'android') {
      try {
        await IntentLauncher.startActivityAsync(
          IntentLauncher.ActivityAction.APP_NOTIFICATION_SETTINGS,
          {
            extra: {
              'android.provider.extra.APP_PACKAGE': 'com.taskion.app',
            },
          }
        );
      } catch {
        Alert.alert('Notice', 'Please enable notifications in Android Settings for Taskion.');
      }
    }
  };

  const handleOpenBatterySettings = async () => {
    if (Platform.OS === 'android') {
      try {
        await IntentLauncher.startActivityAsync(
          IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS
        );
      } catch (err) {
        // Fallback to application details
        try {
          await IntentLauncher.startActivityAsync(
            IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS,
            {
              data: 'package:com.taskion.app',
            }
          );
        } catch {
          Alert.alert('Notice', 'Please open Android Settings > Apps > Taskion > Battery to disable optimization.');
        }
      }
    } else {
      Alert.alert('Notice', 'Battery optimization shortcuts are specific to Android.');
    }
  };

  const handleResyncAlarms = async () => {
    try {
      const result = await syncAllScheduledNotifications();
      await checkStatus();
      Alert.alert(
        'Alarms Synchronized',
        `Synced: ${result.synced} future alarms.\nCleared: ${result.cancelled} obsolete alarms.`
      );
    } catch {
      Alert.alert('Sync Error', 'Could not synchronize notifications.');
    }
  };

  const handleExportJson = async () => {
    try {
      setIsExporting(true);
      await exportJsonBackup();
    } catch {
      Alert.alert('Export Failed', 'Could not export JSON backup.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportJson = async () => {
    Alert.alert(
      'Import Backup',
      'Importing a JSON backup will replace all current tasks with the backup contents. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Choose File & Restore',
          onPress: async () => {
            try {
              setIsImporting(true);
              const result = await importJsonBackup();
              if (result.success) {
                await checkStatus();
                Alert.alert(
                  'Restore Successful',
                  `Successfully restored ${result.tasksCount} tasks and ${result.subtasksCount} subtasks.`
                );
              }
            } catch {
              Alert.alert('Import Failed', 'The selected file is not a valid Taskion backup.');
            } finally {
              setIsImporting(false);
            }
          },
        },
      ]
    );
  };

  const handleExportMarkdown = async () => {
    try {
      await exportMarkdownArchive();
    } catch {
      Alert.alert('Export Failed', 'Could not generate markdown file.');
    }
  };

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
          Settings & Reliability
        </Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerBox}>
          <Text style={[styles.editorialHeader, typography.editorialHeader, { color: colors.onSurface }]}>
            System
          </Text>
          <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
            Android exact alarms, battery optimization, and local vault backup.
          </Text>
        </View>

        {/* Android System Health Card */}
        <View
          style={[
            styles.cardSection,
            { backgroundColor: colors.surfaceContainer, borderRadius: radii.card },
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <MaterialCommunityIcons
              name="android"
              size={22}
              color={colors.primary}
            />
            <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
              Android Reliability & Alarms
            </Text>
          </View>

          {/* 1. Notification Permission */}
          <View style={[styles.itemRow, { borderBottomColor: colors.surfaceContainerHigh }]}>
            <View style={styles.itemInfo}>
              <Text style={[styles.itemTitle, { color: colors.onSurface }]}>
                Notifications Permission
              </Text>
              <Text style={[styles.itemDesc, { color: colors.onSurfaceVariant }]}>
                Status:{' '}
                <Text
                  style={{
                    color: notificationPermissionGranted
                      ? colors.lowPriority
                      : colors.highPriority,
                    fontWeight: '700',
                  }}
                >
                  {notificationPermissionGranted ? 'Active / Granted' : 'Denied / Disabled'}
                </Text>
              </Text>
            </View>

            <Pressable
              onPress={handleRequestPermission}
              style={[
                styles.actionPill,
                {
                  backgroundColor: notificationPermissionGranted
                    ? colors.surfaceContainerHigh
                    : colors.primary,
                },
              ]}
            >
              <Text
                style={[
                  styles.actionPillText,
                  {
                    color: notificationPermissionGranted
                      ? colors.onSurfaceVariant
                      : colors.onPrimary,
                  },
                ]}
              >
                {notificationPermissionGranted ? 'Settings' : 'Grant'}
              </Text>
            </Pressable>
          </View>

          {/* 2. Battery Optimization / Exact Alarms */}
          <View style={[styles.itemRow, { borderBottomColor: colors.surfaceContainerHigh }]}>
            <View style={styles.itemInfo}>
              <Text style={[styles.itemTitle, { color: colors.onSurface }]}>
                Unrestricted Battery Optimization
              </Text>
              <Text style={[styles.itemDesc, { color: colors.onSurfaceVariant }]}>
                Prevents Android from putting Taskion into deep sleep or killing scheduled alarms.
              </Text>
            </View>

            <Pressable
              onPress={handleOpenBatterySettings}
              style={[styles.actionPill, { backgroundColor: colors.surfaceContainerHigh }]}
            >
              <Text style={[styles.actionPillText, { color: colors.secondary }]}>
                Configure
              </Text>
            </Pressable>
          </View>

          {/* 3. Notification Diagnostics & Resync */}
          <View style={styles.itemRow}>
            <View style={styles.itemInfo}>
              <Text style={[styles.itemTitle, { color: colors.onSurface }]}>
                Alarm Manager Diagnostics
              </Text>
              <Text style={[styles.itemDesc, { color: colors.onSurfaceVariant }]}>
                {scheduledCount} active scheduled notification{scheduledCount === 1 ? '' : 's'} in OS.
              </Text>
            </View>

            <Pressable
              onPress={handleResyncAlarms}
              style={[styles.actionPill, { backgroundColor: colors.surfaceContainerHigh }]}
            >
              <Text style={[styles.actionPillText, { color: colors.primary }]}>
                Resync
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Local Data Backup & Restore Card */}
        <View
          style={[
            styles.cardSection,
            { backgroundColor: colors.surfaceContainer, borderRadius: radii.card },
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <MaterialCommunityIcons
              name="database-outline"
              size={22}
              color={colors.secondary}
            />
            <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
              Local Data Backup & Restore
            </Text>
          </View>

          <Text style={[styles.backupDesc, { color: colors.onSurfaceVariant }]}>
            Your tasks and notes are stored strictly in an encrypted SQLite database on this device.
            Export regular JSON backups to save or transfer to other devices.
          </Text>

          <View style={styles.backupButtonsCol}>
            {/* Export JSON */}
            <Pressable
              onPress={handleExportJson}
              disabled={isExporting}
              style={[
                styles.backupBtn,
                { backgroundColor: colors.surfaceContainerHigh, borderRadius: radii.md },
              ]}
            >
              <MaterialCommunityIcons
                name="export-variant"
                size={20}
                color={colors.primary}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.backupBtnTitle, { color: colors.onSurface }]}>
                  Export JSON Backup
                </Text>
                <Text style={[styles.backupBtnSub, { color: colors.onSurfaceVariant }]}>
                  Dumps all tasks & subtasks to a portable JSON file
                </Text>
              </View>
            </Pressable>

            {/* Import JSON */}
            <Pressable
              onPress={handleImportJson}
              disabled={isImporting}
              style={[
                styles.backupBtn,
                { backgroundColor: colors.surfaceContainerHigh, borderRadius: radii.md },
              ]}
            >
              <MaterialCommunityIcons
                name="import"
                size={20}
                color={colors.secondary}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.backupBtnTitle, { color: colors.onSurface }]}>
                  Import JSON Backup
                </Text>
                <Text style={[styles.backupBtnSub, { color: colors.onSurfaceVariant }]}>
                  Restores SQLite database and reschedules all reminders
                </Text>
              </View>
            </Pressable>

            {/* Export Markdown */}
            <Pressable
              onPress={handleExportMarkdown}
              style={[
                styles.backupBtn,
                { backgroundColor: colors.surfaceContainerHigh, borderRadius: radii.md },
              ]}
            >
              <MaterialCommunityIcons
                name="file-document-outline"
                size={20}
                color={colors.tertiary}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.backupBtnTitle, { color: colors.onSurface }]}>
                  Export Markdown Archive
                </Text>
                <Text style={[styles.backupBtnSub, { color: colors.onSurfaceVariant }]}>
                  Human-readable checklist (.md) format
                </Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* Database & Storage Stats */}
        <View
          style={[
            styles.cardSection,
            { backgroundColor: colors.surfaceContainer, borderRadius: radii.card },
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <MaterialCommunityIcons
              name="chart-box-outline"
              size={22}
              color={colors.tertiary}
            />
            <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
              Storage & Statistics
            </Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={[styles.statBox, { backgroundColor: colors.surfaceContainerHigh }]}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>
                {stats.totalTasks}
              </Text>
              <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>
                Total Tasks
              </Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: colors.surfaceContainerHigh }]}>
              <Text style={[styles.statNumber, { color: colors.lowPriority }]}>
                {stats.completedTasks}
              </Text>
              <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>
                Completed
              </Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: colors.surfaceContainerHigh }]}>
              <Text style={[styles.statNumber, { color: colors.secondary }]}>
                {stats.subtasks}
              </Text>
              <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>
                Subtasks
              </Text>
            </View>
          </View>
        </View>

        {/* App Branding Footer */}
        <View style={styles.brandingFooter}>
          <Image
            source={require('../assets/icon.png')}
            style={styles.brandingLogo}
            resizeMode="contain"
          />
          <Text style={[styles.brandingName, { color: colors.onSurface }]}>Taskion</Text>
          <Text style={[styles.brandingVersion, { color: colors.onSurfaceVariant }]}>
            v1.0.0 · Offline-first & Private
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
    gap: 16,
  },
  headerBox: {
    marginBottom: 4,
  },
  editorialHeader: {
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  cardSection: {
    padding: 18,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 3,
  },
  itemDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  actionPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  actionPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  backupDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  backupButtonsCol: {
    gap: 10,
  },
  backupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  backupBtnTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  backupBtnSub: {
    fontSize: 11,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  statBox: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  brandingFooter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 6,
  },
  brandingLogo: {
    width: 64,
    height: 64,
    borderRadius: 16,
  },
  brandingName: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  brandingVersion: {
    fontSize: 12,
    fontWeight: '500',
  },
});
