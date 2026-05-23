Add-Type -AssemblyName System.Windows.Forms

$endTime = (Get-Date).Date.AddHours(20).AddMinutes(10)

while ((Get-Date) -lt $endTime) {
    [System.Windows.Forms.SendKeys]::SendWait("{F15}")
    Start-Sleep -Seconds 60
}