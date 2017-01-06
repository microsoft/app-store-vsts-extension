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

describe('app-store-release L0 Suite', function () {
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

    it('no authtype', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0NoAuthType.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.stdout.indexOf('Input required: authType') !== -1, 'Task should have written to stdout');
        assert(tr.failed, 'task should have failed');

        done();
    });

    it('no service endpoint', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0NoEndpoint.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.stdout.indexOf('Input required: serviceEndpoint') !== -1, 'Task should have written to stdout');
        assert(tr.failed, 'task should have failed');

        done();
    });

    it('no username+password', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0NoUserPass.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        // When no username+password is provided, username fails first
        assert(tr.stdout.indexOf('Input required: username') !== -1, 'Task should have written to stdout');
        assert(tr.failed, 'task should have failed');

        done();
    });

    it('custom GEM_CACHE env var', (done:MochaDone) => {
        this.timeout(1000);

        //L0GemCacheEnvVar.ts sets the GEM_CACHE env var and expects it to be used when fastlane is updated.
        let tp = path.join(__dirname, 'L0GemCacheEnvVar.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane pilot.');
        assert(tr.succeeded, 'task should have succeeded');
        assert(tr.ran('/usr/bin/gem update fastlane -i /usr/bin/customGemCache'));

        done();
    });

    it('testflight - username+password', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0TestFlightUserPass.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane pilot.');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('testflight - service endpoint', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0TestFlightServiceEndpoint.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane pilot.');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('testflight - no ipa path', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0TestFlightNoIpaPath.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.stdout.indexOf('Input required: ipaPath') !== -1, 'Task should have written to stdout');
        assert(tr.failed, 'task should have failed');

        done();
    });

    it('testflight - team id', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0TestFlightTeamId.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('fastlane pilot upload -u creds-username -i mypackage.ipa -q teamId'), 'fastlane pilot upload with teamId should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane pilot.');
        assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('testflight - team name', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0TestFlightTeamName.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('fastlane pilot upload -u creds-username -i mypackage.ipa -r teamName'), 'fastlane pilot upload with teamName should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane pilot.');
        assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('testflight - team id and team name', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0TestFlightTeamIdTeamName.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('fastlane pilot upload -u creds-username -i mypackage.ipa -q teamId -r teamName'), 'fastlane pilot upload with teamId and teamName should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane pilot.');
        assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('testflight - should skip submission', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0TestFlightShouldSkipSubmission.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('fastlane pilot upload -u creds-username -i mypackage.ipa --skip_submission true'), 'fastlane pilot upload with skip_submission should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane pilot.');
        assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('testflight - should skip waiting for processing', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0TestFlightShouldSkipWaitingForProcessing.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('fastlane pilot upload -u creds-username -i mypackage.ipa --skip_waiting_for_build_processing true'), 'fastlane pilot upload with skip_waiting_for_build_processing should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane pilot.');
        assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('testflight - one ipa file', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0TestFlightOneIpaFile.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('fastlane pilot upload -u creds-username -i mypackage.ipa'), 'fastlane pilot upload with one ip file should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane pilot.');
        assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('testflight - multiple ipa files', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0TestFlightMultipleIpaFiles.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.invokedToolCount === 0, 'should not have run any tools.');
        assert(tr.stdout.indexOf('Error: loc_mock_MultipleIpaFilesFound') !== -1, 'Task should have written to stdout');
        assert(tr.failed, 'task should have failed');

        done();
    });

    it('testflight - zero ipa files', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0TestFlightZeroIpaFiles.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.invokedToolCount === 0, 'should not have run any tools.');
        assert(tr.stdout.indexOf('Error: loc_mock_NoIpaFilesFound') !== -1, 'Task should have written to stdout');
        assert(tr.failed, 'task should have failed');

        done();
    });

    it('production - no bundle id', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0ProductionNoBundleId.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.invokedToolCount === 2, 'should have run gem install and gem update.');
        assert(tr.stdout.indexOf('Input required: appIdentifier') !== -1, 'Task should have written to stdout');
        assert(tr.failed, 'task should have failed');

        done();
    });

    it('production - no ipa path', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0ProductionNoIpaPath.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.invokedToolCount === 0, 'should not have any tools since ipaPath was not provided.');
        assert(tr.stdout.indexOf('Input required: ipaPath') !== -1, 'Task should have written to stdout');
        assert(tr.failed, 'task should have failed');

        done();
    });

    it('production - should skip binary upload', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0ProductionShouldSkipBinaryUpload.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('fastlane deliver --force -u creds-username -a com.microsoft.test.appId -i mypackage.ipa --skip_binary_upload true --skip_metadata true --skip_screenshots true'), 'fastlane deliver with skip_binary_upload should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane deliver.');
        assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('production - team id', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0ProductionTeamId.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('fastlane deliver --force -u creds-username -a com.microsoft.test.appId -i mypackage.ipa --skip_metadata true --skip_screenshots true -q teamId'), 'fastlane deliver with teamId should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane deliver.');
        assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('production - team name', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0ProductionTeamName.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('fastlane deliver --force -u creds-username -a com.microsoft.test.appId -i mypackage.ipa --skip_metadata true --skip_screenshots true -r teamName'), 'fastlane deliver with teamName should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane deliver.');
        assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('production - team id and team name', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0ProductionTeamIdTeamName.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('fastlane deliver --force -u creds-username -a com.microsoft.test.appId -i mypackage.ipa --skip_metadata true --skip_screenshots true -q teamId -r teamName'), 'fastlane deliver with teamId and teamName should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane deliver.');
        assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('production - should submit for review', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0ProductionShouldSubmitForReview.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('fastlane deliver --force -u creds-username -a com.microsoft.test.appId -i mypackage.ipa --skip_metadata true --skip_screenshots true --submit_for_review true'), 'fastlane deliver with submit_for_review should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane deliver.');
        assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('production - automatic release', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0ProductionShouldAutoRelease.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('fastlane deliver --force -u creds-username -a com.microsoft.test.appId -i mypackage.ipa --skip_metadata true --skip_screenshots true --automatic_release true'), 'fastlane deliver with automatic_release should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane deliver.');
        assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('production - upload metadata with metadata path', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0ProductionUploadMetadataMetadataPath.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('fastlane deliver --force -u creds-username -a com.microsoft.test.appId -i mypackage.ipa -m <path> --skip_screenshots true'), 'fastlane deliver with -m should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane deliver.');
        assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('production - upload screenshots with screenshots path', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0ProductionUploadScreenshotsScreenshotsPath.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('fastlane deliver --force -u creds-username -a com.microsoft.test.appId -i mypackage.ipa --skip_metadata true -w <path>'), 'fastlane deliver with -w should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane deliver.');
        assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('production - one ipa file', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0ProductionOneIpaFile.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane deliver.');
        assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('production - multiple ipa files', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0ProductionMultipleIpaFiles.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.invokedToolCount === 0, 'should not have run any tools.');
        assert(tr.stdout.indexOf('Error: loc_mock_MultipleIpaFilesFound') !== -1, 'Task should have written to stdout');
        assert(tr.failed, 'task should have failed');

        done();
    });

    it('production - zero ipa files', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0ProductionZeroIpaFiles.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.invokedToolCount === 0, 'should not have run any tools.');
        assert(tr.stdout.indexOf('Error: loc_mock_NoIpaFilesFound') !== -1, 'Task should have written to stdout');
        assert(tr.failed, 'task should have failed');

        done();
    });

    //No tests for every combination of uploadMetadata and metadataPath (one true, one false)
    //No tests for every combination of uploadScreenshots and screenshotsPath (one true, one false)

});
