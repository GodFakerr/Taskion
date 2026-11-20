import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import {
  Task,
  updateTask,
  toggleTaskCompleted,
  getAllScheduledTasks,
  getTaskById,
} from '../db/tasksRepo';

// Foreground notification presentation behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const CHANNEL_HIGH = 'reminders-high';
export const CHANNEL_STANDARD = 'reminders-standard';
export const CATEGORY_REMINDER_ACTIONS = 'REMINDER_ACTIONS';

export const ACTION_MARK_DONE = 'MARK_DONE';
export const ACTION_SNOOZE_15 = 'SNOOZE_15';

export async function initNotificationChannelsAndCategories(): Promise<void> {
  if (Platform.OS === 'android') {
    // 1. High Priority Channel (MAX importance, vibration, bypass DND hint)
    await Notifications.setNotificationChannelAsync(CHANNEL_HIGH, {
      name: 'High Priority Reminders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FFB4AB',
      sound: 'default',
      bypassDnd: true,
      enableVibrate: true,
      showBadge: true,
    });

    // 2. Standard Reminders Channel (HIGH importance)
    await Notifications.setNotificationChannelAsync(CHANNEL_STANDARD, {
      name: 'Standard Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 200, 100, 200],
      lightColor: '#D0BCFF',
      enableVibrate: true,
      showBadge: true,
    });
  }

  // Register action category
  await Notifications.setNotificationCategoryAsync(CATEGORY_REMINDER_ACTIONS, [
    {
      identifier: ACTION_MARK_DONE,
      buttonTitle: '✓ Done',
      options: {
        opensAppToForeground: false,
      },
    },
    {
      identifier: ACTION_SNOOZE_15,
      buttonTitle: '⏰ Snooze 15m',
      options: {
        opensAppToForeground: false,
      },
    },
  ]);
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice && Platform.OS === 'web') {
    return false;
  }
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === 'granted';
}

export async function scheduleTaskNotification(task: Task): Promise<string | null> {
  if (!task.due_at || task.due_at <= Date.now() || task.is_completed === 1) {
    return null;
  }

  try {
    const channelId = task.priority === 'high' ? CHANNEL_HIGH : CHANNEL_STANDARD;

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: task.title,
        body: task.notes || (task.tag ? `#${task.tag} Reminder` : 'Reminder from Taskion'),
        data: { taskId: task.id },
        categoryIdentifier: CATEGORY_REMINDER_ACTIONS,
        sticky: task.is_sticky === 1,
        autoDismiss: task.is_sticky !== 1,
        color: task.priority === 'high' ? '#FFB4AB' : '#D0BCFF',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(task.due_at),
        channelId,
      },
    });

    // Update task in DB with scheduled ID
    await updateTask(task.id, { notification_id: notificationId });
    return notificationId;
  } catch (error) {
    console.warn('[Taskion] Failed to schedule notification:', error);
    return null;
  }
}

export async function cancelTaskNotification(notificationId: string | null | undefined): Promise<void> {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    await Notifications.dismissNotificationAsync(notificationId);
  } catch (error) {
    console.warn('[Taskion] Failed to cancel notification:', error);
  }
}

export async function snoozeTask(taskId: string, minutes: number = 15): Promise<number> {
  const task = await getTaskById(taskId);
  if (!task) return Date.now();

  if (task.notification_id) {
    await cancelTaskNotification(task.notification_id);
  }

  const newDueAt = Date.now() + minutes * 60 * 1000;
  await updateTask(taskId, { due_at: newDueAt });

  const updatedTask = { ...task, due_at: newDueAt };
  await scheduleTaskNotification(updatedTask);
  return newDueAt;
}

export function registerNotificationResponseListener(
  onTaskChanged?: (taskId: string, action: string) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(async (response) => {
    // Dismiss the notification from the Android notification tray immediately
    const notifIdentifier = response.notification?.request?.identifier;
    if (notifIdentifier) {
      try {
        await Notifications.dismissNotificationAsync(notifIdentifier);
      } catch (err) {
        console.warn('[Taskion] Error dismissing notification from tray:', err);
      }
    }

    const actionId = response.actionIdentifier;
    const taskId = response.notification.request.content.data?.taskId as string | undefined;

    if (!taskId) return;

    if (actionId === ACTION_MARK_DONE) {
      await toggleTaskCompleted(taskId, true);
      onTaskChanged?.(taskId, ACTION_MARK_DONE);
    } else if (actionId === ACTION_SNOOZE_15) {
      await snoozeTask(taskId, 15);
      onTaskChanged?.(taskId, ACTION_SNOOZE_15);
    } else {
      // Default tap: can trigger navigation or UI refresh
      onTaskChanged?.(taskId, 'TAP');
    }
  });
}

// Startup sync: verifies all future uncompleted tasks in SQLite have an active scheduled notification
export async function syncAllScheduledNotifications(): Promise<{ synced: number; cancelled: number }> {
  try {
    const now = Date.now();
    const scheduledFromDb = await getAllScheduledTasks();
    const futureDbTasks = scheduledFromDb.filter((t) => t.due_at !== null && t.due_at > now);

    const activeScheduled = await Notifications.getAllScheduledNotificationsAsync();
    const activeIds = new Set(activeScheduled.map((n) => n.identifier));

    let syncedCount = 0;
    let cancelledCount = 0;

    // Check future tasks
    for (const task of futureDbTasks) {
      if (!task.notification_id || !activeIds.has(task.notification_id)) {
        await scheduleTaskNotification(task);
        syncedCount++;
      }
    }

    // Cancel notifications for completed tasks or tasks that no longer exist
    const futureTaskNotificationIds = new Set(
      futureDbTasks.map((t) => t.notification_id).filter(Boolean)
    );

    for (const notif of activeScheduled) {
      if (!futureTaskNotificationIds.has(notif.identifier)) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
        cancelledCount++;
      }
    }

    return { synced: syncedCount, cancelled: cancelledCount };
  } catch (err) {
    console.warn('[Taskion] Sync notifications error:', err);
    return { synced: 0, cancelled: 0 };
  }
}
