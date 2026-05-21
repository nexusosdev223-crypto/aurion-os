import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

const { Twilio } = twilio;
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhone = process.env.TWILIO_PHONE_NUMBER;

export async function POST(request: NextRequest) {
  if (!accountSid || !authToken || !fromPhone) {
    return NextResponse.json(
      { success: false, error: 'Twilio credentials not configured' },
      { status: 500 }
    );
  }

  try {
    const { to, message } = await request.json();

    if (!to || !message) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: to, message' },
        { status: 400 }
      );
    }

    const client = new Twilio(accountSid, authToken);

    const result = await client.messages.create({
      body: message,
      from: fromPhone,
      to: to
    });

    return NextResponse.json({
      success: true,
      sid: result.sid,
      message: 'SMS sent successfully'
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Failed to send SMS';
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}