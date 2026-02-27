"use strict";
// Blood Pressure Monitor Adapter
// Requirements: 7.2
Object.defineProperty(exports, "__esModule", { value: true });
exports.BloodPressureAdapter = void 0;
class BloodPressureAdapter {
    /**
     * Convert raw blood pressure monitor data to standardized sensor readings
     */
    static convertToSensorReadings(data) {
        const readings = [];
        // Blood pressure reading (stored as systolic value, diastolic in metadata)
        readings.push({
            type: 'blood_pressure',
            value: data.systolic,
            unit: data.unit || 'mmHg',
            accuracy: 95, // Typical accuracy for home BP monitors
        });
        // Heart rate if available
        if (data.heartRate) {
            readings.push({
                type: 'heart_rate',
                value: data.heartRate,
                unit: 'bpm',
                accuracy: 95,
            });
        }
        return readings;
    }
    /**
     * Parse data from Omron blood pressure monitors
     */
    static parseOmronData(rawData) {
        // Example format: "SYS:120,DIA:80,HR:72,TIME:2024-01-15T10:30:00Z"
        const parts = rawData.split(',');
        const data = {};
        parts.forEach((part) => {
            const [key, value] = part.split(':');
            data[key] = value;
        });
        return {
            systolic: parseInt(data.SYS, 10),
            diastolic: parseInt(data.DIA, 10),
            heartRate: data.HR ? parseInt(data.HR, 10) : undefined,
            timestamp: new Date(data.TIME || Date.now()),
            unit: 'mmHg',
        };
    }
    /**
     * Parse data from Withings blood pressure monitors
     */
    static parseWithingsData(rawData) {
        return {
            systolic: rawData.systolic,
            diastolic: rawData.diastolic,
            heartRate: rawData.heart_rate,
            timestamp: new Date(rawData.timestamp * 1000), // Unix timestamp
            unit: 'mmHg',
        };
    }
    /**
     * Validate blood pressure reading
     */
    static validate(reading) {
        // Systolic should be between 60-250 mmHg
        if (reading.systolic < 60 || reading.systolic > 250) {
            return false;
        }
        // Diastolic should be between 30-150 mmHg
        if (reading.diastolic < 30 || reading.diastolic > 150) {
            return false;
        }
        // Systolic should be higher than diastolic
        if (reading.systolic <= reading.diastolic) {
            return false;
        }
        // Heart rate validation if present
        if (reading.heartRate && (reading.heartRate < 30 || reading.heartRate > 220)) {
            return false;
        }
        return true;
    }
}
exports.BloodPressureAdapter = BloodPressureAdapter;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmxvb2QtcHJlc3N1cmUtYWRhcHRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImJsb29kLXByZXNzdXJlLWFkYXB0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLGlDQUFpQztBQUNqQyxvQkFBb0I7OztBQVlwQixNQUFhLG9CQUFvQjtJQUMvQjs7T0FFRztJQUNILE1BQU0sQ0FBQyx1QkFBdUIsQ0FBQyxJQUEwQjtRQUN2RCxNQUFNLFFBQVEsR0FBb0IsRUFBRSxDQUFDO1FBRXJDLDJFQUEyRTtRQUMzRSxRQUFRLENBQUMsSUFBSSxDQUFDO1lBQ1osSUFBSSxFQUFFLGdCQUFnQjtZQUN0QixLQUFLLEVBQUUsSUFBSSxDQUFDLFFBQVE7WUFDcEIsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLElBQUksTUFBTTtZQUN6QixRQUFRLEVBQUUsRUFBRSxFQUFFLHdDQUF3QztTQUN2RCxDQUFDLENBQUM7UUFFSCwwQkFBMEI7UUFDMUIsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDbkIsUUFBUSxDQUFDLElBQUksQ0FBQztnQkFDWixJQUFJLEVBQUUsWUFBWTtnQkFDbEIsS0FBSyxFQUFFLElBQUksQ0FBQyxTQUFTO2dCQUNyQixJQUFJLEVBQUUsS0FBSztnQkFDWCxRQUFRLEVBQUUsRUFBRTthQUNiLENBQUMsQ0FBQztRQUNMLENBQUM7UUFFRCxPQUFPLFFBQVEsQ0FBQztJQUNsQixDQUFDO0lBRUQ7O09BRUc7SUFDSCxNQUFNLENBQUMsY0FBYyxDQUFDLE9BQWU7UUFDbkMsbUVBQW1FO1FBQ25FLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDakMsTUFBTSxJQUFJLEdBQTJCLEVBQUUsQ0FBQztRQUV4QyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7WUFDckIsTUFBTSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3JDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxLQUFLLENBQUM7UUFDcEIsQ0FBQyxDQUFDLENBQUM7UUFFSCxPQUFPO1lBQ0wsUUFBUSxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQztZQUNoQyxTQUFTLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDO1lBQ2pDLFNBQVMsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUztZQUN0RCxTQUFTLEVBQUUsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDNUMsSUFBSSxFQUFFLE1BQU07U0FDYixDQUFDO0lBQ0osQ0FBQztJQUVEOztPQUVHO0lBQ0gsTUFBTSxDQUFDLGlCQUFpQixDQUFDLE9BQWdDO1FBQ3ZELE9BQU87WUFDTCxRQUFRLEVBQUUsT0FBTyxDQUFDLFFBQWtCO1lBQ3BDLFNBQVMsRUFBRSxPQUFPLENBQUMsU0FBbUI7WUFDdEMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxVQUFnQztZQUNuRCxTQUFTLEVBQUUsSUFBSSxJQUFJLENBQUUsT0FBTyxDQUFDLFNBQW9CLEdBQUcsSUFBSSxDQUFDLEVBQUUsaUJBQWlCO1lBQzVFLElBQUksRUFBRSxNQUFNO1NBQ2IsQ0FBQztJQUNKLENBQUM7SUFFRDs7T0FFRztJQUNILE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBNkI7UUFDM0MseUNBQXlDO1FBQ3pDLElBQUksT0FBTyxDQUFDLFFBQVEsR0FBRyxFQUFFLElBQUksT0FBTyxDQUFDLFFBQVEsR0FBRyxHQUFHLEVBQUUsQ0FBQztZQUNwRCxPQUFPLEtBQUssQ0FBQztRQUNmLENBQUM7UUFFRCwwQ0FBMEM7UUFDMUMsSUFBSSxPQUFPLENBQUMsU0FBUyxHQUFHLEVBQUUsSUFBSSxPQUFPLENBQUMsU0FBUyxHQUFHLEdBQUcsRUFBRSxDQUFDO1lBQ3RELE9BQU8sS0FBSyxDQUFDO1FBQ2YsQ0FBQztRQUVELDJDQUEyQztRQUMzQyxJQUFJLE9BQU8sQ0FBQyxRQUFRLElBQUksT0FBTyxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQzFDLE9BQU8sS0FBSyxDQUFDO1FBQ2YsQ0FBQztRQUVELG1DQUFtQztRQUNuQyxJQUFJLE9BQU8sQ0FBQyxTQUFTLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxHQUFHLEVBQUUsSUFBSSxPQUFPLENBQUMsU0FBUyxHQUFHLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDN0UsT0FBTyxLQUFLLENBQUM7UUFDZixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0NBQ0Y7QUF6RkQsb0RBeUZDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQmxvb2QgUHJlc3N1cmUgTW9uaXRvciBBZGFwdGVyXG4vLyBSZXF1aXJlbWVudHM6IDcuMlxuXG5pbXBvcnQgeyBTZW5zb3JSZWFkaW5nIH0gZnJvbSAnLi4vLi4vc2hhcmVkL3R5cGVzJztcblxuZXhwb3J0IGludGVyZmFjZSBCbG9vZFByZXNzdXJlUmVhZGluZyB7XG4gIHN5c3RvbGljOiBudW1iZXI7XG4gIGRpYXN0b2xpYzogbnVtYmVyO1xuICBoZWFydFJhdGU/OiBudW1iZXI7XG4gIHRpbWVzdGFtcDogRGF0ZTtcbiAgdW5pdD86IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIEJsb29kUHJlc3N1cmVBZGFwdGVyIHtcbiAgLyoqXG4gICAqIENvbnZlcnQgcmF3IGJsb29kIHByZXNzdXJlIG1vbml0b3IgZGF0YSB0byBzdGFuZGFyZGl6ZWQgc2Vuc29yIHJlYWRpbmdzXG4gICAqL1xuICBzdGF0aWMgY29udmVydFRvU2Vuc29yUmVhZGluZ3MoZGF0YTogQmxvb2RQcmVzc3VyZVJlYWRpbmcpOiBTZW5zb3JSZWFkaW5nW10ge1xuICAgIGNvbnN0IHJlYWRpbmdzOiBTZW5zb3JSZWFkaW5nW10gPSBbXTtcblxuICAgIC8vIEJsb29kIHByZXNzdXJlIHJlYWRpbmcgKHN0b3JlZCBhcyBzeXN0b2xpYyB2YWx1ZSwgZGlhc3RvbGljIGluIG1ldGFkYXRhKVxuICAgIHJlYWRpbmdzLnB1c2goe1xuICAgICAgdHlwZTogJ2Jsb29kX3ByZXNzdXJlJyxcbiAgICAgIHZhbHVlOiBkYXRhLnN5c3RvbGljLFxuICAgICAgdW5pdDogZGF0YS51bml0IHx8ICdtbUhnJyxcbiAgICAgIGFjY3VyYWN5OiA5NSwgLy8gVHlwaWNhbCBhY2N1cmFjeSBmb3IgaG9tZSBCUCBtb25pdG9yc1xuICAgIH0pO1xuXG4gICAgLy8gSGVhcnQgcmF0ZSBpZiBhdmFpbGFibGVcbiAgICBpZiAoZGF0YS5oZWFydFJhdGUpIHtcbiAgICAgIHJlYWRpbmdzLnB1c2goe1xuICAgICAgICB0eXBlOiAnaGVhcnRfcmF0ZScsXG4gICAgICAgIHZhbHVlOiBkYXRhLmhlYXJ0UmF0ZSxcbiAgICAgICAgdW5pdDogJ2JwbScsXG4gICAgICAgIGFjY3VyYWN5OiA5NSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiByZWFkaW5ncztcbiAgfVxuXG4gIC8qKlxuICAgKiBQYXJzZSBkYXRhIGZyb20gT21yb24gYmxvb2QgcHJlc3N1cmUgbW9uaXRvcnNcbiAgICovXG4gIHN0YXRpYyBwYXJzZU9tcm9uRGF0YShyYXdEYXRhOiBzdHJpbmcpOiBCbG9vZFByZXNzdXJlUmVhZGluZyB7XG4gICAgLy8gRXhhbXBsZSBmb3JtYXQ6IFwiU1lTOjEyMCxESUE6ODAsSFI6NzIsVElNRToyMDI0LTAxLTE1VDEwOjMwOjAwWlwiXG4gICAgY29uc3QgcGFydHMgPSByYXdEYXRhLnNwbGl0KCcsJyk7XG4gICAgY29uc3QgZGF0YTogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuXG4gICAgcGFydHMuZm9yRWFjaCgocGFydCkgPT4ge1xuICAgICAgY29uc3QgW2tleSwgdmFsdWVdID0gcGFydC5zcGxpdCgnOicpO1xuICAgICAgZGF0YVtrZXldID0gdmFsdWU7XG4gICAgfSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgc3lzdG9saWM6IHBhcnNlSW50KGRhdGEuU1lTLCAxMCksXG4gICAgICBkaWFzdG9saWM6IHBhcnNlSW50KGRhdGEuRElBLCAxMCksXG4gICAgICBoZWFydFJhdGU6IGRhdGEuSFIgPyBwYXJzZUludChkYXRhLkhSLCAxMCkgOiB1bmRlZmluZWQsXG4gICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKGRhdGEuVElNRSB8fCBEYXRlLm5vdygpKSxcbiAgICAgIHVuaXQ6ICdtbUhnJyxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFBhcnNlIGRhdGEgZnJvbSBXaXRoaW5ncyBibG9vZCBwcmVzc3VyZSBtb25pdG9yc1xuICAgKi9cbiAgc3RhdGljIHBhcnNlV2l0aGluZ3NEYXRhKHJhd0RhdGE6IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogQmxvb2RQcmVzc3VyZVJlYWRpbmcge1xuICAgIHJldHVybiB7XG4gICAgICBzeXN0b2xpYzogcmF3RGF0YS5zeXN0b2xpYyBhcyBudW1iZXIsXG4gICAgICBkaWFzdG9saWM6IHJhd0RhdGEuZGlhc3RvbGljIGFzIG51bWJlcixcbiAgICAgIGhlYXJ0UmF0ZTogcmF3RGF0YS5oZWFydF9yYXRlIGFzIG51bWJlciB8IHVuZGVmaW5lZCxcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKHJhd0RhdGEudGltZXN0YW1wIGFzIG51bWJlcikgKiAxMDAwKSwgLy8gVW5peCB0aW1lc3RhbXBcbiAgICAgIHVuaXQ6ICdtbUhnJyxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFZhbGlkYXRlIGJsb29kIHByZXNzdXJlIHJlYWRpbmdcbiAgICovXG4gIHN0YXRpYyB2YWxpZGF0ZShyZWFkaW5nOiBCbG9vZFByZXNzdXJlUmVhZGluZyk6IGJvb2xlYW4ge1xuICAgIC8vIFN5c3RvbGljIHNob3VsZCBiZSBiZXR3ZWVuIDYwLTI1MCBtbUhnXG4gICAgaWYgKHJlYWRpbmcuc3lzdG9saWMgPCA2MCB8fCByZWFkaW5nLnN5c3RvbGljID4gMjUwKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gRGlhc3RvbGljIHNob3VsZCBiZSBiZXR3ZWVuIDMwLTE1MCBtbUhnXG4gICAgaWYgKHJlYWRpbmcuZGlhc3RvbGljIDwgMzAgfHwgcmVhZGluZy5kaWFzdG9saWMgPiAxNTApIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBTeXN0b2xpYyBzaG91bGQgYmUgaGlnaGVyIHRoYW4gZGlhc3RvbGljXG4gICAgaWYgKHJlYWRpbmcuc3lzdG9saWMgPD0gcmVhZGluZy5kaWFzdG9saWMpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBIZWFydCByYXRlIHZhbGlkYXRpb24gaWYgcHJlc2VudFxuICAgIGlmIChyZWFkaW5nLmhlYXJ0UmF0ZSAmJiAocmVhZGluZy5oZWFydFJhdGUgPCAzMCB8fCByZWFkaW5nLmhlYXJ0UmF0ZSA+IDIyMCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxufVxuIl19