const _ = require('lodash');

class Routes {
    constructor() {
        this.routes = {};
        this.currentRoute = [];
        this.currentPostMiddleware = [];
        this.currentPreMiddleware = [];
        this.currentPredicate = () => true;
        this.rootPath = '';
    }

    handler(_handler) {
        const route = this.currentRoute.join('.');
        if (!_.isFunction(_handler)) {
            throw new Error(`Handler for route "${route}" is not a function: ${_handler}`);
        }
        if (_.get(this.routes, this.currentRoute)) {
            throw new Error(`Route is already specified: ${route}`);
        }
        const temp = {};
        _.set(temp, route, {
            root: this.rootPath,
            handler: _handler,
            predicate: this.currentPredicate,
            preMiddleware: this.currentPreMiddleware,
            postMiddleware: this.currentPostMiddleware,
        });
        this.routes = _.defaultsDeep(this.routes, temp);
        this.currentRoute = [];
        this.currentPredicate = () => true;
        return this.makeProxy();
    }

    preMiddleware(middlewareArray) {
        this._validateMiddleware(middlewareArray);
        this.currentRoute = [];
        this.currentPreMiddleware = middlewareArray;
        return this.makeProxy();
    }

    postMiddleware(middlewareArray) {
        this._validateMiddleware(middlewareArray);
        this.currentRoute = [];
        this.currentPostMiddleware = middlewareArray;
        return this.makeProxy();
    }

    _validateMiddleware(middlewareArr) { // eslint-disable-line
        const message = `Passed argument should be an array of functions: ${middlewareArr}`;
        if (!_.isArray(middlewareArr)) {
            throw new Error(message);
        }
        _.forEach(middlewareArr, (m) => {
            if (!_.isFunction(m)) {
                throw new Error(message);
            }
        });
    }

    build() {
        return this.routes;
    }

    root(rootPath) {
        this.rootPath = rootPath;
        return this.makeProxy();
    }

    conditional(predicate) {
        if (!_.isFunction(predicate)) {
            throw new Error(`Passed predicate should be a function: ${predicate}`);
        }
        this.currentPredicate = predicate;
        return this.makeProxy();
    }

    makeProxy() {
        const self = this;
        return new Proxy(() => {
        }, {
            get(target, p, receiver) {
                if (p === 'root') {
                    return self.root.bind(self);
                }
                if (p === 'conditional') {
                    return self.conditional.bind(self);
                }
                if (p === 'preMiddleware') {
                    return self.preMiddleware.bind(self);
                }
                if (p === 'postMiddleware') {
                    return self.postMiddleware.bind(self);
                }
                if (p === 'build') {
                    return self.build.bind(self);
                }
                self.currentRoute.push(p);
                return receiver;
            },
            apply(target, thisArg, argArray) {
                return self.handler(...argArray);
            },
        });
    }

    static build() {
        return new Routes().makeProxy();
    }
}

module.exports = Routes.build;
