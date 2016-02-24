// 
// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
//

require('shelljs/global');
var path = require('path'),
    fs = require('fs');
var commandLineArgs = require('command-line-args');

var devManifestOverride = {
    public: false,
    name: "Cordova Build-Dev",
    id: "cordova-extension-dev",
    publisher: "ms-mobiledevops-test"
}

var prodManifestOverride = {
    public: true
}

var cli = commandLineArgs([
  { name: 'maketest', alias: 't', description: 'make test VSIX', type: Boolean },
  { name: 'makeprod', alias: 'p', description: 'make production VSIX', type: Boolean },
  { name: 'publishtest', alias: 'b', description: 'publish test VSIX', type: Boolean },
  { name: 'skipinstalldeps', alias: 's', description: 'skip npm installing task dependencies (to speed up)', type: Boolean },
]);

var options;
try {
    options = cli.parse()
}
catch(err) {
    echo(err);
    invalidUsage();
}

if (Object.keys(options).length === 0)
    invalidUsage();

if (! exec("npm --version", {silent: true})) {
    echo("npm not found. please install npm and run again.")
    exit(1);
}

if (exec('tfx --version', {silent: true}).code != 0)
    echoAndExec("tfx-cli not found. installing", "npm install -g tfx-cli");

if (! options.skipinstalldeps)
    installTasks()

if (options.makeprod)
    echoAndExec('Creating VSIX', 'tfx extension create --manifest-globs mobiledevopscordovaextension.json --override ' + toOverrideString(prodManifestOverride));

if (options.maketest)
    echoAndExec('Creating test VSIX',
        'tfx extension create --manifest-globs mobiledevopscordovaextension.json --override ' + toOverrideString(devManifestOverride));

if (options.publishtest) {
    var accessToken = env['PUBLISH_ACCESSTOKEN'];
    if (accessToken === undefined) {
        echo("Must set PUBLISH_ACCESSTOKEN environment variable to publish a test VSIX");
        exit(1);
    }

    echoAndExec('Publishing test VSIX',
        'tfx extension publish --manifest-globs mobiledevopscordovaextension.json --override ' + toOverrideString(devManifestOverride) + ' --share-with mobiledevops x04ty29er --token ' + accessToken);
}

//
// Functions
//

function invalidUsage() {
   echo("Usage: makevsix [options]; must supply at least one option")
   echo(cli.getUsage());
   exit(1);
}

// Convert the override JavaScript object to a JSON string, adding a backslash before any double quotes as that's needed for the shell exec   
function toOverrideString(object) {
    return JSON.stringify(object).replace(/"/g, '\\"');
}

function installTasks() {
    echo("Installing task dependencies...");

    var rootPath = process.cwd(); 
    var tasksPath = path.join(rootPath, 'Tasks');
    var tasks = fs.readdirSync(tasksPath);
    console.log(tasks.length + ' tasks found.')
    tasks.forEach(function(task) {
        console.log('Processing task ' + task);
        process.chdir(path.join(tasksPath,task));

        console.log('Installing npm dependencies for task...');
        if (exec('npm install --only=prod').code != 0) {
            console.log('npm install for task ' + task + ' failed');
            exit(1);
        }
    });

    process.chdir(rootPath);
}

function echoAndExec(prefix, cmd) {
    if (prefix === null)
        prefix = "Executing";
    echo(prefix + ": " + cmd);
    return exec(cmd);
}
