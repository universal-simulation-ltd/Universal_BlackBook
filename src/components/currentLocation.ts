import { defaultCountry, type Location } from '../lib/geo'

/** A new location starts in this device's country (its language setting's region). */
export function newLocation(): Location {
  const country = defaultCountry()
  return country ? { country } : {}
}

/**
 * Fill a new location in from where the device is (Tune this app ▸ "Fill in
 * my current location"). Not on yet: does nothing.
 */
export function useCurrentLocation(_enabled: boolean, _fill: (here: Location) => void): void {
  void _enabled
  void _fill
}
