import {test} from '../fixtures';
import * as path from 'path';
import {environmentFileName} from '../../util/enviroment_util';
import {PaknSavePOM} from '../pages/paknsave.page';


test.describe('PaknSaveDiscount', () => {
    test('should collect discounted products from PaknSave', async ({page}) => {
        const fileName = environmentFileName('paknsave-discount', 'json');
        const dataPath = path.resolve(__dirname, `../data/${fileName}`);
        console.log(`[PaknSave] Load data file ${dataPath}`);

        const pom = new PaknSavePOM(page, dataPath);
        await pom.collectAndNotify();
    });
});