const eventbus = require('./eventbus');

const publishInterface = (serviceName, spec) => eventbus.publish('openapi.push', {
    aggregateId: serviceName,
    props: { spec: JSON.stringify(spec) },
}, true, true);

const subscribeInterface = (handler) => {
    eventbus.subscribe('openapi.push', (data) => {
        const serviceName = data.aggregateId;
        const spec = JSON.parse(data.props.spec);
        return Promise.resolve()
            .then(() => handler(serviceName, spec));
    });
};

module.exports = {
    publishInterface,
    subscribeInterface,
};
