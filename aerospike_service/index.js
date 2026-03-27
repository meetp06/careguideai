const express = require('express');
const Aerospike = require('aerospike');

const app = express();
const cors = require('cors');
app.use(cors());
app.use(express.json());

require('dotenv').config({ path: '../.env' });
const Bland = require("bland-client-js-sdk");
const bland = new Bland({
  admin: { apiKey: process.env.BLAND_API_KEY },
  webchat: {}
});

app.post("/api/agent-authorize", async (req, res) => {
  try {
    const agentId = req.body?.agentId;
    if (!agentId) return res.status(400).json({ error: "missing agentId" });

    const admin = await bland.AdminClient();
    const session = await admin.sessions.create({ agentId });
    res.json({ token: session.token });
  } catch (err) {
    console.error("Bland API Error:", err);
    res.status(500).json({ error: err.message || "internal error" });
  }
});

// For a local hackathon demo, we'll try to connect to a local Aerospike or just mock the interface if it's not running
let client = null;

async function connectAerospike() {
  try {
    client = await Aerospike.connect({
      hosts: '127.0.0.1:3000',
      connTimeoutMs: 2000
    });
    console.log("Connected to Aerospike successfully!");
  } catch (err) {
    console.log("Could not connect to Aerospike Daemon (expected if docker container not running). Running in fallback in-memory mode.");
  }
}

connectAerospike();

const memoryFallback = new Map();

app.post('/session', async (req, res) => {
  const { sessionId, transcript, state } = req.body;
  if (!sessionId) return res.status(400).send({error: 'sessionId required'});

  const dataToStore = { transcript, state: state || 'active' };

  if (client && client.isConnected()) {
    try {
      const key = new Aerospike.Key('test', 'sessions', sessionId);
      await client.put(key, dataToStore);
      return res.send({ success: true, backend: 'aerospike' });
    } catch (e) {
      console.error("Aerospike put error:", e);
      return res.status(500).send({ error: e.message });
    }
  } else {
    memoryFallback.set(sessionId, dataToStore);
    return res.send({ success: true, backend: 'memory_fallback' });
  }
});

app.get('/session/:id', async (req, res) => {
  const sessionId = req.params.id;
  if (client && client.isConnected()) {
    try {
      const key = new Aerospike.Key('test', 'sessions', sessionId);
      const record = await client.get(key);
      return res.send(record.bins);
    } catch (e) {
      return res.status(404).send({ error: 'Session not found in Aerospike' });
    }
  } else {
    const data = memoryFallback.get(sessionId);
    if (data) return res.send(data);
    return res.status(404).send({ error: 'Session not found in fallback memory' });
  }
});

// ─── Bland AI Phone Intake: call user to collect symptoms ───
app.post('/api/phone-intake', async (req, res) => {
  try {
    const BLAND_API_KEY = process.env.BLAND_API_KEY;
    if (!BLAND_API_KEY) return res.status(500).json({ error: 'BLAND_API_KEY not configured' });

    const phoneNumber = req.body.phoneNumber || '+12017257992'; // default to user's number

    const response = await fetch('https://api.bland.ai/v1/calls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': BLAND_API_KEY },
      body: JSON.stringify({
        phone_number: phoneNumber,
        task: `You are a medical intake AI assistant for CareGuide AI. Your job is to ask the patient about their symptoms. Ask: 1) What symptoms are you experiencing? 2) How long have you had them? 3) How severe are they on a scale of 1-10? 4) Any other relevant details? Be warm, professional, and concise. After collecting all information, thank them and say their symptoms will be analyzed by our medical AI agents.`,
        voice: 'nat',
        max_duration: 3,
        record: true,
        wait_for_greeting: true,
        first_sentence: 'Hi! This is CareGuide AI. I am going to ask you a few questions about your symptoms so our medical agents can help. What symptoms are you experiencing?'
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.message || 'Call failed' });

    // Store call ID for polling
    const intakeData = { callId: data.call_id, status: 'in_progress', transcript: null, timestamp: new Date().toISOString() };
    memoryFallback.set(`intake_${data.call_id}`, intakeData);

    console.log(`📞 Phone intake call dispatched. Call ID: ${data.call_id}`);
    res.json({ success: true, callId: data.call_id });
  } catch (err) {
    console.error('Phone intake error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/phone-intake/:callId', async (req, res) => {
  try {
    const BLAND_API_KEY = process.env.BLAND_API_KEY;
    const { callId } = req.params;

    // Check Bland API for call status and transcript
    const response = await fetch(`https://api.bland.ai/v1/calls/${callId}`, {
      headers: { 'Authorization': BLAND_API_KEY }
    });
    const data = await response.json();

    if (data.status === 'completed' && data.concatenated_transcript) {
      res.json({ status: 'completed', transcript: data.concatenated_transcript });
    } else {
      res.json({ status: data.status || 'in_progress', transcript: null });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Real Booking: Bland AI dispatches an actual phone call ───
app.post('/api/book-appointment', async (req, res) => {
  try {
    const { phoneNumber, patientName, doctorName, specialty } = req.body;
    if (!phoneNumber || !doctorName) {
      return res.status(400).json({ error: 'phoneNumber and doctorName are required' });
    }

    const BLAND_API_KEY = process.env.BLAND_API_KEY;
    if (!BLAND_API_KEY) {
      return res.status(500).json({ error: 'BLAND_API_KEY not configured' });
    }

    // Use Bland AI Send Call API to dispatch a real phone call
    const response = await fetch('https://api.bland.ai/v1/calls', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': BLAND_API_KEY
      },
      body: JSON.stringify({
        phone_number: phoneNumber,
        task: `You are a friendly medical receptionist from CareGuide AI calling to confirm an appointment. The patient's name is ${patientName || 'the patient'}. They have been matched with ${doctorName}, a ${specialty || 'specialist'}, based on their symptoms. Greet them warmly, confirm the doctor's name and specialty, let them know the office will reach out within 24 hours to schedule the exact time, and wish them well. Keep the call brief and professional — under 60 seconds.`,
        voice: 'nat',
        max_duration: 2,
        record: true,
        wait_for_greeting: true,
        first_sentence: `Hi ${patientName || 'there'}! This is CareGuide AI calling to confirm your appointment request with ${doctorName}.`
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Bland Call API error:', data);
      return res.status(response.status).json({ error: data.message || 'Failed to dispatch call' });
    }

    console.log(`✅ Real call dispatched to ${phoneNumber} for Dr. ${doctorName}. Call ID: ${data.call_id}`);

    // Also store this booking in session state (Aerospike or fallback)
    const bookingKey = `booking_${Date.now()}`;
    const bookingData = { phoneNumber, patientName, doctorName, specialty, callId: data.call_id, timestamp: new Date().toISOString() };
    if (client && client.isConnected()) {
      const key = new Aerospike.Key('test', 'bookings', bookingKey);
      await client.put(key, bookingData);
    } else {
      memoryFallback.set(bookingKey, bookingData);
    }

    res.json({ success: true, callId: data.call_id, message: `Call dispatched to ${phoneNumber}` });
  } catch (err) {
    console.error('Book appointment error:', err);
    res.status(500).json({ error: err.message || 'internal error' });
  }
});

app.listen(8001, () => console.log('Aerospike Active Session Service running on port 8001'));
