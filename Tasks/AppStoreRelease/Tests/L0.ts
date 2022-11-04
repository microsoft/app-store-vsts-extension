/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
'use strict';

// npm install mocha --save-dev
// typings install dt~mocha --save --global

import * as fs from 'fs';
import * as path from 'path';
import * as assert from 'assert';
import * as ttm from 'azure-pipelines-task-lib/mock-test';

describe('app-store-release L0 Suite', function () {
    /* tslint:disable:no-empty */
    before(() => {
    });

    after(() => {
    });
    /* tslint:enable:no-empty */
    this.timeout(parseInt(process.env.TASK_TEST_TIMEOUT) || 20000);

    // Deletes the given directory after removing explicitly listed
    // files that it might contain. Will fail if it contains additional files.
    const deleteDirectory = (dir: string, fileNames: string[]) => {
        fileNames.forEach((fileName) => {
            const filePath = path.join(dir, fileName);

            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        });

        fs.rmdirSync(dir);
    };

    it('enforce darwin', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0EnforceDarwin.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.createdErrorIssue('Error: loc_mock_DarwinOnly'), 'Should have written error message');
        assert(tr.failed, 'task should have failed');

        done();
    });

    it('no authtype', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0NoAuthType.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.stdout.indexOf('Input required: authType') !== -1, 'Task should have written to stdout');
        assert(tr.failed, 'task should have failed');

        done();
    });

    it('no service endpoint', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0NoEndpoint.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.stdout.indexOf('Input required: serviceEndpoint') !== -1, 'Task should have written to stdout');
        assert(tr.failed, 'task should have failed');

        done();
    });

    it('no username+password', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0NoUserPass.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        // When no username+password is provided, username fails first
        assert(tr.stdout.indexOf('Input required: username') !== -1, 'Task should have written to stdout');
        assert(tr.failed, 'task should have failed');

        done();
    });

    it('app specific password', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0AppSpecificPassword.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.invokedToolCount === 1, 'should have run fastlane pilot.');
        assert(tr.succeeded, 'task should have succeeded');
        assert(tr.stdout.indexOf('Using two-factor authentication') !== -1, 'Task should have set the app-specific password');
        assert(tr.stdout.indexOf('Clearing two-factor authentication environment variables') !== -1, 'Task should have cleared the app-specific password');

        done();
    });

    it('app specific password using service endpoint', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0AppSpecificPasswordEndPoint.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.invokedToolCount === 1, 'should have run fastlane pilot. std=' + tr.stdout + ' err=' + tr.stderr);
        assert(tr.succeeded, 'task should have succeeded');
        assert(tr.stdout.indexOf('Using two-factor authentication') !== -1, 'Task should have set the app-specific password');
        assert(tr.stdout.indexOf('Clearing two-factor authentication environment variables') !== -1, 'Task should have cleared the app-specific password');

        done();
    });

    it('two factor authentication using service endpoint without fastlane session', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0AppSpecificPasswordEndPointIncomplete.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();

        assert(tr.succeeded, 'task should have succeeded');
        done();
    });

    it('two factor authenitcation app specific password without fastlane session', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0AppSpecificPasswordNoFastlaneSession.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();

        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('api key using service endpoint', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0ApiKeyEndPoint.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);
        const tempPath = 'test_temp_path';
        const keyFileName = 'api_keyD383SF739.json';
        const keyFilePath = path.join(tempPath, keyFileName);

        if (!fs.existsSync(tempPath)) {
            fs.mkdirSync(tempPath);
        }

        tr.run();

        // Check api_key file first, so we can read it and clean up before other assertions
        assert(fs.existsSync(keyFilePath), 'api_key.json file should have been created');

        let apiKey: any = undefined;

        try {
            let rawdata = fs.readFileSync(keyFilePath, 'utf8');
            apiKey = JSON.parse(rawdata);
        } catch (e) {
            assert.fail(e);
        } finally {
            deleteDirectory(tempPath, [keyFileName, '.taskkey']);
        }

        assert(tr.ran(`fastlane pilot upload --api_key_path ${keyFilePath} -i mypackage.ipa`), 'fastlane pilot upload with api key should have been run.');
        assert(tr.invokedToolCount === 1, 'should have run only fastlane pilot.');
        assert(tr.succeeded, 'task should have succeeded');

        assert(apiKey.key_id === 'D383SF739', 'key_id should be correct');
        assert(apiKey.issuer_id === '6053b7fe-68a8-4acb-89be-165aa6465141', 'issuer_id should be correct');
        assert(apiKey.key === 'dummy_string', 'key should be correct');
        assert(apiKey.in_house === false, 'in_house should be correct');
        assert(apiKey.is_key_content_base64 === true, 'is_key_content_base64 should be correct');

        done();
    });

    it('custom GEM_CACHE env var', (done: Mocha.Done) => {
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

    it('testflight - username+password', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0TestFlightUserPass.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane pilot.');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('testflight - username+password distribute only', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0TestFlightUserPassDistributeOnly.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane pilot.');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('testflight - username+password distribute only with build_number', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0TestFlightUserPassDistributeOnlyBuildNumber.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();

        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane pilot.');
        assert(tr.ran('fastlane pilot distribute -u creds-username --build_number 100 -a com.microsoft.test.appId --groups Beta'), 'fastlane pilot distribute with build_number should have been run.');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('testflight - api key', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0TestFlightApiKey.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);
        const tempPath = 'test_temp_path';
        const keyFileName = 'api_keyD383SF739.json';
        const keyFilePath = path.join(tempPath, keyFileName);

        if (!fs.existsSync(tempPath)) {
            fs.mkdirSync(tempPath);
        }

        tr.run();

        // Check api_key file first, so we can read it and clean up before other assertions
        assert(fs.existsSync(keyFilePath), 'api_key.json file should have been created');

        let apiKey: any = undefined;

        try {
            let rawdata = fs.readFileSync(keyFilePath, 'utf8');
            apiKey = JSON.parse(rawdata);
        } catch (e) {
            assert.fail(e);
        } finally {
            deleteDirectory(tempPath, [keyFileName, '.taskkey']);
        }

        assert(tr.ran(`fastlane pilot upload --api_key_path ${keyFilePath} -i mypackage.ipa`), 'fastlane pilot upload with api key should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane pilot.');
        assert(tr.succeeded, 'task should have succeeded');

        assert(apiKey.key_id === 'D383SF739', 'key_id should be correct');
        assert(apiKey.issuer_id === '6053b7fe-68a8-4acb-89be-165aa6465141', 'issuer_id should be correct');
        assert(apiKey.key === 'dummy_string', 'key should be correct');
        assert(apiKey.in_house === false, 'in_house should be correct');
        assert(apiKey.is_key_content_base64 === true, 'is_key_content_base64 should be correct');

        done();
    });

    it('testflight - api key distribute only', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0TestFlightApiKeyDistributeOnly.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);
        const tempPath = 'test_temp_path';
        const keyFileName = 'api_keyD383SF739.json';
        const keyFilePath = path.join(tempPath, keyFileName);

        if (!fs.existsSync(tempPath)) {
            fs.mkdirSync(tempPath);
        }

        tr.run();

        // Check api_key file first, so we can read it and clean up before other assertions
        assert(fs.existsSync(keyFilePath), 'api_key.json file should have been created');

        let apiKey: any = undefined;

        try {
            let rawdata = fs.readFileSync(keyFilePath, 'utf8');
            apiKey = JSON.parse(rawdata);
        } catch (e) {
            assert.fail(e);
        } finally {
            deleteDirectory(tempPath, [keyFileName, '.taskkey']);
        }

        assert(tr.ran(`fastlane pilot distribute --api_key_path ${keyFilePath} -a com.microsoft.test.appId --groups Beta`), 'fastlane pilot distribute with api key should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane pilot.');
        assert(tr.succeeded, 'task should have succeeded');

        assert(apiKey.key_id === 'D383SF739', 'key_id should be correct');
        assert(apiKey.issuer_id === '6053b7fe-68a8-4acb-89be-165aa6465141', 'issuer_id should be correct');
        assert(apiKey.key === 'dummy_string', 'key should be correct');
        assert(apiKey.in_house === false, 'in_house should be correct');
        assert(apiKey.is_key_content_base64 === true, 'is_key_content_base64 should be correct');

        done();
    });

    it('testflight - username+password - no fastlane install', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0TestFlightNoFastlaneInstall.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.invokedToolCount === 1, 'should have only run fastlane pilot.');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('testflight - username+password - specific fastlane install', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0TestFlightSpecificFastlaneInstall.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('/usr/bin/gem uninstall fastlane -a -I'), 'gem uninstall fastlane should have been run.');
        assert(tr.ran('/usr/bin/gem install fastlane -v 2.15.1'), 'gem install fastlane with a specific version should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem uninstall, gem install and fastlane pilot.');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('testflight - username+password - specific fastlane install - no version', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0TestFlightSpecificFastlaneInstallNoVersion.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.stdout.indexOf('Input required: fastlaneToolsSpecificVersion') !== -1, 'Task should have written to stdout');
        assert(tr.failed, 'task should have failed');

        done();
    });

    it('testflight - service endpoint', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0TestFlightServiceEndpoint.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane pilot.');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('testflight - no ipa path', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0TestFlightNoIpaPath.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.stdout.indexOf('Error: loc_mock_IpaPathNotSpecified') >= 0, 'IPA path not specified error should be thrown');
        assert(tr.failed, 'task should have failed');

        done();
    });

    it('testflight - team id', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0TestFlightTeamId.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('fastlane pilot upload -u creds-username -i mypackage.ipa -q teamId -a com.microsoft.test.appId'), 'fastlane pilot upload with teamId should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane pilot.');
        //assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('testflight - team name', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0TestFlightTeamName.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('fastlane pilot upload -u creds-username -i mypackage.ipa -r teamName'), 'fastlane pilot upload with teamName should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane pilot.');
        //assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('testflight - team id and team name', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0TestFlightTeamIdTeamName.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('fastlane pilot upload -u creds-username -i mypackage.ipa -q teamId -r teamName'), 'fastlane pilot upload with teamId and teamName should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane pilot.');
        //assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('testflight - should skip submission', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0TestFlightShouldSkipSubmission.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('fastlane pilot upload -u creds-username -i mypackage.ipa --skip_submission true'), 'fastlane pilot upload with skip_submission should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane pilot.');
        //assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('testflight - should skip waiting for processing', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0TestFlightShouldSkipWaitingForProcessing.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('fastlane pilot upload -u creds-username -i mypackage.ipa --skip_waiting_for_build_processing true'), 'fastlane pilot upload with skip_waiting_for_build_processing should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane pilot.');
        //assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('testflight - distribute external no release notes', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0TestFlightDistributeToExternalTestersNoReleaseNotes.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.invokedToolCount === 0, 'should not have run any tools.');
        assert(tr.stdout.indexOf('Error: loc_mock_ReleaseNotesRequiredForExternalTesting') !== -1, 'Task should have written to stdout');
        assert(tr.failed, 'task should have failed');
        done();
    });

    it('testflight - distribute external with groups', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0TestFlightDistributeToExternalTestersWithGroups.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.invokedToolCount === 1, 'should have run fastlane pilot.');
        assert(tr.succeeded, 'task should have succeeded');
        done();
    });

    it('testflight - one ipa file', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0TestFlightOneIpaFile.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('fastlane pilot upload -u creds-username -i mypackage.ipa'), 'fastlane pilot upload with one ip file should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane pilot.');
        //assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('testflight - multiple ipa files', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0TestFlightMultipleIpaFiles.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.invokedToolCount === 0, 'should not have run any tools.');
        assert(tr.stdout.indexOf('Error: loc_mock_MultipleIpaFilesFound') !== -1, 'Task should have written to stdout');
        assert(tr.failed, 'task should have failed');

        done();
    });

    it('testflight - zero ipa files', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0TestFlightZeroIpaFiles.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.invokedToolCount === 0, 'should not have run any tools.');
        assert(tr.stdout.indexOf('Error: loc_mock_NoIpaFilesFound') !== -1, 'Task should have written to stdout');
        assert(tr.failed, 'task should have failed');

        done();
    });

    it('testflight - additional arguments', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0TestFlightFastlaneArguments.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('fastlane pilot upload -u creds-username -i mypackage.ipa -args someadditioanlargs'), 'fastlane pilot upload with one ip file should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane pilot.');
        //assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('production - api key', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0ProductionApiKey.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);
        const tempPath = 'test_temp_path';
        const keyFileName = 'api_keyD383SF739.json';
        const keyFilePath = path.join(tempPath, keyFileName);

        if (!fs.existsSync(tempPath)) {
            fs.mkdirSync(tempPath);
        }

        tr.run();

        // Check api_key file first, so we can read it and clean up before other assertions
        assert(fs.existsSync(keyFilePath), 'api_key.json file should have been created');

        let apiKey: any = undefined;

        try {
            let rawdata = fs.readFileSync(keyFilePath, 'utf8');
            apiKey = JSON.parse(rawdata);
        } catch (e) {
            assert.fail(e);
        } finally {
            deleteDirectory(tempPath, [keyFileName, '.taskkey']);
        }

        assert(tr.ran(`fastlane deliver --force --precheck_include_in_app_purchases false --api_key_path ${keyFilePath} -a com.microsoft.test.appId -i mypackage.ipa -j ios --skip_metadata true --skip_screenshots true --automatic_release false`), 'fastlane deliver with api key should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane pilot.');
        assert(tr.succeeded, 'task should have succeeded');

        assert(apiKey.key_id === 'D383SF739', 'key_id should be correct');
        assert(apiKey.issuer_id === '6053b7fe-68a8-4acb-89be-165aa6465141', 'issuer_id should be correct');
        assert(apiKey.key === 'dummy_string', 'key should be correct');
        assert(apiKey.in_house === false, 'in_house should be correct');
        assert(apiKey.is_key_content_base64 === true, 'is_key_content_base64 should be correct');

        done();
    });

    it('production - no bundle id', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0ProductionNoBundleId.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.invokedToolCount === 2, 'should have run gem install and gem update.');
        assert(tr.stdout.indexOf('Input required: appIdentifier') !== -1, 'Task should have written to stdout');
        assert(tr.failed, 'task should have failed');

        done();
    });

    it('production - no ipa path', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0ProductionNoIpaPath.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.stdout.indexOf('Error: loc_mock_IpaPathNotSpecified') >= 0, 'IPA path not specified error should be thrown');
        assert(tr.failed, 'task should have failed');

        done();
    });

    it('production - should skip binary upload', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0ProductionShouldSkipBinaryUpload.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('fastlane deliver --force -u creds-username -a com.microsoft.test.appId --skip_binary_upload true -j ios --skip_metadata true --skip_screenshots true --automatic_release false'), 'fastlane deliver with skip_binary_upload should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane deliver.');
        //assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('production - team id', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0ProductionTeamId.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('fastlane deliver --force -u creds-username -a com.microsoft.test.appId -i mypackage.ipa -j ios --skip_metadata true --skip_screenshots true -k teamId --automatic_release false'), 'fastlane deliver with teamId should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane deliver.');
        //assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('production - team name', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0ProductionTeamName.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('fastlane deliver --force -u creds-username -a com.microsoft.test.appId -i mypackage.ipa -j ios --skip_metadata true --skip_screenshots true --team_name teamName --automatic_release false'), 'fastlane deliver with teamName should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane deliver.');
        //assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('production - team id and team name', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0ProductionTeamIdTeamName.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('fastlane deliver --force -u creds-username -a com.microsoft.test.appId -i mypackage.ipa -j ios --skip_metadata true --skip_screenshots true -k teamId --team_name teamName --automatic_release false'), 'fastlane deliver with teamId and teamName should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane deliver.');
        //assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('production - should submit for review', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0ProductionShouldSubmitForReview.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('fastlane deliver --force -u creds-username -a com.microsoft.test.appId -i mypackage.ipa -j ios --skip_metadata true --skip_screenshots true --submit_for_review true --automatic_release false'), 'fastlane deliver with submit_for_review should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane deliver.');
        //assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('production - automatic release', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0ProductionShouldAutoRelease.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('fastlane deliver --force -u creds-username -a com.microsoft.test.appId -i mypackage.ipa -j ios --skip_metadata true --skip_screenshots true --automatic_release true'), 'fastlane deliver with automatic_release should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane deliver.');
        //assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('production - upload metadata with metadata path', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0ProductionUploadMetadataMetadataPath.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('fastlane deliver --force -u creds-username -a com.microsoft.test.appId -i mypackage.ipa -j ios -m <path> --skip_screenshots true --automatic_release false'), 'fastlane deliver with -m should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane deliver.');
        //assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('production - upload screenshots with screenshots path', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0ProductionUploadScreenshotsScreenshotsPath.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('fastlane deliver --force -u creds-username -a com.microsoft.test.appId -i mypackage.ipa -j ios --skip_metadata true -w <path> --automatic_release false'), 'fastlane deliver with -w should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane deliver.');
        //assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('production - one ipa file', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0ProductionOneIpaFile.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane deliver.');
        //assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('production - multiple ipa files', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0ProductionMultipleIpaFiles.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.invokedToolCount === 0, 'should not have run any tools.');
        assert(tr.stdout.indexOf('Error: loc_mock_MultipleIpaFilesFound') !== -1, 'Task should have written to stdout');
        assert(tr.failed, 'task should have failed');

        done();
    });

    it('production - zero ipa files', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0ProductionZeroIpaFiles.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.invokedToolCount === 0, 'should not have run any tools.');
        assert(tr.stdout.indexOf('Error: loc_mock_NoIpaFilesFound') !== -1, 'Task should have written to stdout');
        assert(tr.failed, 'task should have failed');

        done();
    });

    it('production - fastlane arguments', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0ProductionFastlaneArguments.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane deliver.');
        //assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('production - macOS app', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0ProductionMacApp.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('fastlane deliver --force -u creds-username -a com.microsoft.test.appId -c mypackage.app -j osx --skip_metadata true --skip_screenshots true --submit_for_review true --automatic_release false'), 'fastlane deliver for macOS should have run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane deliver.');
        //assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('production - tvOS app', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0ProductionTVApp.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('fastlane deliver --force -u creds-username -a com.microsoft.test.appId -i mypackage.ipa -j appletvos --skip_metadata true --skip_screenshots true --submit_for_review true --automatic_release false'), 'fastlane deliver for tvOS should have run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane deliver.');
        //assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    //No tests for every combination of uploadMetadata and metadataPath (one true, one false)
    //No tests for every combination of uploadScreenshots and screenshotsPath (one true, one false)

});
