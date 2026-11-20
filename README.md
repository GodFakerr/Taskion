<p align="center">
  <img src="assets/icon.png" width="128" height="128" alt="Taskion Logo" style="border-radius: 28px;" />
</p>

<h1 align="center">Taskion</h1>

<p align="center">
  <b>A minimalist, offline-first personal Android reminders & task manager engineered with Material 3 Expressive design.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Expo-SDK%2058-000020?style=for-the-badge&logo=expo&logoColor=white" alt="Expo SDK 58" />
  <img src="https://img.shields.io/badge/React%20Native-0.76-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React Native" />
  <img src="https://img.shields.io/badge/TypeScript-5.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/SQLite-Offline--First-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/Android-Material%203-3DDC84?style=for-the-badge&logo=android&logoColor=white" alt="Material 3" />
  <img src="https://img.shields.io/badge/License-MIT-purple?style=for-the-badge" alt="MIT License" />
</p>

---

## ✨ Overview

**Taskion** is a distraction-free, zero-clutter task manager and reminder app built for speed, simplicity, and complete privacy. Designed following Android's **Material 3 Expressive** design guidelines, Taskion strips away unnecessary social feeds, habit streaks, progress rings, and account logins in favor of a fast, local-first workflow that respects your attention.

Everything lives locally on your device in a high-performance SQLite database, with native Android exact alarms and natural language scheduling built straight into the bottom thumb dock.

---

## 🚀 Key Features

### ⚡ Natural Language Quick-Add
Type reminders as naturally as you think them. The inline parser automatically extracts dates, times, tags, and priority levels in real-time:
* `"Pay electricity bill tomorrow 6pm #Finance !high"`
* `"Gym workout every Monday 7am #Fitness"`
* `"Team standup at 10:30am !p2"`
* Live floating preview chips indicate what the parser detected before you even hit send.

### 🎨 Material 3 Expressive Design System
* **Dynamic Palette**: Integrates with Android 12–16 Material You dynamic wallpaper colors, with a warm deep-plum/lavender dark fallback palette (`#141218`).
* **Expressive Geometry**: Squircle 28px rounded cards, oversized editorial headers (`40px`, `-0.5` tracking), and a tall 76px bottom navigation bar with stadium pill indicators.
* **Spring Physics**: Fluid UI-thread spring animations (`react-native-reanimated`) for card press feedback, checkbox morphing, and keyboard transitions.
* **Hardware-Synced Keyboard Dock**: Quick-add bar rides seamlessly 12px above the Android soft keyboard at 60/120 FPS, automatically hiding the bottom tab bar while typing.

### 🔒 100% Offline & Private
* Zero cloud dependencies, zero external servers, and zero accounts.
* Built on modern asynchronous **`expo-sqlite`** with foreign key cascades.
* Complete data portability: One-tap full JSON backup/restore and human-readable Markdown task archive exports via the Android system share sheet.

### ⏰ Exact Alarms & Persistent Alerts
* Native Android exact alarm scheduling with `SCHEDULE_EXACT_ALARM` permissions.
* Notification action buttons: Mark **✓ Done** or **⏰ Snooze (+15m)** directly from the Android status bar without opening the app.
* Optional **Sticky Lock-Screen Alerts** (`is_sticky`) for high-consequence reminders.
* Settings diagnostics with direct Android shortcuts to disable battery optimization restrictions.

---

## 📱 Screen Breakdown

| Screen | Description |
| :--- | :--- |
| **Today Dashboard** | Editorial greeting, search filter, conditional overdue card with one-tap *"Move to Today"* reschedule, stadium filter chips, and floating bottom NLP dock. |
| **Scheduled Timeline** | 7-day horizontal selector strip with task count indicator dots, preset chips (*Tomorrow*, *This Weekend*, *Next Week*), and chronological section groupings. |
| **Completed Archive** | Historical record of completed tasks with instant restore, permanent purge, and Markdown/JSON export tools. |
| **Create / Edit Task** | Full reminder modal featuring native Android Date & Time picker dialogs, priority selector, custom tags, recurrence intervals, sticky notification switches, and subtask checklists. |
| **Task Detail & Notes** | In-place editor for notes, clickable URLs, subtask management, and reminder adjustments. |
| **Settings & Reliability** | Android notification permission auditor, alarm manager resync diagnostics, battery optimization bypass shortcuts, and vault backup/restore. |

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
* [Expo Go](https://expo.dev/go) app on your Android phone, or Android Studio for emulators.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/GodFakerr/Taskion.git
   cd Taskion
   ```

2. **Install SDK-compatible dependencies:**
   ```bash
   npx expo install
   ```

3. **Start the development server:**
   ```bash
   npx expo start
   ```

4. **Run on Android:**
   * Scan the QR code using the **Expo Go** app on your Android device, or press `a` in the terminal to launch the Android emulator.

---

## 📦 Building a Standalone APK

To generate a production-ready standalone Android APK using EAS:

```bash
# 1. Install EAS CLI
npm install -g eas-cli

# 2. Log in to your Expo account
eas login

# 3. Configure EAS Build
eas build:configure

# 4. Build Android APK
eas build --platform android --profile preview
```

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
