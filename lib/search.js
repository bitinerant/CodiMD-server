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
  var terms = []
  var re = /((?:\\"|[^ "])+)|"((?:\\"|[^"])+)"/g
  var Op = models.Sequelize.Op
  var afterOr = 0
  while (1) {
      var match = re.exec(s_key) // split at space but keep quoted phrases
      if (match === null) {
        break
      }
      var phrase = (match[1] ? match[1] : match[2]).replace(/\\"/g, '"') // un-escape backslash-quote
      if (phrase == "OR") {
        if (terms.length > 0)
          afterOr = 1
        continue
      }
      if (afterOr) { // "OR" has higher operator precedence than the implied "AND"
        var last = terms.length-1
        terms[last] = {[Op.or]: [
          terms[last],
          {[Op.iLike]: '%'+phrase+'%'}
        ]}
        afterOr = 0
      } else {
        terms.push({[Op.iLike]: '%'+phrase+'%'})
      }
  }
  models.Note.findAll({
    limit: 18,
    where: {content: {[Op.and]: terms}}
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
