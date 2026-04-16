// ---------------------------------------------------------------------------
// Email service — placeholder implementations
// Replace log statements with Resend API calls once RESEND_API_KEY is set.
// ---------------------------------------------------------------------------

/**
 * Send a study room invite email.
 *
 * TODO: Replace with real Resend call:
 *   import { Resend } from 'resend';
 *   const resend = new Resend(process.env.RESEND_API_KEY);
 *   await resend.emails.send({ from: '...', to: email, subject: '...', html: '...' });
 */
export const sendStudyRoomInvite = async (
  email: string,
  roomTitle: string,
  inviteUrl: string,
): Promise<void> => {
  console.log(
    `[email] Study room invite → ${email} | room: "${roomTitle}" | url: ${inviteUrl}`,
  );
};
