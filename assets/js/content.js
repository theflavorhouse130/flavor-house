/*
  The Flavor House — content loader.

  Fetches content/*.json and renders them into the static page. This is what makes the
  Sveltia CMS (admin/config.yml) a real field-by-field editor: each JSON file below maps
  to one CMS collection, and list widgets there map to the arrays here (menu items,
  cocktails, signature dishes, event types) so the owner can add/remove/reorder items,
  not just edit one big blob of text.

  If you're changing what's editable, change it in both places: the JSON shape here AND
  the matching collection in admin/config.yml, or the CMS will show fields that don't
  do anything, or the site will have content the CMS can't reach.
*/
(function(){
  "use strict";

  function esc(s){
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function fav(isFav){
    return isFav ? ' <span class="fav" aria-label="House favorite">&#9733;</span>' : '';
  }

  function fetchJSON(path){
    return fetch(path, { cache: 'no-store' }).then(function(r){
      if(!r.ok){ throw new Error('Failed to load ' + path + ': ' + r.status); }
      return r.json();
    });
  }

  function setText(selector, value){
    document.querySelectorAll(selector).forEach(function(el){ el.textContent = value; });
  }

  /* ---------- Business info, applied everywhere it appears on the page ---------- */
  function applyBusinessInfo(b){
    document.querySelectorAll('[data-phone-tel-link]').forEach(function(a){ a.href = 'tel:' + b.phoneTel; });
    setText('[data-phone-text]', b.phone);
    document.querySelectorAll('[data-email-link]').forEach(function(a){ a.href = 'mailto:' + b.email; });
    setText('[data-email-text]', b.email);
    document.querySelectorAll('[data-email-mailto-link]').forEach(function(a){
      var subject = a.getAttribute('data-email-mailto-link');
      a.href = 'mailto:' + b.email + '?subject=' + encodeURIComponent(subject);
    });
    document.querySelectorAll('[data-instagram-link]').forEach(function(a){ a.href = b.instagramUrl; });
    setText('[data-instagram-text]', b.instagramHandle);
    document.querySelectorAll('[data-maps-link]').forEach(function(a){ a.href = b.mapsUrl; });
    document.querySelectorAll('[data-maps-embed]').forEach(function(el){ el.src = b.mapsEmbedUrl; });
    setText('[data-address="line1"]', b.addressLine1);
    setText('[data-address="line2"]', b.addressLine2);
    setText('[data-address="short"]', b.addressShort);
    setText('[data-address-text]', b.addressHeroLine);
    setText('[data-business="foundedYear"]', b.foundedYear);

    var strip = document.querySelector('[data-trust-strip]');
    if(strip){
      strip.innerHTML = b.trustStrip.map(function(item, i){
        var sep = i > 0 ? '<span class="sep">/</span>' : '';
        var cls = item.highlight ? ' class="g"' : '';
        return sep + '<span' + cls + '>' + esc(item.text) + '</span>';
      }).join('');
    }
  }

  /* ---------- Hero ---------- */
  function renderHero(hero){
    var eyebrow = document.querySelector('[data-hero="eyebrow"]');
    if(eyebrow){ eyebrow.textContent = hero.eyebrow; }
    var headline = document.querySelector('[data-hero="headline"]');
    if(headline){ headline.innerHTML = esc(hero.headlinePlain) + ' <em>' + esc(hero.headlineEmphasis) + '</em>'; }
    var sub = document.querySelector('[data-hero="sub"]');
    if(sub){ sub.textContent = hero.subhead; }
    var meta = document.querySelector('[data-hero="metaLine"]');
    if(meta){ meta.textContent = hero.metaLine; }
  }

  /* ---------- Intro + pillars ---------- */
  function renderIntro(intro){
    var eyebrow = document.querySelector('[data-intro="eyebrow"]');
    if(eyebrow){ eyebrow.textContent = intro.eyebrow; }
    var headline = document.querySelector('[data-intro="headline"]');
    if(headline){ headline.innerHTML = esc(intro.headlinePlain) + ' <em>' + esc(intro.headlineEmphasis) + '</em>'; }
    var p1 = document.querySelector('[data-intro="paragraph1"]');
    if(p1){ p1.textContent = intro.paragraph1; }
    var p2 = document.querySelector('[data-intro="paragraph2"]');
    if(p2){ p2.textContent = intro.paragraph2; }

    var pillars = document.querySelector('[data-pillars]');
    if(pillars){
      pillars.innerHTML = intro.pillars.map(function(p, i){
        var dAttr = i === 0 ? '' : ' data-d="' + i + '"';
        return '<div class="pillar reveal"' + dAttr + '>' +
          '<span class="k">' + esc(p.kicker) + '</span>' +
          '<h3 class="display">' + esc(p.title) + '</h3>' +
          '<p>' + esc(p.body) + '</p>' +
          '</div>';
      }).join('');
    }
  }

  /* ---------- Signature dishes ---------- */
  function renderSignatures(sig){
    var eyebrow = document.querySelector('[data-sig="eyebrow"]');
    if(eyebrow){ eyebrow.textContent = sig.eyebrow; }
    var headline = document.querySelector('[data-sig="headline"]');
    if(headline){ headline.innerHTML = esc(sig.headlinePlain) + ' <em>' + esc(sig.headlineEmphasis) + '</em>'; }
    var intro = document.querySelector('[data-sig="intro"]');
    if(intro){ intro.textContent = sig.intro; }

    var list = document.querySelector('[data-sig-list]');
    if(list){
      list.innerHTML = sig.items.map(function(item){
        return '<li class="sig__item">' +
          '<div class="sig__row"><h3 class="sig__name display">' + esc(item.name) + fav(item.favorite) + '</h3></div>' +
          '<p class="sig__desc">' + esc(item.desc) + '</p>' +
          '</li>';
      }).join('');
    }
  }

  /* ---------- Full menu (tabs + panels) ---------- */
  function menuItemHtml(item){
    var priceHtml = item.price
      ? '<span class="m-item__lead" aria-hidden="true"></span><span class="m-item__price">' + esc(item.price) + '</span>'
      : '';
    var descHtml = item.desc ? '<p class="m-item__desc">' + esc(item.desc) + '</p>' : '';
    return '<li class="m-item"><div class="m-item__head"><span class="m-item__name display">' +
      esc(item.name) + fav(item.favorite) + '</span>' + priceHtml + '</div>' + descHtml + '</li>';
  }

  function renderMenu(menu){
    var eyebrow = document.querySelector('[data-menu="eyebrow"]');
    if(eyebrow){ eyebrow.textContent = menu.eyebrow; }
    var headline = document.querySelector('[data-menu="headline"]');
    if(headline){ headline.innerHTML = esc(menu.headlinePlain) + ' <em>' + esc(menu.headlineEmphasis) + '</em>'; }
    var intro = document.querySelector('[data-menu="intro"]');
    if(intro){ intro.textContent = menu.intro; }
    var gratuity = document.querySelector('[data-menu="gratuityNote"]');
    if(gratuity){ gratuity.textContent = menu.gratuityNote; }

    var tabsEl = document.querySelector('[data-menu-tabs]');
    var panelsEl = document.querySelector('[data-menu-panels]');
    if(!tabsEl || !panelsEl){ return; }

    tabsEl.innerHTML = menu.categories.map(function(cat, i){
      var selected = i === 0 ? 'true' : 'false';
      var tabindex = i === 0 ? '' : ' tabindex="-1"';
      return '<button class="tab" role="tab" id="tab-' + esc(cat.id) + '" aria-controls="panel-' + esc(cat.id) +
        '" aria-selected="' + selected + '"' + tabindex + '>' + esc(cat.label) + '</button>';
    }).join('');

    panelsEl.innerHTML = menu.categories.map(function(cat, i){
      var hidden = i === 0 ? '' : ' hidden';
      var note = cat.note ? '<p class="m-note" style="margin-bottom:1rem;">' + esc(cat.note) + '</p>' : '';
      var items = cat.items.map(menuItemHtml).join('');
      return '<div class="tabpanel" id="panel-' + esc(cat.id) + '" role="tabpanel" aria-labelledby="tab-' + esc(cat.id) +
        '" tabindex="0"' + hidden + '>' + note +
        '<ul class="menu__cols" style="list-style:none;margin:0;padding:0;">' + items + '</ul></div>';
    }).join('');
  }

  /* ---------- Cocktails ---------- */
  function renderCocktails(cocktails){
    var eyebrow = document.querySelector('[data-cocktails="eyebrow"]');
    if(eyebrow){ eyebrow.textContent = cocktails.eyebrow; }
    var headline = document.querySelector('[data-cocktails="headline"]');
    if(headline){ headline.innerHTML = esc(cocktails.headlinePlain) + ' <em>' + esc(cocktails.headlineEmphasis) + '</em>'; }
    var intro = document.querySelector('[data-cocktails="intro"]');
    if(intro){ intro.textContent = cocktails.intro; }

    var when = document.querySelector('[data-hh="when"]');
    if(when){ when.textContent = cocktails.happyHour.when; }
    var title = document.querySelector('[data-hh="title"]');
    if(title){ title.textContent = cocktails.happyHour.title; }
    var body = document.querySelector('[data-hh="body"]');
    if(body){ body.textContent = cocktails.happyHour.body; }

    var list = document.querySelector('[data-cocktail-list]');
    if(list){
      list.innerHTML = cocktails.items.map(function(item){
        return '<li class="cktl"><div class="cktl__row"><span class="cktl__name display">' +
          esc(item.name) + fav(item.favorite) + '</span></div><p class="cktl__desc">' + esc(item.desc) + '</p></li>';
      }).join('');
    }
  }

  /* ---------- Private events ---------- */
  function renderEvents(events){
    var eyebrow = document.querySelector('[data-events="eyebrow"]');
    if(eyebrow){ eyebrow.textContent = events.eyebrow; }
    var headline = document.querySelector('[data-events="headline"]');
    if(headline){ headline.innerHTML = esc(events.headlinePlain) + ' <em>' + esc(events.headlineEmphasis) + '</em>'; }
    var body = document.querySelector('[data-events="body"]');
    if(body){ body.textContent = events.body; }

    var list = document.querySelector('[data-events-list]');
    if(list){
      list.innerHTML = events.items.map(function(text){ return '<li>' + esc(text) + '</li>'; }).join('');
    }
  }

  /* ---------- Hours (Visit section + footer) ---------- */
  function renderHours(hours){
    var visitList = document.querySelector('[data-hours-list]');
    if(visitList){
      visitList.innerHTML = hours.days.map(function(d){
        var cls = d.closed ? ' closed' : '';
        return '<li><span class="d">' + esc(d.label) + '</span><span class="t' + cls + '">' + esc(d.time) + '</span></li>';
      }).join('');
    }
    var lunchNote = document.querySelector('[data-hours="lunchNote"]');
    if(lunchNote){ lunchNote.textContent = hours.lunchNote; }

    var footList = document.querySelector('[data-footer-hours-list]');
    if(footList){
      footList.innerHTML = hours.days.map(function(d){
        return '<li><span>' + esc(d.label) + '</span><span>' + esc(d.time) + '</span></li>';
      }).join('');
    }
  }

  /* ---------- Images & background videos ---------- */
  function renderImages(images){
    document.querySelectorAll('img[data-image]').forEach(function(img){
      var data = images[img.getAttribute('data-image')];
      if(!data){ return; }
      img.src = data.src;
      if(data.alt !== undefined && data.alt !== ''){ img.alt = data.alt; }
    });
    document.querySelectorAll('video[data-video]').forEach(function(video){
      var data = images[video.getAttribute('data-video')];
      if(data){
        var source = video.querySelector('source');
        if(source){ source.src = data.src; }
        video.load();
      }
      var posterKey = video.getAttribute('data-video-poster');
      var posterData = posterKey ? images[posterKey] : null;
      if(posterData){ video.poster = posterData.src; }
    });
  }

  /* ---------- Interactive behavior (runs after content is in the DOM) ---------- */
  function wireStickyNav(){
    var topbar = document.getElementById('top');
    var onScroll = function(){
      if(window.scrollY > 40){ topbar.classList.add('is-stuck'); }
      else{ topbar.classList.remove('is-stuck'); }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function wireMobileNav(){
    var burger = document.getElementById('burger');
    var mnav = document.getElementById('mnav');
    var toggleNav = function(open){
      var isOpen = (open !== undefined) ? open : burger.getAttribute('aria-expanded') !== 'true';
      burger.setAttribute('aria-expanded', String(isOpen));
      burger.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
      mnav.classList.toggle('is-open', isOpen);
      mnav.setAttribute('aria-hidden', String(!isOpen));
      document.body.style.overflow = isOpen ? 'hidden' : '';
    };
    burger.addEventListener('click', function(){ toggleNav(); });
    mnav.addEventListener('click', function(e){
      if(e.target.tagName === 'A'){ toggleNav(false); }
    });
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape' && mnav.classList.contains('is-open')){ toggleNav(false); burger.focus(); }
    });
  }

  function wireTabs(){
    var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
    var panels = Array.prototype.slice.call(document.querySelectorAll('.tabpanel'));
    if(!tabs.length){ return; }
    var selectTab = function(tab){
      tabs.forEach(function(t){
        var sel = (t === tab);
        t.setAttribute('aria-selected', String(sel));
        t.tabIndex = sel ? 0 : -1;
      });
      panels.forEach(function(p){
        p.hidden = (p.getAttribute('aria-labelledby') !== tab.id);
      });
    };
    tabs.forEach(function(tab, i){
      tab.addEventListener('click', function(){ selectTab(tab); });
      tab.addEventListener('keydown', function(e){
        var idx = null;
        if(e.key === 'ArrowRight'){ idx = (i + 1) % tabs.length; }
        else if(e.key === 'ArrowLeft'){ idx = (i - 1 + tabs.length) % tabs.length; }
        else if(e.key === 'Home'){ idx = 0; }
        else if(e.key === 'End'){ idx = tabs.length - 1; }
        if(idx !== null){ e.preventDefault(); selectTab(tabs[idx]); tabs[idx].focus(); }
      });
    });
  }

  function wireReservationForm(business){
    var rform = document.getElementById('rform');
    if(!rform){ return; }
    rform.addEventListener('submit', function(e){
      e.preventDefault();
      var g = function(id){ var el = document.getElementById(id); return el ? el.value : ''; };
      var name = g('r-name') || 'Guest';
      var body =
        'Reservation request for The Flavor House' + '\n\n' +
        'Name: ' + name + '\n' +
        'Party size: ' + g('r-party') + '\n' +
        'Date: ' + (g('r-date') || 'To confirm') + '\n' +
        'Time: ' + (g('r-time') || 'To confirm') + '\n' +
        'Notes: ' + (g('r-note') || 'None') + '\n';
      var url = 'mailto:' + business.email
        + '?subject=' + encodeURIComponent('Reservation Request - ' + name)
        + '&body=' + encodeURIComponent(body);
      window.location.href = url;
    });
  }

  function wireYear(){
    var yr = document.getElementById('yr');
    if(yr){ yr.textContent = String(new Date().getFullYear()); }
  }

  function wireScrollReveal(){
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    if(reduce || !('IntersectionObserver' in window)){
      reveals.forEach(function(el){ el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function(el){ io.observe(el); });
  }

  /* ---------- Boot ---------- */
  Promise.all([
    fetchJSON('content/business.json'),
    fetchJSON('content/hero.json'),
    fetchJSON('content/intro.json'),
    fetchJSON('content/signatures.json'),
    fetchJSON('content/menu.json'),
    fetchJSON('content/cocktails.json'),
    fetchJSON('content/events.json'),
    fetchJSON('content/hours.json'),
    fetchJSON('content/images.json')
  ]).then(function(results){
    var business = results[0], hero = results[1], intro = results[2], signatures = results[3],
        menu = results[4], cocktails = results[5], events = results[6], hours = results[7],
        images = results[8];

    applyBusinessInfo(business);
    renderHero(hero);
    renderIntro(intro);
    renderSignatures(signatures);
    renderMenu(menu);
    renderCocktails(cocktails);
    renderEvents(events);
    renderHours(hours);
    renderImages(images);

    wireStickyNav();
    wireMobileNav();
    wireTabs();
    wireReservationForm(business);
    wireYear();
    wireScrollReveal();
  }).catch(function(err){
    console.error('Content failed to load:', err);
  });
})();
