param (
    [string]$username,
    [string]$password,
    [string]$serviceEndpoint,
    [string]$appIdentifier,
    [string]$buildNumber,
    [string]$shouldAutoRelease,
    [string]$teamId,
    [string]$teamName
) 
  
$env:INPUT_username = $username
$env:INPUT_password = $password
$env:INPUT_serviceEndpoint = $serviceEndpoint
$env:INPUT_appIdentifier = $appIdentifier
$enc:INPUT_buildNumber = $buildNumber
$env:INPUT_shouldAutoRelease = $shouldAutoRelease
$env:INPUT_teamId = $teamId
$env:INPUT_teamName = $teamName

node app-store-promote.js




