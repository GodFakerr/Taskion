import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import {
  getAllDataForBackup,
  restoreDataFromBackup,
  Task,
  Subtask,
} from '../db/tasksRepo';
import { syncAllScheduledNotifications } from './notifications';

export interface BackupPayload {
  app: string;
  version: number;
  exportedAt: string;
  tasks: Task[];
  subtasks: Subtask[];
}

export async function exportJsonBackup(): Promise<{ success: boolean; filePath?: string }> {
  try {
    const data = await getAllDataForBackup();
    const payload: BackupPayload = {
      app: 'Taskion',
      version: 1,
      exportedAt: new Date().toISOString(),
      tasks: data.tasks,
      subtasks: data.subtasks,
    };

    const jsonString = JSON.stringify(payload, null, 2);
    const dateStamp = new Date().toISOString().slice(0, 10);
    const fileName = `taskion-backup-${dateStamp}-${Date.now().toString().slice(-4)}.json`;
    const directory = FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
    const fileUri = `${directory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, jsonString, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Export Taskion JSON Backup',
        UTI: 'public.json',
      });
    }

    return { success: true, filePath: fileUri };
  } catch (error) {
    console.error('[Taskion] JSON Export error:', error);
    throw error;
  }
}

export async function exportMarkdownArchive(): Promise<{ success: boolean; filePath?: string }> {
  try {
    const { tasks, subtasks } = await getAllDataForBackup();
    const completedTasks = tasks.filter((t) => t.is_completed === 1);
    const activeTasks = tasks.filter((t) => t.is_completed === 0);

    const subtasksByTask = new Map<string, Subtask[]>();
    for (const st of subtasks) {
      const list = subtasksByTask.get(st.task_id) || [];
      list.push(st);
      subtasksByTask.set(st.task_id, list);
    }

    const lines: string[] = [
      '# Taskion Reminders & Tasks Archive',
      `*Generated: ${new Date().toLocaleString()}*`,
      '',
      '## Active Tasks',
    ];

    if (activeTasks.length === 0) {
      lines.push('_No active tasks._');
    } else {
      for (const t of activeTasks) {
        const dueStr = t.due_at ? ` (Due: ${new Date(t.due_at).toLocaleString()})` : '';
        const tagStr = t.tag ? ` #${t.tag}` : '';
        const prioStr = t.priority !== 'none' ? ` [${t.priority.toUpperCase()}]` : '';
        lines.push(`- [ ] **${t.title}**${dueStr}${prioStr}${tagStr}`);
        if (t.notes) {
          lines.push(`  > ${t.notes.replace(/\n/g, '\n  > ')}`);
        }
        const taskSubs = subtasksByTask.get(t.id) || [];
        for (const s of taskSubs) {
          lines.push(`  - [${s.is_completed ? 'x' : ' '}] ${s.title}`);
        }
      }
    }

    lines.push('', '## Completed Tasks Archive');
    if (completedTasks.length === 0) {
      lines.push('_No completed tasks in archive._');
    } else {
      for (const t of completedTasks) {
        const completedStr = t.completed_at
          ? ` (Completed: ${new Date(t.completed_at).toLocaleString()})`
          : '';
        const tagStr = t.tag ? ` #${t.tag}` : '';
        lines.push(`- [x] ~~${t.title}~~${completedStr}${tagStr}`);
        if (t.notes) {
          lines.push(`  > ${t.notes.replace(/\n/g, '\n  > ')}`);
        }
        const taskSubs = subtasksByTask.get(t.id) || [];
        for (const s of taskSubs) {
          lines.push(`  - [${s.is_completed ? 'x' : ' '}] ${s.title}`);
        }
      }
    }

    const markdownContent = lines.join('\n');
    const dateStamp = new Date().toISOString().slice(0, 10);
    const fileName = `taskion-archive-${dateStamp}.md`;
    const directory = FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
    const fileUri = `${directory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, markdownContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/markdown',
        dialogTitle: 'Export Taskion Markdown Archive',
        UTI: 'net.daringfireball.markdown',
      });
    }

    return { success: true, filePath: fileUri };
  } catch (error) {
    console.error('[Taskion] Markdown Export error:', error);
    throw error;
  }
}

export async function importJsonBackup(): Promise<{
  success: boolean;
  tasksCount: number;
  subtasksCount: number;
}> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/plain', '*/*'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return { success: false, tasksCount: 0, subtasksCount: 0 };
    }

    const asset = result.assets[0];
    const fileContent = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const parsed = JSON.parse(fileContent);

    if (!parsed || !Array.isArray(parsed.tasks)) {
      throw new Error('Invalid Taskion backup file structure (missing tasks array).');
    }

    const tasks: Task[] = parsed.tasks;
    const subtasks: Subtask[] = Array.isArray(parsed.subtasks) ? parsed.subtasks : [];

    await restoreDataFromBackup({ tasks, subtasks });

    // Reschedule notifications for all future tasks
    await syncAllScheduledNotifications();

    return {
      success: true,
      tasksCount: tasks.length,
      subtasksCount: subtasks.length,
    };
  } catch (error) {
    console.error('[Taskion] JSON Import error:', error);
    throw error;
  }
}
