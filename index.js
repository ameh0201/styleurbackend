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
app.get('/api/send', (req, res) => {
  try {
    const email = (req.query.email || '').toString().trim();
    if (!/.+@.+\..+/.test(email)) return res.status(400).json({ ok:false, error:'Invalid email' });

    // Respond immediately; send email in background
    res.json({ ok: true, queued: true });

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000
    });

    const fromAddress = process.env.MAIL_FROM || process.env.GMAIL_USER;
    const fromName = process.env.MAIL_FROM_NAME || 'Styleur';
    const replyTo = process.env.MAIL_REPLY_TO || fromAddress;
    const bcc = process.env.MAIL_BCC || process.env.GMAIL_USER;

    transporter.sendMail({
      from: { name: fromName, address: fromAddress },
      to: email,
      replyTo,
      bcc,
      subject: 'Bevestiging: je aanvraag is ontvangen',
      html: '<p>Bedankt voor je aanvraag bij <strong>Styleur</strong>. Ik neem binnen 24 uur contact met je op.</p>'
    }).then(info => {
      console.log('Email sent', info.messageId);
    }).catch(err => {
      console.error('Email send failed', err);
    });
  } catch (e) {
    console.error('send error', e);
    // If we hit here after responding, nothing to do; if not responded, send 500
    try { if (!res.headersSent) res.status(500).json({ ok:false, error:'Failed to send' }); } catch (_) {}
  }
});

app.listen(PORT, () => {
  console.log(`Email server listening on port ${PORT}`);
});


