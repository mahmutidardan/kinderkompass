import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY_PREFIX = '@fieberwache/device-key/';
const ENCRYPTED_PREFIX = 'enc:v1:';

export type StorageProtection = 'encrypted-device' | 'browser-local';

export const storageProtection: StorageProtection = Platform.OS === 'web' ? 'browser-local' : 'encrypted-device';

async function getDeviceKey(scope: string) {
  const keyName = `${KEY_PREFIX}${scope}`;
  const existing = await SecureStore.getItemAsync(keyName);
  if (existing) return existing;
  const generated = CryptoJS.lib.WordArray.random(32).toString();
  await SecureStore.setItemAsync(keyName, generated, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  return generated;
}
export async function readProtectedState(key: string, scope: string) {
  const stored = await AsyncStorage.getItem(key);
  if (!stored || Platform.OS === 'web' || !stored.startsWith(ENCRYPTED_PREFIX)) return stored;
  const deviceKey = await getDeviceKey(scope);
  const decrypted = CryptoJS.AES.decrypt(stored.slice(ENCRYPTED_PREFIX.length), deviceKey).toString(CryptoJS.enc.Utf8);
  if (!decrypted) throw new Error('Gespeicherte Gerätedaten konnten nicht entschlüsselt werden.');
  return decrypted;
}

export async function writeProtectedState(key: string, scope: string, value: string) {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value);
    return;
  }
  const deviceKey = await getDeviceKey(scope);
  const encrypted = CryptoJS.AES.encrypt(value, deviceKey).toString();
  await AsyncStorage.setItem(key, `${ENCRYPTED_PREFIX}${encrypted}`);
}
