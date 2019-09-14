'use strict'
var LZString = require('lz-string')

// core
var logger = require('./logger')
var response = require('./response')
var models = require('./models')

// public
var Search = {
  searchGet: searchGet,
}

function getSearch (s_key, callback) {

  var skeyArray = []
  var re = /((?:\\"|[^ "])+)|"((?:\\"|[^"])+)"/g // split at ' ' but keep quoted strings
  while (1) {
      var match = re.exec(s_key)
      if (match === null) break
      skeyArray.push((match[1] ? match[1] : match[2]).replace(/\\"/g, '"')) // un-escape \"
  }
  if (!skeyArray || skeyArray.length === 0) {
    return callback(null, null)
  }

  var query = 'SELECT * FROM "Notes" WHERE '
  var isAnd = 1
  for (var i = 0; i < skeyArray.length ; i++) {
    if (skeyArray[i+1] == 'OR') {
      if (isAnd == 1) {
        query += "("
      }
      query = query + " content ILIKE '%" + skeyArray[i] + "%' "
      isAnd = 0
      i++
    } else {
      query = query + " content ILIKE '%" + skeyArray[i] + "%' "
      if (isAnd == 0) {
        query += ")"
      }
      isAnd = 1
    }

    if (i < skeyArray.length-1) {
      if (isAnd) {
        query += 'AND '
      } else {
        query += 'OR '
      }
    }
  }

  query += 'LIMIT 18'
  models.sequelize.query(
    query, {
      type: models.Sequelize.QueryTypes.SELECT
    }).then (function (notes) {
      return callback(null, notes)
    }).catch(function (err) {
      logger.error('read search failed: ' + err)
      return callback(err, null)
    })
}

function parseSearchToArray (search) {
  var _search = []
  Object.keys(search).forEach(function (key) {
    var item = search[key]
    _search.push(item)
  })
  return _search
}

function searchGet (req, res) {
  if (!req.isAuthenticated()) {
     return response.errorForbidden(res)
  }
  if (req.query.q === undefined || !req.query.q.replace(/\s/g, '').length) {
    return response.errorNotFound(res)
  }
  getSearch(req.query.q, function (err, search) {
    if (err) return response.errorInternalError(res)
    if (!search) return response.errorNotFound(res)
    res.send({
      search: parseSearchToArray(search)
    })
  })
}

module.exports = Search
