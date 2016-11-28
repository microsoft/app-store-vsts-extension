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

    it('app-store-promote first test', (done:MochaDone) => {
        this.timeout(1000);

        let tp = path.join(__dirname, 'InitialTest.js');
        let tr : ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        assert.equal(true, tr.createdErrorIssue('The Apple App Store Promote task can only run on a Mac computer.'));

        // //build
        // assert(tr.ran('/home/bin/xcodebuild -sdk $(SDK) -configuration $(Configuration) ' +
        //         '-workspace /user/build/fun.xcodeproj/project.xcworkspace -scheme testScheme build ' +
        //         'DSTROOT=/user/build/output/$(SDK)/$(Configuration)/build.dst ' +
        //         'OBJROOT=/user/build/output/$(SDK)/$(Configuration)/build.obj ' +
        //         'SYMROOT=/user/build/output/$(SDK)/$(Configuration)/build.sym ' +
        //         'SHARED_PRECOMPS_DIR=/user/build/output/$(SDK)/$(Configuration)/build.pch'),
        //     'xcodebuild for building the ios project/workspace should have been run.');
        // //archive
        // assert(tr.ran('/home/bin/xcodebuild -workspace /user/build/fun.xcodeproj/project.xcworkspace -scheme testScheme ' +
        //         'archive -sdk $(SDK) -configuration $(Configuration) -archivePath /user/build/testScheme'),
        //     'xcodebuild archive should have been run to create the .xcarchive.');
        // //export
        // assert(tr.ran('/home/bin/xcodebuild -exportArchive ' +
        //         '-archivePath /user/build/testScheme.xcarchive ' +
        //         '-exportPath /user/build/_XcodeTaskExport_testScheme -exportOptionsPlist _XcodeTaskExportOptions.plist'),
        //     'xcodebuild exportArchive should have been run to export the IPA from the .xcarchive');

        // assert(tr.invokedToolCount == 11, 'should have run xcodebuild for version, build, archive and export and PlistBuddy to init and add export method.');
        // assert(tr.stderr.length == 0, 'should not have written to stderr');
        // assert(tr.succeeded, 'task should have succeeded');

        done();
    });

});
