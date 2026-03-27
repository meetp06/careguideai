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
