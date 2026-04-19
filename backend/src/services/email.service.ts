import { Resend } from "resend";

// Lazy-initialise so the module can be loaded (and mocked) in tests
// without a real RESEND_API_KEY in the environment.
let _resend: Resend | null = null;
const getResend = () => {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
};

/**
 * Send a study room invite email via Resend.
 */
export const sendStudyRoomInvite = async (
  email: string,
  roomTitle: string,
  inviteUrl: string,
): Promise<void> => {
  const { error } = await getResend().emails.send({
    from: "EZY Notez <noreply@mail.lakshitha.me>",
    to: email,
    subject: `You're invited to join "${roomTitle}" on EzyNotez`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Study Room Invite</title>
</head>
<body style="margin:0;padding:0;background:#0f1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#1a1d2e;border-radius:12px;overflow:hidden;border:1px solid #2a2d3e;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#3b5bdb 0%,#1971c2 100%);padding:32px 40px;text-align:center;">
              <p style="margin:0 0 8px;color:#a5c8ff;font-size:13px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;">EzyNotez</p>
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Study Room Invite</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 16px;color:#c1c9e0;font-size:15px;line-height:1.6;">
                You've been invited to join a collaborative study room on EzyNotez.
              </p>
              <!-- Room card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#111827;border-radius:8px;border:1px solid #2a2d3e;margin:0 0 28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 4px;color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;">Room</p>
                    <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">${roomTitle}</p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 24px;color:#9ca3af;font-size:14px;line-height:1.6;">
                Click the button below to accept your invitation and join the lobby. The room host will start the session once everyone is ready.
              </p>
              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td style="border-radius:8px;background:#3b5bdb;">
                    <a href="${inviteUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">
                      Accept Invitation →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;color:#6b7280;font-size:12px;line-height:1.6;">
                Or copy this link into your browser:<br/>
                <span style="color:#3b5bdb;word-break:break-all;">${inviteUrl}</span>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #2a2d3e;text-align:center;">
              <p style="margin:0;color:#4b5563;font-size:12px;">
                This invite was sent by EzyNotez. If you didn't expect this email, you can safely ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
};
