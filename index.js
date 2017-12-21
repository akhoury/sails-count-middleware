


const generate = (options = {}) => {

    let headerKey = options.headerKey || 'X-Total-Count';
    let blueprintActions = [...(options.blueprintActions || ['find'])].reduce((hash, key) => { hash[key] = true; return hash; }, {});

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
            let args = Array.from(arguments);

            if (!req.options || (!blueprintActions[req.options.blueprintAction] && !blueprintActions[req.options.action])) {
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

            // sails will throw an error if I don't do this
            delete criteria.limit;
            delete criteria.skip;
            delete criteria.sort;

            return Model.count(criteria)
                .then(
                    (count) => {
                        res.set(headerKey, count);
                        return oldSendOrNext.apply(res, args);
                    })
                .catch(
                    (err) => {
                        return oldSendOrNext.apply(res, [err, ...args]);
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
