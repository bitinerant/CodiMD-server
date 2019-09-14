'use strict'

const Router = require('express').Router

const { urlencodedParser } = require('./utils')
const search = require('../search')
const searchRouter = module.exports = Router()

// get search
searchRouter.get('/search.json', search.searchGet)
