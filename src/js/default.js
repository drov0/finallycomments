import '../../node_modules/bulma/bulma.sass'
import '../scss/landing.scss'

import $ from 'jquery'
import steem from 'steem'
import showdown from 'showdown'
import finallycomments from 'finallycomments'
import purify from 'dompurify'

let app = {
  init: () => {
    let dashboard = $('main').hasClass('dashboard')
    let index = $('main').hasClass('index')
    let single = $('main').hasClass('single-post')
    let getStarted = $('main').hasClass('get-started')
    if(dashboard) app.dashboardInit()
    if(index) app.indexInit();
    if(single) app.initSinglePost();
    if(getStarted) app.initGetStartedPage();
  },
  dashboardInit: () => {
    app.dashboardLoadPosts()
    app.dashboardUiActions()
    app.dashboardLoadPane()
  },
  indexInit: () => {
    finallycomments.init()
    let options = {
      values: true,
      reputation: true,
      profile: false
    }
    finallycomments.appendTo('.finally__example', 'thread', 'finally-hellomars', 'sambillingham', options)
  },
  initSinglePost: async () => {
    let permlink = $('main').data('permlink')
    let postData = await steem.api.getContentAsync('sambillingham', permlink)
    app.appendSingePostContent(postData)
    finallycomments.init()
    finallycomments.loadEmbed('.single-post__finally-comments')
  },
  appendSingePostContent: (post) => {
    var converter = new showdown.Converter();
    var html = purify.sanitize(converter.makeHtml(post.body))
    let template = `<h2>${post.title}</h2>${html}`
    $('.single-post__content').append(template)
  },
  initGetStartedPage: () => {
    let codeBlock = `
<section class="finally-comments"\n
    data-id="https://steemit.com/utopian-io/@sambillingham/steemconnect-node-js-boilerplate-for-rapid-development-v-0-3-0"\n
    data-reputation="true"\n
    data-values="true"\n
    data-profile="true"\n
    data-generated="false"\n
    data-beneficiary=""\n
    data-beneficiaryWeight="0"\n
    data-guestComments="false"
</section>\n
<script src="https://finallycomments.com/js/finally.v0.3.2.min.js"></script>
<script>finallyComments.init()</script>
    `
    $('.strip__code').text(codeBlock)
  },
  dashboardLoadPane: () => {
    if(window.location.hash) {
      console.log(window.location.hash)
      $('.pane').hide()
      $(`.pane__${window.location.hash.substring(1)}`).show()
      $('.breadcrumb-link').parent().removeClass('is-active')
      $(`*[href="${window.location.hash}"]`).parent().addClass('is-active')
    }
  },
  dashboardSubmitDomain(){
    $('.domains__submit').addClass('is-loading')
    let domains = $('.domains__entry').val().split("\n");
    domains = domains.map(d =>  d.replace(/,/g, '').trim())
    domains = domains.filter(d => d !== '')
    console.log(domains)
    $.post({
      url: `/dashboard/domains`,
      dataType: 'json',
      data: { domains : JSON.stringify(domains) }
    }, (response) => {
      $('.domains__submit').removeClass('is-loading')
      if(!response.error){
        $('.current__domains').empty()
        domains.forEach((domain) => {
          $('.current__domains').append(`<div class="domain"><span class="tag is-dark">${domain}</span></div>`)
        })
      }
    })
  },
  dashboardLoadPosts: (loadMore) => {
    let username = $('main').data('username')
    let query = { tag: username, limit: 10 }
    let listPosts = (posts) => {
      if (posts.length < 10) $('.load-more-posts').remove()
      for (var i = 0; i < posts.length; i++) {
        if(loadMore && i === 0) continue
        let template = `<tr data-permlink=${posts[i].permlink}>
          <td>${posts[i].children}</td>
          <td><a href="/viewer/steem-post${posts[i].url}" target="_blank"> ${posts[i].title}</a></td>
          <td><button class="button is-dark load-embed" data-permlink="${posts[i].url}">Thread</button></td>
          <td><button class="button is-dark load-button-embed" data-permlink="${posts[i].url}">Button</button></td>
        </tr>`
        $('.dashboard__table--steem tbody').append(template)
      }
    }
    if(loadMore) {
      query = { tag: username, limit: 10, start_author: username,
        start_permlink: $('tr').last().data('permlink') }
    }
    steem.api.getDiscussionsByBlog(query, (err, result) => {
      if (err === null) listPosts(result)
    })
  },
  dashboardUiActions: () => {
    $('.domains__submit').on('click', (e) => {
        app.dashboardSubmitDomain()
    })

    $('.breadcrumb-link').on('click', (e) => {
      $('.breadcrumb-link').parent().removeClass('is-active')
      $(e.currentTarget).parent().addClass('is-active')

      let pane = $(e.currentTarget).data('pane')
      $('.pane').hide()
      $(`.pane__${pane}`).show()

      if(pane === 'generator') $('.embed-code--finallythread').empty()
    })

    $('.load-more-posts').on('click', (e) => {
      app.dashboardLoadPosts(true)
    })

    $('.dashboard').on('click', '.load-embed', (e) => {
      let permlink = $(e.currentTarget).data('permlink')
      let controls = {
         values: true, rep: true, profile: true,
         generated: $(e.currentTarget).data('generated') ? true : false,
         beneficiary: false }

      app.dashboadLoadEmbed(permlink, controls)
      $('.overlay--threadembed').data('permlink', permlink)
      $('.overlay--threadembed').addClass('--is-active')
    })

    $('.generate-embded').on('click', (e) => {
      let controller = $(e.currentTarget).data('controller')
      let permlink = app.linkToPermlink( $('.generate-url').val() )
      let controls = {
        values: $(`.${controller} *[data-value="votes"]`).is(':checked'),
        rep: $(`.${controller} *[data-value="reputation"]`).is(':checked'),
        profile: $(`.${controller} *[data-value="profile"]`).is(':checked'),
        beneficiary: $(`.${controller} *[data-value="beneficiary"]`).is(':checked'),
        beneficiaryUsername: $(`.${controller} *[data-value="beneficiary-username"]`).val(),
        beneficiaryPercentage: $(`.${controller} *[data-value="beneficiary-percentage"]`).val(),
        guestComments: $(`.${controller} *[data-value="guest-comments"]`).is(':checked')
      }
      if (permlink) app.dashboadLoadEmbed(permlink, controls)
    })

    $('.generate-button-embded').on('click', (e) => app.dashboardGenerateButtonEmbed(e))

    $('.dashboard').on('change', '.embed-control', (e) => {
      let controller = $(e.currentTarget).data('controller')
      let permlink;
      if (controller == 'overlay') {
         permlink = $('.overlay--threadembed').data('permlink')
      } else {
         permlink = app.linkToPermlink( $('.generate-url--thread').val())
      }
      let controls = {
        values: $(`.${controller} *[data-value="votes"]`).is(':checked'),
        rep: $(`.${controller} *[data-value="reputation"]`).is(':checked'),
        profile: $(`.${controller} *[data-value="profile"]`).is(':checked'),
        beneficiary: $(`.${controller} *[data-value="beneficiary"]`).is(':checked'),
        beneficiaryUsername: $(`.${controller} *[data-value="beneficiary-username"]`).val(),
        beneficiaryPercentage: $(`.${controller} *[data-value="beneficiary-percentage"]`).val(),
        guestComments: $(`.${controller} *[data-value="guest-comments"]`).is(':checked')
      }
      console.log(controls)
      app.dashboadLoadEmbed(permlink, controls)
    })
    $('.overlay__bg').on('click', (e) => {
      $('.overlay--threadembed').removeClass('--is-active')
      $('.overlay--finallybutton').removeClass('--is-active')
    })
    $('.new-thread').on('click', () => {
      $('.new-thread').addClass('is-loading')
      let title = $('.new-thread-title').val().trim()
      let beneficiary = $('.new-thread-beneficiary').val().trim()
      let beneficiaryWeight = parseInt($('.new-thread-beneficiary-weight').val())
      app.dashboardNewThread(title, beneficiary, beneficiaryWeight)
    })

    $('.dashboard').on('click', '.load-button-embed', (e) => app.dashboardLoadButtonEmbed(e) )
  },
  dashboardLoadButtonEmbed: (e) => {
    let permlink = $(e.currentTarget).data('permlink')
    $('.overlay--finallybutton').data('permlink', permlink)
    $('.overlay--finallybutton').addClass('--is-active')
    let embedTemplate = `<iframe height="66px" width="210px" style="border: none;" src="https://finallycomments.com/button${permlink}"></iframe>`
    $('.embed-code--finallybutton').empty()
    $('.embed-code--finallybutton').text(embedTemplate)
    $('.overlay__content iframe').remove()
    $('.overlay__content').append(embedTemplate)
  },
  dashboardGenerateButtonEmbed: (e) => {
    let permlink = app.linkToPermlink( $('.generate-url--button').val() )
    let embedTemplate = `<iframe height="66px" width="210px" style="border: none;" src="https://finallycomments.com/button${permlink}"></iframe>`
    $('.embed-code--finallybutton').empty()
    $('.embed-code--finallybutton').text(embedTemplate)
    $('.pane__generator .container').append(embedTemplate)
  },
  linkToPermlink(link){
    let input = link.trim().split('/')
    let slug = input.pop()
    let author = input.pop()
    let cat = input.pop()
    return `/${cat}/${author}/${slug}`
  },
  dashboadLoadEmbed: (permlink, controls) => {
    console.log(controls)
    let id = `    data-id="https://steemit.com${permlink}"\n`
    let rep = controls.rep ? '    data-reputation="true"\n' :''
    let values = controls.values ? '    data-values="true"\n' :''
    let profile = controls.profile ? '    data-profile="true"\n' :''
    let generated = controls.generated ? '    data-generated="true"\n' : '    data-generated="false"\n'
    let beneficiary = controls.beneficiary ? `    data-beneficiary="${controls.beneficiaryUsername}"\n` : ''
    let beneficiaryWeight = controls.beneficiary ? `    data-beneficiaryWeight="${controls.beneficiaryPercentage}"\n` : ''
    let guestComments = controls.guestComments ? `    data-guestComments="true"\n` : ''
    let embedTemplate = `
<section class="finally-comments"
${id}${rep}${values}${profile}${generated}${beneficiary}${beneficiaryWeight}${guestComments}</section>
<script src="https://finallycomments.com/js/finally.v0.3.2.min.js"></script>
<script>finallyComments.init()</script>
    `
    $('.embed-code--finallythread').empty()
    $('.embed-code--finallythread').text(embedTemplate)
  },
  dashboardNewThread:(title, beneficiary, beneficiaryWeight) => {
      $.post({
        url: `/new-thread`,
        dataType: 'json',
        data: { title, beneficiary, beneficiaryWeight }
      }, (response) => {
        console.log(response)
        $('.new-thread').removeClass('is-loading')
        $('.no-custom-threads').parent().remove()
        let template = `<tr>
          <td>${response.title}</td>
          <td><a href="/viewer/custom-thread/finallycomments/@${response.author}/${response.slug}">${response.slug}</a></td>
          <td><button class="button is-dark load-embed" data-permlink="/finallycomments/@${response.author}/${response.slug}" data-generated="true">Generate</button></td>
        </tr>`
        $('.dashboard__table--custom tbody').prepend(template)
      })
  }

}
app.init()
