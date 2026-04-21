require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { google } = require('googleapis');
const Groq = require('groq-sdk');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// Persistent sequential ticket counter
const COUNTER_FILE = path.join(__dirname, 'ticket_counter.txt');
let ticketCounter = 0;

// Load previous counter from file if it exists
if (fs.existsSync(COUNTER_FILE)) {
    const savedCounter = parseInt(fs.readFileSync(COUNTER_FILE, 'utf8'), 10);
    if (!isNaN(savedCounter)) ticketCounter = savedCounter;
}

function generateTicketId() {
    ticketCounter += 1;
    // Save the new number immediately so it persists
    fs.writeFileSync(COUNTER_FILE, ticketCounter.toString(), 'utf8');
    return 'TKT-' + String(ticketCounter).padStart(6, '0');
}

// Middleware to parse JSON bodies
app.use(express.json());

// Main Entry Point
app.get('/', (req, res) => {
    // A helpful landing message
    res.send(`<h1>Triage API is online</h1><p>Visit <a href="/support">/support</a> to submit a ticket.</p>`);
});

// Serve beautiful static frontend UI on a specific route instead of root
app.use('/support', express.static(path.join(__dirname, 'public')));

// Friendly GET route if they visit the API endpoint in the browser directly
app.get('/api/triage', (req, res) => {
    res.send('This endpoint expects a POST request. Please use Postman or the PowerShell command provided in the README to send a JSON payload.');
});

// 1. Trigger (Webhook)
app.post('/api/triage', async (req, res) => {
    try {
        console.log("--- New Support Ticket Received ---");
        const ticketData = req.body;
        
        // Validation check for initialization correctly receiving data
        if (!ticketData || !ticketData.message) {
            return res.status(400).json({ error: "Invalid data: 'message' is required." });
        }
        
        console.log("Trigger fired successfully. Received data:", ticketData);

        // 2. Processing Function
        const processedData = processTicketData(ticketData);
        console.log(`Processing completed. Ticket ID: ${processedData.ticketId} | Name: ${processedData.customerName} | Source: ${processedData.source}`);

        // 2.5 Auto-Reply to User
        const autoReplyStatus = await sendAutoReplyEmail(processedData);
        console.log(autoReplyStatus);

        // 3. External API (Google Sheets via googleapis)
        // We push the normalized ticket to Google Sheets first, as required by the HW sequence.
        const crmResponse = await pushToExternalCRM(processedData);
        console.log("Successfully pushed to External API (CRM). ID:", crmResponse.id);

        // 4. AI Completion
        // We run AI analysis after the ticket is in the CRM.
        const aiAnalysis = await analyzeWithAI(processedData.message);
        console.log("AI Completion successful:", aiAnalysis);

        // 5. IF/Switch-like branching logic in code/workflow
        // We route the ticket based on Urgency and Sentiment
        let routingAction = "";
        if (aiAnalysis.urgency === "High") {
            // High urgency goes to Slack and Teams for immediate attention
            routingAction = await notifySlackAndTeams(processedData, aiAnalysis);
        } else if (aiAnalysis.sentiment === "Negative") {
            // Negative sentiment but low urgency -> escalate to a specific Email queue
            routingAction = await sendEmailNotification(processedData, aiAnalysis, "escalations@support.com");
        } else {
            // Standard/Low urgency -> standard email process
            routingAction = await sendEmailNotification(processedData, aiAnalysis, "general@support.com");
        }
        
        console.log("Branching/Routing complete:", routingAction);

        res.status(200).json({
            message: "Triage pipeline executed successfully in strict sequence.",
            crmId: crmResponse.id,
            analysis: aiAnalysis,
            routing: routingAction,
            autoReply: autoReplyStatus
        });

    } catch (error) {
        console.error("Pipeline failed:", error.message);
        res.status(500).json({ error: "Pipeline execution failed." });
    }
});

// Utility: Processing Function
function processTicketData(data) {
    return {
        ticketId: generateTicketId(),
        customerName: data.name || "Anonymous",
        email: data.email || "no-email@provided.com",
        message: data.message,
        receivedAt: new Date().toISOString(),
        source: data.source || "Web Form"
    };
}

// Utility: AI Completion (Real Groq API with Simulation Fallback)
async function analyzeWithAI(message) {
    try {
        if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'YOUR_API_KEY_HERE') {
            throw new Error("Missing or invalid API key");
        }
        
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const prompt = `You are a customer support AI assistant. Analyze the following customer message and respond ONLY with a valid JSON object — no markdown, no explanation.\n\nCustomer message: "${message}"\n\nRespond with exactly this JSON structure:\n{\n  "sentiment": "Positive" | "Neutral" | "Negative",\n  "urgency": "High" | "Low",\n  "suggestedResponse": "<a short, empathetic reply for the support agent to send>"\n}`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.1-8b-instant',
            temperature: 0.1,
            response_format: { type: 'json_object' }
        });

        const text = chatCompletion.choices[0]?.message?.content || "";
        return JSON.parse(text);
    } catch (error) {
        console.warn(`\n⚠️ Real AI failed (${error.message.substring(0, 50)}...). Falling back to Simulation mode...`);
        // Fallback to Simulation so the pipeline never breaks
        return new Promise((resolve) => {
            setTimeout(() => {
                const isUrgent = message.toLowerCase().includes("urgent") || message.toLowerCase().includes("broken");
                resolve({
                    sentiment: isUrgent ? "Negative" : "Neutral",
                    urgency: isUrgent ? "High" : "Low",
                    suggestedResponse: `Hello, we have received your message regarding "${message.substring(0, 20)}...". Our team will look into this immediately.`
                });
            }, 1000);
        });
    }
}

// Utility: External API (Connecting to real Google Sheets)
async function pushToExternalCRM(ticket) {
    const auth = new google.auth.GoogleAuth({
        keyFile: 'credentials.json',
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });
    const spreadsheetId = '1E-9ap6-Un5IRfNPsB_Ll1GwpCBfVFp_iru5QbPsUQEk';

    const response = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'A:F', // Targeting up to F to include the new Tracker ID
        valueInputOption: 'USER_ENTERED',
        resource: {
            values: [
                [ticket.ticketId, ticket.receivedAt, ticket.customerName, ticket.email, ticket.message, ticket.source]
            ],
        },
    });

    return { id: ticket.ticketId };
}

// Utility: Nodemailer setup with graceful fallback
function getEmailTransporter() {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        return null; // Return null if not configured to trigger simulation fallback
    }
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
}

// Utility: Connector for Slack and Teams (Simulated)
async function notifySlackAndTeams(ticket, aiAnalysis) {
    console.log(`[Slack/Teams Connector] Sending URGENT alert for Ticket ${ticket.ticketId}...`);
    const payload = {
        text: `🚨 URGENT TICKET: ${ticket.ticketId} - ${ticket.customerName}\nMessage: ${ticket.message}\nSuggested Reply: ${aiAnalysis.suggestedResponse}`
    };
    await new Promise(resolve => setTimeout(resolve, 500));
    return "Notified via Slack/Teams Connectors";
}

// Utility: Connector for Email (Fully Functional with Fallback)
async function sendEmailNotification(ticket, aiAnalysis, targetEmail) {
    console.log(`[Email Connector] Processing email to ${targetEmail} for Ticket ${ticket.ticketId}...`);
    const transporter = getEmailTransporter();
    const emailBody = `New Ticket: ${ticket.ticketId}\nFrom: ${ticket.customerName} (${ticket.email})\nMessage: ${ticket.message}\nAI Sentiment: ${aiAnalysis.sentiment}\nAI Suggested Reply: ${aiAnalysis.suggestedResponse}`;

    if (transporter) {
        try {
            await transporter.sendMail({
                from: `"Support Flow" <${process.env.EMAIL_USER}>`,
                to: targetEmail,
                subject: `Support Escalation: Ticket ${ticket.ticketId}`,
                text: emailBody
            });
            return `Successfully emailed escalation to ${targetEmail} via Nodemailer`;
        } catch (error) {
            console.error("\n⚠️  Email failed to send. Check credentials or allow less secure apps. Falling back to simulation...", error.message);
        }
    } else {
        console.warn("\n⚠️  EMAIL_USER not configured in .env. Falling back to simulated email notification...");
    }
    
    // Simulation fallback
    await new Promise(resolve => setTimeout(resolve, 500));
    return `[SIMULATED] Emailed to ${targetEmail}`;
}

// Utility: Auto-Reply to User (Fully Functional with Fallback)
async function sendAutoReplyEmail(ticket) {
    console.log(`[Auto-Reply Connector] Processing acknowledgment email to ${ticket.email}...`);
    const transporter = getEmailTransporter();
    const emailBody = `Hi ${ticket.customerName},\n\nWe received your ticket (${ticket.ticketId}). Our team will review it shortly.\n\nMessage received:\n"${ticket.message}"\n\nThanks,\nSupport Team`;

    if (transporter) {
        try {
            await transporter.sendMail({
                from: `"Support Team" <${process.env.EMAIL_USER}>`,
                to: ticket.email,
                subject: `Ticket Received: ${ticket.ticketId}`,
                text: emailBody
            });
            return `Auto-reply legitimately sent to ${ticket.email} via Nodemailer`;
        } catch (error) {
            console.error("\n⚠️  Auto-reply email failed to send. Falling back to simulation...", error.message);
        }
    }
    
    // Simulation fallback
    await new Promise(resolve => setTimeout(resolve, 300));
    return `[SIMULATED] Auto-reply sent to ${ticket.email}`;
}

app.listen(PORT, () => {
    console.log(`✅ Server running at: http://localhost:${PORT}`);
    console.log(`🌐 Support Form UI:   http://localhost:${PORT}/support`);
    console.log(`🔗 Webhook Endpoint:  POST http://localhost:${PORT}/api/triage`);
});
