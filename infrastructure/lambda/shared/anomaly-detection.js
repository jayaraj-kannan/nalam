"use strict";
// Anomaly Detection for Vital Signs
// Requirements: 1.3 - Detect out-of-range vitals and trigger alerts
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectAnomalies = detectAnomalies;
exports.shouldTriggerAlert = shouldTriggerAlert;
exports.getHighestSeverity = getHighestSeverity;
/**
 * Default normal ranges for vital signs
 */
const DEFAULT_NORMAL_RANGES = {
    heartRate: { min: 60, max: 100 },
    systolicBP: { min: 90, max: 140 },
    diastolicBP: { min: 60, max: 90 },
    temperature: { min: 97.0, max: 99.5 },
    oxygenSaturation: { min: 95, max: 100 },
    weight: { min: 100, max: 300 }, // This should be personalized
};
/**
 * Determine severity based on how far outside normal range
 */
function determineSeverity(value, min, max) {
    const range = max - min;
    const deviation = Math.max(min - value, value - max, 0);
    const percentDeviation = (deviation / range) * 100;
    if (percentDeviation > 50) {
        return 'critical';
    }
    else if (percentDeviation > 25) {
        return 'high';
    }
    else if (percentDeviation > 10) {
        return 'medium';
    }
    else {
        return 'low';
    }
}
/**
 * Generate description for anomaly
 */
function generateAnomalyDescription(metric, value, min, max, severity) {
    const metricName = metric.replace(/([A-Z])/g, ' $1').toLowerCase().trim();
    if (value < min) {
        return `${metricName} is below normal range (${value} < ${min}). Severity: ${severity}.`;
    }
    else if (value > max) {
        return `${metricName} is above normal range (${value} > ${max}). Severity: ${severity}.`;
    }
    return `${metricName} is within normal range.`;
}
/**
 * Detect anomalies in vital signs
 * Compares readings against baseline vitals and normal ranges
 */
function detectAnomalies(vitals, baselineVitals) {
    const anomalies = [];
    // Use baseline vitals if provided, otherwise use default ranges
    const ranges = baselineVitals || {
        heartRate: DEFAULT_NORMAL_RANGES.heartRate,
        bloodPressure: {
            systolic: DEFAULT_NORMAL_RANGES.systolicBP,
            diastolic: DEFAULT_NORMAL_RANGES.diastolicBP,
        },
        temperature: DEFAULT_NORMAL_RANGES.temperature,
        oxygenSaturation: DEFAULT_NORMAL_RANGES.oxygenSaturation,
        weight: DEFAULT_NORMAL_RANGES.weight,
    };
    // Check heart rate
    if (vitals.heartRate !== undefined) {
        const { min, max } = ranges.heartRate;
        if (vitals.heartRate < min || vitals.heartRate > max) {
            const severity = determineSeverity(vitals.heartRate, min, max);
            anomalies.push({
                metric: 'heart_rate',
                value: vitals.heartRate,
                expectedRange: { min, max },
                severity,
                timestamp: vitals.timestamp,
                description: generateAnomalyDescription('heartRate', vitals.heartRate, min, max, severity),
            });
        }
    }
    // Check blood pressure
    if (vitals.bloodPressure) {
        const { systolic, diastolic } = vitals.bloodPressure;
        const systolicRange = ranges.bloodPressure.systolic;
        const diastolicRange = ranges.bloodPressure.diastolic;
        if (systolic < systolicRange.min || systolic > systolicRange.max) {
            const severity = determineSeverity(systolic, systolicRange.min, systolicRange.max);
            anomalies.push({
                metric: 'systolic_blood_pressure',
                value: systolic,
                expectedRange: systolicRange,
                severity,
                timestamp: vitals.timestamp,
                description: generateAnomalyDescription('systolicBP', systolic, systolicRange.min, systolicRange.max, severity),
            });
        }
        if (diastolic < diastolicRange.min || diastolic > diastolicRange.max) {
            const severity = determineSeverity(diastolic, diastolicRange.min, diastolicRange.max);
            anomalies.push({
                metric: 'diastolic_blood_pressure',
                value: diastolic,
                expectedRange: diastolicRange,
                severity,
                timestamp: vitals.timestamp,
                description: generateAnomalyDescription('diastolicBP', diastolic, diastolicRange.min, diastolicRange.max, severity),
            });
        }
    }
    // Check temperature
    if (vitals.temperature !== undefined) {
        const { min, max } = ranges.temperature;
        if (vitals.temperature < min || vitals.temperature > max) {
            const severity = determineSeverity(vitals.temperature, min, max);
            anomalies.push({
                metric: 'temperature',
                value: vitals.temperature,
                expectedRange: { min, max },
                severity,
                timestamp: vitals.timestamp,
                description: generateAnomalyDescription('temperature', vitals.temperature, min, max, severity),
            });
        }
    }
    // Check oxygen saturation
    if (vitals.oxygenSaturation !== undefined) {
        const { min, max } = ranges.oxygenSaturation;
        if (vitals.oxygenSaturation < min || vitals.oxygenSaturation > max) {
            const severity = determineSeverity(vitals.oxygenSaturation, min, max);
            anomalies.push({
                metric: 'oxygen_saturation',
                value: vitals.oxygenSaturation,
                expectedRange: { min, max },
                severity,
                timestamp: vitals.timestamp,
                description: generateAnomalyDescription('oxygenSaturation', vitals.oxygenSaturation, min, max, severity),
            });
        }
    }
    // Check weight (if baseline is available)
    if (vitals.weight !== undefined && baselineVitals?.weight) {
        const { min, max } = baselineVitals.weight;
        if (vitals.weight < min || vitals.weight > max) {
            const severity = determineSeverity(vitals.weight, min, max);
            anomalies.push({
                metric: 'weight',
                value: vitals.weight,
                expectedRange: { min, max },
                severity,
                timestamp: vitals.timestamp,
                description: generateAnomalyDescription('weight', vitals.weight, min, max, severity),
            });
        }
    }
    return anomalies;
}
/**
 * Check if anomalies should trigger an alert
 * Returns true if any anomaly is medium severity or higher
 */
function shouldTriggerAlert(anomalies) {
    return anomalies.some(anomaly => anomaly.severity === 'medium' || anomaly.severity === 'high' || anomaly.severity === 'critical');
}
/**
 * Get the highest severity from a list of anomalies
 */
function getHighestSeverity(anomalies) {
    if (anomalies.length === 0)
        return 'low';
    const severityOrder = ['low', 'medium', 'high', 'critical'];
    let highest = 'low';
    for (const anomaly of anomalies) {
        if (severityOrder.indexOf(anomaly.severity) > severityOrder.indexOf(highest)) {
            highest = anomaly.severity;
        }
    }
    return highest;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5vbWFseS1kZXRlY3Rpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhbm9tYWx5LWRldGVjdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsb0NBQW9DO0FBQ3BDLG9FQUFvRTs7QUE0RHBFLDBDQWtIQztBQU1ELGdEQUlDO0FBS0QsZ0RBYUM7QUF0TUQ7O0dBRUc7QUFDSCxNQUFNLHFCQUFxQixHQUFHO0lBQzVCLFNBQVMsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRTtJQUNoQyxVQUFVLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUU7SUFDakMsV0FBVyxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFO0lBQ2pDLFdBQVcsRUFBRSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRTtJQUNyQyxnQkFBZ0IsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRTtJQUN2QyxNQUFNLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSw4QkFBOEI7Q0FDL0QsQ0FBQztBQUVGOztHQUVHO0FBQ0gsU0FBUyxpQkFBaUIsQ0FBQyxLQUFhLEVBQUUsR0FBVyxFQUFFLEdBQVc7SUFDaEUsTUFBTSxLQUFLLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQztJQUN4QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxLQUFLLEVBQUUsS0FBSyxHQUFHLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUN4RCxNQUFNLGdCQUFnQixHQUFHLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQyxHQUFHLEdBQUcsQ0FBQztJQUVuRCxJQUFJLGdCQUFnQixHQUFHLEVBQUUsRUFBRSxDQUFD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QUMsT0FBTyxDQUFDLFFBQVEsS0FBSyxRQUFRLElBQUksT0FBTyxDQUFDLFFBQVEsS0FBSyxNQUFNLElBQUksT0FBTyxDQUFDLFFBQVEsS0FBSyxVQUFVLENBQzNHLENBQUM7QUFDSixDQUFDO0FBRUQ7O0dBRUc7QUFDSCxTQUFnQixrQkFBa0IsQ0FBQyxTQUEwQjtJQUMzRCxJQUFJLFNBQVMsQ0FBQyxNQUFNLEtBQUssQ0FBQztRQUFFLE9BQU8sS0FBSyxDQUFDO0lBRXpDLE1BQU0sYUFBYSxHQUFvQixDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQzdFLElBQUksT0FBTyxHQUFrQixLQUFLLENBQUM7SUFFbkMsS0FBSyxNQUFNLE9BQU8sSUFBSSxTQUFTLEVBQUUsQ0FBQztRQUNoQyxJQUFJLGFBQWEsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxHQUFHLGFBQWEsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUM3RSxPQUFPLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQztRQUM3QixDQUFDO0lBQ0gsQ0FBQztJQUVELE9BQU8sT0FBTyxDQUFDO0FBQ2pCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBBbm9tYWx5IERldGVjdGlvbiBmb3IgVml0YWwgU2lnbnNcbi8vIFJlcXVpcmVtZW50czogMS4zIC0gRGV0ZWN0IG91dC1vZi1yYW5nZSB2aXRhbHMgYW5kIHRyaWdnZXIgYWxlcnRzXG5cbmltcG9ydCB7IFZpdGFsU2lnbnMsIEFub21hbHlSZXN1bHQsIEFsZXJ0U2V2ZXJpdHksIEJhc2VsaW5lVml0YWxzIH0gZnJvbSAnLi90eXBlcyc7XG5cbi8qKlxuICogRGVmYXVsdCBub3JtYWwgcmFuZ2VzIGZvciB2aXRhbCBzaWduc1xuICovXG5jb25zdCBERUZBVUxUX05PUk1BTF9SQU5HRVMgPSB7XG4gIGhlYXJ0UmF0ZTogeyBtaW46IDYwLCBtYXg6IDEwMCB9LFxuICBzeXN0b2xpY0JQOiB7IG1pbjogOTAsIG1heDogMTQwIH0sXG4gIGRpYXN0b2xpY0JQOiB7IG1pbjogNjAsIG1heDogOTAgfSxcbiAgdGVtcGVyYXR1cmU6IHsgbWluOiA5Ny4wLCBtYXg6IDk5LjUgfSxcbiAgb3h5Z2VuU2F0dXJhdGlvbjogeyBtaW46IDk1LCBtYXg6IDEwMCB9LFxuICB3ZWlnaHQ6IHsgbWluOiAxMDAsIG1heDogMzAwIH0sIC8vIFRoaXMgc2hvdWxkIGJlIHBlcnNvbmFsaXplZFxufTtcblxuLyoqXG4gKiBEZXRlcm1pbmUgc2V2ZXJpdHkgYmFzZWQgb24gaG93IGZhciBvdXRzaWRlIG5vcm1hbCByYW5nZVxuICovXG5mdW5jdGlvbiBkZXRlcm1pbmVTZXZlcml0eSh2YWx1ZTogbnVtYmVyLCBtaW46IG51bWJlciwgbWF4OiBudW1iZXIpOiBBbGVydFNldmVyaXR5IHtcbiAgY29uc3QgcmFuZ2UgPSBtYXggLSBtaW47XG4gIGNvbnN0IGRldmlhdGlvbiA9IE1hdGgubWF4KG1pbiAtIHZhbHVlLCB2YWx1ZSAtIG1heCwgMCk7XG4gIGNvbnN0IHBlcmNlbnREZXZpYXRpb24gPSAoZGV2aWF0aW9uIC8gcmFuZ2UpICogMTAwO1xuXG4gIGlmIChwZXJjZW50RGV2aWF0aW9uID4gNTApIHtcbiAgICByZXR1cm4gJ2NyaXRpY2FsJztcbiAgfSBlbHNlIGlmIChwZXJjZW50RGV2aWF0aW9uID4gMjUpIHtcbiAgICByZXR1cm4gJ2hpZ2gnO1xuICB9IGVsc2UgaWYgKHBlcmNlbnREZXZpYXRpb24gPiAxMCkge1xuICAgIHJldHVybiAnbWVkaXVtJztcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gJ2xvdyc7XG4gIH1cbn1cblxuLyoqXG4gKiBHZW5lcmF0ZSBkZXNjcmlwdGlvbiBmb3IgYW5vbWFseVxuICovXG5mdW5jdGlvbiBnZW5lcmF0ZUFub21hbHlEZXNjcmlwdGlvbihcbiAgbWV0cmljOiBzdHJpbmcsXG4gIHZhbHVlOiBudW1iZXIsXG4gIG1pbjogbnVtYmVyLFxuICBtYXg6IG51bWJlcixcbiAgc2V2ZXJpdHk6IEFsZXJ0U2V2ZXJpdHlcbik6IHN0cmluZyB7XG4gIGNvbnN0IG1ldHJpY05hbWUgPSBtZXRyaWMucmVwbGFjZSgvKFtBLVpdKS9nLCAnICQxJykudG9Mb3dlckNhc2UoKS50cmltKCk7XG4gIFxuICBpZiAodmFsdWUgPCBtaW4pIHtcbiAgICByZXR1cm4gYCR7bWV0cmljTmFtZX0gaXMgYmVsb3cgbm9ybWFsIHJhbmdlICgke3ZhbHVlfSA8ICR7bWlufSkuIFNldmVyaXR5OiAke3NldmVyaXR5fS5gO1xuICB9IGVsc2UgaWYgKHZhbHVlID4gbWF4KSB7XG4gICAgcmV0dXJuIGAke21ldHJpY05hbWV9IGlzIGFib3ZlIG5vcm1hbCByYW5nZSAoJHt2YWx1ZX0gPiAke21heH0pLiBTZXZlcml0eTogJHtzZXZlcml0eX0uYDtcbiAgfVxuICBcbiAgcmV0dXJuIGAke21ldHJpY05hbWV9IGlzIHdpdGhpbiBub3JtYWwgcmFuZ2UuYDtcbn1cblxuLyoqXG4gKiBEZXRlY3QgYW5vbWFsaWVzIGluIHZpdGFsIHNpZ25zXG4gKiBDb21wYXJlcyByZWFkaW5ncyBhZ2FpbnN0IGJhc2VsaW5lIHZpdGFscyBhbmQgbm9ybWFsIHJhbmdlc1xuICovXG5leHBvcnQgZnVuY3Rpb24gZGV0ZWN0QW5vbWFsaWVzKFxuICB2aXRhbHM6IFZpdGFsU2lnbnMsXG4gIGJhc2VsaW5lVml0YWxzPzogQmFzZWxpbmVWaXRhbHNcbik6IEFub21hbHlSZXN1bHRbXSB7XG4gIGNvbnN0IGFub21hbGllczogQW5vbWFseVJlc3VsdFtdID0gW107XG5cbiAgLy8gVXNlIGJhc2VsaW5lIHZpdGFscyBpZiBwcm92aWRlZCwgb3RoZXJ3aXNlIHVzZSBkZWZhdWx0IHJhbmdlc1xuICBjb25zdCByYW5nZXMgPSBiYXNlbGluZVZpdGFscyB8fCB7XG4gICAgaGVhcnRSYXRlOiBERUZBVUxUX05PUk1BTF9SQU5HRVMuaGVhcnRSYXRlLFxuICAgIGJsb29kUHJlc3N1cmU6IHtcbiAgICAgIHN5c3RvbGljOiBERUZBVUxUX05PUk1BTF9SQU5HRVMuc3lzdG9saWNCUCxcbiAgICAgIGRpYXN0b2xpYzogREVGQVVMVF9OT1JNQUxfUkFOR0VTLmRpYXN0b2xpY0JQLFxuICAgIH0sXG4gICAgdGVtcGVyYXR1cmU6IERFRkFVTFRfTk9STUFMX1JBTkdFUy50ZW1wZXJhdHVyZSxcbiAgICBveHlnZW5TYXR1cmF0aW9uOiBERUZBVUxUX05PUk1BTF9SQU5HRVMub3h5Z2VuU2F0dXJhdGlvbixcbiAgICB3ZWlnaHQ6IERFRkFVTFRfTk9STUFMX1JBTkdFUy53ZWlnaHQsXG4gIH07XG5cbiAgLy8gQ2hlY2sgaGVhcnQgcmF0ZVxuICBpZiAodml0YWxzLmhlYXJ0UmF0ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgY29uc3QgeyBtaW4sIG1heCB9ID0gcmFuZ2VzLmhlYXJ0UmF0ZTtcbiAgICBpZiAodml0YWxzLmhlYXJ0UmF0ZSA8IG1pbiB8fCB2aXRhbHMuaGVhcnRSYXRlID4gbWF4KSB7XG4gICAgICBjb25zdCBzZXZlcml0eSA9IGRldGVybWluZVNldmVyaXR5KHZpdGFscy5oZWFydFJhdGUsIG1pbiwgbWF4KTtcbiAgICAgIGFub21hbGllcy5wdXNoKHtcbiAgICAgICAgbWV0cmljOiAnaGVhcnRfcmF0ZScsXG4gICAgICAgIHZhbHVlOiB2aXRhbHMuaGVhcnRSYXRlLFxuICAgICAgICBleHBlY3RlZFJhbmdlOiB7IG1pbiwgbWF4IH0sXG4gICAgICAgIHNldmVyaXR5LFxuICAgICAgICB0aW1lc3RhbXA6IHZpdGFscy50aW1lc3RhbXAsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBnZW5lcmF0ZUFub21hbHlEZXNjcmlwdGlvbignaGVhcnRSYXRlJywgdml0YWxzLmhlYXJ0UmF0ZSwgbWluLCBtYXgsIHNldmVyaXR5KSxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8vIENoZWNrIGJsb29kIHByZXNzdXJlXG4gIGlmICh2aXRhbHMuYmxvb2RQcmVzc3VyZSkge1xuICAgIGNvbnN0IHsgc3lzdG9saWMsIGRpYXN0b2xpYyB9ID0gdml0YWxzLmJsb29kUHJlc3N1cmU7XG4gICAgY29uc3Qgc3lzdG9saWNSYW5nZSA9IHJhbmdlcy5ibG9vZFByZXNzdXJlLnN5c3RvbGljO1xuICAgIGNvbnN0IGRpYXN0b2xpY1JhbmdlID0gcmFuZ2VzLmJsb29kUHJlc3N1cmUuZGlhc3RvbGljO1xuXG4gICAgaWYgKHN5c3RvbGljIDwgc3lzdG9saWNSYW5nZS5taW4gfHwgc3lzdG9saWMgPiBzeXN0b2xpY1JhbmdlLm1heCkge1xuICAgICAgY29uc3Qgc2V2ZXJpdHkgPSBkZXRlcm1pbmVTZXZlcml0eShzeXN0b2xpYywgc3lzdG9saWNSYW5nZS5taW4sIHN5c3RvbGljUmFuZ2UubWF4KTtcbiAgICAgIGFub21hbGllcy5wdXNoKHtcbiAgICAgICAgbWV0cmljOiAnc3lzdG9saWNfYmxvb2RfcHJlc3N1cmUnLFxuICAgICAgICB2YWx1ZTogc3lzdG9saWMsXG4gICAgICAgIGV4cGVjdGVkUmFuZ2U6IHN5c3RvbGljUmFuZ2UsXG4gICAgICAgIHNldmVyaXR5LFxuICAgICAgICB0aW1lc3RhbXA6IHZpdGFscy50aW1lc3RhbXAsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBnZW5lcmF0ZUFub21hbHlEZXNjcmlwdGlvbignc3lzdG9saWNCUCcsIHN5c3RvbGljLCBzeXN0b2xpY1JhbmdlLm1pbiwgc3lzdG9saWNSYW5nZS5tYXgsIHNldmVyaXR5KSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmIChkaWFzdG9saWMgPCBkaWFzdG9saWNSYW5nZS5taW4gfHwgZGlhc3RvbGljID4gZGlhc3RvbGljUmFuZ2UubWF4KSB7XG4gICAgICBjb25zdCBzZXZlcml0eSA9IGRldGVybWluZVNldmVyaXR5KGRpYXN0b2xpYywgZGlhc3RvbGljUmFuZ2UubWluLCBkaWFzdG9saWNSYW5nZS5tYXgpO1xuICAgICAgYW5vbWFsaWVzLnB1c2goe1xuICAgICAgICBtZXRyaWM6ICdkaWFzdG9saWNfYmxvb2RfcHJlc3N1cmUnLFxuICAgICAgICB2YWx1ZTogZGlhc3RvbGljLFxuICAgICAgICBleHBlY3RlZFJhbmdlOiBkaWFzdG9saWNSYW5nZSxcbiAgICAgICAgc2V2ZXJpdHksXG4gICAgICAgIHRpbWVzdGFtcDogdml0YWxzLnRpbWVzdGFtcCxcbiAgICAgICAgZGVzY3JpcHRpb246IGdlbmVyYXRlQW5vbWFseURlc2NyaXB0aW9uKCdkaWFzdG9saWNCUCcsIGRpYXN0b2xpYywgZGlhc3RvbGljUmFuZ2UubWluLCBkaWFzdG9saWNSYW5nZS5tYXgsIHNldmVyaXR5KSxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8vIENoZWNrIHRlbXBlcmF0dXJlXG4gIGlmICh2aXRhbHMudGVtcGVyYXR1cmUgIT09IHVuZGVmaW5lZCkge1xuICAgIGNvbnN0IHsgbWluLCBtYXggfSA9IHJhbmdlcy50ZW1wZXJhdHVyZTtcbiAgICBpZiAodml0YWxzLnRlbXBlcmF0dXJlIDwgbWluIHx8IHZpdGFscy50ZW1wZXJhdHVyZSA+IG1heCkge1xuICAgICAgY29uc3Qgc2V2ZXJpdHkgPSBkZXRlcm1pbmVTZXZlcml0eSh2aXRhbHMudGVtcGVyYXR1cmUsIG1pbiwgbWF4KTtcbiAgICAgIGFub21hbGllcy5wdXNoKHtcbiAgICAgICAgbWV0cmljOiAndGVtcGVyYXR1cmUnLFxuICAgICAgICB2YWx1ZTogdml0YWxzLnRlbXBlcmF0dXJlLFxuICAgICAgICBleHBlY3RlZFJhbmdlOiB7IG1pbiwgbWF4IH0sXG4gICAgICAgIHNldmVyaXR5LFxuICAgICAgICB0aW1lc3RhbXA6IHZpdGFscy50aW1lc3RhbXAsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBnZW5lcmF0ZUFub21hbHlEZXNjcmlwdGlvbigndGVtcGVyYXR1cmUnLCB2aXRhbHMudGVtcGVyYXR1cmUsIG1pbiwgbWF4LCBzZXZlcml0eSksXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvLyBDaGVjayBveHlnZW4gc2F0dXJhdGlvblxuICBpZiAodml0YWxzLm94eWdlblNhdHVyYXRpb24gIT09IHVuZGVmaW5lZCkge1xuICAgIGNvbnN0IHsgbWluLCBtYXggfSA9IHJhbmdlcy5veHlnZW5TYXR1cmF0aW9uO1xuICAgIGlmICh2aXRhbHMub3h5Z2VuU2F0dXJhdGlvbiA8IG1pbiB8fCB2aXRhbHMub3h5Z2VuU2F0dXJhdGlvbiA+IG1heCkge1xuICAgICAgY29uc3Qgc2V2ZXJpdHkgPSBkZXRlcm1pbmVTZXZlcml0eSh2aXRhbHMub3h5Z2VuU2F0dXJhdGlvbiwgbWluLCBtYXgpO1xuICAgICAgYW5vbWFsaWVzLnB1c2goe1xuICAgICAgICBtZXRyaWM6ICdveHlnZW5fc2F0dXJhdGlvbicsXG4gICAgICAgIHZhbHVlOiB2aXRhbHMub3h5Z2VuU2F0dXJhdGlvbixcbiAgICAgICAgZXhwZWN0ZWRSYW5nZTogeyBtaW4sIG1heCB9LFxuICAgICAgICBzZXZlcml0eSxcbiAgICAgICAgdGltZXN0YW1wOiB2aXRhbHMudGltZXN0YW1wLFxuICAgICAgICBkZXNjcmlwdGlvbjogZ2VuZXJhdGVBbm9tYWx5RGVzY3JpcHRpb24oJ294eWdlblNhdHVyYXRpb24nLCB2aXRhbHMub3h5Z2VuU2F0dXJhdGlvbiwgbWluLCBtYXgsIHNldmVyaXR5KSxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8vIENoZWNrIHdlaWdodCAoaWYgYmFzZWxpbmUgaXMgYXZhaWxhYmxlKVxuICBpZiAodml0YWxzLndlaWdodCAhPT0gdW5kZWZpbmVkICYmIGJhc2VsaW5lVml0YWxzPy53ZWlnaHQpIHtcbiAgICBjb25zdCB7IG1pbiwgbWF4IH0gPSBiYXNlbGluZVZpdGFscy53ZWlnaHQ7XG4gICAgaWYgKHZpdGFscy53ZWlnaHQgPCBtaW4gfHwgdml0YWxzLndlaWdodCA+IG1heCkge1xuICAgICAgY29uc3Qgc2V2ZXJpdHkgPSBkZXRlcm1pbmVTZXZlcml0eSh2aXRhbHMud2VpZ2h0LCBtaW4sIG1heCk7XG4gICAgICBhbm9tYWxpZXMucHVzaCh7XG4gICAgICAgIG1ldHJpYzogJ3dlaWdodCcsXG4gICAgICAgIHZhbHVlOiB2aXRhbHMud2VpZ2h0LFxuICAgICAgICBleHBlY3RlZFJhbmdlOiB7IG1pbiwgbWF4IH0sXG4gICAgICAgIHNldmVyaXR5LFxuICAgICAgICB0aW1lc3RhbXA6IHZpdGFscy50aW1lc3RhbXAsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBnZW5lcmF0ZUFub21hbHlEZXNjcmlwdGlvbignd2VpZ2h0Jywgdml0YWxzLndlaWdodCwgbWluLCBtYXgsIHNldmVyaXR5KSxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBhbm9tYWxpZXM7XG59XG5cbi8qKlxuICogQ2hlY2sgaWYgYW5vbWFsaWVzIHNob3VsZCB0cmlnZ2VyIGFuIGFsZXJ0XG4gKiBSZXR1cm5zIHRydWUgaWYgYW55IGFub21hbHkgaXMgbWVkaXVtIHNldmVyaXR5IG9yIGhpZ2hlclxuICovXG5leHBvcnQgZnVuY3Rpb24gc2hvdWxkVHJpZ2dlckFsZXJ0KGFub21hbGllczogQW5vbWFseVJlc3VsdFtdKTogYm9vbGVhbiB7XG4gIHJldHVybiBhbm9tYWxpZXMuc29tZShcbiAgICBhbm9tYWx5ID0+IGFub21hbHkuc2V2ZXJpdHkgPT09ICdtZWRpdW0nIHx8IGFub21hbHkuc2V2ZXJpdHkgPT09ICdoaWdoJyB8fCBhbm9tYWx5LnNldmVyaXR5ID09PSAnY3JpdGljYWwnXG4gICk7XG59XG5cbi8qKlxuICogR2V0IHRoZSBoaWdoZXN0IHNldmVyaXR5IGZyb20gYSBsaXN0IG9mIGFub21hbGllc1xuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0SGlnaGVzdFNldmVyaXR5KGFub21hbGllczogQW5vbWFseVJlc3VsdFtdKTogQWxlcnRTZXZlcml0eSB7XG4gIGlmIChhbm9tYWxpZXMubGVuZ3RoID09PSAwKSByZXR1cm4gJ2xvdyc7XG5cbiAgY29uc3Qgc2V2ZXJpdHlPcmRlcjogQWxlcnRTZXZlcml0eVtdID0gWydsb3cnLCAnbWVkaXVtJywgJ2hpZ2gnLCAnY3JpdGljYWwnXTtcbiAgbGV0IGhpZ2hlc3Q6IEFsZXJ0U2V2ZXJpdHkgPSAnbG93JztcblxuICBmb3IgKGNvbnN0IGFub21hbHkgb2YgYW5vbWFsaWVzKSB7XG4gICAgaWYgKHNldmVyaXR5T3JkZXIuaW5kZXhPZihhbm9tYWx5LnNldmVyaXR5KSA+IHNldmVyaXR5T3JkZXIuaW5kZXhPZihoaWdoZXN0KSkge1xuICAgICAgaGlnaGVzdCA9IGFub21hbHkuc2V2ZXJpdHk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGhpZ2hlc3Q7XG59XG4iXX0=