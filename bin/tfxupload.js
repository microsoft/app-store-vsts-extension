/*
  Copyright (c) Microsoft. All rights reserved.  
  Licensed under the MIT license. See LICENSE file in the project root for full license information.
*/

var path = require('path'),
    fs = require('fs'),
    Q = require ('q'),
    exec = Q.nfbind(require('child_process').exec);

function installTasks() {
    var promise = Q();
    var tasksPath = path.join(process.cwd(), 'Tasks');
    var tasks = fs.readdirSync(tasksPath);
    console.log(tasks.length + ' tasks found.')
    tasks.forEach(function(task) {
        promise = promise.then(function() {
                console.log('Processing task ' + task);
                process.chdir(path.join(tasksPath,task));
                return npmInstall();
            });

        if (process.argv.indexOf("--installonly") == -1) {
            promise = promise.then(tfxUpload);
        }
    });    
    return promise;
}

function npmInstall() {
    console.log('Installing npm dependencies for task...');
    return exec('npm install --only=prod').then(logExecReturn);
}

function tfxUpload() {
    console.log('Transferring...')
    return exec('tfx build tasks upload --task-path . --overwrite true').then(logExecReturn);
}

function logExecReturn(result) {
    console.log(result[0]);
    if (result[1] !== '') {
        console.error(result[1]);
    }
}

installTasks()
    .done(function() {
        console.log('Complete!');
    }, function(input) {
        console.log('Failed!');
    });
