$r = Invoke-RestMethod -Uri 'https://firestore.googleapis.com/v1/projects/smart-tracker-2eba6/databases/(default)/documents/data/bruno-main' -Method Get
$tasksJson = $r.fields.tasks.stringValue
$tasks = $tasksJson | ConvertFrom-Json
Write-Host "Total tasks in Firebase: $($tasks.Count)"
foreach($t in $tasks) {
    Write-Host "  - $($t.title) [$($t.category)] ($($t.status))"
}
