var path = require('path');
var Q = require('q');
var taskLibrary = require('vsts-task-lib');

// Get input variables
var authType = taskLibrary.getInput('authType', false);
var credentials = {};
if (authType === "ServiceEndpoint") {
    var serviceEndpoint = taskLibrary.getEndpointAuthorization(taskLibrary.getInput("serviceEndpoint", true));
    credentials.username = serviceEndpoint.parameters.username;
    credentials.password = serviceEndpoint.parameters.password;
} else if (authType == "UserAndPass") {
    credentials.username = taskLibrary.getInput("username", true);
    credentials.password = taskLibrary.getInput("password", true);
}

var ipaPath = taskLibrary.getInput("ipaPath", true);
var languageString = taskLibrary.getInput("language", true);
var releaseNotes = taskLibrary.getInput("releaseNotes", false);
var releaseTrack = taskLibrary.getInput("releaseTrack", true);
var shouldSkipWaitingForProcessing = taskLibrary.getBoolInput("shouldSkipWaitingForProcessing", false);
var shouldSubmitForReview = taskLibrary.getBoolInput("shouldSubmitForReview", false);
var shouldAutoRelease = taskLibrary.getBoolInput("shouldAutoRelease", false);
var shouldSkipSubmission = taskLibrary.getBoolInput("shouldSkipSubmission", false);
var shouldDownloadScreenshots = taskLibrary.getBoolInput("shouldDownloadScreenshots", false);
var teamId = taskLibrary.getInput("teamId", false);
var teamName = taskLibrary.getInput("teamName", false);
var bundleIdentifier = taskLibrary.getInput("appIdentifier", true);

// Set up environment
var gemCache = process.env['GEM_CACHE'] || process.platform == 'win32' ? path.join(process.env['APPDATA'], 'gem-cache') : path.join(process.env['HOME'], '.gem-cache');
process.env['GEM_HOME'] = gemCache;
process.env['FASTLANE_PASSWORD'] = credentials.password;
process.env['FASTLANE_DONT_STORE_PASSWORD'] = true;

// Add bin of new gem home so we don't ahve to resolve it later;
process.env['PATH'] = process.env['PATH'] + ":" + gemCache + path.sep + "bin";

try {
    if (releaseTrack === "TestFlight") {
        installRubyGem("pilot").then(function () {
            var pilotArgs = ["upload", "-u", credentials.username, "-i", ipaPath];

            if (shouldSkipSubmission) {
                pilotArgs.push("--skip_submission");
                pilotArgs.push("true");
            }

            if (shouldSkipWaitingForProcessing) {
                pilotArgs.push("--skip_waiting_for_build_processing");
                pilotArgs.push("true");
            }

            return runCommand("pilot", pilotArgs).fail(function (err) {
                taskLibrary.setResult(1, err.message);
                throw err;
            });
        }).fail(function (err) {
            taskLibrary.setResult(1, err.message);
            process.exit(1);
        });
    } else if (releaseTrack === "Production") {
        installRubyGem("deliver").then(function () {
            var deliverPromise = Q(0);
            // Setting up arguments for initializing deliver command
            // See https://github.com/fastlane/deliver for more information on these arguments
            var deliverArgs = ["init", "-u", credentials.username, "-a", bundleIdentifier, "-i", ipaPath];

            if (shouldSubmitForReview) {
                deliverArgs.push("--submit_for_review");
                deilverArgs.push("true");
            }

            if (shouldAutoRelease) {
                deliverArgs.push("--automatic_release");
                deilverArgs.push("true");
            }

            if (shouldDownloadScreenshots) {
                deliverPromise = deliverPromise.then(function () {
                    return runCommand("deliver", ["download_screenshots", "-u", credentials.username, "-a", bundleIdentifier]);
                })
            }
            // First, try to pull screenshots from itunes connect
            return deliverPromise.then(function () {
                return runCommand("deliver", deliverArgs).then(function () {
                    return runCommand("deliver", ["--force", "-i", ipaPath]).fail(function (err) {
                        taskLibrary.setResult(1, err.message);
                        throw err;
                    });
                });
            });
        }).fail(function (err) {
            taskLibrary.setResult(1, err.message);
            process.exit(1);
        });
    }
} catch (err) {
    taskLibrary.setResult(1, err.message);
    process.exit(1);
}

function installRubyGem(packageName, localPath) {
    taskLibrary.debug("Checking for ruby install...");
    taskLibrary.which("ruby", true);
    taskLibrary.debug("Checking for gem install...");
    taskLibrary.which("gem", true);

    taskLibrary.debug("Setting up gem install");
    var command = new taskLibrary.ToolRunner("gem");
    command.arg("install");
    command.arg(packageName);

    if (localPath) {
        command.arg("--install-dir");
        command.arg(localPath);
    }

    taskLibrary.debug("Attempting to install " + packageName + " to " + (localPath ? localPath : " default cache directory (" + process.env['GEM_HOME'] + ")"));
    return command.exec().fail(function (err) {
        console.error(err.message);
        taskLibrary.debug('taskRunner fail');
    });
}

function runCommand(commandString, args) {
    taskLibrary.debug("Setting up command " + commandString);
    if (typeof args == "string") {
        args = [args];
    }

    var command = new taskLibrary.ToolRunner(commandString);

    if (args) {
        args.forEach(function (arg) {
            taskLibrary.debug("Appending argument: " + arg);
            command.arg(arg);
        });
    }

    return command.exec().fail(function (err) {
        console.error(err.message);
        taskLibrary.debug('taskRunner fail');
    });
}
