const splitUriBySlash = (uri) => {
    const parts = uri.split('/');
    const lastIndex = parts.length - 1;
    return {
        uri: parts.slice(0, -1)
            .join('/'),
        dbname: parts[lastIndex],
    };
};
module.exports = {splitUriBySlash};
