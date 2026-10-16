// Runs word_probe.ps1 with a watchdog; kills only hidden Word instances started during the probe.
const { spawnSync, execSync } = require('child_process');
const path = require('path');
const t0 = new Date();
const r = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'word_probe.ps1'), '-Docx', process.argv[2]], { encoding: 'utf8', timeout: Number(process.argv[3] || 90000) });
console.log('status', r.status, r.signal || '', (r.stdout || '').trim(), (r.stderr || '').trim().slice(0, 300));
const iso = t0.toISOString();
execSync(`powershell -NoProfile -Command "Get-Process WINWORD -ErrorAction SilentlyContinue | Where-Object { $_.StartTime.ToUniversalTime() -ge [datetime]::Parse('${iso}').ToUniversalTime().AddSeconds(-2) -and $_.MainWindowHandle -eq 0 } | Stop-Process -Force; exit 0"`);
