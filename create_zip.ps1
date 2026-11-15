$dest = "E:\CEW_Home_PC_Setup.zip"
if (Test-Path $dest) { Remove-Item $dest -Force }

$tempDir = Join-Path $env:TEMP ("cew_zip_" + [System.Guid]::NewGuid().ToString().Substring(0,8))
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

Write-Host "Copying project files to temp staging area..."
$excludeItems = @('node_modules', '.next', '.git', '*.zip')

Get-ChildItem -Path "E:\CEW" -Force | ForEach-Object {
    if ($excludeItems -notcontains $_.Name -and $_.Extension -ne '.zip') {
        Copy-Item -Path $_.FullName -Destination $tempDir -Recurse -Force
    }
}

Write-Host "Compressing archive to $dest..."
Compress-Archive -Path "$tempDir\*" -DestinationPath $dest -CompressionLevel Optimal -Force

Remove-Item -Path $tempDir -Recurse -Force

$item = Get-Item $dest
Write-Host "SUCCESS: Archive created!"
Write-Host "Path: $($item.FullName)"
Write-Host "Size: $([Math]::Round($item.Length / 1MB, 2)) MB"
