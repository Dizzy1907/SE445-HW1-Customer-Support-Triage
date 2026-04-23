/**
 * CRM Triage Agent — Antigravity Pure Module v3.0.0
 *
 * Real LLM-driven agent using Groq tool calling.
 * The LLM decides which tools to invoke — not hardcoded if/else.
 */

const SupportAgent = {

    metadata: {
        name: "CRM_Triage_Agent",
        version: "3.0.0",
        description: "LLM-driven triage agent. Uses Groq tool calling for autonomous decisions.",
        author: "SE445"
    },

    tools: {

        update_crm_sheet: {
            definition: "Logs ticket to Google Sheets CRM.",
            functionDefinition: {
                name: "update_crm_sheet",
                description: "Always call this FIRST to log the ticket to the Google Sheets CRM. No arguments needed.",
                parameters: { type: "object", properties: {} }
            },
            handler: async (args, context) => {
                const ticket = context.currentTicket;
                try {
                    const { google } = context.libs;
                    const auth = new google.auth.GoogleAuth({
                        keyFile: 'credentials.json',
                        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
                    });
                    const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });
                    await sheets.spreadsheets.values.append({
                        spreadsheetId: context.env.SPREADSHEET_ID || '1E-9ap6-Un5IRfNPsB_Ll1GwpCBfVFp_iru5QbPsUQEk',
                        range: 'A:F',
                        valueInputOption: 'USER_ENTERED',
                        resource: {
                            values: [[ticket.ticketId, ticket.receivedAt, ticket.customerName, ticket.email, ticket.message, ticket.source]]
                        }
                    });
                    return { status: "success", id: ticket.ticketId, message: `Ticket ${ticket.ticketId} logged to CRM.` };
                } catch (error) {
                    console.error("[update_crm_sheet] Failed:", error.message);
                    return { status: "error", id: ticket.ticketId, error: error.message };
                }
            }
        },

        send_auto_reply: {
            definition: "Sends acknowledgment email to the customer.",
            functionDefinition: {
                name: "send_auto_reply",
                description: "Always call this SECOND to send an acknowledgment email to the customer. No arguments needed.",
                parameters: { type: "object", properties: {} }
            },
            handler: async (args, context) => {
                const ticket = context.currentTicket;
                console.log(`[send_auto_reply] Acknowledging ${ticket.email} for Ticket ${ticket.ticketId}`);
                const body = `Hi ${ticket.customerName},\n\nWe received your ticket (${ticket.ticketId}).\nOur team will review it shortly.\n\nMessage: "${ticket.message}"\n\nThanks,\nSupport Team`;
                if (context.transporter) {
                    try {
                        await context.transporter.sendMail({
                            from: `"Support Team" <${context.env.EMAIL_USER}>`,
                            to: ticket.email,
                            subject: `Ticket Received: ${ticket.ticketId}`,
                            text: body
                        });
                        return { status: "sent", message: `Auto-reply sent to ${ticket.email} via Nodemailer` };
                    } catch (err) {
                        console.error("[send_auto_reply] Failed:", err.message);
                    }
                }
                await new Promise(r => setTimeout(r, 300));
                return { status: "simulated", message: `[SIMULATED] Auto-reply sent to ${ticket.email}` };
            }
        },

        notify_urgent_channels: {
            definition: "Alerts the team for high-urgency tickets.",
            functionDefinition: {
                name: "notify_urgent_channels",
                description: "Call this for HIGH urgency or critical tickets requiring immediate team attention.",
                parameters: {
                    type: "object",
                    properties: {
                        reasoning:         { type: "string", description: "Why this ticket is urgent." },
                        sentiment:         { type: "string", enum: ["Positive", "Neutral", "Negative"] },
                        urgency:           { type: "string", enum: ["High", "Low"] },
                        suggestedResponse: { type: "string", description: "Short empathetic reply for the agent." }
                    },
                    required: ["reasoning", "suggestedResponse", "urgency"]
                }
            },
            handler: async (args, context) => {
                const ticket = context.currentTicket;
                console.log(`[notify_urgent_channels] 🚨 URGENT alert for Ticket ${ticket.ticketId}`);
                console.log(`  Reasoning: ${args.reasoning}`);
                console.log(`  Suggested Reply: ${args.suggestedResponse}`);
                await new Promise(r => setTimeout(r, 300));
                return {
                    status: "notified",
                    channel: "Urgent",
                    ticketId: ticket.ticketId,
                    sentiment: args.sentiment || "Negative",
                    urgency: args.urgency,
                    suggestedResponse: args.suggestedResponse,
                    message: `Urgent channels notified for ${ticket.ticketId}`
                };
            }
        },

        send_escalation_email: {
            definition: "Escalates ticket to human support agents via email.",
            functionDefinition: {
                name: "send_escalation_email",
                description: "Call this for tickets with NEGATIVE sentiment (but not high urgency) to escalate to the human support team.",
                parameters: {
                    type: "object",
                    properties: {
                        reasoning:         { type: "string", description: "Why this ticket needs escalation." },
                        sentiment:         { type: "string", enum: ["Positive", "Neutral", "Negative"] },
                        urgency:           { type: "string", enum: ["High", "Low"] },
                        suggestedResponse: { type: "string", description: "Short empathetic reply for the agent." }
                    },
                    required: ["reasoning", "suggestedResponse"]
                }
            },
            handler: async (args, context) => {
                const ticket = context.currentTicket;
                const targetEmail = "escalations@support.com";
                console.log(`[send_escalation_email] Routing ${ticket.ticketId} → ${targetEmail}`);
                const body = `Ticket: ${ticket.ticketId}\nFrom: ${ticket.customerName} (${ticket.email})\nMessage: ${ticket.message}\nReasoning: ${args.reasoning}\nSuggested Reply: ${args.suggestedResponse}`;
                if (context.transporter) {
                    try {
                        await context.transporter.sendMail({
                            from: `"Support Flow" <${context.env.EMAIL_USER}>`,
                            to: targetEmail,
                            subject: `Support Escalation: Ticket ${ticket.ticketId}`,
                            text: body
                        });
                        return { status: "sent", channel: "Escalation", ticketId: ticket.ticketId, sentiment: args.sentiment, urgency: args.urgency || "Low", suggestedResponse: args.suggestedResponse, message: `Escalation email sent to ${targetEmail}` };
                    } catch (err) {
                        console.error("[send_escalation_email] Failed:", err.message);
                    }
                }
                await new Promise(r => setTimeout(r, 300));
                return { status: "simulated", channel: "Escalation", ticketId: ticket.ticketId, sentiment: args.sentiment, urgency: args.urgency || "Low", suggestedResponse: args.suggestedResponse, message: `[SIMULATED] Escalation to ${targetEmail}` };
            }
        },

        send_standard_email: {
            definition: "Routes ticket to the general support queue.",
            functionDefinition: {
                name: "send_standard_email",
                description: "Call this for routine, standard tickets with no urgent or clearly negative classification.",
                parameters: {
                    type: "object",
                    properties: {
                        reasoning:         { type: "string", description: "Why this ticket is routine." },
                        sentiment:         { type: "string", enum: ["Positive", "Neutral", "Negative"] },
                        urgency:           { type: "string", enum: ["High", "Low"] },
                        suggestedResponse: { type: "string", description: "Short empathetic reply for the agent." }
                    },
                    required: ["reasoning", "suggestedResponse"]
                }
            },
            handler: async (args, context) => {
                const ticket = context.currentTicket;
                const targetEmail = "general@support.com";
                console.log(`[send_standard_email] Routing ${ticket.ticketId} → ${targetEmail}`);
                const body = `Ticket: ${ticket.ticketId}\nFrom: ${ticket.customerName} (${ticket.email})\nMessage: ${ticket.message}\nSuggested Reply: ${args.suggestedResponse}`;
                if (context.transporter) {
                    try {
                        await context.transporter.sendMail({
                            from: `"Support Flow" <${context.env.EMAIL_USER}>`,
                            to: targetEmail,
                            subject: `Support Ticket: ${ticket.ticketId}`,
                            text: body
                        });
                        return { status: "sent", channel: "Standard", ticketId: ticket.ticketId, sentiment: args.sentiment, urgency: args.urgency || "Low", suggestedResponse: args.suggestedResponse, message: `Standard email sent to ${targetEmail}` };
                    } catch (err) {
                        console.error("[send_standard_email] Failed:", err.message);
                    }
                }
                await new Promise(r => setTimeout(r, 300));
                return { status: "simulated", channel: "Standard", ticketId: ticket.ticketId, sentiment: args.sentiment, urgency: args.urgency || "Low", suggestedResponse: args.suggestedResponse, message: `[SIMULATED] Standard email to ${targetEmail}` };
            }
        }

    },

    // ─── Agent Lifecycle ─────────────────────────────────────────────────────────
    async onTask(input, context) {
        // Step 1: Normalize raw input into a structured ticket
        const ticket = await context.nodes.process(input);

        // Step 2: Hand off to the LLM agent loop — the LLM decides everything from here
        return await context.agentLoop(ticket);
    }

};

module.exports = SupportAgent;
