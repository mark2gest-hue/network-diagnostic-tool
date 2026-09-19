import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function recordDiagnosticDemo() {
  const outputDir = path.join(process.cwd(), 'recordings');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('🚀 Avvio browser per registrazione video...');
  const browser = await chromium.launch({
    headless: true // gira in background senza aprire finestre visibili
  });

  // Crea contesto con registrazione video a 1920x1080
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: outputDir,
      size: { width: 1920, height: 1080 }
    }
  });

  const page = await context.newPage();

  console.log('🌐 Navigazione su Network Diagnostic Tool (http://localhost:3004)...');
  await page.goto('http://localhost:3004', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // 1. Zoom/Focus sull'input del target
  console.log('🎯 Inserimento target di test: bot.mark2.cloud...');
  const inputSelector = 'input[placeholder*="Inserisci dominio"]';
  await page.waitForSelector(inputSelector);
  await page.click(inputSelector);
  await page.fill(inputSelector, '');
  await page.type(inputSelector, 'bot.mark2.cloud', { delay: 100 });
  await page.waitForTimeout(1000);

  // 2. Clic su "Esegui Tutti (12)"
  console.log('⚡ Lancio della suite diagnostica...');
  const runButton = page.locator('button:has-text("Esegui Tutti")');
  await runButton.click();

  // 3. Attesa dei test telemetrici con scrolling fluido per mostrare le card
  console.log('📊 Acquisizione risultati telemetrici in tempo reale...');
  for (let i = 0; i < 8; i++) {
    await page.mouse.wheel(0, 150);
    await page.waitForTimeout(1200);
  }

  // Risalita fluida
  for (let i = 0; i < 4; i++) {
    await page.mouse.wheel(0, -300);
    await page.waitForTimeout(800);
  }

  // 4. Navigazione nei tab avanzati: Security Audit
  console.log('🛡️ Navigazione su Security Audit...');
  const securityTab = page.locator('button:has-text("Security Audit")');
  if (await securityTab.count() > 0) {
    await securityTab.click();
    await page.waitForTimeout(2500);
    await page.mouse.wheel(0, 200);
    await page.waitForTimeout(1500);
  }

  // 5. Navigazione su Vulnerability Scan
  console.log('🔥 Navigazione su Vulnerability Scan...');
  const vulnTab = page.locator('button:has-text("Vulnerabilità")');
  if (await vulnTab.count() > 0) {
    await vulnTab.click();
    await page.waitForTimeout(2500);
  }

  // Ritorno su Suite Esterna
  const externalTab = page.locator('button:has-text("Diagnostica Esterna")');
  if (await externalTab.count() > 0) {
    await externalTab.click();
    await page.waitForTimeout(1500);
  }

  console.log('💾 Chiusura pagina e salvataggio file video...');
  await page.close();
  await context.close();
  await browser.close();

  // Trova il file video appena generato
  const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.webm'));
  if (files.length > 0) {
    const latestVideo = path.join(outputDir, files[files.length - 1]);
    const finalName = path.join(outputDir, 'demo_diagnostic_tool_playwright.webm');
    fs.renameSync(latestVideo, finalName);
    console.log(`✅ VIDEO COMPLETATO CON SUCCESSO!`);
    console.log(`📁 Percorso video: ${finalName}`);
  }
}

recordDiagnosticDemo().catch(err => {
  console.error('❌ Errore durante la registrazione video:', err);
  process.exit(1);
});
