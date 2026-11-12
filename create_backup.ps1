$src = 'C:\Users\user\Desktop\Quotation Genarator'
$destZip1 = 'C:\Users\user\Desktop\Quotation_Generator_Home_PC.zip'
$destZip2 = 'C:\Users\user\Desktop\Quotation_Generator_Full_Backup.zip'
$tempDir = 'C:\Users\user\Desktop\temp_project_backup'

Write-Host "Preparing backup files (excluding node_modules, .next, .git)..."
if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

$exclude = @('node_modules', '.next', '.git')
Get-ChildItem -Path $src -Force | Where-Object { $exclude -notcontains $_.Name } | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $tempDir -Recurse -Force
}

Write-Host "Compressing to $destZip1..."
if (Test-Path $destZip1) { Remove-Item $destZip1 -Force }
Compress-Archive -Path "$tempDir\*" -DestinationPath $destZip1 -CompressionLevel Optimal -Force

Write-Host "Updating $destZip2..."
if (Test-Path $destZip2) { Remove-Item $destZip2 -Force }
Copy-Item -Path $destZip1 -Destination $destZip2 -Force

Remove-Item $tempDir -Recurse -Force
Write-Host "Backup completed successfully!"
Get-Item $destZip1, $destZip2 | Select-Object Name, Length, LastWriteTime
