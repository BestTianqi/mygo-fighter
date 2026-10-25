[CmdletBinding()]
param(
    [ValidateRange(1, 65535)]
    [int]$Port = $(if ($env:PORT) { $env:PORT } else { 8080 })
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding

try {
    # Native netstat avoids the slow NetTCPIP/CIM module startup on Windows.
    $serverProcessIds = @(
        & "$env:SystemRoot\System32\netstat.exe" -ano -p tcp | ForEach-Object {
            $columns = $_.Trim() -split '\s+'
            if ($columns.Count -eq 5 -and $columns[0] -eq 'TCP' -and
                $columns[1].EndsWith(":$Port") -and $columns[3] -eq 'LISTENING') {
                [int]$columns[4]
            }
        } | Sort-Object -Unique
    )
    if ($serverProcessIds.Count -eq 0) {
        Write-Host "游戏服务器未运行，或已经关闭（端口 $Port）。"
        exit 0
    }

    $health = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/api/health" -TimeoutSec 3
    if ($health.app -ne 'mygo-scala') {
        throw "端口 $Port 由其他程序占用，未关闭该程序。"
    }

    foreach ($serverProcessId in $serverProcessIds) {
        Stop-Process -Id $serverProcessId -ErrorAction Stop
    }
    Write-Host "本地游戏服务器已关闭（端口 $Port）。" -ForegroundColor Green
}
catch {
    Write-Host "关闭失败：$($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
