// Локальна HTML-сторінка з YouTube IFrame API у прихованому (або видимому,
// коли відкритий попап) WebView. Керування — postMessage в обидва боки,
// той самий підхід, що й window.YT.Player у вебі.
export const PLAYER_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
  html, body { margin:0; padding:0; background:#000; width:100%; height:100%; overflow:hidden; }
  #player-container { width:100%; height:100%; }
  #yt { width:100%; height:100%; }
</style>
</head>
<body>
<div id="player-container"><div id="yt"></div></div>
<script>
  var player = null;
  var ready = false;
  var pendingCmd = null;
  var ticker = null;

  function post(msg) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(msg));
  }

  function startTicker() {
    stopTicker();
    ticker = setInterval(function () {
      if (!player || !ready) return;
      try {
        var cur = player.getCurrentTime();
        var dur = player.getDuration();
        post({ type: 'time', current: cur, duration: dur });
      } catch (e) {}
    }, 500);
  }
  function stopTicker() { if (ticker) { clearInterval(ticker); ticker = null; } }

  function onPlayerReady() {
    ready = true;
    post({ type: 'ready' });
    if (pendingCmd) { handleCommand(pendingCmd); pendingCmd = null; }
  }

  function onPlayerStateChange(e) {
    var S = window.YT.PlayerState;
    if (e.data === S.PLAYING) { post({ type: 'state', state: 'playing' }); startTicker(); }
    else if (e.data === S.PAUSED) { post({ type: 'state', state: 'paused' }); stopTicker(); }
    else if (e.data === S.ENDED) { post({ type: 'state', state: 'ended' }); stopTicker(); }
    else if (e.data === S.BUFFERING) { post({ type: 'state', state: 'buffering' }); }
  }

  function onPlayerError(e) {
    post({ type: 'error', code: e && e.data });
  }

  function createPlayer(videoId, autoplay) {
    player = new window.YT.Player('yt', {
      width: '100%',
      height: '100%',
      videoId: videoId,
      playerVars: {
        autoplay: autoplay ? 1 : 0,
        controls: 1,
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
        iv_load_policy: 3
      },
      events: {
        onReady: onPlayerReady,
        onStateChange: onPlayerStateChange,
        onError: onPlayerError
      }
    });
  }

  function handleCommand(cmd) {
    if (!cmd) return;
    if (cmd.cmd === 'load') {
      if (!window.YT || !window.YT.Player) { pendingCmd = cmd; return; }
      if (!player) { createPlayer(cmd.videoId, cmd.autoplay !== false); return; }
      if (!ready) { pendingCmd = cmd; return; }
      player.loadVideoById(cmd.videoId);
      if (cmd.autoplay === false) { setTimeout(function () { try { player.pauseVideo(); } catch (e) {} }, 250); }
      return;
    }
    if (!player || !ready) { pendingCmd = cmd; return; }
    try {
      if (cmd.cmd === 'play') player.playVideo();
      else if (cmd.cmd === 'pause') player.pauseVideo();
      else if (cmd.cmd === 'stop') player.stopVideo();
      else if (cmd.cmd === 'seekTo') player.seekTo(cmd.seconds, true);
      else if (cmd.cmd === 'setVolume') player.setVolume(cmd.volume);
    } catch (e) {}
  }

  function onMessage(event) {
    var data;
    try { data = JSON.parse(event.data); } catch (e) { return; }
    handleCommand(data);
  }
  document.addEventListener('message', onMessage);
  window.addEventListener('message', onMessage);

  window.onYouTubeIframeAPIReady = function () {
    if (pendingCmd && pendingCmd.cmd === 'load') { createPlayer(pendingCmd.videoId, pendingCmd.autoplay !== false); pendingCmd = null; }
  };

  var tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);
</script>
</body>
</html>`;
