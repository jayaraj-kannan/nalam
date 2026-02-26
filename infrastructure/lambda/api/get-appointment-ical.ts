// Get Appointment iCal Lambda Function
// Requirements: 6.3
// Generates iCal format for calendar integration

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getAppointment, getAppointmentsByUser } from '../shared/data-access/appointments';
import { createErrorResponse, AppointmentRecord } from '../shared/types';

/**
 * Generate iCal format for a single appointment
 */
function generateICalEvent(appointment: AppointmentRecord): string {
  const now = new Date();
  const dtStamp = formatICalDate(now);
  const dtStart = formatICalDate(appointment.scheduledTime);
  
  // Calculate end time (use duration or default to 30 minutes)
  const duration = appointment.duration || 30;
  const endTime = new Date(appointment.scheduledTime.getTime() + duration * 60 * 1000);
  const dtEnd = formatICalDate(endTime);

  // Escape special characters in text fields
  const summary = escapeICalText(`${appointment.type} - ${appointment.provider.name}`);
  const description = escapeICalText(
    `Appointment Type: ${appointment.type}\n` +
    `Provider: ${appointment.provider.name}\n` +
    `Specialty: ${appointment.provider.specialty}\n` +
    (appointment.notes ? `\nNotes: ${appointment.notes}` : '') +
    (appointment.preparationInstructions ? `\n\nPreparation: ${appointment.preparationInstructions}` : '')
  );
  const location = appointment.location ? escapeICalText(appointment.location) : '';

  // Generate alarm for reminders (24 hours and 2 hours before)
  const alarms = appointment.reminders.enabled
    ? appointment.reminders.times.map(hours => generateICalAlarm(hours)).join('\n')
    : '';

  return `BEGIN:VEVENT
UID:${appointment.id}@healthcare-monitoring.com
DTSTAMP:${dtStamp}
DTSTART:${dtStart}
DTEND:${dtEnd}
SUMMARY:${summary}
DESCRIPTION:${description}
LOCATION:${location}
STATUS:${appointment.status.toUpperCase()}
${alarms}
END:VEVENT`;
}

/**
 * Generate iCal alarm component
 */
function generateICalAlarm(hoursBefore: number): string {
  const minutes = hoursBefore * 60;
  return `BEGIN:VALARM
ACTION:DISPLAY
DESCRIPTION:Appointment Reminder
TRIGGER:-PT${minutes}M
END:VALARM`;
}

/**
 * Format date for iCal (YYYYMMDDTHHMMSSZ)
 */
function formatICalDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Escape special characters for iCal text fields
 */
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Generate complete iCal calendar
 */
function generateICalCalendar(appointments: AppointmentRecord[]): string {
  const events = appointments.map(apt => generateICalEvent(apt)).join('\n');
  
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Healthcare Monitoring App//Appointment Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Healthcare Appointments
X-WR-TIMEZONE:UTC
X-WR-CALDESC:Medical appointments from Healthcare Monitoring App
${events}
END:VCALENDAR`;
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    console.log('Get appointment iCal request:', JSON.stringify(event));

    // Get userId from path parameters
    const userId = event.pathParameters?.userId;
    if (!userId) {
      return createErrorResponse(400, 'userId is required');
    }

    // Check if requesting single appointment or all appointments
    const appointmentId = event.pathParameters?.appointmentId;
    
    let appointments: AppointmentRecord[];

    if (appointmentId) {
      // Get single appointment
      const appointment = await getAppointment(userId, appointmentId);
      if (!appointment) {
        return createErrorResponse(404, 'Appointment not found');
      }
      appointments = [appointment];
    } else {
      // Get all appointments for user
      appointments = await getAppointmentsByUser(userId);
      
      // Filter to only scheduled and confirmed appointments
      appointments = appointments.filter(
        apt => apt.status === 'scheduled' || apt.status === 'confirmed'
      );
    }

    // Generate iCal format
    const iCalContent = generateICalCalendar(appointments);

    // Return iCal file
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': appointmentId 
          ? `attachment; filename="appointment-${appointmentId}.ics"`
          : `attachment; filename="appointments-${userId}.ics"`,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: iCalContent,
    };
  } catch (error) {
    console.error('Error generating iCal:', error);
    return createErrorResponse(500, 'Failed to generate calendar file');
  }
}
