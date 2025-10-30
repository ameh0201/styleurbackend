const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// POST /api/send-confirmation
app.post('/api/send-confirmation', async (req, res) => {
  try {
    const { service, firstName, lastName, email, phone, notes } = req.body || {};

    if (!email || !firstName || !lastName) {
      return res.status(400).json({ ok: false, error: 'Missing required fields' });
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

    const mailOptions = {
      from: {
        name: 'Styleur',
        address: process.env.GMAIL_USER
      },
      to: email,
      bcc: process.env.GMAIL_USER, // copy for archive
      subject: 'Bevestiging: je aanvraag is ontvangen',
      html
    };

    await transporter.sendMail(mailOptions);
    return res.json({ ok: true });
  } catch (err) {
    console.error('Email send error:', err);
    return res.status(500).json({ ok: false, error: 'Failed to send email' });
  }
});

app.listen(PORT, () => {
  console.log(`Email server listening on http://localhost:${PORT}`);
});


