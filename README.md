<p align="center">
  <img src="assets/icon.png" width="128" height="128" alt="Taskion Logo" style="border-radius: 28px;" />
</p>

<h1 align="center">Taskion</h1>

<p align="center">
  <b>A minimalist, offline-first personal Android reminders & task manager engineered with Material 3 Expressive design.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Android-Material%203-3DDC84?style=for-the-badge&logo=android&logoColor=white" alt="Android Material 3" />
  <img src="https://img.shields.io/badge/License-MIT-blueviolet?style=for-the-badge" alt="MIT License" />
</p>

---

## ✨ Overview

**Taskion** is a distraction-free, zero-clutter task manager and reminder app built for speed, simplicity, and complete privacy. Following Android's **Material 3 Expressive** design principles, Taskion removes social feeds, habit streaks, progress rings, and account logins in favor of a fast, local-first workflow that respects your attention.

Everything is stored locally on your device with native Android exact alarms and natural language scheduling accessible directly from the thumb dock.

---

## 🚀 Key Features

* **⚡ Natural Language Quick-Add**: Type reminders as you speak them. The inline parser automatically extracts dates, times, `#tags`, and `!priority` levels in real-time (e.g., *"Pay electricity bill tomorrow 6pm #Finance !high"*).
* **🎨 Material 3 Expressive Design**: Squircle 28px cards, editorial typography (`40px`, `-0.5` tracking), tall 76px bottom navigation with stadium pills, and fluid spring animations.
* **🔒 100% Offline & Private**: Zero cloud dependencies, zero external servers, and zero accounts. All data is kept locally on your device with complete JSON and Markdown export/import support.
* **⏰ Exact Alarms & Persistent Alerts**: Reliable notification scheduling with Android notification channels, direct **✓ Done** and **⏰ Snooze (+15m)** actions from the status bar, and optional sticky lock-screen alerts.
* **📅 Scheduled Timeline**: 7-day horizontal calendar strip with task count indicator dots, quick timeline filters (*Tomorrow*, *This Weekend*, *Next Week*), and chronological section groupings.

---

## 📱 Screens

| Screen | Description |
| :--- | :--- |
| **Today** | Editorial greeting, search filter, conditional overdue banner with one-tap reschedule, tag/priority filter chips, and floating bottom NLP quick-add dock. |
| **Scheduled** | 7-day horizontal selector strip, timeline filters, and chronological task groupings. |
| **Completed** | Historical archive of completed tasks with instant restore and permanent purge options. |
| **Create / Edit** | Full reminder modal with native Android Date & Time picker dialogs, priority selector, tags, recurrence rules, and subtask checklists. |
| **Task Detail** | In-place editor for task notes, clickable links, and subtask steps. |
| **Settings** | Android notification permission auditor, alarm manager resync diagnostics, battery optimization bypass shortcuts, and data backup/restore. |

---

## 🏗️ Architecture

```text
Taskion/
├── app/
│   ├── _layout.tsx                 # Root Stack: Notification channels, startup sync, global theme
│   ├── (tabs)/
│   │   ├── _layout.tsx             # Material 3 Custom Bottom Tab Bar (Today, Scheduled, Completed)
│   │   ├── index.tsx               # Screen 1: Today Dashboard & Reanimated NLP Quick-Add Dock
│   │   ├── scheduled.tsx           # Screen 2: 7-Day Strip & Chronological Grouped List
│   │   └── completed.tsx           # Screen 3: Completed Archive, Restore & Purge
│   ├── new-reminder.tsx            # Screen 4: Full Create Reminder Modal
│   ├── settings.tsx                # Screen 5: Android Reliability & JSON/Markdown Backup
│   └── task/
│       └── [id].tsx                # Screen 6: In-Place Task Detail & Subtask Checklist
└── src/
    ├── components/
    │   ├── DateTimePickerRow.tsx   # Native Android Material 3 Date/Time picker dialogs
    │   ├── FilterChips.tsx         # Stadium-pill horizontal tag & priority filter bar
    │   ├── QuickAddBar.tsx         # NLP inline bar with live floating preview chips
    │   ├── TaskCard.tsx            # 28px Squircle card with Reanimated checkbox morphing
    │   └── WeekStrip.tsx           # 7-day calendar selector strip with task indicator dots
    ├── db/
    │   ├── client.ts               # Local database client initialization
    │   └── tasksRepo.ts            # Typed CRUD operations for tasks and subtasks
    ├── services/
    │   ├── backup.ts               # Local JSON database export/import & Markdown archive exporter
    │   ├── nlp.ts                  # Natural language parser for dates, tags, and priorities
    │   └── notifications.ts        # Android notification channels, exact alarms & snooze actions
    └── theme/
        └── useAppTheme.ts          # Material 3 Expressive dynamic tokens & dark/light palettes
```

---

## 🏁 Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (v18+ recommended)
* [Expo Go](https://expo.dev/go) app on your Android device

### Installation & Run

1. **Clone the repository:**
   ```bash
   git clone https://github.com/GodFakerr/Taskion.git
   cd Taskion
   ```

2. **Install dependencies:**
   ```bash
   npx expo install
   ```

3. **Start the development server:**
   ```bash
   npx expo start
   ```

4. **Open on your device:**
   * Scan the terminal QR code using **Expo Go** on your Android phone, or press `a` to run on an Android emulator.

---

## 📄 License

This project is open-source under the [MIT License](LICENSE).
