const splitUriBySlash = (uri) => {
    const parts = uri.split('/');
    const lastIndex = parts.length - 1;
    return {
        prefix: parts.slice(0, -1)
            .join('/'),
        dbName: parts[lastIndex].split('?')[0],
    };
};

const getDbNameFromUri = (uri) => splitUriBySlash(uri).dbName;
module.exports = { splitUriBySlash, getDbNameFromUri };
