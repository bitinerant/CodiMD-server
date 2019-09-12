'use strict'

const Router = require('express').Router

const { urlencodedParser } = require('./utils')
const search = require('../search')
const searchRouter = module.exports = Router()

// get search
searchRouter.get('/search.json', search.searchGet)
// post search
searchRouter.post('/search.json', urlencodedParser, search.searchPost)
// post search by note id
searchRouter.post('/search.json/:noteId', urlencodedParser, search.searchPost)
// delete search
searchRouter.delete('/search.json', search.searchDelete)
// delete search by note id
searchRouter.delete('/search.json/:noteId', search.searchDelete)
