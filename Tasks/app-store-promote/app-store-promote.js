"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const os = require('os');
const path = require('path');
const tl = require('vsts-task-lib/task');
class UserCredentials {
    UserCredentials() {
    }
}
exports.UserCredentials = UserCredentials;
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            //check if this is running on Mac and fail the task if not
            if (os.platform() !== 'darwin') {
                throw 'App store promote can only be run from a Mac computer.';
            }
            tl.debug('Read all inputs ...');
            // Get input variables
            var authType = tl.getInput('authType', false);
            var credentials = new UserCredentials();
            if (authType === 'ServiceEndpoint') {
                var serviceEndpoint = tl.getInput('serviceEndpoint', true);
                credentials.username = tl.getEndpointAuthorizationParameter(serviceEndpoint, 'username', true);
                credentials.password = tl.getEndpointAuthorizationParameter(serviceEndpoint, 'password', true);
            }
            else if (authType == 'UserAndPass') {
                credentials.username = tl.getInput('username', true);
                credentials.password = tl.getInput('password', true);
            }
            var appIdentifier = tl.getInput('appIdentifier', true);
            var buildNumber = tl.getInput('buildNumber', true);
            var shouldAutoRelease = tl.getBoolInput('shouldAutoRelease', false);
            var teamId = tl.getInput('teamId', false);
            var teamName = tl.getInput('teamName', false);
            tl.debug('Read all inputs.');
            var appVersion;
            var appName;
            // Set up environment
            var gemCache = process.env['GEM_CACHE'] || process.platform == 'win32' ? path.join(process.env['APPDATA'], 'gem-cache') : path.join(process.env['HOME'], '.gem-cache');
            process.env['GEM_HOME'] = gemCache;
            process.env['FASTLANE_PASSWORD'] = credentials.password;
            process.env['FASTLANE_DONT_STORE_PASSWORD'] = true;
            // Add bin of new gem home so we don't ahve to resolve it later;
            process.env['PATH'] = process.env['PATH'] + ':' + gemCache + path.sep + 'bin';
            //Install the ruby gem for fastlane deliver
            tl.debug('Checking for ruby install...');
            tl.which('ruby', true);
            var installDeliver = tl.tool(tl.which('gem', true));
            installDeliver.arg(['install', 'deliver']);
            yield installDeliver.exec();
            //Run the deliver command 
            // See https://github.com/fastlane/deliver for more information on these arguments
            var deliverCommand = tl.tool('deliver');
            deliverCommand.arg(['submit_build', '-u', credentials.username, '-a', appIdentifier]);
            if (buildNumber.toLowerCase() !== 'latest') {
                deliverCommand.arg(['-n', buildNumber]);
            }
            deliverCommand.arg(['--skip_binary_upload', 'true', '--skip_metadata', 'true', '--skip_screenshots', 'true']);
            deliverCommand.argIf(shouldAutoRelease, '--automatic_release');
            deliverCommand.argIf(teamId, ['-b', teamId]);
            deliverCommand.argIf(teamName, ['-l', teamName]);
            deliverCommand.arg('--force');
            yield deliverCommand.exec();
            tl.setResult(tl.TaskResult.Succeeded, 'Build ' + buildNumber + ' successfully promoted.');
        }
        catch (err) {
            tl.setResult(tl.TaskResult.Failed, err);
        }
    });
}
run();
//# sourceMappingURL=app-store-promote.js.map