const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// Permissive CORS to allow file:// origins and any domain
const corsOptions = {
  origin: function(origin, cb){ cb(null, true); },
  methods: ['GET','POST','OPTIONS'],
  allowedHeaders: ['Content-Type'],
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Health and root
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.get('/', (req, res) => res.json({ ok: true, service: 'styleur-email', routes: ['/api/health','/api/send'] }));

// Very simple GET endpoint: /api/send?email=...
app.get('/api/send', async (req, res) => {
  try {
    const email = (req.query.email || '').toString().trim();
    if (!/.+@.+\..+/.test(email)) return res.status(400).json({ ok:false, error:'Invalid email' });

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
    });

    const fromAddress = process.env.MAIL_FROM || process.env.GMAIL_USER;
    const fromName = process.env.MAIL_FROM_NAME || 'Styleur';
    const replyTo = process.env.MAIL_REPLY_TO || fromAddress;
    const bcc = process.env.MAIL_BCC || process.env.GMAIL_USER;

    const info = await transporter.sendMail({
      from: { name: fromName, address: fromAddress },
      to: email,
      replyTo,
      bcc,
      subject: 'Bevestiging: je aanvraag is ontvangen',
      html: '<p>Bedankt voor je aanvraag bij <strong>Styleur</strong>. Ik neem binnen 24 uur contact met je op.</p>'
    });
    res.json({ ok: true, messageId: info.messageId });
  } catch (e) {
    console.error('send error', e);
    res.status(500).json({ ok:false, error:'Failed to send' });
  }
});

app.listen(PORT, () => {
  console.log(`Email server listening on port ${PORT}`);
});


