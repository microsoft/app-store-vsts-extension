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
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('service endpoint with deliver', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0ServiceEndpointDeliver.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
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
        assert(tr.ran('deliver submit_build -u creds-username -a com.microsoft.test.appId --skip_binary_upload true --skip_metadata true --skip_screenshots true --force'), 'deliver with the latest build should have been run.');
        assert(tr.invokedToolCount === 2, 'should have run both gem and deliver.');
        assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('should auto release', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0ShouldAutoRelease.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('deliver submit_build -u creds-username -a com.microsoft.test.appId --skip_binary_upload true --skip_metadata true --skip_screenshots true --automatic_release --force'), 'deliver with auto release should have been run.');
        assert(tr.invokedToolCount === 2, 'should have run both gem and deliver.');
        assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('team id', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0TeamId.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('deliver submit_build -u creds-username -a com.microsoft.test.appId --skip_binary_upload true --skip_metadata true --skip_screenshots true -q teamId --force'), 'deliver with team id should have been run.');
        assert(tr.invokedToolCount === 2, 'should have run both gem and deliver.');
        assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('team name', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0TeamName.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('deliver submit_build -u creds-username -a com.microsoft.test.appId --skip_binary_upload true --skip_metadata true --skip_screenshots true -r teamName --force'), 'deliver with team name should have been run.');
        assert(tr.invokedToolCount === 2, 'should have run both gem and deliver.');
        assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('team id and team name', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0TeamIdTeamName.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('deliver submit_build -u creds-username -a com.microsoft.test.appId --skip_binary_upload true --skip_metadata true --skip_screenshots true -q teamId -r teamName --force'), 'deliver with team id and team name should have been run.');
        assert(tr.invokedToolCount === 2, 'should have run both gem and deliver.');
        assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('build number', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0BuildNumber.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('deliver submit_build -u creds-username -a com.microsoft.test.appId -n 42 --skip_binary_upload true --skip_metadata true --skip_screenshots true --force'), 'deliver with build number should have been run.');
        assert(tr.invokedToolCount === 2, 'should have run both gem and deliver.');
        assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

});
