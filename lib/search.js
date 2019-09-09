'use strict'
// search
// external modules
var LZString = require('lz-string')

// core
var logger = require('./logger')
var response = require('./response')
var models = require('./models')

// public
var Search = {
  searchGet: searchGet,
  searchPost: searchPost,
  searchDelete: searchDelete,
  updateSearch: updateSearch
}

function getSearch (s_key, callback) {

  var skeyArray = s_key.split(" ")
  console.log("output string: " + skeyArray.toString())
  
  var query = 'SELECT * FROM "Notes" WHERE '
  var isAnd = 1
  var isAdd = 0;

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
        query = query + " content LIKE '%" + tmp + "%' "
      }
      isAnd = 0
      i++
    } else {
      query = query + " content LIKE '%" + tmp + "%' "
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
  // s_key = '%' + s_key + '%'
  models.sequelize.query(
    query, {
    // 'SELECT * FROM "Notes" WHERE content Like "%node%" OR content Like "%a%" LIMIT 18', {
    // 'SELECT * FROM "Notes" WHERE MATCH ("title","content") AGAINST ("+node -untitled" IN BOOLEAN MODE)', {
    // 'SELECT * FROM Notes WHERE Notes MATCH "content:node"', {
      // replacements: { status: '%node%' },
      type: models.Sequelize.QueryTypes.SELECT
    }).then (function (notes) {
      return callback(null, notes)
    }).catch(function (err) {
      logger.error('read search failed: ' + err)
      return callback(err, null)
    })

  // models.Note.findAll({
  //   limit: 18,

  //   where: {
  //     [models.Sequelize.Op.or]: [
  //       {title: {
  //       [models.Sequelize.Op.like]: '%'+s_key+'%'
  //       // [models.Sequelize.Op.like]: [models.Sequelize.Op.in](skeyArray)
  //       }},
  //       {content: {
  //       [models.Sequelize.Op.like]: '%'+s_key+'%'
  //       }}
  //     ]
  //   },
  //   attributes: {exclude: ['content']}
  // }).then (function (notes) {
  //   return callback(null, notes)
  // }).catch(function (err) {
  //   logger.error('read search failed: ' + err)
  //   return callback(err, null)
  // })
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

function updateSearch (userid, noteId, document, time) {
  if (userid && noteId && typeof document !== 'undefined') {
    getSearch(userid, function (err, search) {
      if (err || !search) return
      if (!search[noteId]) {
        search[noteId] = {}
      }
      var noteSearch = search[noteId]
      var noteInfo = models.Note.parseNoteInfo(document)
      noteSearch.id = noteId
      noteSearch.text = noteInfo.title
      noteSearch.time = time || Date.now()
      noteSearch.tags = noteInfo.tags
      setSearch(userid, search, function (err, count) {
        if (err) {
          logger.log(err)
        }
      })
    })
  }
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
  if (req.isAuthenticated()) {
    console.log("HLOG search key is"+ req.query.q)
    req.query.q = (req.query.q===undefined?'':req.query.q);
    getSearch(req.query.q, function (err, search) {
      if (err) return response.errorInternalError(res)
      if (!search) return response.errorNotFound(res)
      res.send({
        search: parseSearchToArray(search)
      })
    })
  } else {
    return response.errorForbidden(res)
  }
}

function searchPost (req, res) {
  if (req.isAuthenticated()) {
    var noteId = req.params.noteId
    if (!noteId) {
      if (typeof req.body['search'] === 'undefined') return response.errorBadRequest(res)
      logger.debug(`SERVER received search from [${req.user.id}]: ${req.body.search}`)
      try {
        var search = JSON.parse(req.body.search)
      } catch (err) {
        return response.errorBadRequest(res)
      }
      if (Array.isArray(search)) {
        setSearch(req.user.id, search, function (err, count) {
          if (err) return response.errorInternalError(res)
          res.end()
        })
      } else {
        return response.errorBadRequest(res)
      }
    } else {
      if (typeof req.body['pinned'] === 'undefined') return response.errorBadRequest(res)
      getSearch(req.user.id, function (err, search) {
        if (err) return response.errorInternalError(res)
        if (!search) return response.errorNotFound(res)
        if (!search[noteId]) return response.errorNotFound(res)
        if (req.body.pinned === 'true' || req.body.pinned === 'false') {
          search[noteId].pinned = (req.body.pinned === 'true')
          setSearch(req.user.id, search, function (err, count) {
            if (err) return response.errorInternalError(res)
            res.end()
          })
        } else {
          return response.errorBadRequest(res)
        }
      })
    }
  } else {
    return response.errorForbidden(res)
  }
}

function searchDelete (req, res) {
  if (req.isAuthenticated()) {
    var noteId = req.params.noteId
    if (!noteId) {
      setSearch(req.user.id, [], function (err, count) {
        if (err) return response.errorInternalError(res)
        res.end()
      })
    } else {
      getSearch(req.user.id, function (err, search) {
        if (err) return response.errorInternalError(res)
        if (!search) return response.errorNotFound(res)
        delete search[noteId]
        setSearch(req.user.id, search, function (err, count) {
          if (err) return response.errorInternalError(res)
          res.end()
        })
      })
    }
  } else {
    return response.errorForbidden(res)
  }
}

module.exports = Search
