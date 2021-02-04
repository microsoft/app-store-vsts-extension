 /*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

// npm install mocha --save-dev
// typings install dt~mocha --save --global

import * as path from 'path';
import * as assert from 'assert';
import * as ttm from 'azure-pipelines-task-lib/mock-test';

describe('ipa-resign L0 Suite', function () {
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

        try {
            tr.run();

            assert.equal(true, tr.createdErrorIssue('Error: loc_mock_DarwinOnly'), 'Expected error message was not found');
            assert(tr.failed, 'Task should have failed');

            done();
        } catch (err) {
            console.log(tr.stdout);
            console.log(tr.stderr);
            console.log(err);
            done(err);
        }
    });
});
