


const generate = (options = {}) => {

    let headerKey = options.headerKey || 'X-Total-Count';
    let blueprintActions = [...['find'], ...(options.blueprintActions || [])].reduce((hash, key) => { hash[key] = true; return hash; }, {});

    let middleware = function (req, res, next) {
        let now = !!(req.options && req.options.blueprintAction);
        let oldSendOrNext;

        // if we have options, execute now
        if (now) {
            // wrap next with a function so it won't get affected with the .apply calls below
            oldSendOrNext = () => next();
        } else {
            // else, save the req.send to override it, so addCountThenSendOrNext can execute later

            // todo: I really really didn't want to do that
            // but at the time of calling the middleware, req.options.blueprintAction was undefined
            // only after it gets processed by sails that these options are added
            oldSendOrNext = res.send;
        }

        let addCountThenSendOrNext = function(data) {
            if (!req.options || !blueprintActions[req.options.blueprintAction]) {
                return oldSendOrNext.apply(res, arguments);
            }

            let parseBlueprintOptions = req.options.parseBlueprintOptions || req._sails.config.blueprints.parseBlueprintOptions;
            if (!parseBlueprintOptions) {
                sails.log.warn('[sails-count-middleware] middleware ignored, parseBlueprintOptions function not found.');
                return oldSendOrNext.apply(res, arguments);
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
                        return oldSendOrNext.apply(res, arguments);
                    }
                );
        };

        if (now) {
            addCountThenSendOrNext();
        } else {
            res.send = addCountThenSendOrNext;
            next();
        }
    };

    middleware.generate = generate;

    return middleware;
};

module.exports = generate();
