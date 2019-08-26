/* eslint-env browser, jquery */
/* eslint no-console: ["error", { allow: ["warn", "error", "debug"] }] */
/* global serverurl, moment */

import store from 'store'
import S from 'string'
import LZString from 'lz-string'
import url from 'wurl'

import {
  checkNoteIdValid,
  encodeNoteId
} from './utils'

import {
  checkIfAuth
} from './lib/common/login'

import {
  urlpath
} from './lib/config'

window.migrateSearchFromTempCallback = null

migrateSearchFromTemp()

function migrateSearchFromTemp () {
  if (url('#tempid')) {
    $.get(`${serverurl}/temp`, {
      tempid: url('#tempid')
    })
      .done(data => {
        if (data && data.temp) {
          getStorageSearch(olddata => {
            if (!olddata || olddata.length === 0) {
              saveSearchToStorage(JSON.parse(data.temp))
            }
          })
        }
      })
      .always(() => {
        let hash = location.hash.split('#')[1]
        hash = hash.split('&')
        for (let i = 0; i < hash.length; i++) {
          if (hash[i].indexOf('tempid') === 0) {
            hash.splice(i, 1)
            i--
          }
        }
        hash = hash.join('&')
        location.hash = hash
        if (window.migrateSearchFromTempCallback) { window.migrateSearchFromTempCallback() }
      })
  }
}

export function saveSearch (notesearch) {
  checkIfAuth(
    () => {
      saveSearchToServer(notesearch)
    },
    () => {
      saveSearchToStorage(notesearch)
    }
  )
}

function saveSearchToStorage (notesearch) {
  store.set('notesearch', JSON.stringify(notesearch))
}

function saveSearchToServer (notesearch) {
  $.post(`${serverurl}/search`, {
    search: JSON.stringify(notesearch)
  })
}

export function saveStorageSearchToServer (callback) {
  const data = store.get('notesearch')
  if (data) {
    $.post(`${serverurl}/search`, {
      search: data
    })
      .done(data => {
        callback(data)
      })
  }
}

export function clearDuplicatedSearch (notesearch) {
  const newnotesearch = []
  for (let i = 0; i < notesearch.length; i++) {
    let found = false
    for (let j = 0; j < newnotesearch.length; j++) {
      const id = notesearch[i].id.replace(/=+$/, '')
      const newId = newnotesearch[j].id.replace(/=+$/, '')
      if (id === newId || notesearch[i].id === newnotesearch[j].id || !notesearch[i].id || !newnotesearch[j].id) {
        const time = (typeof notesearch[i].time === 'number' ? moment(notesearch[i].time) : moment(notesearch[i].time, 'MMMM Do YYYY, h:mm:ss a'))
        const newTime = (typeof newnotesearch[i].time === 'number' ? moment(newnotesearch[i].time) : moment(newnotesearch[i].time, 'MMMM Do YYYY, h:mm:ss a'))
        if (time >= newTime) {
          newnotesearch[j] = notesearch[i]
        }
        found = true
        break
      }
    }
    if (!found) { newnotesearch.push(notesearch[i]) }
  }
  return newnotesearch
}

function addSearch (id, text, time, tags, pinned, notesearch) {
  // only add when note id exists
  if (id) {
    notesearch.push({
      id,
      text,
      time,
      tags,
      pinned
    })
  }
  return notesearch
}

export function removeSearch (id, notesearch) {
  for (let i = 0; i < notesearch.length; i++) {
    if (notesearch[i].id === id) {
      notesearch.splice(i, 1)
      i -= 1
    }
  }
  return notesearch
}

// used for inner
export function writeSearch (title, tags) {
  checkIfAuth(
    () => {
      // no need to do this anymore, this will count from server-side
      // writeSearchToServer(title, tags);
    },
    () => {
      writeSearchToStorage(title, tags)
    }
  )
}

function writeSearchToStorage (title, tags) {
  let data = store.get('notesearch')
  let notesearch
  if (data && typeof data === 'string') {
    notesearch = JSON.parse(data)
  } else {
    notesearch = []
  }

  const newnotesearch = generateSearch(title, tags, notesearch)
  saveSearchToStorage(newnotesearch)
}

if (!Array.isArray) {
  Array.isArray = arg => Object.prototype.toString.call(arg) === '[object Array]'
}

function renderSearch (title, tags) {
  console.debug("HLOG tags: "+tags);
  console.log("HLOG tags: "+tags);
  const id = urlpath ? location.pathname.slice(urlpath.length + 1, location.pathname.length).split('/')[1] : location.pathname.split('/')[1]
  return {
    id,
    text: title,
    time: moment().valueOf(),
    tags
  }
}

function generateSearch (title, tags, notesearch) {
  const info = renderSearch(title, tags)
  // keep any pinned data
  let pinned = false
  for (let i = 0; i < notesearch.length; i++) {
    if (notesearch[i].id === info.id && notesearch[i].pinned) {
      pinned = true
      break
    }
  }
  notesearch = removeSearch(info.id, notesearch)
  notesearch = addSearch(info.id, info.text, info.time, info.tags, pinned, notesearch)
  notesearch = clearDuplicatedSearch(notesearch)
  return notesearch
}

// used for outer
export function getSearch (s_key, callback) {
  console.log('HLOG: getSearch')
  checkIfAuth(
    () => {
      getServerSearch(s_key,  callback)
    },
    () => {
      getServerSearch(s_key, callback)
    }
  )
}

function getServerSearch (s_key,callback) {
  console.log('HLOG: getServerSearch')
  let url = `${serverurl}/search/`;
  if(s_key && s_key !== '') {
    url = `${serverurl}/search/?q=`+s_key
  }
  $.get(url)
    .done(data => {
      if (data.search) {
        callback(data.search)
      }
    })
    .fail((xhr, status, error) => {
      console.error(xhr.responseText)
    })
}

export function getStorageSearch (s_key, callback) {
  console.log('HLOG: getStorageSearch')
  let data = store.get('notesearch')
  if (data) {
    if (typeof data === 'string') { data = JSON.parse(data) }
    callback(data)
  }
  // eslint-disable-next-line standard/no-callback-literal
  callback([])
}

export function parseSearch (s_key, list, callback) {
  checkIfAuth(
    () => {
      parseServerToSearch(s_key, list, callback)
    },
    () => {
      parseStorageToSearch(s_key, list, callback)
    }
  )
}

export function parseServerToSearch (s_key, list, callback) {
  let url = `${serverurl}/search/`;
  if(s_key) {
    url = `${serverurl}/search/?q=`+s_key
  }
  $.get(url)
    .done(data => {
      if (data.search) {
        parseToSearch(list, data.search, callback)
      }
    })
    .fail((xhr, status, error) => {
      console.error(xhr.responseText)
    })
}

export function parseStorageToSearch (s_key, list, callback) {
  let data = store.get('notesearch')
  if (data) {
    if (typeof data === 'string') { data = JSON.parse(data) }
    parseToSearch(list, data, callback)
  }
  parseToSearch(list, [], callback)
}

function parseToSearch (list, notesearch, callback) {
  if (!callback) return
  else if (!list || !notesearch) callback(list, notesearch)
  else if (notesearch && notesearch.length > 0) {
    for (let i = 0; i < notesearch.length; i++) {
      // migrate LZString encoded id to base64url encoded id
      try {
        let id = LZString.decompressFromBase64(notesearch[i].id)
        if (id && checkNoteIdValid(id)) {
          // notesearch[i].id = encodeNoteId(id)
        }
      } catch (err) {
        console.error(err)
      }
      notesearch[i].id = encodeNoteId(notesearch[i].id)
      // parse time to timestamp and fromNow
      notesearch[i].time = moment(notesearch[i].updatedAt).valueOf()
      const timestamp = (typeof notesearch[i].time === 'number' ? moment(notesearch[i].time) : moment(notesearch[i].time, 'MMMM Do YYYY, h:mm:ss a'))
      notesearch[i].timestamp = timestamp.valueOf()
      notesearch[i].fromNow = timestamp.fromNow()
      notesearch[i].time = timestamp.format('llll')
      
      // prevent XSS
      notesearch[i].text = S(notesearch[i].title).escapeHTML().s
      notesearch[i].tags = ''
      // add to list
      if (notesearch[i].id && list.get('id', notesearch[i].id).length === 0) { list.add(notesearch[i]) }
    }
  }
  callback(list, notesearch)
}

export function postSearchToServer (noteId, data, callback) {
  $.post(`${serverurl}/search/${noteId}`, data)
    .done(result => callback(null, result))
    .fail((xhr, status, error) => {
      console.error(xhr.responseText)
      return callback(error, null)
    })
}

export function deleteServerSearch (noteId, callback) {
  $.ajax({
    url: `${serverurl}/search${noteId ? '/' + noteId : ''}`,
    type: 'DELETE'
  })
    .done(result => callback(null, result))
    .fail((xhr, status, error) => {
      console.error(xhr.responseText)
      return callback(error, null)
    })
}
