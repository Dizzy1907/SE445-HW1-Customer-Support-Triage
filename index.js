/**
 * index.js — Local Runtime Harness
 *
 * Builds the context and runs the CRM_Triage_Agent.
 * The key addition is `context.agentLoop` — a real multi-turn
 * LLM tool-calling loop where Groq autonomously decides which tools to invoke.
 */

require('dotenv').config();

const express    = require('express');
const path       = require('path');
const fs         = require('fs');
const { google } = require('googleapis');
const Groq       = require('groq-sdk');
const nodemailer = require('nodemailer');

const SupportAgent = require('./agent');

// ─── State Store ───────────────────────────────────────────────────────────────
const COUNTER_FILE = path.join(__dirname, 'ticket_counter.txt');
let _counter = 0;
if (fs.existsSync(COUNTER_FILE)) {
    const saved = parseInt(fs.readFileSync(COUNTER_FILE, 'utf8'), 10);
    if (!isNaN(saved)) _counter = saved;
}
const state = {
    async incrementCounter() {
        _counter += 1;
        fs.writeFileSync(COUNTER_FILE, _counter.toString(), 'utf8');
        return _counter;
    }
};

// ─── SDK Clients ───────────────────────────────────────────────────────────────
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

const transporter = (process.env.EMAIL_USER && process.env.EMAIL_PASS)
    ? nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } })
    : null;

// ─── Context Builder ───────────────────────────────────────────────────────────
function buildContext() {
    const context = {
        env:            process.env,
        state:          state,
        libs:           { google, nodemailer },
        transporter,
        currentTicket:  null, // Set by agentLoop before tool execution
        tools:          {},

        nodes: {
            process: async (data) => {
                const count = await state.incrementCounter();
                return {
                    ticketId:     'TKT-' + String(count).padStart(6, '0'),
                    customerName: data.name    || "Anonymous",
                    email:        data.email   || "no-email@provided.com",
                    message:      data.message,
                    receivedAt:   new Date().toISOString(),
                    source:       data.source  || "Web Form"
                };
            }
        },

        // ── Real Agent Loop ─────────────────────────────────────────────────────
        // Implements a multi-turn Groq tool-calling loop.
        // The LLM reads the ticket and autonomously decides which tools to call.
        agentLoop: async (ticket) => {
            context.currentTicket = ticket;

            const systemPrompt =
`You are a Customer Support Triage Agent with tool-calling capabilities.
When you receive a ticket you MUST call tools in this exact order:
1. update_crm_sheet   — Always call first. No arguments needed.
2. send_auto_reply    — Always call second. No arguments needed.
3. ONE routing tool based on your analysis:
   - notify_urgent_channels  → ticket is urgent or time-critical
   - send_escalation_email   → customer is clearly unhappy/negative (not urgent)
   - send_standard_email     → all other routine tickets
In each routing tool call, provide your reasoning, sentiment, urgency, and a suggested response.
After all tools are called, give a brief one-sentence summary.`;

            const userMessage =
`New support ticket:
Ticket ID: ${ticket.ticketId}
Customer:  ${ticket.customerName} (${ticket.email})
Source:    ${ticket.source}
Message:   "${ticket.message}"`;

            // Build Groq-format tool list from the agent's functionDefinitions
            const tools = Object.values(SupportAgent.tools)
                .filter(t => t.functionDefinition)
                .map(t => ({ type: "function", function: t.functionDefinition }));

            const messages = [
                { role: "system", content: systemPrompt },
                { role: "user",   content: userMessage }
            ];

            const collected = {}; // Stores results keyed by tool name
            let agentSummary = "Agent completed task.";
            const MAX_TURNS = 6;

            for (let turn = 0; turn < MAX_TURNS; turn++) {
                console.log(`[Agent Loop] Turn ${turn + 1} — calling Groq...`);

                const response = await groq.chat.completions.create({
                    model:                'llama-3.3-70b-versatile',
                    messages,
                    tools,
                    tool_choice:          'auto',
                    parallel_tool_calls:  false,
                    temperature:          0.1
                });

                const assistantMsg = response.choices[0].message;
                messages.push(assistantMsg);

                // No tool calls → LLM is done
                if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
                    agentSummary = assistantMsg.content || agentSummary;
                    console.log(`[Agent Loop] Done after ${turn + 1} turn(s). Summary: ${agentSummary}`);
                    break;
                }

                // Execute each tool call the LLM requested
                for (const toolCall of assistantMsg.tool_calls) {
                    const toolName = toolCall.function.name;
                    const args     = JSON.parse(toolCall.function.arguments || '{}');

                    console.log(`[Agent Loop] LLM chose tool: ${toolName}`);

                    let result;
                    if (context.tools[toolName]) {
                        result = await context.tools[toolName](args);
                    } else {
                        result = { error: `Unknown tool: ${toolName}` };
                    }

                    collected[toolName] = { args, result };

                    // Feed the tool result back to the LLM
                    messages.push({
                        role:         'tool',
                        tool_call_id: toolCall.id,
                        content:      JSON.stringify(result)
                    });
                }
            }

            // ── Build standardized response ─────────────────────────────────────
            const crmResult     = collected.update_crm_sheet?.result   || {};
            const autoReply     = collected.send_auto_reply?.result     || {};
            const routingEntry  = collected.notify_urgent_channels
                               || collected.send_escalation_email
                               || collected.send_standard_email
                               || {};

            const routingArgs   = routingEntry.args   || {};
            const routingResult = routingEntry.result || {};

            return {
                message:      "Antigravity agent mission completed successfully.",
                crmId:        crmResult.id || ticket.ticketId,
                analysis: {
                    sentiment:         routingArgs.sentiment        || "Neutral",
                    urgency:           routingArgs.urgency          || "Low",
                    suggestedResponse: routingArgs.suggestedResponse || agentSummary
                },
                routing:      routingResult.message || "Routing completed.",
                autoReply:    autoReply.message     || "Auto-reply processed.",
                agentSummary
            };
        }
    };

    // Bind tools: pass (args, context) to each handler
    for (const [toolName, toolDef] of Object.entries(SupportAgent.tools)) {
        context.tools[toolName] = async (args) => {
            return await toolDef.handler(args, context);
        };
    }

    return context;
}

// ─── Express Server ────────────────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) =>
    res.send(`<h1>Triage API is online</h1><p>Visit <a href="/support">/support</a> to submit a ticket.</p>`)
);
app.use('/support', express.static(path.join(__dirname, 'public')));
app.get('/api/triage', (req, res) =>
    res.send('This endpoint expects a POST request.')
);

// Webhook — the agent decides everything from here
app.post('/api/triage', async (req, res) => {
    try {
        console.log('\n--- New Support Ticket Received ---');
        const ticketData = req.body;

        if (!ticketData || !ticketData.message)
            return res.status(400).json({ error: "Invalid data: 'message' is required." });

        console.log('Trigger fired. Payload:', ticketData);

        const context = buildContext();
        const result  = await SupportAgent.onTask(ticketData, context);

        res.status(200).json(result);
    } catch (error) {
        console.error('Pipeline failed:', error.message);
        res.status(500).json({ error: 'Pipeline execution failed.' });
    }
});

app.listen(PORT, () => {
    console.log(`\n[Antigravity Runtime] Agent: ${SupportAgent.metadata.name} v${SupportAgent.metadata.version}`);
    console.log(`✅ Server running at: http://localhost:${PORT}`);
    console.log(`🌐 Support Form UI:   http://localhost:${PORT}/support`);
    console.log(`🔗 Webhook Endpoint:  POST http://localhost:${PORT}/api/triage`);
});
