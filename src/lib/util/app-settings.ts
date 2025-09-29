import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { BaseDirectory } from "@tauri-apps/api/path";
import { platform } from '@tauri-apps/plugin-os';
import { settingsStore, platformNameStore, alternateFunctionKeyStore } from "../../store";
import type { AppSettings } from "../../types";


const SettingsFilename = "settings.json";

const defaultSettings: AppSettings = {
  zoom: 0,  // ranges -2 to 2
  theme: 'light'  // dark/light/auto not implemented yet
}

export async function loadSettings(): Promise<AppSettings> {
  try {
    let content = await readTextFile(SettingsFilename, { baseDir: BaseDirectory.AppData });
    if (content) {
      content = JSON.parse(content)
      for (let key in defaultSettings) {
        if (content.hasOwnProperty(key)) {
          defaultSettings[key] = content[key]
        }
      }
      console.log('loaded settings:', defaultSettings)
      settingsStore.set(defaultSettings)
      return defaultSettings // updated with content
    }
  } catch (err) {
    console.log('loadSettings', err)
  }
  return defaultSettings
}

export async function saveSettings(settings: AppSettings) {
  console.log('saving settings')
  settingsStore.set(settings)
  const asStr = JSON.stringify(settings)
  await writeTextFile(SettingsFilename, asStr, { baseDir: BaseDirectory.AppData })
}

export async function loadPlatformIntoStore() {
  try {
    const platformName = await platform()
    if (platformName && typeof platformName == 'string') {
      console.log('current platform is', platformName);
      platformNameStore.set(platformName)
      const alternateFunctionKey = platformName == "macos" ? "metaKey" : "ctrlKey";
      alternateFunctionKeyStore.set(alternateFunctionKey)
    }
  } catch (err) {
    console.error('error getting platform:', err)
  }
}