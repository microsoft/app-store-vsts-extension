
require('shelljs/global');
var path = require('path');
var taskLibrary = require('vsts-task-lib');

var gemCache = process.env['GEM_CACHE'] || process.platform == 'win32' ? path.join(process.env['APPDATA'], 'gem-cache') : path.join(process.env['HOME'], '.gem-cache');
process.env['GEM_HOME'] = gemCache;

// Add bin of new gem home so we don't ahve to resolve it later;
process.env['PATH'] = process.env['PATH'] + ":" + gemCache + path.sep + "bin";

installRubyGem("fastlane").then(function () {
    return runCommand("fastlane", "init");
}).then(function() {
    return installRubyGem("sigh");
}).fail(function (err) {
    console.error(err.message);
});

function installRubyGem(packageName, localPath) {
    if (!exec("ruby --version", { silent: true })) {
        taskLibrary.setResult(1, "ruby not found. please make sure ruby is installed in the environment.");
    }
    if (!exec("gem --version", { silent: true })) {
        taskLibrary.setResult(1, "gem not found. please make sure gem is installed in the environment.");
    }

    var command = new taskLibrary.ToolRunner("gem");
    command.arg("install");
    command.arg(packageName);

    if (localPath) {
        command.arg("--install-dir");
        command.arg(localPath);
    }

    return command.exec().fail(function (err) {
        console.error(err.message);
        taskLibrary.debug('taskRunner fail');
    });
}

function runCommand(commandString, args) {
    if (typeof args == "string") {
        args = [args];
    }

    var command = new taskLibrary.ToolRunner(commandString);
    if (args) {
        args.foreach(function (arg) {
            command.arg(arg);
        });
    }

    return command.exec().fail(function (err) {
        console.error(err.message);
        taskLibrary.debug('taskRunner fail');
    });
}