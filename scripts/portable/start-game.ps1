param([switch]$Lan)

$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

function Test-Game([string]$Base) {
    try {
        $request = [System.Net.HttpWebRequest]::Create("$Base/api/health")
        $request.Proxy = $null
        $request.Timeout = 1400
        $response = $request.GetResponse()
        try {
            $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
            $health = $reader.ReadToEnd() | ConvertFrom-Json
            return $health.app -eq 'mygo-scala' -and $health.ok -eq $true
        } finally {
            $response.Dispose()
        }
    } catch {
        return $false
    }
}

function Test-Port([int]$Port) {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $Port)
    $listener.ExclusiveAddressUse = $true
    try {
        $listener.Start()
        return $true
    } catch [System.Net.Sockets.SocketException] {
        return $false
    } finally {
        $listener.Stop()
    }
}

$ips = @()
if ($Lan) {
    $ips = @([System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces() |
        Where-Object {
            $_.OperationalStatus -eq 'Up' -and
            $_.NetworkInterfaceType -in @('Ethernet', 'Wireless80211', 'GigabitEthernet', 'FastEthernetFx', 'FastEthernetT') -and
            "$($_.Name) $($_.Description)" -notmatch 'Clash|Virtual|VMware|Hyper-V|WireGuard|Wintun|TAP-'
        } |
        Sort-Object @{Expression = { $_.NetworkInterfaceType -ne 'Wireless80211' }} |
        ForEach-Object { $_.GetIPProperties().UnicastAddresses } |
        Where-Object { $_.Address.AddressFamily -eq 'InterNetwork' } |
        ForEach-Object { $_.Address.ToString() } |
        Where-Object { $_ -notmatch '^(0\.|127\.|169\.254\.|198\.1[89]\.)' } |
        Select-Object -Unique)
}

$edgePort = if ($env:MYGO_PORT) { [int]$env:MYGO_PORT } else { 8080 }
$lobbyPort = if ($env:MYGO_LOBBY_PORT) { [int]$env:MYGO_LOBBY_PORT } else { 8079 }
$roomsPort = if ($env:MYGO_ROOMS_PORT) { [int]$env:MYGO_ROOMS_PORT } else { 8091 }
$server = $null
$lock = $null
$hasLock = $false

try {
    $base = "http://127.0.0.1:$edgePort"
    $lock = [System.Threading.Mutex]::new($false, "Local\MyGO-Fighter-Portable-$edgePort")
    try { $hasLock = $lock.WaitOne(0) } catch [System.Threading.AbandonedMutexException] { $hasLock = $true }
    if ($hasLock -and !(Test-Game $base)) {
        foreach ($port in @($edgePort, $lobbyPort, $roomsPort)) {
            if (!(Test-Port $port)) { throw "Port $port is busy. Close the old game window or choose another port." }
        }
        $env:SERVICE_ROLE = 'all'
        $env:HOST = if ($Lan) { '0.0.0.0' } else { '127.0.0.1' }
        $env:LOBBY_HOST = '127.0.0.1'
        $env:ROOMS_HOST = '127.0.0.1'
        $env:PORT = "$edgePort"
        $env:LOBBY_PORT = "$lobbyPort"
        $env:ROOMS_PORT = "$roomsPort"
        $env:WEB_ROOT = 'web'
        $env:LOBBY_URL = $env:ROOMS_DIRECT_URL = $env:INSTANCE_URL = $null
        $env:INTERNAL_SECRET = $env:TRUST_LOCAL_PROXY = $null
        New-Item -ItemType Directory -Force -Path 'run' | Out-Null
        $java = Join-Path $PSScriptRoot 'runtime\bin\java.exe'
        Write-Host 'Starting MyGO Fighter. The browser will open automatically.'
        $server = Start-Process -FilePath $java -ArgumentList @(
            '-XX:+IgnoreUnrecognizedVMOptions',
            '-Dfile.encoding=UTF-8',
            '-Dpolyglot.engine.WarnInterpreterOnly=false',
            '-Djava.io.tmpdir=run',
            '-Dpolyglot.engine.userResourceCache=run',
            '-cp', 'lib\*', 'services.system.api.Main'
        ) -NoNewWindow -PassThru
    }

    $deadline = [DateTime]::UtcNow.AddSeconds(60)
    while (!(Test-Game $base)) {
        if (($server -and $server.HasExited) -or [DateTime]::UtcNow -gt $deadline) {
            throw 'The game server did not become ready. Check the error above.'
        }
        Start-Sleep -Milliseconds 300
    }
    if ($Lan -and !$server -and $ips.Count -gt 0 -and
        !($ips | Where-Object { Test-Game "http://${_}:$edgePort" } | Select-Object -First 1)) {
        throw 'The current game is running in local mode. Close its window, then double-click start-lan.cmd again.'
    }
    $playURL = "$base/"
    if ($Lan) {
        $playURL += '?online=1'
        foreach ($ip in $ips) {
            $playURL += "&lan=$ip"
            Write-Host "Friend's address: http://${ip}:$edgePort/?online=1"
        }
        if (!$ips.Count) { Write-Host 'Connect the host to Wi-Fi or Ethernet to invite another device.' }
    }
    Write-Host "Open in browser: $playURL"
    Write-Host 'Keep the original game window open while playing. Press Ctrl+C there to stop.'
    if ($env:MYGO_NO_BROWSER -ne '1') {
        try { Start-Process -FilePath $playURL } catch { Write-Host 'Copy the address above into your browser.' }
    }
    if ($server) {
        $server.WaitForExit()
        exit $server.ExitCode
    }
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
} finally {
    if ($server -and !$server.HasExited) { Stop-Process -Id $server.Id -ErrorAction SilentlyContinue }
    if ($hasLock) { $lock.ReleaseMutex() }
    if ($lock) { $lock.Dispose() }
}
