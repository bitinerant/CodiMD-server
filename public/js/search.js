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
  let url = `${serverurl}/search.json/`;
  if(s_key) {
    url = `${serverurl}/search.json/?q=`+s_key
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

