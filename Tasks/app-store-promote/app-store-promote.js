var path = require('path');
var taskLibrary = require('vsts-task-lib');

console.log("getting vars...");

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

var appIdentifier = taskLibrary.getInput("appIdentifier", true);
var buildNumber = taskLibrary.getInput("buildNumber", true);
var shouldAutoRelease = JSON.parse(taskLibrary.getInput("shouldAutoRelease", false));
var teamId = taskLibrary.getInput("teamId", false);
var teamName = taskLibrary.getInput("teamName", false);

console.log("gotallinputs");

var appVersion;
var appName;

// Set up environment
var gemCache = process.env['GEM_CACHE'] || process.platform == 'win32' ? path.join(process.env['APPDATA'], 'gem-cache') : path.join(process.env['HOME'], '.gem-cache');
process.env['GEM_HOME'] = gemCache;
process.env['FASTLANE_PASSWORD'] = credentials.password;
process.env['FASTLANE_DONT_STORE_PASSWORD'] = true;

// Add bin of new gem home so we don't ahve to resolve it later;
process.env['PATH'] = process.env['PATH'] + ":" + gemCache + path.sep + "bin";

return installRubyGem("deliver").then(function () {
    // See https://github.com/fastlane/deliver for more information on these arguments
    var args = [];
    args.push("submit_build")
    args.push("-u");
    args.push(credentials.username);
    args.push("-a");
    args.push(appIdentifier);

    if (buildNumber.toLowerCase() !== "latest") {
        args.push("-n");
        args.push(buildNumber);
    }

    if (shouldAutoRelease) {
        args.push("--automatic_release");
    }

    if (teamId) {
        args.push("-b");
        args.push(teamId);
    }

    if (teamName) {
        args.push("-l");
        args.push(teamName);
    }

    args.push("--force");
    return runCommand("deliver", args);
}).fail(function (err) {
    console.log("global error catch");
    taskLibrary.setResult(1, err.message);
    process.exit(1);
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
        taskLibrary.debug('taskRunner failed with error ' + err.message);
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
        taskLibrary.debug('taskRunner failed with error ' + err.message);
        throw err;
    });
}
