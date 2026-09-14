import 'dotenv/config';
import nodemailer from 'nodemailer';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;
  if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) {
    throw new Error('Email is not configured. Set EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS in backend/.env.');
  }
  transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: Number(EMAIL_PORT) || 587,
    secure: Number(EMAIL_PORT) === 465,
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  });
  return transporter;
}

export async function sendPortalInviteEmail({ to, name, loginId, password }) {
  const appName = 'Urban Furniture Accounting';
  const html = `
    <p>Hi ${name},</p>
    <p>Portal access has been set up for you on the ${appName} system. You can use the credentials below to sign in:</p>
    <p>
      <strong>Login Id:</strong> ${loginId}<br />
      <strong>Temporary Password:</strong> ${password}
    </p>
    <p>Please sign in and change your password as soon as possible.</p>
  `;

  await getTransporter().sendMail({
    from: `"${appName}" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Your ${appName} portal access`,
    html,
  });
}
