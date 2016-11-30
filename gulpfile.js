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
    } catch (err) {
        var msg = err.output ? err.output.toString() : err.message;
        console.error(msg);
        cb(new gutil.PluginError(msg));
        return false;
    }

    return true;
}

gulp.task('clean', function (cb) {
    make('clean', cb);
});

gulp.task('build', function (cb) {
    make('build', cb);
});

gulp.task('test', function (cb) {
    make('test', cb);
});

gulp.task('default', ['build']);

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

gulp.task('packageprod', ['installTaskDeps'], function (cb) {
    console.log('Creating PRODUCTION vsix...');
    exec('node ./node_modules/tfx-cli/_build/app.js extension create --manifest-globs app-store-vsts-extension.json --override ' + toOverrideString(prodManifestOverride), function (err, stdout, stderr) {
        console.log(stdout);
        console.log(stderr);
        cb(err);
    });
});

gulp.task('packagetest', ['installTaskDeps'], function (cb) {
    console.log('Creating TEST vsix...');
    exec('node ./node_modules/tfx-cli/_build/app.js extension create --manifest-globs app-store-vsts-extension.json --override ' + toOverrideString(devManifestOverride), function (err, stdout, stderr) {
        console.log(stdout);
        console.log(stderr);
        cb(err);
    });
});

// Default to list reporter when run directly.
// CI build can pass '--reporter=junit' to create JUnit results files
var reporter = 'list';
var reporterLocation = '';
if (argv.reporter === "junit") {
    reporter = 'mocha-junit-reporter';
    reporterLocation = '_results/test-results.xml';
}

// gulp testwithresults --reporter junit
gulp.task('testwithresults', function (cb) {
    console.log('Running tests and publishing test results...');
    var cmdline = 'test --testResults true --testReporter ' + reporter;
    if (reporterLocation) {
        cmdline += ' --testReportLocation ' + reporterLocation;
    }
    make(cmdline, cb);
});
