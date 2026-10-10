export interface GPSPosition {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

export class GPSService {
  /**
   * Priority of Location Resolution:
   * 1. Current GPS (User allowed browser Geolocation)
   * 2. User selected location (City / Manual Coordinates)
   * 3. Saved location (localStorage)
   * 4. Current city
   * 5. Country
   * 6. Global fallback
   */
  public static async getCurrentPosition(options?: PositionOptions): Promise<GPSPosition | null> {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      return null;
    }

    return new Promise(resolve => {
      navigator.geolocation.getCurrentPosition(
        pos => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp
          });
        },
        () => {
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 60000,
          ...options
        }
      );
    });
  }
}
