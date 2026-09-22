// ================================================================
// DATA
// ================================================================
// ================================================================
// I18N (українська / англійська)
// ================================================================
const I18N = {
  uk: {
    'nav.home': 'Головна',
    'nav.request': 'Надіслати запит',
    'nav.admin': 'Адмін — Запити',
    'nav.add': 'Додати пісню',
    'nav.adminHub': 'Адмін-панель',
    'adminHub.heading.pre': 'Адмін',
    'adminHub.heading.accent': 'панель',
    'adminHub.requestsTab': 'Запити',
    'adminHub.addTab': 'Додати пісню',
    'nav.desktopApp': 'Застосунок для ПК',
    'nav.menu': 'Меню',
    'nav.top': 'Топ 100',
    'top.heading.pre': 'Топ 100',
    'top.heading.accent': 'найпрослуханіших',
    'top.empty': 'Ще немає прослуховувань',
    'theme.toggle': 'Змінити тему',
    'theme.dark': 'Темна',
    'theme.gray': 'Сіра',
    'theme.light': 'Світла',
    'stat.songs': 'Композицій',
    'stat.genres': 'Жанрів',
    'stat.albums': 'Альбомів',
    'stat.singles': 'Сінглів',
    'home.heading.pre': 'Опубліковані',
    'home.heading.accent': 'пісні',
    'home.addRequestBtn': '+ Надіслати запит',
    'search.placeholder': 'Пошук за назвою, виконавцем або альбомом…',
    'filter.allGenres': 'Усі жанри',
    'table.shuffle': 'Перемішати',
    'nav.wheel': 'Колесо фортуни',
    'wheel.spinBtn': 'Крутити',
    'wheel.playBtn': 'Слухати',
    'wheel.resultLabel': 'Випав жанр:',
    'wheel.legendTitle': 'Жанри на колесі',
    'wheel.countLabel': 'Кількість жанрів на колесі:',
    'wheel.durationLabel': 'Тривалість прокрутки, сек:',
    'wheel.durationTo': '—',
    'wheel.playlistEmpty': 'Крутніть колесо, щоб сформувати плейлист із випадкового жанру',
    'battle.openBtn': 'Батл рояль',
    'battle.setupTitle': 'Батл рояль',
    'battle.chooseSize': 'Оберіть розмір турніру:',
    'battle.notEnough': 'Замало пісень у плейлисті — потрібно щонайменше 16.',
    'battle.roundLabel': 'Учасників: ',
    'battle.vs': 'VS',
    'battle.chooseBtn': 'Обрати цю',
    'battle.hoverModeBtn': 'Режим наведення',
    'battle.hoverModeHint': 'Наведіть курсор на відео, щоб грало — заберіть курсор, щоб пауза',
    'nav.battle': 'Батл рояль',
    'nav.artists': 'Виконавці',
    'nav.friends': 'Друзі',
    'notif.bellTitle': 'Сповіщення',
    'notif.loading': 'Завантаження…',
    'notif.empty': 'Поки немає сповіщень',
    'notif.markAllRead': 'Позначити все прочитаним',
    'notif.markOneRead': 'Позначити прочитаним',
    'notif.event.songAdded': 'додано нову пісню',
    'notif.event.songRemoved': 'видалено пісню',
    'notif.event.lyricsAdded': 'додано текст пісні',
    'artists.heading.pre': 'Всі',
    'artists.heading.accent': 'виконавці',
    'artists.searchPlaceholder': 'Пошук виконавця…',
    'artists.empty': 'Нічого не знайдено',
    'artists.songsWord': 'пісень',
    'artist.followBtn': '+ Підписатись',
    'artist.unfollowBtn': 'Підписано',
    'artist.followers': 'підписників',
    'artist.discography': 'Дискографія',
    'artist.notFound': 'Виконавця не знайдено',
    'friends.heading.pre': 'Мої',
    'friends.heading.accent': 'друзі',
    'friends.searchPlaceholder': 'Пошук людей за іменем…',
    'friends.searchEmpty': 'Нікого не знайдено',
    'friends.incoming': 'Вхідні запити',
    'friends.incomingRequestLabel': 'хоче додати вас у друзі',
    'friends.outgoing': 'Надіслані запити',
    'friends.myFriends': 'Мої друзі',
    'friends.incomingEmpty': 'Немає вхідних запитів',
    'friends.outgoingEmpty': 'Немає надісланих запитів',
    'friends.friendsEmpty': 'Ще немає друзів — знайдіть когось через пошук вище',
    'friends.addBtn': '+ Додати в друзі',
    'friends.pendingLabel': 'Запит надіслано',
    'friends.cancelBtn': 'Скасувати',
    'friends.acceptBtn': 'Прийняти',
    'friends.rejectBtn': 'Відхилити',
    'friends.unfriendBtn': 'Розфрендити',
    'friends.friendsBadge': 'Друзі',
    'profile.public.back': 'До друзів',
    'profile.public.notFound': 'Користувача не знайдено',
    'profile.public.memberSince': 'На сайті з',
    'profile.public.publicPlaylistsCount': 'Публічних плейлистів',
    'profile.public.playlistsTitle': 'Публічні плейлисти',
    'profile.public.playlistsEmpty': 'Немає публічних плейлистів',
    'battle.heading.pre': 'Батл',
    'battle.heading.accent': 'рояль',
    'battle.pageOwnHeading': 'Мої плейлисти',
    'battle.pageOwnLoginHint': 'Увійдіть, щоб побачити тут свої плейлисти',
    'battle.pageOwnEmpty': 'У вас ще немає плейлистів — створіть їх у профілі',
    'battle.pagePublicHeading': 'Плейлисти спільноти',
    'battle.pagePublicEmpty': 'Ще немає публічних плейлистів — зробіть свій публічним у профілі',
    'battle.publicBadge': 'публічний',
    'battle.privateBadge': 'приватний',
    'battle.togglePublicHint': "Клік перемикає приватний/публічний — публічний бачать інші на сторінці \"Батл рояль\"",
    'battle.championLabel': 'Переможець',
    'battle.videoNotFound': 'Відео не знайдено',
    'graph.openHint': 'Показати граф схожості',
    'graph.loading': 'Обчислюємо розташування…',
    'graph.hint': 'Чим ближче — тим більше схожі. Клік по вузлу — відтворити/перейти. Коліщатко/перетягування — масштаб і зсув.',
    'graph.titleSongs': 'Схожість композицій',
    'graph.titleGenres': 'Схожість жанрів',
    'graph.titleAlbums': 'Схожість альбомів',
    'graph.titleSingles': 'Схожість синглів',
    'table.number': '№',
    'table.artist': 'Виконавець',
    'table.title': 'Назва',
    'table.release': 'Дата релізу',
    'table.duration': 'Тривалість',
    'table.genres': 'Жанри',
    'table.album': 'Альбом',
    'table.plays': 'Прослух.',
    'table.action': 'Дія',
    'table.empty': 'Нічого не знайдено',
    'table.single': 'Сінгл',
    'request.heading.pre': 'Запит на',
    'request.heading.accent': 'додавання пісні',
    'request.successAlert': 'Запит успішно надіслано! Очікуйте підтвердження адміністратора.',
    'request.submitBtn': 'Надіслати запит',
    'extsearch.title': 'Схожі пісні (натисніть, щоб заповнити форму)',
    'extsearch.analyzingGenres': 'Аналізуємо жанри…',
    'form.artist': 'Виконавець *',
    'form.artist.placeholder': "Ім'я артиста",
    'form.title': 'Назва пісні *',
    'form.title.placeholder': 'Назва композиції',
    'form.release': 'Дата релізу *',
    'form.duration': 'Тривалість *',
    'form.duration.hint': 'Додатково: 31 (сек), 211 = 3:31 (хв:сек)',
    'form.album': "Альбом (необов'язково)",
    'form.album.placeholder': 'Назва альбому або залиште порожнім для сінглу',
    'form.genres': 'Жанри *',
    'form.genres.placeholder': 'Рок, Поп, Джаз',
    'form.genres.hint': 'Через кому',
    'admin.heading.pre': 'Запити',
    'admin.heading.accent': 'користувачів',
    'admin.empty': 'Немає нових запитів',
    'admin.approveBtn': 'Підтвердити',
    'admin.rejectBtn': 'Відмовити',
    'admin.editBtn': 'Редагувати',
    'admin.editTitle': 'Редагувати заявку',
    'admin.saveBtn': 'Зберегти',
    'msg.errorEditRequest': 'Помилка при збереженні змін',
    'admin.editSongTitle': 'Редагувати пісню',
    'admin.youtubeVideo': "YouTube-відео (необов'язково)",
    'admin.youtubeVideo.placeholder': 'ID або посилання на відео, або залиште порожнім',
    'admin.youtubeVideo.hint': 'Автоматично підібране й закешоване відео можна замінити чи очистити тут, якщо воно виявилось не тим',
    'admin.youtubeVideo.view': 'Переглянути на YouTube',
    'admin.lyrics': "Текст пісні (необов'язково)",
    'admin.lyrics.placeholder': 'Вставте текст пісні рядок за рядком, або залиште порожнім',
    'admin.normalizeGenresBtn': "Об'єднати дублікати жанрів",
    'admin.normalizeGenresRunning': 'Перевірка триває…',
    'admin.normalizeGenresNone': 'Дублікатів не знайдено — усі жанри унікальні.',
    'admin.normalizeGenresError': "Не вдалося звернутись до ШІ (перевірте ключ Gemini):",
    'admin.normalizeGenresDone': "Об'єднано груп: {count}",
    'msg.errorNormalizeGenres': "Помилка при об'єднанні жанрів",
    'msg.errorEditSong': 'Помилка при збереженні пісні',
    'add.heading.pre': 'Додати',
    'add.heading.accent': 'нову композицію',
    'add.successAlert': 'Композицію успішно додано до бази даних!',
    'add.submitBtn': 'Додати до бази',
    'page.title': "N'Owl",
    'player.shuffle': 'Перемішати',
    'player.prev': 'Попередня',
    'player.next': 'Наступна',
    'player.repeat': 'Повтор',
    'player.video': 'Відкрити відео',
    'player.karaoke': 'Текст',
    'player.karaokeEmpty': 'Для цієї пісні ще немає тексту',
    'player.editSong': 'Редагувати пісню',
    'player.close': 'Закрити',
    'videoPopup.title': 'Відео',
    'videoPopup.loading': 'Завантаження…',
    'videoPopup.expand': 'Розгорнути',
    'videoPopup.fullscreen': 'На весь екран',
    'videoPopup.popout': 'Перенести в окреме вікно',
    'video.notFoundSuffix': ' — відео не знайдено',
    'modal.deleteTitle': 'Видалити пісню?',
    'modal.deleteBodyTemplate': 'Композицію «{label}» буде видалено з бази без можливості відновлення.',
    'modal.deleteDefaultLabel': 'цю пісню',
    'modal.cancel': 'Скасувати',
    'modal.confirmDelete': 'Видалити',
    'auth.logout': 'Вийти',
    'auth.loginBtn': 'Увійти через Google',
    'msg.confirmLoginForRequest': 'Щоб надіслати запит, потрібно увійти через Google. Перейти до входу?',
    'msg.confirmLoginGeneric': 'Щоб продовжити, потрібно увійти через Google. Перейти до входу?',
    'nav.recommendations': 'Рекомендовано для вас',
    'nav.profile': 'Профіль',
    'nav.profileSettings': 'Налаштування',
    'profileSettings.heading.pre': 'Налаштування',
    'profileSettings.heading.accent': 'профілю',
    'profile.heading.pre': 'Мій',
    'profile.heading.accent': 'профіль',
    'profile.displayName': 'Нікнейм',
    'profile.avatar': 'Зображення профілю',
    'profile.avatarHint': 'Оберіть зображення з пристрою',
    'profile.avatarRemove': 'прибрати й повернути фото з Google',
    'profile.displayName.placeholder': 'Наприклад, MusicLover',
    'profile.saveBtn': 'Зберегти',
    'profile.totalListened': 'Прослухано',
    'profile.favoritesCount': 'Улюблених',
    'profile.playlistsCount': 'Плейлистів',
    'profile.topGenres': 'Улюблені жанри',
    'profile.favoritesTitle': 'Улюблені пісні',
    'profile.favoritesEmpty': 'Ще немає улюблених пісень',
    'profile.playlistsTitle': 'Мої плейлисти',
    'profile.newPlaylistBtn': '+ Новий плейлист',
    'profile.playlistsEmpty': 'Ще немає плейлистів',
    'profile.backToProfile': 'До профілю',
    'profile.playlistEmpty': 'У цьому плейлисті ще немає пісень',
    'profile.playBtn': 'Відтворити',
    'profile.playAllBtn': 'Слухати весь плейлист',
    'profile.favToggle': 'Улюблене',
    'player.addToPlaylist': 'Додати в плейлист',
    'profile.songsWord': 'пісень',
    'profile.newPlaylistPrompt': 'Назва нового плейлиста:',
    'profile.newPlaylistPublicConfirm': "Зробити плейлист публічним? Інші користувачі зможуть побачити й використати його на сторінці \"Батл рояль\" (не в іншому місці сайту). Скасувати — плейлист лишиться приватним, як завжди.",
    'profile.addToPlaylist': 'Додати в плейлист',
    'profile.addToPlaylistTitle': 'Додати в плейлист',
    'profile.newPlaylistPlaceholder': 'Назва нового плейлиста',
    'profile.createAndAddBtn': 'Створити й додати',
    'rec.heading.pre': 'Рекомендовано',
    'rec.heading.accent': 'для вас',
    'rec.loading': 'Підбираємо рекомендації…',
    'rec.empty': 'Послухайте кілька пісень, щоб отримати персональні рекомендації',
    'msg.needLoginForRequest': 'Для надсилання запиту потрібно увійти через Google.',
    'msg.fillRequiredFields': "Будь ласка, заповніть усі обов'язкові поля (*)",
    'msg.needLoginGeneric': 'Потрібно увійти через Google',
    'msg.errorSubmittingRequest': 'Помилка при надсиланні запиту',
    'msg.connectionError': "Помилка з'єднання з сервером",
    'msg.errorApprove': 'Помилка при підтвердженні',
    'msg.approveMerged': 'Така пісня вже є в базі — нові жанри додано до наявного запису.',
    'msg.needLoginAdmin': 'Потрібно увійти як адмін',
    'msg.errorDelete': 'Помилка видалення',
    'msg.errorReject': 'Помилка відхилення',
    'msg.needAdminRights': 'Потрібні права адміна',
    'msg.errorAddSong': 'Помилка додавання пісні'
  },
  en: {
    'nav.home': 'Home',
    'nav.request': 'Submit request',
    'nav.admin': 'Admin — Requests',
    'nav.add': 'Add song',
    'nav.adminHub': 'Admin panel',
    'adminHub.heading.pre': 'Admin',
    'adminHub.heading.accent': 'panel',
    'adminHub.requestsTab': 'Requests',
    'adminHub.addTab': 'Add song',
    'nav.desktopApp': 'Desktop app',
    'nav.menu': 'Menu',
    'nav.top': 'Top 100',
    'top.heading.pre': 'Top 100',
    'top.heading.accent': 'most played',
    'top.empty': 'No listens yet',
    'theme.toggle': 'Switch theme',
    'theme.dark': 'Dark',
    'theme.gray': 'Gray',
    'theme.light': 'Light',
    'stat.songs': 'Songs',
    'stat.genres': 'Genres',
    'stat.albums': 'Albums',
    'stat.singles': 'Singles',
    'home.heading.pre': 'Published',
    'home.heading.accent': 'songs',
    'home.addRequestBtn': '+ Submit request',
    'search.placeholder': 'Search by title, artist, or album…',
    'filter.allGenres': 'All genres',
    'table.shuffle': 'Shuffle',
    'nav.wheel': 'Wheel of fortune',
    'wheel.spinBtn': 'Spin',
    'wheel.playBtn': 'Play',
    'wheel.resultLabel': 'You got:',
    'wheel.legendTitle': 'Genres on the wheel',
    'wheel.countLabel': 'Genres on the wheel:',
    'wheel.durationLabel': 'Spin duration, sec:',
    'wheel.durationTo': '—',
    'wheel.playlistEmpty': 'Spin the wheel to build a playlist from a random genre',
    'battle.openBtn': 'Battle royale',
    'battle.setupTitle': 'Battle royale',
    'battle.chooseSize': 'Choose tournament size:',
    'battle.notEnough': 'Not enough songs in this playlist — need at least 16.',
    'battle.roundLabel': 'Contestants: ',
    'battle.vs': 'VS',
    'battle.chooseBtn': 'Pick this one',
    'battle.hoverModeBtn': 'Hover to play',
    'battle.hoverModeHint': 'Hover the video to play it — move the cursor away to pause',
    'nav.battle': 'Battle royale',
    'nav.artists': 'Artists',
    'nav.friends': 'Friends',
    'notif.bellTitle': 'Notifications',
    'notif.loading': 'Loading…',
    'notif.empty': 'No notifications yet',
    'notif.markAllRead': 'Mark all as read',
    'notif.markOneRead': 'Mark as read',
    'notif.event.songAdded': 'added a new song',
    'notif.event.songRemoved': 'removed a song',
    'notif.event.lyricsAdded': 'added lyrics for a song',
    'artists.heading.pre': 'All',
    'artists.heading.accent': 'artists',
    'artists.searchPlaceholder': 'Search for an artist…',
    'artists.empty': 'Nothing found',
    'artists.songsWord': 'songs',
    'artist.followBtn': '+ Follow',
    'artist.unfollowBtn': 'Following',
    'artist.followers': 'followers',
    'artist.discography': 'Discography',
    'artist.notFound': 'Artist not found',
    'friends.heading.pre': 'My',
    'friends.heading.accent': 'friends',
    'friends.searchPlaceholder': 'Search people by name…',
    'friends.searchEmpty': 'No one found',
    'friends.incoming': 'Incoming requests',
    'friends.incomingRequestLabel': 'wants to add you as a friend',
    'friends.outgoing': 'Sent requests',
    'friends.myFriends': 'My friends',
    'friends.incomingEmpty': 'No incoming requests',
    'friends.outgoingEmpty': 'No sent requests',
    'friends.friendsEmpty': "No friends yet — find someone using the search above",
    'friends.addBtn': '+ Add friend',
    'friends.pendingLabel': 'Request sent',
    'friends.cancelBtn': 'Cancel',
    'friends.acceptBtn': 'Accept',
    'friends.rejectBtn': 'Reject',
    'friends.unfriendBtn': 'Unfriend',
    'friends.friendsBadge': 'Friends',
    'profile.public.back': 'Back to friends',
    'profile.public.notFound': 'User not found',
    'profile.public.memberSince': 'Member since',
    'profile.public.publicPlaylistsCount': 'Public playlists',
    'profile.public.playlistsTitle': 'Public playlists',
    'profile.public.playlistsEmpty': 'No public playlists',
    'battle.heading.pre': 'Battle',
    'battle.heading.accent': 'royale',
    'battle.pageOwnHeading': 'My playlists',
    'battle.pageOwnLoginHint': 'Log in to see your own playlists here',
    'battle.pageOwnEmpty': "You don't have any playlists yet — create one in your profile",
    'battle.pagePublicHeading': 'Community playlists',
    'battle.pagePublicEmpty': 'No public playlists yet — make one of yours public in your profile',
    'battle.publicBadge': 'public',
    'battle.privateBadge': 'private',
    'battle.togglePublicHint': 'Click to toggle private/public — public playlists are visible to others on the "Battle royale" page',
    'battle.championLabel': 'Champion',
    'battle.videoNotFound': 'Video not found',
    'graph.openHint': 'Show similarity graph',
    'graph.loading': 'Computing layout…',
    'graph.hint': 'Closer = more similar. Click a node to play/open it. Scroll/drag to zoom and pan.',
    'graph.titleSongs': 'Song similarity',
    'graph.titleGenres': 'Genre similarity',
    'graph.titleAlbums': 'Album similarity',
    'graph.titleSingles': 'Single similarity',
    'table.number': '#',
    'table.artist': 'Artist',
    'table.title': 'Title',
    'table.release': 'Release date',
    'table.duration': 'Duration',
    'table.genres': 'Genres',
    'table.album': 'Album',
    'table.plays': 'Plays',
    'table.action': 'Action',
    'table.empty': 'Nothing found',
    'table.single': 'Single',
    'request.heading.pre': 'Request to',
    'request.heading.accent': 'add a song',
    'request.successAlert': 'Request sent successfully! Wait for admin approval.',
    'request.submitBtn': 'Submit request',
    'extsearch.title': 'Similar songs (click to fill the form)',
    'extsearch.analyzingGenres': 'Analyzing genres…',
    'form.artist': 'Artist *',
    'form.artist.placeholder': 'Artist name',
    'form.title': 'Song title *',
    'form.title.placeholder': 'Song title',
    'form.release': 'Release date *',
    'form.duration': 'Duration *',
    'form.duration.hint': 'Additionally: 31 (sec), 211 = 3:31 (min:sec)',
    'form.album': 'Album (optional)',
    'form.album.placeholder': 'Album name, or leave empty for a single',
    'form.genres': 'Genres *',
    'form.genres.placeholder': 'Rock, Pop, Jazz',
    'form.genres.hint': 'Comma-separated',
    'admin.heading.pre': 'Requests',
    'admin.heading.accent': 'from users',
    'admin.empty': 'No new requests',
    'admin.approveBtn': 'Approve',
    'admin.rejectBtn': 'Reject',
    'admin.editBtn': 'Edit',
    'admin.editTitle': 'Edit request',
    'admin.saveBtn': 'Save',
    'msg.errorEditRequest': 'Error saving changes',
    'admin.editSongTitle': 'Edit song',
    'admin.youtubeVideo': 'YouTube video (optional)',
    'admin.youtubeVideo.placeholder': 'Video ID or link, or leave empty',
    'admin.youtubeVideo.hint': "The auto-picked, cached video can be replaced or cleared here if it turned out to be the wrong one",
    'admin.youtubeVideo.view': 'View on YouTube',
    'admin.lyrics': 'Song lyrics (optional)',
    'admin.lyrics.placeholder': 'Paste the lyrics line by line, or leave empty',
    'admin.normalizeGenresBtn': 'Merge duplicate genres',
    'admin.normalizeGenresRunning': 'Checking…',
    'admin.normalizeGenresNone': 'No duplicates found — all genres are unique.',
    'admin.normalizeGenresError': 'Could not reach the AI (check your Gemini key):',
    'admin.normalizeGenresDone': 'Groups merged: {count}',
    'msg.errorNormalizeGenres': 'Error merging genres',
    'msg.errorEditSong': 'Error saving song',
    'add.heading.pre': 'Add a',
    'add.heading.accent': 'new song',
    'add.successAlert': 'Song successfully added to the database!',
    'add.submitBtn': 'Add to database',
    'page.title': "N'Owl",
    'player.shuffle': 'Shuffle',
    'player.prev': 'Previous',
    'player.next': 'Next',
    'player.repeat': 'Repeat',
    'player.video': 'Open video',
    'player.karaoke': 'Lyrics',
    'player.karaokeEmpty': 'No lyrics for this song yet',
    'player.editSong': 'Edit song',
    'player.close': 'Close',
    'videoPopup.title': 'Video',
    'videoPopup.loading': 'Loading…',
    'videoPopup.expand': 'Expand',
    'videoPopup.fullscreen': 'Fullscreen',
    'videoPopup.popout': 'Move to separate window',
    'video.notFoundSuffix': ' — video not found',
    'modal.deleteTitle': 'Delete song?',
    'modal.deleteBodyTemplate': 'The song "{label}" will be permanently deleted from the database.',
    'modal.deleteDefaultLabel': 'this song',
    'modal.cancel': 'Cancel',
    'modal.confirmDelete': 'Delete',
    'auth.logout': 'Log out',
    'auth.loginBtn': 'Sign in with Google',
    'msg.confirmLoginForRequest': 'You need to sign in with Google to submit a request. Go to login?',
    'msg.confirmLoginGeneric': 'You need to sign in with Google to continue. Go to login?',
    'nav.recommendations': 'Recommended for you',
    'nav.profile': 'Profile',
    'nav.profileSettings': 'Settings',
    'profileSettings.heading.pre': 'Profile',
    'profileSettings.heading.accent': 'settings',
    'profile.heading.pre': 'My',
    'profile.heading.accent': 'profile',
    'profile.displayName': 'Nickname',
    'profile.avatar': 'Profile image',
    'profile.avatarHint': 'Choose an image from your device',
    'profile.avatarRemove': 'remove and restore Google photo',
    'profile.displayName.placeholder': 'e.g. MusicLover',
    'profile.saveBtn': 'Save',
    'profile.totalListened': 'Listened',
    'profile.favoritesCount': 'Favorites',
    'profile.playlistsCount': 'Playlists',
    'profile.topGenres': 'Favorite genres',
    'profile.favoritesTitle': 'Favorite songs',
    'profile.favoritesEmpty': 'No favorite songs yet',
    'profile.playlistsTitle': 'My playlists',
    'profile.newPlaylistBtn': '+ New playlist',
    'profile.playlistsEmpty': 'No playlists yet',
    'profile.backToProfile': 'Back to profile',
    'profile.playlistEmpty': 'This playlist has no songs yet',
    'profile.playBtn': 'Play',
    'profile.playAllBtn': 'Play playlist',
    'profile.favToggle': 'Favorite',
    'player.addToPlaylist': 'Add to playlist',
    'profile.songsWord': 'songs',
    'profile.newPlaylistPrompt': 'New playlist name:',
    'profile.newPlaylistPublicConfirm': 'Make this playlist public? Other users will be able to see and use it on the "Battle royale" page (nowhere else on the site). Cancel keeps it private, as usual.',
    'profile.addToPlaylist': 'Add to playlist',
    'profile.addToPlaylistTitle': 'Add to playlist',
    'profile.newPlaylistPlaceholder': 'New playlist name',
    'profile.createAndAddBtn': 'Create & add',
    'rec.heading.pre': 'Recommended',
    'rec.heading.accent': 'for you',
    'rec.loading': 'Finding recommendations…',
    'rec.empty': 'Listen to a few songs to get personal recommendations',
    'msg.needLoginForRequest': 'You need to sign in with Google to submit a request.',
    'msg.fillRequiredFields': 'Please fill in all required fields (*)',
    'msg.needLoginGeneric': 'You need to sign in with Google',
    'msg.errorSubmittingRequest': 'Error submitting the request',
    'msg.connectionError': 'Server connection error',
    'msg.errorApprove': 'Error approving the request',
    'msg.approveMerged': 'This song already exists — new genres were added to the existing entry.',
    'msg.needLoginAdmin': 'You need to sign in as admin',
    'msg.errorDelete': 'Deletion error',
    'msg.errorReject': 'Rejection error',
    'msg.needAdminRights': 'Admin rights required',
    'msg.errorAddSong': 'Error adding the song'
  }
};
let currentLang = localStorage.getItem('lang') || 'uk';
function t(key){ return (I18N[currentLang] && I18N[currentLang][key]) || key; }
function applyLang(lang){
  currentLang = lang;
  localStorage.setItem('lang', lang);
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el=>{ el.textContent = t(el.getAttribute('data-i18n')); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{ el.placeholder = t(el.getAttribute('data-i18n-placeholder')); });
  document.querySelectorAll('[data-i18n-title]').forEach(el=>{ el.title = t(el.getAttribute('data-i18n-title')); });
  const label = document.getElementById('lang-toggle-label');
  if(label) label.textContent = lang === 'uk' ? 'UA' : 'EN';
  document.querySelectorAll('#lang-dropdown [data-lang-option]').forEach(b=>{
    b.classList.toggle('active', b.getAttribute('data-lang-option') === lang);
  });
  document.title = t('page.title');
  // Динамічний контент без data-i18n треба перемалювати наново при зміні мови.
  renderSongs();
  updateStats();
  renderAuthArea();
  if(currentUser?.isAdmin) renderRequests();
  // Рекомендації генерує ШІ мовою фронтенду — якщо сторінка відкрита, перезапитуємо новою мовою.
  if(document.getElementById('page-recommendations')?.classList.contains('active')) loadRecommendationsPage();
  if(document.getElementById('page-top')?.classList.contains('active')) loadTopSongsPage();
  if(document.getElementById('page-profile')?.classList.contains('active')) loadProfilePage();
  if(document.getElementById('page-playlist')?.classList.contains('active') && currentPlaylistId!=null) openPlaylist(currentPlaylistId);
  if(document.getElementById('page-artists')?.classList.contains('active')) loadArtistsPage();
  if(document.getElementById('page-artist')?.classList.contains('active') && currentArtistId!=null) loadArtistPage();
  if(document.getElementById('page-friends')?.classList.contains('active')){
    loadFriendsPage();
    if(document.getElementById('friends-search')?.value.trim()) runFriendsSearch();
  }
  if(document.getElementById('page-user-profile')?.classList.contains('active') && currentProfileUserId!=null) loadUserProfilePage();
  if(document.getElementById('page-battle')?.classList.contains('active')) openBattlePage();
  if(wheelResultGenre && document.getElementById('page-wheel')?.classList.contains('active')) renderWheelPlaylist();
  if(document.getElementById('notif-dropdown')?.classList.contains('open')) onOpenNotifDropdown();
}
function selectLang(lang){
  applyLang(lang);
}

// ================================================================
// DROPDOWNS (тема / мова)
// ================================================================
function toggleDropdown(evt, id){
  evt.stopPropagation();
  document.querySelectorAll('.dropdown.open').forEach(d=>{ if(d.id !== id) d.classList.remove('open'); });
  document.getElementById(id).classList.toggle('open');
}
document.addEventListener('click', ()=>{
  document.querySelectorAll('.dropdown.open').forEach(d=>d.classList.remove('open'));
});

let songs = [];
let requests = [];

// ================================================================
// NAVIGATION
// ================================================================
function showPage(n){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-tabs button').forEach(b=>b.classList.remove('active'));
  document.getElementById('page-'+n).classList.add('active');
  const tab = document.getElementById('tab-'+n);
  if(tab) tab.classList.add('active');
  _updateNavIndicator();
  // Важкий перерендер відкладаємо на наступний кадр — інакше перехід між сторінками виглядає як підвисання.
  requestAnimationFrame(()=>{
    if(n==='home'){renderSongs();updateStats().catch(console.error);}
    if(n==='top') loadTopSongsPage();
    if(n==='admin-hub'){ switchAdminHubTab('requests'); renderRequests(); }
    if(n==='profile') loadProfilePage();
    if(n==='profile-settings') loadProfileSettingsPage();
    if(n==='recommendations') loadRecommendationsPage();
    if(n==='wheel') openWheelPage();
    if(n==='battle') openBattlePage();
    if(n==='artists') loadArtistsPage();
    if(n==='artist') loadArtistPage();
    if(n==='friends') loadFriendsPage();
    if(n==='user-profile') loadUserProfilePage();
  });
}
// Плавний індикатор активної вкладки — рахує позицію/ширину кнопки й "їде"
// туди замість миттєвого перескоку border-bottom.
function _updateNavIndicator(){
  const active = document.querySelector('.nav-tabs li button.active');
  const indicator = document.getElementById('nav-tab-indicator');
  if(!indicator) return;
  if(!active){ indicator.style.opacity = '0'; return; }
  indicator.style.left = active.offsetLeft + 'px';
  indicator.style.width = active.offsetWidth + 'px';
  indicator.style.opacity = '1';
  // Підкручуємо активну вкладку в зону видимості, якщо нав скролиться.
  active.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
}
window.addEventListener('resize', _updateNavIndicator);
if (document.fonts?.ready) document.fonts.ready.then(_updateNavIndicator);

// Перенаправляє вертикальний скрол колеса миші в горизонтальний над смугою вкладок.
(function(){
  const navTabs = document.querySelector('.nav-tabs');
  if(!navTabs) return;
  navTabs.addEventListener('wheel', function(e){
    if(e.deltaY === 0 || navTabs.scrollWidth <= navTabs.clientWidth) return;
    e.preventDefault();
    navTabs.scrollLeft += e.deltaY;
  }, { passive: false });
})();

// ================================================================
// RENDER SONGS
// ================================================================
let shuffleActive = false;
let shuffleOrderMap = new Map();
let sortKey = null;
let sortDir = 1;
let displayedSongs = [];

function sortSongs(key){
  if(sortKey===key){ sortDir=-sortDir; }
  else { sortKey=key; sortDir=1; }
  if(shuffleActive){
    shuffleActive=false;
    shuffleOrderMap=new Map();
    document.getElementById('shuffle-table-btn').classList.remove('active');
  }
  document.querySelectorAll('th.sortable').forEach(th=>{
    th.classList.remove('sort-asc','sort-desc');
    if(th.getAttribute('data-sort-key')===sortKey) th.classList.add(sortDir>0?'sort-asc':'sort-desc');
  });
  renderSongs();
}

function _sortVal(s, key){
  switch(key){
    case 'genres': return s.genres.length?s.genres[0].toLowerCase():'';
    case 'album': return (s.album||'').toLowerCase();
    case 'plays': return s.playCount ?? 0;
    case 'artist': case 'title': return s[key].toLowerCase();
    default: return s[key];
  }
}
// Порівняння текстів для сортування — приводить до нижнього регістру, інакше
// великі й малі літери сортуються окремими блоками замість "Aa, Бб...".
function _textSortCmp(a, b){
  const la = String(a).toLowerCase(), lb = String(b).toLowerCase();
  return la < lb ? -1 : la > lb ? 1 : 0;
}
// ================================================================
// АДМІН: ШІ-об'єднання дублікатів жанрів (POST /api/genres/normalize)
// ================================================================
function normalizeGenres(){
  const btn = document.getElementById('normalize-genres-btn');
  const originalHtml = btn.innerHTML; // innerHTML, не textContent — кнопка тепер містить ще й <svg class="icon">
  btn.disabled = true;
  btn.textContent = t('admin.normalizeGenresRunning');

  fetch('/api/genres/normalize', { method: 'POST' })
    .then(r=>{
      if(!r.ok){ alert(t('msg.errorNormalizeGenres')); return null; }
      return r.json();
    })
    .then(data=>{
      if(!data) return;
      if(data.error){
        alert(t('admin.normalizeGenresError') + '\n\n' + data.error);
      } else if(data.mergedCount === 0){
        alert(t('admin.normalizeGenresNone'));
      } else {
        alert(t('admin.normalizeGenresDone').replace('{count}', data.mergedCount) + '\n\n' + data.mergedPairs.join('\n'));
      }
      loadSongs().then(()=>{renderSongs();updateStats();});
    })
    .catch(()=>{ alert(t('msg.connectionError')); })
    .finally(()=>{ btn.disabled = false; btn.innerHTML = originalHtml; });
}

// ================================================================
// FAVORITES (улюблені пісні) — доступно будь-якому авторизованому
// ================================================================
let favoriteIds = new Set();
function loadFavoriteIds(){
  fetch('/api/favorites').then(r=>r.ok?r.json():[]).then(list=>{
    favoriteIds = new Set(list.map(s=>s.id));
    renderSongs();
  }).catch(()=>{});
}
function toggleFavorite(musicId, btn){
  const isFav = favoriteIds.has(musicId);
  const method = isFav ? 'DELETE' : 'POST';
  fetch(`/api/favorites/${musicId}`, { method })
    .then(r=>{
      if(!r.ok) return;
      if(isFav) favoriteIds.delete(musicId); else favoriteIds.add(musicId);
      if(btn){
        btn.classList.toggle('active', !isFav);
        const svg = btn.querySelector('svg');
        if(svg) svg.setAttribute('fill', !isFav ? 'currentColor' : 'none');
      }
    })
    .catch(()=>{ alert(t('msg.connectionError')); });
}

// ================================================================
// PROFILE (профіль, улюблені, плейлисти)
// ================================================================
let profileAvatarValue = null;   // поточне значення аватарки, яке буде надіслано при збереженні
let profileGooglePicture = null; // фото з Google-акаунту (фолбек, якщо своєї аватарки нема)
function loadProfilePage(){
  fetch('/api/profile').then(r=>r.json()).then(p=>{
    document.getElementById('profile-view-name').textContent = p.displayName || p.name || p.email;
    document.getElementById('profile-view-email').textContent = p.email;
    const shownPic = p.avatarUrl || p.picture;
    const picEl = document.getElementById('profile-view-picture');
    const picPh = document.getElementById('profile-view-picture-ph');
    if(shownPic){ picEl.src = shownPic; picEl.style.display = ''; picPh.style.display = 'none'; }
    else { picEl.style.display = 'none'; picPh.style.display = ''; }
    document.getElementById('profile-stat-listened').textContent = p.totalListened;
    document.getElementById('profile-stat-favorites').textContent = p.favoritesCount;
    document.getElementById('profile-stat-playlists').textContent = p.playlistsCount;

    const genresWrap = document.getElementById('profile-top-genres-wrap');
    if(p.topGenres && p.topGenres.length){
      document.getElementById('profile-top-genres').innerHTML = p.topGenres.map(g=>`<span class="badge">${esc(abbrGenre(g))}</span>`).join('');
      genresWrap.style.display = 'block';
    } else genresWrap.style.display = 'none';
  }).catch(()=>{});

  loadProfileFavorites();
  loadProfilePlaylists();
}
// Раніше було частиною loadProfilePage() — виділено окремо, коли
// редагування нікнейму/аватарки переїхало на свою сторінку "Налаштування".
function loadProfileSettingsPage(){
  fetch('/api/profile').then(r=>r.json()).then(p=>{
    document.getElementById('profile-name').textContent = p.displayName || p.name || p.email;
    document.getElementById('profile-email').textContent = p.email;
    document.getElementById('profile-display-name').value = p.displayName || '';
    profileAvatarValue = p.avatarUrl || null;
    profileGooglePicture = p.picture || null;
    const pic = document.getElementById('profile-picture');
    const shown = p.avatarUrl || p.picture;
    if(shown){ pic.src = shown; pic.style.display = 'block'; } else pic.style.display = 'none';
  }).catch(()=>{});
}
// Конвертує обрану аватарку в base64 для прев'ю; надсилається лише при "Зберегти".
function onAvatarFileSelected(event){
  const file = event.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    profileAvatarValue = reader.result;
    const pic = document.getElementById('profile-picture');
    pic.src = profileAvatarValue;
    pic.style.display = 'block';
  };
  reader.readAsDataURL(file);
}
function removeAvatar(){
  profileAvatarValue = null;
  document.getElementById('profile-avatar-file').value = '';
  const pic = document.getElementById('profile-picture');
  if(profileGooglePicture){ pic.src = profileGooglePicture; pic.style.display = 'block'; }
  else pic.style.display = 'none';
}
function saveProfile(){
  const displayName = document.getElementById('profile-display-name').value.trim();
  fetch('/api/profile', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ displayName: displayName || null, avatarUrl: profileAvatarValue }) })
    .then(r=>{
      if(!r.ok){ alert(t('msg.connectionError')); return; }
      if(currentUser){ currentUser.displayName = displayName || null; currentUser.avatarUrl = profileAvatarValue; }
      loadProfileSettingsPage();
      renderAuthArea();
    })
    .catch(()=>{ alert(t('msg.connectionError')); });
}
function loadProfileFavorites(){
  fetch('/api/favorites').then(r=>r.json()).then(list=>{
    const tbody = document.getElementById('profile-favorites-body');
    document.getElementById('profile-favorites-empty').style.display = list.length ? 'none' : '';
    tbody.innerHTML = list.map(s=>`
      <tr>
        <td data-label="${t('table.artist')}"><strong>${esc(s.artist)}</strong></td>
        <td data-label="${t('table.title')}">${esc(s.title)}</td>
        <td data-label="${t('table.genres')}">${s.genres.map(g=>`<span class="badge">${esc(abbrGenre(g))}</span>`).join('')}</td>
        <td class="td-icon-trail" data-label=""><button class="btn-icon-fav active" onclick="removeFavoriteFromProfile(${s.id})" title="${t('profile.favToggle')}"><svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"></path></svg></button></td>
      </tr>`).join('');
  }).catch(()=>{});
}
function removeFavoriteFromProfile(musicId){
  fetch(`/api/favorites/${musicId}`, { method:'DELETE' }).then(()=>{
    favoriteIds.delete(musicId);
    loadProfileFavorites();
    loadProfilePage();
  }).catch(()=>{});
}
function loadProfilePlaylists(){
  fetch('/api/playlists').then(r=>r.json()).then(list=>{
    document.getElementById('profile-playlists-empty').style.display = list.length ? 'none' : '';
    document.getElementById('profile-playlists-list').innerHTML = list.map(p=>`
      <div class="ext-search-item" onclick="openPlaylist(${p.id})">
        <div class="es-main"><strong>${esc(p.name)}</strong><span>${p.songCount} ${t('profile.songsWord')}</span></div>
        <div style="display:flex;align-items:center;gap:8px;" onclick="event.stopPropagation()">
          <button type="button" class="btn btn-outline${p.isPublic?' active':''}" style="font-size:0.7rem;padding:0.3rem 0.7rem;" onclick="togglePlaylistPublic(${p.id}, ${p.isPublic ? 'false' : 'true'})" title="${t('battle.togglePublicHint')}">${p.isPublic ? `<svg class="icon"><use href="#icon-globe"/></svg> ${esc(t('battle.publicBadge'))}` : `<svg class="icon"><use href="#icon-lock"/></svg> ${esc(t('battle.privateBadge'))}`}</button>
          <button class="btn-icon-danger" onclick="deletePlaylist(${p.id})" title="${t('modal.confirmDelete')}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path></svg>
          </button>
        </div>
      </div>`).join('');
  }).catch(()=>{});
}
function createPlaylist(){
  const name = prompt(t('profile.newPlaylistPrompt'));
  if(!name || !name.trim()) return;
  // Публічний плейлист видно іншим на сторінці "Батл рояль"; за замовчуванням — приватний.
  const isPublic = confirm(t('profile.newPlaylistPublicConfirm'));
  fetch('/api/playlists', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name: name.trim(), isPublic }) })
    .then(r=>{ if(r.ok) loadProfilePlaylists(); else alert(t('msg.connectionError')); })
    .catch(()=>{ alert(t('msg.connectionError')); });
}
function deletePlaylist(id){
  fetch(`/api/playlists/${id}`, { method:'DELETE' }).then(()=>loadProfilePlaylists()).catch(()=>{});
}
// Перемикач публічності — окремою кнопкою на кожному плейлисті, а не лише при створенні.
function togglePlaylistPublic(id, makePublic){
  fetch(`/api/playlists/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ isPublic: makePublic }) })
    .then(r=>{ if(r.ok) loadProfilePlaylists(); else alert(t('msg.connectionError')); })
    .catch(()=>{ alert(t('msg.connectionError')); });
}

// ================================================================
// ADD TO PLAYLIST (з головної таблиці — кнопка "➕")
// ================================================================
let addToPlaylistMusicId = null;
function openAddToPlaylistModal(musicId){
  addToPlaylistMusicId = musicId;
  document.getElementById('add-to-playlist-new-name').value = '';
  fetch('/api/playlists').then(r=>r.json()).then(list=>{
    const wrap = document.getElementById('add-to-playlist-list');
    document.getElementById('add-to-playlist-empty').style.display = list.length ? 'none' : '';
    wrap.innerHTML = list.map(p=>`
      <div class="ext-search-item" onclick="addSongToExistingPlaylist(${p.id})">
        <div class="es-main"><strong>${esc(p.name)}</strong><span>${p.songCount} ${t('profile.songsWord')}</span></div>
      </div>`).join('');
    document.getElementById('add-to-playlist-modal-overlay').classList.add('open');
  }).catch(()=>{ alert(t('msg.connectionError')); });
}
function closeAddToPlaylistModal(){
  document.getElementById('add-to-playlist-modal-overlay').classList.remove('open');
  addToPlaylistMusicId = null;
}
document.getElementById('add-to-playlist-modal-overlay').addEventListener('click', function(e){
  if(e.target === this) closeAddToPlaylistModal();
});
function addSongToExistingPlaylist(playlistId){
  if(!addToPlaylistMusicId) return;
  fetch(`/api/playlists/${playlistId}/songs/${addToPlaylistMusicId}`, { method:'POST' })
    .then(r=>{
      if(!r.ok){ alert(t('msg.connectionError')); return; }
      closeAddToPlaylistModal();
    })
    .catch(()=>{ alert(t('msg.connectionError')); });
}
function createPlaylistAndAdd(){
  const name = document.getElementById('add-to-playlist-new-name').value.trim();
  if(!name){ alert(t('msg.fillRequiredFields')); return; }
  fetch('/api/playlists', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name }) })
    .then(r=>r.ok?r.json():null)
    .then(playlist=>{
      if(!playlist){ alert(t('msg.connectionError')); return; }
      return addSongToExistingPlaylist(playlist.id);
    })
    .catch(()=>{ alert(t('msg.connectionError')); });
}
let currentPlaylistId = null;
function openPlaylist(id){
  currentPlaylistId = id;
  fetch(`/api/playlists/${id}`).then(r=>r.json()).then(p=>{
    currentPlaylistSongs = p.songs;
    document.getElementById('playlist-detail-title').textContent = p.name;
    const tbody = document.getElementById('playlist-detail-body');
    document.getElementById('playlist-detail-empty').style.display = p.songs.length ? 'none' : '';
    document.getElementById('playlist-play-all-btn').style.display = p.songs.length ? '' : 'none';
    tbody.innerHTML = p.songs.map(s=>`
      <tr>
        <td class="td-icon-lead" data-label=""><button class="btn-icon-fav" onclick="toggleOrPlay(${s.id}, playFromPlaylist)" title="${t('profile.playBtn')}">
          <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>
        </button></td>
        <td data-label="${t('table.artist')}"><strong>${esc(s.artist)}</strong></td>
        <td data-label="${t('table.title')}">${esc(s.title)}</td>
        <td data-label="${t('table.genres')}">${s.genres.map(g=>`<span class="badge">${esc(abbrGenre(g))}</span>`).join('')}</td>
        <td class="td-icon-trail" data-label=""><button class="btn-icon-danger" onclick="removeSongFromPlaylist(${id},${s.id})" title="${t('modal.confirmDelete')}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path></svg>
        </button></td>
      </tr>`).join('');
    showPage('playlist');
  }).catch(()=>{});
}
function removeSongFromPlaylist(playlistId, musicId){
  fetch(`/api/playlists/${playlistId}/songs/${musicId}`, { method:'DELETE' }).then(()=>openPlaylist(playlistId)).catch(()=>{});
}

// ================================================================
// RECOMMENDATIONS
// ================================================================
function openRecommendationsPage(){
  if(!currentUser?.authenticated){
    if(confirm(t('msg.confirmLoginGeneric'))) login();
    return;
  }
  showPage('recommendations');
}
function loadRecommendationsPage(){
  document.getElementById('rec-loading').style.display = 'block';
  document.getElementById('rec-empty').style.display = 'none';
  document.getElementById('rec-list').innerHTML = '';

  fetch(`/api/recommendations?lang=${encodeURIComponent(currentLang)}`).then(r=>r.json()).then(list=>{
    document.getElementById('rec-loading').style.display = 'none';
    if(!list.length){ document.getElementById('rec-empty').style.display = ''; return; }
    document.getElementById('rec-list').innerHTML = list.map(item=>{
      const s = item.song;
      return `
      <div class="rec-item" onclick="playSong(${s.id})">
        <div class="rec-main">
          <strong>${esc(s.artist)}</strong>
          <span class="rec-title">${esc(s.title)}</span>
          ${item.reason?`<span class="rec-reason">${esc(item.reason)}</span>`:''}
        </div>
        <div class="es-meta">
          ${s.genres.map(g=>`<span class="es-genre-badge">${esc(abbrGenre(g))}</span>`).join('')}
        </div>
      </div>`;
    }).join('');
  }).catch(()=>{
    document.getElementById('rec-loading').style.display = 'none';
  });
}

function toggleShuffleTable(){
  shuffleActive = !shuffleActive;
  const btn = document.getElementById('shuffle-table-btn');
  if(shuffleActive){
    const ids = songs.map(s=>s.id);
    for(let i=ids.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    shuffleOrderMap = new Map(ids.map((id,idx)=>[id, idx]));
    btn.classList.add('active');
  } else {
    shuffleOrderMap = new Map();
    btn.classList.remove('active');
  }
  renderSongs();
}

// ================================================================
// КОЛЕСО ФОРТУНИ: випадковий жанр -> перемішаний плейлист цього жанру
// (окрема сторінка page-wheel, а не модалка — відкривається через showPage('wheel'))
// ================================================================
// 20 підібраних вручну кольорів (приглушені, в тон темно-золотій гамі сайту) —
// решта (>20 жанрів) іде через HSL-фолбек у _wheelSegColor, теж приглушений,
// щоб не зісковзувати в кислотні неонові відтінки на великих колесах.
const WHEEL_COLORS = [
  '#c8a96e','#7c6fcd','#4caf7d','#e05c5c','#5aa9e6','#e0a15c','#8ecae6','#f2a65a','#8a5cf2','#5ce0c0',
  '#b85c8a','#6b8e4e','#d4874f','#5c7cc9','#c94f6b','#4fa89e','#9e7bc9','#c9a45c','#5c9e7c','#c96b4f',
];
// wheelAllGenres — весь пул, перемішаний раз при відкритті; wheelGenres — перші N з нього.
// Зміна кількості обрізає той самий порядок, а не перемішує наново.
let wheelAllGenres = [];
let wheelGenres = [];
let wheelResultGenre = null;
let wheelSpinning = false;
let currentWheelSongs = [];

function _shuffledCopy(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

// Колір сегмента: до 10 жанрів — підібрана палітра; більше — HSL за "золотим кутом"
// (~137.5°), щоб сусідні сектори не зливались, як при звичайному i/n*360.
function _wheelSegColor(i, n){
  if(n <= WHEEL_COLORS.length) return WHEEL_COLORS[i % WHEEL_COLORS.length];
  // 42%/44% замість кислотних 62%/52% — узгоджується з приглушеною кураторською палітрою вище.
  return `hsl(${Math.round((i*137.508) % 360)}deg 42% 44%)`;
}

// Жанр бере участь у колесі лише якщо в ньому є щонайменше 5 пісень — інакше
// плейлист по цьому жанру виходив би заскладно коротким.
function _eligibleWheelGenres(){
  const counts = {};
  for(const s of songs) for(const g of s.genres) counts[g] = (counts[g] || 0) + 1;
  return Object.keys(counts).filter(g => counts[g] >= 5);
}

// true лише після того, як користувач сам змінив поле (onWheelCountChange) —
// без цього прапорця openWheelPage() щоразу бачив у полі вже НЕПОРОЖНЄ (хай і
// дефолтне з HTML) значення "2" і ніколи не підставляв нормальний дефолт 10.
let wheelCountTouched = false;

function openWheelPage(){
  wheelAllGenres = _shuffledCopy(_eligibleWheelGenres());
  const countInput = document.getElementById('wheel-count');
  const total = wheelAllGenres.length;
  countInput.max = total || 1;
  // За замовчуванням — досить мало, щоб підписи одразу читались; хочете
  // більше (аж до всіх жанрів бази) — підкрутіть число самі.
  countInput.min = Math.min(2, total || 1);
  const defaultCount = Math.max(1, Math.min(10, total));
  countInput.value = wheelCountTouched
    ? Math.min(Math.max(countInput.min, parseInt(countInput.value) || defaultCount), total || 1)
    : defaultCount;
  document.getElementById('wheel-count-max').textContent = `/ ${total}`;
  _applyWheelCount();
  wheelResultGenre = null;
  wheelSpinning = false;
  document.getElementById('wheel-result').style.display = 'none';
  document.getElementById('wheel-spin-btn').disabled = false;
  document.getElementById('wheel-playlist-empty').style.display = '';
  document.getElementById('wheel-playlist-wrap').style.display = 'none';
}

// Викликається при зміні поля "Кількість жанрів на колесі" — обрізає той
// самий перемішаний пул і перемальовує колесо (без нового спіну/результату).
function onWheelCountChange(){
  if(wheelSpinning) return;
  wheelCountTouched = true;
  const countInput = document.getElementById('wheel-count');
  const total = wheelAllGenres.length;
  const min = parseInt(countInput.min) || 1;
  if(_sanitizeIntInput(countInput, min, total || 1) === null) return; // ще друкує/порожньо
  _applyWheelCount();
  wheelResultGenre = null;
  document.getElementById('wheel-result').style.display = 'none';
  document.getElementById('wheel-playlist-empty').style.display = '';
  document.getElementById('wheel-playlist-wrap').style.display = 'none';
}
function _applyWheelCount(){
  const v = parseInt(document.getElementById('wheel-count').value) || wheelAllGenres.length;
  wheelGenres = wheelAllGenres.slice(0, v);
  renderWheelDisc();
  renderWheelLegend();
  const disc = document.getElementById('wheel-disc');
  disc.style.transition = 'none';
  disc.style.transform = 'rotate(0deg)';
  requestAnimationFrame(()=>{ disc.style.transition = ''; });
}

// Розмір шрифту підписів масштабуємо під кількість секторів — інакше текст накладається сам на себе.
function _wheelLabelFontSize(n){
  if(n <= 8) return 14;
  if(n <= 16) return 12.5;
  if(n <= 28) return 11;
  if(n <= 45) return 9.8;
  if(n <= 65) return 8.8;
  return 8;
}

function renderWheelDisc(){
  const disc = document.getElementById('wheel-disc');
  const n = wheelGenres.length;
  if(!n){ disc.style.background = ''; disc.innerHTML = ''; return; }
  const segAngle = 360/n;
  const gradientParts = wheelGenres.map((g,i)=>`${_wheelSegColor(i,n)} ${i*segAngle}deg ${(i+1)*segAngle}deg`).join(', ');
  disc.style.background = `conic-gradient(${gradientParts})`;

  // "По центру сектора" — кутове центрування (mid, бісектриса сектора), не радіальне.
  const hubR = (document.getElementById('wheel-hub')?.clientWidth || 0)/2;
  const discR = disc.clientWidth/2;
  const startR = Math.max(hubR + 14, Math.min(discR*0.42, n*2.6));
  const fontSize = _wheelLabelFontSize(n);
  disc.innerHTML = wheelGenres.map((g,i)=>{
    const mid = i*segAngle + segAngle/2;
    // rotate(θ) translate(r,0) дивиться на кут (90+θ) від верху — щоб отримати mid, беремо θ = mid-90.
    const rot = mid - 90;
    return `<span class="wheel-seg-label" style="font-size:${fontSize}px;transform:rotate(${rot}deg) translate(${startR}px, 0);">${esc(abbrGenre(g))}</span>`;
  }).join('');
}

// Легенда — той самий список назв, що й на диску, але списком, для звірки з обрізаними підписами.
function renderWheelLegend(){
  const n = wheelGenres.length;
  document.getElementById('wheel-legend').innerHTML = wheelGenres.map((g,i)=>`
    <div class="wheel-legend-item" id="wheel-legend-item-${i}">
      <span class="wheel-legend-swatch" style="background:${_wheelSegColor(i,n)}"></span>
      <span>${esc(g)}</span>
    </div>`).join('');
}

// Санітайзер для числових полів колеса (type="text", бо type="number" пропускає
// невалідний проміжний ввід): викидає нецифрові символи, затискає ЛИШЕ зверху
// (max) під час друку. Нижню межу (min) тут НЕ підіймаємо — інакше перша
// цифра нижче min (напр. "1" при min=2) миттєво перетворювалась би на "2" ще
// до того, як дописати другу цифру, і "12" ніколи не вдавалось би ввести.
// Нижню межу перевіряємо остаточно на blur — _restoreIntInputIfEmpty.
function _sanitizeIntInput(el, min, max){
  const digitsOnly = el.value.replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '');
  if(digitsOnly === ''){
    if(el.value !== '') el.value = '';
    return null;
  }
  let v = parseInt(digitsOnly, 10);
  if(v > max) v = max;
  const str = String(v);
  if(el.value !== str) el.value = str;
  return v;
}
function _restoreIntInputIfEmpty(el){
  const min = parseInt(el.min) || 1;
  const max = parseInt(el.max) || 99;
  const v = el.value.trim() === '' ? min : Math.max(min, Math.min(max, parseInt(el.value, 10) || min));
  if(String(v) !== el.value) el.value = String(v);
}
function _clampWheelSecInput(el){
  _sanitizeIntInput(el, parseInt(el.min) || 1, parseInt(el.max) || 99);
}

// Один спільний AudioContext на всі тіки/дзвінок — створювати новий на кожен
// звук і дорого, і зайве; лежить ліниво, ініціалізується першим кліком "Крутити"
// (браузери все одно вимагають user gesture для старту звуку).
let _wheelAudioCtx = null;
function _wheelTone(freq, duration, volume, delay){
  try{
    _wheelAudioCtx = _wheelAudioCtx || new (window.AudioContext||window.webkitAudioContext)();
    const ctx = _wheelAudioCtx;
    const t0 = ctx.currentTime + (delay||0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration);
  }catch(e){}
}
// Тіки під час обертання: читаємо поточний кут диска прямо з CSS-transition
// (matrix() у getComputedStyle), рахуємо, який сектор зараз під нерухомою
// стрілкою (та сама формула, що й для фінального результату), і клацаємо
// щоразу, як сектор під стрілкою змінюється — тобто тік синхронний з
// easing-уповільненням самого обертання, а не за фіксованим таймером.
function _wheelStartTicking(disc, n, segAngle){
  let lastIndex = -1;
  function frame(){
    if(!wheelSpinning) return;
    const tr = getComputedStyle(disc).transform;
    const m = tr && tr !== 'none' ? tr.match(/matrix\(([^)]+)\)/) : null;
    if(m){
      const p = m[1].split(',').map(Number);
      let angle = Math.atan2(p[1], p[0]) * 180/Math.PI;
      if(angle < 0) angle += 360;
      const topAngle = (360 - angle) % 360;
      const idx = Math.floor(topAngle / segAngle) % n;
      if(idx !== lastIndex){
        lastIndex = idx;
        _wheelTone(700, 0.045, 0.06);
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
// Невеликий конфеті-вибух із хаба — прості DOM-елементи з CSS-анімацією
// (без сторонньої бібліотеки), самі прибираються після завершення.
function _wheelConfetti(){
  const wrap = document.getElementById('wheel-disc')?.closest('.wheel-wrap');
  if(!wrap) return;
  const colors = WHEEL_COLORS;
  for(let i=0; i<36; i++){
    const el = document.createElement('span');
    const angle = Math.random()*360;
    const dist = 90 + Math.random()*160;
    const dx = Math.cos(angle*Math.PI/180)*dist;
    const dy = Math.sin(angle*Math.PI/180)*dist;
    el.style.cssText = `position:absolute;top:50%;left:50%;width:${5+Math.random()*4}px;height:${5+Math.random()*4}px;` +
      `background:${colors[i%colors.length]};border-radius:${Math.random()<0.5?'50%':'2px'};pointer-events:none;z-index:6;` +
      `--dx:${dx}px;--dy:${dy}px;animation:wheelConfettiBurst ${0.7+Math.random()*0.5}s ease-out forwards;`;
    wrap.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

function spinWheel(){
  if(wheelSpinning || !wheelGenres.length) return;
  const secMin = Math.max(1, Math.min(99, parseFloat(document.getElementById('wheel-sec-min').value) || 3));
  const secMax = Math.max(secMin, Math.min(99, parseFloat(document.getElementById('wheel-sec-max').value) || secMin));
  const duration = secMin + Math.random()*(secMax-secMin);

  wheelSpinning = true;
  document.getElementById('wheel-spin-btn').disabled = true;
  document.getElementById('wheel-result').style.display = 'none';
  document.getElementById('wheel-playlist-empty').style.display = '';
  document.getElementById('wheel-playlist-wrap').style.display = 'none';

  const n = wheelGenres.length;
  const segAngle = 360/n;
  const winnerIndex = Math.floor(Math.random()*n);
  // Сегмент winnerIndex опиняється під нерухомою стрілкою, коли rotation == 360 - mid (+ повні оберти).
  const fullSpins = Math.max(4, Math.round(duration*1.4)) + Math.floor(Math.random()*2);
  const mid = winnerIndex*segAngle + segAngle/2;
  const rotation = fullSpins*360 + (360 - mid);
  const disc = document.getElementById('wheel-disc');
  disc.classList.remove('landed');
  disc.style.transitionDuration = `${duration}s`;
  disc.style.transform = `rotate(${rotation}deg)`;
  _wheelStartTicking(disc, n, segAngle);
  setTimeout(()=>{
    wheelSpinning = false;
    document.getElementById('wheel-spin-btn').disabled = false;
    wheelResultGenre = wheelGenres[winnerIndex];
    document.getElementById('wheel-result-genre').textContent = abbrGenre(wheelResultGenre);
    document.getElementById('wheel-result').style.display = 'block';
    document.querySelectorAll('.wheel-legend-item.winner').forEach(el=>el.classList.remove('winner'));
    document.getElementById(`wheel-legend-item-${winnerIndex}`)?.classList.add('winner');
    disc.classList.add('landed');
    _wheelTone(660, 0.18, 0.09);
    _wheelTone(880, 0.28, 0.08, 0.09);
    _wheelConfetti();
    renderWheelPlaylist();
  }, duration*1000 + 150);
}

// Плейлист показуємо одразу після зупинки колеса, ще до натискання "Слухати".
function renderWheelPlaylist(){
  if(!wheelResultGenre) return;
  currentWheelSongs = _shuffledCopy(songs.filter(s=>s.genres.includes(wheelResultGenre)));
  if(!currentWheelSongs.length) return; // жанри колеса й так беруться лише з наявних пісень
  document.getElementById('wheel-playlist-empty').style.display = 'none';
  document.getElementById('wheel-playlist-wrap').style.display = '';
  // Без назви жанру тут — вона вже велика й помітна у "Випав жанр" над колесом.
  document.getElementById('wheel-playlist-title').textContent = `${currentWheelSongs.length} ${t('profile.songsWord')}`;
  document.getElementById('wheel-playlist-body').innerHTML = currentWheelSongs.map(s=>`
    <tr>
      <td class="td-icon-lead" data-label=""><button class="btn-icon-fav" onclick="toggleOrPlay(${s.id}, playFromWheel)" title="${t('profile.playBtn')}">
        <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>
      </button></td>
      <td data-label="${t('table.artist')}"><strong>${esc(s.artist)}</strong></td>
      <td data-label="${t('table.title')}">${esc(s.title)}</td>
    </tr>`).join('');
}
function playFromWheel(id){
  if(!currentWheelSongs.length) return;
  playerQueue = currentWheelSongs.slice();
  playerIndex = playerQueue.findIndex(s=>s.id===id);
  if(playerIndex<0) playerIndex = 0;
  _loadCurrent();
}
function playWheelFromStart(){
  if(!currentWheelSongs.length) return;
  playFromWheel(currentWheelSongs[0].id);
}

// Посилання на виконавців — s.artists уже розбитий по колаборантах; s.artist — фолбек для пісень без бекфілу.
function artistLinksHtml(s){
  return (s.artists && s.artists.length)
    ? s.artists.map(a => `<a href="#" class="artist-link" onclick="openArtistPage(${a.id});return false;">${esc(a.name)}</a>`).join(', ')
    : esc(s.artist);
}

function renderSongs(){
  const srch=document.getElementById('search').value.toLowerCase();
  const gf=document.getElementById('filter-genre').value;
  const filtered=songs.filter(s=>{
    const mt=!srch||s.artist.toLowerCase().includes(srch)||s.title.toLowerCase().includes(srch)||(s.album&&s.album.toLowerCase().includes(srch));
    const mg=!gf||s.genres.includes(gf);
    return mt&&mg;
  });
  const ordered = shuffleActive
    ? [...filtered].sort((a,b)=>(shuffleOrderMap.get(a.id) ?? Infinity) - (shuffleOrderMap.get(b.id) ?? Infinity))
    : sortKey
      ? [...filtered].sort((a,b)=>{
          const va=_sortVal(a,sortKey), vb=_sortVal(b,sortKey);
          if(va<vb) return -1*sortDir;
          if(va>vb) return 1*sortDir;
          return 0;
        })
      : filtered;
  // Черга відтворення слідує за тим, що зараз реально показано в таблиці (сортування/пошук).
  displayedSongs = ordered;
  const tbody=document.getElementById('songs-body');
  if(!ordered.length){
    tbody.innerHTML=`<tr><td colspan="10"><div class="empty"><svg class="icon"><use href="#icon-music"/></svg>${t('table.empty')}</div></td></tr>`;
    return;
  }
  const curId=playerQueue.length&&playerQueue[playerIndex]?playerQueue[playerIndex].id:null;
  tbody.innerHTML=ordered.map((s,i)=>{
    const isPlay=s.id===curId;
    const btnIcon=isPlay&&isPlaying()
      ?`<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`
      :`<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
    return `<tr class="${isPlay?'playing-row':''}">
      <td class="td-icon-lead" data-label="" style="padding:0.7rem 0.5rem 0.7rem 1rem;">
        <button class="play-row-btn${isPlay?' is-playing':''}" onclick="toggleOrPlay(${s.id}, playSong)">${btnIcon}</button>
      </td>
      <td class="num-col" data-label="${t('table.number')}">${i+1}</td>
      <td data-label="${t('table.artist')}"><strong>${artistLinksHtml(s)}</strong></td>
      <td data-label="${t('table.title')}">${esc(s.title)}</td>
      <td class="duration-col" data-label="${t('table.release')}">${fmtDate(s.release)}</td>
      <td class="duration-col" data-label="${t('table.duration')}">${s.duration}</td>
      <td data-label="${t('table.genres')}">${s.genres.map(g=>`<span class="badge">${esc(abbrGenre(g))}</span>`).join('')}</td>
      <td data-label="${t('table.album')}">${s.album?`<span class="badge album">${esc(s.album)}</span>`:`<span style="color:var(--muted)">${t('table.single')}</span>`}</td>
      <td class="duration-col" data-label="${t('table.plays')}"><svg class="icon"><use href="#icon-eye"/></svg> ${s.playCount ?? 0}</td>
      ${currentUser?.authenticated?`<td class="td-icon-trail" data-label=""><div style="display:flex;gap:6px;"><button class="btn-icon-fav${favoriteIds.has(s.id)?' active':''}" aria-label="${t('profile.favToggle')}" title="${t('profile.favToggle')}" onclick="toggleFavorite(${s.id}, this)"><svg viewBox="0 0 24 24" fill="${favoriteIds.has(s.id)?'currentColor':'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"></path></svg></button><button class="btn-icon-fav" aria-label="${t('profile.addToPlaylist')}" title="${t('profile.addToPlaylist')}" onclick="openAddToPlaylistModal(${s.id})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></button></div></td>`:''}
      ${currentUser?.isAdmin?`<td class="td-actions" data-label="${t('table.action')}"><div style="display:flex;gap:6px;"><button class="btn-icon-edit" aria-label="${t('admin.editBtn')}" title="${t('admin.editBtn')}" onclick="openEditSongModal(${s.id})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg></button><button class="btn-icon-danger" aria-label="${t('modal.confirmDelete')}" title="${t('modal.confirmDelete')}" onclick="confirmDeleteSong(${s.id})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg></button></div></td>`:''}
    </tr>`;
  }).join('');
}

function isPlaying(){
  try{return ytPlayer&&ytReady&&ytPlayer.getPlayerState()===YT.PlayerState.PLAYING;}catch(e){return false;}
}

// ================================================================
// STATS
// ================================================================
// Плавний відлік цифри від поточного значення до нового замість миттєвої підміни тексту.
function _animateCount(id, target){
  target = Number(target) || 0;
  const el = document.getElementById(id);
  const start = Number(el.textContent) || 0;
  if (start === target) { el.textContent = target; return; }
  const duration = 700, t0 = performance.now();
  function tick(now){
    const p = Math.min((now - t0) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(start + (target - start) * eased);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

async function updateStats(){
  const ag=new Set(songs.flatMap(s=>s.genres));
  const sel=document.getElementById('filter-genre');
  const cur=sel.value;
  sel.innerHTML=`<option value="">${t('filter.allGenres')}</option>`+[...ag].sort(_textSortCmp).map(g=>`<option value="${esc(g)}"${g===cur?' selected':''}>${esc(abbrGenre(g))}</option>`).join('');
  try {
    const st = await fetch('/api/stats').then(r=>r.json());
    _animateCount('stat-songs', st.totalSongs);
    _animateCount('stat-genres', st.totalGenres);
    _animateCount('stat-albums', st.totalAlbums);
    _animateCount('stat-singles', st.singles);
  } catch {
    const aa=new Set(songs.filter(s=>s.album).map(s=>s.album));
    _animateCount('stat-songs', songs.length);
    _animateCount('stat-genres', ag.size);
    _animateCount('stat-albums', aa.size);
    _animateCount('stat-singles', songs.filter(s=>!s.album).length);
  }
}

// "Прожектор" за курсором на статкартках — координати в CSS custom properties.
document.querySelectorAll('.stat-card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    card.style.setProperty('--my', (e.clientY - r.top) + 'px');
  });
});

// ================================================================
// FORMS
// ================================================================
// Форма заявки доступна лише авторизованим — інакше пропонуємо спочатку увійти.
function openRequestPage(){
  if(!currentUser?.authenticated){
    if(confirm(t('msg.confirmLoginForRequest'))) login();
    return;
  }
  showPage('request');
}
// ================================================================
// EXTERNAL SEARCH (iTunes) — автозаповнення форми запиту/додавання
// ================================================================
let extSearchTimer = null;
function onRequestSearchInput(){
  clearTimeout(extSearchTimer);
  extSearchTimer = setTimeout(()=>runExternalSearch('req'), 450);
}
let addExtSearchTimer = null;
function onAddSearchInput(){
  clearTimeout(addExtSearchTimer);
  addExtSearchTimer = setTimeout(()=>runExternalSearch('add'), 450);
}
let editReqExtSearchTimer = null;
function onEditReqSearchInput(){
  clearTimeout(editReqExtSearchTimer);
  editReqExtSearchTimer = setTimeout(()=>runExternalSearch('edit-req'), 450);
}
function renderExtSearchItem(it, idx, prefix){
  const genreBadges = (it.genre||'').split(',').map(g=>g.trim()).filter(Boolean)
    .map(g=>`<span class="es-genre-badge">${esc(g)}</span>`).join('');
  return `
    <div class="ext-search-item" onclick="applyExternalResult('${prefix}',${idx})">
      <div class="es-main">
        <strong>${esc(it.artist)}</strong>
        <span>${esc(it.title)}</span>
        ${it.album?`<span><svg class="icon"><use href="#icon-disc"/></svg> ${esc(it.album)}</span>`:''}
      </div>
      <div class="es-meta">
        ${it.release?`<span class="es-year">${esc(it.release.slice(0,4))}</span>`:''}
        ${genreBadges}
        ${it.duration?`<span class="es-year">${esc(it.duration)}</span>`:''}
      </div>
    </div>`;
}
// Кеш результатів на префікс форми (req/add/edit-req).
const _extSearchCaches = {};
function runExternalSearch(prefix){
  const artistId = `${prefix}-artist`;
  const titleId = `${prefix}-title`;
  const albumId = `${prefix}-album`;
  // Форма "Надіслати запит" (prefix 'req') історично без префікса в id панелі.
  const panelId = prefix==='req' ? 'ext-search-panel' : `${prefix}-ext-search-panel`;
  const resultsId = prefix==='req' ? 'ext-search-results' : `${prefix}-ext-search-results`;

  const artist = document.getElementById(artistId).value.trim();
  const title = document.getElementById(titleId).value.trim();
  const album = document.getElementById(albumId).value.trim();
  const query = `${artist} ${title} ${album}`.trim();
  const panel = document.getElementById(panelId);
  const results = document.getElementById(resultsId);

  if(query.length < 2){
    panel.style.display = 'none';
    results.innerHTML = '';
    return;
  }

  const params = new URLSearchParams({ artist, title, album });
  fetch(`/api/external-search?${params.toString()}`)
    .then(r=>r.ok?r.json():[])
    .then(items=>{
      if(!items.length){ panel.style.display='none'; results.innerHTML=''; return; }
      results.innerHTML = items.map((it,idx)=>renderExtSearchItem(it, idx, prefix)).join('');
      _extSearchCaches[prefix] = items;
      panel.style.display = 'block';
    })
    .catch(()=>{ panel.style.display='none'; });
}
function applyExternalResult(prefix, idx){
  const it = (_extSearchCaches[prefix]||[])[idx];
  if(!it) return;
  document.getElementById(`${prefix}-artist`).value = it.artist || '';
  document.getElementById(`${prefix}-title`).value = it.title || '';
  if(it.release) document.getElementById(`${prefix}-release`).value = it.release;
  if(it.duration) document.getElementById(`${prefix}-duration`).value = it.duration;
  // Альбом підставляємо тільки якщо реальний — бекенд уже відфільтрував фейкові "Назва - Single".
  document.getElementById(`${prefix}-album`).value = it.album || '';
  document.getElementById(prefix==='req' ? 'ext-search-panel' : `${prefix}-ext-search-panel`).style.display = 'none';

  // iTunes дає лише один загальний жанр — жанр запитуємо в ШІ тільки для обраної пісні,
  // не для всього списку підказок (щадимо квоту безкоштовного Gemini).
  const genresField = document.getElementById(`${prefix}-genres`);
  const genresHint = document.getElementById(`${prefix}-genres-hint`);
  genresField.value = it.genre || '';
  const originalHint = genresHint.textContent;
  genresHint.textContent = t('extsearch.analyzingGenres');
  genresHint.style.color = 'var(--accent2)';
  const params = new URLSearchParams({ artist: it.artist||'', title: it.title||'', hint: it.genre||'' });
  fetch(`/api/external-search/genres?${params.toString()}`)
    .then(r=>r.ok?r.json():null)
    .then(genreStr=>{
      if(genreStr) genresField.value = genreStr;
    })
    .catch(()=>{})
    .finally(()=>{ genresHint.textContent = originalHint; genresHint.style.color = ''; });
}

function submitRequest(){
  if(!currentUser?.authenticated){alert(t('msg.needLoginForRequest'));login();return;}
  const a=document.getElementById('req-artist').value.trim();
  const t2=document.getElementById('req-title').value.trim();
  const r=document.getElementById('req-release').value;
  const d=document.getElementById('req-duration').value.trim();
  const al=document.getElementById('req-album').value.trim();
  const gr=document.getElementById('req-genres').value.trim();
  if(!a||!t2||!r||!d||!gr){alert(t('msg.fillRequiredFields'));return;}
  const body={artist:a,title:t2,release:r,duration:d,genres:gr.split(',').map(g=>g.trim()).filter(Boolean),albumTitle:al||null};
  const clearReq = () => {
    ['req-artist','req-title','req-release','req-duration','req-album','req-genres'].forEach(i=>document.getElementById(i).value='');
    document.getElementById('ext-search-panel').style.display = 'none';
  };
  const showReqOk = () => { const el=document.getElementById('req-alert');el.classList.add('show');setTimeout(()=>el.classList.remove('show'),3500); };
  fetch('/api/requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
    .then(res=>{
      if(res.status===401){alert(t('msg.needLoginGeneric'));login();return;}
      if(!res.ok){alert(t('msg.errorSubmittingRequest'));return;}
      clearReq(); showReqOk();
    })
    .catch(()=>{ alert(t('msg.connectionError')); });
}

// Підтаби всередині "Адмін-панелі" — перемикають ті самі блоки, що раніше були окремими вкладками навбару.
function switchAdminHubTab(tab){
  document.getElementById('admin-hub-requests-section').style.display = tab==='requests' ? '' : 'none';
  document.getElementById('admin-hub-add-section').style.display = tab==='add' ? '' : 'none';
  document.getElementById('admin-hub-tab-requests').classList.toggle('active', tab==='requests');
  document.getElementById('admin-hub-tab-add').classList.toggle('active', tab==='add');
}
function renderRequests(){
  if(!currentUser?.isAdmin){
    document.getElementById('requests-table-wrap').style.display='none';
    document.getElementById('requests-empty').style.display='block';
    return;
  }
  fetch('/api/requests')
    .then(r=>{
      if(r.status===401||r.status===403){return [];}
      return r.json();
    })
    .catch(()=>[])
    .then(data=>{
      requests=data||[];
      const tbody=document.getElementById('requests-body');
      const wrap=document.getElementById('requests-table-wrap');
      const empty=document.getElementById('requests-empty');
      if(!requests.length){wrap.style.display='none';empty.style.display='block';return;}
      wrap.style.display='block';empty.style.display='none';
      tbody.innerHTML=requests.map((r,i)=>`
        <tr><td class="num-col" data-label="${t('table.number')}">${i+1}</td>
        <td data-label="${t('table.artist')}"><strong>${esc(r.artist)}</strong></td><td data-label="${t('table.title')}">${esc(r.title)}</td>
        <td class="duration-col" data-label="${t('table.release')}">${fmtDate(r.release)}</td><td class="duration-col" data-label="${t('table.duration')}">${r.duration}</td>
        <td data-label="${t('table.genres')}">${r.genres.map(g=>`<span class="badge">${esc(abbrGenre(g))}</span>`).join('')}${r.genreNamesOriginal?`<div style="color:var(--muted);font-size:0.7rem;margin-top:4px;">(${esc(r.genreNamesOriginal)})</div>`:''}</td>
        <td data-label="${t('table.album')}">${r.albumTitle?`<span class="badge album">${esc(r.albumTitle)}</span>`:`<span style="color:var(--muted)">${t('table.single')}</span>`}</td>
        <td class="td-actions" data-label="${t('table.action')}"><div class="actions-td">
          <button class="btn btn-outline" onclick="openEditRequestModal(${r.id})" title="${t('admin.editBtn')}"><svg class="icon"><use href="#icon-pencil"/></svg></button>
          <button class="btn btn-success" onclick="approveRequest(${r.id})">${t('admin.approveBtn')}</button>
          <button class="btn btn-danger" onclick="rejectRequest(${r.id})">${t('admin.rejectBtn')}</button>
        </div></td></tr>`).join('');
    });
}
function approveRequest(id){
  fetch(`/api/requests/${id}/approve`,{method:'POST'})
    .then(r=>{
      if(!r.ok){alert(t('msg.errorApprove'));return;}
      return r.json().then(data=>{
        if(data?.merged) alert(t('msg.approveMerged'));
        loadSongs().then(()=>{renderSongs();updateStats();});
        renderRequests();
      });
    })
    .catch(()=>{ alert(t('msg.connectionError')); });
}
function deleteSong(id){
  if(playerQueue.length&&playerQueue[playerIndex]&&playerQueue[playerIndex].id===id) playerClose();
  fetch(`/api/songs/${id}`,{method:'DELETE'})
    .then(r=>{
      if(r.status===401){alert(t('msg.needLoginAdmin'));return;}
      if(!r.ok){alert(t('msg.errorDelete'));return;}
      loadSongs().then(()=>{renderSongs();updateStats();});
    })
    .catch(()=>{ alert(t('msg.connectionError')); });
}
// Кастомне модальне вікно підтвердження видалення (замість браузерного confirm()).
function confirmDeleteSong(id){
  const song = songs.find(x=>x.id===id);
  const label = song ? `${song.artist} — ${song.title}` : t('modal.deleteDefaultLabel');
  document.getElementById('delete-modal-text').textContent =
    t('modal.deleteBodyTemplate').replace('{label}', label);
  const confirmBtn = document.getElementById('delete-modal-confirm');
  confirmBtn.onclick = function(){
    closeDeleteModal();
    deleteSong(id);
  };
  document.getElementById('delete-modal-overlay').classList.add('open');
}
function closeDeleteModal(){
  document.getElementById('delete-modal-overlay').classList.remove('open');
}
document.getElementById('delete-modal-overlay').addEventListener('click', function(e){
  if(e.target === this) closeDeleteModal();
});

function rejectRequest(id){
  fetch(`/api/requests/${id}`,{method:'DELETE'})
    .then(r=>{if(!r.ok)alert(t('msg.errorReject')); else renderRequests();})
    .catch(()=>{ alert(t('msg.connectionError')); });
}

// ================================================================
// EDIT REQUEST (адмін редагує заявку перед підтвердженням)
// ================================================================
function openEditRequestModal(id){
  const r = requests.find(x=>x.id===id);
  if(!r) return;
  document.getElementById('edit-req-artist').value = r.artist || '';
  document.getElementById('edit-req-title').value = r.title || '';
  document.getElementById('edit-req-release').value = r.release || '';
  document.getElementById('edit-req-duration').value = r.duration || '';
  document.getElementById('edit-req-album').value = r.albumTitle || '';
  document.getElementById('edit-req-genres').value = (r.genres||[]).join(', ');
  document.getElementById('edit-req-youtube').value = r.youtubeVideoId || '';
  document.getElementById('edit-req-ext-search-panel').style.display = 'none';
  _updateEditReqYoutubeLink();
  // Текст заявки — окремий, потенційно важкий ендпоінт (як і в піснях), підвантажуємо лише зараз.
  document.getElementById('edit-req-lyrics').value = '';
  fetch(`/api/requests/${id}/lyrics`).then(r=>r.ok?r.json():null).then(d=>{
    if(d) document.getElementById('edit-req-lyrics').value = d.lyrics || '';
  }).catch(()=>{});
  document.getElementById('edit-request-save-btn').onclick = function(){ saveEditRequest(id); };
  document.getElementById('edit-request-modal-overlay').classList.add('open');
}
// Аналог _updateEditSongYoutubeLink для модалки заявки — окрема функція,
// бо працює з іншими id полів.
function _updateEditReqYoutubeLink(){
  const val = document.getElementById('edit-req-youtube').value.trim();
  const link = document.getElementById('edit-req-youtube-link');
  if(!val){ link.style.display = 'none'; return; }
  link.href = /^https?:\/\//i.test(val) ? val : `https://www.youtube.com/watch?v=${encodeURIComponent(val)}`;
  link.style.display = 'inline-block';
}
function closeEditRequestModal(){
  document.getElementById('edit-request-modal-overlay').classList.remove('open');
}
document.getElementById('edit-request-modal-overlay').addEventListener('click', function(e){
  if(e.target === this) closeEditRequestModal();
});
function saveEditRequest(id){
  const artist = document.getElementById('edit-req-artist').value.trim();
  const title = document.getElementById('edit-req-title').value.trim();
  const release = document.getElementById('edit-req-release').value;
  const duration = document.getElementById('edit-req-duration').value.trim();
  const album = document.getElementById('edit-req-album').value.trim();
  const genres = document.getElementById('edit-req-genres').value.trim();
  // Порожнє поле тут — навмисне очищення (як і в редагуванні пісні), не "залишити як було".
  const youtubeVideoId = document.getElementById('edit-req-youtube').value.trim();
  if(!artist||!title||!release||!duration||!genres){alert(t('msg.fillRequiredFields'));return;}
  const body = {
    artist, title, release, duration,
    genres: genres.split(',').map(g=>g.trim()).filter(Boolean),
    albumTitle: album || null,
    youtubeVideoId
  };
  const lyrics = document.getElementById('edit-req-lyrics').value;
  fetch(`/api/requests/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
    .then(r=>{
      if(!r.ok){alert(t('msg.errorEditRequest'));return;}
      // Окремий ендпоінт, як і для пісень — текст не є частиною основного DTO заявки.
      fetch(`/api/requests/${id}/lyrics`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({lyrics})}).catch(()=>{});
      closeEditRequestModal();
      renderRequests();
    })
    .catch(()=>{ alert(t('msg.connectionError')); });
}

// ================================================================
// EDIT SONG (адмін редагує вже опубліковану пісню в головній таблиці)
// ================================================================
function editCurrentSong(){
  const s = playerQueue[playerIndex];
  if(!s) return;
  openEditSongModal(s.id);
}
function openEditSongModal(id){
  const s = songs.find(x=>x.id===id);
  if(!s) return;
  document.getElementById('edit-song-artist').value = s.artist || '';
  document.getElementById('edit-song-title').value = s.title || '';
  document.getElementById('edit-song-release').value = s.release || '';
  document.getElementById('edit-song-duration').value = s.duration || '';
  document.getElementById('edit-song-album').value = s.album || '';
  document.getElementById('edit-song-genres').value = (s.genres||[]).join(', ');
  document.getElementById('edit-song-youtube').value = s.youtubeVideoId || '';
  _updateEditSongYoutubeLink();
  // Текст пісні не приходить разом з /api/songs (окремий, потенційно важкий
  // ендпоінт) — підвантажуємо лише зараз, при відкритті форми редагування.
  document.getElementById('edit-song-lyrics').value = '';
  fetch(`/api/songs/${id}/lyrics`).then(r=>r.ok?r.json():null).then(d=>{
    if(d) document.getElementById('edit-song-lyrics').value = d.lyrics || '';
  }).catch(()=>{});
  document.getElementById('edit-song-save-btn').onclick = function(){ saveEditSong(id); };
  document.getElementById('edit-song-modal-overlay').classList.add('open');
}
// Оновлює посилання "Переглянути на YouTube" наживо (приймає голий videoId або повний URL).
function _updateEditSongYoutubeLink(){
  const val = document.getElementById('edit-song-youtube').value.trim();
  const link = document.getElementById('edit-song-youtube-link');
  if(!val){ link.style.display = 'none'; return; }
  link.href = /^https?:\/\//i.test(val) ? val : `https://www.youtube.com/watch?v=${encodeURIComponent(val)}`;
  link.style.display = 'inline-block';
}
function closeEditSongModal(){
  document.getElementById('edit-song-modal-overlay').classList.remove('open');
}
document.getElementById('edit-song-modal-overlay').addEventListener('click', function(e){
  if(e.target === this) closeEditSongModal();
});
function saveEditSong(id){
  const artist = document.getElementById('edit-song-artist').value.trim();
  const title = document.getElementById('edit-song-title').value.trim();
  const release = document.getElementById('edit-song-release').value;
  const duration = document.getElementById('edit-song-duration').value.trim();
  const album = document.getElementById('edit-song-album').value.trim();
  const genres = document.getElementById('edit-song-genres').value.trim();
  // Порожнє поле — навмисне очищення кешу, не "залишити як було".
  const youtubeVideoId = document.getElementById('edit-song-youtube').value.trim();
  if(!artist||!title||!release||!duration||!genres){alert(t('msg.fillRequiredFields'));return;}
  const body = {
    artist, title, release, duration,
    genres: genres.split(',').map(g=>g.trim()).filter(Boolean),
    album: album || null,
    youtubeVideoId
  };
  const lyrics = document.getElementById('edit-song-lyrics').value;
  fetch(`/api/songs/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
    .then(r=>{
      if(!r.ok){alert(t('msg.errorEditSong'));return;}
      // Окремий ендпоінт — текст пісні не є частиною основного DTO.
      fetch(`/api/songs/${id}/lyrics`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({lyrics})}).catch(()=>{});
      closeEditSongModal();
      loadSongs().then(()=>{renderSongs();updateStats();});
    })
    .catch(()=>{ alert(t('msg.connectionError')); });
}

function addSong(){
  const a=document.getElementById('add-artist').value.trim();
  const t2=document.getElementById('add-title').value.trim();
  const r=document.getElementById('add-release').value;
  const d=document.getElementById('add-duration').value.trim();
  const al=document.getElementById('add-album').value.trim();
  const gr=document.getElementById('add-genres').value.trim();
  if(!a||!t2||!r||!d||!gr){alert(t('msg.fillRequiredFields'));return;}
  const body={artist:a,title:t2,release:r,duration:d,
    genres:gr.split(',').map(g=>g.trim()).filter(Boolean),album:al||null};
  const clearForm = () => {
    ['add-artist','add-title','add-release','add-duration','add-album','add-genres'].forEach(i=>document.getElementById(i).value='');
    document.getElementById('add-ext-search-panel').style.display = 'none';
  };
  const showOk = () => { const el=document.getElementById('add-alert');el.classList.add('show');setTimeout(()=>el.classList.remove('show'),3500); };
  fetch('/api/songs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
    .then(res=>{
      if(res.status===401||res.status===403){alert(t('msg.needAdminRights'));return;}
      if(!res.ok){alert(t('msg.errorAddSong'));return;}
      clearForm(); showOk();
      loadSongs().then(()=>{renderSongs();updateStats();});
    })
    .catch(()=>{ alert(t('msg.connectionError')); });
}

// ================================================================
// HELPERS
// ================================================================
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
// Скорочення довгих назв жанрів лише для відображення (у базі й фільтрах лишається повна назва).
function abbrGenre(name){return String(name).replace(/alternative/gi,'alt');}

// ================================================================
// THEME (світла/темна)
// ================================================================
const THEME_ICONS = { dark: 'moon', gray: 'contrast', light: 'sun' };
function applyTheme(theme){
  // Тимчасово вимикаємо всі hover-transition, щоб зміна теми клацала миттєво.
  document.documentElement.classList.add('theme-switching');
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.documentElement.classList.remove('theme-switching');
  }));
  const icon = document.getElementById('theme-toggle-icon');
  const label = document.getElementById('theme-toggle-label');
  if(icon) icon.innerHTML = `<svg class="icon"><use href="#icon-${THEME_ICONS[theme] || THEME_ICONS.dark}"/></svg>`;
  if(label){ label.setAttribute('data-i18n', 'theme.' + theme); label.textContent = t('theme.' + theme); }
  document.querySelectorAll('#theme-dropdown [data-theme-option]').forEach(b=>{
    b.classList.toggle('active', b.getAttribute('data-theme-option') === theme);
  });
}
function selectTheme(theme){
  applyTheme(theme);
}
function fmtDate(d){const[y,m,day]=d.split('-');return`${day}.${m}.${y}`;}
function fmtSec(s){s=Math.floor(s||0);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}

// ================================================================
// CONFIG & AUTH
// ================================================================
let currentUser = null;
// Кілька ключів для автоматичної ротації, коли поточний впирається у денний ліміт квоти.
let ytApiKeys = ['AIzaSyD5hFlUEq2bOv7r5XstBHKLUEND8E5ZThA', 'AIzaSyCKI5XDq_JwVrVK5tWjNC0Z9byuPijSLa4'];
let ytApiKeyIdx = 0;

async function initApp() {
  const [cfgRes, meRes] = await Promise.all([
    fetch('/config').then(r=>r.ok?r.json():{}).catch(()=>({})),
    fetch('/auth/me').then(r=>r.ok?r.json():{authenticated:false}).catch(()=>({authenticated:false}))
  ]);
  if(cfgRes.youtubeApiKeys && cfgRes.youtubeApiKeys.length) ytApiKeys = cfgRes.youtubeApiKeys;
  currentUser = meRes;
  if(currentUser?.authenticated){
    try {
      const profile = await fetch('/api/profile').then(r=>r.ok?r.json():null);
      if(profile){ currentUser.displayName = profile.displayName; currentUser.avatarUrl = profile.avatarUrl; }
    } catch(e) {}
  }
  try {
    await loadSongs();
  } catch(e) {
    console.error('loadSongs error:', e);
  }
  renderAuthArea();
  renderSongs();
  await updateStats();
}

function renderAuthArea() {
  const area = document.getElementById('auth-area');
  const isAdmin = currentUser?.isAdmin;
  const authed = currentUser?.authenticated;
  document.body.classList.toggle('admin-mode', !!isAdmin);
  document.body.classList.toggle('authed-mode', !!authed);

  // Show/hide admin tabs
  document.getElementById('nav-admin-hub').style.display = isAdmin ? '' : 'none';
  document.getElementById('nav-request').style.display = authed ? '' : 'none';
  document.getElementById('nav-recommendations').style.display = authed ? '' : 'none';
  // Показ/приховування вкладок зсуває позиції сусідніх — перерахувати індикатор.
  setTimeout(_updateNavIndicator, 0);
  const thAction = document.getElementById('th-action');
  if(thAction) thAction.style.display = isAdmin ? '' : 'none';
  const thFav = document.getElementById('th-fav');
  if(thFav) thFav.style.display = authed ? '' : 'none';
  const adminTools = document.getElementById('admin-tools-row');
  if(adminTools) adminTools.style.display = isAdmin ? 'block' : 'none';
  const btnEditCurrent = document.getElementById('btn-edit-current');
  if(btnEditCurrent) btnEditCurrent.style.display = (isAdmin && playerQueue[playerIndex]) ? '' : 'none';

  if(authed) loadFavoriteIds(); else favoriteIds = new Set();

  if (authed) {
    const avatarSrc = currentUser.avatarUrl || currentUser.picture;
    const pic = avatarSrc
      ? `<img src="${avatarSrc}" style="width:28px;height:28px;border-radius:50%;border:1px solid var(--border);object-fit:cover;">`
      : `<span style="width:28px;height:28px;border-radius:50%;background:var(--surface2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:0.9rem;color:var(--muted);"><svg class="icon"><use href="#icon-user"/></svg></span>`;
    const displayLabel = currentUser.displayName || currentUser.name || currentUser.email || '';
    area.innerHTML = `
      <div class="dropdown" id="notif-dropdown" style="margin-right:0.3rem;">
        <button class="dropdown-toggle" onclick="toggleDropdown(event,'notif-dropdown'); onOpenNotifDropdown();" title="${t('notif.bellTitle')}">
          <svg class="icon"><use href="#icon-bell"/></svg><span id="notif-badge" class="badge" style="display:none;margin-left:2px;"></span>
        </button>
        <div class="dropdown-menu" id="notif-list" style="min-width:300px;max-height:360px;overflow-y:auto;"></div>
      </div>
      <div class="dropdown" id="profile-dropdown">
        <button class="dropdown-toggle" onclick="toggleDropdown(event,'profile-dropdown')" title="${t('nav.profile')}" style="height:auto;padding:0.25rem 0.6rem 0.25rem 0.3rem;">
          ${pic}
          <span style="color:var(--muted);font-size:0.78rem;font-family:var(--font-mono);">${esc(displayLabel)}</span>
        </button>
        <div class="dropdown-menu">
          <button onclick="showPage('profile')" data-i18n="nav.profile">${t('nav.profile')}</button>
          <button onclick="showPage('profile-settings')" data-i18n="nav.profileSettings">${t('nav.profileSettings')}</button>
          <button onclick="showPage('friends')" data-i18n="nav.friends">${t('nav.friends')}</button>
        </div>
      </div>
      ${isAdmin?'<span style="background:var(--accent);color:#0d0d0f;font-size:0.65rem;font-family:var(--font-mono);padding:0.15rem 0.5rem;border-radius:4px;font-weight:700;">ADMIN</span>':''}
      <button onclick="logout()" style="background:none;border:1px solid var(--border);color:var(--muted);border-radius:6px;padding:0.3rem 0.75rem;font-size:0.72rem;font-family:var(--font-mono);cursor:pointer;">${t('auth.logout')}</button>
    `;
    refreshNotifBadge();
  } else {
    area.innerHTML = `
      <button onclick="login()" style="background:var(--accent);border:none;color:#0d0d0f;border-radius:6px;padding:0.35rem 0.9rem;font-size:0.75rem;font-family:var(--font-mono);font-weight:700;cursor:pointer;letter-spacing:0.06em;">
        ${t('auth.loginBtn')}
      </button>
    `;
  }
}

// ================================================================
// СПОВІЩЕННЯ (дзвіночок) — підписки на виконавців
// ================================================================
// Бейдж/список — події виконавців + вхідні запити дружби; запити зникають зі списку при прийнятті/відхиленні.
function refreshNotifBadge(){
  const badge = document.getElementById('notif-badge');
  if(!badge) return;
  Promise.all([
    fetch('/api/notifications?limit=1').then(r=>r.ok?r.json():null).catch(()=>null),
    fetch('/api/friends/requests/incoming').then(r=>r.ok?r.json():[]).catch(()=>[])
  ]).then(([notif, incoming])=>{
    const count = (notif?.unreadCount || 0) + (incoming?.length || 0);
    if(count > 0){ badge.textContent = count > 99 ? '99+' : count; badge.style.display = ''; }
    else { badge.style.display = 'none'; }
  });
}
function _notifEventText(type){
  if(type === 'song_added') return t('notif.event.songAdded');
  if(type === 'song_removed') return t('notif.event.songRemoved');
  if(type === 'lyrics_added') return t('notif.event.lyricsAdded');
  return type;
}
function onOpenNotifDropdown(){
  const list = document.getElementById('notif-list');
  list.innerHTML = `<div style="padding:0.8rem;color:var(--muted);font-size:0.8rem;">${t('notif.loading')}</div>`;
  Promise.all([
    fetch('/api/notifications?limit=30').then(r=>r.ok?r.json():null).catch(()=>null),
    fetch('/api/friends/requests/incoming').then(r=>r.ok?r.json():[]).catch(()=>[])
  ]).then(([d, incoming])=>{
    const recent = d?.recent || [];
    if(!recent.length && !incoming.length){
      list.innerHTML = `<div style="padding:0.8rem;color:var(--muted);font-size:0.8rem;">${t('notif.empty')}</div>`;
      return;
    }
    const incomingHtml = incoming.map(r=>`
      <div style="padding:0.5rem 0.8rem;border-top:1px solid var(--border);cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:8px;" onclick="openUserProfilePage(${r.userId})">
        <div style="font-size:0.8rem;"><strong>${esc(r.displayName)}</strong><div style="font-size:0.72rem;color:var(--muted);">${t('friends.incomingRequestLabel')}</div></div>
        <div style="display:flex;gap:6px;flex-shrink:0;">
          <button class="btn btn-primary" style="font-size:0.7rem;padding:0.25rem 0.55rem;" onclick="event.stopPropagation();acceptFriendRequest(${r.requestId})">${t('friends.acceptBtn')}</button>
          <button class="btn btn-outline" style="font-size:0.7rem;padding:0.25rem 0.55rem;" onclick="event.stopPropagation();cancelOrRejectFriendRequest(${r.requestId})">${t('friends.rejectBtn')}</button>
        </div>
      </div>`).join('');
    const notifHtml = recent.map(n=>`
      <div style="padding:0.5rem 0.8rem;border-top:1px solid var(--border);cursor:pointer;display:flex;justify-content:space-between;align-items:flex-start;gap:8px;" onclick="openArtistPage(${n.artistId})">
        <div>
          <div style="font-size:0.8rem;"><strong>${esc(n.artistName)}</strong> — ${_notifEventText(n.eventType)}</div>
          <div style="font-size:0.75rem;color:var(--muted);">${esc(n.songLabel)}</div>
          <div style="font-size:0.68rem;color:var(--muted);margin-top:2px;">${esc(n.createdAt)}</div>
        </div>
        <button class="btn btn-outline" style="font-size:0.7rem;padding:0.15rem 0.4rem;flex-shrink:0;" title="${t('notif.markOneRead')}" onclick="event.stopPropagation();markOneNotificationRead(${n.id})"><svg class="icon"><use href="#icon-check"/></svg></button>
      </div>`).join('');
    list.innerHTML = `
      ${recent.length ? `<div style="display:flex;justify-content:flex-end;padding:0.3rem 0.5rem;">
        <button class="btn btn-outline" style="font-size:0.7rem;padding:0.25rem 0.6rem;" onclick="markAllNotificationsRead()">${t('notif.markAllRead')}</button>
      </div>` : ''}
      ${incomingHtml}${notifHtml}
    `;
  });
}
function markAllNotificationsRead(){
  fetch('/api/notifications/mark-read', { method:'POST' }).then(()=>{ refreshNotifBadge(); onOpenNotifDropdown(); }).catch(()=>{});
}
function markOneNotificationRead(eventId){
  fetch(`/api/notifications/${eventId}/mark-read`, { method:'POST' }).then(()=>{ refreshNotifBadge(); onOpenNotifDropdown(); }).catch(()=>{});
}

function login() { window.location.href = '/auth/login'; }

async function loadSongs() {
  const res = await fetch('/api/songs');
  if (!res.ok) throw new Error('songs fetch failed');
  songs = await res.json();
}

async function logout() {
  await fetch('/auth/logout', {method:'POST'});
  currentUser = {authenticated:false};
  renderAuthArea();
  // Go to home, re-render
  showPage('home');
}

// ================================================================
// PLAYER
// ================================================================
let ytPlayer=null,ytReady=false;
let playerQueue=[],playerIndex=0;
// Прапорець "пісню вже зараховано як прослухану" — скидається при переключенні на нову пісню.
let listenLogged=false;
// userIntendedPlaying: чи музика МАЄ грати за наміром користувача — відрізняє реальний
// play/pause від технічних onStateChange під час синхронізації відео-попапу.
let userIntendedPlaying=true;
let ticker=null,pendingVid=null;
let shuffle=false,repeat=false,seekDrag=false;
// Гучність зберігається в localStorage — інакше плеєр щоразу стартував на 80%.
const _savedVol = localStorage.getItem('volume');
let vol = _savedVol !== null ? parseInt(_savedVol) : 80;

function onYouTubeIframeAPIReady(){
  ytPlayer=new YT.Player('yt-iframe',{
    height:'1',width:'1',
    playerVars:{autoplay:0,controls:0},
    events:{
      onReady:()=>{
        ytReady=true;
        ytPlayer.setVolume(vol);
        if(pendingVid){_load(pendingVid);pendingVid=null;}
      },
      onStateChange:onState
    }
  });
}

function onState(e){
  const S=YT.PlayerState;
  if(e.data===S.PLAYING){
    userIntendedPlaying=true;
    setPP(true);startTick();setLoad(false);setEQ(true);
    document.getElementById('p-dur').textContent=fmtSec(ytPlayer.getDuration());
    renderSongs();
    // Попап може бути відкритий, а відео там на паузі (плеєр відновили не через попап) — доганяємо.
    if(videoPopupOpen && popupPlayer && popupReady){
      try{ if(popupPlayer.getPlayerState()!==S.PLAYING) popupPlayer.playVideo(); }catch(ex){}
    }
  }else if(e.data===S.PAUSED){
    userIntendedPlaying=false;
    setPP(false);stopTick();setEQ(false);renderSongs();
    // Пауза на панелі має ставити на паузу й відео в попапі, інакше воно "оживить" звук назад.
    if(videoPopupOpen && popupPlayer && popupReady){
      try{ if(popupPlayer.getPlayerState()===S.PLAYING) popupPlayer.pauseVideo(); }catch(ex){}
    }
  }else if(e.data===S.ENDED){
    setPP(false);stopTick();setEQ(false);
    if(repeat){ytPlayer.seekTo(0);ytPlayer.playVideo();}
    else playerNext();
  }else if(e.data===S.BUFFERING){
    setLoad(true);
  }
}

function playSong(id){
  playerQueue=(displayedSongs.length?displayedSongs:songs).slice();
  playerIndex=playerQueue.findIndex(s=>s.id===id);
  if(playerIndex<0)playerIndex=0;
  _loadCurrent();
}

// Якщо клікнута пісня вже завантажена — перемикаємо пауза/відтворення замість перезапуску черги.
function toggleOrPlay(id, playFn){
  const curId = playerQueue.length && playerQueue[playerIndex] ? playerQueue[playerIndex].id : null;
  if(curId === id) playerToggle();
  else playFn(id);
}

// playerQueue обмежуємо піснями плейлиста — next/prev/shuffle працюють лише в його межах.
let currentPlaylistSongs = [];
function playFromPlaylist(id){
  if(!currentPlaylistSongs.length) return;
  playerQueue=currentPlaylistSongs.slice();
  playerIndex=playerQueue.findIndex(s=>s.id===id);
  if(playerIndex<0)playerIndex=0;
  _loadCurrent();
}
function playPlaylistFromStart(){
  if(!currentPlaylistSongs.length) return;
  playFromPlaylist(currentPlaylistSongs[0].id);
}

// ================================================================
// БАТЛ РОЯЛЬ: одиночне вибування з плейлиста (16/32/64 учасників)
// ================================================================
const BATTLE_SIZES = [16, 32, 64];
let battleRound = [];    // пісні поточного раунду (парна кількість, i та i+1 — пара)
let battleWinners = [];  // переможці поточного раунду, стають battleRound наступного
let battleMatchIndex = 0;
let battleLeftPlayer = null, battleRightPlayer = null;
let battlePlayersReady = false;
let battleHoverModeActive = false;

// Сторінка "Батл рояль" у навбарі: власні плейлисти (якщо залогінені) + публічні чужі.
function openBattlePage(){
  const ownSection = document.getElementById('battle-page-own-login-hint');
  const ownEmpty = document.getElementById('battle-page-own-empty');
  const ownList = document.getElementById('battle-page-own-list');
  if(currentUser?.authenticated){
    ownSection.style.display = 'none';
    fetch('/api/playlists').then(r=>r.ok?r.json():[]).then(list=>{
      ownEmpty.style.display = list.length ? 'none' : '';
      ownList.innerHTML = list.map(p=>`
        <div class="ext-search-item" onclick="startBattleFromPlaylist(${p.id})">
          <div class="es-main"><strong>${esc(p.name)}</strong><span>${p.songCount} ${t('profile.songsWord')}</span>${p.isPublic?`<span class="badge">${t('battle.publicBadge')}</span>`:''}</div>
        </div>`).join('');
    }).catch(()=>{});
  } else {
    ownSection.style.display = '';
    ownEmpty.style.display = 'none';
    ownList.innerHTML = '';
  }
  fetch('/api/playlists/public').then(r=>r.ok?r.json():[]).then(list=>{
    document.getElementById('battle-page-public-empty').style.display = list.length ? 'none' : '';
    document.getElementById('battle-page-public-list').innerHTML = list.map(p=>`
      <div class="ext-search-item" onclick="startBattleFromPlaylist(${p.id})">
        <div class="es-main"><strong>${esc(p.name)}</strong><span>${p.songCount} ${t('profile.songsWord')} — ${esc(p.ownerLabel)}</span></div>
      </div>`).join('');
  }).catch(()=>{});
}
// currentPlaylistSongs — той самий "поточний плейлист", яким користується і сторінка плейлиста.
function startBattleFromPlaylist(id){
  fetch(`/api/playlists/${id}`).then(r=>r.ok?r.json():null).then(p=>{
    if(!p) return;
    currentPlaylistId = id;
    currentPlaylistSongs = p.songs;
    openBattleSetup();
  }).catch(()=>{ alert(t('msg.connectionError')); });
}

// ================================================================
// ВИКОНАВЦІ: каталог, пошук, сторінка виконавця з дискографією й підпискою
// ================================================================
let artistsSearchTimer = null;
function onArtistsSearchInput(){
  clearTimeout(artistsSearchTimer);
  artistsSearchTimer = setTimeout(loadArtistsPage, 350);
}
function loadArtistsPage(){
  const q = document.getElementById('artists-search').value.trim();
  fetch(`/api/artists${q ? '?q=' + encodeURIComponent(q) : ''}`).then(r=>r.ok?r.json():[]).then(list=>{
    document.getElementById('artists-empty').style.display = list.length ? 'none' : '';
    document.getElementById('artists-list').innerHTML = list.map(a=>`
      <div class="ext-search-item" onclick="openArtistPage(${a.id})">
        <div class="es-main"><strong>${esc(a.name)}</strong><span>${a.songCount} ${t('artists.songsWord')}</span></div>
      </div>`).join('');
  }).catch(()=>{});
}
let currentArtistId = null;
let currentArtistSongs = [];
function openArtistPage(id){
  currentArtistId = id;
  showPage('artist');
}
function loadArtistPage(){
  const id = currentArtistId;
  if(id == null) return;
  document.getElementById('artist-content').style.display = 'none';
  document.getElementById('artist-not-found').style.display = 'none';
  fetch(`/api/artists/${id}`).then(r=>r.ok?r.json():null).then(a=>{
    if(!a){ document.getElementById('artist-not-found').style.display = ''; return; }
    document.getElementById('artist-content').style.display = '';
    document.getElementById('artist-name').textContent = a.name;
    document.getElementById('artist-follower-count').textContent = `${a.followerCount} ${t('artist.followers')}`;
    const btn = document.getElementById('artist-follow-btn');
    btn.innerHTML = a.isFollowing ? `<svg class="icon"><use href="#icon-check"/></svg> ${esc(t('artist.unfollowBtn'))}` : esc(t('artist.followBtn'));
    btn.classList.toggle('active', !!a.isFollowing);
    btn.style.display = currentUser?.authenticated ? '' : 'none';

    fetch(`/api/artists/${id}/songs`).then(r=>r.ok?r.json():[]).then(songs=>{
      currentArtistSongs = songs;
      document.getElementById('artist-songs-body').innerHTML = songs.map(s=>`
        <tr>
          <td class="td-icon-lead" data-label=""><button class="btn-icon-fav" onclick="toggleOrPlay(${s.id}, playFromArtist)" title="${t('profile.playBtn')}">
            <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>
          </button></td>
          <td data-label="${t('table.artist')}"><strong>${esc(s.artist)}</strong></td>
          <td data-label="${t('table.title')}">${esc(s.title)}</td>
          <td data-label="${t('table.genres')}">${s.genres.map(g=>`<span class="badge">${esc(abbrGenre(g))}</span>`).join('')}</td>
        </tr>`).join('');
    }).catch(()=>{});
  }).catch(()=>{ document.getElementById('artist-not-found').style.display = ''; });
}
function playFromArtist(id){
  if(!currentArtistSongs.length) return;
  playerQueue = currentArtistSongs.slice();
  playerIndex = playerQueue.findIndex(s=>s.id===id);
  if(playerIndex<0) playerIndex = 0;
  _loadCurrent();
}
function toggleArtistFollow(){
  if(!currentUser?.authenticated){ login(); return; }
  const id = currentArtistId;
  if(id == null) return;
  const btn = document.getElementById('artist-follow-btn');
  const wasFollowing = btn.classList.contains('active');
  const method = wasFollowing ? 'DELETE' : 'POST';
  fetch(`/api/artists/${id}/follow`, { method })
    .then(r=>{ if(r.ok) loadArtistPage(); else alert(t('msg.connectionError')); })
    .catch(()=>{ alert(t('msg.connectionError')); });
}

// ================================================================
// ДРУЗІ: пошук людей, вхідні/надіслані запити, список друзів
// ================================================================
let friendsSearchTimer = null;
function onFriendsSearchInput(){
  clearTimeout(friendsSearchTimer);
  friendsSearchTimer = setTimeout(runFriendsSearch, 350);
}
function _friendActionButtonHtml(u){
  if(u.relationshipStatus === 'friends')
    return `<button class="btn btn-outline active" onclick="event.stopPropagation();unfriendUser(${u.userId})"><svg class="icon"><use href="#icon-check"/></svg> ${esc(t('friends.friendsBadge'))}</button>`;
  if(u.relationshipStatus === 'pending_outgoing')
    return `<button class="btn btn-outline" onclick="event.stopPropagation();alert('${esc(t('friends.pendingLabel'))}')" title="${t('friends.pendingLabel')}">${t('friends.pendingLabel')}</button>`;
  if(u.relationshipStatus === 'pending_incoming')
    return `<button class="btn btn-primary" onclick="event.stopPropagation();acceptFriendRequestFromUser(${u.userId})">${t('friends.acceptBtn')}</button>`;
  return `<button class="btn btn-primary" onclick="event.stopPropagation();sendFriendRequest(${u.userId})">${t('friends.addBtn')}</button>`;
}
function runFriendsSearch(){
  const q = document.getElementById('friends-search').value.trim();
  const wrap = document.getElementById('friends-search-results');
  const empty = document.getElementById('friends-search-empty');
  if(!q){ wrap.innerHTML = ''; empty.style.display = 'none'; return; }
  fetch(`/api/users/search?q=${encodeURIComponent(q)}`).then(r=>r.ok?r.json():[]).then(list=>{
    empty.style.display = list.length ? 'none' : '';
    wrap.innerHTML = list.map(u=>`
      <div class="ext-search-item" onclick="openUserProfilePage(${u.userId})">
        <div class="es-main"><strong>${esc(u.displayName)}</strong></div>
        ${_friendActionButtonHtml(u)}
      </div>`).join('');
  }).catch(()=>{});
}
function loadFriendsPage(){
  if(!currentUser?.authenticated){ showPage('home'); login(); return; }
  document.getElementById('friends-search').value = '';
  document.getElementById('friends-search-results').innerHTML = '';

  fetch('/api/friends/requests/incoming').then(r=>r.ok?r.json():[]).then(list=>{
    document.getElementById('friends-incoming-empty').style.display = list.length ? 'none' : '';
    document.getElementById('friends-incoming-list').innerHTML = list.map(r=>`
      <div class="ext-search-item" onclick="openUserProfilePage(${r.userId})">
        <div class="es-main"><strong>${esc(r.displayName)}</strong></div>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-primary" onclick="event.stopPropagation();acceptFriendRequest(${r.requestId})">${t('friends.acceptBtn')}</button>
          <button class="btn btn-outline" onclick="event.stopPropagation();cancelOrRejectFriendRequest(${r.requestId})">${t('friends.rejectBtn')}</button>
        </div>
      </div>`).join('');
  }).catch(()=>{});

  fetch('/api/friends/requests/outgoing').then(r=>r.ok?r.json():[]).then(list=>{
    document.getElementById('friends-outgoing-empty').style.display = list.length ? 'none' : '';
    document.getElementById('friends-outgoing-list').innerHTML = list.map(r=>`
      <div class="ext-search-item" onclick="openUserProfilePage(${r.userId})">
        <div class="es-main"><strong>${esc(r.displayName)}</strong></div>
        <button class="btn btn-outline" onclick="event.stopPropagation();cancelOrRejectFriendRequest(${r.requestId})">${t('friends.cancelBtn')}</button>
      </div>`).join('');
  }).catch(()=>{});

  fetch('/api/friends').then(r=>r.ok?r.json():[]).then(list=>{
    document.getElementById('friends-list-empty').style.display = list.length ? 'none' : '';
    document.getElementById('friends-list').innerHTML = list.map(u=>`
      <div class="ext-search-item" onclick="openUserProfilePage(${u.userId})">
        <div class="es-main"><strong>${esc(u.displayName)}</strong></div>
        <button class="btn btn-outline" onclick="event.stopPropagation();unfriendUser(${u.userId})">${t('friends.unfriendBtn')}</button>
      </div>`).join('');
  }).catch(()=>{});
}
function sendFriendRequest(targetUserId){
  fetch('/api/friends/requests', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ targetUserId }) })
    .then(r=>{ if(r.ok){ runFriendsSearch(); if(document.getElementById('page-friends').classList.contains('active')) loadFriendsPage(); if(currentProfileUserId===targetUserId) loadUserProfilePage(); } else alert(t('msg.connectionError')); })
    .catch(()=>{ alert(t('msg.connectionError')); });
}
function acceptFriendRequest(requestId){
  fetch(`/api/friends/requests/${requestId}/accept`, { method:'POST' })
    .then(r=>{ if(r.ok){ loadFriendsPage(); refreshNotifBadge(); onOpenNotifDropdown(); } else alert(t('msg.connectionError')); })
    .catch(()=>{ alert(t('msg.connectionError')); });
}
function acceptFriendRequestFromUser(userId){
  // Пошук людей не знає requestId (лише статус) — знаходимо його через вхідні запити.
  fetch('/api/friends/requests/incoming').then(r=>r.ok?r.json():[]).then(list=>{
    const req = list.find(r=>r.userId===userId);
    if(req) acceptFriendRequest(req.requestId);
  }).catch(()=>{});
}
function cancelOrRejectFriendRequest(requestId){
  fetch(`/api/friends/requests/${requestId}`, { method:'DELETE' })
    .then(()=>{ loadFriendsPage(); refreshNotifBadge(); onOpenNotifDropdown(); if(currentProfileUserId!=null) loadUserProfilePage(); })
    .catch(()=>{});
}
function unfriendUser(userId){
  fetch(`/api/friends/${userId}`, { method:'DELETE' })
    .then(()=>{ loadFriendsPage(); if(currentProfileUserId===userId) loadUserProfilePage(); })
    .catch(()=>{});
}

// ================================================================
// ПУБЛІЧНИЙ ПРОФІЛЬ іншого користувача
// ================================================================
let currentProfileUserId = null;
function openUserProfilePage(userId){
  currentProfileUserId = userId;
  showPage('user-profile');
}
function loadUserProfilePage(){
  const id = currentProfileUserId;
  if(id == null) return;
  document.getElementById('user-profile-content').style.display = 'none';
  document.getElementById('user-profile-not-found').style.display = 'none';
  fetch(`/api/users/${id}`).then(r=>r.ok?r.json():null).then(u=>{
    if(!u){ document.getElementById('user-profile-not-found').style.display = ''; return; }
    document.getElementById('user-profile-content').style.display = '';
    document.getElementById('user-profile-name').textContent = u.displayName;
    document.getElementById('user-profile-member-since').textContent = u.memberSince ? `${t('profile.public.memberSince')} ${u.memberSince}` : '';
    const img = document.getElementById('user-profile-avatar');
    const ph = document.getElementById('user-profile-avatar-ph');
    if(u.avatarUrl){ img.src = u.avatarUrl; img.style.display = ''; ph.style.display = 'none'; }
    else { img.style.display = 'none'; ph.style.display = ''; }

    document.getElementById('user-profile-stat-listened').textContent = u.totalListened ?? 0;
    document.getElementById('user-profile-stat-favorites').textContent = u.favoritesCount ?? 0;
    document.getElementById('user-profile-stat-playlists').textContent = (u.publicPlaylists || []).length;

    const genresWrap = document.getElementById('user-profile-top-genres-wrap');
    if(u.topGenres && u.topGenres.length){
      genresWrap.style.display = '';
      document.getElementById('user-profile-top-genres').innerHTML = u.topGenres.map(g=>`<span class="badge">${esc(abbrGenre(g))}</span>`).join('');
    } else {
      genresWrap.style.display = 'none';
    }

    const plEmpty = document.getElementById('user-profile-playlists-empty');
    const plList = document.getElementById('user-profile-playlists-list');
    const playlists = u.publicPlaylists || [];
    plEmpty.style.display = playlists.length ? 'none' : '';
    plList.innerHTML = playlists.map(p=>`
      <div class="ext-search-item" onclick="openPlaylist(${p.id})">
        <div class="es-main"><strong>${esc(p.name)}</strong><span>${p.songCount} ${t('profile.songsWord')}</span></div>
      </div>`).join('');

    const btn = document.getElementById('user-profile-action-btn');
    if(u.relationshipStatus === 'self'){
      btn.style.display = 'none';
    } else if(u.relationshipStatus === 'friends'){
      btn.style.display = ''; btn.className = 'btn btn-outline active'; btn.textContent = t('friends.unfriendBtn');
      btn.onclick = () => unfriendUser(id);
    } else if(u.relationshipStatus === 'pending_outgoing'){
      btn.style.display = ''; btn.className = 'btn btn-outline'; btn.textContent = t('friends.cancelBtn');
      btn.onclick = () => { fetch('/api/friends/requests/outgoing').then(r=>r.ok?r.json():[]).then(list=>{
        const req = list.find(r=>r.userId===id); if(req) cancelOrRejectFriendRequest(req.requestId);
      }); };
    } else if(u.relationshipStatus === 'pending_incoming'){
      btn.style.display = ''; btn.className = 'btn btn-primary'; btn.textContent = t('friends.acceptBtn');
      btn.onclick = () => acceptFriendRequestFromUser(id);
    } else {
      btn.style.display = ''; btn.className = 'btn btn-primary'; btn.textContent = t('friends.addBtn');
      btn.onclick = () => sendFriendRequest(id);
    }
  }).catch(()=>{ document.getElementById('user-profile-not-found').style.display = ''; });
}
function onUserProfileActionClick(){ /* onclick встановлюється динамічно в loadUserProfilePage() */ }

function openBattleSetup(){
  const count = currentPlaylistSongs.length;
  const sizes = BATTLE_SIZES.filter(sz => count >= sz);
  const body = document.getElementById('battle-setup-body');
  if(!sizes.length){
    body.innerHTML = `<div class="modal-body-text">${t('battle.notEnough')}</div>`;
  } else {
    body.innerHTML = `<div class="modal-body-text">${t('battle.chooseSize')}</div>
      <div style="display:flex;gap:10px;justify-content:center;margin-bottom:6px;flex-wrap:wrap;">
        ${sizes.map(sz=>`<button type="button" class="btn btn-outline" onclick="startBattleRoyale(${sz})">${sz}</button>`).join('')}
      </div>`;
  }
  document.getElementById('battle-setup-modal-overlay').classList.add('open');
}
function closeBattleSetup(){
  document.getElementById('battle-setup-modal-overlay').classList.remove('open');
}

function startBattleRoyale(size){
  if(typeof YT === 'undefined' || !YT.Player){
    // YouTube IFrame API міг ще не підвантажитись — пробуємо ще раз за секунду.
    setTimeout(()=>startBattleRoyale(size), 1000);
    return;
  }
  closeBattleSetup();
  battleRound = _shuffledCopy(currentPlaylistSongs).slice(0, size);
  battleWinners = [];
  battleMatchIndex = 0;
  // Ставимо головний плеєр на паузу на час турніру — щоб не було потрійного звуку.
  if(ytPlayer && ytReady){ try{ ytPlayer.pauseVideo(); }catch(e){} }
  document.getElementById('battle-champion').style.display = 'none';
  document.getElementById('battle-split').style.display = 'flex';
  document.getElementById('battle-modal-overlay').classList.add('open');
  _ensureBattlePlayers(()=>{ loadBattleMatch(); });
}

// YT.Player створюємо один раз і перевикористовуємо між матчами — перестворення
// iframe на кожен матч повільніше й дає спалахи "чорного екрана".
function _ensureBattlePlayers(cb){
  if(battlePlayersReady){
    // Слухачі наведення теж вішаємо лише один раз тут, інакше накопичувались би з кожним матчем.
    cb();
    return;
  }
  let readyCount = 0;
  function onEither(){ readyCount++; if(readyCount===2){ battlePlayersReady=true; _wireBattleHoverListeners(); cb(); } }
  // autoplay:0 + cueVideoById нижче — обидва відео лежать на паузі на початку раунду.
  // mute:0 — звук керується тим самим повзунком гучності, що й в основному плеєрі.
  battleLeftPlayer = new YT.Player('battle-yt-a', {
    height:'100%', width:'100%',
    playerVars:{autoplay:0, controls:1, mute:0},
    events:{ onReady:onEither, onStateChange: e => _onBattleStateChange('a', e) }
  });
  battleRightPlayer = new YT.Player('battle-yt-b', {
    height:'100%', width:'100%',
    playerVars:{autoplay:0, controls:1, mute:0},
    events:{ onReady:onEither, onStateChange: e => _onBattleStateChange('b', e) }
  });
}

function _onBattleStateChange(side, e){
  // cueVideoById скидає гучність/mute асинхронно ПІСЛЯ повернення виклику — тому
  // застосовуємо unMute/setVolume тут, коли CUED справді настав, а не одразу за cueVideoById.
  if(e.data === YT.PlayerState.CUED){
    try{ e.target.unMute(); e.target.setVolume(vol); }catch(err){}
  }
  // Двоє одночасно не мають грати: щойно один переходить у PLAYING — ставимо другий на паузу.
  if(e.data !== YT.PlayerState.PLAYING) return;
  const other = side === 'a' ? battleRightPlayer : battleLeftPlayer;
  try{ other && other.pauseVideo(); }catch(err){}
}

// "Режим наведення": навів курсор на відео — грає, вивів — пауза.
function toggleBattleHoverMode(){
  battleHoverModeActive = !battleHoverModeActive;
  document.getElementById('battle-hover-toggle-btn').classList.toggle('active', battleHoverModeActive);
}
function _wireBattleHoverListeners(){
  const wrapA = document.querySelector('#battle-yt-a').closest('.battle-video-wrap');
  const wrapB = document.querySelector('#battle-yt-b').closest('.battle-video-wrap');
  const wire = (wrap, getPlayer) => {
    wrap.addEventListener('mouseenter', () => {
      if(!battleHoverModeActive) return;
      try{ getPlayer().playVideo(); }catch(e){}
    });
    wrap.addEventListener('mouseleave', () => {
      if(!battleHoverModeActive) return;
      try{ getPlayer().pauseVideo(); }catch(e){}
    });
  };
  wire(wrapA, () => battleLeftPlayer);
  wire(wrapB, () => battleRightPlayer);
}

async function loadBattleMatch(){
  const a = battleRound[battleMatchIndex*2];
  const b = battleRound[battleMatchIndex*2+1];
  document.getElementById('battle-round-label').textContent =
    `${t('battle.roundLabel')}${battleRound.length} → ${battleRound.length/2}`;
  document.getElementById('battle-a-artist').textContent = a.artist;
  document.getElementById('battle-a-title').textContent = a.title;
  document.getElementById('battle-b-artist').textContent = b.artist;
  document.getElementById('battle-b-title').textContent = b.title;
  document.getElementById('battle-a-notfound').style.display = 'none';
  document.getElementById('battle-b-notfound').style.display = 'none';

  const [vidA, vidB] = await Promise.all([_resolveBattleVid(a), _resolveBattleVid(b)]);
  _loadBattleSide(battleLeftPlayer, 'battle-a-notfound', vidA);
  _loadBattleSide(battleRightPlayer, 'battle-b-notfound', vidB);
}

async function _resolveBattleVid(song){
  if(song.youtubeVideoId) return song.youtubeVideoId;
  const vid = await fetchVid(song.artist, song.title);
  if(vid) _cacheYoutubeVideo(song.id, vid);
  return vid;
}

function _loadBattleSide(player, notFoundElId, vid){
  if(!vid){
    document.getElementById(notFoundElId).style.display = 'block';
    return;
  }
  // cueVideoById (не loadVideoById!) — завантажує кадр і лишає на паузі.
  player.cueVideoById(vid);
  // Початкова гучність — та сама, що в основному плеєрі (глобальна змінна vol).
  player.unMute();
  player.setVolume(vol);
}

function chooseBattleWinner(side){
  const winner = battleRound[battleMatchIndex*2 + side];
  battleWinners.push(winner);
  battleMatchIndex++;
  if(battleMatchIndex*2 >= battleRound.length){
    if(battleWinners.length === 1){
      showBattleChampion(battleWinners[0]);
      return;
    }
    battleRound = battleWinners;
    battleWinners = [];
    battleMatchIndex = 0;
  }
  loadBattleMatch();
}

function showBattleChampion(song){
  try{ battleLeftPlayer && battleLeftPlayer.pauseVideo(); }catch(e){}
  try{ battleRightPlayer && battleRightPlayer.pauseVideo(); }catch(e){}
  document.getElementById('battle-champion-artist').textContent = song.artist;
  document.getElementById('battle-champion-title').textContent = song.title;
  document.getElementById('battle-split').style.display = 'none';
  document.getElementById('battle-champion').style.display = 'block';
}

function closeBattle(){
  document.getElementById('battle-modal-overlay').classList.remove('open');
  try{ battleLeftPlayer && battleLeftPlayer.stopVideo(); }catch(e){}
  try{ battleRightPlayer && battleRightPlayer.stopVideo(); }catch(e){}
}
document.getElementById('battle-modal-overlay').addEventListener('click', function(e){
  if(e.target === this) closeBattle();
});
document.getElementById('battle-setup-modal-overlay').addEventListener('click', function(e){
  if(e.target === this) closeBattleSetup();
});

// ================================================================
// ГРАФ СХОЖОСТІ: композиції / жанри / альбоми / сингли
// ================================================================
// Лінії малюємо лише для помітної схожості — інакше при N≈300+ вузлів вийшла б суцільна павутина.
const GRAPH_SIM_THRESHOLD = 0.15;
let _graphItems = [], _graphOnClick = null, _graphLabelFn = null, _graphAdj = [];
let _graphView = { x: 0, y: 0, scale: 1 };
let _graphHoveredIndex = null;
let _graphDragging = false, _graphDragStart = null;

function _graphApplyView(){
  const vp = document.getElementById('graph-viewport');
  if(vp) vp.setAttribute('transform', `translate(${_graphView.x},${_graphView.y}) scale(${_graphView.scale})`);
}
function _graphResetView(){
  _graphView = { x: 0, y: 0, scale: 1 };
  _graphApplyView();
}
function _graphZoomAt(px, py, factor){
  const newScale = Math.min(6, Math.max(0.4, _graphView.scale*factor));
  const f = newScale/_graphView.scale;
  _graphView.x = px - (px-_graphView.x)*f;
  _graphView.y = py - (py-_graphView.y)*f;
  _graphView.scale = newScale;
  _graphApplyView();
}
function _graphZoomBy(factor){
  const svg = document.getElementById('graph-svg');
  _graphZoomAt(svg.clientWidth/2, svg.clientHeight/2, factor);
}
(function(){
  const wrap = document.getElementById('graph-canvas-wrap');
  wrap.addEventListener('wheel', function(e){
    e.preventDefault();
    const rect = wrap.getBoundingClientRect();
    _graphZoomAt(e.clientX-rect.left, e.clientY-rect.top, e.deltaY < 0 ? 1.15 : 1/1.15);
  }, { passive: false });
  wrap.addEventListener('mousedown', function(e){
    _graphDragging = true;
    _graphDragStart = { x: e.clientX, y: e.clientY, vx: _graphView.x, vy: _graphView.y };
    wrap.classList.add('panning');
  });
  window.addEventListener('mousemove', function(e){
    if(_graphDragging){
      _graphView.x = _graphDragStart.vx + (e.clientX-_graphDragStart.x);
      _graphView.y = _graphDragStart.vy + (e.clientY-_graphDragStart.y);
      _graphApplyView();
    }
    if(_graphHoveredIndex !== null){
      const rect = wrap.getBoundingClientRect();
      const tip = document.getElementById('graph-tooltip');
      tip.style.left = (e.clientX-rect.left) + 'px';
      tip.style.top = (e.clientY-rect.top) + 'px';
    }
  });
  window.addEventListener('mouseup', function(){
    _graphDragging = false;
    wrap.classList.remove('panning');
  });
})();
function _graphNodeHover(i){
  _graphHoveredIndex = i;
  document.getElementById('graph-svg').classList.add('has-hover');
  const nodeEls = document.querySelectorAll('#graph-viewport .graph-node');
  nodeEls[i]?.classList.add('hl');
  (_graphAdj[i] || []).forEach(j => nodeEls[j]?.classList.add('hl'));
  document.querySelectorAll('#graph-viewport .graph-edge').forEach(el => {
    if(+el.dataset.i === i || +el.dataset.j === i) el.classList.add('hl');
  });
  const tip = document.getElementById('graph-tooltip');
  tip.textContent = (_graphLabelFn && _graphItems[i]) ? _graphLabelFn(_graphItems[i]) : '';
  tip.classList.add('show');
}
function _graphNodeUnhover(){
  _graphHoveredIndex = null;
  document.getElementById('graph-svg').classList.remove('has-hover');
  document.querySelectorAll('#graph-viewport .hl').forEach(el => el.classList.remove('hl'));
  document.getElementById('graph-tooltip').classList.remove('show');
}

function _jaccard(setA, setB){
  if(!setA.size && !setB.size) return 0;
  let inter = 0;
  for(const x of setA) if(setB.has(x)) inter++;
  const union = setA.size + setB.size - inter;
  return union ? inter/union : 0;
}
function _genreSet(song){ return new Set(song.genres.map(g=>g.toLowerCase())); }

function openSimilarityGraph(kind){
  let items, simFn, labelFn, colorFn, onClickFn, titleKey;

  if(kind === 'songs'){
    items = songs;
    const sets = items.map(_genreSet);
    simFn = (i,j) => _jaccard(sets[i], sets[j]);
    labelFn = s => `${s.artist} — ${s.title}`;
    colorFn = (s,i) => WHEEL_COLORS[i % WHEEL_COLORS.length];
    onClickFn = s => { closeGraph(); playSong(s.id); };
    titleKey = 'graph.titleSongs';
  } else if(kind === 'genres'){
    const genreNames = [...new Set(songs.flatMap(s=>s.genres))];
    // Схожість жанрів = наскільки часто вони зустрічаються РАЗОМ у тих самих піснях.
    const songIdSets = genreNames.map(g => new Set(songs.filter(s=>s.genres.includes(g)).map(s=>s.id)));
    items = genreNames;
    simFn = (i,j) => _jaccard(songIdSets[i], songIdSets[j]);
    labelFn = g => abbrGenre(g);
    colorFn = (g,i) => WHEEL_COLORS[i % WHEEL_COLORS.length];
    onClickFn = g => { closeGraph(); showPage('home'); document.getElementById('filter-genre').value = g; renderSongs(); };
    titleKey = 'graph.titleGenres';
  } else { // 'albums' | 'singles'
    let groups;
    if(kind === 'albums'){
      const map = new Map();
      songs.forEach(s=>{
        if(!s.album) return;
        if(!map.has(s.album)) map.set(s.album, { name: s.album, songs: [], artists: new Set() });
        const g = map.get(s.album);
        g.songs.push(s); g.artists.add(s.artist);
      });
      groups = [...map.values()];
    } else {
      groups = songs.filter(s=>!s.album).map(s => ({ name: `${s.artist} — ${s.title}`, songs: [s], artists: new Set([s.artist]) }));
    }
    items = groups;
    const genreSets = groups.map(g => {
      const set = new Set();
      g.songs.forEach(s => s.genres.forEach(gn => set.add(gn.toLowerCase())));
      return set;
    });
    // Схожість альбомів/синглів: насамперед жанровий профіль, той самий виконавець — лише другорядний бонус.
    simFn = (i,j) => {
      const genreSim = _jaccard(genreSets[i], genreSets[j]);
      const a1 = groups[i].artists, a2 = groups[j].artists;
      const sameArtist = (a1.size===1 && a2.size===1 && [...a1][0]===[...a2][0]) ? 1 : 0;
      return genreSim*0.8 + sameArtist*0.2;
    };
    labelFn = g => g.name;
    colorFn = (g,i) => WHEEL_COLORS[i % WHEEL_COLORS.length];
    onClickFn = kind === 'albums'
      ? g => { closeGraph(); showPage('home'); document.getElementById('search').value = g.name; renderSongs(); }
      : g => { closeGraph(); playSong(g.songs[0].id); };
    titleKey = kind === 'albums' ? 'graph.titleAlbums' : 'graph.titleSingles';
  }

  document.getElementById('graph-title').textContent = t(titleKey);
  document.getElementById('graph-loading').style.display = 'block';
  document.getElementById('graph-viewport').innerHTML = '';
  _graphResetView();
  document.getElementById('graph-modal-overlay').classList.add('open');
  // Обчислення відкладаємо на наступний кадр — щоб встиг намалюватись стан "завантаження".
  requestAnimationFrame(()=>{
    setTimeout(()=>{
      _renderGraph(items, simFn, labelFn, colorFn, onClickFn);
      document.getElementById('graph-loading').style.display = 'none';
    }, 20);
  });
}

function closeGraph(){
  document.getElementById('graph-modal-overlay').classList.remove('open');
  _graphNodeUnhover();
}
document.getElementById('graph-modal-overlay').addEventListener('click', function(e){
  if(e.target === this) closeGraph();
});

// Проста фізична симуляція (вузли відштовхуються завжди, притягуються пропорційно до схожості) — не MDS, але достатньо.
function _computeGraphLayout(n, sim, width, height){
  const nodes = [];
  for(let i=0;i<n;i++){
    const angle = (i/n)*Math.PI*2;
    const r = Math.min(width,height)*0.35;
    nodes.push({ x: width/2 + Math.cos(angle)*r, y: height/2 + Math.sin(angle)*r, vx:0, vy:0 });
  }
  const repelK = 5000, springK = 0.02, centerK = 0.004;
  const iterations = n > 200 ? 90 : 150;
  for(let iter=0; iter<iterations; iter++){
    for(let i=0;i<n;i++){
      let fx=0, fy=0;
      for(let j=0;j<n;j++){
        if(i===j) continue;
        const dx = nodes[i].x-nodes[j].x, dy = nodes[i].y-nodes[j].y;
        let distSq = dx*dx+dy*dy; if(distSq<4) distSq=4;
        const dist = Math.sqrt(distSq);
        const rep = repelK/distSq;
        fx += (dx/dist)*rep; fy += (dy/dist)*rep;
        const s = sim[i][j];
        if(s>0){
          const attract = springK*s*dist;
          fx -= (dx/dist)*attract; fy -= (dy/dist)*attract;
        }
      }
      fx += (width/2-nodes[i].x)*centerK;
      fy += (height/2-nodes[i].y)*centerK;
      nodes[i].vx = (nodes[i].vx+fx)*0.82;
      nodes[i].vy = (nodes[i].vy+fy)*0.82;
    }
    for(let i=0;i<n;i++){ nodes[i].x += nodes[i].vx; nodes[i].y += nodes[i].vy; }
  }
  // Відступ від країв, щоб вузли не малювались упритул до рамки.
  const pad = 20;
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  nodes.forEach(p=>{ if(p.x<minX)minX=p.x; if(p.x>maxX)maxX=p.x; if(p.y<minY)minY=p.y; if(p.y>maxY)maxY=p.y; });
  const spanX = Math.max(1,maxX-minX), spanY = Math.max(1,maxY-minY);
  const sx = (width-pad*2)/spanX, sy = (height-pad*2)/spanY;
  const scale = Math.min(sx, sy, 1.4);
  nodes.forEach(p=>{
    p.x = pad + (p.x-minX)*scale;
    p.y = pad + (p.y-minY)*scale;
  });
  return nodes;
}

function _renderGraph(items, simFn, labelFn, colorFn, onClickFn){
  const n = items.length;
  const svg = document.getElementById('graph-svg');
  const viewport = document.getElementById('graph-viewport');
  const w = svg.clientWidth || 700, h = svg.clientHeight || 500;
  _graphItems = items; _graphOnClick = onClickFn; _graphLabelFn = labelFn; _graphAdj = [];
  if(!n){ viewport.innerHTML=''; return; }
  if(n===1){
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    viewport.innerHTML = `<g class="graph-node" onclick="_graphNodeClicked(0)" onmouseenter="_graphNodeHover(0)" onmouseleave="_graphNodeUnhover()"><circle cx="${w/2}" cy="${h/2}" r="9" fill="${colorFn(items[0],0)}"/></g>`;
    return;
  }

  const sim = new Array(n);
  for(let i=0;i<n;i++) sim[i] = new Array(n).fill(0);
  for(let i=0;i<n;i++) for(let j=i+1;j<n;j++){ const s=simFn(i,j); sim[i][j]=s; sim[j][i]=s; }

  const nodes = _computeGraphLayout(n, sim, w, h);
  const radius = n>150 ? 3.5 : n>50 ? 6 : 9;

  _graphAdj = Array.from({length:n}, () => []);
  let edgesSvg = '';
  for(let i=0;i<n;i++) for(let j=i+1;j<n;j++){
    const s = sim[i][j];
    if(s < GRAPH_SIM_THRESHOLD) continue;
    _graphAdj[i].push(j); _graphAdj[j].push(i);
    edgesSvg += `<line class="graph-edge" data-i="${i}" data-j="${j}" x1="${nodes[i].x.toFixed(1)}" y1="${nodes[i].y.toFixed(1)}" x2="${nodes[j].x.toFixed(1)}" y2="${nodes[j].y.toFixed(1)}" stroke="rgba(200,169,110,${Math.min(0.5, s*0.6).toFixed(2)})" stroke-width="${(1+s*2).toFixed(1)}" />`;
  }
  let nodesSvg = '';
  for(let i=0;i<n;i++){
    nodesSvg += `<g class="graph-node" onclick="_graphNodeClicked(${i})" onmouseenter="_graphNodeHover(${i})" onmouseleave="_graphNodeUnhover()"><circle cx="${nodes[i].x.toFixed(1)}" cy="${nodes[i].y.toFixed(1)}" r="${radius}" fill="${colorFn(items[i],i)}" stroke="rgba(0,0,0,0.3)" stroke-width="1"/></g>`;
  }

  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  viewport.innerHTML = edgesSvg + nodesSvg;
}
function _graphNodeClicked(i){
  if(_graphOnClick) _graphOnClick(_graphItems[i]);
}

// ================================================================
// TOP 100 (найпрослуханіші — GET /api/stats/top-songs)
// ================================================================
let currentTopSongs = [];
function playFromTop(id){
  if(!currentTopSongs.length) return;
  playerQueue=currentTopSongs.slice();
  playerIndex=playerQueue.findIndex(s=>s.id===id);
  if(playerIndex<0)playerIndex=0;
  _loadCurrent();
}
async function loadTopSongsPage(){
  const tbody=document.getElementById('top-songs-body');
  try{
    const list = await fetch('/api/stats/top-songs?limit=100').then(r=>r.json());
    currentTopSongs = list;
    if(!list.length){
      tbody.innerHTML=`<tr><td colspan="6"><div class="empty"><svg class="icon"><use href="#icon-music"/></svg>${t('top.empty')}</div></td></tr>`;
      return;
    }
    const curId=playerQueue.length&&playerQueue[playerIndex]?playerQueue[playerIndex].id:null;
    tbody.innerHTML=list.map((s,i)=>{
      const isPlay=s.id===curId;
      const btnIcon=isPlay&&isPlaying()
        ?`<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`
        :`<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
      return `<tr class="${isPlay?'playing-row':''}">
        <td class="td-icon-lead" data-label="" style="padding:0.7rem 0.5rem 0.7rem 1rem;">
          <button class="play-row-btn${isPlay?' is-playing':''}" onclick="toggleOrPlay(${s.id}, playFromTop)">${btnIcon}</button>
        </td>
        <td class="num-col" data-label="${t('table.number')}">${i+1}</td>
        <td data-label="${t('table.artist')}"><strong>${artistLinksHtml(s)}</strong></td>
        <td data-label="${t('table.title')}">${esc(s.title)}</td>
        <td data-label="${t('table.album')}">${s.album?`<span class="badge album">${esc(s.album)}</span>`:`<span style="color:var(--muted)">${t('table.single')}</span>`}</td>
        <td class="duration-col" data-label="${t('table.plays')}"><svg class="icon"><use href="#icon-eye"/></svg> ${s.playCount ?? 0}</td>
      </tr>`;
    }).join('');
  }catch(e){
    tbody.innerHTML=`<tr><td colspan="6"><div class="empty"><svg class="icon"><use href="#icon-music"/></svg>${t('top.empty')}</div></td></tr>`;
  }
}

function _loadCurrent(){
  const s=playerQueue[playerIndex];if(!s)return;
  listenLogged=false;
  userIntendedPlaying=true;
  document.getElementById('p-title').textContent=s.title;
  document.getElementById('p-artist').innerHTML=artistLinksHtml(s);
  document.getElementById('p-album').textContent=s.album||t('table.single');
  document.getElementById('player-cover-img').style.display='none';
  document.getElementById('player-cover-ph').style.display='block';
  document.getElementById('player-bar').classList.add('visible');
  document.body.classList.add('player-open');
  document.getElementById('btn-edit-current').style.display = currentUser?.isAdmin ? '' : 'none';
  const favBtn = document.getElementById('btn-fav-current');
  const plBtn = document.getElementById('btn-playlist-current');
  favBtn.style.display = currentUser?.authenticated ? '' : 'none';
  plBtn.style.display = currentUser?.authenticated ? '' : 'none';
  favBtn.classList.toggle('active', favoriteIds.has(s.id));
  favBtn.querySelector('svg').setAttribute('fill', favoriteIds.has(s.id) ? 'currentColor' : 'none');
  setLoad(true);setEQ(false);setPP(false);
  document.getElementById('player-seek-filled').style.width='0%';
  document.getElementById('player-seek-thumb').style.left='0%';
  document.getElementById('p-cur').textContent='0:00';
  document.getElementById('p-dur').textContent='0:00';
  renderSongs();
  if(karaokeOpen) loadKaraokeLyrics();

  // Якщо videoId вже закешовано в базі — беремо напряму, без нового запиту до YouTube Search API.
  const vidPromise = s.youtubeVideoId
    ? Promise.resolve(s.youtubeVideoId)
    : fetchVid(s.artist,s.title).then(vid=>{
        if(vid) _cacheYoutubeVideo(s.id, vid);
        return vid;
      });

  _updateMediaSessionMetadata(s, null);

  vidPromise.then(vid=>{
    if(!vid){setLoad(false);document.getElementById('p-title').textContent=s.title+t('video.notFoundSuffix');return;}
    currentVid = vid;
    _onVidReady(vid);
    const img=document.getElementById('player-cover-img');
    img.src='https://img.youtube.com/vi/'+vid+'/mqdefault.jpg';
    img.style.display='block';
    document.getElementById('player-cover-ph').style.display='none';
    _updateMediaSessionMetadata(s, vid);
    if(ytReady)_load(vid);else pendingVid=vid;
    // Нативний попап (Electron) не підхоплює зміну пісні сам — без цього
    // лишалось би старе відео, а нове тим часом почало б грати ще й тут (два звуки одразу).
    if(_electronPopoutActive&&window.electronAPI?.openVideoPopout)window.electronAPI.openVideoPopout(vid,0,vol,false);
  });
}
// Фонове збереження знайденого videoId — не блокує відтворення, best-effort.
function _cacheYoutubeVideo(songId, videoId){
  fetch(`/api/songs/${songId}/youtube-video`, {
    method:'PUT',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({videoId})
  }).catch(()=>{});
}

// Нормалізація для звірки релевантності: без регістру, діакритики й пунктуації.
function _normForMatch(s){
  return (s||'').toLowerCase()
    .normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]','g'),'')
    .replace(new RegExp('[^a-z0-9\\u0400-\\u04FF\\s]','g'),' ')
    .replace(/\s+/g,' ').trim();
}
function _significantWords(s){
  return _normForMatch(s).split(' ').filter(w=>w.length>2);
}
// Відео справді про ЦЮ пісню — вимагаємо, щоб більшість значущих слів із назви пісні були в назві відео.
function _isRelevantVideo(item,title){
  const nItem=_normForMatch(item.snippet?.title);
  const titleWords=_significantWords(title);
  if(!titleWords.length) return true;
  const matched=titleWords.filter(w=>nItem.includes(w)).length;
  return (matched/titleWords.length) >= 0.6;
}
async function _searchYoutube(q){
  // Пробуємо ключі по черзі — якщо один вичерпав денну квоту (403/429), переходимо на наступний.
  for(let attempt=0; attempt<ytApiKeys.length; attempt++){
    const key=ytApiKeys[ytApiKeyIdx];
    try{
      const r=await fetch(
        // maxResults=10 — більший пул кандидатів для відсіювання перезаливів.
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=10&q=${encodeURIComponent(q)}&key=${key}`,
        {signal:AbortSignal.timeout(8000)}
      );
      if(r.ok){
        const d=await r.json();
        return d.items||[];
      }
      if((r.status===403||r.status===429) && ytApiKeys.length>1){
        ytApiKeyIdx=(ytApiKeyIdx+1)%ytApiKeys.length;
        continue; // квота — пробуємо наступний ключ
      }
      return []; // інша помилка (мережа/невалідний ключ) — сенсу пробувати ще нема
    }catch(e){ return []; }
  }
  return []; // усі ключі вичерпали квоту
}
async function fetchVid(artist,title){
  if(!ytApiKeys.length) return null;
  const artistLower=artist.toLowerCase();
  // "live"/"interview"/"teaser" тощо проходять перевірку релевантності, але не є студійною піснею.
  const badWords=['cover','reaction','lyric','lyrics','8d audio','slowed','reverb','nightcore','1 hour','remix','karaoke','instrumental','tiktok','sped up','unofficial','fan made','fan-made','bootleg','live','interview','making of','teaser','behind the scenes','performance','acoustic'];

  function scoreItem(item){
    const t=(item.snippet?.title||'').toLowerCase();
    const ch=(item.snippet?.channelTitle||'').toLowerCase();
    // Канал артиста, VEVO, авто-канал "Artist - Topic" або "official" в назві — ознаки офіційного джерела.
    const channelLooksOfficial = ch.includes(artistLower)||ch.includes('vevo')||ch.includes(' - topic')||ch.includes('official');
    let s=0;
    if(channelLooksOfficial) s+=4;
    // "official video" у назві саме по собі нічого не гарантує — довіряємо лише коли канал справді офіційний.
    if(t.includes('official video')||t.includes('official music video')) s+=channelLooksOfficial?2:-2;
    else if(t.includes('official')) s+=channelLooksOfficial?1:-1;
    if(badWords.some(w=>t.includes(w))) s-=5;
    return s;
  }

  try{
    let items=await _searchYoutube(`${artist} ${title} official video`);
    let relevant=items.filter(it=>_isRelevantVideo(it,title));
    if(!relevant.length){
      // Друга спроба без "official video" — деякі малі канали не використовують цю фразу.
      items=await _searchYoutube(`${artist} ${title}`);
      relevant=items.filter(it=>_isRelevantVideo(it,title));
    }
    if(!relevant.length) return null; // краще "відео не знайдено", ніж програти не ту пісню

    const best=relevant.sort((a,b)=>scoreItem(b)-scoreItem(a))[0];
    return best.id.videoId;
  }catch(e){}
  return null;
}

function _load(vid){
  ytPlayer.loadVideoById(vid);
  // loadVideoById завжди стартує відтворення, ігноруючи autoplay:0 — коли звук
  // веде нативний попап (Electron), одразу глушимо тут, інакше грає з двох вікон.
  if(_electronPopoutActive)try{ytPlayer.pauseVideo();}catch(e){}
}

function playerToggle(){
  if(!ytPlayer||!ytReady)return;
  const st=ytPlayer.getPlayerState();
  if(st===YT.PlayerState.PLAYING)ytPlayer.pauseVideo();
  else ytPlayer.playVideo();
}

function playerNext(){
  if(!playerQueue.length)return;
  if(shuffle)playerIndex=Math.floor(Math.random()*playerQueue.length);
  else playerIndex=(playerIndex+1)%playerQueue.length;
  _loadCurrent();
}

function playerPrev(){
  if(!playerQueue.length)return;
  try{if(ytPlayer&&ytReady&&ytPlayer.getCurrentTime()>3){ytPlayer.seekTo(0);return;}}catch(e){}
  playerIndex=(playerIndex-1+playerQueue.length)%playerQueue.length;
  _loadCurrent();
}

// ================================================================
// MEDIA SESSION (апаратні клавіші відтворення, системний "зараз грає" оверлей ОС) — працює навіть поза фокусом.
// ================================================================
if('mediaSession' in navigator){
  navigator.mediaSession.setActionHandler('play', ()=>{ try{ytPlayer&&ytReady&&ytPlayer.playVideo();}catch(e){} });
  navigator.mediaSession.setActionHandler('pause', ()=>{ try{ytPlayer&&ytReady&&ytPlayer.pauseVideo();}catch(e){} });
  navigator.mediaSession.setActionHandler('previoustrack', playerPrev);
  navigator.mediaSession.setActionHandler('nexttrack', playerNext);
  navigator.mediaSession.setActionHandler('stop', playerClose);
}
function _updateMediaSessionMetadata(song, videoId){
  if(!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: song.title,
    artist: song.artist,
    album: song.album || '',
    artwork: videoId ? [
      {src:`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`, sizes:'320x180', type:'image/jpeg'},
      {src:`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`, sizes:'480x360', type:'image/jpeg'}
    ] : []
  });
}

function playerClose(){
  if(videoPopupOpen) closeVideoPopup();
  if(karaokeOpen) toggleKaraoke();
  try{if(ytPlayer&&ytReady)ytPlayer.stopVideo();}catch(e){}
  stopTick();setEQ(false);
  currentVid = null;
  document.getElementById('player-bar').classList.remove('visible');
  document.body.classList.remove('player-open');
  playerQueue=[];renderSongs();
  if('mediaSession' in navigator){ navigator.mediaSession.playbackState='none'; navigator.mediaSession.metadata=null; }
  const anchor = document.getElementById('ms-anchor');
  if(anchor) anchor.pause();
}

function toggleShuffle(){shuffle=!shuffle;document.getElementById('btn-shuffle').classList.toggle('lit',shuffle);}
function toggleRepeat(){repeat=!repeat;document.getElementById('btn-repeat').classList.toggle('lit',repeat);}

function setVolume(v){
  vol=parseInt(v);
  localStorage.setItem('volume', vol);
  if(ytPlayer&&ytReady)try{ytPlayer.setVolume(vol);}catch(e){}
  document.getElementById('vw1').style.display=vol===0?'none':'';
  document.getElementById('vw2').style.display=vol<50?'none':'';
  // Взаємодія з контролами іноді "оживляє" гучність попап-плеєра назад — глушимо знову.
  if(videoPopupOpen&&popupPlayer&&popupReady)try{popupPlayer.mute();}catch(e){}
  // Нативний попап (Electron) грає звук сам, окремим вікном/процесом — синхронізуємо його гучність теж.
  if(_electronPopoutActive&&window.electronAPI?.setPopoutVolume)window.electronAPI.setPopoutVolume(vol);
}

// SEEK
function seekStart(e){
  seekDrag=true;seekMove(e);
  document.addEventListener('mousemove',seekMove);
  document.addEventListener('mouseup',seekEnd);
  document.addEventListener('touchmove',seekMove,{passive:false});
  document.addEventListener('touchend',seekEnd);
}
function seekMove(e){
  if(!seekDrag)return;
  if(e.preventDefault)e.preventDefault();
  const wrap=document.getElementById('player-seek-wrap');
  const rect=wrap.getBoundingClientRect();
  const cx=e.touches?e.touches[0].clientX:e.clientX;
  const pct=Math.max(0,Math.min(1,(cx-rect.left)/rect.width))*100;
  document.getElementById('player-seek-filled').style.width=pct+'%';
  document.getElementById('player-seek-thumb').style.left=pct+'%';
  try{if(ytPlayer&&ytReady)document.getElementById('p-cur').textContent=fmtSec(ytPlayer.getDuration()*pct/100);}catch(e){}
}
function seekEnd(e){
  seekDrag=false;
  document.removeEventListener('mousemove',seekMove);
  document.removeEventListener('mouseup',seekEnd);
  document.removeEventListener('touchmove',seekMove);
  document.removeEventListener('touchend',seekEnd);
  if(!ytPlayer||!ytReady)return;
  const wrap=document.getElementById('player-seek-wrap');
  const rect=wrap.getBoundingClientRect();
  const cx=e.changedTouches?e.changedTouches[0].clientX:(e.clientX||0);
  const pct=Math.max(0,Math.min(1,(cx-rect.left)/rect.width));
  try{ytPlayer.seekTo(ytPlayer.getDuration()*pct,true);}catch(ex){}
}

function startTick(){
  stopTick();
  ticker=setInterval(()=>{
    if(!ytPlayer||!ytReady||seekDrag)return;
    try{
      const c=ytPlayer.getCurrentTime(),d=ytPlayer.getDuration();
      if(d>0){
        const p=(c/d*100).toFixed(2);
        document.getElementById('player-seek-filled').style.width=p+'%';
        document.getElementById('player-seek-thumb').style.left=p+'%';
        document.getElementById('p-cur').textContent=fmtSec(c);

        // Зараховуємо як прослухану після 20с або половини тривалості (що раніше).
        if(!listenLogged && currentUser?.authenticated){
          const threshold=Math.min(20,d/2);
          if(c>=threshold){
            listenLogged=true;
            const s=playerQueue[playerIndex];
            if(s) fetch('/api/history',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({musicId:s.id})}).catch(()=>{});
          }
        }
      }
    }catch(e){}
  },500);
}
function stopTick(){if(ticker){clearInterval(ticker);ticker=null;}}

function setPP(playing){
  document.getElementById('ico-play').style.display=playing?'none':'';
  document.getElementById('ico-pause').style.display=playing?'':'none';
  if('mediaSession' in navigator) navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
  // Без власного елемента, що теж "грає", Chrome віддає активну media session чужому iframe (youtube.com).
  const anchor = document.getElementById('ms-anchor');
  if(anchor){ if(playing) anchor.play().catch(()=>{}); else anchor.pause(); }
}
function setLoad(on){document.getElementById('p-loading').style.display=on?'inline':'none';}
function setEQ(on){
  document.getElementById('player-cover-eq').classList.toggle('on',on);
  document.getElementById('player-cover').classList.toggle('glow',on);
}


// ================================================================
// VIDEO POPUP
// ================================================================
// Два плеєри: ytPlayer (аудіо, прихований, завжди грає) і popupPlayer (відео в попапі, синхронізоване, без звуку).
let videoPopupOpen = false;
let currentVid = null;
let popupPlayer = null;
let popupReady = false;
let popupSyncTicker = null;
// true одразу після нашого ж programmatic seekTo() — YouTube може емітити короткий
// спурний PLAYING, який не відрізнити від справжнього без цього прапорця.
let _popupProgrammaticSeek = false;
function _popupSeek(time){
  _popupProgrammaticSeek = true;
  try { popupPlayer.seekTo(time, true); } catch(e) {}
  setTimeout(() => { _popupProgrammaticSeek = false; }, 400);
}

// Ініціалізуємо прихований div для popup-плеєра (вже є #video-popup-frame).
function _initPopupPlayer(vid, startAt) {
  const frame = document.getElementById('video-popup-frame');
  const loading = document.getElementById('video-popup-loading');
  loading.style.display = 'flex';

  // Знищуємо попередній якщо є
  if (popupPlayer) {
    try { popupPlayer.destroy(); } catch(e) {}
    popupPlayer = null;
    popupReady = false;
  }

  // Контейнер для нового плеєра
  let ph = document.getElementById('popup-player-ph');
  if (!ph) {
    ph = document.createElement('div');
    ph.id = 'popup-player-ph';
    frame.appendChild(ph);
  }

  popupPlayer = new YT.Player('popup-player-ph', {
    width: '100%',
    height: '100%',
    videoId: vid,
    // controls:0 — звук завжди йде з ytPlayer; нативний повзунок гучності міг
    // розглушувати popupPlayer в обхід нашого mute(), тож прибираємо контроли взагалі.
    playerVars: {
      autoplay: userIntendedPlaying ? 1 : 0,
      start: Math.floor(startAt || 0),
      controls: 0,
      disablekb: 1,
      rel: 0,
      modestbranding: 1,
      iv_load_policy: 3
    },
    events: {
      onReady: (e) => {
        popupReady = true;
        loading.style.display = 'none';
        // Точне вирівнювання по секунді з основним плеєром
        try {
          const cur = ytPlayer.getCurrentTime();
          _popupSeek(cur);
          e.target.mute(); // відео без звуку — звук іде з ytPlayer (setVolume(0) саму по собі YouTube іноді "забуває")
          e.target.setVolume(0);
          // Якщо музика на паузі — не даємо autoplay стартувати попап.
          if(!userIntendedPlaying) e.target.pauseVideo();
        } catch(ex) {}
        _startPopupSync();
      },
      onStateChange: (e) => {
        // Якщо хтось натиснув паузу у відео — синхронізуємо основний плеєр
        if (e.data === YT.PlayerState.PAUSED) {
          userIntendedPlaying = false;
          try { if(ytPlayer&&ytReady) ytPlayer.pauseVideo(); } catch(ex) {}
          setPP(false); stopTick(); setEQ(false);
        } else if (e.data === YT.PlayerState.PLAYING) {
          if (_popupProgrammaticSeek) {
            // Спурний PLAYING від НАШОГО Ж seekTo() (ініціалізація/синк), а не
            // від користувача — повертаємо попап у той стан, що й мав бути.
            if (!userIntendedPlaying) { try { popupPlayer.pauseVideo(); } catch(ex) {} }
            return;
          }
          // Справжній клік користувача по відео — і перший play, і "продовжити" після паузи.
          userIntendedPlaying = true;
          try { if(ytPlayer&&ytReady) {
            ytPlayer.seekTo(popupPlayer.getCurrentTime(), true);
            ytPlayer.playVideo();
          }} catch(ex) {}
          try { popupPlayer.mute(); } catch(ex) {} // повторно глушимо — саме на PLAYING звук іноді "повертається"
          setPP(true); startTick(); setEQ(true);
        }
      }
    }
  });
}

// Кожні 5 сек вирівнюємо popup по ytPlayer (компенсує дрейф)
function _startPopupSync() {
  _stopPopupSync();
  popupSyncTicker = setInterval(() => {
    if (!popupReady || !ytReady) return;
    try {
      // Якщо музика на паузі — попап теж має бути на паузі (без цього продовжував грати
      // й через onStateChange "оживляв" звук назад).
      if (!userIntendedPlaying) {
        if (popupPlayer.getPlayerState() === YT.PlayerState.PLAYING) popupPlayer.pauseVideo();
        return;
      }
      // Періодично перепідтверджуємо мут — за спостереженнями, після взаємодії
      // зі слайдером гучності попап іноді "розглушується" сам по собі.
      if (!popupPlayer.isMuted()) popupPlayer.mute();
      const mainTime = ytPlayer.getCurrentTime();
      const popTime  = popupPlayer.getCurrentTime();
      if (Math.abs(mainTime - popTime) > 1.5) {
        _popupSeek(mainTime);
      }
    } catch(e) {}
  }, 5000);
}

function _stopPopupSync() {
  if (popupSyncTicker) { clearInterval(popupSyncTicker); popupSyncTicker = null; }
}

function toggleVideoPopup() {
  if (videoPopupOpen) closeVideoPopup();
  else openVideoPopup();
}

// ================================================================
// КАРАОКЕ: текст поточної пісні (вводить вручну адмін — див. edit-song-lyrics)
// ================================================================
let karaokeOpen = false;
function toggleKaraoke(){
  karaokeOpen = !karaokeOpen;
  document.getElementById('karaoke-panel').classList.toggle('open', karaokeOpen);
  document.getElementById('btn-karaoke').classList.toggle('active', karaokeOpen);
  if(karaokeOpen) loadKaraokeLyrics();
}
function loadKaraokeLyrics(){
  const textEl = document.getElementById('karaoke-text');
  const emptyEl = document.getElementById('karaoke-empty');
  const s = playerQueue[playerIndex];
  textEl.textContent = '';
  emptyEl.style.display = 'none';
  if(!s) return;
  fetch(`/api/songs/${s.id}/lyrics`)
    .then(r => r.ok ? r.json() : null)
    .then(d => {
      const text = d && d.lyrics ? d.lyrics : '';
      if(!text){ emptyEl.style.display = 'block'; return; }
      textEl.textContent = text;
    })
    .catch(() => { emptyEl.style.display = 'block'; });
}

// ================================================================
// VIDEO POPUP: перенесення в окреме вікно ОС (Document Picture-in-Picture)
// ================================================================
// Document Picture-in-Picture прибрано з веб-версії — фонове відтворення воно
// не рятує (YouTube-embed так само призупиняється у фоні), а лише "перенести на
// інший монітор" не варте повторюваних багів. У Electron лишається справжнє
// нативне вікно ОС через window.electronAPI — геть інший, надійніший механізм.
let _electronPopoutActive = false;
if (window.electronAPI && window.electronAPI.onVideoPopoutClosed) {
  window.electronAPI.onVideoPopoutClosed(() => {
    _electronPopoutActive = false;
    document.getElementById('btn-video')?.classList.remove('active');
  });
}

function _updatePopoutBtnVisibility(){
  const btn = document.getElementById('video-popup-popout');
  const supported = !!(window.electronAPI && window.electronAPI.openVideoPopout);
  if (btn) btn.style.display = supported ? '' : 'none';
}

async function popOutVideoPopup(){
  if (_electronPopoutActive) return;
  if (!(window.electronAPI && window.electronAPI.openVideoPopout)) return;

  if (!currentVid) return;
  let startAt = 0;
  try { if (ytPlayer && ytReady) startAt = ytPlayer.getCurrentTime(); } catch(e) {}
  const ok = await window.electronAPI.openVideoPopout(currentVid, startAt, vol);
  if (ok) {
    _electronPopoutActive = true;
    document.getElementById('video-popup').classList.remove('open');
  }
}

// ================================================================
// VIDEO POPUP: розгортання розміру й перетягування по екрану
// ================================================================
function toggleVideoPopupFullscreen(){
  const popup = document.getElementById('video-popup');
  if (!document.fullscreenElement) {
    popup.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.();
  }
}
// Fullscreen API ховає все, що НЕ є нащадком fullscreen-елемента — тому на час
// fullscreen фізично переносимо вузол плеєр-бару всередину попапу, а після виходу повертаємо назад.
document.addEventListener('fullscreenchange', () => {
  const popup = document.getElementById('video-popup');
  const playerBar = document.getElementById('player-bar');
  const isFs = document.fullscreenElement === popup;
  document.getElementById('video-popup-fullscreen').classList.toggle('active', isFs);
  if (isFs) popup.appendChild(playerBar);
  else document.body.appendChild(playerBar);
});

let videoPopupExpanded = false;
function toggleVideoPopupSize(){
  videoPopupExpanded = !videoPopupExpanded;
  const popup = document.getElementById('video-popup');
  const header = document.getElementById('video-popup-header');
  // Явно перезаписуємо width/height — інакше inline-стиль від ручного перетягування переміг би клас.
  const rect = popup.getBoundingClientRect();
  const targetW = videoPopupExpanded ? Math.min(720, window.innerWidth * 0.9) : 320;
  const targetH = Math.round(targetW * 9 / 16) + header.offsetHeight;
  // Попап за замовчуванням прив'язаний right/bottom — ростимо від поточного
  // правого-нижнього кута явними left/top, щоб не виштовхувати його за межі viewport.
  let newLeft = rect.right - targetW;
  let newTop = rect.bottom - targetH;
  newLeft = Math.max(8, Math.min(newLeft, window.innerWidth - targetW - 8));
  newTop = Math.max(8, Math.min(newTop, window.innerHeight - targetH - 8));
  popup.style.right = 'auto';
  popup.style.bottom = 'auto';
  popup.style.left = newLeft + 'px';
  popup.style.top = newTop + 'px';
  popup.style.width = targetW + 'px';
  popup.style.height = targetH + 'px';
  document.getElementById('video-popup-expand').classList.toggle('active', videoPopupExpanded);
}

(function initVideoPopupResize(){
  const popup = document.getElementById('video-popup');
  const MIN_W = 220, MIN_H = 160;

  document.querySelectorAll('.vp-resize').forEach((handle) => {
    const dir = handle.dataset.dir; // 'n','s','e','w','ne','nw','se','sw'
    let dragging = false, startX = 0, startY = 0, startRect = null;

    handle.addEventListener('pointerdown', (e) => {
      if (document.fullscreenElement) return; // у fullscreen розмір фіксований
      dragging = true;
      startX = e.clientX; startY = e.clientY;
      startRect = popup.getBoundingClientRect();
      // Фіксуємо left/top ОДРАЗУ (а не лише скидаємо right/bottom) — інакше
      // між pointerdown і першим pointermove попап на мить "стрибне" в
      // позицію за замовчуванням.
      popup.style.left = startRect.left + 'px';
      popup.style.top = startRect.top + 'px';
      popup.style.right = 'auto';
      popup.style.bottom = 'auto';
      handle.setPointerCapture(e.pointerId);
      e.preventDefault();
      e.stopPropagation(); // не даємо це ж pointerdown зачепити перетягування за шапку
    });
    handle.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      let width = startRect.width, height = startRect.height;
      let left = startRect.left, top = startRect.top;

      if (dir.includes('e')) width = startRect.width + dx;
      if (dir.includes('w')) width = startRect.width - dx;
      if (dir.includes('s')) height = startRect.height + dy;
      if (dir.includes('n')) height = startRect.height - dy;

      width = Math.max(MIN_W, Math.min(window.innerWidth * 0.98, width));
      height = Math.max(MIN_H, Math.min(window.innerHeight * 0.98, height));

      // Протилежний (нерухомий) край лишається на місці — координату рахуємо від нього.
      if (dir.includes('w')) left = startRect.right - width;
      if (dir.includes('n')) top = startRect.bottom - height;

      // Притискаємо до 0 — інакше шапка (єдина "ручка" переміщення) могла б виштовхнутись за екран.
      if (dir.includes('n') && top < 0) { height += top; top = 0; }
      if (dir.includes('w') && left < 0) { width += left; left = 0; }

      popup.style.width = width + 'px';
      popup.style.height = height + 'px';
      popup.style.left = left + 'px';
      popup.style.top = top + 'px';
    });
    const endDrag = (e) => {
      dragging = false;
      try { handle.releasePointerCapture(e.pointerId); } catch(ex) {}
    };
    handle.addEventListener('pointerup', endDrag);
    handle.addEventListener('pointercancel', endDrag);
  });
})();

(function initVideoPopupDrag(){
  const popup = document.getElementById('video-popup');
  const header = document.getElementById('video-popup-header');
  let dragging = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;

  header.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return; // не тягнемо, якщо клік по кнопці
    const rect = popup.getBoundingClientRect();
    // Переходимо з bottom/right-позиціювання на top/left, щоб рахувати зсув однаково.
    popup.style.left = rect.left + 'px';
    popup.style.top = rect.top + 'px';
    popup.style.right = 'auto';
    popup.style.bottom = 'auto';
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    startLeft = rect.left; startTop = rect.top;
    header.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  header.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const rect = popup.getBoundingClientRect();
    const margin = 40; // лишаємо хоч трохи попапу видимим за краєм екрана
    let newLeft = startLeft + (e.clientX - startX);
    let newTop = startTop + (e.clientY - startY);
    newLeft = Math.max(margin - rect.width, Math.min(window.innerWidth - margin, newLeft));
    newTop = Math.max(0, Math.min(window.innerHeight - margin, newTop));
    popup.style.left = newLeft + 'px';
    popup.style.top = newTop + 'px';
  });
  const endDrag = (e) => {
    dragging = false;
    try { header.releasePointerCapture(e.pointerId); } catch(ex) {}
  };
  header.addEventListener('pointerup', endDrag);
  header.addEventListener('pointercancel', endDrag);
})();

function openVideoPopup() {
  if (!currentVid) return;
  videoPopupOpen = true;
  document.getElementById('video-popup').classList.add('open');
  document.getElementById('btn-video').classList.add('active');

  let startAt = 0;
  try { if (ytPlayer && ytReady) startAt = ytPlayer.getCurrentTime(); } catch(e) {}
  _initPopupPlayer(currentVid, startAt);
}

function closeVideoPopup() {
  if (_electronPopoutActive && window.electronAPI?.closeVideoPopout) {
    window.electronAPI.closeVideoPopout();
    _electronPopoutActive = false;
  }

  const popup = document.getElementById('video-popup');

  // Спершу ГАРАНТОВАНО виходимо з fullscreen, і лише потім ховаємо попап — інакше браузер "зависає".
  if (document.fullscreenElement === popup) {
    document.exitFullscreen?.().catch(() => {}).finally(_finishCloseVideoPopup);
  } else {
    _finishCloseVideoPopup();
  }
}
function _finishCloseVideoPopup() {
  videoPopupOpen = false;
  document.getElementById('video-popup').classList.remove('open');
  document.getElementById('btn-video').classList.remove('active');
  _stopPopupSync();

  // Зупиняємо popup-плеєр — основний ytPlayer НЕ чіпаємо
  if (popupPlayer) {
    try { popupPlayer.destroy(); } catch(e) {}
    popupPlayer = null;
    popupReady = false;
  }

  // Відновлюємо placeholder для наступного разу
  const frame = document.getElementById('video-popup-frame');
  let ph = document.getElementById('popup-player-ph');
  if (!ph) { ph = document.createElement('div'); ph.id='popup-player-ph'; frame.appendChild(ph); }
  document.getElementById('video-popup-loading').style.display = 'flex';
}

function _onVidReady(vid) {
  currentVid = vid;
  // Якщо попап відкритий — оновлюємо відео в ньому з позиції 0
  if (videoPopupOpen) {
    let startAt = 0;
    try { if (ytPlayer && ytReady) startAt = ytPlayer.getCurrentTime(); } catch(e) {}
    _initPopupPlayer(vid, startAt);
  }
}

// INIT
initApp();
applyTheme(document.documentElement.getAttribute('data-theme') || 'dark');
applyLang(currentLang);
document.getElementById('vol-slider').value = vol;
document.getElementById('vw1').style.display = vol===0?'none':'';
document.getElementById('vw2').style.display = vol<50?'none':'';
_updateNavIndicator();
_updatePopoutBtnVisibility();

// ================================================================
// REALTIME (SignalR) — усі відкриті вкладки перезавантажують дані при мутації пісні/заявки.
// ================================================================
if (window.signalR) {
  const rtConn = new signalR.HubConnectionBuilder()
    .withUrl('/hubs/music')
    .withAutomaticReconnect()
    .build();

  rtConn.on('songsChanged', () => {
    loadSongs().then(() => { renderSongs(); updateStats(); }).catch(() => {});
    // Немає окремої SignalR-події на сповіщення — бейдж оновлюємо тут же.
    if(currentUser?.authenticated) refreshNotifBadge();
  });
  rtConn.on('requestsChanged', () => {
    if (currentUser?.isAdmin) renderRequests();
  });

  rtConn.start().catch(() => {});
}
