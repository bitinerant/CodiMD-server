/* eslint-env browser, jquery */
/* global moment, serverurl */

import {
  checkIfAuth,
  clearLoginState,
  getLoginState,
  resetCheckAuth,
  setloginStateChangeEvent
} from './lib/common/login'

import {
  clearDuplicatedHistory,
  deleteServerHistory,
  getHistory,
  getStorageHistory,
  parseHistory,
  parseServerToHistory,
  parseStorageToHistory,
  postHistoryToServer,
  removeHistory,
  saveHistory,
  saveStorageHistoryToServer
} from './history'

import { saveAs } from 'file-saver'
import List from 'list.js'
import S from 'string'
import { 
  clearDuplicatedSearch,
  deleteServerSearch,
  getSearch,
  getStorageSearch,
  parseSearch,
  parseServerToSearch,
  parseStorageToSearch,
  postSearchToServer,
  removeSearch,
  saveSearch,
  saveStorageSearchToServer
} from './search';

require('./locale')

require('../css/cover.css')
require('../css/site.css')

const optionsHistory = {
  valueNames: ['id', 'text', 'timestamp', 'fromNow', 'time', 'tags', 'pinned'],
  item: `<li class="col-xs-12 col-sm-6 col-md-6 col-lg-4">
          <span class="id" style="display:none;"></span>
          <a href="#">
            <div class="item">
              <div class="ui-history-pin fa fa-thumb-tack fa-fw"></div>
              <div class="ui-history-close fa fa-close fa-fw" data-toggle="modal" data-target=".delete-history-modal"></div>
              <div class="content">
                <h4 class="text"></h4>
                <p>
                  <i><i class="fa fa-clock-o"></i> visited </i><i class="fromNow"></i>
                  <br>
                  <i class="timestamp" style="display:none;"></i>
                  <i class="time"></i>
                </p>
                <p class="tags"></p>
              </div>
            </div>
          </a>
        </li>`,
  page: 18,
  pagination: [{
    outerWindow: 1
  }]
}
const optionsSearch = {
  valueNames: ['id', 'text', 'timestamp', 'fromNow', 'time', 'tags', 'pinned'],
  item: `<li class="col-xs-12 col-sm-6 col-md-6 col-lg-4">
          <span class="id" style="display:none;"></span>
          <a href="#">
            <div class="item">
              <div class="content">
                <h4 class="text"></h4>
                <p>
                  <i><i class="fa fa-clock-o"></i> visited </i><i class="fromNow"></i>
                  <br>
                  <i class="timestamp" style="display:none;"></i>
                  <i class="time"></i>
                </p>
                <p class="tags"></p>
              </div>
            </div>
          </a>
        </li>`,
  page: 18,
  pagination: [{
    outerWindow: 1
  }]
}
const historyList = new List('history', optionsHistory)
const searchList = new List('search', optionsSearch)


window.migrateHistoryFromTempCallback = pageInit
setloginStateChangeEvent(pageInit)

pageInit()

function pageInit () {
  console.log("HLOG pageInit")
  checkIfAuth(
    data => {
      $('.ui-signin').hide()
      $('.ui-or').hide()
      $('.ui-welcome').show()
      if (data.photo) $('.ui-avatar').prop('src', data.photo).show()
      else $('.ui-avatar').prop('src', '').hide()
      $('.ui-name').html(data.name)
      $('.ui-signout').show()
      $('.ui-search').click()
      parseServerToSearch($('.search_search').val(), searchList, parseSearchCallback)
      parseServerToHistory(historyList, parseHistoryCallback)
    },
    () => {
      $('.ui-signin').show()
      $('.ui-or').show()
      $('.ui-welcome').hide()
      $('.ui-avatar').prop('src', '').hide()
      $('.ui-name').html('')
      $('.ui-signout').hide()
      parseStorageToSearch($('.search_search').val(), searchList, parseSearchCallback)
      parseStorageToHistory(historyList, parseHistoryCallback)
    }
  )
}

$('.masthead-nav li').click(function () {
  $(this).siblings().removeClass('active')
  $(this).addClass('active')
})

// prevent empty link change hash
$('a[href="#"]').click(function (e) {
  e.preventDefault()
})

$('.ui-home').click(function (e) {
  if (!$('#home').is(':visible')) {
    $('.section:visible').hide()
    $('#home').fadeIn()
  }                                             
})                                                                                                                                                                                                               

$('.ui-history').click(() => {
  if (!$('#history').is(':visible')){
    $('.section:visible').hide()
    $('#history').fadeIn()
  }
})


function checkHistoryList () {
  if ($('#history-list').children().length > 0) {
    console.log("HLOG getStorageHistory not Calling")
    $('.pagination').show()
    $('.ui-nohistory').hide()
    $('.ui-import-from-browser').hide()
  } else if ($('#history-list').children().length === 0) {
    console.log("HLOG getStorageHistory Calling")
    $('.pagination').hide()
    $('.ui-nohistory').slideDown()
    getStorageHistory(data => {
      if (data && data.length > 0 && getLoginState() && historyList.items.length === 0) {
        $('.ui-import-from-browser').slideDown()
      }
    })
  }
}

function parseHistoryCallback (list, notehistory) {  
  checkHistoryList()
  // sort by pinned then timestamp
  list.sort('', {
    sortFunction (a, b) {
      const notea = a.values()
      const noteb = b.values()
      if (notea.pinned && !noteb.pinned) {
        return -1
      } else if (!notea.pinned && noteb.pinned) {
        return 1
      } else {
        if (notea.timestamp > noteb.timestamp) {
          return -1
        } else if (notea.timestamp < noteb.timestamp) {
          return 1
        } else {
          return 0
        }
      }
    }
  })
  // parse filter tags
  const filtertags = []
  for (let i = 0, l = list.items.length; i < l; i++) {
    const tags = list.items[i]._values.tags
    if (tags && tags.length > 0) {
      for (let j = 0; j < tags.length; j++) {
        // push info filtertags if not found
        let found = false
        if (filtertags.includes(tags[j])) { found = true }
        if (!found) { filtertags.push(tags[j]) }
      }
    }
  }
  buildTagsFilter(filtertags)
}

// update items whenever list updated
historyList.on('updated', e => {
  for (let i = 0, l = e.items.length; i < l; i++) {
    const item = e.items[i]
    if (item.visible()) {
      const itemEl = $(item.elm)
      const values = item._values
      const a = itemEl.find('a')
      const pin = itemEl.find('.ui-history-pin')
      const tagsEl = itemEl.find('.tags')
      // parse link to element a
      a.attr('href', `${serverurl}/${values.id}`)
      // parse pinned
      if (values.pinned) {
        pin.addClass('active')
      } else {
        pin.removeClass('active')
      }
      // parse tags
      const tags = values.tags
      if (tags && tags.length > 0 && tagsEl.children().length <= 0) {
        const labels = []
        for (let j = 0; j < tags.length; j++) {
          // push into the item label
          labels.push(`<span class='label label-default'>${tags[j]}</span>`)
        }
        tagsEl.html(labels.join(' '))
      }
    }
  }
  $('.ui-history-close').off('click')
  $('.ui-history-close').on('click', historyCloseClick)
  $('.ui-history-pin').off('click')
  $('.ui-history-pin').on('click', historyPinClick)
})

function historyCloseClick (e) {
  e.preventDefault()
  const id = $(this).closest('a').siblings('span').html()
  const value = historyList.get('id', id)[0]._values
  $('.ui-delete-history-modal-msg').text('Do you really want to delete below history?')
  $('.ui-delete-history-modal-item').html(`<i class="fa fa-file-text"></i> ${value.text}<br><i class="fa fa-clock-o"></i> ${value.time}`)
  clearHistory = false
  deleteId = id
}

function historyPinClick (e) {
  e.preventDefault()
  const $this = $(this)
  const id = $this.closest('a').siblings('span').html()
  const item = historyList.get('id', id)[0]
  const values = item._values
  let pinned = values.pinned
  if (!values.pinned) {
    pinned = true
    item._values.pinned = true
  } else {
    pinned = false
    item._values.pinned = false
  }
  checkIfAuth(() => {
    postHistoryToServer(id, {
      pinned
    }, (err, result) => {
      if (!err) {
        if (pinned) { $this.addClass('active') } else { $this.removeClass('active') }
      }
    })
  }, () => {
    getHistory(notehistory => {
      for (let i = 0; i < notehistory.length; i++) {
        if (notehistory[i].id === id) {
          notehistory[i].pinned = pinned
          break
        }
      }
      saveHistory(notehistory)
      if (pinned) { $this.addClass('active') } else { $this.removeClass('active') }
    })
  })
}

// auto update item fromNow every minutes
setInterval(updateItemFromNow, 60000)

function updateItemFromNow () {
  const items = $('.item').toArray()
  for (let i = 0; i < items.length; i++) {
    const item = $(items[i])
    const timestamp = parseInt(item.find('.timestamp').text())
    item.find('.fromNow').text(moment(timestamp).fromNow())
  }
}

var clearHistory = false
var deleteId = null

function deleteHistory () {
  checkIfAuth(() => {
    deleteServerHistory(deleteId, (err, result) => {
      if (!err) {
        if (clearHistory) {
          historyList.clear()
          checkHistoryList()
        } else {
          historyList.remove('id', deleteId)
          checkHistoryList()
        }
      }
      $('.delete-history-modal').modal('hide')
      deleteId = null
      clearHistory = false
    })
  }, () => {
    if (clearHistory) {
      saveHistory([])
      historyList.clear()
      checkHistoryList()
      deleteId = null
    } else {
      if (!deleteId) return
      getHistory(notehistory => {
        const newnotehistory = removeHistory(deleteId, notehistory)
        saveHistory(newnotehistory)
        historyList.remove('id', deleteId)
        checkHistoryList()
        deleteId = null
      })
    }
    $('.delete-history-modal').modal('hide')
    clearHistory = false
  })
}

$('.ui-delete-history-modal-confirm').click(() => {
  deleteHistory()
})

$('.ui-import-from-browser').click(() => {
  saveStorageHistoryToServer(() => {
    parseStorageToHistory(historyList, parseHistoryCallback)
  })
})

$('.ui-save-history').click(() => {
  getHistory(data => {
    const history = JSON.stringify(data)
    const blob = new Blob([history], {
      type: 'application/json;charset=utf-8'
    })
    saveAs(blob, `codimd_history_${moment().format('YYYYMMDDHHmmss')}`, true)
  })
})

$('.ui-open-history').bind('change', e => {
  const files = e.target.files || e.dataTransfer.files
  const file = files[0]
  const reader = new FileReader()
  reader.onload = () => {
    const notehistory = JSON.parse(reader.result)
    // console.log(notehistory);
    if (!reader.result) return
    getHistory(data => {
      let mergedata = data.concat(notehistory)
      mergedata = clearDuplicatedHistory(mergedata)
      saveHistory(mergedata)
      parseHistory(historyList, parseHistoryCallback)
    })
    $('.ui-open-history').replaceWith($('.ui-open-history').val('').clone(true))
  }
  reader.readAsText(file)
})

$('.ui-clear-history').click(() => {
  $('.ui-delete-history-modal-msg').text('Do you really want to clear all history?')
  $('.ui-delete-history-modal-item').html('There is no turning back.')
  clearHistory = true
  deleteId = null
})

$('.ui-refresh-history').click(() => {
  const lastTags = $('.ui-use-tags').select2('val')
  $('.ui-use-tags').select2('val', '')
  historyList.filter()
  const lastKeyword = $('.search').val()
  $('.search').val('')
  historyList.search()
  $('#history-list').slideUp('fast')
  $('.pagination').hide()

  resetCheckAuth()
  historyList.clear()
  parseHistory(historyList, (list, notehistory) => {
    parseHistoryCallback(list, notehistory)
    $('.ui-use-tags').select2('val', lastTags)
    $('.ui-use-tags').trigger('change')
    historyList.search(lastKeyword)
    $('.search').val(lastKeyword)
    checkHistoryList()
    $('#history-list').slideDown('fast')
  })
})

$('.ui-delete-user-modal-cancel').click(() => {
  $('.ui-delete-user').parent().removeClass('active')
})

$('.ui-logout').click(() => {
  clearLoginState()
  location.href = `${serverurl}/logout`
})

let filtertags = []
$('.ui-use-tags').select2({
  placeholder: $('.ui-use-tags').attr('placeholder'),
  multiple: true,
  data () {
    return {
      results: filtertags
    }
  }
})
$('.select2-input').css('width', 'inherit')
buildTagsFilter([])

function buildTagsFilter (tags) {
  for (let i = 0; i < tags.length; i++) {
    tags[i] = {
      id: i,
      text: S(tags[i]).unescapeHTML().s
    }
  }
  filtertags = tags
}
$('.ui-use-tags').on('change', function () {
  console.log('HLOG .ui-use-tags onchange calling');
  const tags = []
  const data = $(this).select2('data')
  for (let i = 0; i < data.length; i++) { tags.push(data[i].text) }
  if (tags.length > 0) {
    historyList.filter(item => {
      const values = item.values()
      if (!values.tags) return false
      let found = false
      for (let i = 0; i < tags.length; i++) {
        if (values.tags.includes(tags[i])) {
          found = true
          break
        }
      }
      return found
    })
  } else {
    historyList.filter()
  }
  checkHistoryList()
})

$('.search').keyup(() => {
  checkHistoryList()
})


////////////////////////////////////// Search ///////////////////////////

$('.ui-search').click(() => {
  if (!$('#search').is(':visible')){
    $('.section:visible').hide()
    $('#search').fadeIn()
  }
})

function checkSearchList () {
  if ($('#search-list').children().length > 0) {
    $('.pagination').show()
    $('.ui-nosearch').hide()
    $('.ui-import-from-browser').hide()
  } else if ($('#search-list').children().length === 0) {
    $('.pagination').hide()
    $('.ui-nosearch').slideDown()
    getStorageSearch(null, data => {
      if (data && data.length > 0 && getLoginState() && searchList.items.length === 0) {
        $('.ui-import-from-browser').slideDown()
      }
    })
  }
}

function parseSearchCallback (list, notesearch) {  
  console.log(list);
  checkSearchList()
  // sort by pinned then timestamp
  list.sort('', {
    sortFunction (a, b) {
      const notea = a.values()
      const noteb = b.values()
      if (notea.pinned && !noteb.pinned) {
        return -1
      } else if (!notea.pinned && noteb.pinned) {
        return 1
      } else {
        if (notea.timestamp > noteb.timestamp) {
          return -1
        } else if (notea.timestamp < noteb.timestamp) {
          return 1
        } else {
          return 0
        }
      }
    }
  })
  // parse filter tags
  const filtertags = []
  for (let i = 0, l = list.items.length; i < l; i++) {
    const tags = list.items[i]._values.tags
    if (tags && tags.length > 0) {
      for (let j = 0; j < tags.length; j++) {
        // push info filtertags if not found
        let found = false
        if (filtertags.includes(tags[j])) { found = true }
        if (!found) { filtertags.push(tags[j]) }
      }
    }
  }
  buildTagsFilter(filtertags)
}

// update items whenever list updated
searchList.on('updated', e => {
  for (let i = 0, l = e.items.length; i < l; i++) {
    const item = e.items[i]
    if (item.visible()) {
      const itemEl = $(item.elm)
      const values = item._values
      const a = itemEl.find('a')
      const pin = itemEl.find('.ui-search-pin')
      const tagsEl = itemEl.find('.tags')
      // parse link to element a
      a.attr('href', `${serverurl}/${values.id}`)
      // parse pinned
      if (values.pinned) {
        pin.addClass('active')
      } else {
        pin.removeClass('active')
      }
      // parse tags
      const tags = values.tags
      if (tags && tags.length > 0 && tagsEl.children().length <= 0) {
        const labels = []
        for (let j = 0; j < tags.length; j++) {
          // push into the item label
          labels.push(`<span class='label label-default'>${tags[j]}</span>`)
        }
        tagsEl.html(labels.join(' '))
      }
    }
  }
  $('.ui-search-close').off('click')
  $('.ui-search-close').on('click', searchCloseClick)
  $('.ui-search-pin').off('click')
  $('.ui-search-pin').on('click', searchPinClick)
})

function searchCloseClick (e) {
  e.preventDefault()
  const id = $(this).closest('a').siblings('span').html()
  const value = searchList.get('id', id)[0]._values
  $('.ui-delete-search-modal-msg').text('Do you really want to delete below search?')
  $('.ui-delete-search-modal-item').html(`<i class="fa fa-file-text"></i> ${value.text}<br><i class="fa fa-clock-o"></i> ${value.time}`)
  clearSearch = false
  deleteId = id
}

function searchPinClick (e) {
  e.preventDefault()
  const $this = $(this)
  const id = $this.closest('a').siblings('span').html()
  const item = searchList.get('id', id)[0]
  const values = item._values
  let pinned = values.pinned
  if (!values.pinned) {
    pinned = true
    item._values.pinned = true
  } else {
    pinned = false
    item._values.pinned = false
  }
  checkIfAuth(() => {
    postSearchToServer(id, {
      pinned
    }, (err, result) => {
      if (!err) {
        if (pinned) { $this.addClass('active') } else { $this.removeClass('active') }
      }
    })
  }, () => {
    getSearch('', notesearch => {
      for (let i = 0; i < notesearch.length; i++) {
        console.log(notesearch[i])
        if (notesearch[i].id === id) {
          notesearch[i].pinned = pinned
          break
        }
      }
      saveSearch(notesearch)
      if (pinned) { $this.addClass('active') } else { $this.removeClass('active') }
    })
  })
}

var clearSearch = false

function deleteSearch () {
  checkIfAuth(() => {
    deleteServerSearch(deleteId, (err, result) => {
      if (!err) {
        if (clearSearch) {
          searchList.clear()
          checkSearchList()
        } else {
          searchList.remove('id', deleteId)
          checkSearchList()
        }
      }
      $('.delete-search-modal').modal('hide')
      deleteId = null
      clearSearch = false
    })
  }, () => {
    if (clearSearch) {
      saveSearch([])
      searchList.clear()
      checkSearchList()
      deleteId = null
    } else {
      if (!deleteId) return
      getSearch('', notesearch => {
        const newnotesearch = removeSearch(deleteId, notesearch)
        saveSearch(newnotesearch)
        searchList.remove('id', deleteId)
        checkSearchList()
        deleteId = null
      })
    }
    $('.delete-search-modal').modal('hide')
    clearSearch = false
  })
}

$('.ui-delete-search-modal-confirm').click(() => {
  deleteSearch()
})

$('.ui-import-from-browser').click(() => {
  saveStorageSearchToServer(() => {
    parseStorageToSearch(searchList, parseSearchCallback)
  })
})

$('.ui-save-search').click(() => {
  getSearch('', data => {
    const search = JSON.stringify(data)
    const blob = new Blob([search], {
      type: 'application/json;charset=utf-8'
    })
    saveAs(blob, `codimd_search_${moment().format('YYYYMMDDHHmmss')}`, true)
  })
})

$('.ui-open-search').bind('change', e => {
  const files = e.target.files || e.dataTransfer.files
  const file = files[0]
  const reader = new FileReader()
  reader.onload = () => {
    const notesearch = JSON.parse(reader.result)
    // console.log(notesearch);
    if (!reader.result) return
    getSearch('', data => {
      let mergedata = data.concat(notesearch)
      mergedata = clearDuplicatedSearch(mergedata)
      saveSearch(mergedata)
      parseSearch(searchList, parseSearchCallback)
    })
    $('.ui-open-search').replaceWith($('.ui-open-search').val('').clone(true))
  }
  reader.readAsText(file)
})

$('.ui-clear-search').click(() => {
  $('.ui-delete-search-modal-msg').text('Do you really want to clear all search?')
  $('.ui-delete-search-modal-item').html('There is no turning back.')
  clearSearch = true
  deleteId = null
})

$('.ui-refresh-search').click(() => {
  const lastTags = $('.ui-use-tags').select2('val')
  $('.ui-use-tags').select2('val', '')
  searchList.filter()
  const lastKeyword = $('.search').val()
  $('.search').val('')
  searchList.search()
  $('#search-list').slideUp('fast')
  $('.pagination').hide()

  resetCheckAuth()
  searchList.clear()
  parseSearch(searchList, (list, notesearch) => {
    parseSearchCallback(list, notesearch)
    $('.ui-use-tags').select2('val', lastTags)
    $('.ui-use-tags').trigger('change')
    // searchList.search(lastKeyword)
    $('.search').val(lastKeyword)
    checkSearchList()
    $('#search-list').slideDown('fast')
  })
})

var timeout;

$('.search_search').on('input', () => {
  const s_key = $('.search_search').val();
  const lastKeyword = $('.search').val()

  var delayInMilliseconds = 500;

  if (timeout) {
    clearTimeout(timeout);
  }

  timeout = setTimeout(function() {
    window.history.pushState("object or string", "Title", '/search/'+s_key);
    searchList.clear()
    parseServerToSearch(s_key, searchList, parseSearchCallback)
  }, delayInMilliseconds);
})
