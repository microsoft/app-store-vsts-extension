
var path = require('path');
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

// Set up environment
var gemCache = process.env['GEM_CACHE'] || process.platform == 'win32' ? path.join(process.env['APPDATA'], 'gem-cache') : path.join(process.env['HOME'], '.gem-cache');
process.env['GEM_HOME'] = gemCache;
process.env['FASTLANE_PASSWORD'] = credentials.password;
process.env['FASTLANE_DONT_STORE_PASSWORD'] = true;

// Add bin of new gem home so we don't ahve to resolve it later;
process.env['PATH'] = process.env['PATH'] + ":" + gemCache + path.sep + "bin";

var appIdentifier = "com.ryuyu.hello"; // TODO: either take this as input or read it from the IPA.

if (!appIdentifier) {
    taskLibrary.setResult(1, "Name extraction from IPA failed. Is this a valid IPA file?");
}

installRubyGem("fastlane").then(function () {
    return installRubyGem("produce").then(function () {
        // Setting up arguments for produce command
        var args = [];
        args.push("-u");
        args.push(credentials.username);
        args.push("-a");
        args.push(appIdentifier);
        
        return runCommand("produce", args);
    });
}).then(function () {
    return installRubyGem("deliver").then(function () {
        // Setting up arguments for deliver command
        var args = ["init"];
        args.push("-u");
        args.push(credentials.username);
        args.push("-a");
        args.push(appIdentifier);
        args.push("-i");
        args.push(ipaPath);

        return runCommand("deliver", args);
    });
}).fail(function (err) {
    console.error(err.message);
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
