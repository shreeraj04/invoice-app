const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const qrcode = require('qrcode');
const nodemailer =require('nodemailer');
require('dotenv').config();

const app = express();
const port = 3001;

// Knex setup for SQLite
const knex = require('knex')({
    client: 'sqlite3',
    connection: { filename: './invoice.db' },
    useNullAsDefault: true
});

app.use(cors());
app.use(express.json());

// --- HTML TEMPLATE FOR THE PDF ---
const getInvoiceHTML = async (data) => {
    // Generate QR Code
    let qrCodeDataURL = '';
    if (data.settings.upiId) {
        const upiString = `upi://pay?pa=${data.settings.upiId}&pn=${encodeURIComponent(data.settings.yourName)}&am=${data.total}&cu=INR`;
        qrCodeDataURL = await qrcode.toDataURL(upiString);
    }

    // Format line items into table rows
    const itemsRows = data.items.map(item => `
        <tr>
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>₹${parseFloat(item.price).toFixed(2)}</td>
            <td>₹${(item.quantity * item.price).toFixed(2)}</td>
        </tr>
    `).join('');

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8" />
            <title>Invoice #${data.invoiceNumber}</title>
            <style>
                body { font-family: 'Helvetica Neue', 'Helvetica', Arial, sans-serif; color: #555; }
                .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, 0.15); font-size: 16px; line-height: 24px; }
                .invoice-box table { width: 100%; line-height: inherit; text-align: left; border-collapse: collapse; }
                .invoice-box table td { padding: 5px; vertical-align: top; }
                .invoice-box table tr.top table td { padding-bottom: 20px; }
                .invoice-box table tr.top table td.title { font-size: 45px; line-height: 45px; color: #333; }
                .invoice-box table tr.information table td { padding-bottom: 40px; }
                .invoice-box table tr.heading td { background: #eee; border-bottom: 1px solid #ddd; font-weight: bold; text-align: left;}
                .invoice-box table tr.item td { border-bottom: 1px solid #eee; text-align: left;}
                .invoice-box table tr.total td:nth-child(3) { border-top: 2px solid #eee; font-weight: bold; text-align: right; }
                .invoice-box table tr.total td:nth-child(4) { border-top: 2px solid #eee; font-weight: bold; text-align: left; }
                .qr-code { text-align: right; }
            </style>
        </head>
        <body>
            <div class="invoice-box">
                <table>
                    <tr class="top">
                        <td colspan="4">
                            <table>
                                <tr>
                                    <td class="title">
                                        <strong style="font-size: 40px; font-weight: bold;">${process.env.SENDER_NAME}</strong>
                                    </td>
                                </tr>
                                <tr>
                                    <td class="title">                                        
                                        <strong style="font-size: 30px; font-weight: bold;">INVOICE</strong>
                                    </td>
                                    <td>
                                        Invoice #: ${data.invoiceNumber}<br />
                                        Date: ${new Date(data.date).toLocaleDateString('en-IN')}<br />
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr class="information">
                        <td colspan="4">
                            <table>
                                <tr>
                                    <td>
                                        <strong>Billed to:</strong><br />
                                        ${data.client.name}<br />
                                        ${data.client.address.replace(/\n/g, '<br/>')}<br />
                                        ${data.client.email}
                                    </td>
                                    <td style="text-align: right;">
                                        <strong>From:</strong><br />
                                        ${data.settings.yourName}<br />
                                        ${data.settings.yourAddress.replace(/\n/g, '<br/>')}<br />
                                        ${data.settings.yourEmail}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr class="heading">
                        <td>Item</td>
                        <td>Quantity</td>
                        <td>Price</td>
                        <td>Amount</td>
                    </tr>
                    ${itemsRows}
                    <tr class="total">
                        <td colspan="2"></td>
                        <td><strong>Total:</strong></td>
                        <td><strong>₹${data.total.toFixed(2)}</strong></td>
                    </tr>
                     <tr><td colspan="4" style="padding-top: 30px;"><strong>Note:</strong> ${data.note}</td></tr>
                    <tr>
                       <td colspan="4" class="qr-code">
                           <p>Scan to pay:</p>
                           ${qrCodeDataURL ? `<img src="${qrCodeDataURL}" style="width: 120px;" />` : '<span>UPI ID not configured.</span>'}
                       </td>
                    </tr>
                </table>
            </div>
        </body>
        </html>
    `;
};

// --- API ENDPOINTS ---

// GET settings
app.get('/api/settings', async (req, res) => {
    const settings = await knex('settings').first();
    res.json(settings);
});

// POST settings
app.post('/api/settings', async (req, res) => {
    await knex('settings').where('id', 1).update(req.body);
    res.json({ message: 'Settings saved!' });
});

// GET past invoices
app.get('/api/invoices', async (req, res) => {
    const invoices = await knex('invoices').orderBy('id', 'desc');
    res.json(invoices);
});

// POST to generate invoice
app.post('/api/generate-invoice', async (req, res) => {
    const data = req.body;
    const { sendEmail } = req.query; // Check if we should send an email

    try {
        // 1. Get settings from DB
        const settings = await knex('settings').first();
        data.settings = settings;

        // 2. Generate PDF
        const htmlContent = await getInvoiceHTML(data);
        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(htmlContent);
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();
        
        // 3. Save invoice record to DB
        await knex('invoices').insert({
            invoiceNumber: data.invoiceNumber,
            clientName: data.client.name,
            clientEmail: data.client.email,
            clientAddress: data.client.address,
            invoiceDate: data.date,
            totalAmount: data.total,
            status: 'Sent'
        });

        // 4. Send Email (if requested)
        if (sendEmail === 'true') {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS,
                },
            });

            await transporter.sendMail({
                from: `"${settings.yourName}" <${settings.yourEmail}>`,
                to: data.client.email,
                subject: `Invoice #${data.invoiceNumber} from ${settings.yourName}`,
                html: `<p>Hi ${data.client.name},</p><p>Please find your invoice attached.</p><p>Thank you!</p>`,
                attachments: [{
                    filename: `Invoice-${data.invoiceNumber}.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf',
                }],
            });
             res.json({ message: 'Invoice generated and sent successfully!' });
        } else {
            // If not sending email, send PDF back for preview
            res.contentType('application/pdf');
            res.send(pdfBuffer);
        }

    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(500).json({ message: 'Failed to generate invoice.', error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
});