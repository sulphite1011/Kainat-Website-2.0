/**
 * Utility helper to generate pre-filled WhatsApp URLs for urgent order verification
 */

interface UrgentWhatsAppParams {
  whatsAppNumber?: string;
  orderId: string;
  studentName?: string;
  studentEmail?: string;
  courseTitles: string[];
  totalAmount: number;
  transactionId: string;
  createdAt?: string;
}

export function buildUrgentVerificationWhatsAppUrl({
  whatsAppNumber,
  orderId,
  studentName,
  studentEmail,
  courseTitles,
  totalAmount,
  transactionId,
  createdAt,
}: UrgentWhatsAppParams): string {
  // Normalize phone number to Pakistani country code 92XXXXXXXXXX
  const rawNum = (whatsAppNumber || '0324 9059918').replace(/\D/g, '');
  const cleanPhone = rawNum.startsWith('92') ? rawNum : `92${rawNum.replace(/^0/, '')}`;

  const coursesList =
    courseTitles && courseTitles.length > 0
      ? courseTitles.map((t, idx) => `   ${idx + 1}. ${t}`).join('\n')
      : '   - Academic Notes Package';

  const dateStr = createdAt ? new Date(createdAt).toLocaleString() : new Date().toLocaleString();

  const message = `Assalam-o-Alaikum / Hello Kainat Notes Hub Team,
⚡ *URGENT ORDER VERIFICATION REQUEST*

I have submitted payment for academic notes and require urgent verification for early access.

📋 *Order Details:*
• *Order ID:* ${orderId}
• *Student Name:* ${studentName || 'Registered Student'}
• *Email:* ${studentEmail || 'Student Account'}
• *Amount Paid:* Rs. ${totalAmount}
• *EasyPaisa Trx ID:* ${transactionId}
• *Order Date:* ${dateStr}

📚 *Course Notes Ordered:*
${coursesList}

Kindly verify my payment and grant early access to my notes. Thank you!`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
