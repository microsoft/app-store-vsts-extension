// parse command line options
var minimist = require('minimist');
var mopts = {
    string: [
        'server',
        'suite',
        'task',
        'version',
        'testResults',
        'testReporter',
        'testReportLocation'
    ]
};
var options = minimist(process.argv, mopts);

// remove well-known parameters from argv before loading make,
// otherwise each arg will be interpreted as a make target
process.argv = options._;

// modules
var make = require('shelljs/make');
var fs = require('fs');
var os = require('os');
var path = require('path');
var semver = require('semver');
var util = require('./make-util');

// util functions
var cd = util.cd;
var cp = util.cp;
var mkdir = util.mkdir;
var rm = util.rm;
var test = util.test;
var run = util.run;
var banner = util.banner;
var rp = util.rp;
var fail = util.fail;
var ensureExists = util.ensureExists;
var pathExists = util.pathExists;
var buildNodeTask = util.buildNodeTask;
var lintNodeTask = util.lintNodeTask;
var buildPs3Task = util.buildPs3Task;
var addPath = util.addPath;
var copyTaskResources = util.copyTaskResources;
var matchFind = util.matchFind;
var matchCopy = util.matchCopy;
var matchRemove = util.matchRemove;
var ensureTool = util.ensureTool;
var assert = util.assert;
var getExternals = util.getExternals;
var createResjson = util.createResjson;
var createTaskLocJson = util.createTaskLocJson;
var validateTask = util.validateTask;

// global paths
var buildPath = path.join(__dirname, '_build', 'Tasks');
var buildTestsPath = path.join(__dirname, '_build', 'Tests');
var commonPath = path.join(__dirname, '_build', 'Tasks', 'Common');
var packagePath = path.join(__dirname, '_package');
var testTasksPath = path.join(__dirname, '_test', 'Tasks');
var testPath = path.join(__dirname, '_test', 'Tests');

// node min version
var minNodeVer = '4.0.0';
if (semver.lt(process.versions.node, minNodeVer)) {
    fail('requires node >= ' + minNodeVer + '.  installed: ' + process.versions.node);
}

// add node modules .bin to the path so we can dictate version of tsc etc...
var binPath = path.join(__dirname, 'node_modules', '.bin');
if (!test('-d', binPath)) {
    fail('node modules bin not found.  ensure npm install has been run.');
}
addPath(binPath);

// resolve list of tasks
var taskList;
if (options.task) {
    // find using --task parameter
    taskList = matchFind(options.task, path.join(__dirname, 'Tasks'), { noRecurse: true })
        .map(function (item) {
            return path.basename(item);
        });
    if (!taskList.length) {
        fail('Unable to find any tasks matching pattern ' + options.task);
    }
}
else {
    // load the default list
    taskList = JSON.parse(fs.readFileSync(path.join(__dirname, 'make-options.json'))).tasks;
}

target.clean = function () {
    rm('-Rf', path.join(__dirname, '_build'));
    mkdir('-p', buildPath);
    rm('-Rf', path.join(__dirname, '_test'));
};

//
// ex: node make.js build
// ex: node make.js build --task ShellScript
//
target.build = function() {
    target.clean();

    ensureTool('tsc', '--version', 'Version 1.8.7');
    ensureTool('npm', '--version', function (output) {
        if (semver.lt(output, '3.0.0')) {
            fail('expected 3.0.0 or higher');
        }
    });

    taskList.forEach(function(taskName) {
        banner('Building: ' + taskName);
        var taskPath = path.join(__dirname, 'Tasks', taskName);
        ensureExists(taskPath);

        // load the task.json
        var outDir;
        var shouldBuildNode = test('-f', path.join(taskPath, 'tsconfig.json'));
        var shouldBuildPs3 = false;
        var taskJsonPath = path.join(taskPath, 'task.json');
        if (test('-f', taskJsonPath)) {
            var taskDef = require(taskJsonPath);
            validateTask(taskDef);

            // fixup the outDir (required for relative pathing in legacy L0 tests)
            outDir = path.join(buildPath, taskDef.name);

            // create loc files
            createTaskLocJson(taskPath);
            createResjson(taskDef, taskPath);

            // determine the type of task
            shouldBuildNode = shouldBuildNode || taskDef.execution.hasOwnProperty('Node');
            shouldBuildPs3 = taskDef.execution.hasOwnProperty('PowerShell3');
        }
        else {
            outDir = path.join(buildPath, path.basename(taskPath));
        }

        mkdir('-p', outDir);

        // get externals
        var taskMakePath = path.join(taskPath, 'make.json');
        var taskMake = test('-f', taskMakePath) ? require(taskMakePath) : {};
        if (taskMake.hasOwnProperty('externals')) {
            console.log('Getting task externals');
            getExternals(taskMake.externals, outDir);
        }

        //--------------------------------
        // Common: build, copy, install 
        //--------------------------------
        if (taskMake.hasOwnProperty('common')) {
            var common = taskMake['common'];

            common.forEach(function(mod) {
                var modPath = path.join(taskPath, mod['module']);
                var modName = path.basename(modPath);
                var modOutDir = path.join(commonPath, modName);

                if (!test('-d', modOutDir)) {
                    banner('Building module ' + modPath, true);

                    mkdir('-p', modOutDir);

                    // create loc files
                    var modJsonPath = path.join(modPath, 'module.json');
                    if (test('-f', modJsonPath)) {
                        createResjson(require(modJsonPath), modPath);
                    }

                    // npm install and compile
                    if ((mod.type === 'node' && mod.compile == true) || test('-f', path.join(modPath, 'tsconfig.json'))) {
                        buildNodeTask(modPath, modOutDir);
                    }

                    // copy default resources and any additional resources defined in the module's make.json
                    console.log();
                    console.log('> copying module resources');
                    var modMakePath = path.join(modPath, 'make.json');
                    var modMake = test('-f', modMakePath) ? require(modMakePath) : {};
                    copyTaskResources(modMake, modPath, modOutDir);

                    // get externals
                    if (modMake.hasOwnProperty('externals')) {
                        console.log('Getting module externals');
                        getExternals(modMake.externals, modOutDir);
                    }
                }

                // npm install the common module to the task dir
                if (mod.type === 'node' && mod.compile == true) {
                    mkdir('-p', path.join(taskPath, 'node_modules'));
                    rm('-Rf', path.join(taskPath, 'node_modules', modName));
                    var originalDir = pwd();
                    cd(taskPath);
                    run('npm install ' + modOutDir);
                    cd(originalDir);
                }
                // copy module resources to the task output dir
                else if (mod.type === 'ps') {
                    console.log();
                    console.log('> copying module resources to task');
                    var dest;
                    if (mod.hasOwnProperty('dest')) {
                        dest = path.join(outDir, mod.dest, modName);
                    }
                    else {
                        dest = path.join(outDir, 'ps_modules', modName);
                    }

                    matchCopy('!Tests', modOutDir, dest, { noRecurse: true });
                }
            });
        }

        // build Node task
        if (shouldBuildNode) {
            buildNodeTask(taskPath, outDir);
            lintNodeTask(taskPath, outDir);
        }

        // build PowerShell3 task
        if (shouldBuildPs3) {
            buildPs3Task(taskPath, outDir);
        }

        // copy default resources and any additional resources defined in the task's make.json
        console.log();
        console.log('> copying task resources');
        copyTaskResources(taskMake, taskPath, outDir);
    });

    banner('Build successful', true);
}

//
// will run tests for the scope of tasks being built
// npm test
// node make.js test
// node make.js test --task ShellScript --suite L0
//
target.test = function() {
    ensureTool('tsc', '--version', 'Version 1.8.7');
    ensureTool('mocha', '--version', '2.3.3');

    // run the tests
    var suiteType = options.suite || 'L0';
    var taskType = options.task || '*';
    var pattern1 = buildPath + '/' + taskType + '/Tests/' + suiteType + '.js';
    var pattern2 = buildPath + '/Common/' + taskType + '/Tests/' + suiteType + '.js';
    var testsSpec = matchFind(pattern1, buildPath)
        .concat(matchFind(pattern2, buildPath));
    if (!testsSpec.length) {
        fail(`Unable to find tests using the following patterns: ${JSON.stringify([pattern1, pattern2])}`);
    }

    // set up any test reporting
    var testResultsArgs = '';
    if (options.testResults) {
        if (options.testReporter) {
            testResultsArgs += ' -R ' + options.testReporter;
        }
        if (options.testReportLocation) {
            testResultsArgs += ' -O mochaFile=' + path.join(__dirname, options.testReportLocation);
        }
    }
    console.log('testResultsArgs=' + testResultsArgs);

    run('mocha ' + testsSpec.join(' ') + testResultsArgs, /*inheritStreams:*/true);
}
