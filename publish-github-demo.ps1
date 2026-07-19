$ErrorActionPreference = "Stop"

$repository = "bayisa2022/hydro-omms-demo"
$pagesUrl = "https://bayisa2022.github.io/hydro-omms-demo/"

$ghCommand = Get-Command gh -ErrorAction SilentlyContinue
$ghPath = if ($ghCommand) { $ghCommand.Source } else { "C:\Program Files\GitHub CLI\gh.exe" }

if (-not (Test-Path -LiteralPath $ghPath)) {
  throw "GitHub CLI is not installed. Open PowerShell as Administrator and run: choco install gh -y"
}

$env:PATH = "$(Split-Path -Parent $ghPath);$env:PATH"

& $ghPath auth status
if ($LASTEXITCODE -ne 0) {
  Write-Host "Sign in to GitHub before publishing."
  & $ghPath auth login
  if ($LASTEXITCODE -ne 0) { throw "GitHub authentication was not completed." }
}

if (-not (Test-Path -LiteralPath ".git")) {
  & git init -b main
}

& npm test
if ($LASTEXITCODE -ne 0) { throw "Demo verification failed. Nothing was published." }

$previousErrorPreference = $ErrorActionPreference
try {
  # A missing repository is expected on the first publish. Do not let gh stderr
  # terminate the script before the repository-creation branch can run.
  $ErrorActionPreference = "SilentlyContinue"
  & $ghPath repo view $repository --json nameWithOwner 2>$null | Out-Null
  $repositoryExists = $LASTEXITCODE -eq 0
} finally {
  $ErrorActionPreference = $previousErrorPreference
}

if (-not $repositoryExists) {
  & $ghPath repo create $repository --public --description "Sanitized public demonstration of the Hydro OMMS"
  if ($LASTEXITCODE -ne 0) { throw "GitHub repository creation failed." }
}

$expectedOrigin = "https://github.com/$repository.git"
$safeDirectory = (Get-Location).Path -replace '\\', '/'
$previousErrorPreference = $ErrorActionPreference
try {
  $ErrorActionPreference = "SilentlyContinue"
  $origin = (& git -c "safe.directory=$safeDirectory" remote get-url origin 2>$null)
} finally {
  $ErrorActionPreference = $previousErrorPreference
}
if ($origin) {
  & git -c "safe.directory=$safeDirectory" remote set-url origin $expectedOrigin
} else {
  & git -c "safe.directory=$safeDirectory" remote add origin $expectedOrigin
}

$token = (& $ghPath auth token)
if ($LASTEXITCODE -ne 0 -or -not $token) { throw "GitHub CLI token is unavailable." }

$basicAuth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("x-access-token:$token"))
$gitEnvironment = @{
  GIT_CONFIG_COUNT = "3"
  GIT_CONFIG_KEY_0 = "safe.directory"
  GIT_CONFIG_VALUE_0 = $safeDirectory
  GIT_CONFIG_KEY_1 = "http.sslBackend"
  GIT_CONFIG_VALUE_1 = "openssl"
  GIT_CONFIG_KEY_2 = "http.extraHeader"
  GIT_CONFIG_VALUE_2 = "Authorization: Basic $basicAuth"
  GIT_TERMINAL_PROMPT = "0"
}

try {
  foreach ($entry in $gitEnvironment.GetEnumerator()) {
    [Environment]::SetEnvironmentVariable($entry.Key, $entry.Value, "Process")
  }
  & git push -u origin main
  $pushExitCode = $LASTEXITCODE
} finally {
  foreach ($name in $gitEnvironment.Keys) {
    [Environment]::SetEnvironmentVariable($name, $null, "Process")
  }
  $gitEnvironment.Clear()
  $token = $null
  $basicAuth = $null
}

if ($pushExitCode -ne 0) { throw "GitHub push failed." }

Write-Host "Repository: https://github.com/$repository"
Write-Host "GitHub Pages deployment started: $pagesUrl"
Write-Host "The first deployment can take several minutes."
