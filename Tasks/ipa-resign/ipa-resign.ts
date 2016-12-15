import os = require('os');
import path = require('path');
import tl = require('vsts-task-lib/task');
import sign = require('./ios-signing-common');

import { ToolRunner } from 'vsts-task-lib/toolrunner';

function findMatchExactlyOne(defaultRoot: string, pattern: string) : string {
    let files: Array<string> = tl.findMatch(defaultRoot, pattern);

    if (!files || files.length === 0) {
        throw new Error('No matching file was found with search pattern: ' + pattern);
    }

    if (files.length > 1) {
        throw new Error('Multiple matching files were found with search pattern: ' + pattern + '. The pattern must match exactly one file.');
    }

    return files[0];
}

async function run() {
    let deleteKeychain: boolean = false;
    let useKeychain: string;
    let deleteProvProfile: boolean = false;
    let useProvProfilePath: string;

    try {
        // Check if this is running on Mac and fail the task if not
        if (os.platform() !== 'darwin') {
            throw 'The IPA Resign task can only run on a Mac computer.';
        }

        // Get input variables
        let ipaPath: string = tl.getPathInput('ipaPath', true, false);

        let signMethod: string = tl.getInput('signMethod', true);
        let signFileP12Path: string;
        let signFileP12Password: string;
        let signIdIdentity: string;
        let signIdUnlockKeychain: boolean = false;
        let signIdKeychainPassword: string;
        if (signMethod === 'file') {
            signFileP12Path = tl.getPathInput('signFileP12Path', true, false);
            signFileP12Password = tl.getInput('signFileP12Password', true);
        } else if (signMethod === 'id') {
            signIdIdentity = tl.getInput('signIdIdentity', true);
            signIdUnlockKeychain = tl.getBoolInput('signIdUnlockKeychain', false);
            signIdKeychainPassword = tl.getInput('signIdKeychainPassword', false);
        }

        let provisionMethod: string = tl.getInput('provisionMethod', true);
        let provFileProfilePath: string;
        let provFileRemoveProfile: boolean = false;
        let provIdProfileUuid: string;
        if (provisionMethod === 'file') {
            provFileProfilePath = tl.getPathInput('provFileProfilePath', true, false);
            provFileRemoveProfile = tl.getBoolInput('provFileRemoveProfile', false);
        } else if (provisionMethod === 'id') {
            provIdProfileUuid = tl.getInput('provIdProfileUuid', true);
        }

        let entitlementsPath: string;
        if (tl.filePathSupplied('entitlementsPath')) {
            entitlementsPath = tl.getPathInput('entitlementsPath', false, false);
        }

        let sighResignArgs: string = tl.getInput('sighResignArgs', false);
        let cwdPath: string = tl.getInput('cwdPath', false);

        // Process working directory
        let cwd: string = cwdPath
            || tl.getVariable('build.sourceDirectory')
            || tl.getVariable('build.sourcesDirectory')
            || tl.getVariable('System.DefaultWorkingDirectory');
        tl.cd(cwd);

        tl.debug('cwd = ' + cwd);

        // Find the absolute ipa file path
        let useIpaPath: string = findMatchExactlyOne(cwd, ipaPath);

        // Determine the params used when resigning based on sign method.
        let useSigningIdentity = null;

        if (signMethod === 'file') {
            let signFilePath: string = findMatchExactlyOne(cwd, signFileP12Path);
            let keychain: string = tl.resolve(cwd, '_iparesigntasktmp.keychain');
            let keychainPwd: string = '_iparesigntask_TmpKeychain_Pwd#1';

            // Create a temporary keychain and install the p12 into that keychain
            tl.debug('installed cert in temp keychain');
            await sign.installCertInTemporaryKeychain(keychain, keychainPwd, signFilePath, signFileP12Password);

            useKeychain = keychain;
            deleteKeychain = true;
            useSigningIdentity = await sign.findSigningIdentity(keychain);
        } else if (signMethod === 'id') {
            let defaultKeychain: string = await sign.getDefaultKeychainPath();

            if (signIdUnlockKeychain) {
                await sign.unlockKeychain(defaultKeychain, signIdKeychainPassword);
            }

            useKeychain = defaultKeychain;
            useSigningIdentity = signIdIdentity;
        }

        // Determine the params used when resigning based on provision method.
        if (provisionMethod === 'file') {
            useProvProfilePath = findMatchExactlyOne(cwd, provFileProfilePath);
            deleteProvProfile = provFileRemoveProfile;
        } else if (provisionMethod === 'id') {
            // Gets the provisioning profile from the default path by uuid (~/Library/MobileDevice/Provisioning Profiles).
            useProvProfilePath = sign.getProvisioningProfilePath(provIdProfileUuid);
        }

        // Find the absolute entitlements file path.
        let useEntitlementsFilePath: string;
        if (entitlementsPath) {
            useEntitlementsFilePath = findMatchExactlyOne(cwd, entitlementsPath);
        }

        // Having all the params ready configure the environment and exec fastlane sigh resign.
        // Set up environment
        let gemCache: string = process.env['GEM_CACHE'] || process.platform === 'win32' ? path.join(process.env['APPDATA'], 'gem-cache') : path.join(process.env['HOME'], '.gem-cache');
        process.env['GEM_HOME'] = gemCache;
        process.env['FASTLANE_DISABLE_COLORS'] = true;

        // Add bin of new gem home so we don't ahve to resolve it later;
        process.env['PATH'] = process.env['PATH'] + ':' + gemCache + path.sep + 'bin';

        // Install the ruby gem for fastlane sigh
        tl.debug('Checking for ruby install...');
        tl.which('ruby', true);
        let installSigh: ToolRunner = tl.tool(tl.which('gem', true));
        installSigh.arg(['install', 'sigh']);
        await installSigh.exec();

        // Run the sigh command 
        // See https://github.com/fastlane/fastlane/tree/master/sigh for more information on these arguments
        let sighCommand: ToolRunner = tl.tool('sigh');
        sighCommand.arg(['resign', useIpaPath]);
        sighCommand.arg(['--keychain_path', useKeychain]);
        sighCommand.arg(['--signing_identity', useSigningIdentity]);
        sighCommand.arg(['--provisioning_profile', useProvProfilePath]);

        sighCommand.argIf(useEntitlementsFilePath, ['--entitlements', useEntitlementsFilePath]);

        if (sighResignArgs) {
            sighCommand.line(sighResignArgs);
        }

        await sighCommand.exec();

        tl.setResult(tl.TaskResult.Succeeded, 'Successfully resigned ipa ' + useIpaPath);
    } catch (err) {
        tl.setResult(tl.TaskResult.Failed, err);
    } finally {
        // Clean up the temporary keychain, so it is not used to search for code signing identity in the future.
        if (deleteKeychain) {
            try {
                await sign.deleteKeychain(useKeychain);
            } catch (err) {
                tl.debug('Failed to delete temporary keychain. Error = ' + err);
                tl.warning('Failed to delete temporary keychain created during the resign process. ' + useKeychain);
            }
        }

        // Delete provisioning profile if specified
        if (deleteProvProfile) {
            try {
                await sign.deleteProvisioningProfile(useProvProfilePath);
            } catch (err) {
                tl.debug('Failed to delete provisioning profile. Error = ' + err);
                tl.warning('Failed to delete the provisioning profile ' + useProvProfilePath);
            }
        }
    }
}

run();
