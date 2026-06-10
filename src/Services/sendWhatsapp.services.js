import twilio from "twilio";

// Make sure these are in your .env file
// TWILIO_ACCOUNT_SID=your_account_sid
// TWILIO_AUTH_TOKEN=your_auth_token
// TWILIO_WHATSAPP_FROM=whatsapp:+14155238886  (Twilio sandbox number)

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM;

// Check if Twilio is configured
const isTwilioConfigured = accountSid && authToken && whatsappFrom;

let client = null;
if (isTwilioConfigured) {
  client = twilio(accountSid, authToken);
}

/**
 * Send WhatsApp message
 * @param {string} to - Recipient phone in format: whatsapp:+<countrycode><number>
 * @param {string} body - Message text
 */
export const sendWhatsApp = async (to, body) => {
  try {
    // Check if Twilio is configured
    if (!isTwilioConfigured) {
      console.log("Twilio not configured, skipping WhatsApp message");
      return { success: true, skipped: true, reason: "Twilio not configured" };
    }

    const message = await client.messages.create({
      from: whatsappFrom,
      to,
      body,
    });

    console.log("WhatsApp sent, SID:", message.sid);
    return { success: true, sid: message.sid };
  } catch (error) {
    console.error("Failed to send WhatsApp:", error.message || error);
    return { success: false, error: error.message || error };
  }
};
