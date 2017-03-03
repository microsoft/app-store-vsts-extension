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

    it('enforce darwin', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0EnforceDarwin.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert.equal(true, tr.createdErrorIssue('Error: loc_mock_DarwinOnly'));
        assert(tr.failed, 'task should have failed');

        done();
    });

    it('username+password with deliver', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0UserPassDeliver.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane deliver.');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('username+password - no fastlane install', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0NoFastlaneInstall.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.invokedToolCount === 1, 'should have only run fastlane pilot.');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('username+password - specific fastlane install', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0SpecificFastlaneInstall.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('/usr/bin/gem install fastlane -v 2.15.1'), 'gem install fastlane with a specific version should have been run.');
        assert(tr.invokedToolCount === 2, 'should have run only gem install and fastlane pilot.');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('username+password - specific fastlane install - no version', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0SpecificFastlaneInstallNoVersion.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.stdout.indexOf('Input required: fastlaneToolsSpecificVersion') !== -1, 'Task should have written to stdout');
        assert(tr.failed, 'task should have failed');

        done();
    });

    it('service endpoint with deliver', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0ServiceEndpointDeliver.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane deliver.');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('no bundle id', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0NoBundleId.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.stdout.indexOf('Input required: appIdentifier') !== -1, 'Task should have written to stdout');
        assert(tr.failed, 'task should have failed');

        done();
    });

    it('no choose build', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0NoChooseBuild.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.stdout.indexOf('Input required: chooseBuild') !== -1, 'Task should have written to stdout');
        assert(tr.failed, 'task should have failed');

        done();
    });

    it('latest build', (done:MochaDone) => {
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

    it('should auto release', (done:MochaDone) => {
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

    it('team id', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0TeamId.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('fastlane deliver submit_build -u creds-username -a com.microsoft.test.appId --skip_binary_upload true --skip_metadata true --skip_screenshots true -q teamId --force'), 'fastlane deliver with team id should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane deliver.');
        assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('team name', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0TeamName.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('fastlane deliver submit_build -u creds-username -a com.microsoft.test.appId --skip_binary_upload true --skip_metadata true --skip_screenshots true -r teamName --force'), 'fastlane deliver with team name should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane deliver.');
        assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('team id and team name', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0TeamIdTeamName.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('fastlane deliver submit_build -u creds-username -a com.microsoft.test.appId --skip_binary_upload true --skip_metadata true --skip_screenshots true -q teamId -r teamName --force'), 'fastlane deliver with team id and team name should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane deliver.');
        assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('build number', (done:MochaDone) => {
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

    it('custom GEM_CACHE environment variable', (done:MochaDone) => {
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
