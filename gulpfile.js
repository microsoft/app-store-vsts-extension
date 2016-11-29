var gulp = require('gulp');
var gutil = require('gulp-util');
var child_process = require('child_process');
var process = require('process');
var exec  = require('child_process').exec;
var path = require('path');
var fs = require('fs');
var argv = require('yargs').argv;

function make (target, cb) {
    var cl = ('node make.js ' + target + ' ' + process.argv.slice(3).join(' ')).trim();
    console.log('------------------------------------------------------------');
    console.log('> ' + cl);
    console.log('------------------------------------------------------------');
    try {
        child_process.execSync(cl, { cwd: __dirname, stdio: 'inherit' });
    }
    catch (err) {
        var msg = err.output ? err.output.toString() : err.message;
        console.error(msg);
        cb(new gutil.PluginError(msg));
        return false;
    }

    return true;
}

gulp.task('build', function (cb) {
    make('build', cb);
});

gulp.task('default', ['build']);

gulp.task('test', function (cb) {
    make('test', cb);
    //make('testLegacy', cb);
});

// gulp.task('package', function (cb) {
//     var publish = process.argv.filter(function (arg) { return arg == '--server' }).length > 0;
//     make('build', cb) &&
//         make('package', cb) &&
//         make('test', cb) &&
//         make('testLegacy', cb) &&
//         publish &&
//         make('publish', cb);
// });

// BELOW are the Extension-specific gulp tasks
var devManifestOverride = {
    public: false,
    name: "App Store Deploy-Dev",
    id: "app-store-vsts-extension-dev",
    publisher: "ms-mobiledevops-test"
};

var prodManifestOverride = {
    public: true
};

gulp.task('installTaskDeps', function (cb) {
    console.log('Installing task dependencies...');

    var rootPath = process.cwd(); 
    var tasksPath = path.join(rootPath, 'Tasks');
    var tasks = fs.readdirSync(tasksPath);
    console.log(tasks.length + ' tasks found.')
    tasks.forEach(function(task) {
        console.log('Processing task ' + task);
        process.chdir(path.join(tasksPath,task));

        console.log('Installing PRODUCTION npm dependencies for task (' + task + ')...');

        exec('npm install --only=prod', function (err, stdout, stderr) {
            console.log(stdout);
            console.log(stderr);
            if (err) {
                cb(err);
            }
        });
    });
    process.chdir(rootPath);

    cb();
});

function toOverrideString(object) {
    return JSON.stringify(object).replace(/"/g, '\\"');
}

gulp.task('packageProd', ['installTaskDeps'], function (cb) {
    console.log('Creating PRODUCTION vsix...');
    exec('node ./node_modules/tfx-cli/_build/app.js extension create --manifest-globs app-store-vsts-extension.json --override ' + toOverrideString(prodManifestOverride), function (err, stdout, stderr) {
        console.log(stdout);
        console.log(stderr);
        cb(err);
    });
});

gulp.task('packageTest', ['installTaskDeps'], function (cb) {
    console.log('Creating TEST vsix...');
    exec('node ./node_modules/tfx-cli/_build/app.js extension create --manifest-globs app-store-vsts-extension.json --override ' + toOverrideString(devManifestOverride), function (err, stdout, stderr) {
        console.log(stdout);
        console.log(stderr);
        cb(err);
    });
});

gulp.task('publishTest', ['packageTest'], function (cb) {
    console.log('Publishing TEST VSIX...');
    var accessToken = process.env['PUBLISH_ACCESSTOKEN'];
    if (!accessToken) {
        cb("Must set PUBLISH_ACCESSTOKEN environment variable to publish a test VSIX");
    }

    //jeyou: Need to test this!
    // exec('node ./node_modules/tfx-cli/_build/app.js extension publish --manifest-globs app-store-vsts-extension.json --override ' + toOverrideString(devManifestOverride) + ' --share-with mobiledevops x04ty29er --token ' + accessToken, function (err, stdout, stderr) {
    //     console.log(stdout);
    //     console.log(stderr);
    //     cb(err);
    // });
});

// Default to list reporter when run directly.
// CI build can pass '--reporter=junit' to create JUnit results files
var reporter = 'list';
var reporterLocation = '';
if (argv.reporter === "junit") {
    reporter = 'mocha-junit-reporter';
    reporterLocation = '_results/test-results.xml';
}

gulp.task('testResults', function (cb) {
    var cmdline = 'test --testResults true --testReporter ' + reporter;
    if (reporterLocation) {
        cmdline += ' --testReportLocation ' + reporterLocation;
    }
    make(cmdline, cb);
});
