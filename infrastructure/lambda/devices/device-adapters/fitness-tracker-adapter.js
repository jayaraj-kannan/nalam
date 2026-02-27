"use strict";
// Fitness Tracker Adapter
// Requirements: 7.2
Object.defineProperty(exports, "__esModule", { value: true });
exports.FitnessTrackerAdapter = void 0;
class FitnessTrackerAdapter {
    /**
     * Convert raw fitness tracker data to standardized sensor readings
     */
    static convertToSensorReadings(data) {
        const readings = [];
        // Heart rate reading
        if (data.heartRate) {
            readings.push({
                type: 'heart_rate',
                value: data.heartRate,
                unit: 'bpm',
                accuracy: 90, // Fitness trackers typically less accurate than medical devices
            });
        }
        // Activity tracking readings (stored as custom sensor types)
        if (data.steps) {
            readings.push({
                type: 'accelerometer', // Using accelerometer as proxy for activity
                value: data.steps,
                unit: 'steps',
                accuracy: 95,
            });
        }
        return readings;
    }
    /**
     * Parse data from Fitbit devices
     */
    static parseFitbitData(rawData) {
        return {
            heartRate: rawData.heart_rate,
            steps: rawData.steps,
            distance: rawData.distance,
            calories: rawData.calories,
            activeMinutes: rawData.active_minutes,
            sleepDuration: rawData.sleep_duration,
            timestamp: new Date(rawData.timestamp),
        };
    }
    /**
     * Parse data from Apple Watch
     */
    static parseAppleWatchData(rawData) {
        return {
            heartRate: rawData.heartRate,
            steps: rawData.stepCount,
            distance: rawData.distanceWalkingRunning,
            calories: rawData.activeEnergyBurned,
            activeMinutes: rawData.appleExerciseTime,
            timestamp: new Date(rawData.timestamp),
        };
    }
    /**
     * Parse data from Garmin devices
     */
    static parseGarminData(rawData) {
        return {
            heartRate: rawData.heartRate,
            steps: rawData.steps,
            distance: rawData.distance,
            calories: rawData.calories,
            activeMinutes: rawData.moderateIntensityMinutes,
            timestamp: new Date(rawData.timestamp * 1000),
        };
    }
    /**
     * Validate fitness tracker reading
     */
    static validate(reading) {
        // Heart rate validation if present
        if (reading.heartRate && (reading.heartRate < 30 || reading.heartRate > 220)) {
            return false;
        }
        // Steps validation if present (max 100,000 steps per day)
        if (reading.steps && (reading.steps < 0 || reading.steps > 100000)) {
            return false;
        }
        // Distance validation if present (max 100km)
        if (reading.distance && (reading.distance < 0 || reading.distance > 100000)) {
            return false;
        }
        // Calories validation if present (max 10,000 calories)
        if (reading.calories && (reading.calories < 0 || reading.calories > 10000)) {
            return false;
        }
        // Active minutes validation if present (max 1440 minutes in a day)
        if (reading.activeMinutes && (reading.activeMinutes < 0 || reading.activeMinutes > 1440)) {
            return false;
        }
        // Sleep duration validation if present (max 24 hours)
        if (reading.sleepDuration && (reading.sleepDuration < 0 || reading.sleepDuration > 1440)) {
            return false;
        }
        return true;
    }
}
exports.FitnessTrackerAdapter = FitnessTrackerAdapter;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZml0bmVzcy10cmFja2VyLWFkYXB0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJmaXRuZXNzLXRyYWNrZXItYWRhcHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsMEJBQTBCO0FBQzFCLG9CQUFvQjs7O0FBY3BCLE1BQWEscUJBQXFCO0lBQ2hDOztPQUVHO0lBQ0gsTUFBTSxDQUFDLHVCQUF1QixDQUFDLElBQTJCO1FBQ3hELE1BQU0sUUFBUSxHQUFvQixFQUFFLENBQUM7UUFFckMscUJBQXFCO1FBQ3JCLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ25CLFFBQVEsQ0FBQyxJQUFJLENBQUM7Z0JBQ1osSUFBSSxFQUFFLFlBQVk7Z0JBQ2xCLEtBQUssRUFBRSxJQUFJLENBQUMsU0FBUztnQkFDckIsSUFBSSxFQUFFLEtBQUs7Z0JBQ1gsUUFBUSxFQUFFLEVBQUUsRUFBRSxnRUFBZ0U7YUFDL0UsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUVELDZEQUE2RDtRQUM3RCxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNmLFFBQVEsQ0FBQyxJQUFJLENBQUM7Z0JBQ1osSUFBSSxFQUFFLGVBQWUsRUFBRSw0Q0FBNEM7Z0JBQ25FLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSztnQkFDakIsSUFBSSxFQUFFLE9BQU87Z0JBQ2IsUUFBUSxFQUFFLEVBQUU7YUFDYixDQUFDLENBQUM7UUFDTCxDQUFDO1FBRUQsT0FBTyxRQUFRLENBQUM7SUFDbEIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsTUFBTSxDQUFDLGVBQWUsQ0FBQyxPQUFnQztRQUNyRCxPQUFPO1lBQ0wsU0FBUyxFQUFFLE9BQU8sQ0FBQyxVQUFnQztZQUNuRCxLQUFLLEVBQUUsT0FBTyxDQUFDLEtBQTJCO1lBQzFDLFFBQVEsRUFBRSxPQUFPLENBQUMsUUFBOEI7WUFDaEQsUUFBUSxFQUFFLE9BQU8sQ0FBQyxRQUE4QjtZQUNoRCxhQUFhLEVBQUUsT0FBTyxDQUFDLGNBQW9DO1lBQzNELGFBQWEsRUFBRSxPQUFPLENBQUMsY0FBb0M7WUFDM0QsU0FBUyxFQUFFLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFtQixDQUFDO1NBQ2pELENBQUM7SUFDSixDQUFDO0lBRUQ7O09BRUc7SUFDSCxNQUFNLENBQUMsbUJBQW1CLENBQUMsT0FBZ0M7UUFDekQsT0FBTztZQUNMLFNBQVMsRUFBRSxPQUFPLENBQUMsU0FBK0I7WUFDbEQsS0FBSyxFQUFFLE9BQU8sQ0FBQyxTQUErQjtZQUM5QyxRQUFRLEVBQUUsT0FBTyxDQUFDLHNCQUE0QztZQUM5RCxRQUFRLEVBQUUsT0FBTyxDQUFDLGtCQUF3QztZQUMxRCxhQUFhLEVBQUUsT0FBTyxDQUFDLGlCQUF1QztZQUM5RCxTQUFTLEVBQUUsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQW1CLENBQUM7U0FDakQsQ0FBQztJQUNKLENBQUM7SUFFRDs7T0FFRztJQUNILE1BQU0sQ0FBQyxlQUFlLENBQUMsT0FBZ0M7UUFDckQsT0FBTztZQUNMLFNBQVMsRUFBRSxPQUFPLENBQUMsU0FBK0I7WUFDbEQsS0FBSyxFQUFFLE9BQU8sQ0FBQyxLQUEyQjtZQUMxQyxRQUFRLEVBQUUsT0FBTyxDQUFDLFFBQThCO1lBQ2hELFFBQVEsRUFBRSxPQUFPLENBQUMsUUFBOEI7WUFDaEQsYUFBYSxFQUFFLE9BQU8sQ0FBQyx3QkFBOEM7WUFDckUsU0FBUyxFQUFFLElBQUksSUFBSSxDQUFFLE9BQU8sQ0FBQyxTQUFvQixHQUFHLElBQUksQ0FBQztTQUMxRCxDQUFDO0lBQ0osQ0FBQztJQUVEOztPQUVHO0lBQ0gsTUFBTSxDQUFDLFFBQVEsQ0FBQyxPQUE4QjtRQUM1QyxtQ0FBbUM7UUFDbkMsSUFBSSxPQUFPLENBQUMsU0FBUyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsR0FBRyxFQUFFLElBQUksT0FBTyxDQUFDLFNBQVMsR0FBRyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzdFLE9BQU8sS0FBSyxDQUFDO1FBQ2YsQ0FBQztRQUVELDBEQUEwRDtRQUMxRCxJQUFJLE9BQU8sQ0FBQyxLQUFLLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxHQUFHLENBQUMsSUFBSSxPQUFPLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDbkUsT0FBTyxLQUFLLENBQUM7UUFDZixDQUFDO1FBRUQsNkNBQTZDO1FBQzdDLElBQUksT0FBTyxDQUFDLFFBQVEsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEdBQUcsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUM1RSxPQUFPLEtBQUssQ0FBQztRQUNmLENBQUM7UUFFRCx1REFBdUQ7UUFDdkQsSUFBSSxPQUFPLENBQUMsUUFBUSxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsR0FBRyxDQUFDLElBQUksT0FBTyxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzNFLE9BQU8sS0FBSyxDQUFDO1FBQ2YsQ0FBQztRQUVELG1FQUFtRTtRQUNuRSxJQUFJLE9BQU8sQ0FBQyxhQUFhLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxHQUFHLENBQUMsSUFBSSxPQUFPLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDekYsT0FBTyxLQUFLLENBQUM7UUFDZixDQUFDO1FBRUQsc0RBQXNEO1FBQ3RELElBQUksT0FBTyxDQUFDLGFBQWEsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLEdBQUcsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUN6RixPQUFPLEtBQUssQ0FBQztRQUNmLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7Q0FDRjtBQTdHRCxzREE2R0MiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBGaXRuZXNzIFRyYWNrZXIgQWRhcHRlclxuLy8gUmVxdWlyZW1lbnRzOiA3LjJcblxuaW1wb3J0IHsgU2Vuc29yUmVhZGluZyB9IGZyb20gJy4uLy4uL3NoYXJlZC90eXBlcyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgRml0bmVzc1RyYWNrZXJSZWFkaW5nIHtcbiAgaGVhcnRSYXRlPzogbnVtYmVyO1xuICBzdGVwcz86IG51bWJlcjtcbiAgZGlzdGFuY2U/OiBudW1iZXI7IC8vIG1ldGVyc1xuICBjYWxvcmllcz86IG51bWJlcjtcbiAgYWN0aXZlTWludXRlcz86IG51bWJlcjtcbiAgc2xlZXBEdXJhdGlvbj86IG51bWJlcjsgLy8gbWludXRlc1xuICB0aW1lc3RhbXA6IERhdGU7XG59XG5cbmV4cG9ydCBjbGFzcyBGaXRuZXNzVHJhY2tlckFkYXB0ZXIge1xuICAvKipcbiAgICogQ29udmVydCByYXcgZml0bmVzcyB0cmFja2VyIGRhdGEgdG8gc3RhbmRhcmRpemVkIHNlbnNvciByZWFkaW5nc1xuICAgKi9cbiAgc3RhdGljIGNvbnZlcnRUb1NlbnNvclJlYWRpbmdzKGRhdGE6IEZpdG5lc3NUcmFja2VyUmVhZGluZyk6IFNlbnNvclJlYWRpbmdbXSB7XG4gICAgY29uc3QgcmVhZGluZ3M6IFNlbnNvclJlYWRpbmdbXSA9IFtdO1xuXG4gICAgLy8gSGVhcnQgcmF0ZSByZWFkaW5nXG4gICAgaWYgKGRhdGEuaGVhcnRSYXRlKSB7XG4gICAgICByZWFkaW5ncy5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2hlYXJ0X3JhdGUnLFxuICAgICAgICB2YWx1ZTogZGF0YS5oZWFydFJhdGUsXG4gICAgICAgIHVuaXQ6ICdicG0nLFxuICAgICAgICBhY2N1cmFjeTogOTAsIC8vIEZpdG5lc3MgdHJhY2tlcnMgdHlwaWNhbGx5IGxlc3MgYWNjdXJhdGUgdGhhbiBtZWRpY2FsIGRldmljZXNcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEFjdGl2aXR5IHRyYWNraW5nIHJlYWRpbmdzIChzdG9yZWQgYXMgY3VzdG9tIHNlbnNvciB0eXBlcylcbiAgICBpZiAoZGF0YS5zdGVwcykge1xuICAgICAgcmVhZGluZ3MucHVzaCh7XG4gICAgICAgIHR5cGU6ICdhY2NlbGVyb21ldGVyJywgLy8gVXNpbmcgYWNjZWxlcm9tZXRlciBhcyBwcm94eSBmb3IgYWN0aXZpdHlcbiAgICAgICAgdmFsdWU6IGRhdGEuc3RlcHMsXG4gICAgICAgIHVuaXQ6ICdzdGVwcycsXG4gICAgICAgIGFjY3VyYWN5OiA5NSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiByZWFkaW5ncztcbiAgfVxuXG4gIC8qKlxuICAgKiBQYXJzZSBkYXRhIGZyb20gRml0Yml0IGRldmljZXNcbiAgICovXG4gIHN0YXRpYyBwYXJzZUZpdGJpdERhdGEocmF3RGF0YTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiBGaXRuZXNzVHJhY2tlclJlYWRpbmcge1xuICAgIHJldHVybiB7XG4gICAgICBoZWFydFJhdGU6IHJhd0RhdGEuaGVhcnRfcmF0ZSBhcyBudW1iZXIgfCB1bmRlZmluZWQsXG4gICAgICBzdGVwczogcmF3RGF0YS5zdGVwcyBhcyBudW1iZXIgfCB1bmRlZmluZWQsXG4gICAgICBkaXN0YW5jZTogcmF3RGF0YS5kaXN0YW5jZSBhcyBudW1iZXIgfCB1bmRlZmluZWQsXG4gICAgICBjYWxvcmllczogcmF3RGF0YS5jYWxvcmllcyBhcyBudW1iZXIgfCB1bmRlZmluZWQsXG4gICAgICBhY3RpdmVNaW51dGVzOiByYXdEYXRhLmFjdGl2ZV9taW51dGVzIGFzIG51bWJlciB8IHVuZGVmaW5lZCxcbiAgICAgIHNsZWVwRHVyYXRpb246IHJhd0RhdGEuc2xlZXBfZHVyYXRpb24gYXMgbnVtYmVyIHwgdW5kZWZpbmVkLFxuICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZShyYXdEYXRhLnRpbWVzdGFtcCBhcyBzdHJpbmcpLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogUGFyc2UgZGF0YSBmcm9tIEFwcGxlIFdhdGNoXG4gICAqL1xuICBzdGF0aWMgcGFyc2VBcHBsZVdhdGNoRGF0YShyYXdEYXRhOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IEZpdG5lc3NUcmFja2VyUmVhZGluZyB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGhlYXJ0UmF0ZTogcmF3RGF0YS5oZWFydFJhdGUgYXMgbnVtYmVyIHwgdW5kZWZpbmVkLFxuICAgICAgc3RlcHM6IHJhd0RhdGEuc3RlcENvdW50IGFzIG51bWJlciB8IHVuZGVmaW5lZCxcbiAgICAgIGRpc3RhbmNlOiByYXdEYXRhLmRpc3RhbmNlV2Fsa2luZ1J1bm5pbmcgYXMgbnVtYmVyIHwgdW5kZWZpbmVkLFxuICAgICAgY2Fsb3JpZXM6IHJhd0RhdGEuYWN0aXZlRW5lcmd5QnVybmVkIGFzIG51bWJlciB8IHVuZGVmaW5lZCxcbiAgICAgIGFjdGl2ZU1pbnV0ZXM6IHJhd0RhdGEuYXBwbGVFeGVyY2lzZVRpbWUgYXMgbnVtYmVyIHwgdW5kZWZpbmVkLFxuICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZShyYXdEYXRhLnRpbWVzdGFtcCBhcyBzdHJpbmcpLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogUGFyc2UgZGF0YSBmcm9tIEdhcm1pbiBkZXZpY2VzXG4gICAqL1xuICBzdGF0aWMgcGFyc2VHYXJtaW5EYXRhKHJhd0RhdGE6IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogRml0bmVzc1RyYWNrZXJSZWFkaW5nIHtcbiAgICByZXR1cm4ge1xuICAgICAgaGVhcnRSYXRlOiByYXdEYXRhLmhlYXJ0UmF0ZSBhcyBudW1iZXIgfCB1bmRlZmluZWQsXG4gICAgICBzdGVwczogcmF3RGF0YS5zdGVwcyBhcyBudW1iZXIgfCB1bmRlZmluZWQsXG4gICAgICBkaXN0YW5jZTogcmF3RGF0YS5kaXN0YW5jZSBhcyBudW1iZXIgfCB1bmRlZmluZWQsXG4gICAgICBjYWxvcmllczogcmF3RGF0YS5jYWxvcmllcyBhcyBudW1iZXIgfCB1bmRlZmluZWQsXG4gICAgICBhY3RpdmVNaW51dGVzOiByYXdEYXRhLm1vZGVyYXRlSW50ZW5zaXR5TWludXRlcyBhcyBudW1iZXIgfCB1bmRlZmluZWQsXG4gICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKChyYXdEYXRhLnRpbWVzdGFtcCBhcyBudW1iZXIpICogMTAwMCksXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBWYWxpZGF0ZSBmaXRuZXNzIHRyYWNrZXIgcmVhZGluZ1xuICAgKi9cbiAgc3RhdGljIHZhbGlkYXRlKHJlYWRpbmc6IEZpdG5lc3NUcmFja2VyUmVhZGluZyk6IGJvb2xlYW4ge1xuICAgIC8vIEhlYXJ0IHJhdGUgdmFsaWRhdGlvbiBpZiBwcmVzZW50XG4gICAgaWYgKHJlYWRpbmcuaGVhcnRSYXRlICYmIChyZWFkaW5nLmhlYXJ0UmF0ZSA8IDMwIHx8IHJlYWRpbmcuaGVhcnRSYXRlID4gMjIwKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIFN0ZXBzIHZhbGlkYXRpb24gaWYgcHJlc2VudCAobWF4IDEwMCwwMDAgc3RlcHMgcGVyIGRheSlcbiAgICBpZiAocmVhZGluZy5zdGVwcyAmJiAocmVhZGluZy5zdGVwcyA8IDAgfHwgcmVhZGluZy5zdGVwcyA+IDEwMDAwMCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBEaXN0YW5jZSB2YWxpZGF0aW9uIGlmIHByZXNlbnQgKG1heCAxMDBrbSlcbiAgICBpZiAocmVhZGluZy5kaXN0YW5jZSAmJiAocmVhZGluZy5kaXN0YW5jZSA8IDAgfHwgcmVhZGluZy5kaXN0YW5jZSA+IDEwMDAwMCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBDYWxvcmllcyB2YWxpZGF0aW9uIGlmIHByZXNlbnQgKG1heCAxMCwwMDAgY2Fsb3JpZXMpXG4gICAgaWYgKHJlYWRpbmcuY2Fsb3JpZXMgJiYgKHJlYWRpbmcuY2Fsb3JpZXMgPCAwIHx8IHJlYWRpbmcuY2Fsb3JpZXMgPiAxMDAwMCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBBY3RpdmUgbWludXRlcyB2YWxpZGF0aW9uIGlmIHByZXNlbnQgKG1heCAxNDQwIG1pbnV0ZXMgaW4gYSBkYXkpXG4gICAgaWYgKHJlYWRpbmcuYWN0aXZlTWludXRlcyAmJiAocmVhZGluZy5hY3RpdmVNaW51dGVzIDwgMCB8fCByZWFkaW5nLmFjdGl2ZU1pbnV0ZXMgPiAxNDQwKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIFNsZWVwIGR1cmF0aW9uIHZhbGlkYXRpb24gaWYgcHJlc2VudCAobWF4IDI0IGhvdXJzKVxuICAgIGlmIChyZWFkaW5nLnNsZWVwRHVyYXRpb24gJiYgKHJlYWRpbmcuc2xlZXBEdXJhdGlvbiA8IDAgfHwgcmVhZGluZy5zbGVlcER1cmF0aW9uID4gMTQ0MCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxufVxuIl19