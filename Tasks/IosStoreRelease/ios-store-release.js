
require('shelljs/global');
var path = require('path');
var tl = require('vsts-task-lib');

var echo = new tl.ToolRunner(tl.which('echo', true));

var msg = "test1"; //tl.getInput('msg', true);
echo.arg(msg);

/*var cwd = tl.getPathInput('cwd', false);

// will error and fail task if it doesn't exist
tl.checkPath(cwd, 'cwd');
tl.cd(cwd);

echo.exec({ failOnStdErr: false })
    .then(function (code) {
    tl.exit(code);
})
    .fail(function (err) {
    console.error(err.message);
    tl.debug('taskRunner fail');
    tl.exit(1);
});*/

installRubyGem("fastlane").fail(function (err) {
    console.error(err.message);
});

function installRubyGem(packageName) {
    if (!exec("ruby --version", { silent: true })) {
        tl.setResult(1, "ruby not found. please make sure ruby is installed in the environment.");
    }
    if (!exec("gem --version", { silent: true })) {
        tl.setResult(1, "gem not found. please make sure gem is installed in the environment.");
    }

    var command = new tl.ToolRunner("gem");
    command.arg("install");
    command.arg(packageName);

    return command.exec().fail(function (err) {
        console.error(err.message);
        taskLibrary.debug('taskRunner fail');
    });
}