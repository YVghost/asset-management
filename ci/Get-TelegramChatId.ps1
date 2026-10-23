$ErrorActionPreference = 'Stop'
$taskSecret = Read-Host 'Token entregado por BotFather (entrada oculta)' -AsSecureString
$taskPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($taskSecret)
try {
    $taskToken = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($taskPointer)
    try {
        $taskResponse = Invoke-RestMethod -Method Get -Uri "https://api.telegram.org/bot$taskToken/getUpdates" -TimeoutSec 20
        $taskChats = @($taskResponse.result | Where-Object { $_.message.chat } | ForEach-Object {
            [PSCustomObject]@{ ChatId = $_.message.chat.id; Tipo = $_.message.chat.type }
        } | Sort-Object ChatId -Unique)
        if ($taskChats.Count -eq 0) { Write-Host 'No hay mensajes pendientes. Abre tu bot, pulsa Start y envíale hola. Luego repite.' }
        else { $taskChats | Format-Table }
    } catch { throw 'No se pudo consultar Telegram. Comprueba el token y la conexión; no publiques el token.' }
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($taskPointer)
    $taskToken = $null
    $taskSecret.Dispose()
}
