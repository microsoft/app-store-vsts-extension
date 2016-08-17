var fs = require('fs');
var os = require('os');
var path = require('path');
var Q = require('q');
var taskLibrary = require('vsts-task-lib');

//check if this is running on Mac and fail the task if not
if(os.platform() !== 'darwin') {
    taskLibrary.setResult(1, 'App store release can only be run from a Mac computer.');
    taskLibrary.exit(1);
}

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

var ipaPath = "\"" + taskLibrary.getPathInput("ipaPath", true) + "\"";
var skipBinaryUpload = taskLibrary.getBoolInput("skipBinaryUpload");
var uploadMetadata = taskLibrary.getBoolInput("uploadMetadata");
var metadataPath = taskLibrary.getPathInput("metadataPath", false);
var uploadScreenshots = taskLibrary.getBoolInput("uploadScreenshots");
var screenshotsPath = taskLibrary.getPathInput("screenshotsPath", false);
var releaseNotes = taskLibrary.getInput("releaseNotes", false);
var releaseTrack = taskLibrary.getInput("releaseTrack", true);
var shouldSkipWaitingForProcessing = taskLibrary.getBoolInput("shouldSkipWaitingForProcessing", false);
var shouldSubmitForReview = taskLibrary.getBoolInput("shouldSubmitForReview", false);
var shouldAutoRelease = taskLibrary.getBoolInput("shouldAutoRelease", false);
var shouldSkipSubmission = taskLibrary.getBoolInput("shouldSkipSubmission", false);
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
            
            //set the "what to test?"
            if(isValidFilePath(releaseNotes)) {
                pilotArgs.push("--changelog");
                pilotArgs.push("\"" + fs.readFileSync(releaseNotes).toString() + "\"");
            }
            
            if (shouldSkipSubmission) {
                pilotArgs.push("--skip_submission");
                pilotArgs.push("true");
            }

            if (shouldSkipWaitingForProcessing) {
                pilotArgs.push("--skip_waiting_for_build_processing");
                pilotArgs.push("true");
            }

            return runCommand("pilot", pilotArgs).fail(function (err) {
                taskLibrary.setResult(1, err);
                throw err;
            });
        }).fail(function (err) {
            taskLibrary.setResult(1, err);
            throw err;
        });
    } else if (releaseTrack === "Production") {
        installRubyGem("deliver").then(function () {
            // Setting up arguments for initializing deliver command
            // See https://github.com/fastlane/deliver for more information on these arguments
            var deliverArgs = ["--force", "-u", credentials.username, "-a", bundleIdentifier, "-i", ipaPath];

            if (skipBinaryUpload) {
                deliverArgs.push(["--skip_binary_upload", "true"]);
            }

            if (uploadMetadata && metadataPath) {
                deliverArgs.push("-m");
                deliverArgs.push("\"" + metadataPath + "\"")
            } else {
                deliverArgs.push(["--skip_metadata", "true"]);
            }

            if (uploadScreenshots && screenshotsPath) {
                deliverArgs.push("-w");
                deliverArgs.push("\"" + screenshotsPath + "\"")
            } else {
                deliverArgs.push(["--skip_screenshots", "true"]);
            }

            if (shouldSubmitForReview) {
                deliverArgs.push("--submit_for_review");
                deliverArgs.push("true");
            }

            if (shouldAutoRelease) {
                deliverArgs.push("--automatic_release");
                deliverArgs.push("true");
            }

            return runCommand("deliver", deliverArgs);
        }).fail(function (err) {
            taskLibrary.setResult(1, err);
            throw err;
        });
    }
} catch (err) {
    taskLibrary.setResult(1, err);
    throw err;
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
        taskLibrary.debug('taskRunner failed with error ' + err);
        throw err;
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
        taskLibrary.debug('taskRunner failed with message: ' + err);
        throw err;
    });
}

function isValidFilePath(filePath) {
    try {
        return fs.statSync(filePath).isFile();
    } catch (error) {
        return false;
    }
}
