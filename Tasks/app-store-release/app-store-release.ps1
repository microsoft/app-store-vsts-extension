param (
    [string]$username,
    [string]$password,
    [string]$serviceEndpoint,
    [string]$ipaPath,
    [string]$language,
    [string]$releaseTrack,
    [string]$releaseNotes,
    [string]$shouldSubmitForReview,
    [string]$shouldAutoRelease,
    [string]$shouldSkipSubmission,
    [string]$teamId,
    [string]$teamName
) 
  
$env:INPUT_username = $username
$env:INPUT_password = $password
$env:INPUT_serviceEndpoint = $serviceEndpoint
$env:INPUT_ipaPath = $ipaPath
$env:INPUT_language = $language
$env:INPUT_releaseTrack = $releaseTrack
$env:INPUT_releaseNotes = $releaseNotes
$env:INPUT_shouldSubmitForReview = $shouldSubmitForReview
$env:INPUT_shouldAutoRelease = $shouldAutoRelease
$env:INPUT_shouldSkipSubmission = $shouldSkipSubmission
$env:INPUT_teamId = $teamId
$env:INPUT_teamName = $teamName

node app-store-release.js




