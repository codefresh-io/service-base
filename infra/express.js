
const Promise = require('bluebird');
const express = require('express');
const compression = require('compression');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const monitor = require('cf-monitor');
const { newDomainMiddleware } = require('@codefresh-io/http-infra');
const { openapi } = require('@codefresh-io/cf-openapi');

class Express {
    constructor() {
        this.expressApp = express(); // the express app definition
        this.expressServer = undefined; // the express server instance
        this.healthy = true;
    }

    stop() {
        return Promise.resolve()
            .then(() => this.expressServer.close());
    }

    /**
     * starts the connection to mongo
     * @returns {*}
     */
    init(config, createRoutes, opt = {}) {
        const logger = require('cf-logs').Logger('codefresh:infra:express'); // eslint-disable-line
        this.logger = logger;
        this.options = opt;
        return Promise.resolve()
            .then(() => {
                this.config = config;
                this.createRoutes = createRoutes;
                return this._create()
                    .then(() => this._start(this.expressApp))
                    .then((expressServer) => {
                        this.expressServer = expressServer;
                    });
            });
    }

    _create() {
        const logger = this.logger; // eslint-disable-line
        return Promise.resolve()
            .then(() => {
                const app = this.expressApp;

                app.use(newDomainMiddleware());

                app.use(cookieParser());
                app.use(compression());

                app.use(bodyParser.json());

                app.use(bodyParser.urlencoded({ extended: true }));
                app.use(methodOverride());

                if (this.config.httpLogger) {
                    app.use(morgan(this.config.httpLogger.format, {
                        skip: (req, res) => {
                            if (this.config.httpLogger.level === 'debug') {
                                return false;
                            }
                            const code = res.statusCode;
                            return code < 400;
                        },
                        stream: {
                            write: (str) => {
                                logger.info(str.substring(0, str.length - 1));
                            },
                        },
                    }));
                }
                openapi.endpoints().register(app);
                return this.createRoutes(app)
                    .then(() => {
                        app.get('/api/ping', (req, res) => {
                            res.status(200).send();
                        });

                        app.get('/api/ready', (req, res) => {
                            if (this.options.isReady()) {
                                res.status(200).send();
                            } else {
                                res.status(503).send();
                            }
                        });

                        app.get('/api/health', (req, res) => {
                            if (this.options.isHealthy()) {
                                res.status(200).send();
                            } else {
                                res.status(503).send();
                            }
                        });

                        // the last error handler
                        app.use((err, req, res, next) => { // eslint-disable-line
                            logger.error(err.stack);

                            if (res.headersSent) {
                                return next(err);
                            }

                            monitor.noticeError(err);

                            const statusCode = err.statusCode || 500;

                            res.status(statusCode).send({ message: err.toString() });
                        });
                    });
            });
    }

    _start(app) {
        const logger = this.logger; // eslint-disable-line
        openapi.dependencies().fetch();
        return new Promise((resolve, reject) => {
            const server = app.listen(this.config.port, (err) => {
                if (err) {
                    logger.info(`Failed to load service with message ${err.message}`);
                    reject(err);
                } else {
                    logger.info(`Express server listening on port ${this.config.port}, in mode ${this.config.env}`);
                    resolve(server);
                }
            });
        })
            .then(() => {
                openapi.events().subscribe();
                openapi.events().publish();
            });
    }

    makeEndpoint(fn) { // eslint-disable-line
        return function (req, res, next) { // eslint-disable-line
            Promise.resolve()
                .then(() => fn(req, res))
                .then((ret) => {
                    res.send(ret);
                })
                .catch(err => next(err));
        };
    }
}


module.exports = new Express();
