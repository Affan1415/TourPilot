import { APP_URL } from './resend';

type EmailType = 'booking-confirmation' | 'tour-reminder' | 'waiver-request' | 'review-request';

interface BookingConfirmationData {
  customerEmail: string;
  customerName: string;
  bookingReference: string;
  tourName: string;
  tourDate: string;
  tourTime: string;
  guestCount: number;
  totalAmount: number;
  meetingPoint?: string;
}

interface TourReminderData {
  customerEmail: string;
  customerName: string;
  bookingReference: string;
  tourName: string;
  tourDate: string;
  tourTime: string;
  guestCount: number;
  meetingPoint?: string;
  waiverSigned?: boolean;
}

interface WaiverRequestData {
  guestEmail: string;
  guestName: string;
  customerName?: string;
  tourName: string;
  tourDate: string;
  tourTime: string;
  waiverToken: string;
}

interface ReviewRequestData {
  customerEmail: string;
  customerName: string;
  tourName: string;
  tourDate: string;
  tripAdvisorUrl?: string;
  googleReviewUrl?: string;
}

type EmailData = {
  'booking-confirmation': BookingConfirmationData;
  'tour-reminder': TourReminderData;
  'waiver-request': WaiverRequestData;
  'review-request': ReviewRequestData;
};

export async function sendEmail<T extends EmailType>(
  type: T,
  data: EmailData[T]
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const response = await fetch(`${APP_URL}/api/email/${type}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      return { success: false, error: result.error || 'Failed to send email' };
    }

    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error(`Error sending ${type} email:`, error);
    return { success: false, error: 'Network error' };
  }
}

// Convenience functions
export const sendBookingConfirmation = (data: BookingConfirmationData) =>
  sendEmail('booking-confirmation', data);

export const sendTourReminder = (data: TourReminderData) =>
  sendEmail('tour-reminder', data);

export const sendWaiverRequest = (data: WaiverRequestData) =>
  sendEmail('waiver-request', data);

export const sendReviewRequest = (data: ReviewRequestData) =>
  sendEmail('review-request', data);
