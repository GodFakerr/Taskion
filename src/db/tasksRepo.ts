import { getDb } from './client';

export type Priority = 'none' | 'low' | 'medium' | 'high';
export type RepeatRule = 'none' | 'daily' | 'weekly' | 'monthly';

export interface Task {
  id: string;
  title: string;
  notes: string;
  due_at: number | null;
  priority: Priority;
  tag: string;
  repeat_rule: RepeatRule;
  is_sticky: number;
  is_completed: number;
  completed_at: number | null;
  notification_id: string | null;
  created_at: number;
  subtasks?: Subtask[];
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  is_completed: number;
}

export interface CreateTaskInput {
  title: string;
  notes?: string;
  due_at?: number | null;
  priority?: Priority;
  tag?: string;
  repeat_rule?: RepeatRule;
  is_sticky?: boolean | number;
  notification_id?: string | null;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function calculateNextDueDate(currentDueAt: number, repeatRule: RepeatRule): number {
  const date = new Date(currentDueAt);
  if (repeatRule === 'daily') {
    date.setDate(date.getDate() + 1);
  } else if (repeatRule === 'weekly') {
    date.setDate(date.getDate() + 7);
  } else if (repeatRule === 'monthly') {
    date.setMonth(date.getMonth() + 1);
  }
  return date.getTime();
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const db = await getDb();
  const id = generateId();
  const now = Date.now();
  const priority = input.priority || 'none';
  const repeatRule = input.repeat_rule || 'none';
  const isSticky = input.is_sticky ? 1 : 0;
  const notes = input.notes || '';
  const tag = input.tag || '';
  const dueAt = input.due_at ?? null;
  const notificationId = input.notification_id ?? null;

  await db.runAsync(
    `INSERT INTO tasks (
      id, title, notes, due_at, priority, tag, repeat_rule,
      is_sticky, is_completed, completed_at, notification_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?)`,
    [id, input.title.trim(), notes, dueAt, priority, tag, repeatRule, isSticky, notificationId, now]
  );

  return {
    id,
    title: input.title.trim(),
    notes,
    due_at: dueAt,
    priority,
    tag,
    repeat_rule: repeatRule,
    is_sticky: isSticky,
    is_completed: 0,
    completed_at: null,
    notification_id: notificationId,
    created_at: now,
    subtasks: [],
  };
}

export async function getTodayTasks(): Promise<Task[]> {
  const db = await getDb();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  // Return active tasks due today OR inbox tasks (due_at IS NULL)
  const rows = await db.getAllAsync<Task>(
    `SELECT * FROM tasks
     WHERE is_completed = 0
       AND ((due_at >= ? AND due_at <= ?) OR due_at IS NULL)
     ORDER BY
       CASE WHEN due_at IS NULL THEN 1 ELSE 0 END,
       due_at ASC,
       CASE priority
         WHEN 'high' THEN 1
         WHEN 'medium' THEN 2
         WHEN 'low' THEN 3
         ELSE 4
       END,
       created_at DESC`,
    [startOfDay.getTime(), endOfDay.getTime()]
  );
  return rows;
}

export async function getOverdueTasks(): Promise<Task[]> {
  const db = await getDb();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const rows = await db.getAllAsync<Task>(
    `SELECT * FROM tasks
     WHERE is_completed = 0
       AND due_at IS NOT NULL
       AND due_at < ?
     ORDER BY due_at ASC`,
    [startOfDay.getTime()]
  );
  return rows;
}

export async function rescheduleOverdueTasksToToday(): Promise<number> {
  const db = await getDb();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // Reschedule to today at current time or 6 PM
  const todayTarget = new Date();
  todayTarget.setHours(18, 0, 0, 0);
  const targetMs = todayTarget.getTime();

  const result = await db.runAsync(
    `UPDATE tasks
     SET due_at = ?
     WHERE is_completed = 0
       AND due_at IS NOT NULL
       AND due_at < ?`,
    [targetMs, startOfDay.getTime()]
  );
  return result.changes;
}

export async function getScheduledTasks(): Promise<Task[]> {
  const db = await getDb();
  const startOfTomorrow = new Date();
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  startOfTomorrow.setHours(0, 0, 0, 0);

  const rows = await db.getAllAsync<Task>(
    `SELECT * FROM tasks
     WHERE is_completed = 0
       AND due_at IS NOT NULL
       AND due_at >= ?
     ORDER BY due_at ASC,
       CASE priority
         WHEN 'high' THEN 1
         WHEN 'medium' THEN 2
         WHEN 'low' THEN 3
         ELSE 4
       END`,
    [startOfTomorrow.getTime()]
  );
  return rows;
}

export async function getAllScheduledTasks(): Promise<Task[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Task>(
    `SELECT * FROM tasks
     WHERE is_completed = 0
       AND due_at IS NOT NULL
     ORDER BY due_at ASC`
  );
  return rows;
}

export async function getCompletedTasks(): Promise<Task[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Task>(
    `SELECT * FROM tasks
     WHERE is_completed = 1
     ORDER BY completed_at DESC, created_at DESC`
  );
  return rows;
}

export async function getTaskById(id: string): Promise<Task | null> {
  const db = await getDb();
  const task = await db.getFirstAsync<Task>(`SELECT * FROM tasks WHERE id = ?`, [id]);
  if (!task) return null;

  const subtasks = await db.getAllAsync<Subtask>(
    `SELECT * FROM subtasks WHERE task_id = ? ORDER BY is_completed ASC, id ASC`,
    [id]
  );
  return { ...task, subtasks };
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<void> {
  const db = await getDb();
  const fields: string[] = [];
  const values: any[] = [];

  const allowedKeys: (keyof Task)[] = [
    'title',
    'notes',
    'due_at',
    'priority',
    'tag',
    'repeat_rule',
    'is_sticky',
    'is_completed',
    'completed_at',
    'notification_id',
  ];

  for (const key of allowedKeys) {
    if (key in updates) {
      fields.push(`${key} = ?`);
      values.push((updates as any)[key]);
    }
  }

  if (fields.length === 0) return;

  values.push(id);
  await db.runAsync(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function toggleTaskCompleted(
  id: string,
  isCompleted: boolean
): Promise<{ nextTaskCreated?: Task }> {
  const db = await getDb();
  const task = await getTaskById(id);
  if (!task) return {};

  const now = Date.now();
  const newCompletedVal = isCompleted ? 1 : 0;
  const completedAt = isCompleted ? now : null;

  await db.runAsync(
    `UPDATE tasks SET is_completed = ?, completed_at = ? WHERE id = ?`,
    [newCompletedVal, completedAt, id]
  );

  // If completed and task has a repeat rule, spawn next occurrence
  if (isCompleted && task.repeat_rule && task.repeat_rule !== 'none' && task.due_at) {
    const nextDueAt = calculateNextDueDate(task.due_at, task.repeat_rule);
    const nextTask = await createTask({
      title: task.title,
      notes: task.notes,
      due_at: nextDueAt,
      priority: task.priority,
      tag: task.tag,
      repeat_rule: task.repeat_rule,
      is_sticky: task.is_sticky === 1,
    });
    return { nextTaskCreated: nextTask };
  }

  return {};
}

export async function deleteTask(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM tasks WHERE id = ?`, [id]);
}

export async function clearAllCompleted(): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(`DELETE FROM tasks WHERE is_completed = 1`);
  return result.changes;
}

export async function getAllDistinctTags(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ tag: string }>(
    `SELECT DISTINCT tag FROM tasks WHERE tag IS NOT NULL AND tag != '' ORDER BY tag ASC`
  );
  return rows.map((r) => r.tag);
}

// Subtasks
export async function getSubtasks(taskId: string): Promise<Subtask[]> {
  const db = await getDb();
  return db.getAllAsync<Subtask>(
    `SELECT * FROM subtasks WHERE task_id = ? ORDER BY is_completed ASC, id ASC`,
    [taskId]
  );
}

export async function createSubtask(taskId: string, title: string): Promise<Subtask> {
  const db = await getDb();
  const id = generateId();
  await db.runAsync(
    `INSERT INTO subtasks (id, task_id, title, is_completed) VALUES (?, ?, ?, 0)`,
    [id, taskId, title.trim()]
  );
  return { id, task_id: taskId, title: title.trim(), is_completed: 0 };
}

export async function toggleSubtask(id: string, isCompleted: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE subtasks SET is_completed = ? WHERE id = ?`, [
    isCompleted ? 1 : 0,
    id,
  ]);
}

export async function deleteSubtask(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM subtasks WHERE id = ?`, [id]);
}

// Full DB Dump / Restore for Backup
export async function getAllDataForBackup(): Promise<{ tasks: Task[]; subtasks: Subtask[] }> {
  const db = await getDb();
  const tasks = await db.getAllAsync<Task>(`SELECT * FROM tasks ORDER BY created_at ASC`);
  const subtasks = await db.getAllAsync<Subtask>(`SELECT * FROM subtasks`);
  return { tasks, subtasks };
}

export async function restoreDataFromBackup(data: { tasks: Task[]; subtasks: Subtask[] }): Promise<void> {
  const db = await getDb();
  await db.execAsync('BEGIN TRANSACTION;');
  try {
    await db.execAsync(`DELETE FROM subtasks; DELETE FROM tasks;`);
    for (const t of data.tasks) {
      await db.runAsync(
        `INSERT INTO tasks (
          id, title, notes, due_at, priority, tag, repeat_rule,
          is_sticky, is_completed, completed_at, notification_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          t.id,
          t.title,
          t.notes || '',
          t.due_at ?? null,
          t.priority || 'none',
          t.tag || '',
          t.repeat_rule || 'none',
          t.is_sticky || 0,
          t.is_completed || 0,
          t.completed_at ?? null,
          t.notification_id ?? null,
          t.created_at,
        ]
      );
    }
    for (const s of data.subtasks) {
      await db.runAsync(
        `INSERT INTO subtasks (id, task_id, title, is_completed) VALUES (?, ?, ?, ?)`,
        [s.id, s.task_id, s.title, s.is_completed || 0]
      );
    }
    await db.execAsync('COMMIT;');
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    throw error;
  }
}
