require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname), {
    maxAge: '1d',
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
}));

// Rate limiting
const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, error: 'Too many requests. Please try again in 15 minutes.' }
});

// ===== IN-MEMORY STORE (replace with DB in production) =====
const submissions = [];
let stats = {
    totalSubmissions: 0,
    totalPageViews: 0
};

// ===== ROUTES =====

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'qiuQ Agency Backend',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// Contact form submission
app.post('/api/contact', contactLimiter, (req, res) => {
    try {
        const { name, email, company, phone, projectType, budget, message } = req.body;

        // Validation
        if (!name || !email || !message) {
            return res.status(400).json({
                success: false,
                error: 'Name, email, and message are required.'
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Please provide a valid email address.'
            });
        }

        if (name.length > 100) {
            return res.status(400).json({
                success: false,
                error: 'Name must be under 100 characters.'
            });
        }

        if (message.length > 2000) {
            return res.status(400).json({
                success: false,
                error: 'Message must be under 2000 characters.'
            });
        }

        // Sanitize inputs
        const sanitize = (str) => str ? str.replace(/<[^>]*>/g, '').trim() : '';

        const submission = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
            name: sanitize(name),
            email: sanitize(email),
            company: sanitize(company || ''),
            phone: sanitize(phone || ''),
            projectType: sanitize(projectType || ''),
            budget: sanitize(budget || ''),
            message: sanitize(message),
            timestamp: new Date().toISOString(),
            ip: req.ip,
            userAgent: req.get('User-Agent')
        };

        submissions.push(submission);
        stats.totalSubmissions++;

        console.log(`[NEW CONTACT] ${submission.name} (${submission.email}) - ${submission.projectType || 'Not specified'}`);

        res.json({
            success: true,
            message: 'Thank you! We\'ll get back to you within 24 hours.',
            id: submission.id
        });

    } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({
            success: false,
            error: 'Something went wrong. Please try again or email us directly.'
        });
    }
});

// Newsletter subscription
app.post('/api/subscribe', contactLimiter, (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, error: 'Email is required.' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, error: 'Invalid email address.' });
        }

        console.log(`[NEWSLETTER] New subscriber: ${email}`);

        res.json({
            success: true,
            message: 'You\'re subscribed! Welcome to the qiuQ community.'
        });

    } catch (error) {
        console.error('Subscribe error:', error);
        res.status(500).json({ success: false, error: 'Subscription failed.' });
    }
});

// Get site stats (public)
app.get('/api/stats', (req, res) => {
    res.json({
        submissions: stats.totalSubmissions,
        uptime: process.uptime()
    });
});

// Get all submissions (admin - add auth in production)
app.get('/api/admin/submissions', (req, res) => {
    // In production, add authentication middleware here
    res.json({
        total: submissions.length,
        data: submissions.slice(-50).reverse()
    });
});

// WhatsApp redirect helper
app.get('/api/whatsapp', (req, res) => {
    const number = process.env.WHATSAPP_NUMBER || '1234567890';
    const message = encodeURIComponent(req.query.message || 'Hi qiuQ! I\'m interested in your services.');
    res.redirect(`https://wa.me/${number}?text=${message}`);
});

// Catch-all: serve index.html for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ success: false, error: 'Internal server error.' });
});

// ===== START SERVER =====
app.listen(PORT, () => {
    console.log(`
    ╔══════════════════════════════════════════╗
    ║                                          ║
    ║   qiuQ Agency Backend                    ║
    ║   Running on http://localhost:${PORT}       ║
    ║   Lagos | London                         ║
    ║                                          ║
    ╚══════════════════════════════════════════╝
    `);
});

module.exports = app;
