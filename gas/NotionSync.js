/**
 * NotionSync.gs
 * Ruft täglich die Cloud Function notion-to-bq auf.
 *
 * Setup (einmalig in der Apps Script Console ausführen):
 *   1. Skript-Eigenschaften setzen: Datei → Projekteinstellungen → Skript-Eigenschaften
 *      FUNCTION_URL   = https://notion-to-bq-tmmn2n52pa-ey.a.run.app
 *      FUNCTION_SECRET = 3144f5bc6ad33596fb9005f93b7f1987825a84dcac9f45d2a1bf791d44be862e
 *   2. triggerInstallieren() einmalig ausführen → erstellt den täglichen Trigger
 */

// ─── Hauptfunktion (wird vom Trigger aufgerufen) ──────────────────────────────
function syncNotionToBigQuery() {
  var props  = PropertiesService.getScriptProperties();
  var url    = props.getProperty('FUNCTION_URL');
  var secret = props.getProperty('FUNCTION_SECRET');

  if (!url || !secret) {
    throw new Error('FUNCTION_URL oder FUNCTION_SECRET fehlt in den Skript-Eigenschaften!');
  }

  var options = {
    method: 'POST',
    headers: {
      'X-Function-Secret': secret,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify({ source: 'apps-script' }),
    muteHttpExceptions: true,
    followRedirects: true
  };

  Logger.log('Starte Notion → BigQuery Sync: ' + url);
  var response = UrlFetchApp.fetch(url, options);
  var code     = response.getResponseCode();
  var body     = response.getContentText();

  if (code === 200) {
    Logger.log('✓ Sync erfolgreich. Response: ' + body);
  } else {
    Logger.log('✗ Fehler HTTP ' + code + ': ' + body);
    throw new Error('Cloud Function Fehler HTTP ' + code + ': ' + body);
  }
}

// ─── Trigger einmalig installieren (täglich 06:00 Uhr) ───────────────────────
function triggerInstallieren() {
  // Bestehende Trigger entfernen (Duplikate vermeiden)
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'syncNotionToBigQuery') {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger('syncNotionToBigQuery')
    .timeBased()
    .everyDays(1)
    .atHour(6)
    .create();

  Logger.log('✓ Täglicher Trigger um 06:00 Uhr installiert.');
}

// ─── Trigger entfernen ────────────────────────────────────────────────────────
function triggerEntfernen() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'syncNotionToBigQuery') {
      ScriptApp.deleteTrigger(t);
      Logger.log('Trigger entfernt: ' + t.getUniqueId());
    }
  });
}
