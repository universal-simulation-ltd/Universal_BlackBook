// "Fill in my current location for new notes and contacts" (James,
// 2026-10-25; Tune this app, off to start). Asks the device for its position
// once, turns it into City / County / Country by finding the NEAREST TOWN in
// the bundled lists (lib/geo.ts ▸ nearestTown, on the device), fills those
// boxes in, and forgets the position. Nothing is sent anywhere and no
// coordinates are stored.
//
// ⚠️ Static import of the plugin: a code-split Capacitor plugin import never
// settles in the web view (landmines, 2026-08-30).
import { useEffect, useRef } from 'react'
import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'
import { defaultCountry, loadGeo, nearestTown, townFills, type Location } from '../lib/geo'
import { useSettingsStore } from '../stores/settingsStore'

/** A new location starts in this device's country (its language setting's region). */
export function newLocation(): Location {
  const country = defaultCountry()
  return country ? { country } : {}
}

/** Ask for permission, as the setting is turned on. True when the device will tell us. */
export async function askForLocation(): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      const p = await Geolocation.requestPermissions({ permissions: ['coarseLocation'] })
      return p.coarseLocation === 'granted' || p.location === 'granted'
    }
    await position()
    return true
  } catch {
    return false
  }
}

/** One position, coarse and quick, from the phone or the browser. */
async function position(): Promise<{ lat: number; lng: number }> {
  if (Capacitor.isNativePlatform()) {
    const p = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 10_000, maximumAge: 10 * 60_000 })
    return { lat: p.coords.latitude, lng: p.coords.longitude }
  }
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('no geolocation'))
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      reject,
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 10 * 60_000 },
    )
  })
}

/** Where the device is, as a town, county and country — or null. */
export async function currentTown(): Promise<Pick<Location, 'city' | 'county' | 'country'> | null> {
  try {
    const [{ lat, lng }] = await Promise.all([position(), loadGeo()])
    const town = nearestTown(lat, lng)
    return town ? townFills(town) : null
  } catch {
    return null
  }
}

/**
 * On a new location (a note's Link to location, a contact's empty address):
 * with the setting on, fill its town, county and country from where the
 * device is, once. Does nothing with the setting off.
 */
export function useCurrentLocation(enabled: boolean, fill: (here: Location) => void): void {
  const on = useSettingsStore((s) => s.fillLocation)
  const cb = useRef(fill)
  cb.current = fill
  useEffect(() => {
    if (!enabled || !on) return
    let live = true
    void currentTown().then((here) => {
      if (live && here) cb.current(here)
    })
    return () => {
      live = false
    }
  }, [enabled, on])
}
