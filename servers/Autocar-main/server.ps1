param(
    [string]$HostName = "127.0.0.1",
    [int]$Port = 8000
)

$ErrorActionPreference = "Stop"
$Script:RootPath = [System.IO.Path]::GetFullPath((Get-Location).Path)
$Script:ChatSessions = [hashtable]::Synchronized(@{})
$Script:MaxHistoryMessages = 24
$Script:SystemInstruction = @"
Voce e o atendente virtual oficial da concessionaria AUTOCAR.
Fale sempre em portugues do Brasil, com tom profissional, objetivo e cordial.
Seu foco e atendimento comercial e consultivo de concessionaria:
- orientacao sobre carros, versoes, cambio manual/automatico/hibrido e tecnologia
- compra, financiamento, servicos, acessorios e sistemas
- monitoramento de IA automotiva, manutencao e pecas com problema
Regras:
- responda de forma clara e direta, sem enrolacao
- quando faltar contexto, faca 1 pergunta curta para fechar o atendimento
- nao invente dados tecnicos ou precos exatos se nao foram informados
- priorize ajudar o cliente a avancar para decisao de compra/servico
"@

function Load-EnvFile {
    $envPath = Join-Path $Script:RootPath ".env"
    if (-not (Test-Path -LiteralPath $envPath -PathType Leaf)) {
        return
    }

    Get-Content -LiteralPath $envPath | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) {
            return
        }

        $parts = $line.Split("=", 2)
        $key = $parts[0].Trim()
        $value = $parts[1].Trim()

        $existing = [System.Environment]::GetEnvironmentVariable($key)
        if ($key -and [string]::IsNullOrEmpty($existing)) {
            Set-Item -Path ("Env:" + $key) -Value $value
        }
    }
}

function Get-ContentType([string]$Path) {
    switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
        ".html" { return "text/html; charset=utf-8" }
        ".css" { return "text/css; charset=utf-8" }
        ".js" { return "application/javascript; charset=utf-8" }
        ".json" { return "application/json; charset=utf-8" }
        ".png" { return "image/png" }
        ".jpg" { return "image/jpeg" }
        ".jpeg" { return "image/jpeg" }
        ".webp" { return "image/webp" }
        ".gif" { return "image/gif" }
        ".svg" { return "image/svg+xml" }
        ".ico" { return "image/x-icon" }
        ".mp4" { return "video/mp4" }
        ".webm" { return "video/webm" }
        ".mov" { return "video/quicktime" }
        ".glb" { return "model/gltf-binary" }
        ".txt" { return "text/plain; charset=utf-8" }
        default { return "application/octet-stream" }
    }
}

function Write-CorsHeaders([System.Net.HttpListenerResponse]$Response) {
    $Response.Headers["Access-Control-Allow-Origin"] = "*"
    $Response.Headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    $Response.Headers["Access-Control-Allow-Headers"] = "Content-Type"
}

function Write-JsonResponse(
    [System.Net.HttpListenerContext]$Context,
    [int]$StatusCode,
    [object]$Payload
) {
    $response = $Context.Response
    $bytes = [System.Text.Encoding]::UTF8.GetBytes(($Payload | ConvertTo-Json -Depth 8 -Compress))
    $response.StatusCode = $StatusCode
    $response.ContentType = "application/json; charset=utf-8"
    Write-CorsHeaders -Response $response
    $response.ContentLength64 = $bytes.Length
    $response.OutputStream.Write($bytes, 0, $bytes.Length)
    $response.OutputStream.Close()
}

function Get-RequestBody([System.Net.HttpListenerRequest]$Request) {
    $reader = [System.IO.StreamReader]::new($Request.InputStream, $Request.ContentEncoding)
    try {
        return $reader.ReadToEnd()
    }
    finally {
        $reader.Dispose()
    }
}

function Resolve-SessionId([object]$Payload, [System.Net.HttpListenerRequest]$Request) {
    $rawSessionId = ""
    if ($Payload -and $Payload.PSObject.Properties.Name -contains "sessionId") {
        $rawSessionId = [string]$Payload.sessionId
    }

    $sessionId = $rawSessionId.Trim()
    if (-not $sessionId) {
        if ($Request -and $Request.RemoteEndPoint -and $Request.RemoteEndPoint.Address) {
            $sessionId = "remote-" + $Request.RemoteEndPoint.Address.ToString()
        } else {
            $sessionId = "remote-unknown"
        }
    }

    return $sessionId
}

function Get-SessionHistory([string]$SessionId) {
    if ($Script:ChatSessions.ContainsKey($SessionId) -and $null -ne $Script:ChatSessions[$SessionId]) {
        $stored = $Script:ChatSessions[$SessionId]
        if ($stored -is [System.Collections.ArrayList]) {
            return $stored
        }

        $history = [System.Collections.ArrayList]::new()
        foreach ($item in @($stored)) {
            [void]$history.Add($item)
        }
        return $history
    }
    return [System.Collections.ArrayList]::new()
}

function Set-SessionHistory([string]$SessionId, [System.Collections.ArrayList]$History) {
    if ($History.Count -gt $Script:MaxHistoryMessages) {
        $trimmed = [System.Collections.ArrayList]::new()
        $start = $History.Count - $Script:MaxHistoryMessages
        for ($i = $start; $i -lt $History.Count; $i++) {
            [void]$trimmed.Add($History[$i])
        }
        $Script:ChatSessions[$SessionId] = $trimmed
        return
    }

    $Script:ChatSessions[$SessionId] = $History
}

function Invoke-GeminiChat([string]$Message, [string]$SessionId) {
    $apiKey = $env:GEMINI_API_KEY
    if (-not $apiKey) {
        throw "Missing GEMINI_API_KEY in environment or .env"
    }

    $history = Get-SessionHistory -SessionId $SessionId

    $contents = [System.Collections.ArrayList]::new()
    foreach ($item in $history) {
        if (-not $item -or -not $item.role -or -not $item.text) {
            continue
        }
        [void]$contents.Add(@{
                role  = [string]$item.role
                parts = @(@{ text = [string]$item.text })
            })
    }
    [void]$contents.Add(@{
            role  = "user"
            parts = @(@{ text = $Message })
        })

    $body = @{
        systemInstruction = @{
            parts = @(@{ text = $Script:SystemInstruction })
        }
        contents = $contents
        generationConfig = @{
            temperature = 0.7
            maxOutputTokens = 350
        }
    } | ConvertTo-Json -Depth 10 -Compress

    $modelCandidates = @()
    if ($env:GEMINI_MODEL -and $env:GEMINI_MODEL.Trim()) {
        $modelCandidates += $env:GEMINI_MODEL.Trim()
    }
    foreach ($candidate in @("gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash")) {
        if ($modelCandidates -notcontains $candidate) {
            $modelCandidates += $candidate
        }
    }

    $remoteListUri = "https://generativelanguage.googleapis.com/v1beta/models?key=$apiKey"
    try {
        $remoteModels = Invoke-RestMethod -Method Get -Uri $remoteListUri -TimeoutSec 20
        if ($remoteModels.models) {
            $discovered = @()
            foreach ($modelEntry in $remoteModels.models) {
                $name = [string]$modelEntry.name
                if (-not $name) { continue }
                if ($name.StartsWith("models/")) { $name = $name.Substring(7) }
                if (-not $name.StartsWith("gemini")) { continue }

                $methods = @()
                if ($modelEntry.supportedGenerationMethods) {
                    $methods = @($modelEntry.supportedGenerationMethods)
                }
                if ($methods.Count -gt 0 -and ($methods -notcontains "generateContent")) {
                    continue
                }

                $discovered += $name
            }

            $orderedDiscovered = $discovered |
                Select-Object -Unique |
                Sort-Object @{ Expression = { if ($_ -like "*flash*") { 0 } else { 1 } } },
                @{ Expression = { if ($_ -like "*2.5*") { 0 } else { 1 } } }, @{ Expression = { $_ } }

            foreach ($candidate in $orderedDiscovered) {
                if ($modelCandidates -notcontains $candidate) {
                    $modelCandidates += $candidate
                }
            }
        }
    }
    catch {
        # keep local fallback candidates when model listing fails
    }

    $hadNotFound = $false
    $lastHardError = $null

    foreach ($model in $modelCandidates) {
        $uri = "https://generativelanguage.googleapis.com/v1beta/models/$model" +
            ":generateContent?key=$apiKey"

        try {
            $result = Invoke-RestMethod -Method Post -Uri $uri -ContentType "application/json" -Body $body -TimeoutSec 30
        }
        catch {
            $statusCode = $null
            if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
                try {
                    $statusCode = [int]$_.Exception.Response.StatusCode.value__
                }
                catch {
                    $statusCode = $null
                }
            }
            if (-not $statusCode -and $_.Exception.Message -match "\(404\)") {
                $statusCode = 404
            }

            if ($statusCode -eq 404) {
                $hadNotFound = $true
                continue
            }

            $lastHardError = $_.Exception.Message
            break
        }

        if (-not $result.candidates -or $result.candidates.Count -eq 0) {
            return "Nao consegui gerar resposta no momento."
        }

        $parts = $result.candidates[0].content.parts
        if (-not $parts -or $parts.Count -eq 0) {
            return "Nao consegui gerar resposta no momento."
        }

        $texts = @()
        foreach ($part in $parts) {
            if ($part.text) {
                $texts += [string]$part.text
            }
        }

        if ($texts.Count -eq 0) {
            return "Nao consegui gerar resposta no momento."
        }

        if (-not ($history -is [System.Collections.ArrayList])) {
            $history = [System.Collections.ArrayList]::new()
        }

        $reply = ($texts -join "`n").Trim()
        [void]$history.Add(@{ role = "user"; text = $Message })
        [void]$history.Add(@{ role = "model"; text = $reply })
        Set-SessionHistory -SessionId $SessionId -History $history
        return $reply
    }

    if ($lastHardError) {
        throw "Gemini API request failed: $lastHardError"
    }

    if ($hadNotFound) {
        throw "Gemini API request failed: no compatible model found for this key. Try GEMINI_MODEL=gemini-2.5-flash"
    }

    throw "Gemini API request failed: unknown error."
}

function Resolve-SafeFilePath([string]$UrlPath) {
    $relative = if ($UrlPath -eq "/") { "index.html" } else { $UrlPath.TrimStart("/") }
    $relative = $relative -replace "/", [System.IO.Path]::DirectorySeparatorChar
    $absolute = [System.IO.Path]::GetFullPath((Join-Path $Script:RootPath $relative))

    if (-not $absolute.StartsWith($Script:RootPath, [System.StringComparison]::OrdinalIgnoreCase)) {
        return $null
    }

    return $absolute
}

Load-EnvFile

$listener = [System.Net.HttpListener]::new()
$prefix = "http://$HostName`:$Port/"
$listener.Prefixes.Add($prefix)
$listener.Start()

Write-Host "Server running at $prefix"

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        try {
            if ($request.HttpMethod -eq "OPTIONS") {
                $response.StatusCode = 204
                Write-CorsHeaders -Response $response
                $response.OutputStream.Close()
                continue
            }

            if ($request.Url.AbsolutePath -eq "/api/chat") {
                if ($request.HttpMethod -ne "POST") {
                    Write-JsonResponse -Context $context -StatusCode 405 -Payload @{ error = "Method not allowed" }
                    continue
                }

                $rawBody = Get-RequestBody -Request $request
                $payload = $null
                try {
                    $payload = $rawBody | ConvertFrom-Json
                }
                catch {
                    Write-JsonResponse -Context $context -StatusCode 400 -Payload @{ error = "Invalid JSON" }
                    continue
                }

                $message = [string]$payload.message
                if (-not $message.Trim()) {
                    Write-JsonResponse -Context $context -StatusCode 400 -Payload @{ error = "Message is required" }
                    continue
                }

                $sessionId = Resolve-SessionId -Payload $payload -Request $request

                try {
                    $reply = Invoke-GeminiChat -Message $message -SessionId $sessionId
                    Write-JsonResponse -Context $context -StatusCode 200 -Payload @{ reply = $reply }
                }
                catch {
                    Write-JsonResponse -Context $context -StatusCode 502 -Payload @{ error = $_.Exception.Message }
                }

                continue
            }

            if ($request.HttpMethod -ne "GET" -and $request.HttpMethod -ne "HEAD") {
                $response.StatusCode = 405
                $response.OutputStream.Close()
                continue
            }

            $filePath = Resolve-SafeFilePath -UrlPath $request.Url.AbsolutePath
            if (-not $filePath -or -not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
                $response.StatusCode = 404
                $response.OutputStream.Close()
                continue
            }

            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.StatusCode = 200
            $response.ContentType = Get-ContentType -Path $filePath
            $response.ContentLength64 = $bytes.Length
            Write-CorsHeaders -Response $response

            if ($request.HttpMethod -eq "GET") {
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            }

            $response.OutputStream.Close()
        }
        catch {
            if ($context -and $context.Response -and $context.Response.OutputStream) {
                try {
                    $context.Response.StatusCode = 500
                    $context.Response.OutputStream.Close()
                }
                catch {}
            }
        }
    }
}
finally {
    $listener.Stop()
    $listener.Close()
}
