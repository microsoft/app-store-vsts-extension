
require('shelljs/global');
var path = require('path');
var taskLibrary = require('vsts-task-lib');

var echo = new taskLibrary.ToolRunner(taskLibrary.which('echo', true));

var msg = "test1"; //taskLibrary.getInput('msg', true);
echo.arg(msg);

/*var cwd = taskLibrary.getPathInput('cwd', false);

// will error and fail task if it doesn't exist
taskLibrary.checkPath(cwd, 'cwd');
taskLibrary.cd(cwd);

echo.exec({ failOnStdErr: false })
    .then(function (code) {
    taskLibrary.exit(code);
})
    .fail(function (err) {
    console.error(err.message);
    taskLibrary.debug('taskRunner fail');
    taskLibrary.exit(1);
});*/

var gemCache = process.env['GEM_CACHE'] || process.platform == 'win32' ? path.join(process.env['APPDATA'], 'gem-cache') : path.join(process.env['HOME'], '.gem-cache');

installRubyGem("fastlane", gemCache).fail(function (err) {
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