/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

// npm install mocha --save-dev
// typings install dt~mocha --save --global

import * as assert from 'assert';
import * as ttm from 'azure-pipelines-task-lib/mock-test';
import * as fs from 'fs';
import * as path from 'path';

describe('app-store-release L0 Suite', function () {
  /* tslint:disable:no-empty */
  before(() => { });

  after(() => { });
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

  it('enforce darwin', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0EnforceDarwin.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    await tr.runAsync();
    assert(tr.createdErrorIssue('Error: loc_mock_DarwinOnly'), 'Should have written error message');
    assert(tr.failed, 'task should have failed');
  });

  it('no authtype', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0NoAuthType.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    await tr.runAsync();
    assert(
      tr.stdout.indexOf('Input required: authType') !== -1,
      'Task should have written to stdout'
    );
    assert(tr.failed, 'task should have failed');
  });

  it('no service endpoint', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0NoEndpoint.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    await tr.runAsync();
    assert(
      tr.stdout.indexOf('Input required: serviceEndpoint') !== -1,
      'Task should have written to stdout'
    );
    assert(tr.failed, 'task should have failed');
  });

  it('no username+password', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0NoUserPass.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    await tr.runAsync();
    // When no username+password is provided, username fails first
    assert(
      tr.stdout.indexOf('Input required: username') !== -1,
      'Task should have written to stdout'
    );
    assert(tr.failed, 'task should have failed');
  });

  it('app specific password', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0AppSpecificPassword.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    await tr.runAsync();
    assert(tr.invokedToolCount === 1, 'should have run fastlane pilot.');
    assert(tr.succeeded, 'task should have succeeded');
    assert(
      tr.stdout.indexOf('Using two-factor authentication') !== -1,
      'Task should have set the app-specific password'
    );
    assert(
      tr.stdout.indexOf('Clearing two-factor authentication environment variables') !== -1,
      'Task should have cleared the app-specific password'
    );
  });

  it('app specific password using service endpoint', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0AppSpecificPasswordEndPoint.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    await tr.runAsync();
    assert(
      tr.invokedToolCount === 1,
      'should have run fastlane pilot. std=' + tr.stdout + ' err=' + tr.stderr
    );
    assert(tr.succeeded, 'task should have succeeded');
    assert(
      tr.stdout.indexOf('Using two-factor authentication') !== -1,
      'Task should have set the app-specific password'
    );
    assert(
      tr.stdout.indexOf('Clearing two-factor authentication environment variables') !== -1,
      'Task should have cleared the app-specific password'
    );
  });

  it('two factor authentication using service endpoint without fastlane session', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0AppSpecificPasswordEndPointIncomplete.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    await tr.runAsync();

    assert(tr.succeeded, 'task should have succeeded');
  });

  it('two factor authenitcation app specific password without fastlane session', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0AppSpecificPasswordNoFastlaneSession.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    await tr.runAsync();

    assert(tr.succeeded, 'task should have succeeded');
  });

  it('api key using service endpoint', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0ApiKeyEndPoint.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);
    const tempPath = 'test_temp_path';
    const keyFileName = 'api_keyD383SF739.json';
    const keyFilePath = path.join(tempPath, keyFileName);

    if (!fs.existsSync(tempPath)) {
      fs.mkdirSync(tempPath);
    }

    await tr.runAsync();

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

    assert(
      tr.ran(`fastlane pilot upload --api_key_path ${keyFilePath} -i mypackage.ipa -j ios`),
      'fastlane pilot upload with api key should have been run.'
    );
    assert(tr.invokedToolCount === 1, 'should have run only fastlane pilot.');
    assert(tr.succeeded, 'task should have succeeded');

    assert(apiKey.key_id === 'D383SF739', 'key_id should be correct');
    assert(
      apiKey.issuer_id === '6053b7fe-68a8-4acb-89be-165aa6465141',
      'issuer_id should be correct'
    );
    assert(apiKey.key === 'dummy_string', 'key should be correct');
    assert(apiKey.in_house === false, 'in_house should be correct');
    assert(apiKey.is_key_content_base64 === true, 'is_key_content_base64 should be correct');
  });

  it('custom GEM_CACHE env var', async () => {
    this.timeout(1000);

    //L0GemCacheEnvVar.ts sets the GEM_CACHE env var and expects it to be used when fastlane is updated.
    let tp = path.join(__dirname, 'L0GemCacheEnvVar.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    await tr.runAsync();
    assert(
      tr.invokedToolCount === 3,
      'should have run gem install, gem update and fastlane pilot.'
    );
    assert(tr.succeeded, 'task should have succeeded');
    assert(tr.ran('/usr/bin/gem update fastlane -i /usr/bin/customGemCache'));
  });

  it('testflight - username+password', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0TestFlightUserPass.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    await tr.runAsync();
    assert(
      tr.invokedToolCount === 3,
      'should have run gem install, gem update and fastlane pilot.'
    );
    assert(tr.succeeded, 'task should have succeeded');
  });

  it('testflight - username+password distribute only', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0TestFlightUserPassDistributeOnly.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    await tr.runAsync();
    assert(
      tr.invokedToolCount === 3,
      'should have run gem install, gem update and fastlane pilot.'
    );
    assert(tr.succeeded, 'task should have succeeded');
  });

  it('testflight - username+password distribute only with build_number', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0TestFlightUserPassDistributeOnlyBuildNumber.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    await tr.runAsync();

    assert(
      tr.invokedToolCount === 3,
      'should have run gem install, gem update and fastlane pilot.'
    );
    assert(
      tr.ran(
        'fastlane pilot distribute -u creds-username --build_number 100 -a com.microsoft.test.appId -j ios --groups Beta'
      ),
      'fastlane pilot distribute with build_number should have been run.'
    );
    assert(tr.succeeded, 'task should have succeeded');
  });

  it('testflight - api key', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0TestFlightApiKey.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);
    const tempPath = 'test_temp_path';
    const keyFileName = 'api_keyD383SF739.json';
    const keyFilePath = path.join(tempPath, keyFileName);

    if (!fs.existsSync(tempPath)) {
      fs.mkdirSync(tempPath);
    }

    await tr.runAsync();

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

    assert(
      tr.ran(`fastlane pilot upload --api_key_path ${keyFilePath} -i mypackage.ipa -j ios`),
      'fastlane pilot upload with api key should have been run.'
    );
    assert(
      tr.invokedToolCount === 3,
      'should have run gem install, gem update and fastlane pilot.'
    );
    assert(tr.succeeded, 'task should have succeeded');

    assert(apiKey.key_id === 'D383SF739', 'key_id should be correct');
    assert(
      apiKey.issuer_id === '6053b7fe-68a8-4acb-89be-165aa6465141',
      'issuer_id should be correct'
    );
    assert(apiKey.key === 'dummy_string', 'key should be correct');
    assert(apiKey.in_house === false, 'in_house should be correct');
    assert(apiKey.is_key_content_base64 === true, 'is_key_content_base64 should be correct');
  });

  it('testflight - api key distribute only', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0TestFlightApiKeyDistributeOnly.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);
    const tempPath = 'test_temp_path';
    const keyFileName = 'api_keyD383SF739.json';
    const keyFilePath = path.join(tempPath, keyFileName);

    if (!fs.existsSync(tempPath)) {
      fs.mkdirSync(tempPath);
    }

    await tr.runAsync();

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

    assert(
      tr.ran(
        `fastlane pilot distribute --api_key_path ${keyFilePath} -a com.microsoft.test.appId -j ios --groups Beta`
      ),
      'fastlane pilot distribute with api key should have been run.'
    );
    assert(
      tr.invokedToolCount === 3,
      'should have run gem install, gem update and fastlane pilot.'
    );
    assert(tr.succeeded, 'task should have succeeded');

    assert(apiKey.key_id === 'D383SF739', 'key_id should be correct');
    assert(
      apiKey.issuer_id === '6053b7fe-68a8-4acb-89be-165aa6465141',
      'issuer_id should be correct'
    );
    assert(apiKey.key === 'dummy_string', 'key should be correct');
    assert(apiKey.in_house === false, 'in_house should be correct');
    assert(apiKey.is_key_content_base64 === true, 'is_key_content_base64 should be correct');
  });

  it('testflight - username+password - no fastlane install', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0TestFlightNoFastlaneInstall.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    await tr.runAsync();
    assert(tr.invokedToolCount === 1, 'should have only run fastlane pilot.');
    assert(tr.succeeded, 'task should have succeeded');
  });

  it('testflight - username+password - specific fastlane install', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0TestFlightSpecificFastlaneInstall.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    await tr.runAsync();
    assert(
      tr.ran('/usr/bin/gem uninstall fastlane -a -I'),
      'gem uninstall fastlane should have been run.'
    );
    assert(
      tr.ran('/usr/bin/gem install --no-document fastlane -v 2.15.1'),
      'gem install --no-document fastlane with a specific version should have been run.'
    );
    assert(
      tr.invokedToolCount === 3,
      'should have run gem uninstall, gem install and fastlane pilot.'
    );
    assert(tr.succeeded, 'task should have succeeded');
  });

  it('testflight - username+password - specific fastlane install - no version', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0TestFlightSpecificFastlaneInstallNoVersion.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    await tr.runAsync();
    assert(
      tr.stdout.indexOf('Input required: fastlaneToolsSpecificVersion') !== -1,
      'Task should have written to stdout'
    );
    assert(tr.failed, 'task should have failed');
  });

  it('testflight - service endpoint', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0TestFlightServiceEndpoint.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    await tr.runAsync();
    assert(
      tr.invokedToolCount === 3,
      'should have run gem install, gem update and fastlane pilot.'
    );
    assert(tr.succeeded, 'task should have succeeded');
  });

  it('testflight - no ipa path', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0TestFlightNoIpaPath.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    await tr.runAsync();
    assert(
      tr.stdout.indexOf('Error: loc_mock_IpaPathNotSpecified') >= 0,
      'IPA path not specified error should be thrown'
    );
    assert(tr.failed, 'task should have failed');
  });

  it('testflight - team id', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0TestFlightTeamId.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    await tr.runAsync();
    assert(
      tr.ran(
        'fastlane pilot upload -u creds-username -i mypackage.ipa -j ios -q teamId -a com.microsoft.test.appId'
      ),
      'fastlane pilot upload with teamId should have been run.'
    );
    assert(
      tr.invokedToolCount === 3,
      'should have run gem install, gem update and fastlane pilot.'
    );
    //assert(tr.stderr.length === 0, 'should not have written to stderr');
    assert(tr.succeeded, 'task should have succeeded');
  });

  it('testflight - team name', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0TestFlightTeamName.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    await tr.runAsync();
    assert(
      tr.ran('fastlane pilot upload -u creds-username -i mypackage.ipa -j ios -r teamName'),
      'fastlane pilot upload with teamName should have been run.'
    );
    assert(
      tr.invokedToolCount === 3,
      'should have run gem install, gem update and fastlane pilot.'
    );
    //assert(tr.stderr.length === 0, 'should not have written to stderr');
    assert(tr.succeeded, 'task should have succeeded');
  });

  it('testflight - team id and team name', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0TestFlightTeamIdTeamName.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    await tr.runAsync();
    assert(
      tr.ran('fastlane pilot upload -u creds-username -i mypackage.ipa -j ios -q teamId -r teamName'),
      'fastlane pilot upload with teamId and teamName should have been run.'
    );
    assert(
      tr.invokedToolCount === 3,
      'should have run gem install, gem update and fastlane pilot.'
    );
    //assert(tr.stderr.length === 0, 'should not have written to stderr');
    assert(tr.succeeded, 'task should have succeeded');
  });

  it('testflight - should skip submission', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0TestFlightShouldSkipSubmission.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    await tr.runAsync();
    assert(
      tr.ran('fastlane pilot upload -u creds-username -i mypackage.ipa -j ios --skip_submission true'),
      'fastlane pilot upload with skip_submission should have been run.'
    );
    assert(
      tr.invokedToolCount === 3,
      'should have run gem install, gem update and fastlane pilot.'
    );
    //assert(tr.stderr.length === 0, 'should not have written to stderr');
    assert(tr.succeeded, 'task should have succeeded');
  });

  it('testflight - should skip waiting for processing', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0TestFlightShouldSkipWaitingForProcessing.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    await tr.runAsync();
    assert(
      tr.ran(
        'fastlane pilot upload -u creds-username -i mypackage.ipa -j ios --skip_waiting_for_build_processing true'
      ),
      'fastlane pilot upload with skip_waiting_for_build_processing should have been run.'
    );
    assert(
      tr.invokedToolCount === 3,
      'should have run gem install, gem update and fastlane pilot.'
    );
    //assert(tr.stderr.length === 0, 'should not have written to stderr');
    assert(tr.succeeded, 'task should have succeeded');
  });

  it('testflight - distribute external no release notes', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0TestFlightDistributeToExternalTestersNoReleaseNotes.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    await tr.runAsync();
    assert(tr.invokedToolCount === 0, 'should not have run any tools.');
    assert(
      tr.stdout.indexOf('Error: loc_mock_ReleaseNotesRequiredForExternalTesting') !== -1,
      'Task should have written to stdout'
    );
    assert(tr.failed, 'task should have failed');
  });

  it('testflight - distribute external with groups', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0TestFlightDistributeToExternalTestersWithGroups.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    await tr.runAsync();
    assert(tr.invokedToolCount === 1, 'should have run fastlane pilot.');
    assert(tr.succeeded, 'task should have succeeded');
  });

  it('testflight - one ipa file', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0TestFlightOneIpaFile.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    await tr.runAsync();
    assert(
      tr.ran('fastlane pilot upload -u creds-username -i mypackage.ipa -j ios'),
      'fastlane pilot upload with one ip file should have been run.'
    );
    assert(
      tr.invokedToolCount === 3,
      'should have run gem install, gem update and fastlane pilot.'
    );
    //assert(tr.stderr.length === 0, 'should not have written to stderr');
    assert(tr.succeeded, 'task should have succeeded');
  });

  it('testflight - multiple ipa files', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0TestFlightMultipleIpaFiles.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    await tr.runAsync();
    assert(tr.invokedToolCount === 0, 'should not have run any tools.');
    assert(
      tr.stdout.indexOf('Error: loc_mock_MultipleIpaFilesFound') !== -1,
      'Task should have written to stdout'
    );
    assert(tr.failed, 'task should have failed');
  });

  it('testflight - zero ipa files', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0TestFlightZeroIpaFiles.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    await tr.runAsync();
    assert(tr.invokedToolCount === 0, 'should not have run any tools.');
    assert(
      tr.stdout.indexOf('Error: loc_mock_NoIpaFilesFound') !== -1,
      'Task should have written to stdout'
    );
    assert(tr.failed, 'task should have failed');
  });

  it('testflight - additional arguments', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0TestFlightFastlaneArguments.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    await tr.runAsync();
    assert(
      tr.ran('fastlane pilot upload -u creds-username -i mypackage.ipa -j ios -args someadditioanlargs'),
      'fastlane pilot upload with one ip file should have been run.'
    );
    assert(
      tr.invokedToolCount === 3,
      'should have run gem install, gem update and fastlane pilot.'
    );
    //assert(tr.stderr.length === 0, 'should not have written to stderr');
    assert(tr.succeeded, 'task should have succeeded');
  });

  it('testflight - fastlane macOS', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0TestFlightFastlaneMacOS.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    await tr.runAsync();
    assert(
      tr.ran(`fastlane pilot upload -u creds-username -P mypackage.pkg -j osx`),
      'fastlane pilot upload with pkg file should have been run.'
    );
  });

  it('testflight - fastlane too old', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0TestFlightFastlaneTooOld.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    await tr.runAsync();
    assert(tr.invokedToolCount === 0, 'should not have run any tools.');
    assert(tr.failed, 'task should have failed');
  });

  it('production - api key', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0ProductionApiKey.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);
    const tempPath = 'test_temp_path';
    const keyFileName = 'api_keyD383SF739.json';
    const keyFilePath = path.join(tempPath, keyFileName);

    if (!fs.existsSync(tempPath)) {
      fs.mkdirSync(tempPath);
    }

    await tr.runAsync();

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

    assert(
      tr.ran(
        `fastlane deliver --force --precheck_include_in_app_purchases false --api_key_path ${keyFilePath} -a com.microsoft.test.appId -i mypackage.ipa -j ios --skip_metadata true --skip_screenshots true --automatic_release false`
      ),
      'fastlane deliver with api key should have been run.'
    );
    assert(
      tr.invokedToolCount === 3,
      'should have run gem install, gem update and fastlane pilot.'
    );
    assert(tr.succeeded, 'task should have succeeded');

    assert(apiKey.key_id === 'D383SF739', 'key_id should be correct');
    assert(
      apiKey.issuer_id === '6053b7fe-68a8-4acb-89be-165aa6465141',
      'issuer_id should be correct'
    );
    assert(apiKey.key === 'dummy_string', 'key should be correct');
    assert(apiKey.in_house === false, 'in_house should be correct');
    assert(apiKey.is_key_content_base64 === true, 'is_key_content_base64 should be correct');
  });

  it('production - no bundle id', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0ProductionNoBundleId.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    await tr.runAsync();
    assert(tr.invokedToolCount === 2, 'should have run gem install and gem update.');
    assert(
      tr.stdout.indexOf('Input required: appIdentifier') !== -1,
      'Task should have written to stdout'
    );
    assert(tr.failed, 'task should have failed');
  });

  it('production - no ipa path', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0ProductionNoIpaPath.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    await tr.runAsync();
    assert(
      tr.stdout.indexOf('Error: loc_mock_IpaPathNotSpecified') >= 0,
      'IPA path not specified error should be thrown'
    );
    assert(tr.failed, 'task should have failed');
  });

  it('production - should skip binary upload', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0ProductionShouldSkipBinaryUpload.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    await tr.runAsync();
    assert(
      tr.ran(
        'fastlane deliver --force -u creds-username -a com.microsoft.test.appId --skip_binary_upload true -j ios --skip_metadata true --skip_screenshots true --automatic_release false'
      ),
      'fastlane deliver with skip_binary_upload should have been run.'
    );
    assert(
      tr.invokedToolCount === 3,
      'should have run gem install, gem update and fastlane deliver.'
    );
    //assert(tr.stderr.length === 0, 'should not have written to stderr');
    assert(tr.succeeded, 'task should have succeeded');
  });

  it('production - team id', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0ProductionTeamId.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    await tr.runAsync();
    assert(
      tr.ran(
        'fastlane deliver --force -u creds-username -a com.microsoft.test.appId -i mypackage.ipa -j ios --skip_metadata true --skip_screenshots true -k teamId --automatic_release false'
      ),
      'fastlane deliver with teamId should have been run.'
    );
    assert(
      tr.invokedToolCount === 3,
      'should have run gem install, gem update and fastlane deliver.'
    );
    //assert(tr.stderr.length === 0, 'should not have written to stderr');
    assert(tr.succeeded, 'task should have succeeded');
  });

  it('production - team name', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0ProductionTeamName.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    await tr.runAsync();
    assert(
      tr.ran(
        'fastlane deliver --force -u creds-username -a com.microsoft.test.appId -i mypackage.ipa -j ios --skip_metadata true --skip_screenshots true --team_name teamName --automatic_release false'
      ),
      'fastlane deliver with teamName should have been run.'
    );
    assert(
      tr.invokedToolCount === 3,
      'should have run gem install, gem update and fastlane deliver.'
    );
    //assert(tr.stderr.length === 0, 'should not have written to stderr');
    assert(tr.succeeded, 'task should have succeeded');
  });

  it('production - team id and team name', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0ProductionTeamIdTeamName.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    await tr.runAsync();
    assert(
      tr.ran(
        'fastlane deliver --force -u creds-username -a com.microsoft.test.appId -i mypackage.ipa -j ios --skip_metadata true --skip_screenshots true -k teamId --team_name teamName --automatic_release false'
      ),
      'fastlane deliver with teamId and teamName should have been run.'
    );
    assert(
      tr.invokedToolCount === 3,
      'should have run gem install, gem update and fastlane deliver.'
    );
    //assert(tr.stderr.length === 0, 'should not have written to stderr');
    assert(tr.succeeded, 'task should have succeeded');
  });

  it('production - should submit for review', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0ProductionShouldSubmitForReview.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    await tr.runAsync();
    assert(
      tr.ran(
        'fastlane deliver --force -u creds-username -a com.microsoft.test.appId -i mypackage.ipa -j ios --skip_metadata true --skip_screenshots true --submit_for_review true --automatic_release false'
      ),
      'fastlane deliver with submit_for_review should have been run.'
    );
    assert(
      tr.invokedToolCount === 3,
      'should have run gem install, gem update and fastlane deliver.'
    );
    //assert(tr.stderr.length === 0, 'should not have written to stderr');
    assert(tr.succeeded, 'task should have succeeded');
  });

  it('production - automatic release', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0ProductionShouldAutoRelease.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    await tr.runAsync();
    assert(
      tr.ran(
        'fastlane deliver --force -u creds-username -a com.microsoft.test.appId -i mypackage.ipa -j ios --skip_metadata true --skip_screenshots true --automatic_release true'
      ),
      'fastlane deliver with automatic_release should have been run.'
    );
    assert(
      tr.invokedToolCount === 3,
      'should have run gem install, gem update and fastlane deliver.'
    );
    //assert(tr.stderr.length === 0, 'should not have written to stderr');
    assert(tr.succeeded, 'task should have succeeded');
  });

  it('production - upload metadata with metadata path', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0ProductionUploadMetadataMetadataPath.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    await tr.runAsync();
    assert(
      tr.ran(
        'fastlane deliver --force -u creds-username -a com.microsoft.test.appId -i mypackage.ipa -j ios -m <path> --skip_screenshots true --automatic_release false'
      ),
      'fastlane deliver with -m should have been run.'
    );
    assert(
      tr.invokedToolCount === 3,
      'should have run gem install, gem update and fastlane deliver.'
    );
    //assert(tr.stderr.length === 0, 'should not have written to stderr');
    assert(tr.succeeded, 'task should have succeeded');
  });

  it('production - upload screenshots with screenshots path', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0ProductionUploadScreenshotsScreenshotsPath.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    await tr.runAsync();
    assert(
      tr.ran(
        'fastlane deliver --force -u creds-username -a com.microsoft.test.appId -i mypackage.ipa -j ios --skip_metadata true -w <path> --automatic_release false'
      ),
      'fastlane deliver with -w should have been run.'
    );
    assert(
      tr.invokedToolCount === 3,
      'should have run gem install, gem update and fastlane deliver.'
    );
    //assert(tr.stderr.length === 0, 'should not have written to stderr');
    assert(tr.succeeded, 'task should have succeeded');
  });

  it('production - one ipa file', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0ProductionOneIpaFile.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    await tr.runAsync();
    assert(
      tr.invokedToolCount === 3,
      'should have run gem install, gem update and fastlane deliver.'
    );
    //assert(tr.stderr.length === 0, 'should not have written to stderr');
    assert(tr.succeeded, 'task should have succeeded');
  });

  it('production - multiple ipa files', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0ProductionMultipleIpaFiles.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    await tr.runAsync();
    assert(tr.invokedToolCount === 0, 'should not have run any tools.');
    assert(
      tr.stdout.indexOf('Error: loc_mock_MultipleIpaFilesFound') !== -1,
      'Task should have written to stdout'
    );
    assert(tr.failed, 'task should have failed');
  });

  it('production - zero ipa files', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0ProductionZeroIpaFiles.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    await tr.runAsync();
    assert(tr.invokedToolCount === 0, 'should not have run any tools.');
    assert(
      tr.stdout.indexOf('Error: loc_mock_NoIpaFilesFound') !== -1,
      'Task should have written to stdout'
    );
    assert(tr.failed, 'task should have failed');
  });

  it('production - fastlane arguments', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0ProductionFastlaneArguments.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    await tr.runAsync();
    assert(
      tr.invokedToolCount === 3,
      'should have run gem install, gem update and fastlane deliver.'
    );
    //assert(tr.stderr.length === 0, 'should not have written to stderr');
    assert(tr.succeeded, 'task should have succeeded');
  });

  it('production - macOS app', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0ProductionMacApp.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    await tr.runAsync();
    assert(
      tr.ran(
        'fastlane deliver --force -u creds-username -a com.microsoft.test.appId -c mypackage.app -j osx --skip_metadata true --skip_screenshots true --submit_for_review true --automatic_release false'
      ),
      'fastlane deliver for macOS should have run.'
    );
    assert(
      tr.invokedToolCount === 3,
      'should have run gem install, gem update and fastlane deliver.'
    );
    //assert(tr.stderr.length === 0, 'should not have written to stderr');
    assert(tr.succeeded, 'task should have succeeded');
  });

  it('production - tvOS app', async () => {
    this.timeout(1000);

    let tp = path.join(__dirname, 'L0ProductionTVApp.js');
    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    await tr.runAsync();
    assert(
      tr.ran(
        'fastlane deliver --force -u creds-username -a com.microsoft.test.appId -i mypackage.ipa -j appletvos --skip_metadata true --skip_screenshots true --submit_for_review true --automatic_release false'
      ),
      'fastlane deliver for tvOS should have run.'
    );
    assert(
      tr.invokedToolCount === 3,
      'should have run gem install, gem update and fastlane deliver.'
    );
    //assert(tr.stderr.length === 0, 'should not have written to stderr');
    assert(tr.succeeded, 'task should have succeeded');
  });

  //No tests for every combination of uploadMetadata and metadataPath (one true, one false)
  //No tests for every combination of uploadScreenshots and screenshotsPath (one true, one false)
});
