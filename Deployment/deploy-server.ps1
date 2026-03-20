# Simple HTTP server to trigger deployments
# Run as: powershell -ExecutionPolicy Bypass -File deploy-server.ps1

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:5200/")
$listener.Start()

Write-Host "Deploy server listening on http://localhost:5200/"
Write-Host "Endpoints:"
Write-Host "  POST /deploy/frontend"
Write-Host "  POST /deploy/backend"
Write-Host ""

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response
    
    $path = $request.Url.AbsolutePath
    $method = $request.HttpMethod
    
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $method $path"
    
    $responseText = ""
    $statusCode = 200
    
    try {
        if ($method -eq "POST") {
            switch ($path) {
                "/deploy/frontend" {
                    Write-Host "Triggering frontend deploy..."
                    $scriptPath = Join-Path $PSScriptRoot "deploy-frontend.ps1"
                    & $scriptPath
                    $responseText = "Frontend deploy completed"
                }
                "/deploy/backend" {
                    Write-Host "Triggering backend deploy..."
                    $scriptPath = Join-Path $PSScriptRoot "deploy-backend.ps1"
                    & $scriptPath
                    $responseText = "Backend deploy completed"
                }
                default {
                    $statusCode = 404
                    $responseText = "Not found"
                }
            }
        } else {
            $statusCode = 405
            $responseText = "Method not allowed"
        }
    } catch {
        $statusCode = 500
        $responseText = "Error: $_"
        Write-Host "ERROR: $_" -ForegroundColor Red
    }
    
    $response.StatusCode = $statusCode
    $buffer = [System.Text.Encoding]::UTF8.GetBytes($responseText)
    $response.ContentLength64 = $buffer.Length
    $response.OutputStream.Write($buffer, 0, $buffer.Length)
    $response.Close()
}

$listener.Stop()
