
const DEFAULT_TOTAL_COUNT_HEADER = 'X-Total-Count';
const DEFAULT_PAGINATION_JSON_HEADER = 'X-Pagination-JSON';

const defaults = {
    actions: ['find', 'populate'],
    totalCountHeader: true,
    paginationJsonHeader: false,
    silentError: false
};

const generate = (options = {}) => {
    options = Object.assign({}, defaults, options);

    let totalCountHeader = options.totalCountHeader === false
        ? null
        : typeof options.totalCountHeader === 'string'
            ? options.totalCountHeader
            : DEFAULT_TOTAL_COUNT_HEADER;

    let paginationJsonHeader = options.paginationJsonHeader === false
        ? null
        : typeof options.paginationJsonHeader === 'string'
            ? options.paginationJsonHeader
            : DEFAULT_PAGINATION_JSON_HEADER;

    let actions = [...(options.actions || [])].reduce((hash, key) => { hash[key] = true; return hash; }, {});
    let silentError = options.silentError;

    let middleware = function (req, res, next) {
        let now = !!(req.options && req.options.blueprintAction);
        let oldSendOrNext;

        // if we have options, execute now
        if (now) {
            // wrap next with a function so it won't get affected with the .apply calls below
            oldSendOrNext = () => next();
        } else {
            // else, save the req.send to override it, so addHeaderThenOrNext can execute later

            // todo: I really really didn't want to do that
            // but at the time of calling the middleware, req.options.blueprintAction was undefined
            // only after it gets processed by sails that these options are added
            // https://groups.google.com/forum/#!topic/sailsjs/bMZlbWnZRu4
            oldSendOrNext = res.send;
        }

        let addHeaderThenOrNext = function(data) {
            let sendArgs = Array.from(arguments);

            if (!req.options || (!actions[req.options.blueprintAction] && !actions[req.options.action])) {
                return oldSendOrNext.apply(res, arguments);
            }

            let parseBlueprintOptions = req.options.parseBlueprintOptions
                || req._sails.config.blueprints.parseBlueprintOptions
                || req._sails.hooks.blueprints.parseBlueprintOptions;

            if (!parseBlueprintOptions) {
                req._sails.log.warn('[sails-count-middleware] middleware ignored, parseBlueprintOptions function not supported, are you sure you\'re using sails 1.0+');
                return oldSendOrNext.apply(res, arguments);
            }

            let queryOptions = parseBlueprintOptions(req);
            let Model = req._sails.models[queryOptions.using] ;
            let criteria = Object.assign({}, queryOptions.criteria);

            let limit = queryOptions.criteria.limit || (queryOptions.populates[queryOptions.alias] || {}).limit;
            let skip = queryOptions.criteria.skip || (queryOptions.populates[queryOptions.alias] || {}).skip;
            let sort = queryOptions.criteria.sort || (queryOptions.populates[queryOptions.alias] || {}).sort;

            // sails will throw an error if I don't do this
            delete criteria.limit;
            delete criteria.skip;
            delete criteria.sort;

            return Model.count(criteria)
                .then(
                    (count) => {
                        if (totalCountHeader) {
                            res.set(totalCountHeader, count);
                        }
                        if (paginationJsonHeader) {
                            res.set(paginationJsonHeader, JSON.stringify({
                                count,
                                sort,
                                limit: limit != null ? parseInt(limit) : undefined,
                                skip: skip != null ? parseInt(skip) : undefined,
                            }));
                        }
                        return oldSendOrNext.apply(res, sendArgs);
                    })
                .catch(
                    (err) => {
                        if (silentError) {
                            return oldSendOrNext.apply(res, sendArgs);
                        }
                        throw err;
                    }
                );
        };

        if (now) {
            addHeaderThenOrNext();
        } else {
            res.send = addHeaderThenOrNext;
            next();
        }
    };

    middleware.generate = generate;

    return middleware;
};

module.exports = generate();
