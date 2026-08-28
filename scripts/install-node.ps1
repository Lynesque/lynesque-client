$ErrorActionPreference = 'Stop'

try {
    Write-Host 'Finding the current Node.js LTS release...'
    $releases = Invoke-RestMethod -Uri 'https://nodejs.org/dist/index.json'
    $release = $releases | Where-Object { $_.lts -and ($_.files -contains 'win-x64-msi') } | Select-Object -First 1
    if (-not $release) { throw 'No Windows x64 LTS installer was listed by nodejs.org.' }

    $version = $release.version
    $installer = Join-Path $env:TEMP "node-$version-x64.msi"
    $url = "https://nodejs.org/dist/$version/node-$version-x64.msi"
    Write-Host "Downloading Node.js $version from nodejs.org..."
    Invoke-WebRequest -Uri $url -OutFile $installer

    Write-Host 'Windows may ask for permission to install Node.js.'
    $process = Start-Process msiexec.exe -ArgumentList @('/i', $installer, '/passive', '/norestart') -Wait -PassThru
    Remove-Item $installer -Force -ErrorAction SilentlyContinue
    if ($process.ExitCode -notin @(0, 3010)) { throw "The Node.js installer returned exit code $($process.ExitCode)." }
    Write-Host 'Node.js installed successfully.'
} catch {
    Write-Error $_
    exit 1
}
