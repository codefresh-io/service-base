const eventbus = require('./eventbus');

const publishInterface = (aggregateId) => {
    eventbus.publish(
        'openapi.push',
        { aggregateId },
        true,
        true,
    );
};

const subscribeInterface = (handler) => {
    eventbus.subscribe(
        'openapi.push',
        async data => handler(data.aggregateId),
    );
};

module.exports = {
    publishInterface,
    subscribeInterface,
};
