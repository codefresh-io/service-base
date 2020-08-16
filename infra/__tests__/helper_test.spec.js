const { splitUriBySlash } = require('../helper');

it('smokeTest', async () => {
    const { uri, dbname } = splitUriBySlash('mongodb://localhost:27017/mytestingdb');
    expect(dbname).toBe('mytestingdb');
    expect(uri).toBe('mongodb://localhost:27017');
});
