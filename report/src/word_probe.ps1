param([string]$Docx)
$word = New-Object -ComObject Word.Application
$word.Visible = $false; $word.DisplayAlerts = 0
try {
  $doc = $word.Documents.Open((Resolve-Path $Docx).Path, $false, $true, $false)
  if ($env:PROBE_STATS -eq "1") { "OPENED pages=" + $doc.ComputeStatistics(2) } else { "OPENED" }
  $doc.Close($false)
} catch { "ERR " + $_.Exception.Message } finally { try { $word.Quit() } catch {} }
