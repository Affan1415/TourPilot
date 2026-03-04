import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  console.warn('RESEND_API_KEY is not set. Email functionality will not work.');
}

export const resend = new Resend(process.env.RESEND_API_KEY);

export const FROM_EMAIL = process.env.FROM_EMAIL || 'bookings@tourpilot.com';
export const COMPANY_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'TourPilot';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
