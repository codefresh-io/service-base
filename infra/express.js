'use strict';

const Promise                 = require('bluebird');
const express                 = require('express');
const compression             = require('compression');
const bodyParser              = require('body-parser');
const methodOverride          = require('method-override');
const cookieParser            = require('cookie-parser');
const morgan                  = require('morgan');
const monitor                 = require('cf-monitor');
const { newDomainMiddleware } = require('@codefresh-io/http-infra');

class Express {

    constructor() {
        this.expressApp; // the express app definition
        this.expressServer; // the express server instance
        this.healthy = true;
    }

    /**
     * starts the connection to mongo
     * @returns {*}
     */
    init(config, createRoutes) {
        const logger = require('cf-logs').Logger("codefresh:infra:express");
        this.logger = logger;
        return Promise.resolve()
            .then(() => {
                this.config = config;
                this.createRoutes = createRoutes;
                return this._create()
                    .then((expressApp) => {
                        this.expressApp = expressApp;
                        return this._start(this.expressApp);
                    })
                    .then((expressServer) => {
                        this.expressServer = expressServer;
                    });
            });
    }


    /**
     * stops the express app server
     * @returns {*}
     */
    stop() {
        return Promise.resolve()
            .then(() => {
                this.healthy = false;
                logger.info('Express health route marked as unhealthy');
            });
    }

    _create() {
        const logger = this.logger;
        return Promise.resolve()
            .then(() => {
                const app = express();

                app.use(newDomainMiddleware());

                app.use(cookieParser());
                app.use(compression());

                app.use('/api/stripe/hook', bodyParser.raw({ type: "*/*" }));
                app.use(bodyParser.json());

                app.use(bodyParser.urlencoded({ extended: true }));
                app.use(methodOverride());

                if (this.config.httpLogger) {
                    app.use(morgan(this.config.httpLogger.format, {
                        skip: (req, res) => {
                            if (this.config.httpLogger.level === 'debug') {
                                return false;
                            }
                            var code = res.statusCode;
                            return code < 400;
                        },
                        stream: {
                            write: (str) => {
                                logger.info(str.substring(0, str.length - 1));
                            }
                        }
                    }));
                }

                app.use((request, response, next) => {
                    const userHeader = request.headers['x-user-json'];
                    if (userHeader) {
                        request.user = JSON.parse(request.headers['x-user-json']);
                    }

                    const accountHeader = request.headers['x-account-json'];
                    if (accountHeader) {
                        request.account = JSON.parse(request.headers['x-account-json']);
                    }

                    next();
                });

                this.createRoutes(app);

                app.get('/api/ping', (req, res) => {
                    res.status(200).send();
                });

                app.get('/api/health', (req, res) => {
                    if (this.healthy) {
                        res.status(200).send();
                    } else {
                        res.status(400).send();
                    }
                });

                // the last error handler
                app.use((err, req, res, next) => {
                    logger.error(err.stack);

                    if (res.headersSent) {
                        return next(err);
                    }

                    monitor.noticeError(err);

                    const statusCode = err.statusCode || 500;

                    res.status(statusCode).send({
                        message: err.message
                    });
                });

                return app;
            });

    }

    _start(app) {
        const logger = this.logger;
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

        });
    }

    makeEndpoint(fn) {
      return function(req, res, next) {
        Promise.resolve()
          .then(() => fn(req, res))
          .then(ret => {
            res.send(ret);
          })
          .catch(err => next(err));
      }
    }
}


module.exports = new Express();
