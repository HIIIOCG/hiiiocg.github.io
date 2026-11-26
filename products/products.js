// Product pages: language. (The PRODUCTS dropdown opens on hover, in CSS.)
// Language shares the "hiiio-lang" key with the homepage (same origin), so the
// visitor's choice carries over in both directions.
(function () {
  var KEY = 'hiiio-lang'

  function normalize(v) {
    if (!v) return null
    v = String(v).toLowerCase()
    if (v.indexOf('zh') === 0) return 'zh'
    if (v.indexOf('en') === 0) return 'en'
    return null
  }

  function detect() {
    try {
      var q = normalize(new URLSearchParams(location.search).get('lang'))
      if (q) return q
    } catch (e) { /* ignore */ }
    try {
      var saved = normalize(localStorage.getItem(KEY))
      if (saved) return saved
    } catch (e) { /* ignore */ }
    var langs = navigator.languages || [navigator.language]
    for (var i = 0; i < langs.length; i++) {
      var n = normalize(langs[i])
      if (n) return n
    }
    return 'en'
  }

  function apply(lang) {
    var root = document.documentElement
    root.setAttribute('data-lang', lang)
    root.lang = lang === 'zh' ? 'zh-Hant-TW' : 'en'
    var title = root.getAttribute('data-title-' + lang)
    if (title) document.title = title
    // Search engines render /page/?lang=zh as the Chinese version (see hreflang in <head>)
    var desc = document.querySelector('meta[name="description"]')
    if (desc) {
      if (!root.hasAttribute('data-desc-en')) root.setAttribute('data-desc-en', desc.getAttribute('content'))
      var d = root.getAttribute('data-desc-' + lang)
      if (d) desc.setAttribute('content', d)
    }
  }

  // Canonical follows the URL: /page/?lang=zh is the Chinese page, anything
  // else (no ?lang, ?lang=en, other params) is the plain English URL. Set only
  // here, never in the HTML, so the two never disagree.
  function setCanonical() {
    try {
      var zh = normalize(new URLSearchParams(location.search).get('lang')) === 'zh'
      var href = location.origin + location.pathname + (zh ? '?lang=zh' : '')
      var link = document.querySelector('link[rel="canonical"]')
      if (!link) {
        link = document.createElement('link')
        link.rel = 'canonical'
        document.head.appendChild(link)
      }
      link.href = href
    } catch (e) { /* ignore */ }
  }

  function setLang(lang) {
    apply(lang)
    try { localStorage.setItem(KEY, lang) } catch (e) { /* ignore */ }
    try {
      var url = new URL(location.href)
      if (lang === 'zh') url.searchParams.set('lang', 'zh')
      else url.searchParams.delete('lang')
      history.replaceState(null, '', url)
    } catch (e) { /* ignore */ }
    setCanonical()
  }

  // Runs in <head>, before the body paints, so there is no flash of the other language.
  apply(detect())
  setCanonical()

  // Reel: [data-reel] lists clips; two <video>s take turns so the next clip is
  // loaded before it fades in. Dots jump to a clip. With reduced motion the
  // first clip's poster stays.
  function reel(box) {
    var clips = box.getAttribute('data-reel').split(/\s+/)
    var vids = box.querySelectorAll('.reel__v')
    var dots = box.querySelector('.reel__dots')
    var cur = 0, front = 0
    var buttons = clips.map(function (_, i) {
      var b = document.createElement('button')
      b.type = 'button'
      b.addEventListener('click', function () { show(i) })
      dots.appendChild(b)
      return b
    })
    function mark() {
      buttons.forEach(function (b, i) { b.setAttribute('aria-current', i === cur ? 'true' : 'false') })
    }
    function preloadNext() {
      var back = vids[1 - front]
      var next = clips[(cur + 1) % clips.length]
      if (back.getAttribute('src') !== next) { back.preload = 'auto'; back.src = next }
    }
    function show(i) {
      if (i === cur) return
      var back = vids[1 - front]
      if (back.getAttribute('src') !== clips[i]) back.src = clips[i]
      back.currentTime = 0
      var p = back.play()
      if (p && p.catch) p.catch(function () { /* autoplay blocked: poster stays */ })
      back.classList.add('is-on')
      vids[front].classList.remove('is-on')
      var old = vids[front]
      setTimeout(function () { old.pause() }, 500)
      front = 1 - front
      cur = i
      mark()
      preloadNext()
    }
    vids.forEach(function (v) {
      v.addEventListener('ended', function () { if (v === vids[front]) show((cur + 1) % clips.length) })
    })
    mark()
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return
    var p = vids[0].play()
    if (p && p.catch) p.catch(function () { /* autoplay blocked: poster stays */ })
    preloadNext()
  }
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-reel]').forEach(reel)
  })

  document.addEventListener('click', function (e) {
    var t = e.target
    if (!t.closest) return
    var langBtn = t.closest('[data-set-lang]')
    if (langBtn) setLang(langBtn.getAttribute('data-set-lang'))
  })
})()
