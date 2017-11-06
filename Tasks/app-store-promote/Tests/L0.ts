/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
'use strict';

// npm install mocha --save-dev
// typings install dt~mocha --save --global

import * as path from 'path';
import * as assert from 'assert';
import * as ttm from 'vsts-task-lib/mock-test';

describe('app-store-promote L0 Suite', function () {
    /* tslint:disable:no-empty */
    before(() => {
    });

    after(() => {
    });
    /* tslint:enable:no-empty */

    it('enforce darwin', (done: MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0EnforceDarwin.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert.equal(true, tr.createdErrorIssue('Error: loc_mock_DarwinOnly'));
        assert(tr.failed, 'task should have failed');

        done();
    });

    it('username+password with deliver', (done: MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0UserPassDeliver.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane deliver.');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('username+password - no fastlane install', (done: MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0NoFastlaneInstall.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.invokedToolCount === 1, 'should have only run fastlane deliver.');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('username+password - specific fastlane install', (done: MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0SpecificFastlaneInstall.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('/usr/bin/gem uninstall fastlane -a -I'), 'gem uninstall fastlane should have been run.');
        assert(tr.ran('/usr/bin/gem install fastlane -v 2.15.1'), 'gem install fastlane with a specific version should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem uninstall, gem install and fastlane deliver.');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('username+password - specific fastlane install - no version', (done: MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0SpecificFastlaneInstallNoVersion.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.stdout.indexOf('Input required: fastlaneToolsSpecificVersion') !== -1, 'Task should have written to stdout');
        assert(tr.failed, 'task should have failed');

        done();
    });

    it('additional fastlane install', (done: MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0AdditionalFastlaneArguments.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.invokedToolCount === 1, 'should have run fastlane deliver.');
        assert(tr.ran('fastlane deliver submit_build -u creds-username -a com.microsoft.test.appId --skip_binary_upload true --skip_metadata true --skip_screenshots true --automatic_release --force --app-version 2.1.5'), 'should have run fastlane deliver with additional fastlane arguments.');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('service endpoint with deliver', (done: MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0ServiceEndpointDeliver.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane deliver.');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('app specific password', (done: MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0AppSpecificPassword.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.invokedToolCount === 1, 'should have run fastlane deliver.');
        assert(tr.succeeded, 'task should have succeeded Stdout: [' + tr.stdout + '] err[' + tr.stderr + ']');
        assert(tr.stdout.indexOf('Using two-factor authentication') !== -1, 'Task should have set the app-specific password');
        assert(tr.stdout.indexOf('Clearing two-factor authentication environment variables') !== -1, 'Task should have cleared the app-specific password');

        done();
    });

    it('app specific password using service end point', (done: MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0AppSpecificPasswordEndPoint.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.invokedToolCount === 1, 'should have run fastlane deliver. Stdout: [' + tr.stdout + '] err[' + tr.stderr + ']');
        assert(tr.succeeded, 'task should have succeeded');
        assert(tr.stdout.indexOf('Using two-factor authentication') !== -1, 'Task should have set the app-specific password');
        assert(tr.stdout.indexOf('Clearing two-factor authentication environment variables') !== -1, 'Task should have cleared the app-specific password');

        done();
    });

    it('two factor authentication using service end point without fastlane session', (done: MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0AppSpecificPasswordEndPointIncomplete.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert.equal(true, tr.createdErrorIssue('Error: loc_mock_FastlaneSessionEmpty'));
        assert(tr.failed, 'task should have failed');

        done();
    });

    it('two factor authenitcation app specific password without fastlane session', (done: MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0AppSpecificPasswordNoFastlaneSession.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.stdout.indexOf('Input required: fastlaneSession') !== -1, 'Task should have written to stdout');
        assert(tr.failed, 'task should have failed');

        done();
    });

    it('no bundle id', (done: MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0NoBundleId.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.stdout.indexOf('Input required: appIdentifier') !== -1, 'Task should have written to stdout');
        assert(tr.failed, 'task should have failed');

        done();
    });

    it('no choose build', (done: MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0NoChooseBuild.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.stdout.indexOf('Input required: chooseBuild') !== -1, 'Task should have written to stdout');
        assert(tr.failed, 'task should have failed');

        done();
    });

    it('latest build', (done: MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0LatestBuild.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('fastlane deliver submit_build -u creds-username -a com.microsoft.test.appId --skip_binary_upload true --skip_metadata true --skip_screenshots true --force'), 'fastlane deliver with the latest build should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane deliver.');
        assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('should auto release', (done: MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0ShouldAutoRelease.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('fastlane deliver submit_build -u creds-username -a com.microsoft.test.appId --skip_binary_upload true --skip_metadata true --skip_screenshots true --automatic_release --force'), 'fastlane deliver with auto release should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane deliver.');
        assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('team id', (done: MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0TeamId.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('fastlane deliver submit_build -u creds-username -a com.microsoft.test.appId --skip_binary_upload true --skip_metadata true --skip_screenshots true -k teamId --force'), 'fastlane deliver with team id should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane deliver.');
        assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('team name', (done: MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0TeamName.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('fastlane deliver submit_build -u creds-username -a com.microsoft.test.appId --skip_binary_upload true --skip_metadata true --skip_screenshots true -e teamName --force'), 'fastlane deliver with team name should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane deliver.');
        assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('team id and team name', (done: MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0TeamIdTeamName.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('fastlane deliver submit_build -u creds-username -a com.microsoft.test.appId --skip_binary_upload true --skip_metadata true --skip_screenshots true -k teamId -e teamName --force'), 'fastlane deliver with team id and team name should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane deliver.');
        assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('build number', (done: MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0BuildNumber.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('fastlane deliver submit_build -u creds-username -a com.microsoft.test.appId -n 42 --skip_binary_upload true --skip_metadata true --skip_screenshots true --force'), 'fastlane deliver with build number should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane deliver.');
        assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('custom GEM_CACHE environment variable', (done: MochaDone) => {
        this.timeout(1000);

        //L0GemCacheEnvVar.ts sets the GEM_CACHE env var and expects it to be used when fastlane is updated.
        let tp = path.join(__dirname, 'L0GemCacheEnvVar.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('fastlane deliver submit_build -u creds-username -a com.microsoft.test.appId -n 42 --skip_binary_upload true --skip_metadata true --skip_screenshots true --force'), 'fastlane deliver with build number should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane deliver.');
        assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');
        assert(tr.ran('/usr/bin/gem update fastlane -i /usr/bin/customGemCache'));

        done();
    });

});
