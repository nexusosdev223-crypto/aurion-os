#!/usr/bin/env node

/**
 * Script to send SMS via Twilio using environment variables.
 */

import 'dotenv/config';
import twilio from 'twilio';

const { Twilio } = twilio;

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhone = process.env.TWILIO_PHONE_NUMBER;

function sendSMS(to: string, message: string) {
  if (!accountSid || !authToken || !fromPhone) {
    console.error('Missing Twilio credentials in .env.local');
    console.error(
      '  TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER'
    );
    process.exit(1);
  }

  const client = new Twilio(accountSid, authToken);

  client.messages
    .create({ body: message, from: fromPhone, to })
    .then((result: { sid: string }) => {
      console.log(`SMS sent! SID: ${result.sid}`);
    })
    .catch((err: unknown) => {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`Failed to send SMS: ${errMsg}`);
      process.exit(1);
    });
}

const message = process.argv[2] || 'hi';
const to = process.argv[3] || process.env.SMS_TO || '3472495985';

sendSMS(to, message);
