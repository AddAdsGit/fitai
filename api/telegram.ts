export default async function handler(req: any, res: any) {
  if (req.method === 'POST') {
    try {
      const update = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const msg = update?.message || update?.edited_message;
      if (msg && msg.chat && msg.chat.id) {
        const chatId = msg.chat.id;
        const firstName = msg.from?.first_name || 'Friend';
        const replyText = `👋 *Welcome to FitAI, ${firstName}*!\n\n` +
          `🔑 *Your Telegram Chat ID is:*\n\`${chatId}\`\n\n` +
          `_(Tap the number above to copy it)_\n\n` +
          `📌 *How to connect:*\n` +
          `1. Copy your Chat ID ${chatId}\n` +
          `2. Open *FitAI Settings → Telegram Weekly Digest*\n` +
          `3. Paste your Chat ID!\n\n` +
          `You will receive your 7-day nutrition, calorie & macro progress digests here every Sunday evening! 🥗`;

        const botToken = '8900732368:AAHidykxbFWLDRYZBSYgQJhu1t3_VMUiPB8';
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: replyText,
            parse_mode: 'Markdown',
          }),
        });
      }
    } catch (e) {
      console.error('Webhook error:', e);
    }
    return res.status(200).send('OK');
  }
  return res.status(200).send('FitAI Telegram Webhook is active');
}
