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
        'testReportLocation',
        'node'
    ]
};
var options = minimist(process.argv, mopts);

// remove well-known parameters from argv before loading make,
// otherwise each arg will be interpreted as a make target
process.argv = options._;

// modules
var make = require('shelljs/make');
var fs = require('fs');
var path = require('path');
var semver = require('semver');
var util = require('./make-util');

// util functions
var mkdir = util.mkdir;
var rm = util.rm;
var test = util.test;
var run = util.run;
var banner = util.banner;
var fail = util.fail;
var ensureExists = util.ensureExists;
var buildNodeTask = util.buildNodeTask;
var lintNodeTask = util.lintNodeTask;
var buildPs3Task = util.buildPs3Task;
var addPath = util.addPath;
var copyTaskResources = util.copyTaskResources;
var matchFind = util.matchFind;
var matchCopy = util.matchCopy;
var ensureTool = util.ensureTool;
var createResjson = util.createResjson;
var createTaskLocJson = util.createTaskLocJson;
var validateTask = util.validateTask;
var getTaskNodeVersion = util.getTaskNodeVersion;
var createExtension = util.createExtension;

// global paths
var buildPath = path.join(__dirname, '_build', 'Tasks');
var commonPath = path.join(__dirname, '_build', 'Tasks', 'Common');

// core dev-dependencies constants
const constants = require('./dev-dependencies-constants');

const MOCHA_TARGET_VERSION = constants.MOCHA_TARGET_VERSION;
const TSC_CURRENT_VERSION = constants.TSC_CURRENT_VERSION;
const NODE_MIN_VERSION = constants.NODE_MIN_VERSION;
const NPM_MIN_VERSION = constants.NPM_MIN_VERSION;

if (semver.lt(process.versions.node,  NODE_MIN_VERSION)) {
    fail(`requires node >= ${NODE_MIN_VERSION}. installed: ${process.versions.node}`);
}

// Node 14 is supported by the build system, but not currently by the agent. Block it for now
var supportedNodeTargets = ["Node", "Node10", "Node16", "Node20_1"];

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
target.build = async function() {
    target.clean();

    ensureTool('tsc', '--version', `Version ${TSC_CURRENT_VERSION}`);
    ensureTool('npm', '--version', function (output) {
        if (semver.lt(output, NPM_MIN_VERSION)) {
            fail(`expected ${NPM_MIN_VERSION} or higher`);
        }
    });

    for (let i = 0; i < taskList.length; i++) {
        const taskName = taskList[i];
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
            outDir = path.join(buildPath, taskName);

            // create loc files
            createTaskLocJson(taskPath);
            createResjson(taskDef, taskPath);

            // determine the type of task
            shouldBuildNode = shouldBuildNode || supportedNodeTargets.some(node => taskDef.execution.hasOwnProperty(node));
            shouldBuildPs3 = taskDef.execution.hasOwnProperty('PowerShell3');
        }
        else {
            outDir = path.join(buildPath, path.basename(taskPath));
        }

        mkdir('-p', outDir);

        // build Node task
        if (shouldBuildNode) {
            buildNodeTask(taskPath, outDir);
            lintNodeTask(taskPath, outDir);
        }

        // build PowerShell3 task
        if (shouldBuildPs3) {
            await buildPs3Task(taskPath, outDir);
        }

        console.log();
        console.log('> copying task resources');
        copyTaskResources(taskPath, outDir);
    }

    banner('Build successful', true);
}

//
// will run tests for the scope of tasks being built
// npm test
// node make.js test
// node make.js test --task ShellScript --suite L0
//
target.test = async function() {
    ensureTool('tsc', '--version', `Version ${TSC_CURRENT_VERSION}`);
    ensureTool('mocha', '--version', MOCHA_TARGET_VERSION);

    // run the tests
    var suiteType = options.suite || 'L0';
    async function runTaskTests(taskName) {
        banner('Testing: ' + taskName);
        // find the tests
        var nodeVersions = options.node ? new Array(options.node) : [...getTaskNodeVersion(buildPath, taskName)];
        var pattern1 = path.join(buildPath, taskName, 'Tests', suiteType + '.js');
        var pattern2 = path.join(buildPath, 'Common', taskName, 'Tests', suiteType + '.js');

        var testsSpec = [];

        if (fs.existsSync(pattern1)) {
            testsSpec.push(pattern1);
        }
        if (fs.existsSync(pattern2)) {
            testsSpec.push(pattern2);
        }

        if (testsSpec.length == 0) {
            console.warn(`Unable to find tests using the following patterns: ${JSON.stringify([pattern1, pattern2])}`);
            return;
        }

        for (let i = 0; i < nodeVersions.length; i++) {
            let nodeVersion = nodeVersions[i];
            try {
                nodeVersion = String(nodeVersion);
                banner('Run Mocha Suits for node ' + nodeVersion);
                // setup the version of node to run the tests
                await util.installNode(nodeVersion);

                run('mocha ' + testsSpec.join(' ') /*+ ' --reporter mocha-junit-reporter --reporter-options mochaFile=../testresults/test-results.xml'*/, /*inheritStreams:*/true);
            }  catch (e) {
                console.error(e);
                process.exit(1);
            }
        }
    }

    if (options.task) {
        await runTaskTests(options.task);
    } else {
        // Run tests for each task that exists
        for (let i = 0; i < taskList.length; i++) {
            const taskName = taskList[i];
            var taskPath = path.join(buildPath, taskName);
            if (fs.existsSync(taskPath)) {
                await runTaskTests(taskName);
            }
        }

        banner('Running common library tests');
        var commonLibPattern = path.join(buildPath, 'Common', '*', 'Tests', suiteType + '.js');
        var specs = [];
        if (matchFind(commonLibPattern, buildPath).length > 0) {
            specs.push(commonLibPattern);
        }
        if (specs.length > 0) {
            // setup the version of node to run the tests
            await util.installNode(options.node);
            run('mocha ' + specs.join(' ') /*+ ' --reporter mocha-junit-reporter --reporter-options mochaFile=../testresults/test-results.xml'*/, /*inheritStreams:*/true);
        } else {
            console.warn("No common library tests found");
        }
    }
}

target.create = function() {
    banner('Creating PRODUCTION vsix...');

    var prodManifestOverride = {
        public: true
    };

    createExtension(prodManifestOverride);
}

target.createtest = function() {
    banner('Creating TEST vsix...');

    var devManifestOverride = {
        public: false,
        name: "App Store Deploy-Dev",
        id: "app-store-vsts-extension-dev",
        publisher: "ms-mobiledevops-test"
    };

    createExtension(devManifestOverride);
}
