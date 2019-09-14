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

  var skeyArray = s_key.split(" ")
  console.log("output string: " + skeyArray.toString())
  var query = 'SELECT * FROM "Notes" WHERE '
  var isAnd = 1

  for (var i = 0; i < skeyArray.length ; i++) {
    var tmp = skeyArray[i]
    if (tmp[0]=='"') {
      tmp = tmp.substr(1)
      if (tmp[tmp.length-1] == '"') {
        tmp = tmp.substring(0, tmp.length - 1)
      } else {
        i++
        while (i < skeyArray.length && skeyArray[i][skeyArray[i].length - 1] != '"') {
          tmp = tmp + " " + skeyArray[i]
          i++
        }
        tmp = tmp + " " + skeyArray[i].substring(0, skeyArray[i].length - 1)
      }
    }

    if (skeyArray[i+1] == 'OR') {
      if (isAnd == 1) {
        query += "("
      }
      query = query + " content ILIKE '%" + tmp + "%' "
      isAnd = 0
      i++
    } else {
      query = query + " content ILIKE '%" + tmp + "%' "
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

function setSearch (userid, search, callback) {
  models.User.update({
    search: JSON.stringify(parseSearchToArray(search))
  }, {
    where: {
      id: userid
    }
  }).then(function (count) {
    return callback(null, count)
  }).catch(function (err) {
    logger.error('set search failed: ' + err)
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

function parseSearchToObject (search) {
  var _search = {}
  for (var i = 0, l = search.length; i < l; i++) {
    var item = search[i]
    _search[item.id] = item
  }
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
