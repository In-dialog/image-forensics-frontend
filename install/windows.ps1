[CmdletBinding()]
param(
    [ValidateSet('install', 'start')][string]$Action = 'install',
    [switch]$DryRun,
    [switch]$Preflight,
    [switch]$NoPause,
    [switch]$NoBrowser
)
$ErrorActionPreference = 'Stop'
$projectDirectory = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$runtimeDirectory = Join-Path $projectDirectory '.runtime'
$nodeDirectory = Join-Path $runtimeDirectory 'node'
$temporaryDirectory = $null
$resultCode = 0

function Assert-PrivateRuntime {
    foreach ($directory in @($runtimeDirectory, $nodeDirectory, (Join-Path $runtimeDirectory 'npm-cache'))) {
        $item = Get-Item -LiteralPath $directory -Force -ErrorAction SilentlyContinue
        if ($item -and (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -or -not $item.PSIsContainer)) {
            throw "Unsafe runtime location: $directory must be an ordinary directory, not a link or file. Move the link yourself and retry; its contents were not changed."
        }
    }
}

function Test-NodeRuntime([string]$Executable) {
    if (-not $Executable -or -not (Test-Path -LiteralPath $Executable -PathType Leaf)) { return $false }
    try {
        & $Executable -e "const fs=require('fs'),p=require('path');const d=p.dirname(process.execPath);process.exit(process.versions.node.split('.')[0]==='24'&&fs.existsSync(p.join(d,'node_modules/npm/bin/npm-cli.js'))?0:1)" 2>$null
        return $LASTEXITCODE -eq 0
    } catch { return $false }
}

function Remove-InstallerTemporary([string]$Directory) {
    if (-not $Directory -or -not (Test-Path -LiteralPath $Directory)) { return }
    Assert-PrivateRuntime
    $item = Get-Item -LiteralPath $Directory -Force
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Refusing to remove a linked temporary directory.' }
    $resolved = (Resolve-Path -LiteralPath $Directory).Path
    $expectedParent = [IO.Path]::GetFullPath($runtimeDirectory)
    if ([IO.Path]::GetDirectoryName($resolved) -ne $expectedParent -or [IO.Path]::GetFileName($resolved) -notlike 'download-*') {
        throw 'Refusing to remove a directory outside the installer temporary folder.'
    }
    Remove-Item -LiteralPath $resolved -Recurse -Force
}

try {
    if ($Action -eq 'start' -and -not $DryRun -and -not $Preflight) {
        . (Join-Path $PSScriptRoot '..\scripts\windows_process_job.ps1')
        Enable-LauncherProcessCleanup
    }
    Assert-PrivateRuntime
    Write-Host ''
    Write-Host 'IMAGE FORENSICS ANALYSIS - WEBSITE' -ForegroundColor Cyan
    Write-Host "Folder: $projectDirectory"
    if ([Environment]::OSVersion.Version.Major -lt 10) { throw 'Windows 10 or newer is required.' }
    $processor = if ($env:PROCESSOR_ARCHITEW6432) { $env:PROCESSOR_ARCHITEW6432 } else { $env:PROCESSOR_ARCHITECTURE }
    $architecture = switch ($processor.ToUpperInvariant()) {
        'AMD64' { 'x64' }
        'ARM64' { 'arm64' }
        default { throw 'A 64-bit Windows computer (Intel/AMD or ARM) is required.' }
    }
    Write-Host "Computer: Windows $architecture"
    $drive = [IO.DriveInfo]::new([IO.Path]::GetPathRoot($projectDirectory))
    $freeBytes = $drive.AvailableFreeSpace
    Write-Host ('Free disk: {0:N1} GB (allow at least 4 GB for installation)' -f ($freeBytes / 1GB))
    $nodeExecutable = Join-Path $nodeDirectory 'node.exe'
    if (-not (Test-NodeRuntime $nodeExecutable)) {
        $installed = Get-Command node.exe -ErrorAction SilentlyContinue
        $nodeExecutable = if ($installed -and (Test-NodeRuntime $installed.Source)) { $installed.Source } else { $null }
    }
    if ($DryRun -or $Preflight) {
        Write-Host ''
        Write-Host 'OFFLINE CHECK: no files changed, downloads, installations, or server starts.'
        if ($nodeExecutable) { Write-Host "Node.js 24 with npm: $nodeExecutable" }
        else { Write-Host "Node.js 24 will be downloaded from https://nodejs.org, checksum-verified, and kept in $nodeDirectory" }
        if ($Action -eq 'install') {
            Write-Host '1. Prepare Node.js 24 if needed (no administrator or Git required).'
            Write-Host '2. Install exact package-lock.json dependencies with npm ci.'
            Write-Host '3. Preserve saved data and local settings; build the local website.'
            Write-Host '4. Open Start.cmd when ready. Backend and AI models install separately.'
        } else { Write-Host 'Would start the installed website at http://127.0.0.1:3100.' }
        if ($freeBytes -lt 4GB) { Write-Host 'Not enough disk space for installation: move the folder to a drive with 4 GB free.' }
    } else {
        if (-not $nodeExecutable) {
            if ($Action -eq 'start') { throw 'The website runtime is not installed. Open Install.cmd first.' }
            if ($freeBytes -lt 4GB) { throw 'At least 4 GB free space is required. Move this folder to another drive, then run Install again.' }
            Write-Host '[Runtime] Downloading Node.js 24 LTS for this computer. No system installation is needed.'
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
            $ProgressPreference = 'SilentlyContinue'
            $manifest = (Invoke-WebRequest -Uri 'https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt' -UseBasicParsing).Content
            $pattern = '^([a-fA-F0-9]{64})\s+(node-(v24\.\d+\.\d+)-win-' + $architecture + '\.zip)\s*$'
            $matchesForPlatform = @($manifest -split "`n" | ForEach-Object {
                if ($_ -match $pattern) { [pscustomobject]@{ Hash=$Matches[1]; File=$Matches[2]; Version=$Matches[3] } }
            })
            if ($matchesForPlatform.Count -ne 1) { throw 'Could not identify one official Node.js archive for this computer. Try Install again later.' }
            $release = $matchesForPlatform[0]
            Assert-PrivateRuntime
            New-Item -ItemType Directory -Path $runtimeDirectory -Force | Out-Null
            $temporaryDirectory = Join-Path $runtimeDirectory ('download-' + [guid]::NewGuid().ToString('N'))
            New-Item -ItemType Directory -Path $temporaryDirectory | Out-Null
            $archive = Join-Path $temporaryDirectory $release.File
            Invoke-WebRequest -Uri "https://nodejs.org/dist/$($release.Version)/$($release.File)" -OutFile $archive -UseBasicParsing
            if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ne $release.Hash) {
                throw 'The Node.js download did not pass its checksum. Nothing was installed. Try Install again.'
            }
            Write-Host '[Runtime] Checksum verified. Preparing the private runtime.'
            Expand-Archive -LiteralPath $archive -DestinationPath $temporaryDirectory
            $expanded = Join-Path $temporaryDirectory ($release.File -replace '\.zip$', '')
            if (-not (Test-NodeRuntime (Join-Path $expanded 'node.exe'))) { throw 'The downloaded runtime could not run on this computer.' }
            Assert-PrivateRuntime
            if (Test-Path -LiteralPath $nodeDirectory) {
                $resolvedNode = (Resolve-Path -LiteralPath $nodeDirectory).Path
                if ($resolvedNode -ne [IO.Path]::GetFullPath((Join-Path $projectDirectory '.runtime\node'))) { throw 'Unexpected runtime location.' }
                Remove-Item -LiteralPath $resolvedNode -Recurse -Force
            }
            Move-Item -LiteralPath $expanded -Destination $nodeDirectory
            $nodeExecutable = Join-Path $nodeDirectory 'node.exe'
        }
        $setupArguments = @((Join-Path $PSScriptRoot 'setup.mjs'), $Action)
        if ($NoBrowser) { $setupArguments += '--no-browser' }
        & $nodeExecutable @setupArguments
        if ($LASTEXITCODE -ne 0) { throw 'The website setup did not finish. Read the message above, fix it, and run Install again.' }
    }
} catch {
    $resultCode = 1
    Write-Host "`nSETUP STOPPED: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    if ($temporaryDirectory) {
        try { Remove-InstallerTemporary $temporaryDirectory }
        catch { $resultCode = 1; Write-Host "Temporary files were left untouched: $($_.Exception.Message)" -ForegroundColor Yellow }
    }
}
if (-not $DryRun -and -not $Preflight -and -not $NoPause) {
    Write-Host ''
    Read-Host 'Press Enter to close this window' | Out-Null
}
exit $resultCode
