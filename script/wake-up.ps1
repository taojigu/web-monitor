# Log file location
$logFile = Join-Path $PSScriptRoot "wake-up.log"

function Write-Log {
    param([string]$Message)

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $logFile -Value "$timestamp - $Message"
}

Write-Log "Script started."

try {
    Add-Type -AssemblyName System.Windows.Forms

    $endTime = (Get-Date).AddMinutes(120)

    Write-Log "Will keep awake until $endTime"

    while ((Get-Date) -lt $endTime) {
        [System.Windows.Forms.SendKeys]::SendWait("{F15}")
        Write-Log "Sent F15 key."
        Start-Sleep -Seconds 120
    }

    Write-Log "Reached end time. Exiting normally."
}
catch {
    Write-Log "ERROR: $($_.Exception.Message)"
    throw
}

Write-Log "Script finished."