define(function (require) {
  return function FetchStrategyForSearch(Private, Promise, timefilter, kbnIndex) {
    let _ = require('lodash');
    let angular = require('angular');
    let toJson = require('ui/utils/aggressive_parse').toJson;
    const emptySearch = require('ui/kibi/empty_search');

    return {
      clientMethod: 'msearch',

      /**
       * Flatten a series of requests into as ES request body
       *
       * @param  {array} requests - the requests to serialize
       * @return {Promise} - a promise that is fulfilled by the request body
       */
      reqsFetchParamsToBody: function (reqsFetchParams) {
        return Promise.map(reqsFetchParams, function (fetchParams) {
          return Promise.resolve(fetchParams.index)
          .then(function (indexList) {
            if (!_.isFunction(_.get(indexList, 'toIndexList'))) {
              return indexList;
            }

            let timeBounds = timefilter.getBounds();
            return indexList.toIndexList(timeBounds.min, timeBounds.max);
          })
          .then(function (indexList) {
            let body = fetchParams.body || {};
            // If we've reached this point and there are no indexes in the
            // index list at all, it means that we shouldn't expect any indexes
            // to contain the documents we're looking for, so we instead
            // perform a request to the Kibi index with a search that doesn't
            // match anything to avoid querying all indices.
            // Type is set to null to allow the execution of the query
            // when .kibi is otherwise unaccessible by the user (assuming that
            // a rule that allows queries on the null type has been setup in
            // the authentication plugin).
            let type = fetchParams.type;
            if (_.isArray(indexList) && indexList.length === 0) {
              indexList.push(kbnIndex);
              type = 'null';
              body = emptySearch();
            }
            return angular.toJson({
              index: indexList,
              type: type,
              search_type: fetchParams.search_type,
              ignore_unavailable: true
            })
            + '\n'
            + toJson(body, angular.toJson);
          });
        })
        .then(function (requests) {
          return requests.join('\n') + '\n';
        });
      },

      /**
       * Fetch the multiple responses from the ES Response
       * @param  {object} resp - The response sent from Elasticsearch
       * @return {array} - the list of responses
       */
      getResponses: function (resp) {
        return resp.responses;
      }
    };
  };

});
