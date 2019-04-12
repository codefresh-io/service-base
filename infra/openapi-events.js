const eventbus = require('./eventbus');

const publishInterface = (serviceName) => eventbus.publish('openapi.push', { // eslint-disable-line
    aggregateId: serviceName,
}, true, true);

const subscribeInterface = (handler) => {
    eventbus.subscribe('openapi.push', (data) => {
        const serviceName = data.aggregateId;
        return Promise.resolve()
            .then(() => handler(serviceName));
    });
};

module.exports = {
    publishInterface,
    subscribeInterface,
};
