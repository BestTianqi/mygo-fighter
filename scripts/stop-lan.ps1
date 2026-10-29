[CmdletBinding()]
param(
    [ValidateRange(1, 65535)]
    [int]$Port = $(if ($env:PORT) { $env:PORT } else { 8080 })
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding

$projectRoot = Split-Path -Parent $PSScriptRoot
$runFile = Join-Path $projectRoot 'output\run\services.json'
$internalPorts = @(8079, 8091, 8092)
$mainClass = 'services.system.api.Main'

function Get-ProcessCommandLine {
    param([int]$ProcessId)
    try {
        $process = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction Stop
        if ($process) { return [string]$process.CommandLine }
    }
    catch {}
    try {
        # Windows PowerShell fallback when the CIM cmdlets are unavailable.
        $process = Get-WmiObject -Class Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction Stop
        if ($process) { return [string]$process.CommandLine }
    }
    catch {}
    return $null
}

function Get-PortProcessIds {
    param([int]$CandidatePort)
    @(
        # Native netstat avoids the slow NetTCPIP/CIM module startup on Windows.
        & "$env:SystemRoot\System32\netstat.exe" -ano -p tcp | ForEach-Object {
            $columns = $_.Trim() -split '\s+'
            if ($columns.Count -eq 5 -and $columns[0] -eq 'TCP' -and
                $columns[1].EndsWith(":$CandidatePort") -and $columns[3] -eq 'LISTENING') {
                [int]$columns[4]
            }
        } | Sort-Object -Unique
    )
}

function Test-MygoHealth {
    param([int]$CandidatePort)
    try {
        $health = Invoke-RestMethod -Uri "http://127.0.0.1:$CandidatePort/api/health" -TimeoutSec 3
        return $health.app -eq 'mygo-scala'
    }
    catch {
        return $false
    }
}

function Stop-TrackedServices {
    param([string]$Path)
    $raw = Get-Content -LiteralPath $Path -Raw
    if ([string]::IsNullOrWhiteSpace($raw)) { return 0 }
    $services = @(ConvertFrom-Json -InputObject $raw)
    $stopped = 0
    foreach ($service in $services) {
        $serverProcessId = 0
        try { $serverProcessId = [int]$service.pid } catch { continue }
        if ($serverProcessId -le 0) { continue }
        # Never kill a reused PID: only the process still running the staged
        # application main class belongs to this launcher.
        $commandLine = Get-ProcessCommandLine -ProcessId $serverProcessId
        if (-not $commandLine) { continue }
        if (-not $commandLine.Contains($mainClass)) { continue }
        $stopped++
        Stop-Process -Id $serverProcessId -ErrorAction SilentlyContinue
    }
    return $stopped
}

try {
    # The launcher records the three role PIDs; use them before touching ports
    # so an unrelated listener on a service port is never stopped.
    if (Test-Path -LiteralPath $runFile) {
        $stopped = Stop-TrackedServices -Path $runFile
        Remove-Item -LiteralPath $runFile -Force -ErrorAction SilentlyContinue
        if ($stopped -gt 0) {
            Write-Host "本地联机服务已关闭（入口/大厅/房间共 $stopped 个进程）。" -ForegroundColor Green
            exit 0
        }
    }

    # Fallback for older launchers or stale records: find listeners on the
    # service ports. Public ports require the mygo-scala health identity, and
    # internal ports require the application main class in the command line.
    $targets = @()
    $conflicts = @()
    $ports = @($Port) + $internalPorts | Sort-Object -Unique
    foreach ($candidatePort in $ports) {
        $serverProcessIds = @(Get-PortProcessIds -CandidatePort $candidatePort)
        if ($serverProcessIds.Count -eq 0) { continue }
        $publicPort = $candidatePort -eq $Port
        if ($publicPort -and -not (Test-MygoHealth -CandidatePort $candidatePort)) {
            $conflicts += "端口 $candidatePort 由其他程序占用，未关闭该程序。"
            continue
        }
        foreach ($serverProcessId in $serverProcessIds) {
            $commandLine = Get-ProcessCommandLine -ProcessId $serverProcessId
            if ($commandLine -and $commandLine.Contains($mainClass)) {
                $targets += $serverProcessId
            }
            elseif ($publicPort -and -not $commandLine) {
                # taskkill fallback when CIM cannot read the command line; the
                # health identity above already confirmed the listener is ours.
                & "$env:SystemRoot\System32\taskkill.exe" /PID $serverProcessId /T /F | Out-Null
                $targets += $serverProcessId
            }
            else {
                $conflicts += "端口 $candidatePort 由其他程序占用，未关闭该程序。"
            }
        }
    }
    $targets = @($targets | Sort-Object -Unique)
    if ($targets.Count -eq 0) {
        foreach ($conflict in $conflicts) { Write-Host $conflict -ForegroundColor Yellow }
        Write-Host "游戏服务器未运行，或已经关闭（端口 $Port）。"
        exit 0
    }
    foreach ($serverProcessId in $targets) {
        Stop-Process -Id $serverProcessId -ErrorAction SilentlyContinue
    }
    Write-Host "本地游戏服务器已关闭（端口 $Port）。" -ForegroundColor Green
}
catch {
    Write-Host "关闭失败：$($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
