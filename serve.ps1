param([int]$Port=8000, [string]$Root="$PSScriptRoot")

$listener = New-Object System.Net.HttpListener
$prefix = "http://localhost:$Port/"
$listener.Prefixes.Add($prefix)
$listener.Start()
Write-Output "Serving $Root at http://localhost:$Port/ (Press Ctrl+C to stop)"
while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
    } catch {
        break
    }
    $req = $context.Request
    $res = $context.Response
    $rel = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath.TrimStart('/'))
    if ($rel -eq '') { $rel = 'index.html' }
    $path = Join-Path $Root $rel
    if (-not (Test-Path $path)) {
        $res.StatusCode = 404
        $res.StatusDescription = "Not Found"
        $buffer = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
        $res.OutputStream.Write($buffer,0,$buffer.Length)
        $res.Close()
        continue
    }
    $bytes = [System.IO.File]::ReadAllBytes($path)
    $res.ContentLength64 = $bytes.Length
    $ext = [System.IO.Path]::GetExtension($path).ToLower()
    switch ($ext) {
        '.html' { $ctype='text/html' }
        '.htm'  { $ctype='text/html' }
        '.js'   { $ctype='application/javascript' }
        '.css'  { $ctype='text/css' }
        '.png'  { $ctype='image/png' }
        '.jpg'  { $ctype='image/jpeg' }
        '.jpeg' { $ctype='image/jpeg' }
        '.gif'  { $ctype='image/gif' }
        '.svg'  { $ctype='image/svg+xml' }
        '.json' { $ctype='application/json' }
        default { $ctype='application/octet-stream' }
    }
    $res.ContentType = $ctype
    $res.OutputStream.Write($bytes,0,$bytes.Length)
    $res.Close()
}
$listener.Stop()
