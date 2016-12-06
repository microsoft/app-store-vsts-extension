# Visual Studio Team Services Extension for the Apple App Store Contributor Guide
The instructions below will help you set up your development environment to contribute to this repository.
Make sure you've already cloned the repo.  :smile:

## Ways to Contribute
Interested in contributing to the vsts-vscode project? There are plenty of ways to contribute, all of which help make the project better.
* Submit a [bug report](https://github.com/Microsoft/app-store-vsts-extension/issues/new) or [feature request](https://github.com/Microsoft/app-store-vsts-extension/issues/new) through the Issue Tracker
* Review the [source code changes](https://github.com/Microsoft/app-store-vsts-extension/pulls)
* Submit a code fix for a bug (see `Submitting Pull Requests` below)
* Participate in [discussions](https://github.com/Microsoft/app-store-vsts-extension/issues)

## Set up Node, npm and gulp

### Node and npm
**Windows and Mac OSX**: Download and install node from [nodejs.org](http://nodejs.org/)

**Linux**: Install [using package manager](https://nodejs.org/en/download/package-manager/)

From a terminal ensure at least node 5.4.1 and npm 3:
```bash
$ node -v && npm -v
v6.9.1
3.10.8
```

### Gulp
Install gulp
```bash
[sudo] npm install gulp -g
```
From the root of the repo, install all of the build dependencies:
```bash
[sudo] npm install
```

## Build
To build the extension, run the following from the root of the repo:

```bash
gulp
```
This command will create the _build folder at the root of the repository.

If you open the root of the repository in Visual Studio Code, you can build with Ctrl+Shift+B.

## Tests
Tests should be run with changes.  Before you run tests, make sure you have built the extension.  Run the following from the root of the repo:

```bash
gulp test
```
To run the tests within Visual Studio Code, select the Debug viewlet, change the debug profile to "Launch L0 Tests", set a breakpoint directly in the
L0.js file (e.g., _build/Tasks/AppStoreRelease/Tests/L0.js) and press `F5`.  At this time, you cannot debug the task itself during tests as a second
node process is created (in which the task is run).

### Testing task changes
In order to test your task changes, you will need to upload the new task to your own account and test it with a build definition.  First, create a build definition
you can use to test your changes.  Then, after building the task you changed, upload the task to your account.  To upload a task, you will need to install the
[tfx-cli](https://www.npmjs.com/package/tfx-cli) tool, login in to your account with it (e.g., https://**account**.visualstudio.com/DefaultCollection) and then upload
the task.  To do the actual uploading you can run the following from the *_build/Tasks* folder:
```bash
tfx build tasks upload --task-path ./AppStorePromote
```
**Note**: The task will only be uploaded if the version of the task has been incremented.  To do this, update the *patch* version in the task's **task.json** and **task.loc.json** file.  You will
need to re-build the task after making this change.

To make subsequent changes, you can either remove the previous version of the task (using the tfx-cli tool) and re-upload an updated version, or simply increment the *patch* version again and re-upload the task.


## Package
The package command will package the extension into a Visual Studio extension installer (.vsix file).

From the root of the repo:
```bash
gulp packagetest
```
The VSIX package will be created in the root of the repository.

## Code Styles
1. gulp build will run `tslint` and flag any errors.  Please ensure that the code stays clean.
2. All source files must have the following lines at the top:
```
 /*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
```

## Contribution License Agreement
In order to contribute, you will need to sign a [Contributor License Agreement](https://cla.microsoft.com/).

## Code of Conduct
This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Submitting Pull Requests
We welcome pull requests!  Fork this repo and send us your contributions.  Go [here](https://help.github.com/articles/using-pull-requests/) to get familiar with GitHub pull requests.

Before submitting your request, ensure that both `gulp` and `gulp test` succeed.
