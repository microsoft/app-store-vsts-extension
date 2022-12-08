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

describe('app-store-promote L0 Suite', function () {
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
        assert.equal(true, tr.createdErrorIssue('Error: loc_mock_DarwinOnly'));
        assert(tr.failed, 'task should have failed');

        done();
    });

    it('username+password with deliver', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0UserPassDeliver.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane deliver.');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('username+password - no fastlane install', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0NoFastlaneInstall.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.invokedToolCount === 1, 'should have only run fastlane deliver.');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('username+password - specific fastlane install', (done: Mocha.Done) => {
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

    it('username+password - specific fastlane install - no version', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0SpecificFastlaneInstallNoVersion.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.stdout.indexOf('Input required: fastlaneToolsSpecificVersion') !== -1, 'Task should have written to stdout');
        assert(tr.failed, 'task should have failed');

        done();
    });

    it('additional fastlane arguments', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0AdditionalFastlaneArguments.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.invokedToolCount === 1, 'should have run fastlane deliver.');
        assert(tr.ran('fastlane deliver submit_build -u creds-username -a com.microsoft.test.appId --skip_binary_upload true --skip_metadata true --skip_screenshots true --automatic_release --force --app-version 2.1.5'), 'should have run fastlane deliver with additional fastlane arguments.');
        assert(tr.stdOutContained('##vso[task.debug]   2.1.5'), 'should have sent app-version parameter as a separate argument');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('service endpoint with deliver', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0ServiceEndpointDeliver.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane deliver.');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('service endpoint with api key', (done: Mocha.Done) => {
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

        assert(tr.ran(`fastlane deliver submit_build --precheck_include_in_app_purchases false --api_key_path ${keyFilePath} -a com.microsoft.test.appId --skip_binary_upload true --skip_metadata true --skip_screenshots true --force`), 'fastlane deliver with api key should have been run.');
        assert(tr.invokedToolCount === 1, 'should have run only fastlane deliver.');
        assert(tr.succeeded, 'task should have succeeded');

        assert(apiKey.key_id === 'D383SF739', 'key_id should be correct');
        assert(apiKey.issuer_id === '6053b7fe-68a8-4acb-89be-165aa6465141', 'issuer_id should be correct');
        assert(apiKey.key === 'dummy_string', 'key should be correct');
        assert(apiKey.in_house === false, 'in_house should be correct');
        assert(apiKey.is_key_content_base64 === true, 'is_key_content_base64 should be correct');

        done();
    });

    it('api key with deliver', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0ApiKeyDeliver.js');
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

        assert(tr.ran(`fastlane deliver submit_build --precheck_include_in_app_purchases false --api_key_path ${keyFilePath} -a com.microsoft.test.appId --skip_binary_upload true --skip_metadata true --skip_screenshots true --automatic_release --force`), 'fastlane deliver with api key should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane deliver.');
        assert(tr.succeeded, 'task should have succeeded');

        assert(apiKey.key_id === 'D383SF739', 'key_id should be correct');
        assert(apiKey.issuer_id === '6053b7fe-68a8-4acb-89be-165aa6465141', 'issuer_id should be correct');
        assert(apiKey.key === 'dummy_string', 'key should be correct');
        assert(apiKey.in_house === false, 'in_house should be correct');
        assert(apiKey.is_key_content_base64 === true, 'is_key_content_base64 should be correct');

        done();
    });

    it('app specific password', (done: Mocha.Done) => {
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

    it('app specific password using service end point', (done: Mocha.Done) => {
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

    it('two factor authentication using service end point without fastlane session', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0AppSpecificPasswordEndPointIncomplete.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert.equal(true, tr.createdErrorIssue('Error: loc_mock_FastlaneSessionEmpty'));
        assert(tr.failed, 'task should have failed');

        done();
    });

    it('two factor authenitcation app specific password without fastlane session', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0AppSpecificPasswordNoFastlaneSession.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.stdout.indexOf('Input required: fastlaneSession') !== -1, 'Task should have written to stdout');
        assert(tr.failed, 'task should have failed');

        done();
    });

    it('no bundle id', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0NoBundleId.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.stdout.indexOf('Input required: appIdentifier') !== -1, 'Task should have written to stdout');
        assert(tr.failed, 'task should have failed');

        done();
    });

    it('no choose build', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0NoChooseBuild.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.stdout.indexOf('Input required: chooseBuild') !== -1, 'Task should have written to stdout');
        assert(tr.failed, 'task should have failed');

        done();
    });

    it('latest build', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0LatestBuild.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('fastlane deliver submit_build -u creds-username -a com.microsoft.test.appId --skip_binary_upload true --skip_metadata true --skip_screenshots true --force'), 'fastlane deliver with the latest build should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane deliver.');
        // warnings from some dependent module when running with node8 https://github.com/nodejs/node/issues/16746 are written to stderr
        //assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('should auto release', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0ShouldAutoRelease.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('fastlane deliver submit_build -u creds-username -a com.microsoft.test.appId --skip_binary_upload true --skip_metadata true --skip_screenshots true --automatic_release --force'), 'fastlane deliver with auto release should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane deliver.');
        //assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('team id', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0TeamId.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('fastlane deliver submit_build -u creds-username -a com.microsoft.test.appId --skip_binary_upload true --skip_metadata true --skip_screenshots true -k teamId --force'), 'fastlane deliver with team id should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane deliver.');
        //assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('team name', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0TeamName.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('fastlane deliver submit_build -u creds-username -a com.microsoft.test.appId --skip_binary_upload true --skip_metadata true --skip_screenshots true --team_name teamName --force'), 'fastlane deliver with team name should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane deliver.');
        //assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('team id and team name', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0TeamIdTeamName.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('fastlane deliver submit_build -u creds-username -a com.microsoft.test.appId --skip_binary_upload true --skip_metadata true --skip_screenshots true -k teamId --team_name teamName --force'), 'fastlane deliver with team id and team name should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane deliver.');
        //assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('build number', (done: Mocha.Done) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'L0BuildNumber.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('fastlane deliver submit_build -u creds-username -a com.microsoft.test.appId -n 42 --skip_binary_upload true --skip_metadata true --skip_screenshots true --force'), 'fastlane deliver with build number should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane deliver.');
        //assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');

        done();
    });

    it('custom GEM_CACHE environment variable', (done: Mocha.Done) => {
        this.timeout(1000);

        //L0GemCacheEnvVar.ts sets the GEM_CACHE env var and expects it to be used when fastlane is updated.
        let tp = path.join(__dirname, 'L0GemCacheEnvVar.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert(tr.ran('fastlane deliver submit_build -u creds-username -a com.microsoft.test.appId -n 42 --skip_binary_upload true --skip_metadata true --skip_screenshots true --force'), 'fastlane deliver with build number should have been run.');
        assert(tr.invokedToolCount === 3, 'should have run gem install, gem update and fastlane deliver.');
        //assert(tr.stderr.length === 0, 'should not have written to stderr');
        assert(tr.succeeded, 'task should have succeeded');
        assert(tr.ran('/usr/bin/gem update fastlane -i /usr/bin/customGemCache'));

        done();
    });

});
