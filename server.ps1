$port = 8000
$url = "http://localhost:$port/"

# Si ya hay un servidor respondiendo en el puerto 8000, solo abrir el navegador
try {
    $probe = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 1
    if ($probe.StatusCode -eq 200) {
        Write-Host "El servidor ya esta activo en $url" -ForegroundColor Yellow
        Start-Process $url
        Start-Sleep -Seconds 2
        exit
    }
} catch {
    # No hay servidor activo: se inicia uno nuevo
}

$listener = New-Object System.Net.HttpListener

# Intentar registrar el prefijo
try {
    $listener.Prefixes.Add($url)
    $listener.Start()
} catch {
    # Si el puerto 8000 está ocupado, probar con 8080
    $port = 8080
    $url = "http://localhost:$port/"
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add($url)
    $listener.Start()
}

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "      SILENT ASYLUM: NIGHTMARE CORRIDOR (TERROR 3D)       " -ForegroundColor Red
Write-Host "==========================================================" -ForegroundColor Green
Write-Host " Servidor local activo en: $url" -ForegroundColor Yellow
Write-Host " Abriendo el juego en tu navegador..." -ForegroundColor Cyan
Write-Host " (Para cerrar el juego y el servidor, cierra esta ventana)" -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Green

Start-Process $url

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $rawPath = [System.Uri]::UnescapeDataString($request.Url.LocalPath)
        if ($rawPath -eq "" -or $rawPath -eq "/") { $rawPath = "/index.html" }
        $localPath = Join-Path (Get-Location) $rawPath.TrimStart('/')

        if (Test-Path $localPath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($localPath)
            $ext = [System.IO.Path]::GetExtension($localPath).ToLower()

            switch ($ext) {
                ".html" { $response.ContentType = "text/html; charset=utf-8" }
                ".css"  { $response.ContentType = "text/css; charset=utf-8" }
                ".js"   { $response.ContentType = "application/javascript; charset=utf-8" }
                ".json" { $response.ContentType = "application/json" }
                ".png"  { $response.ContentType = "image/png" }
                ".jpg"  { $response.ContentType = "image/jpeg" }
                ".jpeg" { $response.ContentType = "image/jpeg" }
                ".svg"  { $response.ContentType = "image/svg+xml" }
                ".mp3"  { $response.ContentType = "audio/mpeg" }
                ".wav"  { $response.ContentType = "audio/wav" }
                default { $response.ContentType = "application/octet-stream" }
            }

            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $buffer = [System.Text.Encoding]::UTF8.GetBytes("404 Recurso No Encontrado")
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
        }
        $response.Close()
    } catch {
        # Continuar escuchando peticiones
    }
}
