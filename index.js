
const generate = (options = {}) => {

    let headerKey = options.headerKey || 'X-Total-Count';
    let blueprintActions = [...['find'], ...(options.blueprintActions || [])].reduce((hash, key) => { hash[key] = true; return hash; }, {});

    let middleware = function (req, res, next) {
        // todo: I really really didn't want to do that
        // but at the time of calling the middleware, req.options.blueprintAction was undefined
        // only after it gets processed by sails that these options are added
        let oldSend = res.send;

        res.send = function(data) {
            if (!req.options || !blueprintActions[req.options.blueprintAction]) {
                return oldSend.apply(res, arguments);
            }

            let parseBlueprintOptions = req.options.parseBlueprintOptions || req._sails.config.blueprints.parseBlueprintOptions;
            if (!parseBlueprintOptions) {
                sails.log.warn('[sails-count-middleware] middleware ignored, parseBlueprintOptions function not found.');
                return oldSend.apply(res, arguments);
            }

            let queryOptions = parseBlueprintOptions(req);
            let Model = req._sails.models[queryOptions.using] ;
            let criteria = Object.assign({}, queryOptions.criteria);

            delete criteria.limit;
            delete criteria.skip;
            delete criteria.sort;

            return Model.count(criteria)
                .then(
                    (count) => {
                        res.set(headerKey, count);
                    })
                .catch(
                    (err) => {
                        throw err;
                    })
                .finally(
                    () => {
                        return oldSend.apply(res, arguments);
                    }
                );
        };
        next();
    };

    middleware.generate = generate;
    return middleware;
};

module.exports = generate();
