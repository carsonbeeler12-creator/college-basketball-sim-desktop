/**
 * Single source for UI version labels — must match `package.json` "version".
 * (Electron-builder also reads package.json for installers.)
 */
import pkg from '../package.json'

export const APP_VERSION = pkg.version

/** Banner-friendly label, e.g. "0.9.9" from "0.9.9-beta" */
export function appVersionDisplay(): string {
  return APP_VERSION.replace(/-(beta|alpha)(\.[0-9]+)?$/i, '')
}
