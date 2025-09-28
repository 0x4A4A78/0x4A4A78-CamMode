let Moving = {}
let SelectedId = 0
let SelectedPic = 'Pick a picture first !'
let LatestScreenshot = null
let BlurType = false
let AmTooLazyToFixThisInABetterWay = false
let galleryphoto = 1.14
let ControlPressed = false
let WaitBeforeTakingAnotherPicture = false
let GalleryToggle = false
let isCamera = false


function showKeyhints(yes){
  if (yes) { $('.keyhints').fadeIn(0) } else { $('.keyhints').fadeOut(0) }
}

function closeGallery(){
  GalleryToggle = false
  $('.gallerycontainer').hide()
  $('#gallery').removeClass('primary')
}


window.addEventListener('message', function(event) {
  switch(event.data.action) {
    case "opencam":
      $('.photomodecontainer').fadeIn(0)
      isCamera = true
      showKeyhints(true)
      DestroyAllSliders();
      CreateAllSliders(Moving);
      $.post(`https://${GetParentResourceName()}/CameraMode`, {});
      break;

    case "Setup":
      SetupCameraMode(event.data.Settings, event.data.Pictures)
      break;

    case "CopyScreenshotUrl":
      ScreenShot(event.data)
      break;

    case "hideui":
      $('.photomodecontainer').fadeOut(0)

      showKeyhints(true)
      break;

    case "showui":
      $('.photomodecontainer').fadeIn(0)
      showKeyhints(true)
      break;

    case "cameramode_off":

      isCamera = false
      showKeyhints(false)
      $('.photomodecontainer').fadeOut(0)
      closeGallery()
      $('.photoeditcontainer').hide()
      $('.savephotocontainer').hide()
      break;
  }
})


$(document).on('keydown', function(event){
  switch(event.keyCode) {
    case 27: // ESC
      if ($('.gallerycontainer').is(':visible')) {
        closeGallery()
        return
      }
      if(isCamera) {
        $('.photomodecontainer').fadeOut(0)
        $.post(`https://${GetParentResourceName()}/SetUpCameraMovement`, JSON.stringify({}));
        $.post(`https://${GetParentResourceName()}/close`, JSON.stringify({}));
        isCamera = false
        showKeyhints(false)
      }
      break;
  }
});


SetupCameraMode =  async function () {
  let push = await $.post(`https://${GetParentResourceName()}/getCamsData`);

  if (!push.Settings.CameraButton) {
      $('.nakedcamerabutton').hide(0)
  }


  const headerHTML =
    `<div class="brand">
        <div class="brand-icon"><i class="fa-solid fa-camera"></i></div>
        <div class="brand-title">${push.Settings.Cameramodeheader || 'Photo Mode'}</div>

     </div>
     <div class="headerbuttonscontainer">
        <div class="headerbutton" id="closecameramode" title="Close"><i class="fa-solid fa-xmark"></i></div>
     </div>`
  $('.photomodeheader').html(headerHTML)

  $('#closecameramode').click(function () {
      $('.photomodecontainer').fadeOut(0)
      isCamera = false
      showKeyhints(false)
      $.post(`https://${GetParentResourceName()}/SetUpCameraMovement`, JSON.stringify({}));
      $.post(`https://${GetParentResourceName()}/close`, JSON.stringify({}));
  });
  $('#closecameramode').mouseover(function () { GetCameraSounds(1); });

  Moving.MaxFilter = push.Settings.MaxFilterStrength
  CreateAllSliders(Moving);

 
  $('.photomodefiltersinnercontainer').empty();
  $.each(push.Settings.Filters, function(i){
      let FilterNumber = i+1
      var elem2 = '<div class="photomodefilterbutton" id="filter'+i+'">'
                +  '<div class="photomodefilterbuttondot" style="background-color: '+push.Settings.Filters[i].Color+';"></div>'
                +   FilterNumber+' '+push.Settings.Filters[i].Name
                +'</div>'
      $('.photomodefiltersinnercontainer').append(elem2)
      $('#filter'+i).mouseover(function () { GetCameraSounds(1); });

      if (i == 0) {
        $('#filter'+i).addClass('selected').css('border-color', 'var(--accent)').css('color', 'var(--text)')
      }
      $('#filter'+i).click(function () {
        $('.photomodefilterbutton').each(function(){
          $(this).removeClass('selected').css('border-color', 'var(--stroke)').css('color', 'var(--text-dim)')
        });
        $(this).addClass('selected').css('border-color', 'var(--accent)').css('color', 'var(--text)')
        var filter = push.Settings.Filters[i].Source
        $.post(`https://${GetParentResourceName()}/SetFilter`, JSON.stringify({filter}));
        GetCameraSounds(3);
      });
  });
}


ScreenShot = function (data) {
  var node = document.createElement('textarea');
  var selection = document.getSelection();
  node.textContent = data.url;
  document.body.appendChild(node);
  selection.removeAllRanges();
  node.select();
  document.execCommand('copy');
  selection.removeAllRanges();
  document.body.removeChild(node);

  LatestScreenshot = data.url
  $('.photoeditimage').html('<img src="'+data.url+'" alt="latest">');
  $('.photoeditcontainer').show();
}


CreateAllSliders = function () {
  $("#movementfive").slider({
      max: Moving.MaxFilter,
      min: 0.02,
      range: "min",
      step: 0.00001,
      value: 0.80,
      orientation: "horizontal",
      slide: function( event, ui ) {
          let Strength = ui.value
          if([1,2,3,4,5,6,7,8,9,10,11,12].includes(Strength)) {
              Strength = ui.value+'.0'
          }
          $.post(`https://${GetParentResourceName()}/SetFilterStrength`, JSON.stringify({Strength}));
      }
  });
  BlurType = false
  $('#camerablur').html('<i class="fa-solid fa-droplet"></i>')
  if (!AmTooLazyToFixThisInABetterWay) {
      AmTooLazyToFixThisInABetterWay = true
  } else {
      $.post(`https://${GetParentResourceName()}/SetUpCameraMovement`, JSON.stringify({}));
  }
}
DestroyAllSliders = function () { $("#movementfive").slider('destroy'); }


$('#camerablur').click(function () {
  if (!BlurType) {
      BlurType = true
      let blur = true
      $('#camerablur').removeClass('card').addClass('primary')
      $.post(`https://${GetParentResourceName()}/Blurcamera`, JSON.stringify({blur}));
  } else {
      BlurType = false
      let blur = false
      $('#camerablur').removeClass('primary').addClass('card')
      $.post(`https://${GetParentResourceName()}/Blurcamera`, JSON.stringify({blur}));
  }
  GetCameraSounds(3);
});

$('#resetcameramovement').click(function () {
  DestroyAllSliders();
  CreateAllSliders(Moving);
  GetCameraSounds(3);
});

$("#filtersearch").on("input", function() {
  var value = this.value.toLowerCase().trim();
  $(".photomodefilterbutton").show().filter(function() {
    return $(this).text().toLowerCase().trim().indexOf(value) == -1;
  }).hide();
  if (value.length <= 1) {
      $(".photomodefilterbutton").each(function(){ $(this).show() });
  }
});

$("#gallerysearch").on("input", function() {
  var value = this.value.toLowerCase().trim();
  $(".galleryphotocontainer").show().filter(function() {
    return $(this).text().toLowerCase().trim().indexOf(value) == -1;
  }).hide();
  if (value.length <= 1) {
      $(".galleryphotocontainer").each(function(){ $(this).show() });
  }
});

$('#takescreenshot').click(function () {
  GetCameraSounds(3)
  if (!WaitBeforeTakingAnotherPicture && $('.photoeditcontainer').css('display') == 'none') {
    WaitBeforeTakingAnotherPicture = true
    $.post(`https://${GetParentResourceName()}/TakeScreenShot`, JSON.stringify({}));
    setTimeout(() => {
      $('.flashingcontainer').fadeIn(0)
      GetCameraSounds(2)
      setTimeout(() => { $('.flashingcontainer').fadeOut(0) }, 400);
    }, 200);
    setTimeout(() => { WaitBeforeTakingAnotherPicture = false }, 2000);
  }
});


$('#gallery').click(function () {
  GalleryToggle = !GalleryToggle
  $(this).toggleClass('primary', GalleryToggle)
  $('.gallerycontainer').toggle(GalleryToggle);
  GetCameraSounds(3)
});
$('#closegallery').click(function () { closeGallery(); GetCameraSounds(3); });

$('.gallerycontainer').on('mousedown', function(e){
  if ($(e.target).closest('.gallerymodal').length === 0) {
    closeGallery()
  }
});

$('#closesaving').click(function () {
  $('.savephotocontainer').fadeOut(0)
  GetCameraSounds(3);
});

$('.savephotoconfirm').click(function () {
  $('.savephotocontainer').fadeOut(0)
  $('.photoeditcontainer').fadeOut(0)
  let Saving = {}
  Saving.id = Math.floor(Math.random() * 888888888)+Math.floor(Math.random() * 888888888)
  Saving.image = LatestScreenshot
  Saving.name = $('#newpicturename').val();
  $.post(`https://${GetParentResourceName()}/SavePicture`, JSON.stringify({Saving}));
  let elem = '<div class="galleryphotocontainer" id="Picture'+Saving.id+'">'
          +'<div class="galleryphotoheader">'+Saving.name+'</div>'
          +'<img src="'+Saving.image+'"></img>'
      +'</div>'
  $('.galleryrightcontainer').append(elem)
  $('#Picture'+Saving.id).click(function () {
      $('.galleryrightcontainer .galleryphotocontainer').removeClass('selected')
      $(this).addClass('selected')
      $('.galleryleftinnerimage').html('<img src="'+Saving.image+'"></img>')
      SelectedId = Saving.id
      SelectedPic = Saving.image
      GetCameraSounds(3);
  });
  $('#Picture'+Saving.id).mouseover(function () { GetCameraSounds(1); });
});
$('.savephotoconfirm').mouseover(function () { GetCameraSounds(1); });


$('#galleryCopy').on('click', function(){
  if (!SelectedPic || SelectedPic === 'Pick a picture first !') return
  const node = document.createElement('textarea');
  const selection = document.getSelection();
  node.textContent = SelectedPic;
  document.body.appendChild(node);
  selection.removeAllRanges();
  node.select();
  document.execCommand('copy');
  selection.removeAllRanges();
  document.body.removeChild(node);


  const $btn = $(this)
  const old = $btn.html()
  $btn.html('<i class="fa-solid fa-clipboard-check"></i><span>Copied</span>').css('pointer-events','none')
  setTimeout(()=>{ $btn.html(old).css('pointer-events','all') }, 1200)
  GetCameraSounds(3);
});


$('#galleryDelete').on('click', function () {
  if (!SelectedId) return;
  $.post(`https://${GetParentResourceName()}/DeletePicture`, JSON.stringify({ SelectedId }));
  const $item = $('#Picture' + SelectedId);
  $item.addClass('removing');
  $item.fadeOut(120, function () { $(this).remove(); });
  $('.galleryrightcontainer .galleryphotocontainer').removeClass('selected');
  $('.galleryleftinnerimage').empty();
  SelectedId = 0;
  SelectedPic = 'Pick a picture first !';
  GetCameraSounds(3);
});

function bindGalleryItem($el, id, image){
  $el.click(function () {
    $('.galleryrightcontainer .galleryphotocontainer').removeClass('selected')
    $(this).addClass('selected')
    $('.galleryleftinnerimage').html('<img src="'+image+'"></img>')
    SelectedId = id
    SelectedPic = image
    GetCameraSounds(3);
  });
  $el.mouseover(function () { GetCameraSounds(1); });
}
$(document).on('DOMNodeInserted', '.galleryrightcontainer', function(e){
  const $t = $(e.target)
  if ($t.hasClass('galleryphotocontainer') && $t.attr('id')?.startsWith('Picture')) {
    const id = parseInt($t.attr('id').replace('Picture',''))
    const img = $t.find('img').attr('src')
    bindGalleryItem($t, id, img)
  }
});


$('.editphotobutton').click(function () {
  let whichedit = $(this).text().trim();
  switch(whichedit) {
      case 'Cancel':
          $('.photoeditcontainer').hide();
          $('.photoeditimage').html('');
          break;
      case 'Copy':
          var node = document.createElement('textarea');
          var selection = document.getSelection();
          node.textContent = LatestScreenshot;
          document.body.appendChild(node);
          selection.removeAllRanges();
          node.select();
          document.execCommand('copy');
          selection.removeAllRanges();
          document.body.removeChild(node);
          $(this).html('<i class="fa-solid fa-clipboard-check"></i> Copied').css('pointer-events', 'none')
          setTimeout(() => {
              $(this).html('<i class="fa-solid fa-clipboard"></i> Copy').css('pointer-events', 'all')
          }, 1200);
          break;
      case 'Save':
          $('.savephotocontainer').fadeIn(0)
          break;
  }
  GetCameraSounds(3);
});

$(document).on('keydown', function(event){
  if ($('.photomodecontainer').css('display') == 'block') {
    switch(event.keyCode) {
      case 17: // control
        ControlPressed = true
        break;
      case 67: // C
        if (ControlPressed) {
          if (!WaitBeforeTakingAnotherPicture && $('.photoeditcontainer').css('display') == 'none') {
            WaitBeforeTakingAnotherPicture = true
            $.post(`https://${GetParentResourceName()}/TakeScreenShot`, JSON.stringify({}));
            setTimeout(() => {
                $('.flashingcontainer').fadeIn(0)
                GetCameraSounds(2)
                setTimeout(() => { $('.flashingcontainer').fadeOut(0) }, 400);
            }, 200);
            setTimeout(() => { WaitBeforeTakingAnotherPicture = false }, 2000);
          }
        }
        break;
      case 72: // H toggle free-cam
        if (isCamera) {
          $.post(`https://${GetParentResourceName()}/ToggleFreeCam`, JSON.stringify({}));
        }
        break;
    }
  }
});

$(document).on('keyup', function(event){
  if ($('.photomodecontainer').css('display') == 'block') {
    switch(event.keyCode) {
      case 17:
        ControlPressed = false
        break;
    }
  }
});

GetCameraSounds = function (data) {
  if ( data == 1 ) {
      var mousehover = document.getElementById("mousehover");
      mousehover.currentTime = 0; mousehover.play(); mousehover.volume = 0.282;
  } else if ( data == 2 ) {
      var screenshot = document.getElementById("screenshot");
      screenshot.currentTime = 0; screenshot.play(); screenshot.volume = 0.482;
  }
}


$(document).mousemove(function (data) {
  LeftPos = data.clientX
  TopPos = data.clientY
  var howloooong = $('.tooltipcontainer').width();
  var howtaaaall = $('.tooltipcontainer').height()/2
  if (data.clientX < 1560) {
      whichway = false
      $('.tooltipcontainer').css('left', (data.clientX+26)+'px').css('top', (data.clientY-howtaaaall)+'px')
  } else if (data.clientX >= 1560) {
      $('.tooltipcontainer').css('left', (data.clientX-howloooong-46)+'px').css('top', (data.clientY-howtaaaall)+'px')
  }
});

setTimeout(() => { SetupCameraMode() }, 22);
