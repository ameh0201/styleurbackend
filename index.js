const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Permissive CORS (supports file:// => Origin "null")
const corsOptions = {
  origin: function(origin, callback) {
    // Allow any origin, including null (file://)
    callback(null, true);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: false,
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// Root route for quick up-check
app.get('/', (req, res) => {
  res.json({ ok: true, service: 'styleur-email', routes: ['/api/health', '/api/send-confirmation'] });
});

// POST /api/send-confirmation
app.post('/api/send-confirmation', async (req, res) => {
  try {
    const { service, firstName, lastName, email, phone, notes } = req.body || {};

    const isValidEmail = (value) => typeof value === 'string' && /.+@.+\..+/.test(value.trim());
    const recipientEmail = typeof email === 'string' ? email.trim() : '';

    if (!isValidEmail(recipientEmail) || !firstName || !lastName) {
      return res.status(400).json({ ok: false, error: 'Missing or invalid fields', details: { firstName: !!firstName, lastName: !!lastName, email: recipientEmail } });
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    const fullName = `${firstName} ${lastName}`.trim();

    const html = `
      <div style="font-family:Inter,Segoe UI,Arial,sans-serif;font-size:14px;color:#111;line-height:1.6;">
        <p>Hi ${firstName},</p>
        <p>Bedankt voor je aanvraag bij <strong>Styleur</strong>. Ik neem binnen 24 uur contact met je op.</p>
        <p style="margin:16px 0 4px; font-weight:600;">Gegevens</p>
        <ul style="margin:0; padding-left:18px;">
          <li><strong>Naam:</strong> ${fullName}</li>
          ${service ? `<li><strong>Service:</strong> ${service}</li>` : ''}
          <li><strong>E-mail:</strong> ${email}</li>
          ${phone ? `<li><strong>Telefoon:</strong> ${phone}</li>` : ''}
          ${notes ? `<li><strong>Opmerking:</strong> ${notes}</li>` : ''}
        </ul>
        <p style="margin-top:18px;">Hartelijke groet,<br/>Styleur</p>
      </div>
    `;

    const fromAddress = process.env.MAIL_FROM || process.env.GMAIL_USER;
    const fromName = process.env.MAIL_FROM_NAME || 'Styleur';
    const replyTo = process.env.MAIL_REPLY_TO || fromAddress;
    const bccAddress = process.env.MAIL_BCC || process.env.GMAIL_USER;

    const mailOptions = {
      from: { name: fromName, address: fromAddress },
      to: recipientEmail,
      replyTo,
      bcc: bccAddress,
      subject: 'Bevestiging: je aanvraag is ontvangen',
      html
    };

    const info = await transporter.sendMail(mailOptions);
    return res.json({ ok: true, messageId: info.messageId });
  } catch (err) {
    console.error('Email send error:', err);
    return res.status(500).json({ ok: false, error: 'Failed to send email' });
  }
});

// Simple GET endpoint: /api/send?email=...
app.get('/api/send', async (req, res) => {
  try {
    const recipientEmail = (req.query.email || '').toString().trim();
    if (!recipientEmail || !/.+@.+\..+/.test(recipientEmail)) {
      return res.status(400).json({ ok: false, error: 'Missing or invalid email' });
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    const fromAddress = process.env.MAIL_FROM || process.env.GMAIL_USER;
    const fromName = process.env.MAIL_FROM_NAME || 'Styleur';
    const replyTo = process.env.MAIL_REPLY_TO || fromAddress;
    const bccAddress = process.env.MAIL_BCC || process.env.GMAIL_USER;

    const html = `<div style="font-family:Inter,Segoe UI,Arial,sans-serif;font-size:14px;color:#111;line-height:1.6;">
      <p>Bedankt voor je aanvraag bij <strong>Styleur</strong>. Ik neem binnen 24 uur contact met je op.</p>
      <p>Hartelijke groet,<br/>Styleur</p>
    </div>`;

    const info = await transporter.sendMail({
      from: { name: fromName, address: fromAddress },
      to: recipientEmail,
      replyTo,
      bcc: bccAddress,
      subject: 'Bevestiging: je aanvraag is ontvangen',
      html
    });
    return res.json({ ok: true, messageId: info.messageId });
  } catch (err) {
    console.error('Email send error (GET /api/send):', err);
    return res.status(500).json({ ok: false, error: 'Failed to send email' });
  }
});

app.listen(PORT, () => {
  console.log(`Email server listening on http://localhost:${PORT}`);
});


