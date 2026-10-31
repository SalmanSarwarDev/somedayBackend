const nodemailer = require('nodemailer');

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const assertEmailConfiguration = () => {
  const required = ['BREVO_SMTP_USER', 'BREVO_SMTP_KEY', 'BREVO_SENDER_EMAIL'];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) {
    const error = new Error(`Email delivery is not configured. Missing: ${missing.join(', ')}`);
    error.status = 503;
    throw error;
  }

  const port = Number(process.env.BREVO_SMTP_PORT || 587);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    const error = new Error('BREVO_SMTP_PORT must be a valid TCP port');
    error.status = 503;
    throw error;
  }
};

const sendVerificationEmail = async (user, otp) => {
  assertEmailConfiguration();
  const port = Number(process.env.BREVO_SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: {
      user: process.env.BREVO_SMTP_USER,
      pass: process.env.BREVO_SMTP_KEY,
    },
  });
  try {
    const firstName = escapeHtml(user.firstName);
    await transporter.sendMail({
      from: {
        name: process.env.BREVO_SENDER_NAME || 'Someday',
        address: process.env.BREVO_SENDER_EMAIL,
      },
      to: user.email,
      subject: 'Verify your Someday account',
      text: [
        `Hello ${user.firstName},`,
        '',
        `Your Someday verification code is: ${otp}`,
        '',
        'This code expires in 10 minutes.',
        '',
        'If you did not create a Someday account, you can safely ignore this email.',
      ].join('\n'),
      html: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>Verify your Someday account</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f3f5f9;font-family:Arial,Helvetica,sans-serif;color:#172033;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      Your Someday verification code expires in 10 minutes.
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f3f5f9;">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;">
            <tr>
              <td align="center" style="padding:0 0 24px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" valign="middle" width="42" height="42" style="width:42px;height:42px;border-radius:12px;background-color:#5b5ce2;color:#ffffff;font-size:22px;font-weight:bold;">S</td>
                    <td style="padding-left:10px;color:#172033;font-size:22px;font-weight:bold;letter-spacing:-0.5px;">Someday</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0;background-color:#ffffff;border:1px solid #e6e9f0;border-radius:16px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td style="padding:40px 40px 36px;">
                      <p style="margin:0 0 12px;color:#5b5ce2;font-size:12px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;">Email verification</p>
                      <h1 style="margin:0 0 16px;color:#172033;font-size:28px;line-height:1.25;font-weight:700;">You’re almost there, ${firstName}!</h1>
                      <p style="margin:0 0 28px;color:#596579;font-size:16px;line-height:1.65;">Enter this one-time code to verify your email address and finish setting up your account.</p>
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                        <tr>
                          <td align="center" style="padding:20px 12px;background-color:#f5f5ff;border:1px solid #e6e5ff;border-radius:12px;">
                            <span style="color:#4546c7;font-family:'Courier New',monospace;font-size:36px;font-weight:bold;letter-spacing:10px;">${otp}</span>
                          </td>
                        </tr>
                      </table>
                      <p style="margin:18px 0 0;color:#7a8495;font-size:14px;line-height:1.6;text-align:center;">This code expires in <strong style="color:#596579;">10 minutes</strong>.</p>
                      <hr style="height:1px;margin:30px 0 22px;border:0;background-color:#edf0f5;">
                      <p style="margin:0;color:#7a8495;font-size:13px;line-height:1.7;">If you didn’t create a Someday account, you can safely ignore this email. Your account won’t be verified without this code.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:22px 16px 0;color:#929bad;font-size:12px;line-height:1.6;">
                This is an automated message from Someday. Please don’t reply to this email.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    });
  } catch (cause) {
    console.error('Brevo verification email delivery failed:', cause.message);
    const error = new Error('Could not send the verification email. Please try again later');
    error.status = 503;
    throw error;
  } finally {
    transporter.close();
  }
};

module.exports = { assertEmailConfiguration, sendVerificationEmail };
