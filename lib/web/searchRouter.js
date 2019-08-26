'use strict'

const Router = require('express').Router

const { urlencodedParser } = require('./utils')
const search = require('../search')
const searchRouter = module.exports = Router()

// get search
searchRouter.get('/search', search.searchGet)
// post search
searchRouter.post('/search', urlencodedParser, search.searchPost)
// post search by note id
searchRouter.post('/search/:noteId', urlencodedParser, search.searchPost)
// delete search
searchRouter.delete('/search', search.searchDelete)
// delete search by note id
searchRouter.delete('/search/:noteId', search.searchDelete)
