$src = 'C:\Users\user\Desktop\Quotation Genarator'
$destZip = 'C:\Users\user\Desktop\Quotation_Generator_Full_Backup.zip'
$tempDir = 'C:\Users\user\Desktop\temp_project_backup'

Write-Host "Preparing backup files..."
if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

$exclude = @('node_modules', '.next', '.git')
Get-ChildItem -Path $src -Force | Where-Object { $exclude -notcontains $_.Name } | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $tempDir -Recurse -Force
}

Write-Host "Compressing to $destZip..."
if (Test-Path $destZip) { Remove-Item $destZip -Force }
Compress-Archive -Path "$tempDir\*" -DestinationPath $destZip -CompressionLevel Optimal -Force

Remove-Item $tempDir -Recurse -Force
Write-Host "Backup completed successfully!"
Get-Item $destZip | Select-Object Name, Length, LastWriteTime
