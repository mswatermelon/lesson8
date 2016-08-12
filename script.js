Handlebars.registerHelper('formatTime', function(time) {
  let minutes = parseInt(time / 60);
  let seconds = time - minutes * 60;

  minutes = minutes < 10 ? '0' + minutes : minutes;
  seconds = seconds < 10 ? '0' + seconds : seconds;

  return minutes + ':' + seconds;
});

let globalPlayer = document.createElement('audio');
let playingItem;

console.dir(globalPlayer)

new Promise(function(resolve) {
  if (document.readyState === 'complete') {
    resolve();
  } else {
    window.onload = resolve;
  }
}).then(function() {
  return new Promise(function(resolve, reject) {
    VK.init({
      apiId: 5267932
    });

    VK.Auth.login(function(response) {
      if (response.session) {
        resolve(response);
      } else {
        reject(new Error('Не удалось авторизоваться'));
      }
    }, 8);
  });
}).then(function() {
  return new Promise(function(resolve, reject) {
    VK.api('users.get', {'name_case': 'gen'}, function(response) {
      if (response.error) {
        reject(new Error(response.error.error_msg));
      } else {
        headerInfo.textContent = `Музыка на странице ${response.response[0].first_name} ${response.response[0].last_name}`;

        resolve();
      }
    });
  })
}).then(function() {
  function onProgress(e) {
    let progressBar = playingItem.querySelector('[data-role=progressbar]');
    let duration = e.target.duration;
    let currentTime = e.target.currentTime;
    let progress = parseInt(100 / duration * currentTime);

    progressBar.style.width = progress + '%';
  }

  function onPlay() {
    playingItem.querySelector('[data-role=playback]').className = 'glyphicon glyphicon-pause';
    mainPlaybackButton.querySelector('[data-role=playback]').className = 'glyphicon glyphicon-pause';
  }

  function onPause() {
    playingItem.querySelector('[data-role=playback]').className = 'glyphicon glyphicon-play';
    mainPlaybackButton.querySelector('[data-role=playback]').className = 'glyphicon glyphicon-play';
  }

  function toSong(to) {
    if (playingItem) {
      let nextPlayer = to === 'next' ? playingItem.nextElementSibling : playingItem.previousElementSibling;

      if (nextPlayer) {
        nextPlayer.querySelector('[data-role=playback]').dispatchEvent(new CustomEvent('click'));
      }
    }
  }

  function onEnd() {
    toSong('next');
  }

  // Функция для перехода к тому времени, которое соответствует прогрессбару
  function toTime() {
    let progressBar = playingItem.querySelector('[data-role=progressbar]'),
        duration = globalPlayer.duration,
        progress = parseInt(progressBar.style.width.replace('%',''));

    globalPlayer.currentTime = parseFloat(progress * duration / 100);
  }

  prevSongButton.addEventListener('click', function() {
    toSong('prev')
  });

  mainPlaybackButton.addEventListener('click', function() {
    if (playingItem) {
      playingItem.querySelector('[data-role=playback]').dispatchEvent(new CustomEvent('click'));
    } else if (audioList) {
      let firstItem = audioList.querySelector('li');

      if (firstItem) {
        firstItem.querySelector('[data-role=playback]').dispatchEvent(new CustomEvent('click'));
      }
    }
  });

  nextSongButton.addEventListener('click', function() {
    toSong('next');
  });

  document.addEventListener('keydown', function(e) {
    console.log(e)
    if (e.target.tagName !== 'INPUT') {
      switch (e.keyCode) {
        case 32: {
          e.preventDefault();
          mainPlaybackButton.dispatchEvent(new CustomEvent('click'));

          break;
        }
        case 37: {
          e.preventDefault();
          prevSongButton.dispatchEvent(new CustomEvent('click'));

          break;
        }
        case 39: {
          e.preventDefault();
          nextSongButton.dispatchEvent(new CustomEvent('click'));

          break;
        }
      }
    }
  }, true);

  globalPlayer.addEventListener('play', onPlay);
  globalPlayer.addEventListener('pause', onPause);
  globalPlayer.addEventListener('timeupdate', onProgress);
  globalPlayer.addEventListener('ended', onEnd);

  results.addEventListener('click', function(e) {
    if (e.target.getAttribute('data-role') === 'playback') {
      var currentItem = e.target.parentNode.parentNode.parentNode;

      if (currentItem === playingItem) {
        // Перейти к указанной мышкой позиции
        toTime();
        if (globalPlayer.paused) {
          globalPlayer.play();
        } else {
          globalPlayer.pause();
        }
      } else {
        if (!globalPlayer.paused) {
          onPause();
        }

        playingItem = currentItem;

        globalPlayer.src = e.target.getAttribute('data-src');
        // Когда загрузится аудиозапись и мы будем знать длительность -
        // перейти к нужному времени
        globalPlayer.addEventListener('loadeddata', () => {
            toTime();
            globalPlayer.play();
        }, false);
      }
    }
    else if(e.target.getAttribute('class') === 'progress' ||
        e.target.getAttribute('data-role') === 'progressbar'){
      // При нажатии на прогрессбар
      let elem = e.target,
          left=0,
          progress,
          x;

      //Узнать какое расстояние от него до левого края окна браузера
      while(elem) {
        left = left + parseFloat(elem.offsetLeft);
        elem = elem.offsetParent
      }

      // Вычислить расстояние от начала прогрессбара до точки нажатия мыши по X
      x = e.pageX - left;

      // Вычислить какой процент занимает расстояние, рассчитанное выше
      // от ширины прогрессбара
      if (e.target.firstElementChild) {
        progress = parseInt(100 / e.target.offsetWidth * (x));
        e.target.firstElementChild.style.width = progress + '%';
      }
      else{
        progress = parseInt(100 / e.target.parentElement.offsetWidth * (x));
        e.target.style.width = progress + '%';
      }

      // Имитировать событие нажатия на кнопку плей, расположенной у названия аудио
      e.target.closest('.list-group-item').querySelector('[data-role=playback]')
          .dispatchEvent(new CustomEvent('click'));
    }
  }, true);

  return new Promise(function(resolve, reject) {
    VK.api('audio.get', {}, function(response) {
      if (response.error) {
        reject(new Error(response.error.error_msg));
      } else {
        let source = document.getElementById('playerItemTemplate').innerHTML;
        let templateFn = Handlebars.compile(source);
        let template = templateFn({list: response.response});

        results.innerHTML = template;

        resolve();
      }
    });
  });
}).catch(function(e) {
  alert(`Ошибка: ${e.message}`);
});

