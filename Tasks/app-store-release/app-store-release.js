var path = require('path');
var taskLibrary = require('vsts-task-lib');
var ipaParser = require('ipa-metadata');

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
var shouldSubmitForReview = JSON.parse(taskLibrary.getInput("shouldSubmitForReview", false));
var shouldAutoRelease = JSON.parse(taskLibrary.getInput("shouldAutoRelease", false));
var shouldSkipSubmission = JSON.parse(taskLibrary.getInput("shouldSkipSubmission", false));
var teamId = taskLibrary.getInput("teamId", false);
var teamName = taskLibrary.getInput("teamName", false);

var bundleIdentifier;
var appVersion;
var appName;

// Set up environment
var gemCache = process.env['GEM_CACHE'] || process.platform == 'win32' ? path.join(process.env['APPDATA'], 'gem-cache') : path.join(process.env['HOME'], '.gem-cache');
process.env['GEM_HOME'] = gemCache;
process.env['FASTLANE_PASSWORD'] = credentials.password;
process.env['FASTLANE_DONT_STORE_PASSWORD'] = true;

// Add bin of new gem home so we don't ahve to resolve it later;
process.env['PATH'] = process.env['PATH'] + ":" + gemCache + path.sep + "bin";

ipaParser(ipaPath, function (err, extractedData) {
    if (err) {
        taskLibrary.setResult(1, "IPA Parsing failed: " + err.message);
    }

    var metadata = extractedData.metadata;

    if (!metadata) {
        taskLibrary.setResult(1, "IPA Metadata is empty.");
    }

    appName = metadata.CFBundleName;
    appVersion = metadata.CFBundleVersion;
    bundleIdentifier = metadata.CFBundleIdentifier;

    return installRubyGem("produce").then(function () {
        // Setting up arguments for produce command
        // See https://github.com/fastlane/produce for more information on these arguments
        var produceArgs = [];
        produceArgs.push("-u");
        produceArgs.push(credentials.username);
        produceArgs.push("-a");
        produceArgs.push(bundleIdentifier);
        produceArgs.push("-q");
        produceArgs.push(appName);
        produceArgs.push("-m");
        produceArgs.push(languageString);

        if (teamId) {
            produceArgs.push("-b");
            produceArgs.push(teamId);
        }

        if (teamName) {
            produceArgs.push("-l");
            produceArgs.push(teamName);
        }

        return runCommand("produce", produceArgs).fail(function (err) {
            taskLibrary.setResult(1, err.message);
            throw err;
        });
    }).then(function () {
        if (releaseTrack === "TestFlight") {
            return installRubyGem("pilot").then(function () {
                var pilotArgs = ["upload"];
                pilotArgs.push("-u");
                pilotArgs.push(credentials.username);
                pilotArgs.push("-i");
                pilotArgs.push(ipaPath);

                if (shouldSkipSubmission) {
                    pilotArgs.push("--skip_submission");
                    pilotArgs.push("true");
                }

                return runCommand("pilot", pilotArgs).fail(function (err) {
                    taskLibrary.setResult(1, err.message);
                });
            });
        } else if (releaseTrack === "Production") {
            return installRubyGem("deliver").then(function () {
                // Setting up arguments for initializing deliver command
                // See https://github.com/fastlane/deliver for more information on these arguments
                var deliverArgs = ["init"];
                deliverArgs.push("-u");
                deliverArgs.push(credentials.username);
                deliverArgs.push("-a");
                deliverArgs.push(bundleIdentifier);
                deliverArgs.push("-i");
                deliverArgs.push(ipaPath);

                if (shouldSubmitForReview) {
                    deliverArgs.push("--submit_for_review");
                    deilverArgs.push("true");
                }

                if (shouldAutoRelease) {
                    deliverArgs.push("--automatic_release");
                    deilverArgs.push("true");
                }

                // First, try to pull screenshots from itunes connect
                return runCommand("deliver", ["download_screenshots", "-u", credentials.username, "-a", bundleIdentifier]).then(function () {
                    return runCommand("deliver", deliverArgs).then(function () {
                        return runCommand("deliver", ["--force", "-i", ipaPath]).fail(function (err) {
                            taskLibrary.setResult(1, err.message);
                            throw err;
                        });
                    });
                });
            });
        }
    }).fail(function (err) {
        taskLibrary.setResult(1, err.message);
    });
});

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
