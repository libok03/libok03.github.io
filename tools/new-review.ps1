param(
  [Parameter(Mandatory=$true)][ValidatePattern('^[a-z0-9]+(?:-[a-z0-9]+)*$')][string]$Slug,
  [Parameter(Mandatory=$true)][ValidateNotNullOrEmpty()][string]$Title,
  [switch]$NoOpen
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$postPath = Join-Path $projectRoot "posts/$Slug"
$notePath = Join-Path $projectRoot "notes/$Slug.md"
if ((Test-Path -LiteralPath $postPath) -or (Test-Path -LiteralPath $notePath)) { throw 'This review already exists. Choose another slug.' }
$utf8 = New-Object System.Text.UTF8Encoding($false)
$date = [TimeZoneInfo]::ConvertTimeBySystemTimeZoneId([DateTime]::UtcNow, 'Korea Standard Time').ToString('yyyy-MM-dd')
# JSON quoted strings are valid YAML and safely preserve quotes in titles.
$quotedTitle = ConvertTo-Json -InputObject $Title -Compress
$template = [IO.File]::ReadAllText((Join-Path $projectRoot 'templates/paper-review/index.qmd'))
$template = $template.Replace('"__TITLE__"', $quotedTitle).Replace('__DATE__', $date)
$note = [IO.File]::ReadAllText((Join-Path $projectRoot 'templates/paper-review/notes.md')).Replace('__TITLE__', $Title)
New-Item -ItemType Directory -Path $postPath, (Join-Path $postPath 'figures'), (Join-Path $postPath 'code'), (Join-Path $projectRoot 'notes') -Force | Out-Null
[IO.File]::WriteAllText((Join-Path $postPath 'index.qmd'), $template, $utf8)
[IO.File]::WriteAllText((Join-Path $postPath 'references.bib'), '', $utf8)
[IO.File]::WriteAllText($notePath, $note, $utf8)
Write-Host "Created: $postPath/index.qmd"
Write-Host "Private notes: $notePath"
$quartoPath = Join-Path $projectRoot '.tools/bin/quarto.exe'
if (Test-Path -LiteralPath $quartoPath) {
  Push-Location $projectRoot
  try {
    & $quartoPath render "posts/$Slug/index.qmd" --profile preview
    if ($LASTEXITCODE -ne 0) { throw 'Review files were created, but preview rendering failed.' }
  } finally { Pop-Location }
}
if (-not $NoOpen) { & code -r (Join-Path $postPath 'index.qmd') $notePath }
