# deploy-notion-to-bq.ps1
# Liest Umgebungsvariablen aus .env und deployt die Cloud Function

# ── .env einlesen ─────────────────────────────────────────────────────────────
$envFile = Join-Path $PSScriptRoot ".env"
$envVars = @{}
Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and $line -notmatch '^\s*#') {
        $parts = $line -split '=', 2
        if ($parts.Count -eq 2) {
            $envVars[$parts[0].Trim()] = $parts[1].Trim()
        }
    }
}

# ── Relevante Variablen für notion-to-bq ─────────────────────────────────────
$vars = [ordered]@{
    NOTION_TOKEN          = $envVars["NOTION_TOKEN"]
    NOTION_DATA_SOURCE_ID = $envVars["NOTION_DATA_SOURCE_ID"]
    NOTION_VERSION        = $envVars["NOTION_VERSION"]
    BQ_PROJECT_ID         = $envVars["BQ_PROJECT_ID"]
    BQ_DATASET            = $envVars["BQ_DATASET"]
    BQ_LOCATION           = if ($envVars["BQ_LOCATION"]) { $envVars["BQ_LOCATION"] } else { "EU" }
}

# GOOGLE_APPLICATION_CREDENTIALS nur wenn gesetzt
if ($envVars["GOOGLE_APPLICATION_CREDENTIALS"]) {
    $vars["GOOGLE_APPLICATION_CREDENTIALS"] = $envVars["GOOGLE_APPLICATION_CREDENTIALS"]
}

# Optionale Variablen
foreach ($key in @("CONCURRENCY", "BQ_BATCH_SIZE", "MAX_PAGES")) {
    if ($envVars[$key]) { $vars[$key] = $envVars[$key] }
}

# ── --set-env-vars String bauen ───────────────────────────────────────────────
$setEnvVars = ($vars.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join ","

Write-Host "Deploying notion-to-bq with environment variables from .env ..." -ForegroundColor Cyan
Write-Host "  BQ_PROJECT_ID : $($vars['BQ_PROJECT_ID'])"
Write-Host "  BQ_DATASET    : $($vars['BQ_DATASET'])"
Write-Host "  DATABASE_ID   : $($vars['NOTION_DATA_SOURCE_ID'])"
Write-Host ""

# ── gcloud deploy ─────────────────────────────────────────────────────────────
gcloud functions deploy notion-to-bq `
    --gen2 `
    --runtime=nodejs20 `
    --region=europe-west3 `
    --source=. `
    --entry-point=notionToBq `
    --trigger-http `
    --no-allow-unauthenticated `
    --timeout=540s `
    --memory=512MB `
    --set-env-vars="$setEnvVars"
