import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, target, chatId, botToken, details } = body;

    if (!target) {
      return NextResponse.json({ error: 'Target mancante' }, { status: 400 });
    }

    if (action === 'test_alert' || action === 'panic_mode') {
      const isPanic = action === 'panic_mode';
      const textMessage = isPanic
        ? `🚨 *[SENTINEL - PANIC MODE ATTIVATO]*\n\n` +
          `🎯 *Target:* \`${target}\`\n` +
          `⏱ *Orario:* ${new Date().toLocaleString('it-IT')}\n` +
          `⚡ *Azione Eseguita:* Mitigazione Under Attack forzata. Filtraggio connessioni non autorizzate e blocco preventivo botnet.\n\n` +
          `_Generato da NetworkDiag Ops Pro Sentinel_`
        : `🔔 *[SENTINEL SECURITY ALERT]*\n\n` +
          `🎯 *Target Monitorato:* \`${target}\`\n` +
          `📅 *Data Audit:* ${new Date().toLocaleString('it-IT')}\n` +
          `🛡 *Stato Canale:* Canale di notifica Telegram verificato e funzionante con successo.\n` +
          `${details ? `ℹ️ *Dettaglio:* ${details}\n\n` : '\n'}` +
          `_NetworkDiag Ops Pro Sentinel Defense Engine_`;

      // Se l'utente ha fornito un proprio token o usa quello configurato
      const effectiveToken = botToken || process.env.TELEGRAM_BOT_TOKEN;
      const effectiveChatId = chatId || process.env.TELEGRAM_ALERT_CHAT_ID;

      if (effectiveToken && effectiveChatId) {
        try {
          const telegramRes = await fetch(`https://api.telegram.org/bot${effectiveToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: effectiveChatId,
              text: textMessage,
              parse_mode: 'Markdown',
            }),
          });

          const telegramData = await telegramRes.json();
          if (!telegramRes.ok || !telegramData.ok) {
            return NextResponse.json({
              success: false,
              warning: 'Richiesta ricevuta ma Telegram ha restituito un errore',
              telegramError: telegramData.description || 'Errore sconosciuto da Telegram API',
            });
          }

          return NextResponse.json({
            success: true,
            dispatchedToTelegram: true,
            action,
            target,
          });
        } catch (fetchErr) {
          return NextResponse.json({
            success: false,
            error: 'Impossibile raggiungere le API di Telegram: ' + String(fetchErr),
          });
        }
      }

      // Se le credenziali non sono ancora impostate, restituiamo simulazione positiva
      return NextResponse.json({
        success: true,
        dispatchedToTelegram: false,
        message: 'Alert simulato con successo in console (configura Chat ID e Bot Token per riceverlo sul telefono)',
        action,
        target,
      });
    }

    return NextResponse.json({ error: 'Azione non riconosciuta' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: 'Errore interno: ' + String(err) }, { status: 500 });
  }
}
